import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Search" };

// Temporary stub — the full view lands in a later step.
export default function Page() {
  return <PageHeader title="Search" description="Results across all of your meetings." />;
}
