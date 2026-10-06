/** Pure transcript helpers shared by the player, transcript panel and summary. */

export interface Timed {
  start_ms: number;
  end_ms: number;
}

/**
 * Index of the segment playing at `ms`: the last segment whose start is <= ms.
 * Binary search, since this runs on every player tick. Returns -1 before the first segment.
 * Gaps between segments keep the previous one active, which reads naturally while listening.
 */
export function findActiveIndex(segments: readonly Timed[], ms: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_ms <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export interface TextMatch {
  /** Position in the full, ordered match list (what "3/12" in the search bar refers to). */
  index: number;
  /** Index into the segments array. */
  segment: number;
  start: number;
  end: number;
}

/** Every case-insensitive occurrence of `query` across segment texts, in reading order. */
export function findMatches(texts: readonly string[], query: string): TextMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: TextMatch[] = [];
  texts.forEach((text, segment) => {
    const haystack = text.toLowerCase();
    let from = 0;
    for (;;) {
      const start = haystack.indexOf(needle, from);
      if (start === -1) break;
      matches.push({ index: matches.length, segment, start, end: start + needle.length });
      from = start + needle.length;
    }
  });
  return matches;
}

export interface TextPart {
  text: string;
  /** Index of the match within the full match list, when this part is highlighted. */
  matchIndex?: number;
}

/**
 * Split one segment's text into plain and highlighted parts for rendering. `matches` may be
 * the full list or just this segment's matches; highlights keep their global index either way.
 */
export function splitByMatches(
  text: string,
  segment: number,
  matches: readonly TextMatch[],
): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.segment !== segment) continue;
    if (m.start > cursor) parts.push({ text: text.slice(cursor, m.start) });
    parts.push({ text: text.slice(m.start, m.end), matchIndex: m.index });
    cursor = m.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export interface SpeakerShare {
  participantId: number;
  ms: number;
  share: number;
}

/** Talk time per speaker, largest first, from segment durations. */
export function talkTime(
  segments: readonly (Timed & { participant_id: number })[],
): SpeakerShare[] {
  const totals = new Map<number, number>();
  for (const s of segments) {
    totals.set(
      s.participant_id,
      (totals.get(s.participant_id) ?? 0) + Math.max(0, s.end_ms - s.start_ms),
    );
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([participantId, ms]) => ({ participantId, ms, share: ms / sum }))
    .sort((a, b) => b.ms - a.ms);
}
