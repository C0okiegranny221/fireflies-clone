import { AppShell } from "@/components/layout/AppShell";

/** Signed-in area: sidebar, top bar and the New meeting modal. Access is gated in proxy.ts. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
