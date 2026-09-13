import uuid
from datetime import datetime, timezone
from typing import Optional
import logging
import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.patient import PatientProfile
from app.services.fhir_service import fhir_service
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)

DEV_JWT_SECRET = "patientpilot-dev-jwt-secret-key-32bytes-for-rfc7518"

def get_jwt_secret() -> str:
    if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "placeholder-jwt-secret":
        return settings.SUPABASE_JWT_SECRET
    return DEV_JWT_SECRET


def get_supabase_client():
    if settings.SUPABASE_URL and settings.SUPABASE_KEY and "placeholder" not in settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except Exception as e:
            logger.warning(f"Could not initialize Supabase client: {e}")
    return None


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_patient(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Patient self-registration only.
    Role is STRICTLY forced to 'patient' server-side regardless of client input.
    """
    # Check if user already exists
    existing_result = await db.execute(select(User).where(User.email == payload.email))
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    supabase_client = get_supabase_client()
    user_id = uuid.uuid4()

    if supabase_client:
        try:
            auth_res = supabase_client.auth.sign_up({
                "email": payload.email,
                "password": payload.password,
            })
            if auth_res and auth_res.user:
                user_id = uuid.UUID(auth_res.user.id)
        except Exception as e:
            logger.error(f"Supabase auth registration failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {str(e)}",
            )

    # Persist in application users table with STRICT role='patient'
    user_name = payload.full_name or payload.email.split("@")[0]
    new_user = User(
        id=user_id,
        email=payload.email,
        role="patient",  # Strictly enforced
        full_name=user_name,
        is_first_login=True,
    )
    db.add(new_user)
    await db.flush()

    # Automatically provision initial PatientProfile so name and contact are preserved
    opd_id = f"OPD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    new_profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=new_user.id,
        name=user_name,
        age="40",
        gender="Other",
        opd_reg_id=opd_id,
        contact_number=payload.contact_number,
        vitals={},
    )
    new_profile.fhir_json = fhir_service.build_patient_resource(new_profile)
    db.add(new_profile)

    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Patient registered successfully.",
        "user_id": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role,
    }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user against Supabase Auth, updates last_login_at,
    flips is_first_login to False, and returns tokens + role.
    """
    supabase_client = get_supabase_client()

    access_token = ""
    refresh_token = ""
    user_id: Optional[uuid.UUID] = None

    if supabase_client:
        try:
            auth_res = supabase_client.auth.sign_in_with_password({
                "email": payload.email,
                "password": payload.password,
            })
            if auth_res and auth_res.session:
                access_token = auth_res.session.access_token
                refresh_token = auth_res.session.refresh_token
                user_id = uuid.UUID(auth_res.user.id)
        except Exception as e:
            logger.warning(f"Supabase password login failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
    else:
        # Development fallback token if local test without Supabase credentials
        user_result = await db.execute(select(User).where(User.email == payload.email))
        user_record = user_result.scalar_one_or_none()
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        user_id = user_record.id
        jwt_key = get_jwt_secret()
        access_token = jwt.encode(
            {"sub": str(user_id), "email": user_record.email, "role": user_record.role},
            jwt_key,
            algorithm="HS256",
        )
        refresh_token = jwt.encode(
            {"sub": str(user_id), "type": "refresh"},
            jwt_key,
            algorithm="HS256",
        )

    # Fetch and update user record
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id=user_id,
            email=payload.email,
            role="patient",
            full_name=payload.email.split("@")[0],
            is_first_login=True,
        )
        db.add(user)

    is_first = user.is_first_login
    user.is_first_login = False
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        role=user.role,
        is_first_login=is_first,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refreshes an expired session using the refresh token."""
    supabase_client = get_supabase_client()
    if supabase_client:
        try:
            res = supabase_client.auth.refresh_session(payload.refresh_token)
            if res and res.session:
                user_uuid = uuid.UUID(res.user.id)
                user_res = await db.execute(select(User).where(User.id == user_uuid))
                user = user_res.scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                return TokenResponse(
                    access_token=res.session.access_token,
                    refresh_token=res.session.refresh_token,
                    token_type="bearer",
                    role=user.role,
                    is_first_login=user.is_first_login,
                    user=UserResponse.model_validate(user),
                )
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Refresh token invalid: {str(e)}",
            )

    # Development fallback verification
    try:
        jwt_key = get_jwt_secret()
        data = jwt.decode(
            payload.refresh_token,
            jwt_key,
            algorithms=["HS256"],
        )
        user_uuid = uuid.UUID(data["sub"])
        user_res = await db.execute(select(User).where(User.id == user_uuid))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_access = jwt.encode(
            {"sub": str(user.id), "email": user.email, "role": user.role},
            jwt_key,
            algorithm="HS256",
        )
        new_refresh = jwt.encode(
            {"sub": str(user.id), "type": "refresh"},
            jwt_key,
            algorithm="HS256",
        )
        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="bearer",
            role=user.role,
            is_first_login=user.is_first_login,
            user=UserResponse.model_validate(user),
        )
    except Exception as e:
        logger.warning(f"Fallback token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalid or expired",
        )


@router.post("/logout")
async def logout():
    """Logs out the user session."""
    supabase_client = get_supabase_client()
    if supabase_client:
        try:
            supabase_client.auth.sign_out()
        except Exception:
            pass
    return {"message": "Logged out successfully"}
