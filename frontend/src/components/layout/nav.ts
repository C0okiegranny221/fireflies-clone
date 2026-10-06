import {
  AudioLines,
  Blocks,
  ChartColumnBig,
  CircleCheckBig,
  House,
  type LucideIcon,
  NotebookText,
  Settings,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Primary navigation, in the same order as the Fireflies sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/askfred", label: "AskFred", icon: Sparkles },
  { href: "/meetings", label: "Meetings", icon: NotebookText },
  { href: "/tasks", label: "Tasks", icon: CircleCheckBig },
  { href: "/ai-skills", label: "AI Skills", icon: WandSparkles },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
  { href: "/voice-agents", label: "Voice Agents", icon: AudioLines },
  { href: "/integrations", label: "Integrations", icon: Blocks },
];

export const SETTINGS_NAV: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
