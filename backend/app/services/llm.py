"""
Provider-agnostic LLM access. Features (summaries, AskFred) depend on `LLMClient`, not a
vendor: Claude, or any OpenAI-compatible API (Groq, Ollama, OpenRouter) selected by config.

Every call returns a validated Pydantic object or raises `LLMError`; callers fall back to
the offline heuristics on error, so a flaky or rate-limited provider never breaks the app.
"""

import json
import logging
from functools import lru_cache
from typing import Protocol, TypeVar

import anthropic
import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    pass


class LLMClient(Protocol):
    @property
    def label(self) -> str:
        """Human-readable provider/model, shown in the UI (e.g. "Groq · llama-3.3-70b")."""
        ...

    def complete_json(self, system: str, user: str, schema: type[T]) -> T: ...


class OpenAICompatibleClient:
    """Chat Completions over HTTP, with JSON mode and Pydantic validation of the reply."""

    def __init__(
        self,
        base_url: str,
        api_key: str | None,
        model: str,
        timeout: float = 60,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.model = model
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"), headers=headers, timeout=timeout, transport=transport
        )
        host = httpx.URL(base_url).host
        provider = (
            "Groq" if "groq" in host else "Ollama" if host in {"localhost", "127.0.0.1"} else host
        )
        self.label = f"{provider} · {model}"

    def complete_json(self, system: str, user: str, schema: type[T]) -> T:
        # JSON mode guarantees syntactically valid JSON; the schema in the prompt plus
        # Pydantic validation guarantee the shape.
        instructions = (
            f"{system}\n\nRespond with a single JSON object that matches this JSON Schema, "
            f"with no other text:\n{json.dumps(schema.model_json_schema())}"
        )
        try:
            res = self._http.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": instructions},
                        {"role": "user", "content": user},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                    "max_tokens": 4096,
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return schema.model_validate_json(content)
        except httpx.HTTPStatusError as exc:
            raise LLMError(f"{self.label} returned HTTP {exc.response.status_code}") from exc
        except (httpx.HTTPError, KeyError, IndexError, ValueError, ValidationError) as exc:
            raise LLMError(f"{self.label} request failed: {exc}") from exc


class ClaudeClient:
    """Anthropic Messages API with structured output parsed straight into the schema."""

    def __init__(self, api_key: str, model: str) -> None:
        self._client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.label = f"Claude · {model}"

    def complete_json(self, system: str, user: str, schema: type[T]) -> T:
        try:
            response = self._client.messages.parse(
                model=self.model,
                max_tokens=16000,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_format=schema,
            )
        except (anthropic.APIError, ValidationError) as exc:
            raise LLMError(f"Claude request failed: {exc}") from exc
        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise LLMError(f"Claude returned no output (stop_reason={response.stop_reason})")
        return response.parsed_output


@lru_cache(maxsize=1)
def get_llm() -> LLMClient | None:
    """The configured client, or None when AI is disabled or not configured."""
    if settings.llm_provider == "openai":
        return OpenAICompatibleClient(
            settings.llm_base_url,
            settings.llm_api_key,
            settings.llm_model,
            timeout=settings.llm_timeout_sec,
        )
    if settings.llm_provider == "claude" and settings.anthropic_api_key:
        return ClaudeClient(settings.anthropic_api_key, settings.anthropic_model)
    if settings.llm_provider != "none":
        log.warning(
            "LLM provider %r is missing its API key; using offline mode", settings.llm_provider
        )
    return None
