"use client";

import { Menu as MenuIcon, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

import { CaptureMenu } from "./CaptureMenu";
import { comingSoon } from "./comingSoon";
import { NotificationsPopover } from "./NotificationsPopover";
import { ProfileMenu } from "./ProfileMenu";

function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // ⌘K / Ctrl+K focuses search from anywhere, like Fireflies.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 md:max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-placeholder" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search meetings, people & topics"
        aria-label="Search across all meetings"
        className="h-9 w-full rounded-lg border border-line bg-surface-muted pr-14 pl-9 text-sm text-ink shadow-card outline-none placeholder:text-ink-placeholder focus:border-brand-300 focus:bg-surface focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-tertiary sm:block">
        ⌘K
      </kbd>
    </form>
  );
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-hover md:hidden"
        aria-label="Open navigation"
      >
        <MenuIcon className="size-5" />
      </button>
      <GlobalSearch />
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <NotificationsPopover />
        <Button
          variant="secondary"
          className="hidden lg:inline-flex"
          onClick={() => comingSoon("Inviting teammates")}
        >
          <UserPlus />
          Invite
        </Button>
        <CaptureMenu />
        <div className="ml-1">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
