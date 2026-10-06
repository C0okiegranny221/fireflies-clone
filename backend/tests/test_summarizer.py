from app.models import SummarySource
from app.services.summarizer import summarize_heuristic
from app.services.transcript_parser import parse_transcript

TRANSCRIPT = """
Ada: Thanks for joining. Today we need to decide on the pricing page redesign and the launch date.
Grace: The pricing page redesign is almost done. The new pricing tiers tested well with customers.
Ada: Great. I'll send the final pricing tiers to marketing by Friday.
Grace: We also need to update the launch checklist before the launch date is confirmed.
Ada: Agreed, the launch date depends on the pricing approval from finance.
"""


def test_heuristic_summary_extracts_keywords_chapters_and_actions() -> None:
    segments = parse_transcript("t.txt", TRANSCRIPT)
    draft = summarize_heuristic("Launch sync", segments)

    assert draft.source is SummarySource.HEURISTIC
    assert "Pricing" in draft.keywords
    assert "Ada" not in draft.keywords  # speaker names are not topics
    assert draft.overview.startswith("Ada and Grace met for")
    assert draft.chapters and draft.chapters[0].start_ms == 0

    owned = {a.text: a.assignee for a in draft.action_items}
    assert owned["I'll send the final pricing tiers to marketing by Friday."] == "Ada"
    assert any(a.assignee is None for a in draft.action_items)  # "We also need to..."
