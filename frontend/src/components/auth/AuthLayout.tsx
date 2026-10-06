import { CheckCircle2, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";

/** Shown wherever credentials are collected: this is a look-alike, so say so plainly. */
export function CloneNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Demo project: a Fireflies.ai clone built for an SDE assignment. It is not affiliated with
        Fireflies.ai; don&apos;t use your real Fireflies password here.
      </span>
    </p>
  );
}

const POINTS = [
  "Transcripts synced to the recording, line by line",
  "AI summaries, outlines and action items",
  "Search every meeting and ask AskFred anything",
];

/** Split-screen auth layout: form on the left, product panel on the right (lg and up). */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[46%] lg:px-16">
        <Link href="/" aria-label="Back to the homepage" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-secondary">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <CloneNotice className="mt-8" />
        </div>
      </div>

      <aside className="relative hidden flex-1 overflow-hidden bg-[#100730] lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="absolute -top-32 -right-24 size-[520px] rounded-full bg-accent-pink/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 size-[520px] rounded-full bg-brand-500/40 blur-3xl"
        />
        <div className="relative">
          <h2 className="max-w-md text-3xl leading-tight font-semibold text-white">
            Every meeting, captured and searchable.
          </h2>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="size-4 text-brand-300" />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 overflow-hidden rounded-xl border border-white/15 shadow-2xl">
            <Image
              src="/landing/notepad.png"
              alt="The meeting notepad with AI notes and a synced transcript"
              width={1440}
              height={900}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
