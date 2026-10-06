import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Meetings" };

// Temporary stub — the full view lands in a later step.
export default function Page() {
  return <PageHeader title="Meetings" description="All of your recorded and uploaded meetings." />;
}
