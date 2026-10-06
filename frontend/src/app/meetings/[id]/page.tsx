import { notFound } from "next/navigation";

import { MeetingView } from "@/components/notepad/MeetingView";

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const meetingId = Number(id);
  if (!Number.isInteger(meetingId) || meetingId <= 0) notFound();
  return <MeetingView id={meetingId} />;
}
