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

from app.main import app  # noqa: E402
from app.seed.seed import reset_and_seed  # noqa: E402


@pytest.fixture
def client() -> Iterator[TestClient]:
    reset_and_seed()
    with TestClient(app) as c:
        yield c
