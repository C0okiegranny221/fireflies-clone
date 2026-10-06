import { describe, expect, it } from "vitest";

import { findActiveIndex, findMatches, splitByMatches, talkTime } from "./transcript";

const segs = [
  { start_ms: 0, end_ms: 1000 },
  { start_ms: 1000, end_ms: 4000 },
  { start_ms: 6000, end_ms: 9000 }, // gap 4000–6000
];

describe("findActiveIndex", () => {
  it.each([
    [0, 0],
    [999, 0],
    [1000, 1],
    [5000, 1], // inside a gap keeps the previous segment active
    [6000, 2],
    [60_000, 2], // past the end
  ])("at %ims → %i", (ms, expected) => {
    expect(findActiveIndex(segs, ms)).toBe(expected);
  });

  it("returns -1 before the first segment or for an empty transcript", () => {
    expect(findActiveIndex([{ start_ms: 500, end_ms: 900 }], 100)).toBe(-1);
    expect(findActiveIndex([], 100)).toBe(-1);
  });
});

describe("findMatches / splitByMatches", () => {
  const texts = ["Export the PDF export", "no match", "EXPORT"];

  it("finds every case-insensitive occurrence in order", () => {
    expect(findMatches(texts, " export ")).toEqual([
      { index: 0, segment: 0, start: 0, end: 6 },
      { index: 1, segment: 0, start: 15, end: 21 },
      { index: 2, segment: 2, start: 0, end: 6 },
    ]);
    expect(findMatches(texts, "  ")).toEqual([]);
  });

  it("splits text into plain and highlighted parts with global match indexes", () => {
    const matches = findMatches(texts, "export");
    expect(splitByMatches(texts[0], 0, matches)).toEqual([
      { text: "Export", matchIndex: 0 },
      { text: " the PDF " },
      { text: "export", matchIndex: 1 },
    ]);
    expect(splitByMatches(texts[2], 2, matches)).toEqual([{ text: "EXPORT", matchIndex: 2 }]);
    expect(splitByMatches(texts[1], 1, matches)).toEqual([{ text: "no match" }]);
    // Passing only one segment's matches keeps their global indexes.
    const segment2Only = matches.filter((m) => m.segment === 2);
    expect(splitByMatches(texts[2], 2, segment2Only)).toEqual([{ text: "EXPORT", matchIndex: 2 }]);
  });
});

describe("talkTime", () => {
  it("sums durations per speaker and sorts by share", () => {
    const shares = talkTime([
      { participant_id: 1, start_ms: 0, end_ms: 1000 },
      { participant_id: 2, start_ms: 1000, end_ms: 4000 },
      { participant_id: 1, start_ms: 4000, end_ms: 5000 },
    ]);
    expect(shares.map((s) => [s.participantId, s.ms])).toEqual([
      [2, 3000],
      [1, 2000],
    ]);
    expect(shares[0].share).toBeCloseTo(0.6);
  });
});
