"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Avatar } from "@/components/ui/Avatar";
import { api, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "notetaker", label: "Notetaker" },
  { id: "notifications", label: "Notifications" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
] as const;

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-line py-5 last:border-0 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-ink-tertiary">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center gap-3 text-sm text-ink-secondary">
      <span
        className={cn(
          "relative inline-flex h-5 w-9 cursor-not-allowed rounded-full transition-colors",
          on ? "bg-brand-500" : "bg-line-strong",
        )}
        role="switch"
        aria-checked={on}
        aria-disabled
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </span>
      {label}
    </span>
  );
}

const inputClass =
  "h-10 w-full max-w-md rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink shadow-card disabled:bg-surface-muted disabled:text-ink-secondary";

export function SettingsView() {
  const { data: me } = useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: Infinity });
  const { theme, toggleTheme } = useTheme();

  return (
    <Tabs.Root defaultValue="profile" className="px-4 md:px-8">
      <Tabs.List className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Settings">
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="-mb-px border-b-2 border-transparent px-3 pb-3 text-sm font-semibold whitespace-nowrap text-ink-tertiary hover:text-ink-secondary data-[state=active]:border-brand-500 data-[state=active]:text-brand-text"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="profile" className="max-w-4xl">
        <Row label="Photo" hint="Shown on your meetings and comments.">
          {me && <Avatar name={me.name} color={me.avatar_color} size="lg" />}
        </Row>
        <Row label="Name">
          <input className={inputClass} value={me?.name ?? ""} disabled readOnly />
        </Row>
        <Row label="Email" hint="Used to log in. Editing your profile is coming soon.">
          <input className={inputClass} value={me?.email ?? ""} disabled readOnly />
        </Row>
        <Row label="Appearance" hint="Choose how Fireflies looks to you.">
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => theme !== mode && toggleTheme()}
                className={cn(
                  "h-9 rounded-lg border px-4 text-sm font-semibold capitalize",
                  theme === mode
                    ? "border-brand-300 bg-brand-soft text-brand-text"
                    : "border-line-strong text-ink-secondary hover:bg-surface-hover",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </Row>
      </Tabs.Content>

      <Tabs.Content value="notetaker" className="max-w-4xl">
        <Row label="Auto-join meetings" hint="Fred joins calendar events with a meeting link.">
          <Toggle on label="All meetings on my calendar" />
        </Row>
        <Row label="Meeting language">
          <input className={inputClass} value="English (Global)" disabled readOnly />
        </Row>
        <Row label="Email recap" hint="Send notes to participants after each meeting.">
          <Toggle on={false} label="Only to me" />
        </Row>
      </Tabs.Content>

      <Tabs.Content value="notifications" className="max-w-4xl">
        <Row label="Notes ready">
          <Toggle on label="Email me when meeting notes are ready" />
        </Row>
        <Row label="Weekly digest">
          <Toggle on label="Summary of my meetings every Monday" />
        </Row>
      </Tabs.Content>

      {(["team", "billing"] as const).map((id) => (
        <Tabs.Content key={id} value={id} className="max-w-4xl py-10 text-sm text-ink-secondary">
          <span className="mb-2 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-text">
            Coming soon
          </span>
          <p>
            {id === "team"
              ? "Invite teammates, manage roles and share meetings across your workspace."
              : "Manage your plan, seats and invoices."}
          </p>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
