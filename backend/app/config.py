from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./fireflies.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5-5"


settings = Settings()
