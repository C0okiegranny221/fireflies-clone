"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerControls {
  durationMs: number;
  playing: boolean;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Jump to an absolute position (clamped to the recording). */
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  setRate: (rate: number) => void;
}

// Time changes many times a second; keeping it in its own context means components that
// only need the controls (buttons, transcript click handlers) don't re-render on every tick.
const TimeContext = createContext<number | null>(null);
const ControlsContext = createContext<PlayerControls | null>(null);

/** Only publish time changes this large, to bound re-renders while playing (~10/s). */
const TICK_MS = 100;

/**
 * Single source of truth for playback. With a `mediaUrl` it drives a real <audio> element;
 * without one (transcripts have no recording in this demo) it runs a wall-clock timer, so
 * seeking, speed and transcript sync behave identically either way.
 */
export function PlayerProvider({
  durationMs,
  mediaUrl,
  initialMs = 0,
  children,
}: {
  durationMs: number;
  mediaUrl?: string | null;
  /** Start position, e.g. from a ?t= deep link. */
  initialMs?: number;
  children: ReactNode;
}) {
  const startMs = Math.min(Math.max(0, initialMs), durationMs);
  const [currentMs, setCurrentMs] = useState(startMs);
  // Mirror of the last published position, so controls can read it without depending on
  // `currentMs` (which would recreate the controls object on every tick).
  const currentRef = useRef(startMs);
  const publish = useCallback((ms: number) => {
    currentRef.current = ms;
    setCurrentMs(ms);
  }, []);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  // Fake clock: position = baseMs + elapsed wall time × rate since baseTime.
  const clock = useRef({ baseMs: startMs, baseTime: 0, rate: 1 });

  const clamp = useCallback((ms: number) => Math.min(Math.max(0, ms), durationMs), [durationMs]);

  const position = useCallback(() => {
    if (audioRef.current) return audioRef.current.currentTime * 1000;
    const c = clock.current;
    return c.baseMs + (performance.now() - c.baseTime) * c.rate;
  }, []);

  // Publish the position on every animation frame while playing.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const ms = clamp(position());
      if (Math.abs(ms - currentRef.current) >= TICK_MS || ms === durationMs) publish(ms);
      if (ms >= durationMs) {
        setPlaying(false);
        audioRef.current?.pause();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, durationMs, clamp, position, publish]);

  const seek = useCallback(
    (ms: number) => {
      const target = clamp(ms);
      if (audioRef.current) audioRef.current.currentTime = target / 1000;
      clock.current = { ...clock.current, baseMs: target, baseTime: performance.now() };
      publish(target);
    },
    [clamp, publish],
  );

  const play = useCallback(() => {
    // Restart from the top when play is pressed at the end.
    const from = currentRef.current >= durationMs ? 0 : currentRef.current;
    clock.current = { ...clock.current, baseMs: from, baseTime: performance.now() };
    if (audioRef.current) {
      audioRef.current.currentTime = from / 1000;
      void audioRef.current.play().catch(() => setPlaying(false));
    }
    publish(from);
    setPlaying(true);
  }, [durationMs, publish]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    const ms = clamp(position());
    clock.current = { ...clock.current, baseMs: ms, baseTime: performance.now() };
    publish(ms);
    setPlaying(false);
  }, [clamp, position, publish]);

  const setRate = useCallback(
    (next: number) => {
      // Re-base the clock so changing speed doesn't jump the position.
      const ms = playing ? clamp(position()) : currentRef.current;
      clock.current = { baseMs: ms, baseTime: performance.now(), rate: next };
      if (audioRef.current) audioRef.current.playbackRate = next;
      setRateState(next);
    },
    [playing, clamp, position],
  );

  const controls = useMemo<PlayerControls>(
    () => ({
      durationMs,
      playing,
      rate,
      play,
      pause,
      toggle: () => (playing ? pause() : play()),
      seek,
      skip: (delta) => seek((playing ? position() : currentRef.current) + delta),
      setRate,
    }),
    [durationMs, playing, rate, play, pause, seek, setRate, position],
  );

  return (
    <ControlsContext value={controls}>
      <TimeContext value={currentMs}>
        {mediaUrl && (
          // Captions are the transcript itself, rendered alongside.
          <audio
            ref={audioRef}
            src={mediaUrl}
            preload="metadata"
            className="hidden"
            // Apply a deep-link start position once the browser knows the media's length.
            onLoadedMetadata={(e) => {
              if (currentRef.current > 0) e.currentTarget.currentTime = currentRef.current / 1000;
            }}
          />
        )}
        {children}
      </TimeContext>
    </ControlsContext>
  );
}

export function usePlayerTime(): number {
  const ms = useContext(TimeContext);
  if (ms === null) throw new Error("usePlayerTime must be used inside <PlayerProvider>");
  return ms;
}

export function usePlayerControls(): PlayerControls {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error("usePlayerControls must be used inside <PlayerProvider>");
  return ctx;
}
