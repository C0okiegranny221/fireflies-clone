"""
Generate meeting notes (overview, keywords, outline, action items) from a transcript.

Uses Claude when ANTHROPIC_API_KEY is configured; otherwise — or if the API call fails —
falls back to a deterministic heuristic so the app always works offline.
"""

import logging
import re
from collections import Counter
from dataclasses import dataclass, field

import anthropic
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.models import SummarySource
from app.services.transcript_parser import ParsedSegment

log = logging.getLogger(__name__)


@dataclass
class ChapterDraft:
    title: str
    start_ms: int
    bullets: list[str]


@dataclass
class ActionItemDraft:
    text: str
    assignee: str | None
    start_ms: int | None


@dataclass
class SummaryDraft:
    overview: str
    keywords: list[str]
    chapters: list[ChapterDraft]
    action_items: list[ActionItemDraft]
    source: SummarySource
    speakers: list[str] = field(default_factory=list)


def summarize(title: str, segments: list[ParsedSegment]) -> SummaryDraft:
    if settings.anthropic_api_key:
        try:
            if draft := _summarize_with_llm(title, segments):
                return draft
        except (anthropic.APIError, ValidationError):
            log.exception("LLM summary failed; falling back to heuristic")
    return summarize_heuristic(title, segments)


# --------------------------------------------------------------------------- LLM


class _LLMChapter(BaseModel):
    title: str = Field(description="Short topic title, 2-6 words")
    start_seconds: int = Field(description="When this topic starts, in seconds")
    bullets: list[str] = Field(description="2-4 concise notes on what was said")


class _LLMActionItem(BaseModel):
    text: str = Field(description="The task, phrased as an imperative")
    assignee: str | None = Field(description="Speaker name who owns it, exactly as in transcript")
    timestamp_seconds: int | None = Field(description="When it was mentioned, in seconds")


class _LLMSummary(BaseModel):
    overview: str = Field(description="3-5 sentence summary of the meeting")
    keywords: list[str] = Field(description="5-8 key topics, Title Case")
    chapters: list[_LLMChapter]
    action_items: list[_LLMActionItem]


_SYSTEM_PROMPT = (
    "You are a meeting notetaker. Given a timestamped transcript, write notes a busy "
    "attendee could skim: an overview, key topics, a chronological outline split at real "
    "topic changes, and the concrete action items people committed to. Only include action "
    "items actually stated in the transcript; use the speaker's name as the assignee."
)


def _summarize_with_llm(title: str, segments: list[ParsedSegment]) -> SummaryDraft | None:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    transcript = "\n".join(f"[{_clock(s.start_ms or 0)}] {s.speaker}: {s.text}" for s in segments)
    response = client.messages.parse(
        model=settings.anthropic_model,
        max_tokens=16000,
        system=_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": f"Meeting title: {title}\n\nTranscript:\n{transcript}"}
        ],
        output_format=_LLMSummary,
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        log.warning("LLM summary unavailable (stop_reason=%s)", response.stop_reason)
        return None

    out = response.parsed_output
    return SummaryDraft(
        overview=out.overview,
        keywords=out.keywords[:8],
        chapters=[ChapterDraft(c.title, c.start_seconds * 1000, c.bullets) for c in out.chapters],
        action_items=[
            ActionItemDraft(
                a.text,
                a.assignee,
                a.timestamp_seconds * 1000 if a.timestamp_seconds is not None else None,
            )
            for a in out.action_items
        ],
        source=SummarySource.LLM,
    )


def _clock(ms: int) -> str:
    s = ms // 1000
    return f"{s // 60:02d}:{s % 60:02d}"


# --------------------------------------------------------------------- Heuristic

_STOPWORDS = frozenset(
    """a about above after again against all also am an and any are as at be because been
    before being below between both but by can could did do does doing done down during each
    else even ever every few for from further get gets getting go going gonna got had has
    have having he her here hers him his how i if in into is it its itself just know let
    like ll look make maybe me might more most much must my need no nor not now of off ok
    okay on once one only or other our ours out over own pretty probably quite re really
    right said same say see she should so some something sounds still such sure take than
    thank thanks that the their them then there these they thing things think this those
    though through to too um uh under until up us ve very want was way we well were what
    when where which while who whom why will with would yeah yes yet you your yours great
    good actually basically lot kind week weeks today tomorrow time folks guys everyone hey
    hi first second third two three four five six seven eight nine ten twenty thirty forty
    fifty hundred thousand next last many""".split()
)
# Words of 4+ letters, skipping contractions/possessives ("we'll", "Daniel's").
_WORD = re.compile(r"\b[A-Za-z][A-Za-z\-]{3,}\b(?!')")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_ACTION_CUE = re.compile(
    r"\b(I'll|I will|I'm going to|I can take|let me|we'll|we will|we need to|"
    r"you'll|can you|could you|need to|needs to|action item|follow up|follow-up|"
    r"send (?:over|out)|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|eod|end of)|"
    r"next week)\b",
    re.IGNORECASE,
)
_FIRST_PERSON = re.compile(r"^\W*(I'll|I will|I'm going to|I can|let me)\b", re.IGNORECASE)
_FILLER_PREFIX = re.compile(
    r"^(?:so|and|okay|ok|yeah|alright|um|uh|great|perfect)[, ]+", re.IGNORECASE
)


