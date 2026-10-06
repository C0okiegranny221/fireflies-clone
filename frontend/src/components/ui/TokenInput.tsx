"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { controlClass } from "./Field";

/**
 * Free-text chips input (participants, tags). Enter or comma adds a token, Backspace on an
 * empty input removes the last one; `suggestions` power a native autocomplete list.
 */
export function TokenInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
  renderToken,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  renderToken?: (token: string) => React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const token = raw.trim().replace(/,$/, "").trim();
    if (!token) return;
    if (!value.some((v) => v.toLowerCase() === token.toLowerCase())) onChange([...value, token]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        controlClass,
        "flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100",
      )}
    >
      {value.map((token) => (
        <span
          key={token}
          className="inline-flex items-center gap-1 rounded-md bg-surface-hover py-0.5 pr-1 pl-2 text-xs font-medium text-ink-secondary"
        >
          {renderToken ? renderToken(token) : token}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== token))}
            className="rounded p-0.5 text-ink-tertiary hover:bg-line hover:text-ink"
            aria-label={`Remove ${token}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        onChange={(e) => {
          // Picking an option from the datalist fires a plain change event with the full value.
          const next = e.target.value;
          if (suggestions.includes(next)) add(next);
          else setDraft(next);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="h-7 min-w-28 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-placeholder"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
