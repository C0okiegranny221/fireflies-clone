import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Tasks" };

// Temporary stub — the full view lands in a later step.
export default function Page() {
  return (
    <PageHeader title="Tasks" description="Every action item from your meetings, in one place." />
  );
}
