# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Fireflies.ai clone (SDE assignment): Next.js 16 frontend in `frontend/`, FastAPI + SQLite backend in `backend/`. The root `README.md` has the full feature list, ER diagram and API table.

## Commands

Backend (run from `backend/`, venv at `backend/.venv`):
```bash
.venv/bin/uvicorn app.main:app --reload --port 8000    # API; docs at /docs. Use --reload: a stale server misses new response fields
.venv/bin/python -m app.seed.seed                      # drop + recreate DB (incl. FTS index) + seed 7 meetings
.venv/bin/pytest -q                                    # all tests
.venv/bin/pytest tests/test_api.py::test_filters -q    # single test (fixtures: `client` is logged in as the demo user, `anon_client` isn't)
.venv/bin/ruff check app tests && .venv/bin/ruff format app tests
.venv/bin/python -m app.seed.generate_audio [01 03]    # regenerate seed audio (macOS `say` + ffmpeg); rewrites seed JSON timestamps
```
Install with `pip install -r requirements-dev.txt` (`requirements.txt` is runtime-only, used by Render).

Frontend (run from `frontend/`):
```bash
npm run dev            # http://localhost:3000; /api/v1/* is proxied to BACKEND_URL (default http://localhost:8000)
npm test               # vitest; single file: npx vitest run src/lib/transcript.test.ts -t "findActiveIndex"
npm run lint && npm run typecheck && npm run build
npm run format         # prettier + tailwind class sorting
npx next typegen       # regenerate route types after adding a route (PageProps<"/path"> / LayoutProps)
```

**Next.js 16 differs from older versions** (`frontend/AGENTS.md`): read `frontend/node_modules/next/dist/docs/` before using Next APIs. Notably `params`/`searchParams` are Promises, and components using `useSearchParams` must sit inside `<Suspense>`.

## Architecture

### Backend (`backend/app/`)
- `routers/` handle HTTP only. `services/` hold the domain logic, `models/` the SQLAlchemy tables and `schemas/` the Pydantic I/O; storage and API shapes deliberately differ. `serializers.py` flattens ORM objects where they diverge (e.g. `MeetingParticipant` + `Participant` → one participant object).
- `deps.py` provides `DbSession`, `CurrentUser` (from the `ff_session` cookie), `MeetingDep` (eager-loaded meeting or 404) and `LLMDep`. `main.py` mounts every router except `auth` with `dependencies=[Depends(current_user)]`.
- **Auth** (`services/auth_service.py`, `routers/auth.py`): scrypt password hashes; server-side `sessions` rows store only the SHA-256 of the cookie token. A 401 from `current_user` also expires a dead cookie; this matters because the frontend guard only checks that the cookie exists (otherwise /login ↔ /home loops). All users share one workspace. The demo account comes from `DEMO_EMAIL`/`DEMO_PASSWORD` settings and is exposed at `/auth/demo`.
- **Meeting creation pipeline** (`services/meeting_service.create_meeting`): `transcript_parser.parse_transcript` (.vtt/.json/.txt → `ParsedSegment`s; untimed text gets estimated times) → participants resolved case-insensitively by name → segments + talk time → `summarizer.summarize` → summary, chapters and action items. Seed data, upload, paste and form creation all go through it.
- **AI layer** (`services/llm.py`): features depend on the `LLMClient` protocol (`complete_json(system, user, schema)` returns a validated Pydantic object or raises `LLMError`). `LLM_PROVIDER` is `none` | `openai` (any OpenAI-compatible API; Groq by default, Ollama via base URL) | `claude`. Every AI feature has an offline fallback: `summarizer.summarize_heuristic` and `ask_service._ask_retrieval`. `LLMAccess.client()` spends the per-client/daily budget (`services/rate_limit.py`) lazily, only when a handler actually calls the model; over budget it returns `None`, which means "use the fallback".
- **Full-text search**: `transcript_fts` is an FTS5 external-content table that is *not* in SQLAlchemy metadata. It's created by `search_index.ensure_search_index` (app lifespan and seed) and kept in sync by SQLite triggers. `reset_and_seed` must call `drop_search_index` before `drop_all`, or the index goes stale.
- **SQLite specifics**: `PRAGMA foreign_keys=ON` is set per connection in `db.py`, and deletes rely on DB-level `ON DELETE CASCADE` (relationships use `passive_deletes=True`). Datetimes are stored as naive UTC; `MeetingCreate` converts offset-aware input. Transcript, chapter and action-item positions are milliseconds.
- **Tests**: `tests/conftest.py` points `DATABASE_URL` at a temp file and forces `LLM_PROVIDER=none` *before importing the app*, so a developer's `backend/.env` key is never used. The `client` fixture reseeds per test. LLM paths are tested with a fake client (`test_ai.FakeLLM`, patched into `deps.get_llm`) and `httpx.MockTransport`.

