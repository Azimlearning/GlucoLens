from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.tools.firebase_tools import verify_token

bearer = HTTPBearer()


async def verify_firebase_jwt(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
) -> dict:
    token = credentials.credentials
    decoded = verify_token(token)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return decoded
