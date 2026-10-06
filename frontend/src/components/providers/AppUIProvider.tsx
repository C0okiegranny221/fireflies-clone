"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type NewMeetingTab = "upload" | "paste" | "form";

interface AppUIState {
  /** Which tab of the "New meeting" modal is open, or null when closed. */
  newMeetingTab: NewMeetingTab | null;
  openNewMeeting: (tab?: NewMeetingTab) => void;
  closeNewMeeting: () => void;
}

const AppUIContext = createContext<AppUIState | null>(null);

/** App-wide UI state that several unrelated components trigger (e.g. Capture → Upload). */
export function AppUIProvider({ children }: { children: ReactNode }) {
  const [newMeetingTab, setNewMeetingTab] = useState<NewMeetingTab | null>(null);
  const openNewMeeting = useCallback((tab: NewMeetingTab = "upload") => setNewMeetingTab(tab), []);
  const closeNewMeeting = useCallback(() => setNewMeetingTab(null), []);

  const value = useMemo(
    () => ({ newMeetingTab, openNewMeeting, closeNewMeeting }),
    [newMeetingTab, openNewMeeting, closeNewMeeting],
  );
  return <AppUIContext value={value}>{children}</AppUIContext>;
}

export function useAppUI() {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useAppUI must be used inside <AppUIProvider>");
  return ctx;
}
