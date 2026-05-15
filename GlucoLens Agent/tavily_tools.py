"""
Tavily web search wrapper.

Used by Agents 1 (Vision/Tavily food confirmation) and 8 (Misinformation evidence).
Behind a thin interface so we can swap providers later.
"""
from typing import Optional

from tavily import TavilyClient

from backend.config import settings
from backend.utils.logging import agent_logger

log = agent_logger("tavily")

_client: Optional[TavilyClient] = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    return _client


def tavily_search(
    query: str,
    *,
    depth: str = "basic",  # "basic" | "advanced"
    max_results: int = 5,
    include_domains: Optional[list[str]] = None,
    exclude_domains: Optional[list[str]] = None,
) -> list[dict]:
    """Run a Tavily search and return a normalised list of result dicts.

    Each result: {title, url, content, score}
    """
    try:
        kwargs = {
            "query": query,
            "search_depth": depth,
            "max_results": max_results,
        }
        if include_domains:
            kwargs["include_domains"] = include_domains
        if exclude_domains:
            kwargs["exclude_domains"] = exclude_domains
        raw = _get_client().search(**kwargs)
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
                "score": r.get("score", 0.0),
            }
            for r in raw.get("results", [])
        ]
    except Exception as e:  # noqa: BLE001 — Tavily client raises plain Exceptions
        log.error("tavily_search_failed", query=query, error=str(e))
        return []
