"use client";

import {
  Bookmark,
  ChartPie,
  CircleCheckBig,
  ListTree,
  type LucideIcon,
  MessageSquare,
  Scissors,
  Sparkles,
} from "lucide-react";

import { comingSoon } from "@/components/layout/comingSoon";
import { Tooltip } from "@/components/ui/Tooltip";

import { NOTE_SECTIONS } from "./SummaryPanel";

interface RailItem {
  label: string;
  icon: LucideIcon;
  section?: string;
}

const ITEMS: RailItem[] = [
  { label: "AI Notes", icon: Sparkles, section: NOTE_SECTIONS.overview },
  { label: "Outline", icon: ListTree, section: NOTE_SECTIONS.outline },
  { label: "Action items", icon: CircleCheckBig, section: NOTE_SECTIONS.actions },
  { label: "Speaker talk time", icon: ChartPie, section: NOTE_SECTIONS.speakers },
];

const PLACEHOLDERS: RailItem[] = [
  { label: "Soundbites", icon: Scissors },
  { label: "Comments", icon: MessageSquare },
  { label: "Bookmarks", icon: Bookmark },
];

/** Fireflies' slim tool rail beside the notes: jump to sections or open meeting tools. */
export function IconRail({ onJump }: { onJump: (sectionId: string) => void }) {
  const button =
    "flex size-9 items-center justify-center rounded-lg text-ink-tertiary hover:bg-surface-hover hover:text-ink";
  return (
    <nav
      aria-label="Meeting tools"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3 lg:flex"
    >
      {ITEMS.map(({ label, icon: Icon, section }) => (
        <Tooltip key={label} content={label} side="right">
          <button
            type="button"
            className={button}
            onClick={() => onJump(section!)}
            aria-label={label}
          >
            <Icon className="size-[18px]" />
          </button>
        </Tooltip>
      ))}
      <div className="my-2 h-px w-6 bg-line" />
      {PLACEHOLDERS.map(({ label, icon: Icon }) => (
        <Tooltip key={label} content={label} side="right">
          <button
            type="button"
            className={button}
            onClick={() => comingSoon(label)}
            aria-label={label}
          >
            <Icon className="size-[18px]" />
          </button>
        </Tooltip>
      ))}
    </nav>
  );
}
