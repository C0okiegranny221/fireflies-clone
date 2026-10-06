import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

/** Placeholder for features that are out of scope (integrations, live bot, analytics…). */
export function ComingSoon({
  icon: Icon = Sparkles,
  title,
  description,
  bullets = [],
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-text ring-8 ring-brand-soft/50">
          <Icon className="size-6" />
        </div>
        <span className="mb-3 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-text">
          Coming soon
        </span>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-secondary">{description}</p>
        {bullets.length > 0 && (
          <ul className="mt-5 space-y-2 rounded-xl border border-line bg-surface p-4 text-left text-sm text-ink-secondary shadow-card">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
