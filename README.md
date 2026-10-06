# Fireflies.ai Clone

A full-stack clone of the [Fireflies.ai](https://fireflies.ai) meeting assistant: a meetings library, a "Notepad" meeting page where the **transcript, audio player and AI notes stay in sync**, action items, global search and an AskFred chat that cites the transcript.

**Live demo:** _added after deployment_ · **Stack:** Next.js 16 (TypeScript) · FastAPI · SQLite

![Meeting notepad](docs/screenshots/notepad.png)

| Home | Meetings library |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Meetings](docs/screenshots/meetings.png) |
| **AskFred (Groq)** | **Global search** |
| ![AskFred](docs/screenshots/askfred.png) | ![Search](docs/screenshots/search.png) |
| **Tasks** | **New meeting (upload / paste / manual)** |
| ![Tasks](docs/screenshots/tasks.png) | ![New meeting](docs/screenshots/new-meeting.png) |

---

## Features

### Core (assignment requirements)
| Requirement | Where |
|---|---|
| Meetings list with title, date, duration, participants | `/meetings`: grouped by day, source icon, summary snippet, topics, action-item count, avatars |
| Search & filter (title, date, participant) + sort by recency | Debounced search; participant, date-range (presets + custom), duration, topic and source filters; 5 sort orders; **state lives in the URL** |
| Navbar with profile/settings | Fireflies sidebar + top bar (⌘K search, notifications, Capture menu, profile menu with dark mode) |
| Interactive transcript with speakers & timestamps | Speaker blocks with avatars; active line highlighted while playing |
| Media player with seek bar | Real audio for seeded meetings; play/pause, ±15s, speed, keyboard shortcuts, accessible seek slider showing *who spoke when* |
| Click transcript → seek, and vice versa | Click any line/timestamp/outline chapter/action item to seek; playback auto-scrolls the transcript (pauses when you scroll, with "Resume auto-scroll") |
| Search within transcript with highlights | Find bar with match count, next/previous (Enter / Shift+Enter); keyword chips search the transcript |
| AI summary, action items, outline/chapters | Overview, keywords, timestamped outline, action items grouped by assignee, speaker talk time |
| CRUD for meetings & action items, persisted | Create (upload `.txt/.vtt/.json`, paste, or form), edit title/participants/channel/topics, delete (with bulk actions); add/edit/assign/complete/delete action items (optimistic, with Undo) |
| Fireflies experience | Fireflies palette & layout, modals, toasts, empty/loading/error states, "Coming soon" pages for Integrations, live bot, sharing, analytics |

### Bonus
- **AskFred**: ask questions about a meeting; answers cite transcript lines that seek and play the audio. Uses Groq when configured, otherwise a keyword-retrieval fallback.
- **Global search** across every transcript (SQLite FTS5 with stemming, prefix matching, ranking and highlighted snippets), opening meetings at the matching moment.
- **Export** notes, action items and transcript as Markdown or plain text.
- **Topics/tags** with filtering, **Tasks** page across meetings, **Home** dashboard, **dark mode**, responsive down to phone width.
- **Deep links**: `/meetings/1?t=101000` opens a meeting at 1:41.

---

## Quick start

Requirements: Python 3.11+, Node 20+.

```bash
# Backend: http://localhost:8000 (interactive API docs at /docs)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # works as-is in offline mode
python -m app.seed.seed           # 7 demo meetings with audio, notes and action items
uvicorn app.main:app --reload

# Frontend: http://localhost:3000
cd frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

Sample transcripts to try the upload flow are linked from the upload dialog (`frontend/public/samples/`).

### AI modes
Every AI feature works without a key. Pick a provider in `backend/.env`:

| `LLM_PROVIDER` | What happens |
|---|---|
| `none` (default) | Offline heuristics: keyword-ranked summaries/outline/action items; AskFred quotes the most relevant transcript lines |
| `openai` | Any OpenAI-compatible API. Defaults to **Groq** (`openai/gpt-oss-120b`, free tier); set `LLM_BASE_URL=http://localhost:11434/v1` for Ollama |
| `claude` | Anthropic API via `ANTHROPIC_API_KEY` |

On a public deployment, LLM calls are capped per client (20/hour) and globally (300/day). Past the cap, or if the provider errors, requests quietly fall back to the offline mode, so the demo can't be used to drain an API quota.

### Tests & checks
```bash
cd backend  && pytest && ruff check app tests          # 32 API/service tests (no network, no keys)
cd frontend && npm test && npm run lint && npm run typecheck && npm run build
```

