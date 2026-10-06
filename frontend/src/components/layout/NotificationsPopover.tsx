"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api, queryKeys } from "@/lib/api";
import { parseApiDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const RECENT = { page_size: 5 } as const;

/** "Your notes are ready" feed built from the most recent meetings. */
export function NotificationsPopover() {
  const [seen, setSeen] = useState(false);
  const { data } = useQuery({
    queryKey: queryKeys.meetingList(RECENT),
    queryFn: () => api.meetings.list(RECENT),
  });
  const items = data?.items ?? [];

  return (
    <Popover.Root onOpenChange={(open) => open && setSeen(true)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-hover hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          {!seen && items.length > 0 && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-accent-pink ring-2 ring-surface" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-80 animate-pop-in rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
            Notifications
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-tertiary">
                You&apos;re all caught up
              </li>
            )}
            {items.map((m, i) => (
              <li key={m.id}>
                <Popover.Close asChild>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="flex gap-3 px-4 py-2.5 hover:bg-surface-hover"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">
                        Notes are ready for <span className="font-semibold">{m.title}</span>
                      </span>
                      <span className="text-xs text-ink-tertiary">
                        {formatDistanceToNow(parseApiDate(m.started_at), { addSuffix: true })}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-2 size-2 shrink-0 rounded-full",
                        i < 2 ? "bg-brand-500" : "bg-transparent",
                      )}
                    />
                  </Link>
                </Popover.Close>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
