"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheckBig, ListTodo, PlayCircle, RefreshCcw, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { controlClass } from "@/components/ui/Field";
import { api, queryKeys } from "@/lib/api";
import { formatClock, formatMeetingDate, parseApiDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "open" | "done" | "all";

interface MeetingGroup {
  meetingId: number;
  title: string;
  startedAt: string;
  tasks: Task[];
}

function useToggleTask() {
  const queryClient = useQueryClient();
  const key = queryKeys.tasks();
  return useMutation({
    mutationFn: (task: Task) =>
      api.actionItems.update(task.id, { is_completed: !task.is_completed }),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (tasks) =>
        tasks?.map((t) => (t.id === task.id ? { ...t, is_completed: !t.is_completed } : t)),
      );
      return { previous };
    },
    onSuccess: (_item, task) => {
      if (!task.is_completed) toast.success("Task completed");
    },
    onError: (err, _task, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      toast.error("Couldn't update the task", { description: err.message });
    },
    onSettled: (_data, _err, task) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: queryKeys.meeting(task.meeting_id) }),
      ]),
  });
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <li className="group flex items-start gap-3 px-4 py-3 md:px-5">
      <Checkbox
        className="mt-0.5"
        checked={task.is_completed}
        onCheckedChange={onToggle}
        aria-label={task.is_completed ? "Mark as not done" : "Mark as done"}
      />
      <p
        className={cn(
          "min-w-0 flex-1 text-sm leading-5",
          task.is_completed ? "text-ink-tertiary line-through" : "text-ink",
        )}
      >
        {task.text}
      </p>
      {task.start_ms !== null && (
        <Link
          href={`/meetings/${task.meeting_id}?t=${task.start_ms}`}
          className="hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-text tabular-nums hover:bg-brand-soft sm:inline-flex"
          title="Play the moment this was said"
        >
          <PlayCircle className="size-3.5" />
          {formatClock(task.start_ms / 1000)}
        </Link>
      )}
      {task.assignee ? (
        <span className="flex w-32 shrink-0 items-center gap-1.5 text-xs text-ink-secondary">
          <Avatar name={task.assignee.name} color={task.assignee.color} size="xs" />
          <span className="truncate">{task.assignee.name}</span>
        </span>
      ) : (
        <span className="flex w-32 shrink-0 items-center gap-1.5 text-xs text-ink-tertiary">
          <UserRound className="size-4" />
          Unassigned
        </span>
      )}
    </li>
  );
}

export function TasksView() {
  const { data: me } = useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: Infinity });
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(),
    queryFn: () => api.actionItems.tasks(),
  });
  const toggle = useToggleTask();

  const [status, setStatus] = useState<Status>("open");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const counts = {
    open: tasks.filter((t) => !t.is_completed).length,
    done: tasks.filter((t) => t.is_completed).length,
    all: tasks.length,
  };

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = tasks.filter(
      (t) =>
        (status === "all" || t.is_completed === (status === "done")) &&
        (!mine || t.assignee?.email === me?.email) &&
        (!needle ||
          t.text.toLowerCase().includes(needle) ||
          t.meeting_title.toLowerCase().includes(needle)),
    );
    const byMeeting = new Map<number, MeetingGroup>();
    for (const t of visible) {
      const group = byMeeting.get(t.meeting_id) ?? {
        meetingId: t.meeting_id,
        title: t.meeting_title,
        startedAt: t.meeting_started_at,
        tasks: [],
      };
      group.tasks.push(t);
      byMeeting.set(t.meeting_id, group);
    }
    return [...byMeeting.values()];
  }, [tasks, status, mine, me?.email, query]);

  return (
    <div className="pb-10">
      <PageHeader
        title="Tasks"
        description="Action items from all of your meetings, in one place."
      />

      <div className="px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs.Root value={status} onValueChange={(v) => setStatus(v as Status)}>
            <Tabs.List
              className="flex gap-1 rounded-lg bg-surface-hover p-1"
              aria-label="Task status"
            >
              {(
                [
                  ["open", "Open"],
                  ["done", "Completed"],
                  ["all", "All"],
                ] as const
              ).map(([id, label]) => (
                <Tabs.Trigger
                  key={id}
                  value={id}
                  className="flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-brand-300 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card"
                >
                  {label}
                  <span className="text-xs font-medium text-ink-tertiary tabular-nums">
                    {counts[id]}
                  </span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>

          <button
            type="button"
            aria-pressed={mine}
            onClick={() => setMine((m) => !m)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium shadow-card",
              mine
                ? "border-brand-200 bg-brand-soft text-brand-text dark:border-brand-800"
                : "border-line-strong bg-surface text-ink-secondary hover:bg-surface-hover",
            )}
          >
            <UserRound className="size-4" />
            Assigned to me
          </button>

          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-placeholder" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks or meetings"
              aria-label="Search tasks"
              className={cn(controlClass, "h-9 pl-8")}
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {tasksQuery.isPending ? (
            Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl border border-line bg-surface"
              />
            ))
          ) : tasksQuery.isError ? (
            <EmptyState
              icon={RefreshCcw}
              title="Couldn't load tasks"
              description={tasksQuery.error.message}
              action={<Button onClick={() => tasksQuery.refetch()}>Try again</Button>}
            />
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              {status === "open" && !query && !mine && counts.all > 0 ? (
                <EmptyState
                  icon={CircleCheckBig}
                  title="All caught up"
                  description="Every action item from your meetings is done."
                />
              ) : (
                <EmptyState
                  icon={ListTodo}
                  title="No tasks here"
                  description="Action items from your meetings will show up here."
                />
              )}
            </div>
          ) : (
            groups.map((g) => (
              <section
                key={g.meetingId}
                className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
                aria-label={g.title}
              >
                <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5 md:px-5">
                  <Link
                    href={`/meetings/${g.meetingId}`}
                    className="truncate text-sm font-semibold text-ink hover:text-brand-text"
                  >
                    {g.title}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-tertiary">
                    {formatMeetingDate(parseApiDate(g.startedAt))}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={() => toggle.mutate(t)} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
