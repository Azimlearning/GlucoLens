"""
FastAPI dependency that verifies a Firebase ID token and yields the decoded user.

Usage in routers:
    from fastapi import Depends
    from backend.middleware.auth import require_user

    @router.post("/meal/upload")
    async def upload(payload: ..., user = Depends(require_user)):
        uid = user["uid"]

Security rule: the JWT UID ALWAYS overrides any client-supplied patient_id /
user_id. Routers should pass user["uid"] into state, never trust the request body.
"""
from fastapi import HTTPException, Request, status

from backend.tools import firebase_tools
from backend.utils.logging import agent_logger

log = agent_logger("auth")


async def require_user(request: Request) -> dict:
    """Verify the Authorization: Bearer <id_token> header. Returns decoded token."""
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header (expected 'Bearer <token>').",
        )
    token = auth.split(" ", 1)[1].strip()
    try:
        decoded = firebase_tools.verify_id_token(token)
    except Exception as e:  # noqa: BLE001
        log.warning("token_verification_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired ID token.",
        ) from e

    if not decoded.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing uid claim.",
        )
    return decoded


async def require_role(request: Request, allowed: tuple[str, ...]) -> dict:
    """Verify the token AND check the user's role against an allowed set."""
    user = await require_user(request)
    profile = firebase_tools.fetch_user(user["uid"]) or {}
    role = profile.get("role", "patient")
    if role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' not permitted for this endpoint. Allowed: {allowed}",
        )
    return {**user, "role": role, "profile": profile}
