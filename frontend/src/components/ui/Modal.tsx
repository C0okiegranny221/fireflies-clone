"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-gray-950/50 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-pop-in flex-col rounded-2xl border border-line bg-surface shadow-pop outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-secondary">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 rounded-lg p-2 text-ink-tertiary hover:bg-surface-hover hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {children && <div className="min-h-0 overflow-y-auto px-6 py-4">{children}</div>}
          {footer && (
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
