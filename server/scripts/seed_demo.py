import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add server root to sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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


# Predefined Doctors Dataset (3 Doctors)
DOCTORS_DATA = [
    {
        "email": "doctor@patientpilot.org",
        "alt_email": "dr.rajesh@patientpilot.org",
        "full_name": "Dr. Rajesh Sharma, MD (Cardiologist)",
        "role": "doctor",
        "department": "Cardiology & Intensive Care",
    },
    {
        "email": "dr.priya@patientpilot.org",
        "alt_email": None,
        "full_name": "Dr. Priya Nair, MD (Internal Medicine & Emergency)",
        "role": "doctor",
        "department": "Emergency & Internal Medicine",
    },
    {
        "email": "dr.anand@patientpilot.org",
        "alt_email": None,
        "full_name": "Dr. Anand Joshi, MD (Pulmonologist & Critical Care)",
        "role": "doctor",
        "department": "Pulmonology & Respiratory Medicine",
    },
]

# Predefined Patients Dataset (4 Diverse Clinical Cases)
PATIENTS_DATA = [
    {
        "email": "patient@patientpilot.org",
        "alt_email": "rajesh.kumar@patientpilot.org",
        "name": "Rajesh Kumar",
        "age": "58",
        "gender": "Male",
        "opd_reg_id": "OPD-2026-0001",
        "contact_number": "+91 98765 43210",
        "assigned_doctor_email": "doctor@patientpilot.org",
        "vitals": {
            "bp": "142/90",
            "pulse": "84 bpm",
            "temperature": "98.6 F",
            "spO2": "97%",
        },
        "chief_complaint": "Chest Pain / Discomfort with breathlessness",
        "socrates": {
            "site": "Central Chest (Retrosternal)",
            "onset": "Acute Sudden Onset (< 1 hr)",
            "character": "Crushing Heavy Pressure",
            "radiation": "Radiating to Left Arm and Jaw",
            "associations": ["Dyspnea / Breathlessness", "Cold Diaphoresis / Sweating"],
            "timeDuration": "45 minutes",
            "exacerbatingFactors": "Worse with physical exertion",
            "relievingFactors": "Partially relieved by rest",
            "severity": 8,
        },
        "associated_symptoms": ["Dyspnea / Breathlessness", "Cold Diaphoresis / Sweating"],
        "chronic_conditions": ["High Blood Pressure (Hypertension)", "Diabetes (Sugar)"],
        "is_ayush_active": True,
        "ayush_assessment": {
            "prakriti": "Pitta",
            "agniAharaShakti": "Tikshnagni (Sharp/Hyper)",
            "vyayamaShakti": "Madhyama (Moderate)",
            "satmya": "Snigdha-Ushna Satmya (Warm/Nourishing)",
            "vaya": "Madhyama (Youth/Adulthood)",
        },
        "language": "hi",
        "medications": [
            {
                "name": "Telmisartan",
                "dosage": "40 mg",
                "frequency": "OD (Once daily)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Hypertension",
            },
            {
                "name": "Metformin",
                "dosage": "500 mg",
                "frequency": "BD (Twice daily)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Type 2 Diabetes",
            },
        ],
        "labs": [
            {
                "test_name": "Fasting Blood Sugar",
                "result": "188",
                "reference_unit": "mg/dL",
                "normal_range": "70 - 100",
                "status": "HIGH",
            },
            {
                "test_name": "Serum Troponin-I",
                "result": "0.85",
                "reference_unit": "ng/mL",
                "normal_range": "< 0.04",
                "status": "HIGH",
            },
        ],
        "clinician_notes": "Patient fast-tracked for urgent cardiology review due to acute chest tightness and radiation to left arm. High suspicion of Acute Coronary Syndrome (ACS). Stat ECG and cardiology bedside consult initiated.",
    },
    {
        "email": "anita.desai@patientpilot.org",
        "alt_email": None,
        "name": "Anita Desai",
        "age": "34",
        "gender": "Female",
        "opd_reg_id": "OPD-2026-0002",
        "contact_number": "+91 98111 22334",
        "assigned_doctor_email": "dr.anand@patientpilot.org",
        "vitals": {
            "bp": "118/76",
            "pulse": "108 bpm",
            "temperature": "99.1 F",
            "spO2": "91%",
        },
        "chief_complaint": "Severe wheezing, tight chest, and acute shortness of breath since last night",
        "socrates": {
            "site": "Bilateral Chest",
            "onset": "Subacute (worsened over past 12 hours)",
            "character": "Chest tightness and audible expiratory wheezing",
            "radiation": "None",
            "associations": ["Shortness of breath", "Dry irritative cough", "Tachypnea"],
            "timeDuration": "12 hours",
            "exacerbatingFactors": "Cold weather and dust exposure",
            "relievingFactors": "Inhaler gave brief partial relief",
            "severity": 7,
        },
        "associated_symptoms": ["Shortness of breath", "Dry cough", "Wheezing"],
        "chronic_conditions": ["Bronchial Asthma (10 years)", "Allergic Rhinitis"],
        "is_ayush_active": True,
        "ayush_assessment": {
            "prakriti": "Vata-Kapha",
            "agniAharaShakti": "Mandagni (Sluggish)",
            "vyayamaShakti": "Avara (Low)",
            "satmya": "Ruksha-Sheeta Satmya",
            "vaya": "Madhyama (Adulthood)",
        },
        "language": "en",
        "medications": [
            {
                "name": "Budesonide Rotacaps",
                "dosage": "200 mcg",
                "frequency": "BD (Twice daily)",
                "route": "Inhalation",
                "duration": "Ongoing",
                "indication": "Asthma Prophylaxis",
            },
            {
                "name": "Salbutamol (Asthalin) Inhaler",
                "dosage": "100 mcg",
                "frequency": "SOS (As needed)",
                "route": "Inhalation",
                "duration": "SOS",
                "indication": "Acute Bronchospasm Relief",
            },
        ],
        "labs": [
            {
                "test_name": "Peak Expiratory Flow (PEF)",
                "result": "210",
                "reference_unit": "L/min",
                "normal_range": "380 - 450",
                "status": "LOW",
            },
            {
                "test_name": "Absolute Eosinophil Count (AEC)",
                "result": "650",
                "reference_unit": "/uL",
                "normal_range": "40 - 400",
                "status": "HIGH",
            },
        ],
        "clinician_notes": "Acute exacerbation of bronchial asthma with moderate hypoxia (SpO2 91%). Administer humidified oxygen 2 L/min, back-to-back Salbutamol + Ipratropium nebulization, and IV hydrocortisone 100mg stat.",
    },
    {
        "email": "sunil.verma@patientpilot.org",
        "alt_email": None,
        "name": "Sunil Verma",
        "age": "45",
        "gender": "Male",
        "opd_reg_id": "OPD-2026-0003",
        "contact_number": "+91 97222 33445",
        "assigned_doctor_email": "dr.priya@patientpilot.org",
        "vitals": {
            "bp": "136/88",
            "pulse": "96 bpm",
            "temperature": "101.2 F",
            "spO2": "98%",
        },
        "chief_complaint": "Sharp right lower abdomen pain with fever and persistent nausea",
        "socrates": {
            "site": "Right Lower Quadrant (McBurney's Point)",
            "onset": "Acute onset 14 hours ago, started near navel then shifted to right side",
            "character": "Sharp, continuous stabbing and localized throbbing pain",
            "radiation": "Right groin",
            "associations": ["Fever", "Nausea", "Loss of appetite", "Rebound tenderness"],
            "timeDuration": "14 hours",
            "exacerbatingFactors": "Coughing, walking, pressure on right lower abdomen",
            "relievingFactors": "Curling knees to chest",
            "severity": 8,
        },
        "associated_symptoms": ["Nausea", "Fever", "Loss of appetite"],
        "chronic_conditions": ["None (No prior chronic illnesses)"],
        "is_ayush_active": False,
        "ayush_assessment": {
            "prakriti": "Pitta-Vata",
            "agniAharaShakti": "Vishamagni (Irregular)",
            "vyayamaShakti": "Madhyama (Moderate)",
            "satmya": "Mishra Satmya",
            "vaya": "Madhyama",
        },
        "language": "hi",
        "medications": [
            {
                "name": "Paracetamol",
                "dosage": "650 mg",
                "frequency": "SOS",
                "route": "Oral",
                "duration": "1 day",
                "indication": "Fever & Pain",
            }
        ],
        "labs": [
            {
                "test_name": "Total Leukocyte Count (WBC)",
                "result": "15200",
                "reference_unit": "/cu.mm",
                "normal_range": "4000 - 11000",
                "status": "HIGH",
            },
            {
                "test_name": "C-Reactive Protein (CRP)",
                "result": "54",
                "reference_unit": "mg/L",
                "normal_range": "0 - 5",
                "status": "HIGH",
            },
        ],
        "clinician_notes": "Acute abdomen presentation suspicious for Acute Appendicitis with marked neutrophilic leukocytosis. Keep NPO, start IV fluids, emergency bedside abdominal ultrasound and surgical consultation.",
    },
    {
        "email": "meera.patel@patientpilot.org",
        "alt_email": None,
        "name": "Meera Patel",
        "age": "62",
        "gender": "Female",
        "opd_reg_id": "OPD-2026-0004",
        "contact_number": "+91 99333 44556",
        "assigned_doctor_email": "dr.priya@patientpilot.org",
        "vitals": {
            "bp": "130/82",
            "pulse": "72 bpm",
            "temperature": "98.4 F",
            "spO2": "98%",
        },
        "chief_complaint": "Routine 3-month follow-up for diabetes and high blood pressure, mild tingling in feet",
        "socrates": {
            "site": "Bilateral Feet and Toes",
            "onset": "Insidious over past 3 months",
            "character": "Mild tingling, pins and needles sensation",
            "radiation": "Up to mid-ankle bilaterally",
            "associations": ["Occasional mild fatigue", "Postprandial sluggishness"],
            "timeDuration": "3 months",
            "exacerbatingFactors": "Prolonged standing",
            "relievingFactors": "Rest and foot elevation",
            "severity": 3,
        },
        "associated_symptoms": ["Mild fatigue", "Tingling in feet"],
        "chronic_conditions": ["Type 2 Diabetes Mellitus (8 years)", "Essential Hypertension (5 years)", "Dyslipidemia"],
        "is_ayush_active": True,
        "ayush_assessment": {
            "prakriti": "Kapha",
            "agniAharaShakti": "Mandagni (Slow)",
            "vyayamaShakti": "Madhyama (Moderate)",
            "satmya": "Madhura Satmya",
            "vaya": "Vriddha (Senior)",
        },
        "language": "en",
        "medications": [
            {
                "name": "Metformin Extended Release",
                "dosage": "1000 mg",
                "frequency": "BD (Twice daily)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Type 2 Diabetes",
            },
            {
                "name": "Glimepiride",
                "dosage": "2 mg",
                "frequency": "OD (Morning before food)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Type 2 Diabetes",
            },
            {
                "name": "Amlodipine",
                "dosage": "5 mg",
                "frequency": "OD (Once daily)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Hypertension",
            },
            {
                "name": "Atorvastatin",
                "dosage": "20 mg",
                "frequency": "HS (Nightly)",
                "route": "Oral",
                "duration": "Ongoing",
                "indication": "Hypercholesterolemia",
            },
        ],
        "labs": [
            {
                "test_name": "Glycated Hemoglobin (HbA1c)",
                "result": "8.1",
                "reference_unit": "%",
                "normal_range": "4.0 - 5.6",
                "status": "HIGH",
            },
            {
                "test_name": "Serum Creatinine",
                "result": "0.9",
                "reference_unit": "mg/dL",
                "normal_range": "0.6 - 1.2",
                "status": "NORMAL",
            },
            {
                "test_name": "Urine Microalbumin/Creatinine Ratio",
                "result": "45",
                "reference_unit": "mcg/mg",
                "normal_range": "< 30",
                "status": "HIGH",
            },
        ],
        "clinician_notes": "Chronic disease follow-up. Suboptimal glycemic control (HbA1c 8.1%) and early peripheral neuropathy + microalbuminuria. Add Methylcobalamin 1500mcg daily, review diet, consider initiating Dapagliflozin 10mg OD.",
    },
]


