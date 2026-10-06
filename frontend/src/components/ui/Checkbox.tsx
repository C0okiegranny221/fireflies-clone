"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof RadixCheckbox.Root>) {
  return (
    <RadixCheckbox.Root
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border border-line-strong bg-surface transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-100 data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500 data-[state=indeterminate]:border-brand-500 data-[state=indeterminate]:bg-brand-500",
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="text-white">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : (
          <Check className="size-3" strokeWidth={3} />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
