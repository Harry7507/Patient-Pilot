import sys
import os
import pytest
import httpx
import uuid

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app
from app.database import engine
from scripts.seed_demo import seed_demo_data

@pytest.fixture(autouse=True)
async def setup_e2e_db():
    await seed_demo_data()
    yield
    await engine.dispose()

@pytest.mark.asyncio
async def test_full_doctor_and_patient_e2e_cycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1", timeout=15.0) as client:
        # 1. Doctor Login
        doc_login_res = await client.post("/auth/login", json={
            "email": "doctor@patientpilot.org",
            "password": "DoctorPass123!"
        })
        assert doc_login_res.status_code == 200, f"Doctor login failed: {doc_login_res.text}"
        doc_data = doc_login_res.json()
        doc_token = doc_data["access_token"]
        doc_refresh = doc_data["refresh_token"]
        assert doc_data["role"] == "doctor"
        assert doc_data["user"]["role"] == "doctor"

        doc_headers = {"Authorization": f"Bearer {doc_token}"}

        # 2. Doctor fetches queue
        briefings_res = await client.get("/doctor/briefings", headers=doc_headers)
        assert briefings_res.status_code == 200, f"List briefings failed: {briefings_res.text}"
        briefings = briefings_res.json()
        assert len(briefings) >= 4, f"Expected at least 4 briefings, found {len(briefings)}"
        
        # Verify briefing queue schema
        first_b = briefings[0]
        assert "patient_name" in first_b
        assert "opd_reg_id" in first_b
        assert "triage_level" in first_b
        assert "chief_complaint" in first_b

        # 3. Doctor filters by EMERGENCY
        em_res = await client.get("/doctor/briefings?triage_level=EMERGENCY", headers=doc_headers)
        assert em_res.status_code == 200
        em_briefings = em_res.json()
        for b in em_briefings:
            assert b["triage_level"] == "EMERGENCY"

        # 4. Doctor loads full briefing detail
        target_briefing_id = briefings[0]["id"]
        detail_res = await client.get(f"/doctor/briefings/{target_briefing_id}", headers=doc_headers)
        assert detail_res.status_code == 200, f"Get briefing detail failed: {detail_res.text}"
        detail = detail_res.json()
        assert "patient" in detail
        assert "chief_complaint" in detail
        assert "socrates" in detail
        assert "active_medications" in detail
        assert "abnormal_labs" in detail
        assert "triage" in detail

        # 5. Doctor signs off briefing
        notes_text = "Clinical examination complete. Approved prescription plan."
        signoff_res = await client.patch(
            f"/doctor/briefings/{target_briefing_id}",
            json={"clinician_notes": notes_text, "reviewed": True},
            headers=doc_headers
        )
        assert signoff_res.status_code == 200
        updated = signoff_res.json()
        assert updated["clinician_notes"] == notes_text
        assert updated["reviewed_at"] is not None

        # 6. Session Persistence / Token Refresh
        refresh_res = await client.post("/auth/refresh", json={"refresh_token": doc_refresh})
        assert refresh_res.status_code == 200
        new_tokens = refresh_res.json()
        assert "access_token" in new_tokens
        assert new_tokens["role"] == "doctor"

        # 7. Patient Login
        pat_login_res = await client.post("/auth/login", json={
            "email": "patient@patientpilot.org",
            "password": "PatientPass123!"
        })
        assert pat_login_res.status_code == 200
        pat_data = pat_login_res.json()
        pat_token = pat_data["access_token"]
        pat_user_id = pat_data["user"]["id"]
        assert pat_data["role"] == "patient"
        pat_headers = {"Authorization": f"Bearer {pat_token}"}

        # 8. Invariant check: Patient CANNOT access doctor queue (Strict role protection)
        pat_doc_res = await client.get("/doctor/briefings", headers=pat_headers)
        assert pat_doc_res.status_code == 403, f"Patient should be forbidden from doctor dashboard: {pat_doc_res.status_code}"

        # 9. Patient profile lookup by user.id
        profile_res = await client.get(f"/patients/{pat_user_id}", headers=pat_headers)
        assert profile_res.status_code == 200, f"Failed to get patient profile by user id: {profile_res.text}"
        profile = profile_res.json()
        assert profile["name"] is not None
        assert profile["opd_reg_id"] is not None

        # 10. Patient completes an intake session
        session_res = await client.post(
            f"/patients/{profile['id']}/intake-sessions",
            json={
                "chief_complaint": "Acute headache with nausea and light sensitivity",
                "socrates": {
                    "site": "Temporal & Frontal",
                    "onset": "Sudden onset 3 hours ago",
                    "character": "Throbbing pulsating pain",
                    "radiation": "None",
                    "associations": ["Nausea", "Photophobia"],
                    "severity": 8,
                    "exacerbatingFactors": "Bright lights and noise",
                },
                "associated_symptoms": ["Nausea", "Photophobia"],
                "chronic_conditions": ["Migraine"],
                "is_ayush_active": False,
                "language": "en",
                "status": "completed"
            },
            headers=pat_headers
        )
        assert session_res.status_code == 201
        new_session = session_res.json()
        new_session_id = new_session["id"]

        # Add medication
        med_res = await client.post(
            f"/intake-sessions/{new_session_id}/medications",
            json={
                "name": "Sumatriptan",
                "dosage": "50mg",
                "frequency": "SOS",
                "route": "Oral",
                "indication": "Acute migraine attack"
            },
            headers=pat_headers
        )
        assert med_res.status_code == 201

        # Add lab value
        lab_res = await client.post(
            f"/intake-sessions/{new_session_id}/lab-values",
            json={
                "test_name": "Blood Pressure",
                "result": "130/85",
                "reference_unit": "mmHg",
                "status": "NORMAL"
            },
            headers=pat_headers
        )
        assert lab_res.status_code == 201

        # Authoritative server-side triage evaluation (creates ClinicianBriefing)
        triage_res = await client.post(f"/intake-sessions/{new_session_id}/triage", headers=pat_headers)
        assert triage_res.status_code == 200
        triage_info = triage_res.json()
        assert "triage_level" in triage_info

        # 11. Verify Doctor now sees this new intake session in their queue
        updated_briefings_res = await client.get("/doctor/briefings", headers=doc_headers)
        assert updated_briefings_res.status_code == 200
        updated_briefings = updated_briefings_res.json()
        
        matching = [b for b in updated_briefings if b["intake_session_id"] == new_session_id]
        assert len(matching) == 1, "New patient intake briefing must be immediately visible in doctor queue"
        assert matching[0]["patient_name"] == profile["name"]
        assert "headache" in matching[0]["chief_complaint"].lower()
