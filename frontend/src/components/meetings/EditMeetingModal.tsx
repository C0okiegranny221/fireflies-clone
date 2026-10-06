"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TokenInput } from "@/components/ui/TokenInput";
import { useMeetingMutations } from "@/hooks/useMeetingMutations";
import { api, queryKeys } from "@/lib/api";
import type { MeetingListItem } from "@/lib/types";

/** Edit a meeting's metadata: title, participants, channel and topics. */
export function EditMeetingModal({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: Pick<MeetingListItem, "id" | "title" | "participants" | "channel" | "tags">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { update } = useMeetingMutations();
  const { data: people = [] } = useQuery({
    queryKey: queryKeys.participants,
    queryFn: api.participants,
  });
  const { data: channels = [] } = useQuery({ queryKey: queryKeys.channels, queryFn: api.channels });
  const { data: tags = [] } = useQuery({ queryKey: queryKeys.tags, queryFn: api.tags });

  const [title, setTitle] = useState(meeting.title);
  const [participants, setParticipants] = useState(meeting.participants.map((p) => p.name));
  const [channelId, setChannelId] = useState<number | null>(meeting.channel?.id ?? null);
  const [topics, setTopics] = useState(meeting.tags.map((t) => t.name));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update.mutate(
      {
        id: meeting.id,
        body: { title: title.trim(), participants, channel_id: channelId, tags: topics },
      },
      {
        onSuccess: () => {
          toast.success("Meeting updated");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit meeting"
      description="Update the title, attendees, channel and topics."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="edit-meeting"
            disabled={update.isPending || !title.trim()}
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="edit-meeting" onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="meeting-title">
          <Input
            id="meeting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            required
            autoFocus
          />
        </Field>
        <Field
          label="Participants"
          htmlFor="meeting-participants"
          hint="Press Enter to add someone. People who spoke in the transcript always stay listed."
        >
          <TokenInput
            id="meeting-participants"
            value={participants}
            onChange={setParticipants}
            suggestions={people.map((p) => p.name)}
            placeholder="Add a name"
          />
        </Field>
        <Field label="Channel" htmlFor="meeting-channel">
          <Select
            id="meeting-channel"
            value={channelId ?? ""}
            onChange={(e) => setChannelId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">No channel</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Topics" htmlFor="meeting-topics">
          <TokenInput
            id="meeting-topics"
            value={topics}
            onChange={setTopics}
            suggestions={tags.map((t) => t.name)}
            placeholder="e.g. roadmap"
            renderToken={(t) => `#${t}`}
          />
        </Field>
      </form>
    </Modal>
  );
}
