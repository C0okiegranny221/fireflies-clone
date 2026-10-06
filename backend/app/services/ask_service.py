"""
AskFred: answer a question about one meeting, citing the transcript lines used.

With an LLM, the model reads the whole transcript (lines tagged with ids) and returns an
answer plus the ids it relied on; ids are validated against the meeting. Without one (or
when the call fails / budget is spent) a keyword-retrieval fallback quotes the most
relevant lines, so the feature always works.
"""

import logging
import re
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

from app.models import Meeting, TranscriptSegment
from app.services.llm import LLMClient, LLMError
from app.services.text import STOPWORDS, WORD_RE, term

log = logging.getLogger(__name__)

MAX_CITATIONS = 4


@dataclass
class ChatTurn:
    role: Literal["user", "assistant"]
    content: str


@dataclass
class Answer:
    text: str
    segments: list[TranscriptSegment]
    source: Literal["llm", "retrieval"]
    model: str | None = None


def ask(
    meeting: Meeting,
    question: str,
    history: list[ChatTurn],
    llm: LLMClient | None,
) -> Answer:
    if llm is not None and meeting.segments:
        try:
            return _ask_llm(meeting, question, history, llm)
        except LLMError:
            log.warning("AskFred LLM call failed; using retrieval", exc_info=True)
    return _ask_retrieval(meeting, question)


# --------------------------------------------------------------------------- LLM


class _LLMAnswer(BaseModel):
    answer: str = Field(description="Concise answer in 1-4 sentences, plain text")
    line_ids: list[int] = Field(description="Ids of the transcript lines the answer is based on")


_SYSTEM = (
    "You are Fred, a meeting assistant. Answer the user's question using only the meeting "
    "transcript provided. Be concise and specific, name who said what when relevant, and "
    "cite the ids of the transcript lines you used (at most 4). If the transcript doesn't "
    "contain the answer, say so plainly and return no line ids."
)


def _clock(ms: int) -> str:
    s = ms // 1000
    return f"{s // 60}:{s % 60:02d}"


def _ask_llm(meeting: Meeting, question: str, history: list[ChatTurn], llm: LLMClient) -> Answer:
    lines = "\n".join(
        f"[#{s.id} {_clock(s.start_ms)}] {s.speaker.name}: {s.text}" for s in meeting.segments
    )
    convo = "\n".join(f"{t.role.upper()}: {t.content}" for t in history[-6:])
    prompt = (
        f"Meeting: {meeting.title}\n\nTranscript:\n{lines}\n\n"
        + (f"Conversation so far:\n{convo}\n\n" if convo else "")
        + f"Question: {question}"
    )
    out = llm.complete_json(_SYSTEM, prompt, _LLMAnswer)
    by_id = {s.id: s for s in meeting.segments}
    cited = [by_id[i] for i in dict.fromkeys(out.line_ids) if i in by_id][:MAX_CITATIONS]
    cited.sort(key=lambda s: s.start_ms)
    return Answer(out.answer.strip(), cited, "llm", llm.label)


# --------------------------------------------------------------------- Retrieval


def _keywords(text: str) -> set[str]:
    return {term(w) for w in WORD_RE.findall(text) if w.lower() not in STOPWORDS}


def _ask_retrieval(meeting: Meeting, question: str) -> Answer:
    wanted = _keywords(question)
    phrase = re.sub(r"\s+", " ", question.strip().lower().rstrip("?"))

    scored: list[tuple[float, TranscriptSegment]] = []
    for seg in meeting.segments:
        overlap = len(wanted & _keywords(seg.text))
        # Prefer lines that contain the whole phrase, then lines matching more keywords.
        score = overlap + (2 if len(phrase) > 3 and phrase in seg.text.lower() else 0)
        if score:
            scored.append((score, seg))

    if not scored:
        return Answer(
            "I couldn't find anything about that in this meeting's transcript. "
            "Try different keywords, like a topic, a name or a decision.",
            [],
            "retrieval",
        )

    best = sorted(scored, key=lambda pair: (-pair[0], pair[1].start_ms))[:MAX_CITATIONS]
    segments = sorted((seg for _, seg in best), key=lambda s: s.start_ms)
    # Name the topic in the asker's own words, in their order ("memory leak", not "leak, memory").
    words = list(dict.fromkeys(w for w in WORD_RE.findall(question) if w.lower() not in STOPWORDS))
    topic = " ".join(words[:4]) or "that"
    n = len(segments)
    return Answer(
        f"Here {'is the moment' if n == 1 else f'are {n} moments'} where “{topic}” came up "
        "in this meeting:",
        segments,
        "retrieval",
    )
