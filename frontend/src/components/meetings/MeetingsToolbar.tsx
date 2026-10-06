"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDownUp, Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { controlClass } from "@/components/ui/Field";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import {
  activeFilterCount,
  DATE_PRESETS,
  DURATION_BUCKETS,
  SORTS,
  type LibraryFilters,
} from "@/hooks/useMeetingFilters";
import { api, queryKeys } from "@/lib/api";
import type { MeetingSource } from "@/lib/types";
import { cn } from "@/lib/utils";

import { FilterChip, FilterOption } from "./FilterChip";
import { SOURCE_LABELS } from "./SourceIcon";

function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const [emitted, setEmitted] = useState(value);

  // Follow URL changes made elsewhere (e.g. "Clear all"), but not the echo of our own
  // debounced update — that would overwrite characters typed since.
  if (value !== synced) {
    setSynced(value);
    if (value !== emitted) setDraft(value);
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === value) return;
    const t = setTimeout(() => {
      setEmitted(next);
      onChange(next);
    }, 300);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-placeholder" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search by title or participant"
        aria-label="Search meetings"
        className={cn(controlClass, "h-8 pr-8 pl-8")}
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-tertiary hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function ParticipantsFilter({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const { data: people = [] } = useQuery({
    queryKey: queryKeys.participants,
    queryFn: api.participants,
  });
  const [query, setQuery] = useState("");
  const visible = people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const names = people.filter((p) => selected.includes(p.id)).map((p) => p.name);
  const summary =
    names.length === 0 ? null : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;

  return (
    <FilterChip label="Participants" value={summary} onClear={() => onChange([])}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people"
        className={cn(controlClass, "mb-1 h-8")}
      />
      <div className="max-h-64 overflow-y-auto">
        {visible.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-ink-secondary hover:bg-surface-hover"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() =>
                  onChange(checked ? selected.filter((id) => id !== p.id) : [...selected, p.id])
                }
              />
              <Avatar name={p.name} color={p.color} size="xs" />
              <span className="truncate">{p.name}</span>
            </label>
          );
        })}
        {visible.length === 0 && (
          <p className="px-2 py-3 text-center text-sm text-ink-tertiary">No people found</p>
        )}
      </div>
    </FilterChip>
  );
}

function DateFilter({
  filters,
  onChange,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
}) {
  const preset = DATE_PRESETS.find((d) => d.id === filters.datePreset);
  const fmt = (d: string) => format(new Date(`${d}T00:00`), "MMM d");
  const value =
    filters.datePreset === "custom"
      ? [filters.dateFrom && fmt(filters.dateFrom), filters.dateTo && fmt(filters.dateTo)]
          .filter(Boolean)
          .join(" – ") || "Custom"
      : (preset?.label ?? null);

  return (
    <FilterChip
      label="Date"
      value={value}
      onClear={() => onChange({ datePreset: null, dateFrom: null, dateTo: null })}
    >
      {DATE_PRESETS.filter((d) => d.id !== "custom").map((d) => (
        <FilterOption
          key={d.id}
          selected={filters.datePreset === d.id}
          onSelect={() => onChange({ datePreset: d.id, dateFrom: null, dateTo: null })}
        >
          {d.label}
        </FilterOption>
      ))}
      <div className="mt-1 border-t border-line px-1 pt-2">
        <p className="mb-1.5 text-xs font-medium text-ink-tertiary">Custom range</p>
        <div className="flex items-center gap-1.5">
          {(["dateFrom", "dateTo"] as const).map((key) => (
            <input
              key={key}
              type="date"
              aria-label={key === "dateFrom" ? "From date" : "To date"}
              value={filters.datePreset === "custom" ? (filters[key] ?? "") : ""}
              onChange={(e) =>
                onChange({
                  datePreset: "custom",
                  dateFrom: filters.datePreset === "custom" ? filters.dateFrom : null,
                  dateTo: filters.datePreset === "custom" ? filters.dateTo : null,
                  [key]: e.target.value || null,
                })
              }
              className={cn(controlClass, "h-8 px-2 text-xs")}
            />
          ))}
        </div>
      </div>
    </FilterChip>
  );
}

function SingleChoiceFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <FilterChip
      label={label}
      value={options.find((o) => o.id === value)?.label}
      onClear={() => onChange(null)}
      contentClassName="w-52"
    >
      {options.map((o) => (
        <FilterOption key={o.id} selected={value === o.id} onSelect={() => onChange(o.id)}>
          {o.label}
        </FilterOption>
      ))}
    </FilterChip>
  );
}

export function SortMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: LibraryFilters["sort"]) => void;
}) {
  const current = SORTS.find((s) => s.id === value) ?? SORTS[0];
  return (
    <Menu>
      <MenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-secondary outline-none hover:bg-surface-hover hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-100">
        <ArrowDownUp className="size-4" />
        {current.label}
      </MenuTrigger>
      <MenuContent className="w-48">
        {SORTS.map((s) => (
          <MenuItem
            key={s.id}
            onSelect={() => onChange(s.id)}
            icon={<Check className={cn(s.id === value ? "text-brand-500" : "invisible")} />}
          >
            {s.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

export function MeetingsToolbar({
  filters,
  setFilters,
  clearFilters,
}: {
  filters: LibraryFilters;
  setFilters: (patch: Partial<LibraryFilters>) => void;
  clearFilters: () => void;
}) {
  const { data: tags = [] } = useQuery({ queryKey: queryKeys.tags, queryFn: api.tags });
  const tagOptions = useMemo(() => tags.map((t) => ({ id: t.name, label: `#${t.name}` })), [tags]);
  const sourceOptions = (Object.keys(SOURCE_LABELS) as MeetingSource[]).map((id) => ({
    id,
    label: SOURCE_LABELS[id],
  }));
  const hasFilters = activeFilterCount(filters) > 0 || Boolean(filters.q);
  const onSearch = useMemo(() => (q: string) => setFilters({ q }), [setFilters]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={filters.q} onChange={onSearch} />
      <ParticipantsFilter
        selected={filters.participantIds}
        onChange={(participantIds) => setFilters({ participantIds })}
      />
      <DateFilter filters={filters} onChange={setFilters} />
      <SingleChoiceFilter
        label="Duration"
        options={DURATION_BUCKETS}
        value={filters.duration}
        onChange={(duration) => setFilters({ duration })}
      />
      {tagOptions.length > 0 && (
        <SingleChoiceFilter
          label="Topic"
          options={tagOptions}
          value={filters.tag}
          onChange={(tag) => setFilters({ tag })}
        />
      )}
      {filters.view !== "uploads" && (
        <SingleChoiceFilter
          label="Captured from"
          options={sourceOptions}
          value={filters.source}
          onChange={(source) => setFilters({ source })}
        />
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="h-8 rounded-lg px-2 text-sm font-semibold text-brand-text hover:bg-brand-soft"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
