"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { comingSoon } from "@/components/layout/comingSoon";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";
import { api, queryKeys } from "@/lib/api";
import { formatClock, formatDuration } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

import { ActionItemList } from "./ActionItemList";
import { usePlayerControls } from "./PlayerProvider";

export const NOTE_SECTIONS = {
  overview: "notes-overview",
  outline: "notes-outline",
  actions: "notes-actions",
  speakers: "notes-speakers",
} as const;

const GENERATED_BY = { seed: "Fireflies AI", llm: "Claude", heuristic: "Fireflies AI (offline)" };

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="text-sm font-semibold text-ink">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SummaryFormatMenu() {
  return (
    <Menu>
      <MenuTrigger className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-ink-secondary outline-none hover:bg-surface-hover">
        General summary
        <ChevronDown className="size-3.5" />
      </MenuTrigger>
      <MenuContent align="start" className="w-56">
        <MenuLabel>Summary format</MenuLabel>
        <MenuItem className="text-brand-text">General summary</MenuItem>
        {["Sales call", "1:1 meeting", "Interview", "Stand-up"].map((f) => (
          <MenuItem key={f} onSelect={() => comingSoon(`The "${f}" summary template`)}>
            {f}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function TalkTime({ meeting }: { meeting: MeetingDetail }) {
  const speakers = meeting.participants
    .filter((p) => p.talk_time_sec > 0)
    .sort((a, b) => b.talk_time_sec - a.talk_time_sec);
  const total = speakers.reduce((sum, p) => sum + p.talk_time_sec, 0) || 1;
  if (speakers.length === 0) return <p className="text-sm text-ink-tertiary">No speaker data.</p>;
  return (
    <ul className="space-y-2.5">
      {speakers.map((p) => {
        const share = Math.round((p.talk_time_sec / total) * 100);
        return (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar name={p.name} color={p.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium text-ink">{p.name}</span>
                <span className="shrink-0 text-ink-tertiary tabular-nums">
                  {formatDuration(p.talk_time_sec)} · {share}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, backgroundColor: p.color }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SummaryPanel({
  meeting,
  onKeyword,
}: {
  meeting: MeetingDetail;
  /** Clicking a keyword searches the transcript for it. */
  onKeyword: (keyword: string) => void;
}) {
  const { seek } = usePlayerControls();
  const queryClient = useQueryClient();
  const summary = meeting.summary;

  const regenerate = useMutation({
    mutationFn: () => api.meetings.regenerateSummary(meeting.id),
    onSuccess: () => {
      toast.success("Notes regenerated");
      return queryClient.invalidateQueries({ queryKey: queryKeys.meeting(meeting.id) });
    },
    onError: (err) => toast.error("Couldn't regenerate notes", { description: err.message }),
  });

  return (
    <div className="space-y-7 px-5 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-pink to-brand-500 text-white">
            <Sparkles className="size-3.5" />
          </span>
          <h2 className="text-sm font-semibold text-ink">AI Notes</h2>
          <SummaryFormatMenu />
        </div>
        <button
          type="button"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-ink-tertiary hover:bg-surface-hover hover:text-ink disabled:opacity-60"
        >
          <RefreshCw className={regenerate.isPending ? "size-3.5 animate-spin" : "size-3.5"} />
          {regenerate.isPending ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {!summary ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-ink-secondary">
          No AI notes yet. Add a transcript and press Regenerate.
        </p>
      ) : (
        <>
          {summary.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Keywords">
              {summary.keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onKeyword(k)}
                  title={`Find “${k}” in the transcript`}
                  className="rounded-full border border-brand-100 bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-text hover:border-brand-300 dark:border-brand-900"
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          <Section
            id={NOTE_SECTIONS.overview}
            title="Overview"
            aside={
              <span className="text-[11px] text-ink-tertiary">
                by {GENERATED_BY[summary.generated_by]}
              </span>
            }
          >
            <p className="text-sm leading-6 text-ink-secondary">{summary.overview}</p>
          </Section>

          {summary.chapters.length > 0 && (
            <Section id={NOTE_SECTIONS.outline} title="Notes">
              <ol className="space-y-4">
                {summary.chapters.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => seek(c.start_ms)}
                      className="group flex items-baseline gap-2 text-left"
                    >
                      <span className="text-sm font-semibold text-ink group-hover:text-brand-text">
                        {c.title}
                      </span>
                      <span className="text-xs font-medium text-brand-text tabular-nums">
                        {formatClock(c.start_ms / 1000)}
                      </span>
                    </button>
                    <ul className="mt-1 space-y-1 pl-1">
                      {c.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-6 text-ink-secondary">
                          <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-tertiary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </>
      )}

      <Section
        id={NOTE_SECTIONS.actions}
        title="Action items"
        aside={
          <span className="text-xs text-ink-tertiary">
            {meeting.action_items.filter((a) => a.is_completed).length}/
            {meeting.action_items.length} done
          </span>
        }
      >
        <ActionItemList
          meetingId={meeting.id}
          items={meeting.action_items}
          participants={meeting.participants}
        />
      </Section>

      <Section id={NOTE_SECTIONS.speakers} title="Speaker talk time">
        <TalkTime meeting={meeting} />
      </Section>
    </div>
  );
}
