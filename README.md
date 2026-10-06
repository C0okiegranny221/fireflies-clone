# Fireflies.ai Clone

A full-stack clone of the Fireflies.ai meeting assistant: a meetings library, interactive transcripts synced to a media player, AI summaries and action items.

| Layer | Stack |
|---|---|
| Frontend | Next.js (App Router, TypeScript), Tailwind CSS, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite |

> Work in progress — the full architecture, schema and API docs are added as features land.

## Local setup

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload        # http://localhost:8000/docs
pytest
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                          # http://localhost:3000
```
