"""
Agent 9 — Orchestrator

Job: Coordinate the multi-agent pipeline. Validates incoming events, selects the
     correct agent sequence, enforces per-node timeouts, handles failures with
     fallback state, and writes an audit trail.

Single public entrypoint: `run(state: GlucoLensState) -> GlucoLensState`.

Pipeline shape per event type is defined in `PIPELINES`. Each agent is a node that
takes the running state and returns a partial dict update — LangGraph merges them.
"""
from __future__ import annotations

import asyncio
import time
from typing import Callable
from uuid import uuid4

from langgraph.graph import StateGraph, END

from backend.config import settings
from backend.models.state import (
    GlucoLensState,
    EMPTY_STATE,
    EVENT_TYPES,
    EVENT_REQUIREMENTS,
)
from backend.tools import firebase_tools
from backend.tools.normalize import now_iso
from backend.utils.cache import view_state_cache
from backend.utils.logging import agent_logger
from backend.utils.timeout import with_timeout, AgentTimeoutError

# Agent node imports
from backend.agents import (
    vision_agent,
    nutrition_agent,
    clinical_agent,
    glucose_agent,
    alert_agent,
    report_agent,
    dashboard_agent,
    misinfo_agent,
)

log = agent_logger("orchestrator")


# === Pipeline definitions ===

# Order matters — each agent reads from prior agents' state writes.
PIPELINES: dict[str, list[tuple[str, Callable[[GlucoLensState], dict]]]] = {
    "meal_upload": [
        ("vision",    vision_agent.node),
        ("nutrition", nutrition_agent.node),
        ("clinical",  clinical_agent.node),
        ("alert",     alert_agent.node),
        ("dashboard", dashboard_agent.node),
    ],
    "glucose_entry": [
        ("glucose",   glucose_agent.node),
        ("alert",     alert_agent.node),
        ("dashboard", dashboard_agent.node),
    ],
    "misinformation_query": [
        ("misinfo",   misinfo_agent.node),
        ("dashboard", dashboard_agent.node),
    ],
    "weekly_report": [
        ("report",    report_agent.node),
        ("dashboard", dashboard_agent.node),
    ],
    "dashboard_load": [
        ("glucose",   glucose_agent.node),     # surface insights on load
        ("dashboard", dashboard_agent.node),
    ],
}


# === Fallback shapes per agent if a node fails ===

FALLBACK_OUTPUTS: dict[str, dict] = {
    "vision":    {"meal_items": [], "unrecognized_items": [{"reason": "agent_failure"}],
                  "recognition_method": "error"},
    "nutrition": {"nutrition_totals": {}, "nutrition_per_item": [], "data_source": "error"},
    "clinical":  {"traffic_light": {}, "risk_score": 0,
                  "recommendations": [], "drug_interactions": []},
    "glucose":   {"glucose_insights": []},
    "alert":     {"alerts": []},
    "report":    {"pdf_url": ""},
    "dashboard": {"dashboard_payload": {"error": "dashboard_unavailable"},
                  "view_role": "unknown"},
    "misinfo":   {"verdict": "error",
                  "verdict_explanation": "Unable to verify this claim right now.",
                  "disclaimer": "Please consult your dietitian or doctor.",
                  "evidence_sources": [],
                  "logged_for_dietitian": False},
}


# === Tools ===

def classify_event(state: GlucoLensState) -> dict:
    """Validate event_type and that all required fields are present.

    Returns:
        {"valid": bool, "event_type": str, "missing": list[str], "reason": str}
    """
    event_type = state.get("event_type", "")
    if event_type not in EVENT_TYPES:
        return {
            "valid": False,
            "event_type": event_type,
            "missing": [],
            "reason": f"Unknown event_type '{event_type}'. Expected one of {EVENT_TYPES}.",
        }
    required = EVENT_REQUIREMENTS.get(event_type, [])
    missing = [f for f in required if not state.get(f)]
    if missing:
        return {
            "valid": False,
            "event_type": event_type,
            "missing": missing,
            "reason": f"Missing required fields for {event_type}: {missing}",
        }
    return {"valid": True, "event_type": event_type, "missing": [], "reason": ""}


