"use client";

import { useQuery } from "@tanstack/react-query";
import { FileQuestion, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, ApiError, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";

import { IconRail } from "./IconRail";
import { NotepadHeader } from "./NotepadHeader";
import { PlayerBar } from "./PlayerBar";
import { PlayerProvider } from "./PlayerProvider";
import { SummaryPanel } from "./SummaryPanel";
import { TranscriptPanel, type Speaker } from "./TranscriptPanel";

const UNKNOWN_SPEAKER: Speaker = { name: "Unknown speaker", color: "#98A2B3" };

function NotepadSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading meeting">
      <div className="border-b border-line bg-surface px-6 py-4">
        <div className="h-5 w-72 animate-pulse rounded bg-surface-hover" />
        <div className="mt-2 h-3 w-96 max-w-full animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="flex flex-1 gap-6 p-6">
        {[0, 1].map((col) => (
          <div key={col} className="flex-1 space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-surface-hover"
                style={{ width: `${90 - ((i * 13) % 40)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Fireflies "Notepad": AI notes on the left, transcript on the right, player below. */
export function MeetingView({ id, startMs = 0 }: { id: number; startMs?: number }) {
  const meetingQuery = useQuery({
    queryKey: queryKeys.meeting(id),
    queryFn: () => api.meetings.get(id),
  });
  const transcriptQuery = useQuery({
    queryKey: queryKeys.transcript(id),
    queryFn: () => api.meetings.transcript(id),
  });
  const notesRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"notes" | "transcript">("notes");

  const meeting = meetingQuery.data;
  const segments = useMemo(() => transcriptQuery.data?.segments ?? [], [transcriptQuery.data]);

  const speakers = useMemo(
    () =>
      new Map((meeting?.participants ?? []).map((p) => [p.id, { name: p.name, color: p.color }])),
    [meeting?.participants],
  );
  const speakerOf = useCallback((pid: number) => speakers.get(pid) ?? UNKNOWN_SPEAKER, [speakers]);
  const colorOf = useCallback((pid: number) => speakerOf(pid).color, [speakerOf]);

  const jumpToSection = (sectionId: string) => {
    setMobileTab("notes");
    const container = notesRef.current;
    const el = document.getElementById(sectionId);
    if (container && el) container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
  };

  const searchTranscript = (keyword: string) => {
    setSearchQuery(keyword);
    setMobileTab("transcript");
  };

  if (meetingQuery.isPending || transcriptQuery.isPending) return <NotepadSkeleton />;

  if (meetingQuery.isError || transcriptQuery.isError) {
    const error = meetingQuery.error ?? transcriptQuery.error;
    const notFound = error instanceof ApiError && error.status === 404;
    return notFound ? (
      <EmptyState
        icon={FileQuestion}
        title="Meeting not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Link href="/meetings">
            <Button>Back to meetings</Button>
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={RefreshCcw}
        title="Couldn't load this meeting"
        description={error?.message}
        action={
          <Button onClick={() => (meetingQuery.refetch(), transcriptQuery.refetch())}>
            Try again
          </Button>
        }
      />
    );
  }

  const lastEnd = segments.at(-1)?.end_ms ?? 0;
  const durationMs = Math.max(meeting!.duration_sec * 1000, lastEnd);
  const tabClass = (tab: typeof mobileTab) =>
    cn(
      "flex-1 border-b-2 py-2.5 text-sm font-semibold",
      mobileTab === tab
        ? "border-brand-500 text-brand-text"
        : "border-transparent text-ink-tertiary",
    );

  return (
    // Keyed so moving between meetings (or deep links) starts a fresh player.
    <PlayerProvider
      key={`${id}:${startMs}`}
      durationMs={durationMs}
      mediaUrl={meeting!.media_url}
      initialMs={startMs}
    >
      <title>{`${meeting!.title} | Fireflies`}</title>
      <div className="flex h-full min-h-0 flex-col">
        <NotepadHeader meeting={meeting!} />

        {/* Below lg the two panels become tabs. */}
        <div className="flex shrink-0 border-b border-line bg-surface lg:hidden" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "notes"}
            className={tabClass("notes")}
            onClick={() => setMobileTab("notes")}
          >
            AI Notes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "transcript"}
            className={tabClass("transcript")}
            onClick={() => setMobileTab("transcript")}
          >
            Transcript
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <IconRail onJump={jumpToSection} />
          <div
            ref={notesRef}
            className={cn(
              "relative min-h-0 overflow-y-auto border-line bg-surface lg:block lg:w-[44%] lg:max-w-2xl lg:border-r",
              mobileTab === "notes" ? "block w-full" : "hidden",
            )}
          >
            <SummaryPanel meeting={meeting!} onKeyword={searchTranscript} />
          </div>
          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 bg-surface lg:block",
              mobileTab === "transcript" ? "block" : "hidden",
            )}
          >
            <TranscriptPanel
              segments={segments}
              speakerOf={speakerOf}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </div>
        </div>

        <PlayerBar
          segments={segments}
          chapters={meeting!.summary?.chapters ?? []}
          colorOf={colorOf}
        />
      </div>
    </PlayerProvider>
  );
}
