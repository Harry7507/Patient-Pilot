from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class SocratesHistorySchema(BaseModel):
    site: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associations: Optional[List[str]] = Field(default_factory=list)
    timeDuration: Optional[str] = None
    exacerbatingFactors: Optional[str] = None
    relievingFactors: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=1, le=10)


class DashavidhaParikshaSchema(BaseModel):
    prakriti: Optional[str] = None
    agniAharaShakti: Optional[str] = None
    vyayamaShakti: Optional[str] = None
    satmya: Optional[str] = None
    vaya: Optional[str] = None
    notes: Optional[str] = None


class IntakeSessionCreate(BaseModel):
    patient_profile_id: Optional[UUID] = None
    chief_complaint: str = Field(default="")
    socrates: Optional[SocratesHistorySchema] = None
    associated_symptoms: Optional[List[str]] = Field(default_factory=list)
    chronic_conditions: Optional[List[str]] = Field(default_factory=list)
    is_ayush_active: bool = False
    ayush_assessment: Optional[DashavidhaParikshaSchema] = None
    language: str = "en"
    status: str = "in_progress"


class IntakeSessionUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    socrates: Optional[SocratesHistorySchema] = None
    associated_symptoms: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    is_ayush_active: Optional[bool] = None
    ayush_assessment: Optional[DashavidhaParikshaSchema] = None
    language: Optional[str] = None
    status: Optional[str] = None


class IntakeSessionResponse(BaseModel):
    id: UUID
    patient_profile_id: UUID
    chief_complaint: str
    socrates: Optional[Dict[str, Any]] = None
    associated_symptoms: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    is_ayush_active: bool
    ayush_assessment: Optional[Dict[str, Any]] = None
    language: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
