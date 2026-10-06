from datetime import datetime

from fastapi.testclient import TestClient

API = "/api/v1"


def _meetings(client: TestClient, **params) -> list[dict]:
    res = client.get(f"{API}/meetings", params=params)
    assert res.status_code == 200, res.text
    return res.json()["items"]


def test_list_is_sorted_by_recency_with_participants(client: TestClient) -> None:
    items = _meetings(client)
    assert len(items) == 7
    dates = [datetime.fromisoformat(m["started_at"]) for m in items]
    assert dates == sorted(dates, reverse=True)
    sprint = items[0]
    assert sprint["title"] == "Sprint 42 Planning"
    assert {p["name"] for p in sprint["participants"]} >= {"Alex Rivera", "Priya Shah"}
    assert sprint["action_item_count"] == 7
    assert sprint["duration_sec"] > 0


def test_filters(client: TestClient) -> None:
    assert [m["title"] for m in _meetings(client, q="northwind")] == [
        "Northwind Logistics — Discovery Call"
    ]
    # q also matches participant names
    assert len(_meetings(client, q="olivia")) == 1

    people = {p["name"]: p["id"] for p in client.get(f"{API}/participants").json()}
    with_both = _meetings(client, participant_id=[people["Priya Shah"], people["Marcus Lee"]])
    assert {m["title"] for m in with_both} == {"Sprint 42 Planning", "October All-Hands"}

    short = _meetings(client, max_duration=3)
    assert short and all(m["duration_sec"] <= 180 for m in short)
    assert [m["title"] for m in _meetings(client, tag="hiring")] == [
        "Interview: Ravi Kumar — Senior Frontend Engineer"
    ]
    oldest_first = _meetings(client, sort="started_at")
    assert oldest_first[0]["title"].startswith("Brightwave")


def test_meeting_detail_and_transcript_search(client: TestClient) -> None:
    meeting_id = _meetings(client, q="Sprint 42")[0]["id"]
    detail = client.get(f"{API}/meetings/{meeting_id}").json()
    assert detail["summary"]["generated_by"] == "seed"
    assert len(detail["summary"]["chapters"]) == 5
    assert sum(p["talk_time_sec"] for p in detail["participants"]) > 0

    transcript = client.get(f"{API}/meetings/{meeting_id}/transcript", params={"q": "PDF"}).json()
    starts = [s["start_ms"] for s in transcript["segments"]]
    assert starts == sorted(starts)
    assert len(transcript["match_segment_ids"]) >= 2

    assert client.get(f"{API}/meetings/9999").status_code == 404


def test_create_from_pasted_transcript_generates_notes(client: TestClient) -> None:
    body = {
        "title": "Budget sync",
        "participants": ["Grace Hopper"],
        "tags": ["Finance"],
        "transcript_text": (
            "Ada Lovelace: We need to finalize the marketing budget this week.\n"
            "Grace Hopper: I'll send the revised marketing budget spreadsheet tomorrow.\n"
            "Ada Lovelace: Great, the budget review with finance is on Thursday."
        ),
    }
    res = client.post(f"{API}/meetings", json=body)
    assert res.status_code == 201, res.text
    meeting = res.json()
    assert meeting["source"] == "manual"
    assert meeting["summary"]["generated_by"] == "heuristic"
    assert {p["name"] for p in meeting["participants"]} == {
        "Alex Rivera",
        "Grace Hopper",
        "Ada Lovelace",
    }
    assert [t["name"] for t in meeting["tags"]] == ["finance"]

    assignees = [(a["assignee"] or {}).get("name") for a in meeting["action_items"]]
    assert "Grace Hopper" in assignees


def test_create_converts_offset_datetimes_to_utc(client: TestClient) -> None:
    body = {"title": "Offset", "started_at": "2026-03-01T10:00:00+05:30"}
    meeting = client.post(f"{API}/meetings", json=body).json()
    assert meeting["started_at"] == "2026-03-01T04:30:00"


