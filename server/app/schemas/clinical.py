from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class MedicationCreate(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = Field(...)
    frequency: str = Field(...)
    route: Optional[str] = "Oral"
    duration: Optional[str] = None
    indication: Optional[str] = None


class MedicationResponse(BaseModel):
    id: UUID
    intake_session_id: UUID
    name: str
    dosage: str
    frequency: str
    route: Optional[str] = None
    duration: Optional[str] = None
    indication: Optional[str] = None
    fhir_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class LabValueCreate(BaseModel):
    test_name: str = Field(..., min_length=1)
    result: str = Field(...)
    reference_unit: str = Field(...)
    normal_range: Optional[str] = None
    status: str = Field(default="NORMAL", description="'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL'")


class LabValueResponse(BaseModel):
    id: UUID
    intake_session_id: UUID
    test_name: str
    result: str
    reference_unit: str
    normal_range: Optional[str] = None
    status: str
    fhir_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    id: UUID
    intake_session_id: UUID
    document_type: str
    file_name: str
    storage_path: str
    extracted_at: datetime
    raw_summary: Optional[str] = None
    medications: List[MedicationResponse] = Field(default_factory=list)
    lab_values: List[LabValueResponse] = Field(default_factory=list)
    diagnoses: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SafetyRuleTriggerSchema(BaseModel):
    ruleId: str
    ruleDescription: str
    matchedCriteria: List[str]
    level: str  # EMERGENCY | HIGH_PRIORITY | ROUTINE


class TriageResponse(BaseModel):
    id: Optional[UUID] = None
    intake_session_id: UUID
    triage_level: str  # EMERGENCY | HIGH_PRIORITY | ROUTINE
    triggered_rules: List[SafetyRuleTriggerSchema]
    reason: str
    action_required: str
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BriefingUpdate(BaseModel):
    clinician_notes: Optional[str] = None
    reviewed: bool = True


class BriefingResponse(BaseModel):
    id: UUID
    intake_session_id: UUID
    clinician_notes: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    fhir_json: Optional[Dict[str, Any]] = None
    triage_level: Optional[str] = None
    patient_name: Optional[str] = None
    opd_reg_id: Optional[str] = None
    chief_complaint: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BriefingDetailResponse(BaseModel):
    id: UUID
    intake_session_id: UUID
    clinician_notes: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    fhir_json: Optional[Dict[str, Any]] = None
    triage_level: Optional[str] = None
    patient: Dict[str, Any]
    chief_complaint: Dict[str, Any]
    socrates: Dict[str, Any] = Field(default_factory=dict)
    chronic_conditions: List[str] = Field(default_factory=list)
    active_medications: List[Dict[str, Any]] = Field(default_factory=list)
    abnormal_labs: List[Dict[str, Any]] = Field(default_factory=list)
    ayush_assessment: Optional[Dict[str, Any]] = None
    triage: Dict[str, Any]
    is_ayush_active: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

