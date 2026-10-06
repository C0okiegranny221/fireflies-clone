"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderInput, Hash, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";
import { useMeetingMutations } from "@/hooks/useMeetingMutations";
import { api, queryKeys } from "@/lib/api";

/** Floating bar shown while meetings are selected: move to a channel or delete. */
export function BulkActionBar({ ids, onClear }: { ids: number[]; onClear: () => void }) {
  const { remove, move } = useMeetingMutations();
  const { data: channels = [] } = useQuery({ queryKey: queryKeys.channels, queryFn: api.channels });
  const [confirming, setConfirming] = useState(false);
  const n = ids.length;

  return (
    <>
      <div
        role="toolbar"
        aria-label="Selected meetings"
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-pop-in items-center gap-1 rounded-xl border border-line bg-surface p-1.5 pl-4 shadow-pop"
      >
        <span className="mr-2 text-sm font-semibold whitespace-nowrap text-ink">{n} selected</span>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={move.isPending}>
              <FolderInput />
              Move
            </Button>
          </MenuTrigger>
          <MenuContent align="center" side="top">
            <MenuLabel>Move to channel</MenuLabel>
            {channels.map((c) => (
              <MenuItem
                key={c.id}
                icon={<Hash />}
                onSelect={() => move.mutate({ ids, channelId: c.id }, { onSuccess: onClear })}
              >
                {c.name}
              </MenuItem>
            ))}
            <MenuItem
              onSelect={() => move.mutate({ ids, channelId: null }, { onSuccess: onClear })}
            >
              Remove from channel
            </MenuItem>
          </MenuContent>
        </Menu>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
          Delete
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded-lg p-2 text-ink-tertiary hover:bg-surface-hover hover:text-ink"
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${n} meeting${n === 1 ? "" : "s"}?`}
        description="Their transcripts, notes and action items will be permanently deleted."
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(ids, {
            onSuccess: () => {
              setConfirming(false);
              onClear();
            },
          })
        }
      />
    </>
  );
}
