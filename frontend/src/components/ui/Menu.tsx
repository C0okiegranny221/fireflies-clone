"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Thin styling layer over Radix DropdownMenu, used for every "⋯" and dropdown menu. */
export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 animate-pop-in rounded-lg border border-line bg-surface p-1 shadow-pop",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  icon,
  children,
  danger,
  shortcut,
  className,
  ...props
}: ComponentProps<typeof DropdownMenu.Item> & {
  icon?: ReactNode;
  danger?: boolean;
  shortcut?: string;
}) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        danger
          ? "text-red-600 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/40"
          : "text-ink-secondary data-[highlighted]:bg-surface-hover data-[highlighted]:text-ink",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-ink-tertiary">{shortcut}</span>}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2.5 pt-2 pb-1 text-xs font-medium text-ink-tertiary">
      {children}
    </DropdownMenu.Label>
  );
}
