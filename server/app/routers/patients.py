import uuid
from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.intake import IntakeSession
from app.models.clinical_records import (
    Medication,
    LabValue,
    DocumentUpload,
    TriageResult,
    ClinicianBriefing,
)
from app.schemas.patient import (
    PatientProfileCreate,
    PatientProfileUpdate,
    PatientProfileResponse,
)
from app.schemas.intake import (
    IntakeSessionCreate,
    IntakeSessionUpdate,
    IntakeSessionResponse,
)
from app.schemas.clinical import (
    MedicationCreate,
    MedicationResponse,
    LabValueCreate,
    LabValueResponse,
    DocumentUploadResponse,
    TriageResponse,
)
from app.schemas.ai import TranscribeResponse
from app.services.safety_matrix import evaluate_deterministic_safety
from app.services.speech_service import speech_service
from app.services.ocr_service import ocr_service
from app.services.extraction_service import extraction_service
from app.services.fhir_service import fhir_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Patients"])


def check_patient_access(profile: PatientProfile, user: User):
    """Ensures patient can only access their own data, while doctors have clinic-wide access."""
    if user.role != "doctor" and profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you may only access your own clinical records.",
        )


# ==========================================
# Patient Profile Endpoints
# ==========================================

@router.get("/patients/{id}", response_model=PatientProfileResponse)
async def get_patient_profile(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatientProfile).where(
            (PatientProfile.id == id) | (PatientProfile.user_id == id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    check_patient_access(profile, current_user)
    return profile


@router.post("/patients", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_patient_profile(
    payload: PatientProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if patient already has a profile
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    opd_id = payload.opd_reg_id or f"OPD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    vitals_dict = payload.vitals.model_dump() if payload.vitals else {}

    new_profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name,
        age=str(payload.age),
        gender=payload.gender,
        opd_reg_id=opd_id,
        contact_number=payload.contact_number,
        vitals=vitals_dict,
    )
    new_profile.fhir_json = fhir_service.build_patient_resource(new_profile)
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    return new_profile


@router.patch("/patients/{id}", response_model=PatientProfileResponse)
async def update_patient_profile(
    id: uuid.UUID,
    payload: PatientProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatientProfile).where(
            (PatientProfile.id == id) | (PatientProfile.user_id == id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    check_patient_access(profile, current_user)

    if payload.name is not None:
        profile.name = payload.name
    if payload.age is not None:
        profile.age = str(payload.age)
    if payload.gender is not None:
        profile.gender = payload.gender
    if payload.contact_number is not None:
        profile.contact_number = payload.contact_number
    if payload.vitals is not None:
        profile.vitals = payload.vitals.model_dump()

    profile.fhir_json = fhir_service.build_patient_resource(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/patients/{id}/intake-sessions", response_model=List[IntakeSessionResponse])
async def get_patient_intake_sessions(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatientProfile).where(
            (PatientProfile.id == id) | (PatientProfile.user_id == id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    check_patient_access(profile, current_user)

    sessions_res = await db.execute(
        select(IntakeSession)
        .where(IntakeSession.patient_profile_id == profile.id)
        .order_by(IntakeSession.created_at.desc())
    )
    return sessions_res.scalars().all()


@router.post("/patients/{id}/intake-sessions", response_model=IntakeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_intake_session(
    id: uuid.UUID,
    payload: IntakeSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatientProfile).where(
            (PatientProfile.id == id) | (PatientProfile.user_id == id)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    check_patient_access(profile, current_user)

    new_session = IntakeSession(
        id=uuid.uuid4(),
        patient_profile_id=profile.id,
        chief_complaint=payload.chief_complaint,
        socrates=payload.socrates.model_dump() if payload.socrates else {},
        associated_symptoms=payload.associated_symptoms or [],
        chronic_conditions=payload.chronic_conditions or [],
        is_ayush_active=payload.is_ayush_active,

        ayush_assessment=payload.ayush_assessment.model_dump() if payload.ayush_assessment else {},
        language=payload.language or "en",
        status=payload.status or "in_progress",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session


# ==========================================
# Intake Session Detail & Sub-Resources
# ==========================================

async def get_session_and_verify(session_id: uuid.UUID, db: AsyncSession, user: User) -> IntakeSession:
    result = await db.execute(
        select(IntakeSession)
        .options(
            selectinload(IntakeSession.patient_profile),
            selectinload(IntakeSession.medications),
            selectinload(IntakeSession.lab_values),
            selectinload(IntakeSession.documents),
            selectinload(IntakeSession.triage_result),
            selectinload(IntakeSession.briefing),
        )
        .where(IntakeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")
    check_patient_access(session.patient_profile, user)
    return session


@router.patch("/intake-sessions/{id}", response_model=IntakeSessionResponse)
async def update_intake_session(
    id: uuid.UUID,
    payload: IntakeSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await get_session_and_verify(id, db, current_user)

    if payload.chief_complaint is not None:
        session.chief_complaint = payload.chief_complaint
    if payload.socrates is not None:
        session.socrates = payload.socrates.model_dump()
    if payload.associated_symptoms is not None:
        session.associated_symptoms = payload.associated_symptoms
    if payload.chronic_conditions is not None:
        session.chronic_conditions = payload.chronic_conditions
    if payload.is_ayush_active is not None:
        session.is_ayush_active = payload.is_ayush_active
    if payload.ayush_assessment is not None:
        session.ayush_assessment = payload.ayush_assessment.model_dump()
    if payload.language is not None:
        session.language = payload.language
    if payload.status is not None:
        session.status = payload.status

    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/intake-sessions/{id}/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def add_medication(
    id: uuid.UUID,
    payload: MedicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await get_session_and_verify(id, db, current_user)

    med = Medication(
        id=uuid.uuid4(),
        intake_session_id=id,
        name=payload.name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        route=payload.route or "Oral",
        duration=payload.duration,
        indication=payload.indication,
    )
    med.fhir_json = fhir_service.build_medication_statement_resource(med, session.patient_profile_id)
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


@router.post("/intake-sessions/{id}/lab-values", response_model=LabValueResponse, status_code=status.HTTP_201_CREATED)
async def add_lab_value(
    id: uuid.UUID,
    payload: LabValueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await get_session_and_verify(id, db, current_user)

    lab = LabValue(
        id=uuid.uuid4(),
        intake_session_id=id,
        test_name=payload.test_name,
        result=payload.result,
        reference_unit=payload.reference_unit,
        normal_range=payload.normal_range,
        status=payload.status,
    )
    lab.fhir_json = fhir_service.build_observation_resource(lab, session.patient_profile_id)
    db.add(lab)
    await db.commit()
    await db.refresh(lab)
    return lab


@router.post("/intake-sessions/{id}/documents", response_model=DocumentUploadResponse)
async def upload_medical_document(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Multipart upload -> Storage -> OCR pass -> LLM entity structuring -> Structured JSON.
    """
    session = await get_session_and_verify(id, db, current_user)

    file_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"

    # 1. Save file to storage
    storage_path = await ocr_service.save_file(file_bytes, file.filename or "upload.jpg", content_type)

    # 2. Extract clinical entities via LLM extraction service
    extracted = await extraction_service.extract_from_image(file_bytes, content_type, file.filename or "upload.jpg")

    # 3. Create DocumentUpload record
    doc = DocumentUpload(
        id=uuid.uuid4(),
        intake_session_id=id,
        document_type=extracted.get("documentType", "Prescription"),
        file_name=file.filename or "upload.jpg",
        storage_path=storage_path,
        raw_summary=extracted.get("rawSummary"),
    )
    db.add(doc)

    # 4. Save extracted medications and lab values into relational tables
    created_meds: List[Medication] = []
    for med_data in extracted.get("medications", []):
        m = Medication(
            id=uuid.uuid4(),
            intake_session_id=id,
            name=med_data.get("name", "Unknown Drug"),
            dosage=med_data.get("dosage", "Standard"),
            frequency=med_data.get("frequency", "OD"),
            route=med_data.get("route", "Oral"),
            duration=med_data.get("duration"),
            indication=med_data.get("indication"),
        )
        m.fhir_json = fhir_service.build_medication_statement_resource(m, session.patient_profile_id)
        db.add(m)
        created_meds.append(m)

    created_labs: List[LabValue] = []
    for lab_data in extracted.get("keyLabValues", []):
        l = LabValue(
            id=uuid.uuid4(),
            intake_session_id=id,
            test_name=lab_data.get("test_name", "Lab Test"),
            result=str(lab_data.get("result", "")),
            reference_unit=lab_data.get("reference_unit", ""),
            normal_range=lab_data.get("normal_range"),
            status=lab_data.get("status", "NORMAL"),
        )
        l.fhir_json = fhir_service.build_observation_resource(l, session.patient_profile_id)
        db.add(l)
        created_labs.append(l)

    await db.commit()
    await db.refresh(doc)

    return DocumentUploadResponse(
        id=doc.id,
        intake_session_id=doc.intake_session_id,
        document_type=doc.document_type,
        file_name=doc.file_name,
        storage_path=doc.storage_path,
        extracted_at=doc.extracted_at,
        raw_summary=doc.raw_summary,
        medications=[MedicationResponse.model_validate(m) for m in created_meds],
        lab_values=[LabValueResponse.model_validate(l) for l in created_labs],
        diagnoses=extracted.get("diagnosesOrPastProcedures", []),
    )


@router.post("/intake-sessions/{id}/triage", response_model=TriageResponse)
async def evaluate_intake_triage(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authoritatively evaluates the Deterministic Safety Matrix server-side.
    Persists TriageResult and prepares ClinicianBriefing.
    """
    session = await get_session_and_verify(id, db, current_user)

    triage_data = evaluate_deterministic_safety(
        chief_complaint=session.chief_complaint,
        socrates=session.socrates,
        associated_symptoms=session.associated_symptoms,
        vitals=session.patient_profile.vitals if session.patient_profile else None,
    )

    # Upsert TriageResult
    triage_res_query = await db.execute(select(TriageResult).where(TriageResult.intake_session_id == id))
    triage_record = triage_res_query.scalar_one_or_none()

    if not triage_record:
        triage_record = TriageResult(
            id=uuid.uuid4(),
            intake_session_id=id,
            triage_level=triage_data["triage_level"],
            triggered_rules=triage_data["triggered_rules"],
            reason=triage_data["reason"],
            action_required=triage_data["action_required"],
            evaluated_at=triage_data["evaluated_at"],
        )
        db.add(triage_record)
    else:
        triage_record.triage_level = triage_data["triage_level"]
        triage_record.triggered_rules = triage_data["triggered_rules"]
        triage_record.reason = triage_data["reason"]
        triage_record.action_required = triage_data["action_required"]
        triage_record.evaluated_at = triage_data["evaluated_at"]

    # Ensure ClinicianBriefing exists for this session
    briefing_query = await db.execute(select(ClinicianBriefing).where(ClinicianBriefing.intake_session_id == id))
    briefing = briefing_query.scalar_one_or_none()
    if not briefing:
        briefing = ClinicianBriefing(
            id=uuid.uuid4(),
            intake_session_id=id,
            clinician_notes=None,
        )
        briefing.fhir_json = fhir_service.build_composition_resource(
            briefing, session, session.patient_profile
        )
        db.add(briefing)

    await db.commit()
    await db.refresh(triage_record)
    return triage_record


@router.post("/intake-sessions/{id}/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Speech-to-Text passthrough endpoint accepting an audio blob/stream.
    """
    session = await get_session_and_verify(id, db, current_user)
    audio_bytes = await file.read()
    mime_type = file.content_type or "audio/webm"

    result = await speech_service.transcribe(
        audio_bytes=audio_bytes,
        mime_type=mime_type,
        language=session.language or "en",
    )
    return TranscribeResponse(
        transcript=result.get("transcript", ""),
        language=result.get("language", session.language or "en"),
        duration_seconds=result.get("duration_seconds"),
    )


@router.get("/intake-sessions/{id}/fhir")
async def get_session_fhir_bundle(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the FHIR-style JSON bundle for that session assembled from fhir_json columns.
    """
    session = await get_session_and_verify(id, db, current_user)
    bundle = fhir_service.assemble_session_bundle(session)
    return bundle
