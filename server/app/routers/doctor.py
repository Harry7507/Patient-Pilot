import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.models.intake import IntakeSession
from app.models.clinical_records import ClinicianBriefing, TriageResult
from app.schemas.clinical import BriefingResponse, BriefingDetailResponse, BriefingUpdate
from app.services.fhir_service import fhir_service

router = APIRouter(
    prefix="/doctor",
    tags=["Doctor Dashboard"],
    dependencies=[Depends(require_role("doctor"))],
)


@router.get("/briefings", response_model=List[BriefingResponse])
async def list_clinician_briefings(
    triage_level: Optional[str] = Query(None, description="Filter by triage level: EMERGENCY, HIGH_PRIORITY, ROUTINE"),
    db: AsyncSession = Depends(get_db),
    current_doctor: User = Depends(require_role("doctor")),
):
    """
    List all clinician briefings for the doctor dashboard.
    Strictly restricted to users with role='doctor'. Filterable by triage_level.
    """
    query = (
        select(ClinicianBriefing)
        .join(IntakeSession, ClinicianBriefing.intake_session_id == IntakeSession.id)
        .options(
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.patient_profile),
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.triage_result),
        )
        .order_by(ClinicianBriefing.reviewed_at.asc().nullsfirst(), IntakeSession.created_at.desc())
    )

    if triage_level:
        query = query.join(TriageResult, TriageResult.intake_session_id == IntakeSession.id).where(
            TriageResult.triage_level == triage_level.upper()
        )

    results = await db.execute(query)
    briefings = results.scalars().all()

    response_items: List[BriefingResponse] = []
    for b in briefings:
        session = b.intake_session
        patient = session.patient_profile if session else None
        triage = session.triage_result if session else None

        response_items.append(
            BriefingResponse(
                id=b.id,
                intake_session_id=b.intake_session_id,
                clinician_notes=b.clinician_notes,
                reviewed_by_user_id=b.reviewed_by_user_id,
                reviewed_at=b.reviewed_at,
                fhir_json=b.fhir_json,
                triage_level=triage.triage_level if triage else "ROUTINE",
                patient_name=patient.name if patient else "Unknown",
                opd_reg_id=patient.opd_reg_id if patient else "N/A",
                chief_complaint=session.chief_complaint if session else None,
                created_at=session.created_at if session else None,
            )
        )

    return response_items


@router.get("/briefings/{id}", response_model=BriefingDetailResponse)
async def get_clinician_briefing(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_doctor: User = Depends(require_role("doctor")),
):
    """
    Retrieve single clinician briefing with full clinical dossier for dashboard review.
    """
    query = (
        select(ClinicianBriefing)
        .options(
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.patient_profile),
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.triage_result),
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.medications),
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.lab_values),
        )
        .where(ClinicianBriefing.id == id)
    )
    result = await db.execute(query)
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Clinician briefing not found")

    session = b.intake_session
    patient = session.patient_profile if session else None
    triage = session.triage_result if session else None

    # Construct formatted patient demographics
    patient_dict = {
        "name": patient.name if patient else "Unknown",
        "age": int(patient.age) if (patient and patient.age and str(patient.age).isdigit()) else 50,
        "gender": patient.gender if patient else "Other",
        "opdRegId": patient.opd_reg_id if patient else "N/A",
        "contactNumber": patient.contact_number if patient else "",
        "vitals": patient.vitals if patient else {},
    }

    # Construct chief complaint summary
    cc_dict = {
        "primary": session.chief_complaint if session else "General consultation",
        "onset": (session.socrates or {}).get("onset", "Subacute") if session else "Subacute",
        "duration": (session.socrates or {}).get("timeDuration", "Recent") if session else "Recent",
        "associatedSymptoms": session.associated_symptoms or [] if session else [],
    }

    # Format active medications
    meds_list = [
        {
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "route": m.route or "Oral",
            "duration": m.duration or "Ongoing",
            "indication": m.indication or "",
        }
        for m in (session.medications if session else [])
    ]

    # Format lab values
    labs_list = [
        {
            "test_name": l.test_name,
            "result": l.result,
            "reference_unit": l.reference_unit or "",
            "normal_range": l.normal_range or "N/A",
            "status": l.status or "NORMAL",
        }
        for l in (session.lab_values if session else [])
    ]

    # Format triage results
    triage_dict = {
        "triage_level": triage.triage_level if triage else "ROUTINE",
        "triggeredRules": triage.triggered_rules or [] if triage else [],
        "reason": triage.reason if triage else "Routine clinical evaluation",
        "actionRequired": triage.action_required if triage else "Standard consultation",
        "evaluatedAt": triage.evaluated_at.isoformat() if (triage and triage.evaluated_at) else datetime.now(timezone.utc).isoformat(),
    }

    return BriefingDetailResponse(
        id=b.id,
        intake_session_id=b.intake_session_id,
        clinician_notes=b.clinician_notes,
        reviewed_by_user_id=b.reviewed_by_user_id,
        reviewed_at=b.reviewed_at,
        fhir_json=b.fhir_json,
        triage_level=triage.triage_level if triage else "ROUTINE",
        patient=patient_dict,
        chief_complaint=cc_dict,
        socrates=session.socrates or {} if session else {},
        chronic_conditions=session.chronic_conditions or [] if session else [],
        active_medications=meds_list,
        abnormal_labs=labs_list,
        ayush_assessment=session.ayush_assessment if session else None,
        triage=triage_dict,
        is_ayush_active=session.is_ayush_active if session else False,
        created_at=session.created_at if session else None,
    )



@router.patch("/briefings/{id}", response_model=BriefingResponse)
async def update_clinician_briefing(
    id: uuid.UUID,
    payload: BriefingUpdate,
    db: AsyncSession = Depends(get_db),
    current_doctor: User = Depends(require_role("doctor")),
):
    """
    Update clinician notes and stamp review metadata by attending doctor.
    """
    query = (
        select(ClinicianBriefing)
        .options(
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.patient_profile),
            selectinload(ClinicianBriefing.intake_session).selectinload(IntakeSession.triage_result),
        )
        .where(ClinicianBriefing.id == id)
    )
    result = await db.execute(query)
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Clinician briefing not found")

    if payload.clinician_notes is not None:
        b.clinician_notes = payload.clinician_notes

    if payload.reviewed:
        b.reviewed_by_user_id = current_doctor.id
        b.reviewed_at = datetime.now(timezone.utc)

    # Update FHIR composition resource
    if b.intake_session and b.intake_session.patient_profile:
        b.fhir_json = fhir_service.build_composition_resource(
            b, b.intake_session, b.intake_session.patient_profile, current_doctor.id
        )

    await db.commit()
    await db.refresh(b)

    session = b.intake_session
    patient = session.patient_profile if session else None
    triage = session.triage_result if session else None

    return BriefingResponse(
        id=b.id,
        intake_session_id=b.intake_session_id,
        clinician_notes=b.clinician_notes,
        reviewed_by_user_id=b.reviewed_by_user_id,
        reviewed_at=b.reviewed_at,
        fhir_json=b.fhir_json,
        triage_level=triage.triage_level if triage else "ROUTINE",
        patient_name=patient.name if patient else "Unknown",
        opd_reg_id=patient.opd_reg_id if patient else "N/A",
        chief_complaint=session.chief_complaint if session else None,
        created_at=session.created_at if session else None,
    )
