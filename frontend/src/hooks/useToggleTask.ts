"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, queryKeys } from "@/lib/api";
import type { Task } from "@/lib/types";

/** Optimistically complete/reopen a task in the cross-meeting task list (Tasks, Home). */
export function useToggleTask() {
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
