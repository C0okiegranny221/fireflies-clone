import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard: only checks that a session cookie exists (no backend call per
 * request). The API is the real authority: an expired or revoked session gets a 401 there,
 * and the client then redirects to /login (see lib/api.ts).
 */
const SESSION_COOKIE = "ff_session";
const AUTH_PAGES = ["/login", "/signup"];
const APP_PAGES = [
  "/home",
  "/meetings",
  "/tasks",
  "/search",
  "/askfred",
  "/ai-skills",
  "/analytics",
  "/voice-agents",
  "/integrations",
  "/settings",
];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && matches(pathname, APP_PAGES)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (hasSession && matches(pathname, AUTH_PAGES)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip the API proxy, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|audio|samples|landing|favicon.ico).*)"],
};
