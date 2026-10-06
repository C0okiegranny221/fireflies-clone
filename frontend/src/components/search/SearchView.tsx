"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSearch, PlayCircle, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { controlClass } from "@/components/ui/Field";
import { api, queryKeys } from "@/lib/api";
import { formatClock, formatDuration, formatMeetingDate, parseApiDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Render an FTS snippet, turning the API's [[match]] markers into highlights. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/\[\[(.*?)\]\]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-highlight px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const q = (useSearchParams().get("q") ?? "").trim();
  const [draft, setDraft] = useState(q);
  const [synced, setSynced] = useState(q);
  if (q !== synced) {
    // A new search from the top bar while this page is open.
    setSynced(q);
    setDraft(q);
  }

  const results = useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => api.search(q),
    enabled: q.length > 0,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname);
  };

  const items = results.data?.results ?? [];
  const hitCount = items.reduce((n, r) => n + r.hits.length, 0);

  return (
    <div className="px-4 pt-6 pb-12 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Search</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Find anything that was said across all of your meetings.
      </p>

      <form onSubmit={submit} className="relative mt-5 max-w-2xl" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-placeholder" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search transcripts, titles, people and topics"
          aria-label="Search all meetings"
          className={cn(controlClass, "h-11 pr-24 pl-9 text-base")}
        />
        <Button type="submit" variant="primary" size="sm" className="absolute top-1.5 right-1.5">
          Search
        </Button>
      </form>

      <div className="mt-6 max-w-4xl">
        {!q ? (
          <EmptyState
            icon={FileSearch}
            title="Search every meeting"
            description="Try a topic like “pricing”, a person like “Priya”, or a phrase like “memory leak”."
          />
        ) : results.isPending ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : results.isError ? (
          <EmptyState
            icon={RefreshCcw}
            title="Search failed"
            description={results.error.message}
            action={<Button onClick={() => results.refetch()}>Try again</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={`No results for “${q}”`}
            description="Check the spelling or try fewer words."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-secondary">
              {items.length} meeting{items.length === 1 ? "" : "s"}
              {hitCount > 0 && ` · ${hitCount} transcript match${hitCount === 1 ? "" : "es"}`}
            </p>
            <div className="space-y-4">
              {items.map((r) => (
                <section
                  key={r.meeting_id}
                  aria-label={r.title}
                  className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/meetings/${r.meeting_id}`}
                        className="block truncate text-sm font-semibold text-ink hover:text-brand-text"
                      >
                        {r.title}
                      </Link>
                      <p className="text-xs text-ink-tertiary">
                        {formatMeetingDate(parseApiDate(r.started_at))} ·{" "}
                        {formatDuration(r.duration_sec)}
                      </p>
                    </div>
                    {r.matched_meeting && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-text">
                        Title, people or topic match
                      </span>
                    )}
                  </div>
                  {r.hits.length > 0 && (
                    <ul className="divide-y divide-line">
                      {r.hits.map((h) => (
                        <li key={h.segment_id}>
                          <Link
                            href={`/meetings/${r.meeting_id}?t=${h.start_ms}`}
                            className="group flex gap-3 px-5 py-3 hover:bg-surface-muted"
                          >
                            <PlayCircle className="mt-0.5 size-4 shrink-0 text-brand-400 group-hover:text-brand-500" />
                            <span className="min-w-0">
                              <span className="text-xs font-semibold text-ink">
                                {h.speaker}{" "}
                                <span className="font-medium text-brand-text tabular-nums">
                                  {formatClock(h.start_ms / 1000)}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-sm leading-6 text-ink-secondary">
                                <Snippet text={h.snippet} />
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
