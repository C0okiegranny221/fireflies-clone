import json

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app import deps
from app.routers import ai as ai_router
from app.services.llm import LLMError, OpenAICompatibleClient
from app.services.rate_limit import RateBudget

API = "/api/v1"


def _meeting_id(client: TestClient, q: str) -> int:
    return client.get(f"{API}/meetings", params={"q": q}).json()["items"][0]["id"]


class FakeLLM:
    """Stands in for any provider: returns canned JSON for whichever schema is requested."""

    label = "Fake · test-model"

    def __init__(self, replies: dict[str, dict]) -> None:
        self.replies = replies
        self.calls = 0

    def complete_json(self, system: str, user: str, schema: type[BaseModel]) -> BaseModel:
        self.calls += 1
        return schema.model_validate(self.replies[schema.__name__])


@pytest.fixture
def use_llm(monkeypatch: pytest.MonkeyPatch):
    def install(fake: FakeLLM, budget: RateBudget | None = None) -> FakeLLM:
        monkeypatch.setattr(deps, "get_llm", lambda: fake)
        monkeypatch.setattr(ai_router, "get_llm", lambda: fake)
        monkeypatch.setattr(deps, "_llm_budget", budget or RateBudget(100, 1000))
        return fake

    return install


# ------------------------------------------------------------------------ search


def test_search_transcripts_and_metadata(client: TestClient) -> None:
    res = client.get(f"{API}/search", params={"q": "pdf export"}).json()
    sprint = next(r for r in res["results"] if r["title"] == "Sprint 42 Planning")
    assert sprint["hits"] and all("[[" in h["snippet"] for h in sprint["hits"])
    starts = [h["start_ms"] for h in sprint["hits"]]
    assert starts == sorted(starts)

    # Prefix matching ("pagin" → pagination) and participant-name matches.
    assert any(
        r["hits"] for r in client.get(f"{API}/search", params={"q": "pagin"}).json()["results"]
    )
    olivia = client.get(f"{API}/search", params={"q": "Olivia"}).json()["results"]
    assert any(r["matched_meeting"] and r["title"].startswith("Brightwave") for r in olivia)


def test_search_index_follows_edits_and_deletes(client: TestClient) -> None:
    meeting_id = _meeting_id(client, "Brightwave")
    segment = client.get(f"{API}/meetings/{meeting_id}/transcript").json()["segments"][0]
    client.patch(f"{API}/segments/{segment['id']}", json={"text": "Zebra crossing budget"})
    hits = client.get(f"{API}/search", params={"q": "zebra"}).json()["results"]
    assert [r["meeting_id"] for r in hits] == [meeting_id]

    client.delete(f"{API}/meetings/{meeting_id}")
    assert client.get(f"{API}/search", params={"q": "zebra"}).json()["results"] == []


# ------------------------------------------------------------------------ export


@pytest.mark.parametrize(("fmt", "marker"), [("md", "## Action items"), ("txt", "ACTION ITEMS")])
def test_export(client: TestClient, fmt: str, marker: str) -> None:
    meeting_id = _meeting_id(client, "Sprint 42")
    res = client.get(f"{API}/meetings/{meeting_id}/export", params={"format": fmt})
    assert res.status_code == 200
    assert res.headers["content-disposition"] == f'attachment; filename="sprint-42-planning.{fmt}"'
    body = res.text
    assert marker in body and "Alex Rivera" in body and "streaming writer" in body


# ------------------------------------------------------------------------ AskFred


def test_ask_offline_retrieval_cites_transcript(client: TestClient) -> None:
    meeting_id = _meeting_id(client, "Sprint 42")
    res = client.post(
        f"{API}/meetings/{meeting_id}/ask", json={"question": "What about the memory leak?"}
    )
    body = res.json()
    assert body["source"] == "retrieval" and body["model"] is None
    assert body["citations"] and any("leak" in c["text"].lower() for c in body["citations"])

    none = client.post(f"{API}/meetings/{meeting_id}/ask", json={"question": "Quarterly giraffe?"})
    assert none.json()["citations"] == []


