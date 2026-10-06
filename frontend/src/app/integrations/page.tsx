import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Integrations" };

interface Integration {
  name: string;
  category: string;
  description: string;
  color: string;
}

// Letter tiles instead of third-party logos; real integrations are out of scope.
const INTEGRATIONS: Integration[] = [
  {
    name: "Zoom",
    category: "Video conferencing",
    description: "Automatically join and record Zoom meetings.",
    color: "#2D8CFF",
  },
  {
    name: "Google Meet",
    category: "Video conferencing",
    description: "Capture Google Meet calls from your calendar.",
    color: "#00897B",
  },
  {
    name: "Microsoft Teams",
    category: "Video conferencing",
    description: "Record and transcribe Teams meetings.",
    color: "#5059C9",
  },
  {
    name: "Google Calendar",
    category: "Calendar",
    description: "Sync events so Fred joins the right meetings.",
    color: "#1A73E8",
  },
  {
    name: "Outlook Calendar",
    category: "Calendar",
    description: "Connect your Microsoft 365 calendar.",
    color: "#0F6CBD",
  },
  {
    name: "Slack",
    category: "Collaboration",
    description: "Post meeting recaps and action items to channels.",
    color: "#611F69",
  },
  {
    name: "HubSpot",
    category: "CRM",
    description: "Log notes and action items to deals and contacts.",
    color: "#FF7A59",
  },
  {
    name: "Salesforce",
    category: "CRM",
    description: "Sync call summaries to opportunities.",
    color: "#00A1E0",
  },
  {
    name: "Notion",
    category: "Productivity",
    description: "Send meeting notes to a Notion database.",
    color: "#111111",
  },
  {
    name: "Asana",
    category: "Task management",
    description: "Turn action items into Asana tasks.",
    color: "#F06A6A",
  },
  {
    name: "Jira",
    category: "Task management",
    description: "Create Jira issues from meeting action items.",
    color: "#0052CC",
  },
  {
    name: "Zapier",
    category: "Automation",
    description: "Trigger workflows when a meeting is transcribed.",
    color: "#FF4F00",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="pb-10">
      <PageHeader
        title="Integrations"
        description="Connect Fireflies to the tools your team already uses."
      />
      <div className="grid gap-4 px-4 sm:grid-cols-2 md:px-8 xl:grid-cols-3">
        {INTEGRATIONS.map((app) => (
          <div
            key={app.name}
            className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card"
          >
            <div className="flex items-start justify-between">
              <span
                className="flex size-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: app.color }}
                aria-hidden
              >
                {app.name[0]}
              </span>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink-secondary">
                Coming soon
              </span>
            </div>
            <h2 className="mt-4 text-sm font-semibold text-ink">{app.name}</h2>
            <p className="text-xs text-ink-tertiary">{app.category}</p>
            <p className="mt-2 flex-1 text-sm text-ink-secondary">{app.description}</p>
            <button
              type="button"
              disabled
              className="mt-4 h-8 cursor-not-allowed rounded-lg border border-line text-sm font-semibold text-ink-tertiary"
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
