import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add server root to sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.intake import IntakeSession
from app.models.clinical_records import (
    Medication,
    LabValue,
    TriageResult,
    ClinicianBriefing,
)
from app.services.safety_matrix import evaluate_deterministic_safety
from app.services.fhir_service import fhir_service


async def seed_demo_data():
    print("🌱 Starting PatientPilot database seeding...")

    async with engine.begin() as conn:
        # Ensure schema tables exist
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Demo Doctor
        doctor_email = "doctor@patientpilot.org"
        doc_res = await session.execute(select(User).where(User.email == doctor_email))
        doctor = doc_res.scalar_one_or_none()

        if not doctor:
            doctor = User(
                id=uuid.uuid4(),
                email=doctor_email,
                role="doctor",
                full_name="Dr. Rajesh Sharma, MD (Cardiologist)",
                is_first_login=False,
                last_login_at=datetime.now(timezone.utc),
            )
            session.add(doctor)
            print(f"✅ Created Demo Doctor: {doctor.email} (Role: {doctor.role})")
        else:
            print(f"ℹ️ Demo Doctor already exists: {doctor.email}")

        # 2. Seed Demo Patient
        patient_email = "patient@patientpilot.org"
        pat_res = await session.execute(select(User).where(User.email == patient_email))
        patient_user = pat_res.scalar_one_or_none()

        if not patient_user:
            patient_user = User(
                id=uuid.uuid4(),
                email=patient_email,
                role="patient",
                full_name="Rajesh Kumar",
                is_first_login=False,
                last_login_at=datetime.now(timezone.utc),
            )
            session.add(patient_user)
            await session.flush()
            print(f"✅ Created Demo Patient User: {patient_user.email}")
        else:
            print(f"ℹ️ Demo Patient user already exists: {patient_user.email}")

        # 3. Patient Profile
        prof_res = await session.execute(select(PatientProfile).where(PatientProfile.user_id == patient_user.id))
        profile = prof_res.scalar_one_or_none()

        if not profile:
            profile = PatientProfile(
                id=uuid.uuid4(),
                user_id=patient_user.id,
                name="Rajesh Kumar",
                age="58",
                gender="Male",
                opd_reg_id="OPD-2026-0001",
                contact_number="+91 98765 43210",
                vitals={
                    "bp": "142/90",
                    "pulse": "84 bpm",
                    "temperature": "98.6 F",
                    "spO2": "97%",
                },
            )
            profile.fhir_json = fhir_service.build_patient_resource(profile)
            session.add(profile)
            await session.flush()
            print(f"✅ Created Patient Profile: {profile.name} (OPD: {profile.opd_reg_id})")

        # 4. Intake Session
        intake_res = await session.execute(
            select(IntakeSession).where(IntakeSession.patient_profile_id == profile.id)
        )
        intake = intake_res.scalar_one_or_none()

        if not intake:
            socrates_data = {
                "site": "Central Chest (Retrosternal)",
                "onset": "Acute Sudden Onset (< 1 hr)",
                "character": "Crushing Heavy Pressure",
                "radiation": "Radiating to Left Arm and Jaw",
                "associations": ["Dyspnea / Breathlessness", "Cold Diaphoresis / Sweating"],
                "timeDuration": "45 minutes",
                "exacerbatingFactors": "Worse with physical exertion",
                "relievingFactors": "Partially relieved by rest",
                "severity": 8,
            }
            intake = IntakeSession(
                id=uuid.uuid4(),
                patient_profile_id=profile.id,
                chief_complaint="Chest Pain / Discomfort with breathlessness",
                socrates=socrates_data,
                associated_symptoms=["Dyspnea / Breathlessness", "Cold Diaphoresis / Sweating"],
                chronic_conditions=["High Blood Pressure (Hypertension)", "Diabetes (Sugar)"],
                is_ayush_active=True,
                ayush_assessment={
                    "prakriti": "Pitta",
                    "agniAharaShakti": "Tikshnagni (Sharp/Hyper)",
                    "vyayamaShakti": "Madhyama (Moderate)",
                    "satmya": "Snigdha-Ushna Satmya (Warm/Nourishing)",
                    "vaya": "Madhyama (Youth/Adulthood)",
                },
                language="hi",
                status="completed",
            )
            session.add(intake)
            await session.flush()
            print(f"✅ Created Intake Session: {intake.id}")

            # 5. Medications
            med1 = Medication(
                id=uuid.uuid4(),
                intake_session_id=intake.id,
                name="Telmisartan",
                dosage="40 mg",
                frequency="OD (Once daily)",
                route="Oral",
                duration="Ongoing",
                indication="Hypertension",
            )
            med1.fhir_json = fhir_service.build_medication_statement_resource(med1, profile.id)

            med2 = Medication(
                id=uuid.uuid4(),
                intake_session_id=intake.id,
                name="Metformin",
                dosage="500 mg",
                frequency="BD (Twice daily)",
                route="Oral",
                duration="Ongoing",
                indication="Type 2 Diabetes",
            )
            med2.fhir_json = fhir_service.build_medication_statement_resource(med2, profile.id)
            session.add_all([med1, med2])

            # 6. Lab Values
            lab1 = LabValue(
                id=uuid.uuid4(),
                intake_session_id=intake.id,
                test_name="Fasting Blood Sugar",
                result="188",
                reference_unit="mg/dL",
                normal_range="70 - 100",
                status="HIGH",
            )
            lab1.fhir_json = fhir_service.build_observation_resource(lab1, profile.id)
            session.add(lab1)

            # 7. Evaluate Deterministic Triage
            triage_calc = evaluate_deterministic_safety(
                chief_complaint=intake.chief_complaint,
                socrates=intake.socrates,
                associated_symptoms=intake.associated_symptoms,
                vitals=profile.vitals,
            )

            triage_res = TriageResult(
                id=uuid.uuid4(),
                intake_session_id=intake.id,
                triage_level=triage_calc["triage_level"],
                triggered_rules=triage_calc["triggered_rules"],
                reason=triage_calc["reason"],
                action_required=triage_calc["action_required"],
                evaluated_at=triage_calc["evaluated_at"],
            )
            session.add(triage_res)
            print(f"🚨 Triage Evaluated: Level {triage_res.triage_level}")

            # 8. Clinician Briefing
            briefing = ClinicianBriefing(
                id=uuid.uuid4(),
                intake_session_id=intake.id,
                clinician_notes="Patient fast-tracked for urgent cardiology review due to acute chest tightness and radiation to left arm.",
                reviewed_by_user_id=doctor.id,
                reviewed_at=datetime.now(timezone.utc),
            )
            briefing.fhir_json = fhir_service.build_composition_resource(
                briefing, intake, profile, doctor.id
            )
            session.add(briefing)
            print(f"✅ Created Clinician Briefing: {briefing.id}")

        await session.commit()
        print("\n🎉 Seeding completed successfully!")
        print("Demo Accounts:")
        print(f"  👨‍⚕️ Doctor:  {doctor_email}  | Role: doctor")
        print(f"  👤 Patient: {patient_email} | Role: patient | OPD ID: OPD-2026-0001")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
