"use client";

import { useQuery } from "@tanstack/react-query";
import { Blocks, LogOut, Moon, Settings, Sun, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { api, queryKeys } from "@/lib/api";

import { comingSoon } from "./comingSoon";

export function ProfileMenu() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: me } = useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: Infinity });

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
          aria-label="Account menu"
        >
          {me ? (
            <Avatar name={me.name} color={me.avatar_color} />
          ) : (
            <span className="block size-8 animate-pulse rounded-full bg-surface-hover" />
          )}
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        {me && (
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={me.name} color={me.avatar_color} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{me.name}</p>
              <p className="truncate text-xs text-ink-tertiary">{me.email}</p>
            </div>
          </div>
        )}
        <MenuSeparator />
        <MenuItem icon={<Settings />} onSelect={() => router.push("/settings")}>
          Settings
        </MenuItem>
        <MenuItem icon={<Blocks />} onSelect={() => router.push("/integrations")}>
          Integrations
        </MenuItem>
        <MenuItem icon={<Users />} onSelect={() => comingSoon("Team management")}>
          Team
        </MenuItem>
        <MenuItem
          icon={theme === "dark" ? <Sun /> : <Moon />}
          onSelect={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<LogOut />} onSelect={() => comingSoon("Signing out")}>
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
