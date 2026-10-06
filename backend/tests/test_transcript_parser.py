import pytest

from app.services.transcript_parser import TranscriptParseError, parse_transcript

VTT = """WEBVTT

1
00:00:01.000 --> 00:00:04.500
<v Ada Lovelace>Welcome to the review.</v>

2
00:00:04.500 --> 00:00:09.000
Grace Hopper: Thanks, let's start with the roadmap.

3
00:00:09.000 --> 00:00:12.250
<v Ada Lovelace>Sounds good.
"""


def test_vtt_voice_tags_and_prefixes() -> None:
    segments = parse_transcript("call.vtt", VTT)
    assert [(s.speaker, s.start_ms, s.end_ms) for s in segments] == [
        ("Ada Lovelace", 1000, 4500),
        ("Grace Hopper", 4500, 9000),
        ("Ada Lovelace", 9000, 12250),
    ]
    assert segments[1].text == "Thanks, let's start with the roadmap."


def test_json_seconds_and_wrapped_segments() -> None:
    content = '{"segments": [{"speaker": "A", "text": "Hi", "start": 0}, {"speaker": "B", "text": "Hello there", "start": 2.5, "end": 4}]}'  # noqa: E501
    segments = parse_transcript("t.json", content)
    assert [(s.speaker, s.start_ms, s.end_ms) for s in segments] == [
        ("A", 0, 400),
        ("B", 2500, 4000),
    ]


def test_txt_with_bracket_and_paren_timestamps() -> None:
    content = "[00:00:05] Ada: First point.\nGrace (01:10): Second point.\ncontinued here"
    segments = parse_transcript("notes.txt", content)
    assert [(s.speaker, s.start_ms) for s in segments] == [("Ada", 5000), ("Grace", 70000)]
    assert segments[1].text == "Second point. continued here"


def test_txt_without_timestamps_estimates_monotonic_times() -> None:
    content = "Ada: one two three four five\nAda: six seven\nGrace: eight nine ten"
    segments = parse_transcript("pasted.txt", content)
    assert [s.speaker for s in segments] == ["Ada", "Grace"]  # consecutive turns merged
    assert segments[0].start_ms == 0
    assert segments[1].start_ms == segments[0].end_ms == 7 * 400


@pytest.mark.parametrize(
    ("name", "content"),
    [("a.txt", "   "), ("a.json", "{not json"), ("a.json", '[{"speaker": "A"}]')],
)
def test_invalid_input_raises(name: str, content: str) -> None:
    with pytest.raises(TranscriptParseError):
        parse_transcript(name, content)
