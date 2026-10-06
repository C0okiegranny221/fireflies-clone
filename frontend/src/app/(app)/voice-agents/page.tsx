import type { Metadata } from "next";
import { AudioLines } from "lucide-react";

import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Voice Agents" };

export default function Page() {
  return (
    <ComingSoon
      icon={AudioLines}
      title="Voice Agents"
      description="AI voice agents that can run interviews, intake calls and surveys for you."
      bullets={[
        "Screen candidates with a structured voice interview",
        "Every call is transcribed and summarized automatically",
      ]}
    />
  );
}
