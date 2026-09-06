import uuid
import logging
from typing import Optional, Callable
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validates Supabase JWT bearer token, extracts user ID / claims,
    and returns the authenticated User record with role.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    user_id_str: Optional[str] = None
    email: Optional[str] = None

    # 1. Try decoding with configured Supabase JWT secret
    try:
        # If secret is set and valid
        if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "placeholder-jwt-secret":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id_str = payload.get("sub")
            email = payload.get("email")
        else:
            # Fallback for development: decode without verification if placeholder
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id_str = payload.get("sub")
            email = payload.get("email")
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing sub",
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
        )

    # 2. Fetch User from database
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        # If user exists in Supabase Auth but not in application table yet, auto-provision as patient
        user = User(
            id=user_uuid,
            email=email or f"user_{user_uuid}@patientpilot.org",
            role="patient",
            full_name=email.split("@")[0] if email else "Patient",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


def require_role(required_role: str) -> Callable:
    """
    Enforces role-based access control.
    Patients cannot access doctor-only routes, and vice versa.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: '{required_role}', user role: '{current_user.role}'",
            )
        return current_user

    return role_checker
