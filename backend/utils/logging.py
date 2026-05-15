"""
Structured logger. Use `agent_logger("vision")` to get a logger bound to an agent name.
"""
import logging
import sys
import structlog
from backend.config import settings


def _configure_once() -> None:
    if getattr(_configure_once, "_done", False):
        return
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if settings.APP_ENV == "production"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )
    _configure_once._done = True  # type: ignore[attr-defined]


def configure_logging() -> None:
    """Called at app startup via lifespan. Delegates to _configure_once."""
    _configure_once()


def agent_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger bound to the given name (typically an agent name)."""
    _configure_once()
    return structlog.get_logger().bind(component=name)
