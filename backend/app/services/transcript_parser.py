"""
Parse uploaded or pasted transcripts into speaker segments.

Supported formats:
- .vtt  WebVTT cues; speaker from `<v Name>` voice tags or a `Name:` prefix.
- .json A list of {speaker, text, start, end?} (seconds) or {speaker, text, start_ms, end_ms?},
        optionally wrapped as {"segments": [...]}.
- .txt  One turn per line: `[00:01:23] Name: text`, `Name (01:23): text`, or plain `Name: text`.
        Lines without a speaker continue the previous turn. Missing timestamps are estimated
        from word count.
"""

import json
import re
from dataclasses import dataclass
from pathlib import PurePath

MS_PER_WORD = 400  # ~150 words per minute, used when a transcript has no timestamps
UNKNOWN_SPEAKER = "Speaker 1"


class TranscriptParseError(ValueError):
    pass


@dataclass
class ParsedSegment:
    speaker: str
    text: str
    start_ms: int | None = None
    end_ms: int | None = None


_TIME = r"(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?"
_VTT_CUE = re.compile(rf"^\s*{_TIME}\s*-->\s*{_TIME}")
_VTT_VOICE = re.compile(r"^<v(?:\.[^\s>]+)?\s+([^>]+)>(.*?)(?:</v>)?$")
_SPEAKER_PREFIX = re.compile(r"^([A-Z][\w .'\-]{0,60}?):\s+(.+)$")
_TXT_BRACKET = re.compile(rf"^\[{_TIME}\]\s*([^:]{{1,60}}):\s*(.+)$")
_TXT_PAREN = re.compile(rf"^([^(:]{{1,60}}?)\s*\({_TIME}\)\s*:?\s*(.+)$")
_TAG = re.compile(r"<[^>]+>")


def _to_ms(h: str | None, m: str, s: str, frac: str | None) -> int:
    ms = int((frac or "0").ljust(3, "0")[:3])
    return ((int(h or 0) * 60 + int(m)) * 60 + int(s)) * 1000 + ms


def parse_transcript(filename: str, content: str) -> list[ParsedSegment]:
    """Detect the format from the file extension (falling back to content) and parse it."""
    suffix = PurePath(filename).suffix.lower()
    text = content.lstrip("﻿").strip()
    if not text:
        raise TranscriptParseError("Transcript is empty")

    if suffix == ".vtt" or text.startswith("WEBVTT"):
        segments = _parse_vtt(text)
    elif suffix == ".json":
        segments = _parse_json(text)
    elif text[0] in "[{":
        # Pasted text may be JSON, or a .txt whose first line starts with "[00:01:23]".
        try:
            segments = _parse_json(text)
        except TranscriptParseError:
            segments = _parse_txt(text)
    else:
        segments = _parse_txt(text)

    if not segments:
        raise TranscriptParseError("No transcript lines found")
    return _fill_times(_merge_consecutive(segments))


def _parse_vtt(text: str) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []
    for block in re.split(r"\n\s*\n", text):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        cue_idx = next((i for i, ln in enumerate(lines) if _VTT_CUE.match(ln)), None)
        if cue_idx is None:
            continue  # header, NOTE or STYLE block
        m = _VTT_CUE.match(lines[cue_idx])
        assert m is not None
        start, end = _to_ms(*m.groups()[:4]), _to_ms(*m.groups()[4:])
        body = " ".join(lines[cue_idx + 1 :])
        speaker = segments[-1].speaker if segments else UNKNOWN_SPEAKER
        if voice := _VTT_VOICE.match(body):
            speaker, body = voice.group(1).strip(), voice.group(2)
        elif prefixed := _SPEAKER_PREFIX.match(body):
            speaker, body = prefixed.group(1).strip(), prefixed.group(2)
        body = _TAG.sub("", body).strip()
        if body:
            segments.append(ParsedSegment(speaker, body, start, end))
    return segments


def _parse_json(text: str) -> list[ParsedSegment]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise TranscriptParseError(f"Invalid JSON: {exc.msg}") from exc
    if isinstance(data, dict):
        data = data.get("segments") or data.get("transcript") or []
    if not isinstance(data, list):
        raise TranscriptParseError("JSON transcript must be a list of segments")

    segments: list[ParsedSegment] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict) or not str(item.get("text", "")).strip():
            raise TranscriptParseError(f"Segment {i} is missing 'text'")
        speaker = str(item.get("speaker") or item.get("speaker_name") or UNKNOWN_SPEAKER)
        segments.append(
            ParsedSegment(
                speaker=speaker.strip(),
                text=str(item["text"]).strip(),
                start_ms=_json_time(item, "start"),
                end_ms=_json_time(item, "end"),
            )
        )
    return segments


def _json_time(item: dict, key: str) -> int | None:
    if (ms := item.get(f"{key}_ms")) is not None:
        return int(ms)
    if (sec := item.get(key)) is not None:
        return int(float(sec) * 1000)
    return None


def _parse_txt(text: str) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if m := _TXT_BRACKET.match(line):
            *time, speaker, body = m.groups()
            segments.append(ParsedSegment(speaker.strip(), body.strip(), _to_ms(*time)))
        elif m := _TXT_PAREN.match(line):
            speaker, *time, body = m.groups()
            segments.append(ParsedSegment(speaker.strip(), body.strip(), _to_ms(*time)))
        elif m := _SPEAKER_PREFIX.match(line):
            segments.append(ParsedSegment(m.group(1).strip(), m.group(2).strip()))
        elif segments:
            segments[-1].text += " " + line
        else:
            segments.append(ParsedSegment(UNKNOWN_SPEAKER, line))
    return segments


def _merge_consecutive(segments: list[ParsedSegment]) -> list[ParsedSegment]:
    """Join back-to-back untimed lines from the same speaker into one turn."""
    merged: list[ParsedSegment] = []
    for seg in segments:
        prev = merged[-1] if merged else None
        if prev and prev.speaker == seg.speaker and seg.start_ms is None:
            prev.text += " " + seg.text
        else:
            merged.append(seg)
    return merged


def _fill_times(segments: list[ParsedSegment]) -> list[ParsedSegment]:
    """Estimate missing start times from word counts, then close each segment at the next start."""
    cursor = 0
    for seg in segments:
        if seg.start_ms is None:
            seg.start_ms = cursor
        estimated_end = seg.start_ms + len(seg.text.split()) * MS_PER_WORD
        cursor = max(seg.end_ms or estimated_end, seg.start_ms)

    for seg, nxt in zip(segments, [*segments[1:], None], strict=True):
        if seg.end_ms is None:
            words_end = seg.start_ms + len(seg.text.split()) * MS_PER_WORD
            seg.end_ms = min(words_end, nxt.start_ms) if nxt else words_end
        seg.end_ms = max(seg.end_ms, seg.start_ms)
    return segments
