"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUp, Loader2, PlayCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { api, queryKeys } from "@/lib/api";
import { formatClock } from "@/lib/format";
import type { AskResponse, ChatTurn } from "@/lib/types";
import { cn } from "@/lib/utils";

import { usePlayerControls } from "./PlayerProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
  response?: AskResponse;
  error?: boolean;
}

const SUGGESTIONS = [
  "What decisions were made?",
  "What are the next steps?",
  "Were there any risks or concerns?",
  "What did we say about the timeline?",
];

function Citations({ response }: { response: AskResponse }) {
  const { seek, play } = usePlayerControls();
  if (response.citations.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {response.citations.map((c) => (
        <li key={c.segment_id}>
          <button
            type="button"
            onClick={() => {
              seek(c.start_ms);
              play();
            }}
            className="group w-full rounded-lg border border-line bg-surface px-3 py-2 text-left hover:border-brand-200 hover:bg-brand-25 dark:hover:border-brand-800 dark:hover:bg-surface-hover"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <PlayCircle className="size-3.5 text-brand-500" />
              {c.speaker}
              <span className="font-medium text-brand-text tabular-nums">
                {formatClock(c.start_ms / 1000)}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-3 block text-xs leading-5 text-ink-secondary">
              {c.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** AskFred: chat about this meeting; answers cite transcript lines that seek the player. */
export function AskFredPanel({
  meetingId,
  onClose,
  className,
}: {
  meetingId: number;
  onClose: () => void;
  className?: string;
}) {
  const { data: info } = useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: api.appInfo,
    staleTime: Infinity,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: ({ question, history }: { question: string; history: ChatTurn[] }) =>
      api.meetings.ask(meetingId, question, history),
    onSuccess: (response) =>
      setMessages((m) => [...m, { role: "assistant", content: response.answer, response }]),
    onError: (err) =>
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Sorry, I couldn't answer that (${err.message}).`,
          error: true,
        },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  const send = (question: string) => {
    const q = question.trim();
    if (!q || ask.isPending) return;
    const history: ChatTurn[] = messages
      .filter((m) => !m.error)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setDraft("");
    ask.mutate({ question: q, history });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <aside
      aria-label="AskFred"
      className={cn("flex h-full min-h-0 flex-col border-l border-line bg-surface", className)}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-pink to-brand-500 text-white">
          <Sparkles className="size-3.5" />
        </span>
        <h2 className="text-sm font-semibold text-ink">AskFred</h2>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-lg p-1.5 text-ink-tertiary hover:bg-surface-hover hover:text-ink"
          aria-label="Close AskFred"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-ink-secondary">
              Ask anything about this meeting. Answers link to the moments they come from.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-line px-3 py-2 text-left text-sm text-ink-secondary hover:border-brand-200 hover:bg-brand-soft hover:text-brand-text dark:hover:border-brand-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2 text-sm text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              <p
                className={cn(
                  "text-sm leading-6 whitespace-pre-line",
                  m.error ? "text-red-600 dark:text-red-400" : "text-ink",
                )}
              >
                {m.content}
              </p>
              {m.response && <Citations response={m.response} />}
            </div>
          ),
        )}
        {ask.isPending && (
          <p className="flex items-center gap-2 text-sm text-ink-tertiary">
            <Loader2 className="size-4 animate-spin" />
            Fred is reading the transcript…
          </p>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/40">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="Ask about this meeting"
            aria-label="Ask a question about this meeting"
            className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
          />
          <button
            type="submit"
            disabled={!draft.trim() || ask.isPending}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-tertiary">
          {info?.ai_enabled
            ? `Answers by ${info.ai_model}. Check important details in the transcript.`
            : "Offline mode: answers quote the most relevant transcript lines."}
        </p>
      </form>
    </aside>
  );
}
