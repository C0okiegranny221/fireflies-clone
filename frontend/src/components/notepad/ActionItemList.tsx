"use client";

import { Plus, Trash2, UserRound } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";
import { useActionItemMutations } from "@/hooks/useActionItemMutations";
import { formatClock } from "@/lib/format";
import type { ActionItem, MeetingParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";

import { usePlayerControls } from "./PlayerProvider";

function AssigneePicker({
  assignee,
  participants,
  onChange,
}: {
  assignee: { name: string; color: string } | null;
  participants: MeetingParticipant[];
  onChange: (participantId: number | null) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        className="shrink-0 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        aria-label={assignee ? `Assigned to ${assignee.name}` : "Assign"}
        title={assignee ? `Assigned to ${assignee.name}` : "Assign"}
      >
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.color} size="xs" />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-tertiary hover:border-brand-400 hover:text-brand-text">
            <UserRound className="size-3" />
          </span>
        )}
      </MenuTrigger>
      <MenuContent className="w-56">
        <MenuLabel>Assign to</MenuLabel>
        {participants.map((p) => (
          <MenuItem
            key={p.id}
            icon={<Avatar name={p.name} color={p.color} size="xs" />}
            onSelect={() => onChange(p.id)}
          >
            {p.name}
          </MenuItem>
        ))}
        <MenuItem icon={<UserRound />} onSelect={() => onChange(null)}>
          Unassigned
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ActionItemRow({
  item,
  participants,
  meetingId,
}: {
  item: ActionItem;
  participants: MeetingParticipant[];
  meetingId: number;
}) {
  const { update, remove } = useActionItemMutations(meetingId);
  const { seek } = usePlayerControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  const save = () => {
    const text = draft.trim();
    setEditing(false);
    if (text && text !== item.text) update.mutate({ id: item.id, body: { text } });
    else setDraft(item.text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      setDraft(item.text);
      setEditing(false);
    }
  };

  return (
    <li className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-hover/60">
      <Checkbox
        className="mt-0.5"
        checked={item.is_completed}
        onCheckedChange={(checked) =>
          update.mutate({ id: item.id, body: { is_completed: checked === true } })
        }
        aria-label={item.is_completed ? "Mark as not done" : "Mark as done"}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={onKeyDown}
            aria-label="Edit action item"
            className="w-full resize-none rounded-md border border-brand-300 bg-surface px-2 py-1 text-sm text-ink ring-4 ring-brand-100 outline-none dark:ring-brand-900/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(item.text);
              setEditing(true);
            }}
            className={cn(
              "w-full text-left text-sm leading-5",
              item.is_completed ? "text-ink-tertiary line-through" : "text-ink",
            )}
            title="Click to edit"
          >
            {item.text}
          </button>
        )}
        {item.start_ms !== null && !editing && (
          <button
            type="button"
            onClick={() => seek(item.start_ms!)}
            className="mt-0.5 rounded text-xs font-medium text-brand-text tabular-nums hover:underline"
          >
            {formatClock(item.start_ms / 1000)}
          </button>
        )}
      </div>
      <AssigneePicker
        assignee={item.assignee}
        participants={participants}
        onChange={(assignee_id) => update.mutate({ id: item.id, body: { assignee_id } })}
      />
      <button
        type="button"
        onClick={() => remove.mutate(item)}
        className="rounded p-0.5 text-ink-tertiary opacity-0 group-hover:opacity-100 hover:text-red-600 focus-visible:opacity-100"
        aria-label="Delete action item"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function AddActionItem({
  meetingId,
  participants,
}: {
  meetingId: number;
  participants: MeetingParticipant[];
}) {
  const { create } = useActionItemMutations(meetingId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const assignee = participants.find((p) => p.id === assigneeId) ?? null;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { text: text.trim(), assignee_id: assigneeId },
      {
        onSuccess: () => {
          setText("");
          setAssigneeId(null);
        },
      },
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-tertiary hover:bg-surface-hover hover:text-brand-text"
      >
        <Plus className="size-4" />
        Add action item
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-2 px-2">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="What needs to be done?"
        aria-label="New action item"
        className="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-ink-placeholder focus:border-brand-300 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
      />
      <AssigneePicker assignee={assignee} participants={participants} onChange={setAssigneeId} />
      <Button size="sm" variant="primary" type="submit" disabled={!text.trim() || create.isPending}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

/** Action items grouped by assignee, as in the Fireflies notes panel. */
export function ActionItemList({
  meetingId,
  items,
  participants,
}: {
  meetingId: number;
  items: ActionItem[];
  participants: MeetingParticipant[];
}) {
  const groups = new Map<string, { label: string; color?: string; items: ActionItem[] }>();
  for (const item of items) {
    const key = item.assignee ? String(item.assignee.id) : "none";
    if (!groups.has(key))
      groups.set(key, {
        label: item.assignee?.name ?? "Unassigned",
        color: item.assignee?.color,
        items: [],
      });
    groups.get(key)!.items.push(item);
  }
  // Unassigned items last.
  const ordered = [...groups.entries()].sort(
    ([a], [b]) => Number(a === "none") - Number(b === "none"),
  );

  return (
    <div>
      {items.length === 0 && (
        <p className="px-2 py-1 text-sm text-ink-tertiary">No action items yet.</p>
      )}
      {ordered.map(([key, group]) => (
        <div key={key} className="mb-3">
          <p className="mb-1 flex items-center gap-2 px-2 text-xs font-semibold text-ink-secondary">
            {group.color ? (
              <span className="size-2 rounded-full" style={{ backgroundColor: group.color }} />
            ) : (
              <span className="size-2 rounded-full bg-line-strong" />
            )}
            {group.label}
            <span className="font-normal text-ink-tertiary">
              {group.items.filter((i) => i.is_completed).length}/{group.items.length}
            </span>
          </p>
          <ul>
            {group.items.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                participants={participants}
                meetingId={meetingId}
              />
            ))}
          </ul>
        </div>
      ))}
      <AddActionItem meetingId={meetingId} participants={participants} />
    </div>
  );
}
