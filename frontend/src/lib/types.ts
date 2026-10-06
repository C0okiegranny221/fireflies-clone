// Mirrors the FastAPI response/request schemas in backend/app/schemas.

export type MeetingSource = "notetaker" | "upload" | "manual";
export type ParticipantRole = "host" | "attendee";
export type SummarySource = "seed" | "llm" | "heuristic";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
}

export interface Participant {
  id: number;
  name: string;
  email: string | null;
  color: string;
}

export interface MeetingParticipant extends Participant {
  role: ParticipantRole;
  talk_time_sec: number;
}

export interface Channel {
  id: number;
  name: string;
  is_private: boolean;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Chapter {
  id: number;
  title: string;
  start_ms: number;
  bullets: string[];
}

export interface Summary {
  overview: string;
  keywords: string[];
  generated_by: SummarySource;
  /** Provider/model for LLM summaries, e.g. "Groq · llama-3.3-70b-versatile". */
  model: string | null;
  chapters: Chapter[];
  updated_at: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  is_completed: boolean;
  due_date: string | null;
  start_ms: number | null;
  assignee: Participant | null;
  created_at: string;
}

export interface Task extends ActionItem {
  meeting_title: string;
  meeting_started_at: string;
}

export interface MeetingListItem {
  id: number;
  title: string;
  started_at: string;
  duration_sec: number;
  source: MeetingSource;
  host: User;
  channel: Channel | null;
  participants: MeetingParticipant[];
  tags: Tag[];
  overview: string | null;
  action_item_count: number;
}

export interface MeetingDetail extends MeetingListItem {
  media_url: string | null;
  summary: Summary | null;
  action_items: ActionItem[];
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: number;
  participant_id: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Transcript {
  meeting_id: number;
  segments: Segment[];
  match_segment_ids: number[];
}

export interface TranscriptHit {
  segment_id: number;
  start_ms: number;
  speaker: string;
  /** Excerpt with matches wrapped in [[ ]]. */
  snippet: string;
}

export interface SearchResult {
  meeting_id: number;
  title: string;
  started_at: string;
  duration_sec: number;
  matched_meeting: boolean;
  hits: TranscriptHit[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Citation {
  segment_id: number;
  start_ms: number;
  speaker: string;
  text: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  source: "llm" | "retrieval";
  model: string | null;
}

export interface AppInfo {
  ai_enabled: boolean;
  ai_model: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type MeetingSort = "-started_at" | "started_at" | "title" | "-duration" | "duration";

export interface MeetingQuery {
  q?: string;
  participant_id?: number[];
  date_from?: string;
  date_to?: string;
  min_duration?: number;
  max_duration?: number;
  channel_id?: number;
  tag?: string;
  source?: MeetingSource;
  host_id?: number;
  sort?: MeetingSort;
  page?: number;
  page_size?: number;
}

export interface MeetingCreate {
  title: string;
  started_at?: string;
  duration_sec?: number;
  participants?: string[];
  transcript_text?: string;
  channel_id?: number | null;
  tags?: string[];
}

export interface MeetingUpdate {
  title?: string;
  participants?: string[];
  channel_id?: number | null;
  tags?: string[];
}

export interface ActionItemCreate {
  text: string;
  assignee_id?: number | null;
  due_date?: string | null;
  start_ms?: number | null;
}

export interface ActionItemUpdate {
  text?: string;
  assignee_id?: number | null;
  due_date?: string | null;
  is_completed?: boolean;
}
