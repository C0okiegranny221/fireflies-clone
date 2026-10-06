"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarX2, FileUp, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useAppUI } from "@/components/providers/AppUIProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Field";
import {
  activeFilterCount,
  toMeetingQuery,
  useMeetingFilters,
  type LibraryFilters,
} from "@/hooks/useMeetingFilters";
import { api, queryKeys } from "@/lib/api";
import { formatDayHeading, parseApiDate } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

import { BulkActionBar } from "./BulkActionBar";
import { ChannelList, viewTitle } from "./ChannelList";
import { MeetingRow } from "./MeetingRow";
import { MeetingsToolbar, SortMenu } from "./MeetingsToolbar";

const PAGE_SIZE = 25;

interface DayGroup {
  key: string;
  label: string;
  meetings: MeetingListItem[];
}

/** Group consecutive meetings by local calendar day (the list is already sorted). */
function groupByDay(meetings: MeetingListItem[], byDay: boolean): DayGroup[] {
  if (!byDay) return [{ key: "all", label: "", meetings }];
  const groups: DayGroup[] = [];
  for (const m of meetings) {
    const date = parseApiDate(m.started_at);
    const key = format(date, "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last?.key === key) last.meetings.push(m);
    else groups.push({ key, label: formatDayHeading(date), meetings: [m] });
  }
  return groups;
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading meetings">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <div className="size-9 animate-pulse rounded-lg bg-surface-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-surface-hover" />
          </div>
          <div className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-hover sm:block" />
        </div>
      ))}
    </div>
  );
}

export function MeetingsLibrary() {
  const { filters, setFilters: setUrlFilters, clearFilters } = useMeetingFilters();
  const { openNewMeeting } = useAppUI();
  const { data: me } = useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: Infinity });
  const { data: channels = [] } = useQuery({ queryKey: queryKeys.channels, queryFn: api.channels });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Changing the view or filters starts a fresh selection.
  const setFilters = useCallback(
    (patch: Partial<LibraryFilters>) => {
      setSelected(new Set());
      setUrlFilters(patch);
    },
    [setUrlFilters],
  );

  const query = useMemo(() => toMeetingQuery(filters, me?.id), [filters, me?.id]);
  const waitingForUser = filters.view === "mine" && !filters.channelId && !me;

  const list = useInfiniteQuery({
    queryKey: queryKeys.meetingPages(query),
    queryFn: ({ pageParam }) =>
      api.meetings.list({ ...query, page: pageParam, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    enabled: !waitingForUser,
  });

  const meetings = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  const byDay = filters.sort === "-started_at" || filters.sort === "started_at";
  const groups = useMemo(() => groupByDay(meetings, byDay), [meetings, byDay]);
  const channelName = channels.find((c) => c.id === filters.channelId)?.name;
  const filtered = activeFilterCount(filters) > 0 || Boolean(filters.q);

  const toggle = (ids: number[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const allIds = meetings.map((m) => m.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 border-r border-line bg-surface px-3 py-6 lg:block">
        <ChannelList filters={filters} onSelect={setFilters} />
      </aside>

      <div className="min-w-0 flex-1 px-4 pt-6 pb-28 md:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {viewTitle(filters, channelName)}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {list.isSuccess ? `${total} meeting${total === 1 ? "" : "s"}` : " "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SortMenu value={filters.sort} onChange={(sort) => setFilters({ sort })} />
            {/* Below lg the channel column collapses into a picker. */}
            <Select
              aria-label="Channel"
              className="h-9 w-auto lg:hidden"
              value={filters.channelId ? `c:${filters.channelId}` : filters.view}
              onChange={(e) => {
                const v = e.target.value;
                setFilters(
                  v.startsWith("c:")
                    ? { view: "all", channelId: Number(v.slice(2)) }
                    : { view: v as LibraryFilters["view"], channelId: null },
                );
              }}
            >
              <option value="mine">My Meetings</option>
              <option value="all">All Meetings</option>
              <option value="uploads">Uploads</option>
              {channels.map((c) => (
                <option key={c.id} value={`c:${c.id}`}>
                  # {c.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => openNewMeeting("upload")}>
              <FileUp />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        <MeetingsToolbar filters={filters} setFilters={setFilters} clearFilters={clearFilters} />

        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {list.isPending || waitingForUser ? (
            <ListSkeleton />
          ) : list.isError ? (
            <EmptyState
              icon={RefreshCcw}
              title="Couldn't load meetings"
              description={list.error.message}
              action={<Button onClick={() => list.refetch()}>Try again</Button>}
            />
          ) : meetings.length === 0 ? (
            filtered ? (
              <EmptyState
                icon={CalendarX2}
                title="No meetings match your filters"
                description="Try a different search or remove some filters."
                action={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={FileUp}
                title="No meetings here yet"
                description="Upload a transcript or create a meeting to see AI notes, action items and more."
                action={
                  <Button variant="primary" onClick={() => openNewMeeting("upload")}>
                    Upload transcript
                  </Button>
                }
              />
            )
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line bg-surface-muted px-4 py-2 md:px-5">
                <Checkbox
                  checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
                  onCheckedChange={() => toggle(allIds, !allSelected)}
                  aria-label="Select all meetings"
                />
                <span className="text-xs font-medium text-ink-tertiary">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </span>
              </div>
              {groups.map((group) => {
                const ids = group.meetings.map((m) => m.id);
                const groupSelected = ids.every((id) => selected.has(id));
                return (
                  <section key={group.key} aria-label={group.label || "Meetings"}>
                    {group.label && (
                      <div className="flex items-center gap-3 border-b border-line px-4 pt-4 pb-2 md:px-5">
                        <Checkbox
                          checked={groupSelected}
                          onCheckedChange={() => toggle(ids, !groupSelected)}
                          aria-label={`Select all meetings from ${group.label}`}
                          className="opacity-60 hover:opacity-100 data-[state=checked]:opacity-100"
                        />
                        <h2 className="text-xs font-semibold tracking-wide text-ink-tertiary uppercase">
                          {group.label}
                        </h2>
                      </div>
                    )}
                    <ul className="divide-y divide-line border-b border-line last:border-b-0">
                      {group.meetings.map((m) => (
                        <MeetingRow
                          key={m.id}
                          meeting={m}
                          selected={selected.has(m.id)}
                          selectionActive={selected.size > 0}
                          onToggleSelected={() => toggle([m.id], !selected.has(m.id))}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>

        {list.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? "Loading…" : "Load more meetings"}
            </Button>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <BulkActionBar ids={[...selected]} onClear={() => setSelected(new Set())} />
      )}
    </div>
  );
}
