import {
  AudioLines,
  CalendarClock,
  ChevronDown,
  ClipboardPaste,
  Download,
  FilePlus2,
  FileUp,
  KeyRound,
  ListChecks,
  type LucideIcon,
  MessageSquareQuote,
  Puzzle,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CloneNotice } from "@/components/auth/AuthLayout";
import { Logo } from "@/components/layout/Logo";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { LandingNav } from "./LandingNav";
import { SummaryTabs } from "./SummaryTabs";

const REPO_URL = "https://github.com/C0okiegranny221/fireflies-clone";

/** Product screenshot in a browser-window frame. */
function Screenshot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
      <div
        className="flex h-8 items-center gap-1.5 border-b border-line bg-surface-muted px-3"
        aria-hidden
      >
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
      </div>
      <Image
        src={src}
        alt={alt}
        width={1440}
        height={900}
        className="h-auto w-full"
        priority={priority}
      />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-brand-text uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-ink-secondary">{children}</p>}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  children,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
          <Icon className="size-5" />
        </span>
        {badge && (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink-tertiary">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-ink-secondary">{children}</p>
    </div>
  );
}

const CTA_PRIMARY = cn(buttonVariants({ variant: "primary", size: "lg" }), "h-12 px-6 text-base");
const CTA_SECONDARY = cn(
  buttonVariants({ variant: "secondary", size: "lg" }),
  "h-12 px-6 text-base",
);

