"""
String and number normalization helpers used by multiple agents.
"""
import re
import unicodedata
from datetime import datetime, timezone


def normalize_food_name(name: str) -> str:
    """Lowercase, strip diacritics, replace whitespace/punctuation with underscores."""
    if not name:
        return ""
    n = unicodedata.normalize("NFKD", name)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = n.lower().strip()
    n = re.sub(r"[^\w]+", "_", n)
    n = re.sub(r"_+", "_", n).strip("_")
    return n


# Alias for shorter calls inside agents.
_normalize = normalize_food_name


def pct_over(actual: float, target: float) -> float:
    """Percent over target. Negative if under."""
    if target <= 0:
        return 0.0
    return round(((actual - target) / target) * 100, 1)


def pct_under(actual: float, target: float) -> float:
    """Percent under target. Negative if over."""
    if target <= 0:
        return 0.0
    return round(((target - actual) / target) * 100, 1)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(s: str) -> datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


COMPOSITE_DISH_PATTERNS = (
    "mixed rice", "nasi campur", "economy rice", "chap fan",
    "nasi kandar", "mixed plate", "buffet plate",
)


def is_composite_dish(name: str) -> bool:
    n = name.lower()
    return any(p in n for p in COMPOSITE_DISH_PATTERNS)


URL_RE = re.compile(r"https?://[^\s\]>\)]+", re.IGNORECASE)


def extract_urls(text: str) -> list[str]:
    return URL_RE.findall(text or "")
