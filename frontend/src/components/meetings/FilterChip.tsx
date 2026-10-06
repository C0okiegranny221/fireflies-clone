"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A toolbar filter: shows its current value and opens a popover to change it. */
export function FilterChip({
  label,
  value,
  onClear,
  children,
  contentClassName,
}: {
  label: string;
  value?: string | null;
  onClear?: () => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  const active = Boolean(value);
  return (
    <Popover.Root>
      <div
        className={cn(
          "inline-flex h-8 items-center rounded-lg border text-sm font-medium shadow-card transition-colors",
          active
            ? "border-brand-200 bg-brand-soft text-brand-text dark:border-brand-800"
            : "border-line-strong bg-surface text-ink-secondary hover:bg-surface-hover",
        )}
      >
        <Popover.Trigger className="flex h-full items-center gap-1.5 rounded-lg pr-2 pl-3 outline-none focus-visible:ring-4 focus-visible:ring-brand-100">
          <span className={cn(active && "text-brand-text/70")}>{label}</span>
          {active && <span className="max-w-40 truncate font-semibold">{value}</span>}
          {!active && <ChevronDown className="size-3.5 opacity-70" />}
        </Popover.Trigger>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mr-1 rounded p-0.5 hover:bg-brand-soft-hover"
            aria-label={`Clear ${label} filter`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-64 animate-pop-in rounded-xl border border-line bg-surface p-2 shadow-pop",
            contentClassName,
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Single-choice option row used inside filter popovers. */
export function FilterOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Popover.Close asChild>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm",
          selected
            ? "bg-brand-soft font-semibold text-brand-text"
            : "text-ink-secondary hover:bg-surface-hover hover:text-ink",
        )}
      >
        {children}
      </button>
    </Popover.Close>
  );
}
