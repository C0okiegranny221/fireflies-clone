"""Render a meeting's notes and transcript as Markdown or plain text for download."""

import re
from typing import Literal

from app.models import Meeting

ExportFormat = Literal["md", "txt"]


def _clock(ms: int) -> str:
    s = ms // 1000
    if s >= 3600:
        return f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}"
    return f"{s // 60}:{s % 60:02d}"


def filename(meeting: Meeting, fmt: ExportFormat) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", meeting.title.lower()).strip("-") or "meeting"
    return f"{slug[:60]}.{fmt}"


def render(meeting: Meeting, fmt: ExportFormat) -> str:
    return _markdown(meeting) if fmt == "md" else _plain_text(meeting)


def _header(meeting: Meeting) -> list[str]:
    people = ", ".join(link.participant.name for link in meeting.participant_links)
    return [
        f"Date: {meeting.started_at:%B %d, %Y %H:%M} UTC",
        f"Duration: {round(meeting.duration_sec / 60)} min",
        f"Participants: {people}",
    ]


def _markdown(meeting: Meeting) -> str:
    out = [f"# {meeting.title}", "", *(f"- {line}" for line in _header(meeting)), ""]
    summary = meeting.summary
    if summary:
        if summary.keywords:
            out += [f"**Keywords:** {', '.join(summary.keywords)}", ""]
        out += ["## Overview", "", summary.overview, ""]
        if summary.chapters:
            out += ["## Notes", ""]
            for chapter in summary.chapters:
                out.append(f"### {chapter.title} ({_clock(chapter.start_ms)})")
                out += [f"- {b}" for b in chapter.bullets] + [""]
    if meeting.action_items:
        out += ["## Action items", ""]
        for item in meeting.action_items:
            owner = f" — {item.assignee.name}" if item.assignee else ""
            out.append(f"- [{'x' if item.is_completed else ' '}] {item.text}{owner}")
        out.append("")
    out += ["## Transcript", ""]
    for seg in meeting.segments:
        out += [f"**{seg.speaker.name}** ({_clock(seg.start_ms)})  ", seg.text, ""]
    return "\n".join(out).rstrip() + "\n"


def _plain_text(meeting: Meeting) -> str:
    out = [meeting.title.upper(), "=" * len(meeting.title), *_header(meeting), ""]
    summary = meeting.summary
    if summary:
        out += ["OVERVIEW", summary.overview, ""]
        for chapter in summary.chapters:
            out.append(f"{chapter.title} ({_clock(chapter.start_ms)})")
            out += [f"  - {b}" for b in chapter.bullets]
        out.append("")
    if meeting.action_items:
        out.append("ACTION ITEMS")
        for item in meeting.action_items:
            owner = f" ({item.assignee.name})" if item.assignee else ""
            out.append(f"  [{'x' if item.is_completed else ' '}] {item.text}{owner}")
        out.append("")
    out.append("TRANSCRIPT")
    out += [f"[{_clock(s.start_ms)}] {s.speaker.name}: {s.text}" for s in meeting.segments]
    return "\n".join(out).rstrip() + "\n"
