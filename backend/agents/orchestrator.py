"""
Agent 9 — Orchestrator
Builds and runs LangGraph subgraphs for each event type.
"""
import asyncio
from backend.models.state import GlucoLensState, EMPTY_STATE
import structlog

log = structlog.get_logger(agent="orchestrator")

# Pipeline definitions: event_type -> ordered list of agent node names
PIPELINES: dict[str, list[str]] = {
    "meal_upload":           ["vision", "nutrition", "clinical", "alert", "dashboard"],
    "glucose_entry":         ["glucose", "alert", "dashboard"],
    "misinformation_query":  ["misinfo", "dashboard"],
    "weekly_report":         ["report", "dashboard"],
    "dashboard_load":        ["dashboard"],
}

# Lazy-loaded agent node registry
_AGENT_NODES: dict = {}


def _load_agents() -> dict:
    global _AGENT_NODES
    if _AGENT_NODES:
        return _AGENT_NODES
    # Import here to avoid circular imports at module load time
    from backend.agents import (
        vision_agent, nutrition_agent, clinical_agent,
        glucose_agent, alert_agent, report_agent,
        dashboard_agent, misinfo_agent,
    )
    _AGENT_NODES = {
        "vision":    vision_agent.node,
        "nutrition": nutrition_agent.node,
        "clinical":  clinical_agent.node,
        "glucose":   glucose_agent.node,
        "alert":     alert_agent.node,
        "report":    report_agent.node,
        "dashboard": dashboard_agent.node,
        "misinfo":   misinfo_agent.node,
    }
    return _AGENT_NODES


async def run_pipeline(event_type: str, initial_state: dict) -> GlucoLensState:
    pipeline = PIPELINES.get(event_type)
    if not pipeline:
        log.error("unknown_event_type", event_type=event_type)
        return {**EMPTY_STATE, "errors": [{"agent": "orchestrator", "error": f"Unknown event: {event_type}"}]}

    agents = _load_agents()
    state: GlucoLensState = {**EMPTY_STATE, "event_type": event_type, **initial_state}

    log.info("pipeline_start", event_type=event_type, session_id=state.get("session_id"))

    for agent_name in pipeline:
        node_fn = agents.get(agent_name)
        if not node_fn:
            log.warning("agent_not_found", agent=agent_name)
            continue
        try:
            if asyncio.iscoroutinefunction(node_fn):
                update = await node_fn(state)
            else:
                update = await asyncio.get_event_loop().run_in_executor(None, node_fn, state)
            state = {**state, **update}
        except Exception as e:
            log.exception("agent_error", agent=agent_name, error=str(e))
            state = {**state, "errors": state.get("errors", []) + [{"agent": agent_name, "error": str(e)}]}

    log.info("pipeline_complete", event_type=event_type, session_id=state.get("session_id"))
    return state
