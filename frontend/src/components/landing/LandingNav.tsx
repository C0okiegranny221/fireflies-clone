"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { buttonVariants } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Product" },
  { href: "#capture", label: "Capture" },
  { href: "#search", label: "AskFred" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  // Signed-in visitors get a shortcut into the app instead of Log in / Sign up.
  const { data: user } = useQuery({
    queryKey: ["session"],
    queryFn: api.auth.session,
    staleTime: 60_000,
    retry: false,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="Fireflies home">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-6 text-sm font-medium text-ink-secondary md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link href="/home" className={buttonVariants({ variant: "primary" })}>
              Go to app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
              >
                Log in
              </Link>
              <Link href="/signup" className={buttonVariants({ variant: "primary" })}>
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