def build_agent_pipeline(event_type: str) -> list[tuple[str, Callable]]:
    """Return the agent sequence for an event type. Empty list if unknown."""
    return PIPELINES.get(event_type, [])


def handle_agent_failure(agent_name: str, error: Exception, state: GlucoLensState) -> dict:
    """Return a fallback partial-state update for a failed node."""
    log.error("agent_failed", agent=agent_name, error=str(error))
    fallback = dict(FALLBACK_OUTPUTS.get(agent_name, {}))
    fallback["errors"] = (state.get("errors") or []) + [{
        "agent": agent_name,
        "error": str(error),
        "timestamp": now_iso(),
    }]
    return fallback


def audit_log(session_id: str, payload: dict) -> None:
    """Persist a session-level audit record to Firestore."""
    try:
        firebase_tools.write_audit_log(session_id, payload)
    except Exception as e:  # noqa: BLE001
        log.warning("audit_log_failed", error=str(e))


def human_in_the_loop_check(state: GlucoLensState) -> bool:
    """Flag for human review: critical alerts + risk_score >= 80."""
    risk = state.get("risk_score", 0) or 0
    has_critical = any(
        (a or {}).get("severity") == "critical"
        for a in (state.get("alerts") or [])
    )
    return has_critical and risk >= 80


def cost_optimizer(state: GlucoLensState) -> dict:
    """Pre-pipeline check for cached dashboard payloads to skip recomputation.

    For `dashboard_load` events, if a fresh cached view exists, surface it
    directly. The orchestrator then short-circuits the pipeline.
    """
    if state.get("event_type") != "dashboard_load":
        return {"short_circuit": False}
    user_id = state.get("user_id") or state.get("patient_id") or ""
    cached = view_state_cache.get(user_id) if user_id else None
    if cached:
        return {
            "short_circuit": True,
            "cached_payload": cached,
        }
    return {"short_circuit": False}


# === Async wrappers for sync agent nodes ===

async def _run_node_with_timeout(name: str, fn: Callable, state: GlucoLensState) -> dict:
    """Run a sync agent node off the event loop with a per-node timeout."""
    async def _runner():
        return await asyncio.to_thread(fn, state)

    try:
        result = await with_timeout(
            _runner(),
            timeout_s=settings.AGENT_NODE_TIMEOUT_S,
            label=f"agent.{name}",
        )
        return result if isinstance(result, dict) else {}
    except AgentTimeoutError as e:
        return handle_agent_failure(name, e, state)
    except Exception as e:  # noqa: BLE001
        return handle_agent_failure(name, e, state)


def _make_async_node(name: str, fn: Callable) -> Callable:
    """Wrap an agent node so LangGraph can use it as an async node with timeout + fallback."""
    async def _node(state: GlucoLensState) -> dict:
        return await _run_node_with_timeout(name, fn, state)
    _node.__name__ = f"node_{name}"
    return _node


# === LangGraph builders (cached per event type) ===

_GRAPH_CACHE: dict[str, object] = {}


def _build_graph(event_type: str):
    """Build (and cache) a compiled StateGraph for the given event type."""
    if event_type in _GRAPH_CACHE:
        return _GRAPH_CACHE[event_type]

    pipeline = build_agent_pipeline(event_type)
    if not pipeline:
        raise ValueError(f"No pipeline defined for event_type '{event_type}'")

    builder = StateGraph(GlucoLensState)
    for name, fn in pipeline:
        builder.add_node(name, _make_async_node(name, fn))

    # Chain: pipeline[0] -> pipeline[1] -> ... -> END
    builder.set_entry_point(pipeline[0][0])
    for i in range(len(pipeline) - 1):
        builder.add_edge(pipeline[i][0], pipeline[i + 1][0])
    builder.add_edge(pipeline[-1][0], END)

    graph = builder.compile()
    _GRAPH_CACHE[event_type] = graph
    return graph


# === Public entry: orchestrator.run ===