---

## Architecture

```mermaid
flowchart LR
  subgraph Browser["Next.js 16 (App Router, TypeScript)"]
    UI[Pages & components] --> RQ[TanStack Query cache]
    UI --> PP[PlayerProvider<br/>single playback clock]
    RQ --> API[Typed API client<br/>lib/api.ts]
  end
  API -- REST /api/v1 --> R
  subgraph Server["FastAPI"]
    R[Routers] --> S[Services]
    S --> ORM[SQLAlchemy 2.0]
    S --> LLM[LLM interface]
    LLM -->|OpenAI-compatible| G[(Groq / Ollama)]
    LLM -->|Anthropic SDK| C[(Claude)]
    LLM -.->|none / error / over budget| H[Offline heuristics]
  end
  ORM --> DB[(SQLite + FTS5)]
```

**Backend** (`backend/app/`): layered so each piece has one job.
- `routers/`: HTTP only (validation, status codes): meetings, transcripts, action items, AI & search, lookups.
- `services/`: domain logic, no HTTP:
  - `meeting_service` handles creation, participants, talk time and filtered queries.
  - `transcript_parser` reads WebVTT, JSON and text.
  - `summarizer` and `ask_service` produce notes and answers.
  - `search_service`, `export_service`.
  - `llm` is the provider interface; `rate_limit` is the LLM budget.
- `models/` and `schemas/`: SQLAlchemy tables and Pydantic request/response models, kept separate so the API shape isn't the storage shape.
- `seed/`: demo data (JSON) and `generate_audio.py`, which voiced the transcripts with macOS TTS and re-timed them to the audio.

**Frontend** (`frontend/src/`):
- `app/`: routes. Pages are thin; feature components do the work.
- `components/`: grouped by feature (`layout`, `meetings`, `notepad`, `tasks`, `search`, `home`) plus `ui/` primitives (Button, Modal, Menu, TokenInput…) built on Radix for accessibility.
- `hooks/`: URL-backed filter state, mutations with optimistic updates.
- `lib/`: the typed API client and query keys, formatting, and pure transcript helpers (`findActiveIndex` is a binary search over segment starts), which are unit-tested.

**Player ↔ transcript sync.** `PlayerProvider` is the single source of truth for playback time. With a recording it drives a hidden `<audio>` element; without one it runs a wall-clock timer, so seeking, speed and highlighting behave the same either way. Time and controls live in separate React contexts, so buttons and click handlers don't re-render ~10 times a second while playing.

---

## Database schema

```mermaid
erDiagram
  users ||--o{ meetings : hosts
  users |o--o{ participants : "is (optional)"
  channels |o--o{ meetings : contains
  meetings ||--o{ meeting_participants : has
  participants ||--o{ meeting_participants : attends
  meetings ||--o{ transcript_segments : has
  participants ||--o{ transcript_segments : speaks
  meetings ||--o| summaries : has
  summaries ||--o{ chapters : outlines
  meetings ||--o{ action_items : has
  participants |o--o{ action_items : "assigned to"
  meetings }o--o{ tags : "meeting_tags"

  meetings {
    int id PK
    string title
    datetime started_at "indexed, UTC"
    int duration_sec
    enum source "notetaker | upload | manual"
    string media_url "nullable"
    int host_id FK
    int channel_id FK "nullable"
  }
  meeting_participants {
    int meeting_id PK, FK
    int participant_id PK, FK
    enum role "host | attendee"
    int talk_time_sec "derived from segments"
    int position
  }
  transcript_segments {
    int id PK
    int meeting_id FK "index (meeting_id, start_ms)"
    int participant_id FK
    int start_ms
    int end_ms
    text text "indexed by transcript_fts"
  }
  summaries {
    int id PK
    int meeting_id FK "unique: one per meeting"
    text overview
    json keywords
    enum generated_by "seed | llm | heuristic"
    string model "e.g. Groq · openai/gpt-oss-120b"
  }
  chapters {
    int id PK
    int summary_id FK
    string title
    int start_ms
    json bullets
  }
  action_items {
    int id PK
    int meeting_id FK
    int assignee_id FK "nullable"
    text text
    bool is_completed
    date due_date
    int start_ms "where it was said"
  }
```