async def seed_demo_data():
    print("🌱 Starting PatientPilot database seeding with multi-doctor & multi-patient test cases...")

    async with engine.begin() as conn:
        # Ensure schema tables exist
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        created_doctors = {}

        # -------------------------------------------------------------
        # 1. SEED DOCTORS (3 DOCTORS)
        # -------------------------------------------------------------
        print("\n--- Provisioning Doctor Accounts ---")
        for doc_info in DOCTORS_DATA:
            email = doc_info["email"]
            doc_res = await session.execute(select(User).where(User.email == email))
            doctor_user = doc_res.scalar_one_or_none()

            if not doctor_user:
                doctor_user = User(
                    id=uuid.uuid4(),
                    email=email,
                    role=doc_info["role"],
                    full_name=doc_info["full_name"],
                    is_first_login=False,
                    last_login_at=datetime.now(timezone.utc),
                )
                session.add(doctor_user)
                await session.flush()
                print(f"✅ Created Doctor: {email} | {doc_info['full_name']}")
            else:
                print(f"ℹ️ Doctor already exists: {email} | {doctor_user.full_name}")

            created_doctors[email] = doctor_user

            # Also provision alternate alias if defined (e.g. dr.rajesh@...)
            alt_email = doc_info.get("alt_email")
            if alt_email:
                alt_res = await session.execute(select(User).where(User.email == alt_email))
                if not alt_res.scalar_one_or_none():
                    alt_user = User(
                        id=uuid.uuid4(),
                        email=alt_email,
                        role="doctor",
                        full_name=doc_info["full_name"],
                        is_first_login=False,
                        last_login_at=datetime.now(timezone.utc),
                    )
                    session.add(alt_user)
                    await session.flush()
                    print(f"   (Alias also provisioned: {alt_email})")

        # -------------------------------------------------------------
        # 2. SEED PATIENTS & CLINICAL DATA (4 PATIENTS)
        # -------------------------------------------------------------
        print("\n--- Provisioning Patient Accounts & Clinical Records ---")
        for pat_info in PATIENTS_DATA:
            pat_email = pat_info["email"]
            pat_res = await session.execute(select(User).where(User.email == pat_email))
            patient_user = pat_res.scalar_one_or_none()

            if not patient_user:
                patient_user = User(
                    id=uuid.uuid4(),
                    email=pat_email,
                    role="patient",
                    full_name=pat_info["name"],
                    is_first_login=False,
                    last_login_at=datetime.now(timezone.utc),
                )
                session.add(patient_user)
                await session.flush()
                print(f"✅ Created Patient User: {pat_email} ({pat_info['name']})")
            else:
                print(f"ℹ️ Patient user exists: {pat_email}")

            # Provision alternate alias email if defined
            alt_pat_email = pat_info.get("alt_email")
            if alt_pat_email:
                alt_pat_res = await session.execute(select(User).where(User.email == alt_pat_email))
                if not alt_pat_res.scalar_one_or_none():
                    alt_pat_user = User(
                        id=uuid.uuid4(),
                        email=alt_pat_email,
                        role="patient",
                        full_name=pat_info["name"],
                        is_first_login=False,
                        last_login_at=datetime.now(timezone.utc),
                    )
                    session.add(alt_pat_user)
                    await session.flush()
                    print(f"   (Alias provisioned: {alt_pat_email})")

            # 3. Patient Profile
            prof_res = await session.execute(
                select(PatientProfile).where(PatientProfile.user_id == patient_user.id)
            )
            profile = prof_res.scalar_one_or_none()

            if not profile:
                profile = PatientProfile(
                    id=uuid.uuid4(),
                    user_id=patient_user.id,
                    name=pat_info["name"],
                    age=pat_info["age"],
                    gender=pat_info["gender"],
                    opd_reg_id=pat_info["opd_reg_id"],
                    contact_number=pat_info["contact_number"],
                    vitals=pat_info["vitals"],
                )
                profile.fhir_json = fhir_service.build_patient_resource(profile)
                session.add(profile)
                await session.flush()
                print(f"   📋 Profile created: {profile.name} (OPD: {profile.opd_reg_id})")
            else:
                print(f"   📋 Profile already exists: {profile.name} ({profile.opd_reg_id})")

            # 4. Intake Session
            intake_res = await session.execute(
                select(IntakeSession).where(IntakeSession.patient_profile_id == profile.id)
            )
            intake = intake_res.scalars().first()

            if not intake:
                intake = IntakeSession(
                    id=uuid.uuid4(),
                    patient_profile_id=profile.id,
                    chief_complaint=pat_info["chief_complaint"],
                    socrates=pat_info["socrates"],
                    associated_symptoms=pat_info["associated_symptoms"],
                    chronic_conditions=pat_info["chronic_conditions"],
                    is_ayush_active=pat_info["is_ayush_active"],
                    ayush_assessment=pat_info["ayush_assessment"],
                    language=pat_info["language"],
                    status="completed",
                )
                session.add(intake)
                await session.flush()
                print(f"   🩺 Intake Session logged: {intake.chief_complaint[:40]}...")

                # 5. Medications
                for med_data in pat_info.get("medications", []):
                    med = Medication(
                        id=uuid.uuid4(),
                        intake_session_id=intake.id,
                        name=med_data["name"],
                        dosage=med_data["dosage"],
                        frequency=med_data["frequency"],
                        route=med_data["route"],
                        duration=med_data["duration"],
                        indication=med_data["indication"],
                    )
                    med.fhir_json = fhir_service.build_medication_statement_resource(med, profile.id)
                    session.add(med)

                # 6. Lab Values
                for lab_data in pat_info.get("labs", []):
                    lab = LabValue(
                        id=uuid.uuid4(),
                        intake_session_id=intake.id,
                        test_name=lab_data["test_name"],
                        result=lab_data["result"],
                        reference_unit=lab_data["reference_unit"],
                        normal_range=lab_data["normal_range"],
                        status=lab_data["status"],
                    )
                    lab.fhir_json = fhir_service.build_observation_resource(lab, profile.id)
                    session.add(lab)

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
                print(f"   🚨 Triage Level: {triage_res.triage_level}")

                # 8. Clinician Briefing (Assigned Doctor)
                assigned_doc = created_doctors.get(
                    pat_info.get("assigned_doctor_email"),
                    list(created_doctors.values())[0],
                )
                briefing = ClinicianBriefing(
                    id=uuid.uuid4(),
                    intake_session_id=intake.id,
                    clinician_notes=pat_info["clinician_notes"],
                    reviewed_by_user_id=assigned_doc.id,
                    reviewed_at=datetime.now(timezone.utc),
                )
                briefing.fhir_json = fhir_service.build_composition_resource(
                    briefing, intake, profile, assigned_doc.id
                )
                session.add(briefing)
                print(f"   📝 Briefing created & assigned to {assigned_doc.full_name}")

        await session.commit()

        print("\n" + "=" * 70)
        print("🎉 Seeding completed successfully!")
        print("=" * 70)
        print("\n👨‍⚕️ DOCTOR LOGIN IDs (Role: 'doctor' | Password: Any / Doctor@123):")
        for doc in DOCTORS_DATA:
            print(f"  • {doc['email']:<32} | {doc['full_name']}")
            if doc.get("alt_email"):
                print(f"    (Alias: {doc['alt_email']})")

        print("\n👤 PATIENT LOGIN IDs (Role: 'patient' | Password: Any / Patient@123):")
        for pat in PATIENTS_DATA:
            print(f"  • {pat['email']:<32} | {pat['name']:<15} | OPD: {pat['opd_reg_id']} | Chief: {pat['chief_complaint'][:30]}...")
            if pat.get("alt_email"):
                print(f"    (Alias: {pat['alt_email']})")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
