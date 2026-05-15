import asyncio
from tavily import TavilyClient
from backend.config import settings
import structlog

log = structlog.get_logger(module="tavily_tools")

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


def tavily_search(query: str, depth: str = "basic", domains: list[str] | None = None, max_results: int = 5) -> list[dict]:
    try:
        kwargs = {
            "query": query,
            "search_depth": depth,
            "max_results": max_results,
        }
        if domains:
            kwargs["include_domains"] = domains
        result = _get_client().search(**kwargs)
        return result.get("results", [])
    except Exception as e:
        log.warning("tavily_search_failed", query=query, error=str(e))
        return []