async def run(input_state: GlucoLensState) -> GlucoLensState:
    """Run the orchestrator end-to-end. Always returns a state — never raises.

    Errors are accumulated in `state["errors"]` for the caller to inspect.
    """
    # Start with a fresh empty shell, merge user input on top.
    state: GlucoLensState = {**EMPTY_STATE, **(input_state or {})}
    state.setdefault("session_id", uuid4().hex)
    state.setdefault("timestamp", now_iso())

    log.info("orchestrator_start",
             pipeline_event=state.get("event_type"),
             session_id=state["session_id"])

    started_at = time.perf_counter()

    # 1. Validate
    validation = classify_event(state)
    if not validation["valid"]:
        state["errors"] = (state.get("errors") or []) + [{
            "agent": "orchestrator",
            "error": validation["reason"],
            "timestamp": now_iso(),
        }]
        audit_log(state["session_id"], {
            "event_type":   state.get("event_type"),
            "session_id":   state["session_id"],
            "patient_id":   state.get("patient_id"),
            "user_id":      state.get("user_id"),
            "outcome":      "validation_failed",
            "reason":       validation["reason"],
            "timestamp":    now_iso(),
        })
        log.warning("orchestrator_validation_failed", reason=validation["reason"])
        return state

    # 2. Cost-optimizer short-circuit (dashboard_load with fresh cache)
    optim = cost_optimizer(state)
    if optim.get("short_circuit"):
        log.info("orchestrator_cache_short_circuit", session_id=state["session_id"])
        state["dashboard_payload"] = optim["cached_payload"]
        state["view_role"] = optim["cached_payload"].get("view", "patient")
        state["cached"] = True
        audit_log(state["session_id"], {
            "event_type":   state["event_type"],
            "session_id":   state["session_id"],
            "user_id":      state.get("user_id"),
            "outcome":      "cache_hit",
            "duration_ms":  int((time.perf_counter() - started_at) * 1000),
            "timestamp":    now_iso(),
        })
        return state

    # 3. Build + run the graph with a soft overall timeout
    try:
        graph = _build_graph(state["event_type"])
        final_state = await with_timeout(
            graph.ainvoke(state, config={"recursion_limit": settings.PIPELINE_RECURSION_LIMIT}),
            timeout_s=settings.PIPELINE_TIMEOUT_S,
            label="pipeline",
        )
        if isinstance(final_state, dict):
            state = {**state, **final_state}
    except AgentTimeoutError as e:
        log.error("orchestrator_pipeline_timeout", error=str(e))
        state["errors"] = (state.get("errors") or []) + [{
            "agent": "orchestrator",
            "error": f"Pipeline timeout: {e}",
            "timestamp": now_iso(),
        }]
    except Exception as e:  # noqa: BLE001
        log.exception("orchestrator_pipeline_failure")
        state["errors"] = (state.get("errors") or []) + [{
            "agent": "orchestrator",
            "error": f"Pipeline failure: {e}",
            "timestamp": now_iso(),
        }]

    # 4. Human-in-the-loop flag
    if human_in_the_loop_check(state):
        state["errors"] = (state.get("errors") or []) + [{
            "agent": "orchestrator",
            "error": "flagged_for_human_review",
            "timestamp": now_iso(),
            "severity": "info",
        }]
        log.info("orchestrator_human_in_loop", session_id=state["session_id"])

    # 5. Audit
    duration_ms = int((time.perf_counter() - started_at) * 1000)
    audit_log(state["session_id"], {
        "event_type":   state.get("event_type"),
        "session_id":   state["session_id"],
        "patient_id":   state.get("patient_id"),
        "user_id":      state.get("user_id"),
        "outcome":      "success" if not state.get("errors") else "partial",
        "duration_ms":  duration_ms,
        "errors":       state.get("errors") or [],
        "risk_score":   state.get("risk_score"),
        "verdict":      state.get("verdict"),
        "timestamp":    now_iso(),
    })

    log.info("orchestrator_done",
             session_id=state["session_id"],
             duration_ms=duration_ms,
             errors=len(state.get("errors") or []))
    return state


def run_sync(input_state: GlucoLensState) -> GlucoLensState:
    """Synchronous wrapper for `run()`. Useful for scripts and CLI usage."""
    return asyncio.run(run(input_state))


async def run_pipeline(event_type: str, fields: dict) -> GlucoLensState:
    """Convenience wrapper used by routers: merges event_type + fields into state and runs."""
    return await run({**fields, "event_type": event_type})
