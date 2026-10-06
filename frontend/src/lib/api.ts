import type {
  ActionItem,
  AppInfo,
  AskResponse,
  ChatTurn,
  ActionItemCreate,
  ActionItemUpdate,
  Channel,
  MeetingCreate,
  MeetingDetail,
  MeetingListItem,
  MeetingQuery,
  MeetingUpdate,
  Page,
  Participant,
  SearchResult,
  Segment,
  Summary,
  Tag,
  Task,
  Transcript,
  User,
} from "./types";

// Same-origin path, proxied to the backend by next.config.ts rewrites (keeps the session
// cookie first-party).
const BASE_URL = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | (string | number)[] | undefined | null>;

function toSearch(params?: Query): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/** Called on any 401 outside the auth endpoints: the session is gone, so go log in again. */
function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/login")) return;
  const next = window.location.pathname + window.location.search;
  // A full page load (not router.push) on purpose: this runs outside React, and reloading
  // drops every cached query from the expired session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

async function request<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const isForm = rest.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}${toSearch(query)}`, {
    ...rest,
    headers: isForm ? headers : { "Content-Type": "application/json", ...headers },
  });
  if (res.status === 401 && !path.startsWith("/auth/")) redirectToLogin();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.detail === "string" ? body.detail : (body.detail?.[0]?.msg ?? message);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<User>("/auth/login", { method: "POST", body: json({ email, password }) }),
    signup: (name: string, email: string, password: string) =>
      request<User>("/auth/signup", { method: "POST", body: json({ name, email, password }) }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    demo: () => request<{ email: string; password: string }>("/auth/demo"),
    /** The logged-in user, or null (never redirects): for public pages like the landing. */
    session: () =>
      request<User>("/auth/me").catch((err) => {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }),
  },
  me: () => request<User>("/users/me"),
  participants: () => request<Participant[]>("/participants"),
  channels: () => request<Channel[]>("/channels"),
  tags: () => request<Tag[]>("/tags"),
  appInfo: () => request<AppInfo>("/app-info"),
  search: (q: string) =>
    request<{ query: string; results: SearchResult[] }>("/search", { query: { q } }),

  meetings: {
    list: (query: MeetingQuery = {}) =>
      request<Page<MeetingListItem>>("/meetings", { query: query as Query }),
    get: (id: number) => request<MeetingDetail>(`/meetings/${id}`),
    create: (body: MeetingCreate) =>
      request<MeetingDetail>("/meetings", { method: "POST", body: json(body) }),
    upload: (file: File, title?: string, channelId?: number | null) => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      if (channelId) form.append("channel_id", String(channelId));
      return request<MeetingDetail>("/meetings/upload", { method: "POST", body: form });
    },
    update: (id: number, body: MeetingUpdate) =>
      request<MeetingDetail>(`/meetings/${id}`, { method: "PATCH", body: json(body) }),
    remove: (id: number) => request<void>(`/meetings/${id}`, { method: "DELETE" }),
    transcript: (id: number, q?: string) =>
      request<Transcript>(`/meetings/${id}/transcript`, { query: { q } }),
    regenerateSummary: (id: number) =>
      request<Summary>(`/meetings/${id}/summary/regenerate`, { method: "POST" }),
    ask: (id: number, question: string, history: ChatTurn[]) =>
      request<AskResponse>(`/meetings/${id}/ask`, {
        method: "POST",
        body: json({ question, history }),
      }),
    /** Direct download URL (the API responds with Content-Disposition: attachment). */
    exportUrl: (id: number, format: "md" | "txt") =>
      `${BASE_URL}/meetings/${id}/export?format=${format}`,
  },

  segments: {
    update: (id: number, body: { text?: string; participant_id?: number }) =>
      request<Segment>(`/segments/${id}`, { method: "PATCH", body: json(body) }),
  },

  actionItems: {
    create: (meetingId: number, body: ActionItemCreate) =>
      request<ActionItem>(`/meetings/${meetingId}/action-items`, {
        method: "POST",
        body: json(body),
      }),
    update: (id: number, body: ActionItemUpdate) =>
      request<ActionItem>(`/action-items/${id}`, { method: "PATCH", body: json(body) }),
    remove: (id: number) => request<void>(`/action-items/${id}`, { method: "DELETE" }),
    tasks: (completed?: boolean) => request<Task[]>("/action-items", { query: { completed } }),
  },
};

/** TanStack Query keys, kept in one place so mutations invalidate the right caches. */
export const queryKeys = {
  me: ["me"] as const,
  participants: ["participants"] as const,
  channels: ["channels"] as const,
  tags: ["tags"] as const,
  meetings: ["meetings"] as const,
  meetingList: (q: MeetingQuery) => ["meetings", "list", q] as const,
  meetingPages: (q: MeetingQuery) => ["meetings", "pages", q] as const,
  meeting: (id: number) => ["meetings", "detail", id] as const,
  transcript: (id: number) => ["meetings", "transcript", id] as const,
  tasks: (completed?: boolean) => ["tasks", completed ?? "all"] as const,
  appInfo: ["app-info"] as const,
  search: (q: string) => ["search", q] as const,
};
