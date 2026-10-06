from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./fireflies.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    # Optional regex for extra origins, e.g. Vercel preview deployments: https://.*\.vercel\.app
    cors_origin_regex: str | None = None

    # --- Auth ------------------------------------------------------------------------
    session_days: int = 30
    # Send the session cookie only over HTTPS. Must be true in production.
    session_cookie_secure: bool = False
    # Password for the seeded demo account (shown on the login page as "Try the demo").
    demo_email: str = "alex@nimbus.io"
    demo_password: str = "fireflies-demo"
    login_attempts_per_hour_per_client: int = 20

    # --- AI provider -------------------------------------------------------------------
    # "none":   built-in heuristic summaries and keyword-retrieval answers (no network).
    # "openai": any OpenAI-compatible chat API: Groq (default URL), Ollama, OpenRouter…
    # "claude": Anthropic's API.
    llm_provider: Literal["none", "openai", "claude"] = "none"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str | None = None
    llm_model: str = "openai/gpt-oss-120b"
    llm_timeout_sec: float = 60

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"

    # Abuse protection for the public demo: beyond these, requests use the offline fallback.
    llm_requests_per_hour_per_client: int = 20
    llm_requests_per_day: int = 300


settings = Settings()
