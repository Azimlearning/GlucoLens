"""
Async timeout wrapper. Used by orchestrator to enforce per-node timeouts.
"""
import asyncio
from typing import Awaitable, TypeVar

T = TypeVar("T")


class AgentTimeoutError(TimeoutError):
    """Raised when an agent node exceeds its time budget."""


async def with_timeout(coro: Awaitable[T], timeout_s: float, label: str = "task") -> T:
    try:
        return await asyncio.wait_for(coro, timeout=timeout_s)
    except asyncio.TimeoutError as e:
        raise AgentTimeoutError(f"{label} exceeded {timeout_s}s timeout") from e