def test_ask_with_llm_validates_citations(client: TestClient, use_llm) -> None:
    meeting_id = _meeting_id(client, "Sprint 42")
    segment = client.get(f"{API}/meetings/{meeting_id}/transcript").json()["segments"][3]
    use_llm(
        FakeLLM({"_LLMAnswer": {"answer": "Marcus owns it.", "line_ids": [segment["id"], 99999]}})
    )

    body = client.post(f"{API}/meetings/{meeting_id}/ask", json={"question": "Who owns it?"}).json()
    assert body == {
        "answer": "Marcus owns it.",
        "citations": [
            {
                "segment_id": segment["id"],
                "start_ms": segment["start_ms"],
                "speaker": "Marcus Lee",
                "text": segment["text"],
            }
        ],  # the invented id 99999 was dropped
        "source": "llm",
        "model": "Fake · test-model",
    }
    assert client.get(f"{API}/app-info").json() == {
        "ai_enabled": True,
        "ai_model": "Fake · test-model",
    }


def test_llm_budget_falls_back_when_exhausted(client: TestClient, use_llm) -> None:
    meeting_id = _meeting_id(client, "Sprint 42")
    fake = use_llm(
        FakeLLM({"_LLMAnswer": {"answer": "From the model.", "line_ids": []}}),
        budget=RateBudget(per_client_per_hour=1, per_day=100),
    )
    ask = lambda: client.post(f"{API}/meetings/{meeting_id}/ask", json={"question": "PDF export?"})  # noqa: E731
    assert ask().json()["source"] == "llm"
    assert ask().json()["source"] == "retrieval"  # over budget → offline answer, not an error
    assert fake.calls == 1


def test_summary_from_llm_drops_invented_assignees(client: TestClient, use_llm) -> None:
    use_llm(
        FakeLLM(
            {
                "_LLMSummary": {
                    "overview": "Ada and Grace planned the launch.",
                    "keywords": ["Launch"],
                    "chapters": [{"title": "Launch", "start_seconds": 9999, "bullets": ["Plan"]}],
                    "action_items": [
                        {"text": "Send copy", "assignee": "Grace", "timestamp_seconds": 2},
                        {"text": "Book room", "assignee": "Nobody", "timestamp_seconds": None},
                    ],
                }
            }
        )
    )
    body = {
        "title": "Launch",
        "transcript_text": "Ada: Let's plan the launch.\nGrace: I'll send copy.",
    }
    meeting = client.post(f"{API}/meetings", json=body).json()
    assert meeting["summary"]["generated_by"] == "llm"
    assert meeting["summary"]["model"] == "Fake · test-model"
    # A chapter time past the end is clamped to the transcript length.
    end_ms = max(
        s["end_ms"]
        for s in client.get(f"{API}/meetings/{meeting['id']}/transcript").json()["segments"]
    )
    assert meeting["summary"]["chapters"][0]["start_ms"] == end_ms
    assert [(a["text"], (a["assignee"] or {}).get("name")) for a in meeting["action_items"]] == [
        ("Send copy", "Grace"),
        ("Book room", None),
    ]


# ------------------------------------------------------------- provider adapters


class _Reply(BaseModel):
    answer: str


def _client(handler) -> OpenAICompatibleClient:
    return OpenAICompatibleClient(
        "https://api.groq.com/openai/v1",
        "secret",
        "llama-test",
        transport=httpx.MockTransport(handler),
    )


def test_openai_compatible_client_sends_json_mode_and_parses() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(
            json.loads(request.content), auth=request.headers["authorization"], url=str(request.url)
        )
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"answer": "hi"}'}}]})

    client = _client(handler)
    assert client.complete_json("sys", "user", _Reply) == _Reply(answer="hi")
    assert client.label == "Groq · llama-test"
    assert seen["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert seen["auth"] == "Bearer secret"
    assert seen["response_format"] == {"type": "json_object"}
    assert '"answer"' in seen["messages"][0]["content"]  # schema is included in the prompt


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(429, json={"error": "rate limited"}),
        httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]}),
        httpx.Response(200, json={"choices": [{"message": {"content": '{"wrong": 1}'}}]}),
    ],
)
def test_openai_compatible_client_errors_become_llm_error(response: httpx.Response) -> None:
    with pytest.raises(LLMError):
        _client(lambda _req: response).complete_json("sys", "user", _Reply)


def test_budget_windows() -> None:
    now = [0.0]
    budget = RateBudget(per_client_per_hour=2, per_day=3, clock=lambda: now[0])
    assert budget.try_acquire("a") and budget.try_acquire("a")
    assert not budget.try_acquire("a")  # per-client hourly limit
    assert budget.try_acquire("b")
    assert not budget.try_acquire("c")  # global daily limit
    now[0] = 3601
    assert not budget.try_acquire("a")  # hour passed, but the daily cap still applies
    now[0] = 86_401
    assert budget.try_acquire("a")