def summarize_heuristic(title: str, segments: list[ParsedSegment]) -> SummaryDraft:
    speakers = list(dict.fromkeys(s.speaker for s in segments))
    name_parts = {part.lower() for sp in speakers for part in sp.split()}
    word_counts: Counter[str] = Counter()
    surface_forms: dict[str, Counter[str]] = {}
    for seg in segments:
        for word in _WORD.findall(seg.text):
            if word.lower() in _STOPWORDS or word.lower() in name_parts:
                continue
            term = _term(word)
            word_counts[term] += 1
            surface_forms.setdefault(term, Counter())[word] += 1
    keywords = [_display(surface_forms[t]) for t, _ in word_counts.most_common(8)]
    chapters = _heuristic_chapters(segments, word_counts, surface_forms)
    return SummaryDraft(
        overview=_heuristic_overview(title, speakers, keywords, segments, word_counts),
        keywords=keywords,
        chapters=chapters,
        action_items=_heuristic_action_items(segments),
        source=SummarySource.HEURISTIC,
        speakers=speakers,
    )


def _term(word: str) -> str:
    """Normalize a word so "Calls"/"call" count as one topic."""
    w = word.lower()
    return w[:-1] if len(w) > 4 and w.endswith("s") and not w.endswith("ss") else w


def _display(forms: Counter[str]) -> str:
    """Show a term the way speakers wrote it most often ("HubSpot"), capitalized."""
    word = forms.most_common(1)[0][0]
    return word[0].upper() + word[1:]


def _score(sentence: str, word_counts: Counter[str]) -> float:
    words = [_term(w) for w in _WORD.findall(sentence)]
    if len(words) < 4:
        return 0.0
    return sum(word_counts.get(w, 0) for w in words) / len(words) ** 0.5


def _sentences(segments: list[ParsedSegment]) -> list[tuple[ParsedSegment, str]]:
    return [
        (seg, sent.strip())
        for seg in segments
        for sent in _SENTENCE_SPLIT.split(seg.text)
        if len(sent.split()) >= 5 and not sent.strip().endswith("?")
    ]


def _heuristic_overview(
    title: str,
    speakers: list[str],
    keywords: list[str],
    segments: list[ParsedSegment],
    word_counts: Counter[str],
) -> str:
    who = _join_names(speakers)
    topics = _join_names([k.lower() for k in keywords[:3]])
    opener = f"{who} met for “{title}” and discussed {topics}." if topics else ""
    ranked = sorted(_sentences(segments), key=lambda p: _score(p[1], word_counts), reverse=True)
    highlights = [f"{seg.speaker} noted: {sent}" for seg, sent in ranked[:2]]
    return " ".join([opener, *highlights]).strip()


def _heuristic_chapters(
    segments: list[ParsedSegment],
    word_counts: Counter[str],
    surface_forms: dict[str, Counter[str]],
) -> list[ChapterDraft]:
    # Split into roughly equal-length chunks — about one chapter per 6 turns, between 1 and 6.
    n_chapters = max(1, min(6, len(segments) // 6))
    size = -(-len(segments) // n_chapters)
    chapters: list[ChapterDraft] = []
    for i in range(0, len(segments), size):
        chunk = segments[i : i + size]
        local = Counter(
            _term(w) for s in chunk for w in _WORD.findall(s.text) if _term(w) in word_counts
        )
        title_words = [_display(surface_forms[t]) for t, _ in local.most_common(2)]
        title_words = title_words or ["Discussion"]
        ranked = sorted(_sentences(chunk), key=lambda p: _score(p[1], local), reverse=True)
        bullets = [_tidy(sent) for _, sent in ranked[:3]]
        chapters.append(ChapterDraft(" & ".join(title_words), chunk[0].start_ms or 0, bullets))
    return chapters


def _heuristic_action_items(segments: list[ParsedSegment]) -> list[ActionItemDraft]:
    items: list[ActionItemDraft] = []
    seen: set[str] = set()
    for seg, sent in _sentences(segments):
        if not _ACTION_CUE.search(sent):
            continue
        text = _tidy(sent)
        key = text.lower()[:60]
        if key in seen:
            continue
        seen.add(key)
        # "I'll send the deck" belongs to the speaker; otherwise leave it unassigned.
        assignee = seg.speaker if _FIRST_PERSON.search(_FILLER_PREFIX.sub("", sent)) else None
        items.append(ActionItemDraft(text, assignee, seg.start_ms))
        if len(items) == 8:
            break
    return items


def _tidy(sentence: str) -> str:
    s = _FILLER_PREFIX.sub("", sentence.strip())
    s = s[0].upper() + s[1:] if s else s
    return s if len(s) <= 220 else s[:217].rstrip() + "…"


def _join_names(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]
