import type { Metadata } from "next";
import { ChartColumnBig } from "lucide-react";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <ComingSoon
      icon={ChartColumnBig}
      title="Analytics"
      description="Conversation intelligence for your team: talk time, sentiment, topics and meeting trends."
      bullets={[
        "Talk-to-listen ratio and longest monologue per speaker",
        "Topic trackers across all meetings",
        "Weekly meeting load per teammate",
      ]}
    />
  );
}
