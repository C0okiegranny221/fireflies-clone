import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const controlClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink shadow-card outline-none placeholder:text-ink-placeholder focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-surface-muted dark:focus:ring-brand-900/40";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-tertiary">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative block h-10", className)}>
      <select className={cn(controlClass, "h-full appearance-none pr-9")} {...props} />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-tertiary" />
    </span>
  );
}
