"""
Agent stub: dashboard_agent
Replace this stub with the full implementation.
"""
from backend.models.state import GlucoLensState
from backend.utils.logging import agent_logger

log = agent_logger("dashboard_agent")


def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state.get("session_id"))
    # TODO: implement dashboard agent logic
    return {}
