import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

# Point the app at a throwaway database and force offline AI before it is imported.
# Environment variables beat backend/.env, so a developer's real key is never used here.
_db_path = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["LLM_PROVIDER"] = "none"
os.environ["LLM_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.seed.seed import reset_and_seed  # noqa: E402
from app.services.rate_limit import RateBudget  # noqa: E402


@pytest.fixture
def anon_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """A fresh database and a client with no session."""
    reset_and_seed()
    # Every test logs in from the same "IP"; give each test its own login budget.
    monkeypatch.setattr(auth_router, "login_budget", RateBudget(20, 100_000))
    with TestClient(app) as c:
        yield c


@pytest.fixture
def client(anon_client: TestClient) -> TestClient:
    """Logged in as the seeded demo user (the session cookie is kept by the client)."""
    res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": settings.demo_email, "password": settings.demo_password},
    )
    assert res.status_code == 200, res.text
    return anon_client