Design notes:
- **People vs users.** `participants` is separate from `users` because most speakers (customers, candidates) aren't workspace members. `participants.user_id` links the two when they are. Per-meeting facts (role, talk time) live on the `meeting_participants` association, not on either side.
- **Integrity in the database.** Foreign keys are enforced (`PRAGMA foreign_keys=ON`). Every child of a meeting uses `ON DELETE CASCADE`, so deleting a meeting is one statement. Speakers can't be deleted while they have transcript lines (`RESTRICT`). Removing an assignee unassigns their tasks (`SET NULL`).
- **Times in milliseconds** for transcript, chapter and action-item positions, so they map directly onto the player. All datetimes are stored as naive UTC; inputs with an offset are converted.
- **Full-text search.** `transcript_fts` is an FTS5 *external-content* table: it holds only the index and reads text from `transcript_segments`. Triggers keep it in sync on insert, update and delete, including cascaded deletes. It's created by a startup hook, so existing databases get it too.
- **Indexes** match the queries: `(meeting_id, start_ms)` for transcripts, `started_at` for the library sort, plus foreign-key and `is_completed` indexes for filters and Tasks.

---

## API overview

Base URL `/api/v1`. Interactive OpenAPI docs are at `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/meetings` | List with `q`, `participant_id` (repeatable, all must attend), `date_from`, `date_to`, `min_duration`/`max_duration` (min), `channel_id`, `tag`, `source`, `host_id`, `sort`, `page`, `page_size` |
| POST | `/meetings` | Create from a form, optionally with pasted transcript text (notes are generated) |
| POST | `/meetings/upload` | Multipart upload of `.txt` / `.vtt` / `.json` (≤ 2 MB) → parse → persist → summarize |
| GET / PATCH / DELETE | `/meetings/{id}` | Detail (participants, summary, action items) / edit title, participants, channel, tags / delete (cascades) |
| GET | `/meetings/{id}/transcript?q=` | Segments, plus ids of segments matching `q` |
| PATCH | `/segments/{id}` | Edit text or reassign speaker (talk time recomputed) |
| GET | `/meetings/{id}/summary` | AI notes |
| POST | `/meetings/{id}/summary/regenerate` | Rebuild notes (keeps user-edited action items) |
| GET / POST | `/meetings/{id}/action-items` | List / create |
| PATCH / DELETE | `/action-items/{id}` | Edit text, assignee, due date, completion / delete |
| GET | `/action-items?completed=` | All tasks across meetings (Tasks page) |
| POST | `/meetings/{id}/ask` | AskFred: `{question, history}` → `{answer, citations[], source, model}` |
| GET | `/search?q=` | Meetings matching title/people/topics plus FTS transcript hits with snippets |
| GET | `/meetings/{id}/export?format=md\|txt` | Download notes + transcript |
| GET | `/users/me`, `/participants`, `/channels`, `/tags`, `/app-info`, `/health` | Lookups, active AI mode, health check |

Errors use FastAPI's `{"detail": ...}` shape with meaningful status codes: 404 for unknown ids, 409 when regenerating notes for a meeting without a transcript, 413 for oversized uploads, 415 for unsupported file types, and 422 for validation or parse errors such as "Segment 0 is missing 'text'".

---

## Assumptions & scope

- **No real authentication.** One default logged-in user (Alex Rivera) is seeded; the profile menu's "Log out" is a placeholder.
- **No speech-to-text.** Meetings come from transcripts. The seeded meetings' audio was generated with text-to-speech so the player has something real to play. Uploaded transcripts have no recording, so the player runs on a timer.
- **Placeholders ("Coming soon")** cover the live meeting bot, calendar sync, integrations, sharing and teams, AI Skills, Analytics, Voice Agents and cross-meeting AskFred.
- **The offline summarizer is heuristic** (keyword frequency, sentence scoring, commitment phrases such as "I'll…"). It's good enough to demo but can flag non-tasks. LLM mode is clearly better and records the model on each summary.
- **SQLite** per the brief. On Render's free tier the file is ephemeral and the demo data re-seeds after a restart; attach a persistent disk to keep data (see `render.yaml`).
- **Brand.** The UI recreates Fireflies' layout, palette (violet `#7A5AF8`, Untitled-UI greys) and Inter type for this assignment, but uses its own logo mark and letter tiles instead of third-party logos.

## Deployment

- **Backend → Render:** `render.yaml` blueprint. It seeds demo data on first boot and reads `CORS_ORIGINS` and `LLM_API_KEY` from the dashboard; secrets never go in git.
- **Frontend → Vercel:** root directory `frontend`, env `NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com/api/v1`.
- Free Render instances sleep when idle, so the first request after a pause can take up to a minute while the API wakes.