def test_upload_vtt_and_reject_bad_files(client: TestClient) -> None:
    vtt = b"WEBVTT\n\n00:00:00.000 --> 00:00:03.000\n<v Ada>Let's review the roadmap.\n"
    res = client.post(
        f"{API}/meetings/upload",
        files={"file": ("roadmap_review.vtt", vtt, "text/vtt")},
    )
    assert res.status_code == 201, res.text
    assert res.json()["title"] == "Roadmap Review"
    assert res.json()["source"] == "upload"

    bad_ext = client.post(f"{API}/meetings/upload", files={"file": ("a.mp3", b"x", "audio/mpeg")})
    assert bad_ext.status_code == 415
    empty = client.post(f"{API}/meetings/upload", files={"file": ("a.txt", b"  ", "text/plain")})
    assert empty.status_code == 422


def test_update_and_delete_meeting_cascades(client: TestClient) -> None:
    meeting = _meetings(client, q="1:1")[0]
    res = client.patch(
        f"{API}/meetings/{meeting['id']}",
        json={"title": "Renamed 1:1", "participants": ["Alex Rivera", "New Person"]},
    )
    assert res.status_code == 200
    names = {p["name"] for p in res.json()["participants"]}
    # Priya stays because she spoke in the transcript.
    assert names == {"Alex Rivera", "New Person", "Priya Shah"}
    assert res.json()["title"] == "Renamed 1:1"

    tasks_before = len(client.get(f"{API}/action-items").json())
    assert client.delete(f"{API}/meetings/{meeting['id']}").status_code == 204
    assert client.get(f"{API}/meetings/{meeting['id']}").status_code == 404
    assert len(client.get(f"{API}/action-items").json()) == tasks_before - 6


def test_action_item_crud(client: TestClient) -> None:
    meeting_id = _meetings(client, q="Brightwave")[0]["id"]
    url = f"{API}/meetings/{meeting_id}/action-items"

    created = client.post(url, json={"text": "Email the renewal deck"}).json()
    assert created["is_completed"] is False and created["assignee"] is None

    item_url = f"{API}/action-items/{created['id']}"
    done = client.patch(item_url, json={"is_completed": True, "text": "Email the deck"}).json()
    assert done["is_completed"] is True and done["text"] == "Email the deck"

    open_tasks = client.get(f"{API}/action-items", params={"completed": False}).json()
    assert created["id"] not in {t["id"] for t in open_tasks}
    assert {"meeting_title", "meeting_started_at"} <= open_tasks[0].keys()

    assert client.delete(item_url).status_code == 204
    assert client.patch(item_url, json={"is_completed": False}).status_code == 404


def test_regenerate_summary_keeps_action_items(client: TestClient) -> None:
    meeting_id = _meetings(client, q="Sprint 42")[0]["id"]
    res = client.post(f"{API}/meetings/{meeting_id}/summary/regenerate")
    assert res.status_code == 200
    assert res.json()["generated_by"] == "heuristic"
    detail = client.get(f"{API}/meetings/{meeting_id}").json()
    assert len(detail["action_items"]) == 7


def test_reassign_segment_speaker_recomputes_talk_time(client: TestClient) -> None:
    meeting_id = _meetings(client, q="1:1")[0]["id"]
    segments = client.get(f"{API}/meetings/{meeting_id}/transcript").json()["segments"]
    people = {p["name"]: p["id"] for p in client.get(f"{API}/participants").json()}

    first = segments[0]  # Alex's opener
    body = {"participant_id": people["Jenna Kim"]}
    res = client.patch(f"{API}/segments/{first['id']}", json=body)
    assert res.status_code == 200

    talk = {
        p["name"]: p["talk_time_sec"]
        for p in client.get(f"{API}/meetings/{meeting_id}").json()["participants"]
    }
    assert talk["Jenna Kim"] == round((first["end_ms"] - first["start_ms"]) / 1000)
