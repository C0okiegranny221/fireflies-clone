import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: { absolute: "Fireflies: AI notes for every meeting" },
  description:
    "Transcribe, summarize, search and act on every meeting. A Fireflies.ai clone built for an SDE assignment.",
};

export default function Page() {
  return <LandingPage />;
}
