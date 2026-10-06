"use client";

import { CircleCheckBig, Hash } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatDuration, parseApiDate } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import { MeetingActionsMenu } from "./MeetingActionsMenu";
import { SourceIcon } from "./SourceIcon";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function MeetingRow({
  meeting,
  selected,
  selectionActive,
  onToggleSelected,
}: {
  meeting: MeetingListItem;
  selected: boolean;
  selectionActive: boolean;
  onToggleSelected: () => void;
}) {
  const started = parseApiDate(meeting.started_at);

  return (
    <li
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 transition-colors md:px-5",
        selected ? "bg-brand-soft/60" : "hover:bg-surface-muted",
      )}
    >
      {/* Checkbox appears on hover, or always once anything is selected. */}
      <div
        className={cn(
          "relative z-10 transition-opacity",
          selected || selectionActive
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label={`Select ${meeting.title}`}
        />
      </div>

      <SourceIcon source={meeting.source} />

      <div className="min-w-0 flex-1">
        <Link
          href={`/meetings/${meeting.id}`}
          className="block truncate text-sm font-semibold text-ink outline-none group-hover:text-brand-text after:absolute after:inset-0 focus-visible:underline"
        >
          {meeting.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-tertiary">
          <span>{timeFormat.format(started)}</span>
          <span aria-hidden>·</span>
          <span>{formatDuration(meeting.duration_sec)}</span>
          {meeting.channel && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Hash className="size-3" />
                {meeting.channel.name}
              </span>
            </>
          )}
        </div>
        {meeting.overview && (
          <p className="mt-1 hidden max-w-3xl truncate text-xs text-ink-secondary lg:block">
            {meeting.overview}
          </p>
        )}
      </div>

      <div className="hidden items-center gap-1.5 xl:flex">
        {meeting.tags.slice(0, 2).map((t) => (
          <span
            key={t.id}
            className="rounded-md bg-surface-hover px-1.5 py-0.5 text-xs font-medium text-ink-secondary"
          >
            #{t.name}
          </span>
        ))}
      </div>

      {meeting.action_item_count > 0 && (
        <span
          className="hidden items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-ink-secondary sm:inline-flex"
          title={`${meeting.action_item_count} action items`}
        >
          <CircleCheckBig className="size-3.5 text-ink-tertiary" />
          {meeting.action_item_count}
        </span>
      )}

      <div className="hidden sm:block">
        <AvatarStack people={meeting.participants} max={4} />
      </div>

      <div className="relative z-10">
        <MeetingActionsMenu meeting={meeting} />
      </div>
    </li>
  );
}
