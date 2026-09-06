import os
import sys
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure server path is in sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.intake import IntakeSession
from app.models.clinical_records import (
    Medication,
    LabValue,
    TriageResult,
    ClinicianBriefing,
    DocumentUpload
)


@pytest.fixture
async def test_db_session():
    """Provides a fresh isolated in-memory SQLite database session for each test."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_user_creation_and_roles(test_db_session: AsyncSession):
    """Test case 1: Verify doctor and patient user creation and role enforcement."""
    # Create doctor user
    doctor = User(
        id=uuid.uuid4(),
        email="doctor.sharma@hospital.org",
        role="doctor",
        full_name="Dr. Rajesh Sharma, MD",
        is_first_login=False,
        last_login_at=datetime.now(timezone.utc),
    )
    test_db_session.add(doctor)

    # Create patient user
    patient = User(
        id=uuid.uuid4(),
        email="vikram.malhotra@example.com",
        role="patient",
        full_name="Vikram Malhotra",
        is_first_login=True,
    )
    test_db_session.add(patient)
    await test_db_session.commit()

    # Query back and verify
    doc_res = await test_db_session.execute(select(User).where(User.email == "doctor.sharma@hospital.org"))
    saved_doc = doc_res.scalar_one_or_none()
    assert saved_doc is not None
    assert saved_doc.role == "doctor"
    assert saved_doc.is_first_login is False

    pat_res = await test_db_session.execute(select(User).where(User.email == "vikram.malhotra@example.com"))
    saved_pat = pat_res.scalar_one_or_none()
    assert saved_pat is not None
    assert saved_pat.role == "patient"
    assert saved_pat.is_first_login is True


@pytest.mark.asyncio
async def test_patient_profile_and_vitals_storage(test_db_session: AsyncSession):
    """Test case 2: Verify PatientProfile storage with demographics, JSON vitals, and FHIR resource."""
    user = User(
        id=uuid.uuid4(),
        email="ananya.roy@example.com",
        role="patient",
        full_name="Ananya Roy",
    )
    test_db_session.add(user)
    await test_db_session.flush()

    profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Ananya Roy",
        age="34",
        gender="Female",
        opd_reg_id="OPD-2026-1082",
        contact_number="+91 98765 12345",
        vitals={
            "bp": "118/76",
            "pulse": "72 bpm",
            "temperature": "98.4 F",
            "spO2": "99%"
        },
        fhir_json={
            "resourceType": "Patient",
            "id": "OPD-2026-1082",
            "name": [{"text": "Ananya Roy"}],
            "gender": "female"
        }
    )
    test_db_session.add(profile)
    await test_db_session.commit()

    # Retrieve and verify
    res = await test_db_session.execute(select(PatientProfile).where(PatientProfile.opd_reg_id == "OPD-2026-1082"))
    saved = res.scalar_one_or_none()
    assert saved is not None
    assert saved.name == "Ananya Roy"
    assert saved.vitals["bp"] == "118/76"
    assert saved.vitals["spO2"] == "99%"
    assert saved.fhir_json["resourceType"] == "Patient"
    assert saved.user_id == user.id


@pytest.mark.asyncio
async def test_intake_session_with_socrates_and_ayush(test_db_session: AsyncSession):
    """Test case 3: Verify IntakeSession storage including SOCRATES pain history and AYUSH Pariksha."""
    user = User(id=uuid.uuid4(), email="patient2@hospital.org", role="patient")
    test_db_session.add(user)
    await test_db_session.flush()

    profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Sunil Patil",
        age="52",
        gender="Male",
        opd_reg_id="OPD-2026-2041",
    )
    test_db_session.add(profile)
    await test_db_session.flush()

    intake = IntakeSession(
        id=uuid.uuid4(),
        patient_profile_id=profile.id,
        chief_complaint="Substernal Chest Pain and Left Arm Heaviness",
        socrates={
            "site": "Retrosternal (Mid-Chest)",
            "onset": "Acute Sudden (< 45 mins)",
            "character": "Crushing Pressure / Tightness",
            "radiation": "Radiating to left arm and jaw",
            "severity": 8,
            "timeDuration": "45 minutes"
        },
        associated_symptoms=["Diaphoresis (Cold Sweating)", "Shortness of Breath", "Nausea"],
        chronic_conditions=["Type 2 Diabetes Mellitus", "Dyslipidemia"],
        is_ayush_active=True,
        ayush_assessment={
            "prakriti": "Pitta-Vata",
            "agniAharaShakti": "Tikshnagni (Hyperactive)",
            "vyayamaShakti": "Avara (Low exercise capacity)",
            "satmya": "Ushna Satmya"
        },
        language="hi",
        status="completed"
    )
    test_db_session.add(intake)
    await test_db_session.commit()

    # Query back
    res = await test_db_session.execute(select(IntakeSession).where(IntakeSession.id == intake.id))
    saved = res.scalar_one_or_none()
    assert saved is not None
    assert saved.chief_complaint == "Substernal Chest Pain and Left Arm Heaviness"
    assert saved.socrates["severity"] == 8
    assert "Diaphoresis (Cold Sweating)" in saved.associated_symptoms
    assert saved.is_ayush_active is True
    assert saved.ayush_assessment["prakriti"] == "Pitta-Vata"
    assert saved.status == "completed"


@pytest.mark.asyncio
async def test_clinical_records_medications_labs_triage(test_db_session: AsyncSession):
    """Test case 4: Verify full clinical records pipeline (Medication, LabValue, TriageResult, ClinicianBriefing)."""
    # 1. Create Patient & Intake
    user = User(id=uuid.uuid4(), email="cardiac.patient@test.com", role="patient")
    test_db_session.add(user)
    await test_db_session.flush()

    profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Harish Chandra",
        age="61",
        gender="Male",
        opd_reg_id="OPD-2026-9901",
    )
    test_db_session.add(profile)
    await test_db_session.flush()

    intake = IntakeSession(
        id=uuid.uuid4(),
        patient_profile_id=profile.id,
        chief_complaint="Severe retrosternal chest pain",
        status="completed"
    )
    test_db_session.add(intake)
    await test_db_session.flush()

    # 2. Store Medications
    med1 = Medication(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        name="Aspirin (Disprin)",
        dosage="325 mg",
        frequency="Stat chewable",
        route="Oral",
        indication="Acute Coronary Syndrome"
    )
    med2 = Medication(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        name="Atorvastatin",
        dosage="80 mg",
        frequency="Once daily",
        route="Oral",
        indication="Lipid lowering"
    )
    test_db_session.add_all([med1, med2])

    # 3. Store Lab Value (Troponin I Critical)
    lab = LabValue(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        test_name="High Sensitivity Cardiac Troponin I (hs-cTnI)",
        result="480",
        reference_unit="ng/L",
        normal_range="< 14 ng/L",
        status="CRITICAL",
        fhir_json={
            "resourceType": "Observation",
            "code": {"text": "Troponin I"},
            "valueQuantity": {"value": 480, "unit": "ng/L"}
        }
    )
    test_db_session.add(lab)

    # 4. Store Triage Result (Deterministic Emergency ACS Gate)
    triage = TriageResult(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        triage_level="EMERGENCY",
        triggered_rules=[
            {
                "ruleId": "RULE_ACS_01",
                "matchedCriteria": ["Central Chest Pain", "Radiating to left arm", "Elevated Biomarker"]
            }
        ],
        reason="Acute Coronary Syndrome (ACS) suspected with severe retrosternal pain and diaphoresis.",
        action_required="Immediate 12-lead ECG, cardiology consult, emergency bay transfer within 10 minutes."
    )
    test_db_session.add(triage)

    # 5. Store Clinician Briefing
    doctor = User(id=uuid.uuid4(), email="er.doctor@hospital.org", role="doctor", full_name="Dr. Priya Sen")
    test_db_session.add(doctor)
    await test_db_session.flush()

    briefing = ClinicianBriefing(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        reviewed_by_user_id=doctor.id,
        clinician_notes="ECG shows 2mm ST elevation in leads II, III, aVF. Activated Cath Lab.",
        reviewed_at=datetime.now(timezone.utc),
        fhir_json={"resourceType": "Composition", "status": "final", "title": "Clinical Intake Briefing"}
    )
    test_db_session.add(briefing)
    await test_db_session.commit()

    # Verify All Records
    med_res = await test_db_session.execute(select(Medication).where(Medication.intake_session_id == intake.id))
    saved_meds = med_res.scalars().all()
    assert len(saved_meds) == 2
    assert any(m.name == "Aspirin (Disprin)" for m in saved_meds)

    lab_res = await test_db_session.execute(select(LabValue).where(LabValue.intake_session_id == intake.id))
    saved_lab = lab_res.scalar_one_or_none()
    assert saved_lab is not None
    assert saved_lab.status == "CRITICAL"
    assert saved_lab.result == "480"

    triage_res = await test_db_session.execute(select(TriageResult).where(TriageResult.intake_session_id == intake.id))
    saved_triage = triage_res.scalar_one_or_none()
    assert saved_triage is not None
    assert saved_triage.triage_level == "EMERGENCY"
    assert len(saved_triage.triggered_rules) == 1

    brief_res = await test_db_session.execute(select(ClinicianBriefing).where(ClinicianBriefing.intake_session_id == intake.id))
    saved_briefing = brief_res.scalar_one_or_none()
    assert saved_briefing is not None
    assert "ST elevation" in saved_briefing.clinician_notes
    assert saved_briefing.reviewed_by_user_id == doctor.id


@pytest.mark.asyncio
async def test_cascade_deletion_on_patient_removal(test_db_session: AsyncSession):
    """Test case 5: Verify cascade delete integrity - removing a patient profile cascades to intake sessions and records."""
    user = User(id=uuid.uuid4(), email="delete.test@example.com", role="patient")
    test_db_session.add(user)
    await test_db_session.flush()

    profile = PatientProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Temporary Patient",
        age="29",
        gender="Female",
        opd_reg_id="OPD-2026-TEMP",
    )
    test_db_session.add(profile)
    await test_db_session.flush()

    intake = IntakeSession(
        id=uuid.uuid4(),
        patient_profile_id=profile.id,
        chief_complaint="Mild headache",
    )
    test_db_session.add(intake)

    med = Medication(
        id=uuid.uuid4(),
        intake_session_id=intake.id,
        name="Paracetamol",
        dosage="500 mg",
        frequency="SOS"
    )
    test_db_session.add(med)
    await test_db_session.commit()

    # Delete the patient profile
    await test_db_session.delete(profile)
    await test_db_session.commit()

    # Verify intake and medication are deleted
    intake_check = await test_db_session.execute(select(IntakeSession).where(IntakeSession.id == intake.id))
    assert intake_check.scalar_one_or_none() is None

    med_check = await test_db_session.execute(select(Medication).where(Medication.id == med.id))
    assert med_check.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_multi_doctor_and_multi_patient_cohort(test_db_session: AsyncSession):
    """Test case 6: Verify creation and querying of multiple doctors (3) and patients (4) with clinical intake data."""
    # 1. Create 3 Doctors
    doctors = [
        User(id=uuid.uuid4(), email="doc.cardio@hospital.org", role="doctor", full_name="Dr. Rajesh Sharma (Cardiology)"),
        User(id=uuid.uuid4(), email="doc.er@hospital.org", role="doctor", full_name="Dr. Priya Nair (Emergency)"),
        User(id=uuid.uuid4(), email="doc.pulmo@hospital.org", role="doctor", full_name="Dr. Anand Joshi (Pulmonology)"),
    ]
    for doc in doctors:
        test_db_session.add(doc)
    await test_db_session.flush()

    # Verify 3 doctors exist
    docs_res = await test_db_session.execute(select(User).where(User.role == "doctor"))
    saved_docs = docs_res.scalars().all()
    assert len(saved_docs) >= 3

    # 2. Create 4 Patients with Profiles, Intakes, and Triage
    patient_cases = [
        {"name": "Rajesh Kumar", "email": "rajesh.k@example.com", "opd": "OPD-2026-TEST-1", "complaint": "Acute Chest Pain", "level": "EMERGENCY", "doc": doctors[0]},
        {"name": "Anita Desai", "email": "anita.d@example.com", "opd": "OPD-2026-TEST-2", "complaint": "Severe Asthma Wheezing", "level": "URGENT", "doc": doctors[2]},
        {"name": "Sunil Verma", "email": "sunil.v@example.com", "opd": "OPD-2026-TEST-3", "complaint": "RLQ Abdominal Pain", "level": "URGENT", "doc": doctors[1]},
        {"name": "Meera Patel", "email": "meera.p@example.com", "opd": "OPD-2026-TEST-4", "complaint": "Routine Diabetes Check", "level": "ROUTINE", "doc": doctors[1]},
    ]

    for case in patient_cases:
        p_user = User(id=uuid.uuid4(), email=case["email"], role="patient", full_name=case["name"])
        test_db_session.add(p_user)
        await test_db_session.flush()

        p_prof = PatientProfile(
            id=uuid.uuid4(),
            user_id=p_user.id,
            name=case["name"],
            age="50",
            gender="Other",
            opd_reg_id=case["opd"],
            vitals={"bp": "120/80"},
        )
        test_db_session.add(p_prof)
        await test_db_session.flush()

        p_intake = IntakeSession(
            id=uuid.uuid4(),
            patient_profile_id=p_prof.id,
            chief_complaint=case["complaint"],
            status="completed",
        )
        test_db_session.add(p_intake)
        await test_db_session.flush()

        p_triage = TriageResult(
            id=uuid.uuid4(),
            intake_session_id=p_intake.id,
            triage_level=case["level"],
            reason=f"Test triage for {case['complaint']}",
            action_required="Standard evaluation",
            evaluated_at=datetime.now(timezone.utc),
        )
        test_db_session.add(p_triage)

        p_brief = ClinicianBriefing(
            id=uuid.uuid4(),
            intake_session_id=p_intake.id,
            clinician_notes=f"Clinical review by {case['doc'].full_name}",
            reviewed_by_user_id=case["doc"].id,
            reviewed_at=datetime.now(timezone.utc),
        )
        test_db_session.add(p_brief)

    await test_db_session.commit()

    # Verify query for patient cases
    for case in patient_cases:
        prof_res = await test_db_session.execute(select(PatientProfile).where(PatientProfile.opd_reg_id == case["opd"]))
        prof = prof_res.scalar_one_or_none()
        assert prof is not None
        assert prof.name == case["name"]

        # Verify associated briefing and assigned doctor
        intake_res = await test_db_session.execute(select(IntakeSession).where(IntakeSession.patient_profile_id == prof.id))
        intake = intake_res.scalar_one_or_none()
        assert intake is not None

        brief_res = await test_db_session.execute(select(ClinicianBriefing).where(ClinicianBriefing.intake_session_id == intake.id))
        brief = brief_res.scalar_one_or_none()
        assert brief is not None
        assert brief.reviewed_by_user_id == case["doc"].id

