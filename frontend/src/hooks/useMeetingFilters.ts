"use client";

import { format, startOfYear, subDays } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { MeetingQuery, MeetingSort, MeetingSource } from "@/lib/types";

export type LibraryView = "all" | "mine" | "uploads";
export type DatePreset = "today" | "7d" | "30d" | "year" | "custom";
export type DurationBucket = "short" | "medium" | "long" | "xlong";

export interface LibraryFilters {
  view: LibraryView;
  channelId: number | null;
  q: string;
  participantIds: number[];
  datePreset: DatePreset | null;
  dateFrom: string | null; // yyyy-MM-dd, only for the "custom" preset
  dateTo: string | null;
  duration: DurationBucket | null;
  tag: string | null;
  source: MeetingSource | null;
  sort: MeetingSort;
}

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom range" },
];

export const DURATION_BUCKETS: { id: DurationBucket; label: string; min?: number; max?: number }[] =
  [
    { id: "short", label: "Under 15 min", max: 15 },
    { id: "medium", label: "15–30 min", min: 15, max: 30 },
    { id: "long", label: "30–60 min", min: 30, max: 60 },
    { id: "xlong", label: "Over 60 min", min: 60 },
  ];

export const SORTS: { id: MeetingSort; label: string }[] = [
  { id: "-started_at", label: "Newest first" },
  { id: "started_at", label: "Oldest first" },
  { id: "title", label: "Title (A–Z)" },
  { id: "-duration", label: "Longest first" },
  { id: "duration", label: "Shortest first" },
];

const SOURCES: MeetingSource[] = ["notetaker", "upload", "manual"];

function parse(params: URLSearchParams): LibraryFilters {
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = params.get(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  const channel = Number(params.get("channel"));
  return {
    view: pick("view", ["all", "mine", "uploads"] as const) ?? "all",
    channelId: Number.isInteger(channel) && channel > 0 ? channel : null,
    q: params.get("q") ?? "",
    participantIds: (params.get("p") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
    datePreset: pick(
      "date",
      DATE_PRESETS.map((d) => d.id),
    ),
    dateFrom: params.get("from"),
    dateTo: params.get("to"),
    duration: pick(
      "dur",
      DURATION_BUCKETS.map((d) => d.id),
    ),
    tag: params.get("tag"),
    source: pick("source", SOURCES),
    sort:
      pick(
        "sort",
        SORTS.map((s) => s.id),
      ) ?? "-started_at",
  };
}

function serialize(f: LibraryFilters): string {
  const p = new URLSearchParams();
  if (f.channelId) p.set("channel", String(f.channelId));
  else if (f.view !== "all") p.set("view", f.view);
  if (f.q) p.set("q", f.q);
  if (f.participantIds.length) p.set("p", f.participantIds.join(","));
  if (f.datePreset) p.set("date", f.datePreset);
  if (f.datePreset === "custom") {
    if (f.dateFrom) p.set("from", f.dateFrom);
    if (f.dateTo) p.set("to", f.dateTo);
  }
  if (f.duration) p.set("dur", f.duration);
  if (f.tag) p.set("tag", f.tag);
  if (f.source) p.set("source", f.source);
  if (f.sort !== "-started_at") p.set("sort", f.sort);
  return p.toString();
}

/** Translate UI filters into API query params. Date presets use the viewer's local dates. */
export function toMeetingQuery(f: LibraryFilters, currentUserId?: number): MeetingQuery {
  const today = new Date();
  const ymd = (d: Date) => format(d, "yyyy-MM-dd");
  const dateRange: Pick<MeetingQuery, "date_from" | "date_to"> =
    f.datePreset === "today"
      ? { date_from: ymd(today), date_to: ymd(today) }
      : f.datePreset === "7d"
        ? { date_from: ymd(subDays(today, 6)) }
        : f.datePreset === "30d"
          ? { date_from: ymd(subDays(today, 29)) }
          : f.datePreset === "year"
            ? { date_from: ymd(startOfYear(today)) }
            : f.datePreset === "custom"
              ? { date_from: f.dateFrom ?? undefined, date_to: f.dateTo ?? undefined }
              : {};
  const bucket = DURATION_BUCKETS.find((d) => d.id === f.duration);

  return {
    q: f.q || undefined,
    participant_id: f.participantIds.length ? f.participantIds : undefined,
    ...dateRange,
    min_duration: bucket?.min,
    max_duration: bucket?.max,
    channel_id: f.channelId ?? undefined,
    host_id: !f.channelId && f.view === "mine" ? currentUserId : undefined,
    source: !f.channelId && f.view === "uploads" ? "upload" : (f.source ?? undefined),
    tag: f.tag ?? undefined,
    sort: f.sort,
  };
}

export function activeFilterCount(f: LibraryFilters): number {
  return [f.participantIds.length > 0, f.datePreset, f.duration, f.tag, f.source].filter(Boolean)
    .length;
}

/** Meetings-library filter state, stored in the URL so views are shareable and survive reloads. */
export function useMeetingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parse(new URLSearchParams(searchParams)), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<LibraryFilters>) => {
      const qs = serialize({ ...filters, ...patch });
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clearFilters = useCallback(
    () =>
      setFilters({
        q: "",
        participantIds: [],
        datePreset: null,
        dateFrom: null,
        dateTo: null,
        duration: null,
        tag: null,
        source: null,
      }),
    [setFilters],
  );

  return { filters, setFilters, clearFilters };
}