### Frontend (`frontend/src/`)
- **Routing & auth**: `/` is the public landing page (`components/landing/`) and `/login` and `/signup` are public. App pages live in the `app/(app)/` route group, whose layout adds `AppShell`. `src/proxy.ts` (Next 16's renamed middleware) optimistically redirects by cookie presence. `next.config.ts` rewrites `/api/v1/*` to `BACKEND_URL`, so the browser only ever calls its own origin and the HttpOnly session cookie is first-party. `lib/api.ts` redirects to `/login?next=` on any 401, and `lib/auth.safeNextPath` guards against open redirects.
- Data fetching is client-side with TanStack Query. `lib/api.ts` holds the typed client plus `queryKeys`, so mutations invalidate by key (`["meetings", ...]`, `["tasks", ...]`). `lib/types.ts` mirrors the backend schemas and must be updated alongside them.
- **Meeting page (`components/notepad/`)**: `PlayerProvider` is the single playback clock. It drives a hidden `<audio>` when `media_url` exists and otherwise a wall-clock timer. Time and controls are separate contexts (`usePlayerTime` vs `usePlayerControls`), so only time readers re-render while playing; controls read position from a ref. `TranscriptPanel` finds the active line with `lib/transcript.findActiveIndex` (binary search) and auto-scrolls until the user scrolls manually. `MeetingView` keys the provider by `${id}:${startMs}`, and `?t=<ms>` deep-links a start position.
- **Meetings library**: filter state lives in the URL (`hooks/useMeetingFilters.ts`: parse/serialize ↔ `toMeetingQuery`), so the page is wrapped in `<Suspense>`.
- Optimistic mutations: `hooks/useActionItemMutations` (patches the cached meeting, Undo on delete) and `hooks/useToggleTask` (Tasks + Home).
- App-wide UI state (the New meeting modal opened from Capture, Upload and empty states) lives in `components/providers/AppUIProvider`. The modal is mounted once in `AppShell`.
- Theme: a `.dark` class on `<html>`, set before paint by `themeInitScript` in the root layout and read with `useSyncExternalStore`. Colors are semantic CSS variables in `app/globals.css` (`bg-surface`, `text-ink-secondary`, `brand-*` violet scale). Use those, not raw grays, so dark mode works.

### Seed data & audio
`backend/app/seed/data/*.json` hold hand-written meetings: transcript rows `[start "m:ss.s", speaker, text]`, a summary with chapters, action items, and `media`/`duration` for generated audio in `frontend/public/audio/`. Changing transcript text desynchronises the audio; rerun `generate_audio` for that file, which re-times segments and remaps chapter/action-item times.

## Deployment & config
- Backend: Render via `render.yaml`, auto-deploys on push to `main`. Free tier means no persistent disk, so SQLite re-seeds on restart (`seed --if-empty`). Secrets (`LLM_API_KEY`, `CORS_ORIGINS`) live in the Render dashboard; `CORS_ORIGIN_REGEX` admits `fireflies-clone*.vercel.app`.
- Frontend: Vercel project `fireflies-clone`, **not git-connected**. Deploy with `npx vercel deploy --prod` from `frontend/`. `BACKEND_URL` (used by the rewrite at build time) is set in Vercel.
- Local AI keys go in `backend/.env` (gitignored). `backend/.env.example` is the tracked template and must stay blank.
