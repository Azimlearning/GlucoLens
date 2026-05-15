"""
Agent 1 — Vision & Portion Agent

Job: Convert a raw meal photo into a structured list of {name, portion_g, confidence, components}.

Inputs from state:
  - event_type == "meal_upload"
  - image_base64
  - patient_id

Outputs to state:
  - meal_items: list[dict]
  - unrecognized_items: list[dict]
  - recognition_method: str
"""
from __future__ import annotations

import hashlib
import json
from typing import Optional

from backend.config import settings
from backend.models.state import GlucoLensState
from backend.tools import openai_tools, tavily_tools
from backend.tools.normalize import is_composite_dish
from backend.tools.prompts import (
    VISION_SYSTEM_PROMPT,
    VISION_USER_PROMPT,
    VISION_RETRY_SUFFIX,
    DECOMPOSITION_PROMPT,
)
from backend.utils.cache import image_recognition_cache
from backend.utils.logging import agent_logger

log = agent_logger("vision")


# === Constants ===

PORTION_DEFAULTS_G: dict[str, int] = {
    "rice": 150, "noodle": 180, "roti": 80, "sambal": 30,
    "egg": 50, "chicken_piece": 90, "fish_piece": 120,
    "vegetable": 80, "fruit": 100, "soup": 250,
}

PORTION_SIZE_MULTIPLIERS = {"small_plate": 0.7, "large_plate": 1.3, "kid_plate": 0.5}


# === Tools ===

def recognize_food_items(image_base64: str) -> dict:
    """Primary recognition. Returns {meal_items: [...], unrecognized_items: [...]}.

    Backed by GPT-4V in this build. The interface is stable — swap to MyDietCam in production
    via `lookup_mydietcam_model`.
    """
    fallback = {"meal_items": [], "unrecognized_items": [{"reason": "no_items_detected"}]}

    # First attempt
    result = openai_tools.vision_json(
        system=VISION_SYSTEM_PROMPT,
        user_text=VISION_USER_PROMPT,
        image_base64=image_base64,
        fallback=None,
    )

    # Retry once with stricter instruction if parsing failed
    if result is None:
        log.warning("vision_json_parse_failed_retrying")
        result = openai_tools.vision_json(
            system=VISION_SYSTEM_PROMPT + VISION_RETRY_SUFFIX,
            user_text=VISION_USER_PROMPT,
            image_base64=image_base64,
            fallback=fallback,
        )

    if not isinstance(result, dict):
        return fallback

    return {
        "meal_items": result.get("meal_items", []) or [],
        "unrecognized_items": result.get("unrecognized_items", []) or [],
    }


def search_malaysian_food(query: str) -> dict:
    """Tavily-backed enrichment for confirming a dish is a real Malaysian food."""
    results = tavily_tools.tavily_search(
        query=f"Malaysian food {query} recipe ingredients",
        depth="basic",
        max_results=3,
        include_domains=[
            "myresipi.com",
            "asianinspirations.com.au",
            "rasamalaysia.com",
            "mykuali.com",
        ],
    )
    return {"confirmed": len(results) > 0, "variants": results[:3]}


def estimate_portion_size(item_name: str, reference_objects: list[str]) -> int:
    """Rule-based portion estimator. Sanity check only — primary portion is GPT-4V's."""
    key = item_name.lower().split()[0] if item_name else ""
    base = PORTION_DEFAULTS_G.get(key, 100)
    for ref in reference_objects:
        if ref in PORTION_SIZE_MULTIPLIERS:
            return int(base * PORTION_SIZE_MULTIPLIERS[ref])
    return base


def decompose_mixed_dish(dish_name: str) -> list[dict]:
    """Split a composite dish into components via GPT-4o."""
    fallback = [{
        "name": dish_name, "portion_estimate_g": 250,
        "confidence": 0.5, "components": [], "region": "MY",
    }]
    raw = openai_tools.chat_json(
        system="You output strict JSON only.",
        user=DECOMPOSITION_PROMPT.format(dish_name=dish_name),
        fallback=None,
    )
    if not isinstance(raw, list) or not raw:
        return fallback
    return raw


