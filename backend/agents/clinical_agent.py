"""
Agent stub: clinical_agent
Replace this stub with the full implementation.
"""
from backend.models.state import GlucoLensState
from backend.utils.logging import agent_logger

log = agent_logger("clinical_agent")


def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state.get("session_id"))
    # TODO: implement clinical agent logic
    return {}
