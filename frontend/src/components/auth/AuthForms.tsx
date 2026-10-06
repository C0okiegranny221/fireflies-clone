"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { safeNextPath } from "@/lib/auth";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-tertiary hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  );
}

/** After auth succeeds: drop any cached data from a previous session and enter the app. */
function useEnterApp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get("next"));
  return () => {
    queryClient.clear();
    router.replace(next);
  };
}

export function LoginForm() {
  const enterApp = useEnterApp();
  const autoDemo = useSearchParams().get("demo") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"form" | "demo" | null>(null);

  const signIn = async (mode: "form" | "demo", creds?: { email: string; password: string }) => {
    setError(null);
    setPending(mode);
    try {
      const c = creds ?? (mode === "demo" ? await api.auth.demo() : { email, password });
      await api.auth.login(c.email, c.password);
      enterApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in");
      setPending(null);
    }
  };

  // /login?demo=1 (the landing page's "Try the live demo") signs straight into the demo.
  const started = useRef(false);
  useEffect(() => {
    if (autoDemo && !started.current) {
      started.current = true;
      void signIn("demo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [autoDemo]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void signIn("form");
  };

  return (
    <div className="space-y-5">
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={() => signIn("demo")}
        disabled={pending !== null}
      >
        {pending === "demo" ? <Loader2 className="animate-spin" /> : <PlayCircle />}
        Try the demo account
      </Button>
      <div className="flex items-center gap-3 text-xs text-ink-tertiary">
        <span className="h-px flex-1 bg-line" />
        or log in with email
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus={!autoDemo}
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </Field>
        <ErrorMessage message={error} />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending !== null}
        >
          {pending === "form" && <Loader2 className="animate-spin" />}
          Log in
        </Button>
      </form>
      <p className="text-center text-sm text-ink-secondary">
        New to Fireflies?{" "}
        <Link href="/signup" className="font-semibold text-brand-text hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignupForm() {
  const enterApp = useEnterApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setPending(true);
    try {
      await api.auth.signup(name, email, password);
      enterApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the account");
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="signup-name">
          <Input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            required
            autoFocus
          />
        </Field>
        <Field label="Work email" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-text hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
