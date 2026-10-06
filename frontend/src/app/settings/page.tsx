import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

import { SettingsView } from "./SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="pb-10">
      <PageHeader title="Settings" description="Manage your account and notetaker preferences." />
      <SettingsView />
    </div>
  );
}
