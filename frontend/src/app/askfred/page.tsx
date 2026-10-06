import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "AskFred" };

export default function Page() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AskFred"
      description="Ask questions across all of your meetings and get answers with links to the exact moments."
      bullets={[
        '"What did we decide about pricing last week?"',
        '"Summarize every call with Northwind"',
        "Answers cite the transcript lines they came from",
      ]}
    />
  );
}
