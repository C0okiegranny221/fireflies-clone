import type { Metadata } from "next";
import { WandSparkles } from "lucide-react";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "AI Skills" };

export default function Page() {
  return (
    <ComingSoon
      icon={WandSparkles}
      title="AI Skills"
      description="Automate follow-ups after every meeting: draft emails, update your CRM and create tickets."
      bullets={[
        "Send a follow-up email draft after sales calls",
        "Push action items to Asana, Jira or Linear",
        "Build custom skills from a prompt",
      ]}
    />
  );
}
