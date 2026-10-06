"use client";

import { PanelLeftClose, PanelLeftOpen, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

import { Logo } from "./Logo";
import { isActive, PRIMARY_NAV, SETTINGS_NAV, type NavItem } from "./nav";

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-soft text-brand-text"
          : "text-ink-secondary hover:bg-surface-hover hover:text-ink",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-brand-500" : "text-ink-tertiary group-hover:text-ink-secondary",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center px-4",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        <Link href="/home" onClick={onNavigate} aria-label="Fireflies home">
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden rounded-md p-1 text-ink-tertiary hover:bg-surface-hover hover:text-ink md:block"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="space-y-3 border-t border-line px-3 py-3">
        {!collapsed && (
          <div className="rounded-xl bg-surface-muted p-3 ring-1 ring-line">
            <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
              <span>Free plan</span>
              <span className="text-ink-tertiary">642 / 800 mins</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-accent-pink to-brand-500" />
            </div>
            <Link
              href="/settings"
              onClick={onNavigate}
              className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-pink to-brand-500 text-xs font-semibold text-white shadow-card hover:opacity-95"
            >
              <Zap className="size-3.5 fill-current" />
              Upgrade
            </Link>
          </div>
        )}
        <NavLink item={SETTINGS_NAV} collapsed={collapsed} onNavigate={onNavigate} />
        {collapsed && (
          <Tooltip content="Expand sidebar" side="right">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden h-9 w-full items-center justify-center rounded-lg text-ink-tertiary hover:bg-surface-hover hover:text-ink md:flex"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
