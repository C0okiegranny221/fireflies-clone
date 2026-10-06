/**
 * Where to send the user after signing in. Only same-site absolute paths are allowed, so
 * a crafted /login?next=https://evil.example can't turn the login page into an open redirect.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/home"): string {
  if (!raw || !raw.startsWith("/")) return fallback;
  // "//host" and "/\host" are protocol-relative URLs to another site in browsers.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
