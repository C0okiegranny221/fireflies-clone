import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchView } from "@/components/search/SearchView";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  // The query lives in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
