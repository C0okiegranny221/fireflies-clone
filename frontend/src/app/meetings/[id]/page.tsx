import { notFound } from "next/navigation";

import { MeetingView } from "@/components/notepad/MeetingView";

export default async function MeetingPage({ params, searchParams }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const { t } = await searchParams;
  const meetingId = Number(id);
  if (!Number.isInteger(meetingId) || meetingId <= 0) notFound();
  // ?t=<ms> opens the meeting at a moment (e.g. where an action item was said).
  const startMs = Number(Array.isArray(t) ? t[0] : t);
  return (
    <MeetingView id={meetingId} startMs={Number.isFinite(startMs) && startMs > 0 ? startMs : 0} />
  );
}
