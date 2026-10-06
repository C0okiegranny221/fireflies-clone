"use client";

import {
  CalendarPlus,
  ChevronDown,
  ClipboardPaste,
  FilePlus2,
  Mic,
  Plus,
  Upload,
  Video,
} from "lucide-react";

import { useAppUI } from "@/components/providers/AppUIProvider";
import { Button } from "@/components/ui/Button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/Menu";

import { comingSoon } from "./comingSoon";

export function CaptureMenu() {
  const { openNewMeeting } = useAppUI();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="primary" className="pr-2.5">
          <Plus />
          <span className="hidden sm:inline">Capture</span>
          <ChevronDown className="opacity-80" />
        </Button>
      </MenuTrigger>
      <MenuContent className="w-64">
        <MenuLabel>Add a meeting</MenuLabel>
        <MenuItem icon={<Upload />} onSelect={() => openNewMeeting("upload")}>
          Upload transcript
        </MenuItem>
        <MenuItem icon={<ClipboardPaste />} onSelect={() => openNewMeeting("paste")}>
          Paste transcript
        </MenuItem>
        <MenuItem icon={<FilePlus2 />} onSelect={() => openNewMeeting("form")}>
          Create meeting manually
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Capture live</MenuLabel>
        <MenuItem icon={<Video />} onSelect={() => comingSoon("Adding Fred to a live meeting")}>
          Add to live meeting
        </MenuItem>
        <MenuItem icon={<CalendarPlus />} onSelect={() => comingSoon("Scheduling meetings")}>
          Schedule meeting
        </MenuItem>
        <MenuItem icon={<Mic />} onSelect={() => comingSoon("Live recording and transcription")}>
          Start recording
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
