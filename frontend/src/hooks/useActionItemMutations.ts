"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, queryKeys } from "@/lib/api";
import type { ActionItem, ActionItemCreate, ActionItemUpdate, MeetingDetail } from "@/lib/types";

/**
 * Action item CRUD for one meeting. Updates and deletes are optimistic against the cached
 * meeting so checkboxes feel instant; failures roll back and toast.
 */
export function useActionItemMutations(meetingId: number) {
  const queryClient = useQueryClient();
  const key = queryKeys.meeting(meetingId);

  const patchCache = (fn: (items: ActionItem[]) => ActionItem[]) =>
    queryClient.setQueryData<MeetingDetail>(key, (m) => {
      if (!m) return m;
      const action_items = fn(m.action_items);
      return { ...m, action_items, action_item_count: action_items.length };
    });

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: key });
    return queryClient.getQueryData<MeetingDetail>(key);
  };

  const settle = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["meetings", "pages"] }),
    ]);

  const rollback = (previous: MeetingDetail | undefined, err: Error) => {
    if (previous) queryClient.setQueryData(key, previous);
    toast.error("Couldn't save the action item", { description: err.message });
  };

  const create = useMutation({
    mutationFn: (body: ActionItemCreate) => api.actionItems.create(meetingId, body),
    onSuccess: (item) => patchCache((items) => [...items, item]),
    onError: (err) => toast.error("Couldn't add the action item", { description: err.message }),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: ActionItemUpdate }) =>
      api.actionItems.update(id, body),
    onMutate: async ({ id, body }) => {
      const previous = await snapshot();
      // Patch the plain fields now; the assignee object arrives with the server response.
      const fields: Partial<ActionItem> = {};
      if (body.text !== undefined) fields.text = body.text;
      if (body.is_completed !== undefined) fields.is_completed = body.is_completed;
      if (body.due_date !== undefined) fields.due_date = body.due_date;
      patchCache((items) => items.map((a) => (a.id === id ? { ...a, ...fields } : a)));
      return { previous };
    },
    onSuccess: (item) => patchCache((items) => items.map((a) => (a.id === item.id ? item : a))),
    onError: (err, _vars, ctx) => rollback(ctx?.previous, err),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (item: ActionItem) => api.actionItems.remove(item.id),
    onMutate: async (item) => {
      const previous = await snapshot();
      patchCache((items) => items.filter((a) => a.id !== item.id));
      return { previous };
    },
    onSuccess: (_data, item) =>
      toast("Action item deleted", {
        action: {
          label: "Undo",
          onClick: () =>
            create.mutate({
              text: item.text,
              assignee_id: item.assignee?.id ?? null,
              due_date: item.due_date,
              start_ms: item.start_ms,
            }),
        },
      }),
    onError: (err, _item, ctx) => rollback(ctx?.previous, err),
    onSettled: settle,
  });

  return { create, update, remove };
}
