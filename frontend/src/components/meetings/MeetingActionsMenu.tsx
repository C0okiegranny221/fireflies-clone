"use client";

import {
  Download,
  ExternalLink,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { comingSoon } from "@/components/layout/comingSoon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";
import { useMeetingMutations } from "@/hooks/useMeetingMutations";
import { api } from "@/lib/api";
import type { MeetingListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import { EditMeetingModal } from "./EditMeetingModal";

/** The API answers with Content-Disposition: attachment, so navigating to it downloads. */
function download(meetingId: number, format: "md" | "txt") {
  const link = document.createElement("a");
  link.href = api.meetings.exportUrl(meetingId, format);
  link.rel = "noopener";
  link.click();
  toast.success(`Downloading ${format === "md" ? "Markdown" : "text"} export`);
}

/** The "⋯" menu for a meeting (list rows and the meeting page header). */
export function MeetingActionsMenu({
  meeting,
  onDeleted,
  showOpen = true,
  triggerClassName,
}: {
  meeting: Pick<MeetingListItem, "id" | "title" | "participants" | "channel" | "tags">;
  onDeleted?: () => void;
  showOpen?: boolean;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const { remove } = useMeetingMutations();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meeting.id}`);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <>
      <Menu>
        <MenuTrigger
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-ink-tertiary outline-none hover:bg-surface-hover hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-100 data-[state=open]:bg-surface-hover data-[state=open]:text-ink",
            triggerClassName,
          )}
          aria-label={`Actions for ${meeting.title}`}
        >
          <MoreHorizontal className="size-[18px]" />
        </MenuTrigger>
        <MenuContent>
          {showOpen && (
            <MenuItem
              icon={<ExternalLink />}
              onSelect={() => router.push(`/meetings/${meeting.id}`)}
            >
              Open meeting
            </MenuItem>
          )}
          <MenuItem icon={<Share2 />} onSelect={() => comingSoon("Sharing meetings")}>
            Share
          </MenuItem>
          <MenuItem icon={<Link2 />} onSelect={copyLink}>
            Copy link
          </MenuItem>
          <MenuItem icon={<Pencil />} onSelect={() => setEditing(true)}>
            Rename & edit
          </MenuItem>
          <MenuSeparator />
          <MenuLabel>Download notes & transcript</MenuLabel>
          <MenuItem icon={<Download />} onSelect={() => download(meeting.id, "md")}>
            Markdown (.md)
          </MenuItem>
          <MenuItem icon={<FileText />} onSelect={() => download(meeting.id, "txt")}>
            Plain text (.txt)
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 />} danger onSelect={() => setConfirming(true)}>
            Delete
          </MenuItem>
        </MenuContent>
      </Menu>

      {editing && <EditMeetingModal meeting={meeting} open onOpenChange={setEditing} />}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete meeting?"
        description={
          <>
            <span className="font-medium text-ink">{meeting.title}</span> and its transcript, notes
            and action items will be permanently deleted.
          </>
        }
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate([meeting.id], {
            onSuccess: () => {
              setConfirming(false);
              onDeleted?.();
            },
          })
        }
      />
    </>
  );
}
