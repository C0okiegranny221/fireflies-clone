"use client";

import { useQuery } from "@tanstack/react-query";
import { FileUp, Hash, Inbox, Lock, UserRound } from "lucide-react";

import type { LibraryFilters, LibraryView } from "@/hooks/useMeetingFilters";
import { api, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";

const VIEWS: { id: LibraryView; label: string; icon: typeof Inbox }[] = [
  { id: "mine", label: "My Meetings", icon: UserRound },
  { id: "all", label: "All Meetings", icon: Inbox },
  { id: "uploads", label: "Uploads", icon: FileUp },
];

export function viewTitle(filters: LibraryFilters, channelName?: string): string {
  if (filters.channelId) return channelName ?? "Channel";
  return VIEWS.find((v) => v.id === filters.view)?.label ?? "All Meetings";
}

function Item({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Inbox;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium transition-colors",
        active
          ? "bg-brand-soft text-brand-text"
          : "text-ink-secondary hover:bg-surface-hover hover:text-ink",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-brand-500" : "text-ink-tertiary")} />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Fireflies "Channels" column: default views plus team channels. */
export function ChannelList({
  filters,
  onSelect,
}: {
  filters: LibraryFilters;
  onSelect: (patch: Pick<LibraryFilters, "view" | "channelId">) => void;
}) {
  const { data: channels = [] } = useQuery({ queryKey: queryKeys.channels, queryFn: api.channels });

  return (
    <nav aria-label="Channels" className="space-y-5">
      <div className="space-y-0.5">
        {VIEWS.map((v) => (
          <Item
            key={v.id}
            icon={v.icon}
            label={v.label}
            active={!filters.channelId && filters.view === v.id}
            onClick={() => onSelect({ view: v.id, channelId: null })}
          />
        ))}
      </div>
      <div>
        <p className="mb-1 px-2.5 text-xs font-semibold tracking-wide text-ink-tertiary uppercase">
          Channels
        </p>
        <div className="space-y-0.5">
          {channels.map((c) => (
            <Item
              key={c.id}
              icon={c.is_private ? Lock : Hash}
              label={c.name}
              active={filters.channelId === c.id}
              onClick={() => onSelect({ view: "all", channelId: c.id })}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
