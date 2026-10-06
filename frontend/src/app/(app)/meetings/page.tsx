import type { Metadata } from "next";
import { Suspense } from "react";

import { MeetingsLibrary } from "@/components/meetings/MeetingsLibrary";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  // Filters live in the URL (useSearchParams), which needs a Suspense boundary when prerendering.
  return (
    <Suspense>
      <MeetingsLibrary />
    </Suspense>
  );
}
