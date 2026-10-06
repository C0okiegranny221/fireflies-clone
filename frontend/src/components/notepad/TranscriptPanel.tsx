"use client";

import { ChevronDown, ChevronUp, LocateFixed, Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { formatClock } from "@/lib/format";
import { findActiveIndex, findMatches, splitByMatches, type TextMatch } from "@/lib/transcript";
import type { Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

import { usePlayerControls, usePlayerTime } from "./PlayerProvider";

export interface Speaker {
  name: string;
  color: string;
}

const TranscriptBlock = memo(function TranscriptBlock({
  segment,
  index,
  speaker,
  showSpeaker,
  active,
  matches,
  currentMatch,
  onSeek,
}: {
  segment: Segment;
  index: number;
  speaker: Speaker;
  showSpeaker: boolean;
  active: boolean;
  /** Matches for this segment only (keeps memo effective while searching). */
  matches: TextMatch[];
  currentMatch: number;
  onSeek: (ms: number) => void;
}) {
  const parts = splitByMatches(segment.text, index, matches);
  return (
    <div
      data-index={index}
      onClick={() => {
        // Don't hijack text selection (e.g. copying a quote).
        if (!window.getSelection()?.toString()) onSeek(segment.start_ms);
      }}
      className={cn(
        "group relative cursor-pointer rounded-lg border-l-2 px-3 py-2 transition-colors",
        showSpeaker ? "mt-3" : "mt-0.5",
        active
          ? "border-brand-500 bg-brand-soft/70"
          : "border-transparent hover:bg-surface-hover/70",
      )}
    >
      {showSpeaker && (
        <div className="mb-1 flex items-center gap-2">
          <Avatar name={speaker.name} color={speaker.color} size="sm" />
          <span className="text-sm font-semibold text-ink">{speaker.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(segment.start_ms);
            }}
            className="rounded px-1 text-xs font-medium text-ink-tertiary tabular-nums hover:bg-brand-soft hover:text-brand-text"
            aria-label={`Play from ${formatClock(segment.start_ms / 1000)}`}
          >
            {formatClock(segment.start_ms / 1000)}
          </button>
        </div>
      )}
      <p className={cn("text-sm leading-6", active ? "text-ink" : "text-ink-secondary")}>
        {parts.map((part, i) =>
          part.matchIndex === undefined ? (
            <span key={i}>{part.text}</span>
          ) : (
            <mark
              key={i}
              data-match={part.matchIndex}
              className={cn(
                "rounded-sm px-0.5 text-ink",
                part.matchIndex === currentMatch
                  ? "bg-highlight-active ring-2 ring-highlight-active"
                  : "bg-highlight",
              )}
            >
              {part.text}
            </mark>
          ),
        )}
      </p>
    </div>
  );
});

function TranscriptSearch({
  query,
  onQuery,
  total,
  current,
  onStep,
}: {
  query: string;
  onQuery: (q: string) => void;
  total: number;
  current: number;
  onStep: (dir: 1 | -1) => void;
}) {
  const navButton =
    "rounded p-1 text-ink-tertiary hover:bg-surface-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex h-9 items-center gap-1 rounded-lg border border-line bg-surface-muted pr-1 pl-2.5 focus-within:border-brand-300 focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/40">
      <Search className="size-4 shrink-0 text-ink-placeholder" />
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onStep(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") onQuery("");
        }}
        placeholder="Search transcript"
        aria-label="Search transcript"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
      />
      {query && (
        <>
          <span className="shrink-0 text-xs text-ink-tertiary tabular-nums" aria-live="polite">
            {total ? `${current + 1}/${total}` : "0 results"}
          </span>
          <button
            type="button"
            className={navButton}
            onClick={() => onStep(-1)}
            disabled={!total}
            aria-label="Previous match"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            className={navButton}
            onClick={() => onStep(1)}
            disabled={!total}
            aria-label="Next match"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            className={navButton}
            onClick={() => onQuery("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function TranscriptPanel({
  segments,
  speakerOf,
  query,
  onQueryChange,
}: {
  segments: Segment[];
  speakerOf: (participantId: number) => Speaker;
  /** Search text; controlled so keyword chips in the notes can search the transcript. */
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const currentMs = usePlayerTime();
  const { seek, playing } = usePlayerControls();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentMatch, setCurrentMatch] = useState(0);
  // Start from the first match whenever the query changes (typed or from a keyword chip).
  const [matchedQuery, setMatchedQuery] = useState(query);
  if (query !== matchedQuery) {
    setMatchedQuery(query);
    setCurrentMatch(0);
  }
  const [following, setFollowing] = useState(true);

  const texts = useMemo(() => segments.map((s) => s.text), [segments]);
  const matches = useMemo(() => findMatches(texts, query), [texts, query]);
  const matchesBySegment = useMemo(() => {
    const map = new Map<number, TextMatch[]>();
    matches.forEach((m) => map.set(m.segment, [...(map.get(m.segment) ?? []), m]));
    return map;
  }, [matches]);

  const activeIndex = findActiveIndex(segments, currentMs);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!container || !el) return;
    container.scrollTo({
      top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Player → transcript: keep the active line in view while following playback.
  useEffect(() => {
    if (following && !query && activeIndex >= 0) scrollToIndex(activeIndex);
  }, [activeIndex, following, query, scrollToIndex]);

  // Search: jump to the current match.
  useEffect(() => {
    const m = matches[currentMatch];
    if (m) scrollToIndex(m.segment);
  }, [matches, currentMatch, scrollToIndex]);

  const step = (dir: 1 | -1) =>
    matches.length && setCurrentMatch((i) => (i + dir + matches.length) % matches.length);

  // Transcript → player. Clicking a line also resumes following from there.
  const onSeek = useCallback(
    (ms: number) => {
      seek(ms);
      setFollowing(true);
    },
    [seek],
  );

  // A manual scroll (wheel/touch/keys) means the user is reading elsewhere: stop following.
  const stopFollowing = () => following && setFollowing(false);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Transcript">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-5">
        <h2 className="shrink-0 text-sm font-semibold text-ink">Transcript</h2>
        <div className="ml-auto w-full max-w-72">
          <TranscriptSearch
            query={query}
            onQuery={onQueryChange}
            total={matches.length}
            current={currentMatch}
            onStep={step}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onWheel={stopFollowing}
          onTouchMove={stopFollowing}
          onKeyDown={(e) =>
            ["PageUp", "PageDown", "ArrowUp", "ArrowDown"].includes(e.key) && stopFollowing()
          }
          className="relative h-full overflow-y-auto px-2 pb-24 md:px-3"
        >
          {segments.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-ink-tertiary">
              This meeting has no transcript.
            </p>
          )}
          {segments.map((s, i) => (
            <TranscriptBlock
              key={s.id}
              segment={s}
              index={i}
              speaker={speakerOf(s.participant_id)}
              showSpeaker={i === 0 || segments[i - 1].participant_id !== s.participant_id}
              active={i === activeIndex}
              matches={matchesBySegment.get(i) ?? EMPTY}
              currentMatch={matchesBySegment.has(i) ? currentMatch : -1}
              onSeek={onSeek}
            />
          ))}
        </div>

        {!following && playing && (
          <button
            type="button"
            onClick={() => {
              setFollowing(true);
              if (activeIndex >= 0) scrollToIndex(activeIndex);
            }}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 animate-pop-in items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-pop hover:bg-gray-800"
          >
            <LocateFixed className="size-3.5" />
            Resume auto-scroll
          </button>
        )}
      </div>
    </section>
  );
}

const EMPTY: TextMatch[] = [];
