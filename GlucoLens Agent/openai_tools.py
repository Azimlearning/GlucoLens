"""
OpenAI client wrapper with retry, timeout, and JSON-parse helpers.

Used by all agents that need chat completions or vision input.
"""
import json
import re
import time
from typing import Any, Optional

from openai import OpenAI, APIError, RateLimitError, APITimeoutError

from backend.config import settings
from backend.utils.logging import agent_logger

log = agent_logger("openai")

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_S)
    return _client


# ---------------------------------------------------------------------------
# Core completion helpers
# ---------------------------------------------------------------------------

def chat_completion(
    system: str,
    user: str,
    *,
    temperature: Optional[float] = None,
    model: Optional[str] = None,
    max_retries: int = 3,
    response_format_json: bool = False,
) -> str:
    """Single-turn chat completion. Returns the assistant message content."""
    temp = temperature if temperature is not None else settings.OPENAI_TEMPERATURE
    mdl = model or settings.OPENAI_MODEL
    client = _get_client()
    kwargs: dict[str, Any] = {
        "model": mdl,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temp,
    }
    if response_format_json:
        kwargs["response_format"] = {"type": "json_object"}

    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""
        except (RateLimitError, APITimeoutError) as e:
            wait = 2 ** attempt
            log.warning("openai_retry", attempt=attempt + 1, wait_s=wait, error=str(e))
            time.sleep(wait)
        except APIError as e:
            log.error("openai_api_error", attempt=attempt + 1, error=str(e))
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
    raise RuntimeError("OpenAI chat_completion failed after retries")


def vision_completion(
    system: str,
    user_text: str,
    image_base64: str,
    *,
    temperature: Optional[float] = None,
    model: Optional[str] = None,
    max_retries: int = 3,
    response_format_json: bool = True,
) -> str:
    """Vision (image + text) completion. Returns the assistant message content."""
    temp = temperature if temperature is not None else settings.OPENAI_TEMPERATURE
    mdl = model or settings.OPENAI_VISION_MODEL
    client = _get_client()
    image_url = (
        image_base64 if image_base64.startswith("data:")
        else f"data:image/jpeg;base64,{image_base64}"
    )
    kwargs: dict[str, Any] = {
        "model": mdl,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]},
        ],
        "temperature": temp,
    }
    if response_format_json:
        kwargs["response_format"] = {"type": "json_object"}

    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""
        except (RateLimitError, APITimeoutError) as e:
            wait = 2 ** attempt
            log.warning("openai_vision_retry", attempt=attempt + 1, wait_s=wait, error=str(e))
            time.sleep(wait)
        except APIError as e:
            log.error("openai_vision_error", attempt=attempt + 1, error=str(e))
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
    raise RuntimeError("OpenAI vision_completion failed after retries")


# ---------------------------------------------------------------------------
# JSON parsing helpers (LLMs sometimes wrap JSON in markdown fences)
# ---------------------------------------------------------------------------

_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


def parse_json_safe(text: str, *, fallback: Any = None) -> Any:
    """Parse JSON, stripping common LLM artefacts. Returns `fallback` on failure."""
    if not text:
        return fallback
    cleaned = _JSON_FENCE_RE.sub("", text).strip()
    # If model returned a leading prose line, grab the first {...} or [...] block
    if not (cleaned.startswith("{") or cleaned.startswith("[")):
        brace = cleaned.find("{")
        bracket = cleaned.find("[")
        starts = [i for i in (brace, bracket) if i != -1]
        if starts:
            cleaned = cleaned[min(starts):]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        log.warning("json_parse_failed", error=str(e), text_preview=cleaned[:200])
        return fallback


def chat_json(system: str, user: str, *, fallback: Any = None, **kwargs) -> Any:
    """Convenience: chat_completion + parse_json_safe in one call. Forces JSON mode."""
    raw = chat_completion(system, user, response_format_json=True, **kwargs)
    return parse_json_safe(raw, fallback=fallback)


def vision_json(system: str, user_text: str, image_base64: str, *,
                fallback: Any = None, **kwargs) -> Any:
    """Convenience: vision_completion + parse_json_safe in one call."""
    raw = vision_completion(system, user_text, image_base64,
                            response_format_json=True, **kwargs)
    return parse_json_safe(raw, fallback=fallback)
