"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatClock } from "@/lib/format";
import type { Chapter, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

import { PLAYBACK_RATES, usePlayerControls, usePlayerTime } from "./PlayerProvider";

const SKIP_MS = 15_000;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** Seek track: speaker-colored segments, chapter ticks, progress and a draggable thumb. */
function SeekBar({
  segments,
  chapters,
  colorOf,
}: {
  segments: Segment[];
  chapters: Chapter[];
  colorOf: (participantId: number) => string;
}) {
  const currentMs = usePlayerTime();
  const { durationMs, seek } = usePlayerControls();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const pct = (ms: number) => `${durationMs ? (ms / durationMs) * 100 : 0}%`;

  const msAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * durationMs);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    seek(msAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const ms = msAt(e.clientX);
    setHoverMs(ms);
    if (dragging) seek(ms);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30_000 : 5_000;
    if (e.key === "ArrowRight") seek(currentMs + step);
    else if (e.key === "ArrowLeft") seek(currentMs - step);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(durationMs);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(durationMs / 1000)}
      aria-valuenow={Math.round(currentMs / 1000)}
      aria-valuetext={`${formatClock(currentMs / 1000)} of ${formatClock(durationMs / 1000)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => !dragging && setHoverMs(null)}
      onKeyDown={onKeyDown}
      className="group relative flex h-6 flex-1 cursor-pointer touch-none items-center outline-none"
    >
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line transition-[height] group-hover:h-2 group-focus-visible:h-2">
        {/* Who was speaking when — the Fireflies speaker timeline, folded into the track. */}
        {segments.map((s) => (
          <span
            key={s.id}
            className="absolute inset-y-0 opacity-35"
            style={{
              left: pct(s.start_ms),
              width: pct(Math.max(0, s.end_ms - s.start_ms)),
              backgroundColor: colorOf(s.participant_id),
            }}
          />
        ))}
        <span
          className="absolute inset-y-0 left-0 bg-brand-500"
          style={{ width: pct(currentMs) }}
        />
      </div>
      {chapters.map((c) => (
        <span
          key={c.id}
          title={c.title}
          className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-surface"
          style={{ left: pct(c.start_ms) }}
        />
      ))}
      <span
        className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand-500 shadow-card transition-transform group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-brand-100"
        style={{ left: pct(currentMs) }}
      />
      {hoverMs !== null && (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-gray-900 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums"
          style={{ left: pct(hoverMs) }}
        >
          {formatClock(hoverMs / 1000)}
        </span>
      )}
    </div>
  );
}

function TimeReadout() {
  const currentMs = usePlayerTime();
  const { durationMs } = usePlayerControls();
  return (
    <span className="shrink-0 text-xs font-medium text-ink-secondary tabular-nums">
      {formatClock(currentMs / 1000)}
      <span className="text-ink-placeholder"> / {formatClock(durationMs / 1000)}</span>
    </span>
  );
}

export function PlayerBar({
  segments,
  chapters,
  colorOf,
}: {
  segments: Segment[];
  chapters: Chapter[];
  colorOf: (participantId: number) => string;
}) {
  const { playing, toggle, skip, rate, setRate } = usePlayerControls();

  // Space toggles playback, ←/→ skip 5s, unless the user is typing.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("[role='dialog'],[role='menu']")) return;
      if (e.key === " ") toggle();
      else if (e.key === "ArrowRight") skip(5_000);
      else if (e.key === "ArrowLeft") skip(-5_000);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip]);

  const iconButton =
    "flex size-8 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink";

  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-t border-line bg-surface px-3 sm:gap-3 md:px-6">
      <Tooltip content="Back 15s">
        <button
          type="button"
          className={iconButton}
          onClick={() => skip(-SKIP_MS)}
          aria-label="Back 15 seconds"
        >
          <RotateCcw className="size-[18px]" />
        </button>
      </Tooltip>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition-colors hover:bg-brand-600"
      >
        {playing ? (
          <Pause className="size-[18px] fill-current" />
        ) : (
          <Play className="ml-0.5 size-[18px] fill-current" />
        )}
      </button>
      <Tooltip content="Forward 15s">
        <button
          type="button"
          className={iconButton}
          onClick={() => skip(SKIP_MS)}
          aria-label="Forward 15 seconds"
        >
          <RotateCw className="size-[18px]" />
        </button>
      </Tooltip>

      <TimeReadout />
      <SeekBar segments={segments} chapters={chapters} colorOf={colorOf} />

      <Menu>
        <MenuTrigger
          className={cn(
            "h-7 shrink-0 rounded-md border border-line px-2 text-xs font-semibold text-ink-secondary tabular-nums outline-none hover:bg-surface-hover",
            rate !== 1 && "border-brand-200 bg-brand-soft text-brand-text",
          )}
          aria-label="Playback speed"
        >
          {rate}x
        </MenuTrigger>
        <MenuContent side="top" className="min-w-28">
          <MenuLabel>Speed</MenuLabel>
          {PLAYBACK_RATES.map((r) => (
            <MenuItem
              key={r}
              onSelect={() => setRate(r)}
              className={cn(r === rate && "text-brand-text")}
            >
              {r}x
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    </div>
  );
}
