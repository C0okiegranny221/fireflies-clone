"use client";

import { ArrowLeft, CalendarDays, Clock, Hash, Share2, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { comingSoon } from "@/components/layout/comingSoon";
import { MeetingActionsMenu } from "@/components/meetings/MeetingActionsMenu";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatMeetingDate, parseApiDate } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

export function NotepadHeader({
  meeting,
  onAskFred,
}: {
  meeting: MeetingDetail;
  onAskFred: () => void;
}) {
  const router = useRouter();
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-3 md:px-6">
      <Link
        href="/meetings"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-tertiary hover:bg-surface-hover hover:text-ink"
        aria-label="Back to meetings"
      >
        <ArrowLeft className="size-[18px]" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-ink">{meeting.title}</h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-tertiary">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatMeetingDate(parseApiDate(meeting.started_at))}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(meeting.duration_sec)}
          </span>
          {meeting.channel && (
            <span className="inline-flex items-center gap-0.5">
              <Hash className="size-3.5" />
              {meeting.channel.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <AvatarStack people={meeting.participants} max={5} size="xs" />
            {meeting.participants.length} participants
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={onAskFred} aria-label="AskFred">
          <Sparkles />
          <span className="hidden sm:inline">AskFred</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="hidden md:inline-flex"
          onClick={() => comingSoon("AI Skills")}
        >
          <WandSparkles />
          AI Skills
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => comingSoon("Sharing meetings")}
          aria-label="Share"
        >
          <Share2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <MeetingActionsMenu
          meeting={meeting}
          showOpen={false}
          onDeleted={() => router.push("/meetings")}
        />
      </div>
    </header>
  );
}
