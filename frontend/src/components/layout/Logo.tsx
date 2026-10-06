"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/** Firefly mark: a gradient glyph in the brand's pink → violet colors. */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: the desktop sidebar and mobile drawer can both be mounted, and a
  // gradient id defined inside a display:none subtree can't be referenced by the other.
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#E82A73" />
          <stop offset="0.55" stopColor="#D444F1" />
          <stop offset="1" stopColor="#7A5AF8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M9 9h14v4.2H13.6v2.6h7.8V20h-7.8v3H9V9z" fill="#fff" />
    </svg>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      {!collapsed && (
        <span className="text-[17px] font-bold tracking-tight text-ink">
          fireflies<span className="text-brand-500">.ai</span>
        </span>
      )}
    </span>
  );
}
