from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class VitalsSchema(BaseModel):
    bp: Optional[str] = None
    pulse: Optional[str] = None
    temperature: Optional[str] = None
    spO2: Optional[str] = None


class PatientProfileCreate(BaseModel):
    name: str = Field(..., min_length=1)
    age: str = Field(..., min_length=1)
    gender: str = Field(..., description="'Male' | 'Female' | 'Other' | 'Prefer not to say'")
    opd_reg_id: Optional[str] = None  # Generated automatically if not supplied
    contact_number: Optional[str] = None
    vitals: Optional[VitalsSchema] = None


class PatientProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    vitals: Optional[VitalsSchema] = None


class PatientProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    age: str
    gender: str
    opd_reg_id: str
    contact_number: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    fhir_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
