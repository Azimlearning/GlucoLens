"""
Agent stub: vision_agent
Replace this stub with the full implementation.
"""
from backend.models.state import GlucoLensState
from backend.utils.logging import agent_logger

log = agent_logger("vision_agent")


def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state.get("session_id"))
    # TODO: implement vision agent logic
    return {}
