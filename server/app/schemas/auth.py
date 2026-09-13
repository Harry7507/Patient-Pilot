from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, AliasChoices


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(..., min_length=6, description="Password minimum 6 characters")
    full_name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("full_name", "fullName", "name"),
    )
    contact_number: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("contact_number", "contactNumber", "phone"),
    )
    # Client cannot set role to anything other than patient; handled authoritatively server-side
    role: Optional[str] = "patient"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    is_first_login: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    is_first_login: bool
    user: UserResponse
