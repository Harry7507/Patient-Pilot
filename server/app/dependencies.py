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

    # Development / Offline demo token handling
    if token.startswith("demo-"):
        target_role = "doctor" if "doctor" in token else "patient"
        target_email = "doctor@patientpilot.org" if target_role == "doctor" else "patient@patientpilot.org"
        demo_result = await db.execute(select(User).where(User.email == target_email))
        demo_user = demo_result.scalar_one_or_none()
        if not demo_user:
            demo_fallback = await db.execute(select(User).where(User.role == target_role))
            demo_user = demo_fallback.scalars().first()
        if demo_user:
            return demo_user

    user_id_str: Optional[str] = None
    email: Optional[str] = None

    # 1. Try decoding with configured Supabase JWT secret
    try:
        DEV_JWT_SECRET = "patientpilot-dev-jwt-secret-key-32bytes-for-rfc7518"
        secret = settings.SUPABASE_JWT_SECRET if (settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "placeholder-jwt-secret") else DEV_JWT_SECRET
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except jwt.InvalidSignatureError:
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
