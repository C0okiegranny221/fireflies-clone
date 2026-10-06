import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "AskFred" };

export default function Page() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AskFred"
      description="Ask questions across all of your meetings at once. AskFred already works inside each meeting: open one and click AskFred."
      bullets={[
        '"What did we decide about pricing last week?"',
        '"Summarize every call with Northwind"',
        "Answers cite the transcript lines they came from",
      ]}
    />
  );
}
