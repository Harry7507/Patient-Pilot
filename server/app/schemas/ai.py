from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.intake import SocratesHistorySchema, DashavidhaParikshaSchema


class IntakeChatRequest(BaseModel):
    intake_session_id: Optional[UUID] = None
    patient_profile_id: Optional[UUID] = None
    current_step_id: Optional[str] = None
    user_message: str = Field(..., min_length=1)
    language: str = "en"
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    extracted_socrates: Optional[SocratesHistorySchema] = None


class IntakeChatResponse(BaseModel):
    agent_message: str
    localized_message: str
    language: str
    suggested_options: List[str] = Field(default_factory=list)
    extracted_socrates_delta: Optional[Dict[str, Any]] = None
    next_step_id: Optional[str] = None
    is_emergency: bool = False


class AyushAssessmentRequest(BaseModel):
    intake_session_id: Optional[UUID] = None
    factors: DashavidhaParikshaSchema
    language: str = "en"


class AyushAssessmentResponse(BaseModel):
    summary: str
    localized_summary: str
    dosha_profile: str
    dietary_guidelines: List[str]
    lifestyle_recommendations: List[str]


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    target_language: str = Field(..., min_length=2, max_length=10)
    source_language: Optional[str] = "en"


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    target_language: str


class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    duration_seconds: Optional[float] = None
