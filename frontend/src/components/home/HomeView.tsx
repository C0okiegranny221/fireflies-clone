"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CircleCheckBig,
  ClipboardPaste,
  Clock,
  type LucideIcon,
  NotebookText,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import Link from "next/link";

import { comingSoon } from "@/components/layout/comingSoon";
import { SourceIcon } from "@/components/meetings/SourceIcon";
import { useAppUI } from "@/components/providers/AppUIProvider";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToggleTask } from "@/hooks/useToggleTask";
import { api, queryKeys } from "@/lib/api";
import { formatDuration, formatMeetingDate, parseApiDate } from "@/lib/format";
import type { MeetingListItem, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const RECENT = { page_size: 100 } as const;

function greeting(date: Date): string {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-surface shadow-card", className)}
      aria-label={title}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-brand-200 hover:bg-brand-25 dark:hover:border-brand-800 dark:hover:bg-surface-hover"
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink group-hover:text-brand-text">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-ink-tertiary">{description}</span>
      </span>
    </button>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium text-ink-tertiary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-ink-tertiary">{hint}</p>
    </div>
  );
}

function LatestRecap({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-50 via-surface to-surface p-5 dark:from-brand-soft">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-text">
          <Sparkles className="size-4" />
          Latest meeting recap
        </div>
        <Link
          href={`/meetings/${meeting.id}`}
          className="mt-2 block text-base font-semibold text-ink hover:text-brand-text"
        >
          {meeting.title}
        </Link>
        <p className="mt-0.5 text-xs text-ink-tertiary">
          {formatMeetingDate(parseApiDate(meeting.started_at))} ·{" "}
          {formatDuration(meeting.duration_sec)}
        </p>
        {meeting.overview && (
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-ink-secondary">
            {meeting.overview}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <AvatarStack people={meeting.participants} max={5} />
          <Link
            href={`/meetings/${meeting.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
          >
            Read notes
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function MeetingsCard({ meetings }: { meetings: MeetingListItem[] }) {
  return (
    <Card>
      <Tabs.Root defaultValue="recent">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5">
          <Tabs.List className="flex gap-4" aria-label="Meetings">
            {[
              ["recent", "Recent meetings"],
              ["upcoming", "Upcoming"],
            ].map(([id, label]) => (
              <Tabs.Trigger
                key={id}
                value={id}
                className="-mb-px border-b-2 border-transparent py-3.5 text-sm font-semibold text-ink-tertiary outline-none hover:text-ink-secondary data-[state=active]:border-brand-500 data-[state=active]:text-ink"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Link href="/meetings" className="text-xs font-semibold text-brand-text hover:underline">
            View all
          </Link>
        </div>
        <Tabs.Content value="recent">
          <ul className="divide-y divide-line">
            {meetings.slice(0, 5).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="group flex items-center gap-3 px-5 py-3 hover:bg-surface-muted"
                >
                  <SourceIcon source={m.source} className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink group-hover:text-brand-text">
                      {m.title}
                    </span>
                    <span className="text-xs text-ink-tertiary">
                      {formatMeetingDate(parseApiDate(m.started_at))} ·{" "}
                      {formatDuration(m.duration_sec)}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <AvatarStack people={m.participants} max={3} />
                  </span>
                </Link>
              </li>
            ))}
            {meetings.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-ink-tertiary">
                No meetings yet. Upload a transcript to get started.
              </li>
            )}
          </ul>
        </Tabs.Content>
        <Tabs.Content
          value="upcoming"
          className="flex flex-col items-center px-6 py-10 text-center"
        >
          <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-text">
            <CalendarClock className="size-5" />
          </span>
          <p className="text-sm font-semibold text-ink">Connect your calendar</p>
          <p className="mt-1 max-w-xs text-sm text-ink-secondary">
            Fred joins your upcoming meetings automatically once your calendar is connected.
          </p>
          <Button className="mt-4" onClick={() => comingSoon("Calendar sync")}>
            Connect calendar
          </Button>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  );
}

function MyTasks({ tasks, myEmail }: { tasks: Task[]; myEmail?: string }) {
  const toggle = useToggleTask();
  const mine = tasks.filter((t) => !t.is_completed && t.assignee?.email === myEmail);
  return (
    <Card
      title="My open tasks"
      action={
        <Link href="/tasks" className="text-xs font-semibold text-brand-text hover:underline">
          All tasks
        </Link>
      }
    >
      {mine.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <CircleCheckBig className="mb-2 size-6 text-emerald-500" />
          <p className="text-sm font-semibold text-ink">You&apos;re all caught up</p>
          <p className="text-xs text-ink-tertiary">No open action items assigned to you.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {mine.slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-5 py-3">
              <Checkbox
                className="mt-0.5"
                checked={t.is_completed}
                onCheckedChange={() => toggle.mutate(t)}
                aria-label="Mark as done"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-5 text-ink">{t.text}</span>
                <Link
                  href={`/meetings/${t.meeting_id}${t.start_ms !== null ? `?t=${t.start_ms}` : ""}`}
                  className="mt-0.5 block truncate text-xs text-ink-tertiary hover:text-brand-text"
                >
                  {t.meeting_title}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6 px-4 pt-8 md:px-8" aria-busy="true" aria-label="Loading home">
      <div className="h-8 w-72 animate-pulse rounded bg-surface-hover" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-80 animate-pulse rounded-xl bg-surface-hover" />
        <div className="h-80 animate-pulse rounded-xl bg-surface-hover" />
      </div>
    </div>
  );
}

/** Fireflies-style home: greeting, quick starts, weekly stats, latest recap, meetings, tasks. */
export function HomeView() {
  const { openNewMeeting } = useAppUI();
  const { data: me } = useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: Infinity });
  const meetingsQuery = useQuery({
    queryKey: queryKeys.meetingList(RECENT),
    queryFn: () => api.meetings.list(RECENT),
  });
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(),
    queryFn: () => api.actionItems.tasks(),
  });

  // Everything here is fetched on the client, so the time-based greeting never renders on
  // the server (no hydration mismatch).
  if (!me || meetingsQuery.isPending || tasksQuery.isPending) return <HomeSkeleton />;

  const meetings = meetingsQuery.data?.items ?? [];
  const tasks = tasksQuery.data ?? [];
  const weekAgo = subDays(new Date(), 7);
  const thisWeek = meetings.filter((m) => parseApiDate(m.started_at) >= weekAgo);
  const weekSeconds = thisWeek.reduce((sum, m) => sum + m.duration_sec, 0);
  const openTasks = tasks.filter((t) => !t.is_completed).length;
  const doneTasks = tasks.length - openTasks;
  const now = new Date();

  return (
    <div className="space-y-6 px-4 pt-8 pb-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.name} color={me.avatar_color} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {greeting(now)}, {me.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-ink-secondary">
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {thisWeek.length} meeting{thisWeek.length === 1 ? "" : "s"} this week
            </p>
          </div>
        </div>
        <Link href="/meetings">
          <Button>
            <NotebookText />
            All meetings
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          icon={Video}
          title="Add to live meeting"
          description="Invite Fred to a Zoom or Meet call"
          tone="bg-brand-soft text-brand-text"
          onClick={() => comingSoon("Adding Fred to a live meeting")}
        />
        <QuickAction
          icon={Upload}
          title="Upload transcript"
          description=".txt, .vtt or .json"
          tone="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
          onClick={() => openNewMeeting("upload")}
        />
        <QuickAction
          icon={ClipboardPaste}
          title="Paste transcript"
          description="Get AI notes in seconds"
          tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
          onClick={() => openNewMeeting("paste")}
        />
        <QuickAction
          icon={CalendarPlus}
          title="Schedule a meeting"
          description="Fred will join automatically"
          tone="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
          onClick={() => comingSoon("Scheduling meetings")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Meetings this week"
          value={String(thisWeek.length)}
          hint={`${meetings.length} in total`}
        />
        <Stat label="Time in meetings" value={formatDuration(weekSeconds)} hint="Last 7 days" />
        <Stat label="Open action items" value={String(openTasks)} hint="Across all meetings" />
        <Stat
          label="Tasks completed"
          value={tasks.length ? `${Math.round((doneTasks / tasks.length) * 100)}%` : "–"}
          hint={`${doneTasks} of ${tasks.length}`}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {meetings[0] && <LatestRecap meeting={meetings[0]} />}
          <MeetingsCard meetings={meetings} />
        </div>
        <div className="space-y-6">
          <MyTasks tasks={tasks} myEmail={me.email} />
          <Card title="Meeting time this week">
            <div className="flex items-center gap-3 px-5 py-4 text-sm text-ink-secondary">
              <Clock className="size-5 text-ink-tertiary" />
              <span>
                <span className="font-semibold text-ink">{formatDuration(weekSeconds)}</span> across{" "}
                {thisWeek.length} meeting{thisWeek.length === 1 ? "" : "s"}, with{" "}
                {thisWeek.reduce((n, m) => n + m.action_item_count, 0)} action items captured.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
