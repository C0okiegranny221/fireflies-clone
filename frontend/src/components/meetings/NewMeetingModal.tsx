"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, FilePlus2, FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { useAppUI, type NewMeetingTab } from "@/components/providers/AppUIProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TokenInput } from "@/components/ui/TokenInput";
import { api, queryKeys } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPTED = [".txt", ".vtt", ".json"];
const MAX_BYTES = 2 * 1024 * 1024;
const SAMPLES = [
  { href: "/samples/marketing_sync.vtt", label: "WebVTT" },
  { href: "/samples/support_standup.txt", label: "Text" },
  { href: "/samples/design_critique.json", label: "JSON" },
];

const TABS: { id: NewMeetingTab; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "paste", label: "Paste transcript", icon: ClipboardPaste },
  { id: "form", label: "Manual", icon: FilePlus2 },
];

function formatBytes(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

function ChannelSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const id = useId();
  const { data: channels = [] } = useQuery({ queryKey: queryKeys.channels, queryFn: api.channels });
  return (
    <Field label="Channel" htmlFor={id}>
      <Select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">No channel</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function DropZone({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(ext)) return toast.error("Upload a .txt, .vtt or .json transcript");
    if (f.size > MAX_BYTES) return toast.error("Transcripts can be up to 2 MB");
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted p-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
          <p className="text-xs text-ink-tertiary">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="rounded-lg p-1.5 text-ink-tertiary hover:bg-surface-hover hover:text-ink"
          aria-label="Remove file"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
        over ? "border-brand-400 bg-brand-soft" : "border-line-strong bg-surface-muted",
      )}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-ink-secondary shadow-card ring-1 ring-line">
        <Upload className="size-5" />
      </span>
      <p className="text-sm text-ink-secondary">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-semibold text-brand-text hover:underline"
        >
          Click to upload
        </button>{" "}
        or drag and drop
      </p>
      <p className="mt-1 text-xs text-ink-tertiary">
        WebVTT, plain text or JSON transcript (max 2 MB)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        aria-label="Transcript file"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** "New meeting" modal opened from Capture / Upload: upload, paste or create manually. */
export function NewMeetingModal() {
  const { newMeetingTab, openNewMeeting, closeNewMeeting } = useAppUI();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: people = [] } = useQuery({
    queryKey: queryKeys.participants,
    queryFn: api.participants,
    enabled: newMeetingTab !== null,
  });

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [channelId, setChannelId] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setTitle("");
    setChannelId(null);
    setTranscript("");
    setParticipants([]);
    setStartedAt("");
    setDurationMin("");
    setTopics([]);
    setError(null);
  };

  const create = useMutation({
    mutationFn: (tab: NewMeetingTab): Promise<MeetingDetail> => {
      if (tab === "upload") return api.meetings.upload(file!, title.trim() || undefined, channelId);
      return api.meetings.create({
        title: title.trim(),
        transcript_text: tab === "paste" ? transcript : undefined,
        participants,
        channel_id: channelId,
        tags: topics,
        started_at: tab === "form" && startedAt ? new Date(startedAt).toISOString() : undefined,
        duration_sec:
          tab === "form" && durationMin ? Math.round(Number(durationMin) * 60) : undefined,
      });
    },
    onSuccess: async (meeting) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.participants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      ]);
      const notes = meeting.action_items.length;
      toast.success(`“${meeting.title}” is ready`, {
        description: meeting.summary
          ? `AI notes generated with ${notes} action item${notes === 1 ? "" : "s"}.`
          : "Meeting created.",
      });
      closeNewMeeting();
      reset();
      router.push(`/meetings/${meeting.id}`);
    },
    onError: (err) => setError(err.message),
  });

  const tab = newMeetingTab ?? "upload";
  const canSubmit =
    !create.isPending &&
    (tab === "upload"
      ? file !== null
      : title.trim() !== "" && (tab !== "paste" || transcript.trim() !== ""));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (canSubmit) create.mutate(tab);
  };

  return (
    <Modal
      open={newMeetingTab !== null}
      onOpenChange={(open) => !open && !create.isPending && closeNewMeeting()}
      title="New meeting"
      description="Add a transcript and Fireflies will generate notes, action items and an outline."
      className="max-w-xl"
      footer={
        <>
          <Button onClick={closeNewMeeting} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-meeting" disabled={!canSubmit}>
            {create.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {tab === "form" ? "Creating…" : "Generating notes…"}
              </>
            ) : tab === "form" ? (
              "Create meeting"
            ) : (
              "Create & generate notes"
            )}
          </Button>
        </>
      }
    >
      <Tabs.Root
        value={tab}
        onValueChange={(v) => {
          setError(null);
          openNewMeeting(v as NewMeetingTab);
        }}
      >
        <Tabs.List
          className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-surface-hover p-1"
          aria-label="How to add the meeting"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-brand-300 data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card sm:text-sm"
            >
              <Icon className="size-3.5" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <form id="new-meeting" onSubmit={submit} className="space-y-4">
          <Tabs.Content value="upload" className="space-y-4">
            <DropZone file={file} onFile={setFile} />
            <p className="text-xs text-ink-tertiary">
              No transcript handy? Try a sample:{" "}
              {SAMPLES.map((s, i) => (
                <span key={s.href}>
                  {i > 0 && " · "}
                  <a href={s.href} download className="font-medium text-brand-text hover:underline">
                    {s.label}
                  </a>
                </span>
              ))}
            </p>
            <Field
              label="Title (optional)"
              htmlFor="upload-title"
              hint="Defaults to the file name."
            >
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
              />
            </Field>
            <ChannelSelect value={channelId} onChange={setChannelId} />
          </Tabs.Content>

          <Tabs.Content value="paste" className="space-y-4">
            <Field label="Title" htmlFor="paste-title">
              <Input
                id="paste-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </Field>
            <Field
              label="Transcript"
              htmlFor="paste-transcript"
              hint={
                <>
                  One turn per line, e.g. <code className="font-mono">Maya: Let&apos;s start…</code>{" "}
                  or <code className="font-mono">[00:01:23] Maya: …</code>. WebVTT and JSON work
                  too.
                </>
              }
            >
              <Textarea
                id="paste-transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                className="font-mono text-xs leading-5"
                placeholder={
                  "Maya Chen: Thanks for joining. Let's lock the launch plan.\nTom Alvarez: I'll send the final copy by Thursday."
                }
              />
            </Field>
            <ChannelSelect value={channelId} onChange={setChannelId} />
          </Tabs.Content>

          <Tabs.Content value="form" className="space-y-4">
            <Field label="Title" htmlFor="form-title">
              <Input
                id="form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date & time" htmlFor="form-date" hint="Defaults to now.">
                <Input
                  id="form-date"
                  type="datetime-local"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </Field>
              <Field label="Duration (minutes)" htmlFor="form-duration">
                <Input
                  id="form-duration"
                  type="number"
                  min={0}
                  step={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Participants"
              htmlFor="form-participants"
              hint="You're added as the host automatically."
            >
              <TokenInput
                id="form-participants"
                value={participants}
                onChange={setParticipants}
                suggestions={people.map((p) => p.name)}
                placeholder="Add a name and press Enter"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChannelSelect value={channelId} onChange={setChannelId} />
              <Field label="Topics" htmlFor="form-topics">
                <TokenInput
                  id="form-topics"
                  value={topics}
                  onChange={setTopics}
                  placeholder="e.g. roadmap"
                  renderToken={(t) => `#${t}`}
                />
              </Field>
            </div>
          </Tabs.Content>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}
        </form>
      </Tabs.Root>
    </Modal>
  );
}
