import base64
import time
import json
from openai import OpenAI
from backend.config import settings
import structlog

log = structlog.get_logger(module="openai_tools")

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def chat_completion(messages: list[dict], model: str | None = None, response_format: str = "text") -> str:
    client = _get_client()
    kwargs = {
        "model": model or settings.openai_model,
        "messages": messages,
    }
    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    for attempt in range(3):
        try:
            resp = client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content
        except Exception as e:
            if attempt == 2:
                raise
            wait = 2 ** attempt
            log.warning("openai_retry", attempt=attempt, error=str(e), wait=wait)
            time.sleep(wait)


def vision_completion(image_base64: str, prompt: str, system_prompt: str = "") -> str:
    client = _get_client()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
            {"type": "text", "text": prompt},
        ],
    })

    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=settings.openai_vision_model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content
        except Exception as e:
            if attempt == 2:
                raise
            wait = 2 ** attempt
            log.warning("vision_retry", attempt=attempt, error=str(e), wait=wait)
            time.sleep(wait)


def parse_json_response(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # strip markdown fences if present
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
