import { Bot, FileUp, PencilLine } from "lucide-react";

import type { MeetingSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCES = {
  notetaker: {
    icon: Bot,
    label: "Captured by Fireflies notetaker",
    tone: "bg-brand-soft text-brand-text",
  },
  upload: {
    icon: FileUp,
    label: "Uploaded transcript",
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  manual: {
    icon: PencilLine,
    label: "Created manually",
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
} as const;

export const SOURCE_LABELS: Record<MeetingSource, string> = {
  notetaker: "Fireflies notetaker",
  upload: "Uploads",
  manual: "Created manually",
};

/** Small tile showing how a meeting was captured, as in the Fireflies meetings list. */
export function SourceIcon({ source, className }: { source: MeetingSource; className?: string }) {
  const { icon: Icon, label, tone } = SOURCES[source];
  return (
    <span
      title={label}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone, className)}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}
