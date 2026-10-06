"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CircleCheck, Sparkles } from "lucide-react";

// Excerpts from the seeded "Sprint 42 Planning" meeting, so the preview matches the app.
const TABS = [
  {
    id: "overview",
    label: "Overview",
    body: (
      <p>
        The team planned Sprint 42 around one goal: reliability for long meetings. PDF export is
        rewritten to stream pages, and the pagination bug and player memory leak are in scope, 26 of
        34 points committed, leaving room for incidents.
      </p>
    ),
  },
  {
    id: "outline",
    label: "Outline",
    body: (
      <ol className="space-y-2">
        {[
          ["0:22", "Carry-over review"],
          ["1:40", "Sprint goal"],
          ["2:06", "Sizing new tickets"],
          ["3:13", "Capacity & scope"],
        ].map(([t, title]) => (
          <li key={t} className="flex gap-3">
            <span className="font-medium text-brand-text tabular-nums">{t}</span>
            {title}
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "actions",
    label: "Action items",
    body: (
      <ul className="space-y-2">
        {[
          ["Rewrite PDF export to stream long transcripts", "Jenna Kim"],
          ["Fix the flaky search test", "Priya Shah"],
          ["Write the speaker-reassignment API contract", "Marcus Lee"],
        ].map(([task, who]) => (
          <li key={task} className="flex items-start gap-2">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>
              {task} <span className="text-ink-tertiary">· {who}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "keywords",
    label: "Keywords",
    body: (
      <div className="flex flex-wrap gap-2">
        {["Sprint Goal", "PDF Export", "Pagination", "Memory Leak", "Capacity", "Demo Day"].map(
          (k) => (
            <span
              key={k}
              className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text"
            >
              {k}
            </span>
          ),
        )}
      </div>
    ),
  },
];

/** Interactive preview of the AI notes, like the tabbed summary on fireflies.ai. */
export function SummaryTabs() {
  return (
    <Tabs.Root
      defaultValue="overview"
      className="rounded-2xl border border-line bg-surface p-5 shadow-pop"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-pink to-brand-500 text-white">
          <Sparkles className="size-3.5" />
        </span>
        AI Notes · Sprint 42 Planning
      </div>
      <Tabs.List
        className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surface-hover p-1"
        aria-label="Summary sections"
      >
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-brand-300 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TABS.map((t) => (
        <Tabs.Content
          key={t.id}
          value={t.id}
          className="min-h-36 text-sm leading-6 text-ink-secondary"
        >
          {t.body}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
