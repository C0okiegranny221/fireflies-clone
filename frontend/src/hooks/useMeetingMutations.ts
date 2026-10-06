"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, queryKeys } from "@/lib/api";
import type { MeetingUpdate } from "@/lib/types";

/** Shared meeting mutations: they toast on success/failure and refresh every meeting view. */
export function useMeetingMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.participants }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
    ]);
  const onError = (err: Error) => toast.error("Something went wrong", { description: err.message });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: MeetingUpdate }) =>
      api.meetings.update(id, body),
    onSuccess: refresh,
    onError,
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => api.meetings.remove(id))),
    onSuccess: (_data, ids) => {
      toast.success(ids.length === 1 ? "Meeting deleted" : `${ids.length} meetings deleted`);
      // Drop deleted detail caches so nothing tries to refetch a 404.
      ids.forEach((id) => queryClient.removeQueries({ queryKey: queryKeys.meeting(id) }));
      return refresh();
    },
    onError,
  });

  const move = useMutation({
    mutationFn: ({ ids, channelId }: { ids: number[]; channelId: number | null }) =>
      Promise.all(ids.map((id) => api.meetings.update(id, { channel_id: channelId }))),
    onSuccess: (_data, { ids }) => {
      toast.success(ids.length === 1 ? "Meeting moved" : `${ids.length} meetings moved`);
      return refresh();
    },
    onError,
  });

  return { update, remove, move };
}
