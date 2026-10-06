"""
Generate spoken audio for the seed meetings with macOS text-to-speech, and re-time the
seed transcripts to match it.

    python -m app.seed.generate_audio            # all meetings
    python -m app.seed.generate_audio 01 03      # only files whose name starts with these

For each seed file, every transcript line is spoken in its speaker's voice (`say`), the
clips are joined with short pauses and encoded as a mono MP3 (`ffmpeg`) into
frontend/public/audio/. Segment start times in the JSON are then rewritten from the real
clip lengths, and chapter / action-item times are moved to the line they pointed at, so
the player, transcript highlight and notes stay in sync.

Requires macOS (`say`) and ffmpeg. This is a dev-time tool; the app only reads the output.
"""

import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from app.seed.seed import DATA_DIR, _ms

AUDIO_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "audio"
SAMPLE_RATE = 22050
WORDS_PER_MINUTE = 185
LEAD_IN_MS = 300
GAP_MS = 450  # pause between speaker turns

# Distinct built-in macOS voices per seed speaker.
VOICES = {
    "Alex Rivera": "Reed (English (US))",
    "Priya Shah": "Tara",
    "Marcus Lee": "Daniel",
    "Jenna Kim": "Samantha",
    "Hannah Brooks": "Karen",
    "Daniel Ortiz": "Eddy (English (US))",
    "Sofia Romero": "Flo (English (US))",
    "Ravi Kumar": "Rishi (English (India))",
    "Lena Fischer": "Moira",
    "Sam Patel": "Aman",
    "Olivia Grant": "Shelley (English (UK))",
}
DEFAULT_VOICE = "Samantha"


def _clock(ms: int) -> str:
    """Format ms as "m:ss.s" (tenths keep the transcript within 100ms of the audio)."""
    minutes, rest = divmod(ms, 60_000)
    return f"{minutes}:{rest / 1000:04.1f}"


def _speak(text: str, voice: str, out: Path) -> int:
    """Render one line to a WAV file and return its duration in ms."""
    subprocess.run(
        [
            "say",
            "-v",
            voice,
            "-r",
            str(WORDS_PER_MINUTE),
            "--file-format=WAVE",
            f"--data-format=LEI16@{SAMPLE_RATE}",
            "-o",
            str(out),
            text,
        ],
        check=True,
    )
    with wave.open(str(out)) as w:
        return round(w.getnframes() / w.getframerate() * 1000)


def _silence(ms: int, out: Path) -> None:
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(b"\x00\x00" * (SAMPLE_RATE * ms // 1000))


def _dump(data: object) -> str:
    """Pretty JSON in the hand-written seed style: flat arrays/objects stay on one line when
    short, and transcript rows ([start, speaker, text]) are always one line per turn."""

    def fmt(value: object, depth: int) -> str:
        flat = json.dumps(value, ensure_ascii=False)
        if not isinstance(value, list | dict):
            return flat
        items = value.values() if isinstance(value, dict) else value
        nested = any(isinstance(v, list | dict) for v in items)
        is_row = isinstance(value, list) and len(value) == 3 and not nested
        if not nested and (is_row or len(flat) + 2 * depth <= 100):
            return flat
        pad, inner = "  " * depth, "  " * (depth + 1)
        if isinstance(value, dict):
            body = ",\n".join(
                f"{inner}{json.dumps(k, ensure_ascii=False)}: {fmt(v, depth + 1)}"
                for k, v in value.items()
            )
            return f"{{\n{body}\n{pad}}}"
        body = ",\n".join(f"{inner}{fmt(v, depth + 1)}" for v in value)
        return f"[\n{body}\n{pad}]"

    return fmt(data, 0) + "\n"


def _remap(old_ms: int, old_starts: list[int], new_starts: list[int]) -> int:
    """Move a timestamp to the new start of the segment that was playing at that time."""
    index = max((i for i, s in enumerate(old_starts) if s <= old_ms), default=0)
    return new_starts[index]


def generate(path: Path, workdir: Path) -> None:
    data = json.loads(path.read_text())
    segments = data["segments"]
    old_starts = [_ms(start) for start, _, _ in segments]

    gap = workdir / "gap.wav"
    _silence(GAP_MS, gap)
    lead = workdir / "lead.wav"
    _silence(LEAD_IN_MS, lead)

    parts = [lead]
    new_starts: list[int] = []
    cursor = LEAD_IN_MS
    for i, (_, speaker, text) in enumerate(segments):
        clip = workdir / f"{i:04d}.wav"
        duration = _speak(text, VOICES.get(speaker, DEFAULT_VOICE), clip)
        new_starts.append(cursor)
        parts += [clip, gap]
        cursor += duration + GAP_MS

    playlist = workdir / "parts.txt"
    playlist.write_text("".join(f"file '{p}'\n" for p in parts))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    out = AUDIO_DIR / f"{path.stem}.mp3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(playlist),
            "-ac", "1", "-c:a", "libmp3lame", "-b:a", "40k",
            str(out),
        ],
        check=True,
    )  # fmt: skip

    for seg, start in zip(segments, new_starts, strict=True):
        seg[0] = _clock(start)
    for chapter in data["summary"]["chapters"]:
        chapter["start"] = _clock(_remap(_ms(chapter["start"]), old_starts, new_starts))
    for item in data["action_items"]:
        item["at"] = _clock(_remap(_ms(item["at"]), old_starts, new_starts))
    data["media"] = f"/audio/{out.name}"
    data["duration"] = _clock(cursor - GAP_MS)  # no trailing pause after the last line
    path.write_text(_dump(data))

    size_kb = out.stat().st_size // 1024
    print(f"{path.stem}: {len(segments)} lines, {_clock(cursor)} audio, {size_kb} KB")


def main(prefixes: list[str]) -> None:
    for tool in ("say", "ffmpeg"):
        if shutil.which(tool) is None:
            sys.exit(f"{tool} is required (macOS `say` and ffmpeg)")
    files = sorted(DATA_DIR.glob("*.json"))
    if prefixes:
        files = [f for f in files if f.name.startswith(tuple(prefixes))]
    for path in files:
        with tempfile.TemporaryDirectory() as tmp:
            generate(path, Path(tmp))


if __name__ == "__main__":
    main(sys.argv[1:])