const FAQ = [
  {
    q: "Is this the real Fireflies.ai?",
    a: "No. It's an independent clone built for an SDE fullstack assignment, recreating the Fireflies experience with Next.js, FastAPI and SQLite. It isn't affiliated with Fireflies.ai.",
  },
  {
    q: "Who can see the meetings I upload?",
    a: "This demo is one shared workspace: everyone who logs in sees the same meetings. Please don't upload anything confidential. The demo also resets to its sample meetings when the server restarts.",
  },
  {
    q: "Which AI writes the notes and answers AskFred?",
    a: "An open model served by Groq when configured, behind a pluggable provider layer that also supports Claude and Ollama. Without a provider (or past the demo's usage limits) it falls back to built-in offline summaries and keyword search, so it never breaks.",
  },
  {
    q: "Can I upload audio or video?",
    a: "Not yet: speech-to-text is out of scope. Upload or paste a transcript (WebVTT, plain text or JSON) and Fireflies generates the notes. The sample meetings include generated audio so you can try the synced player.",
  },
  {
    q: "Does Fred join my Zoom or Google Meet calls?",
    a: "Live capture, calendar sync and integrations are shown as 'coming soon' in this demo. Everything after the meeting — transcript, notes, search, AskFred, tasks — works today.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-0 flex justify-center"
        >
          <div className="h-[520px] w-[1100px] rounded-full bg-gradient-to-r from-accent-pink/20 via-accent-magenta/15 to-brand-500/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
          <a
            href="#search"
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-3 py-1 text-xs font-semibold text-brand-text shadow-card dark:border-brand-800"
          >
            <Sparkles className="size-3.5" />
            New: ask AskFred anything about a meeting
          </a>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            Your AI assistant for{" "}
            <span className="bg-gradient-to-r from-accent-pink via-accent-magenta to-brand-500 bg-clip-text text-transparent">
              every meeting
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-secondary sm:text-xl">
            Transcribe, summarize, search and act on your team&apos;s conversations. Turn every call
            into notes, action items and answers in seconds.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={CTA_PRIMARY}>
              Get started free
            </Link>
            <Link href="/login?demo=1" className={CTA_SECONDARY}>
              Try the live demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-tertiary">
            Free · No credit card · Sample meetings included
          </p>
          <div className="relative mx-auto mt-14 max-w-6xl">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-accent-pink/25 to-brand-500/25 blur-2xl"
            />
            <div className="relative">
              <Screenshot
                src="/landing/notepad.png"
                alt="Meeting notepad: AI notes beside a transcript synced to the recording"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Works-with strip */}
      <section className="border-y border-line bg-surface-muted py-10">
        <p className="text-center text-xs font-semibold tracking-widest text-ink-tertiary uppercase">
          Bring transcripts from the tools your team already meets on
        </p>
        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-lg font-bold text-ink-tertiary/80">
          {["Zoom", "Google Meet", "Microsoft Teams", "Webex", "Slack Huddles", "Loom"].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </section>

      {/* Transcription */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="Transcripts" title="Meeting transcripts you can actually use">
          Every line labelled by speaker, timestamped and synced to the recording. Click a line to
          hear it.
        </SectionHeading>
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard icon={UsersRound} title="Speaker labels">
              Know who said what, with talk-time stats for every participant.
            </FeatureCard>
            <FeatureCard icon={AudioLines} title="Synced playback">
              The transcript follows the audio, and every line seeks the player.
            </FeatureCard>
            <FeatureCard icon={Search} title="Find in transcript">
              Highlighted matches with next/previous, straight from the keyword chips.
            </FeatureCard>
            <FeatureCard icon={FileUp} title="Any transcript format">
              Upload WebVTT, plain text or JSON, or paste text directly.
            </FeatureCard>
          </div>
          <Screenshot
            src="/landing/notepad-dark.png"
            alt="Transcript with the active line highlighted, in dark mode"
          />
        </div>
      </section>

      {/* AI summaries */}
      <section className="bg-surface-muted py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-text uppercase">
              AI summaries
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Skip the recording. Read the notes.
            </h2>
            <p className="mt-4 text-lg text-ink-secondary">
              An overview, a timestamped outline, keywords and the action items people actually
              committed to, ready the moment a transcript lands. Regenerate any time.
            </p>
            <ul className="mt-6 space-y-3 text-ink-secondary">
              {[
                "Outline chapters jump the player to that moment",
                "Action items grouped by owner, ready to tick off",
                "Every summary shows which model wrote it",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <ListChecks className="mt-0.5 size-5 shrink-0 text-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <SummaryTabs />
        </div>
      </section>

      {/* Capture */}
      <section id="capture" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="Capture" title="Capture meetings any way you like">
          Get a meeting into Fireflies in seconds, with more capture methods on the way.
        </SectionHeading>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={FileUp} title="Upload a transcript">
            Drop a .vtt, .txt or .json export from your meeting tool.
          </FeatureCard>
          <FeatureCard icon={ClipboardPaste} title="Paste text">
            Paste any “Name: what they said” transcript and get notes instantly.
          </FeatureCard>
          <FeatureCard icon={FilePlus2} title="Create manually">
            Log a meeting with attendees, topics and your own action items.
          </FeatureCard>
          <FeatureCard icon={Video} title="Notetaker bot" badge="Coming soon">
            Invite Fred to Zoom, Google Meet or Teams to record and transcribe live.
          </FeatureCard>
          <FeatureCard icon={CalendarClock} title="Calendar auto-join" badge="Coming soon">
            Connect a calendar and Fred joins the meetings you choose.
          </FeatureCard>
          <FeatureCard icon={Puzzle} title="Integrations" badge="Coming soon">
            Push notes to Slack, HubSpot, Salesforce, Notion and more.
          </FeatureCard>
        </div>
      </section>

      {/* Search + AskFred */}
      <section id="search" className="scroll-mt-20 bg-surface-muted py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Search & AskFred" title="Remember every conversation">
            Search every word ever said across your meetings, or just ask.
          </SectionHeading>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-start gap-3">
                <Search className="mt-1 size-5 shrink-0 text-brand-500" />
                <div>
                  <h3 className="font-semibold">Meeting search</h3>
                  <p className="text-sm text-ink-secondary">
                    Full-text search with highlighted snippets that open the meeting at the moment.
                  </p>
                </div>
              </div>
              <Screenshot
                src="/landing/search.png"
                alt="Search results with highlighted transcript snippets"
              />
            </div>
            <div>
              <div className="mb-4 flex items-start gap-3">
                <MessageSquareQuote className="mt-1 size-5 shrink-0 text-brand-500" />
                <div>
                  <h3 className="font-semibold">AskFred</h3>
                  <p className="text-sm text-ink-secondary">
                    Answers grounded in the transcript, with citations that play the recording.
                  </p>
                </div>
              </div>
              <Screenshot
                src="/landing/askfred.png"
                alt="AskFred answering a question with transcript citations"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tasks */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-text uppercase">Tasks</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Every action item, in one place
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            Action items from all your meetings, grouped by meeting and owner. Tick them off and
            jump to the exact moment each one was agreed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink-secondary">
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
              <ListChecks className="size-4 text-brand-500" />
              Assign & complete
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
              <Download className="size-4 text-brand-500" />
              Export notes as Markdown
            </span>
          </div>
        </div>
        <Screenshot
          src="/landing/tasks.png"
          alt="Tasks page with action items grouped by meeting"
        />
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-20 bg-surface-muted py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Privacy & security" title="Built with care for your data" />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={KeyRound} title="Hashed passwords">
              Passwords are stored as salted scrypt hashes, never in plain text.
            </FeatureCard>
            <FeatureCard icon={ShieldCheck} title="Secure sessions">
              HttpOnly, same-site session cookies; tokens are stored only as hashes.
            </FeatureCard>
            <FeatureCard icon={WifiOff} title="AI is optional">
              Runs fully offline without an AI provider, and AI use is rate-limited.
            </FeatureCard>
            <FeatureCard icon={Download} title="Your data, portable">
              Export or delete any meeting, its transcript and notes at any time.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                {q}
                <ChevronDown className="size-5 shrink-0 text-ink-tertiary transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#100730] px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden
            className="absolute -top-24 -left-24 size-96 rounded-full bg-accent-pink/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -right-24 -bottom-24 size-96 rounded-full bg-brand-500/40 blur-3xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Unlock what&apos;s inside your conversations
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Start with the sample meetings, then bring your own transcripts.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className={cn(CTA_PRIMARY, "bg-white text-[#100730] hover:bg-white/90")}
              >
                Get started free
              </Link>
              <Link
                href="/login?demo=1"
                className={cn(
                  CTA_SECONDARY,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                )}
              >
                Try the live demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface-muted">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-secondary">
              AI meeting notes: transcripts, summaries, search and action items.
            </p>
            <CloneNotice className="mt-5 max-w-sm" />
          </div>
          {[
            {
              title: "Product",
              links: [
                ["Meetings", "/meetings"],
                ["AskFred", "/meetings"],
                ["Search", "/search"],
                ["Tasks", "/tasks"],
              ],
            },
            {
              title: "Get started",
              links: [
                ["Sign up", "/signup"],
                ["Log in", "/login"],
                ["Live demo", "/login?demo=1"],
              ],
            },
            {
              title: "Developers",
              links: [
                ["Source code", REPO_URL],
                ["Documentation", `${REPO_URL}#readme`],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-secondary">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("http") ? (
                      <a href={href} className="hover:text-ink" target="_blank" rel="noreferrer">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="hover:text-ink">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line py-6 text-center text-xs text-ink-tertiary">
          © {new Date().getFullYear()} Fireflies clone · A student project, not affiliated with
          Fireflies.ai Corp.
        </div>
      </footer>
    </div>
  );
}
