"""
Agent stub: report_agent
Replace this stub with the full implementation.
"""
from backend.models.state import GlucoLensState
from backend.utils.logging import agent_logger

log = agent_logger("report_agent")


def node(state: GlucoLensState) -> dict:
    log.info("entering", session_id=state.get("session_id"))
    # TODO: implement report agent logic
    return {}
