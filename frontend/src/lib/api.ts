import type {
  ActionItem,
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
  Segment,
  Summary,
  Tag,
  Task,
  Transcript,
  User,
} from "./types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/$/,
  "",
);

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

async function request<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const isForm = rest.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}${toSearch(query)}`, {
    ...rest,
    headers: isForm ? headers : { "Content-Type": "application/json", ...headers },
  });
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
  me: () => request<User>("/users/me"),
  participants: () => request<Participant[]>("/participants"),
  channels: () => request<Channel[]>("/channels"),
  tags: () => request<Tag[]>("/tags"),

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
};