def lookup_mydietcam_model(dish_name: str) -> Optional[dict]:
    """Production hook for MyDietCam IP. Disabled until license is in place."""
    if not settings.MYDIETCAM_ENABLED:
        return None
    # Production: requests.post(MYDIETCAM_ENDPOINT, json={"dish": dish_name})
    return None


def flag_unrecognized_item(item: dict) -> dict:
    """Mark a low-confidence item for user confirmation in the UI."""
    return {
        **item,
        "needs_user_confirmation": True,
        "prompt_to_user": "We couldn't confidently identify this item — please confirm or correct.",
    }


def lookup_fallback_dish(name: str) -> dict:
    """Last-resort default for unknown dishes."""
    return {
        "name": name or "Unknown dish",
        "portion_estimate_g": 200,
        "confidence": 0.3,
        "components": [],
        "region": "OTHER",
    }


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    if state.get("event_type") != "meal_upload":
        return {}

    img = state.get("image_base64") or ""
    if not img:
        log.warning("vision_no_image")
        return {
            "meal_items": [],
            "unrecognized_items": [{"reason": "no_image_provided"}],
            "recognition_method": "no_input",
        }

    log.info("vision_entering", session_id=state.get("session_id"))

    # Cost optimizer — short-circuit for repeat uploads
    img_hash = hashlib.sha256(img.encode("utf-8")).hexdigest()
    cached = image_recognition_cache.get(img_hash)
    if cached:
        log.info("vision_cache_hit", hash=img_hash[:8])
        return {**cached, "cached": True}

    try:
        # 1. Production hook → MyDietCam first, else GPT-4V
        items: list[dict] = []
        unrecognized: list[dict] = []
        method = "gpt4v"

        mydietcam_result = lookup_mydietcam_model("")  # Future: pass extracted text
        if mydietcam_result is not None:
            items = mydietcam_result.get("meal_items", [])
            method = "mydietcam"
        else:
            raw = recognize_food_items(img)
            items = raw["meal_items"]
            unrecognized = raw["unrecognized_items"]

        # 2. Enrich low-confidence MY items via Tavily
        for item in items:
            conf = float(item.get("confidence", 0))
            if conf < 0.8 and item.get("region") == "MY":
                enrichment = search_malaysian_food(item.get("name", ""))
                if not enrichment["confirmed"]:
                    unrecognized.append({**item, "reason": "tavily_unconfirmed"})
                    method = "gpt4v+tavily"

        # 3. Decompose composite dishes
        expanded: list[dict] = []
        for item in items:
            if is_composite_dish(item.get("name", "")):
                components = decompose_mixed_dish(item["name"])
                for c in components:
                    c.setdefault("region", item.get("region", "MY"))
                expanded.extend(components)
            else:
                expanded.append(item)

        # 4. Flag any unrecognized item for UI confirmation
        unrecognized = [flag_unrecognized_item(u) for u in unrecognized]

        # 5. Defensive fallback if nothing came back at all
        if not expanded and not unrecognized:
            expanded = [lookup_fallback_dish("")]
            method = "fallback"

        result = {
            "meal_items": expanded,
            "unrecognized_items": unrecognized,
            "recognition_method": method,
        }
        image_recognition_cache.set(img_hash, result, ttl_s=60)
        log.info("vision_done", items=len(expanded), unrecognized=len(unrecognized), method=method)
        return result

    except Exception as e:  # noqa: BLE001
        log.exception("vision_failure")
        return {
            "meal_items": [],
            "unrecognized_items": [{"reason": f"agent_error: {e}"}],
            "recognition_method": "error",
            "errors": (state.get("errors") or []) + [{"agent": "vision", "error": str(e)}],
        }
