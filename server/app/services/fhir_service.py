from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from uuid import UUID


class FHIRService:
    """
    Transforms internal PatientPilot entities into FHIR R4-styled JSON documents.
    Ensures hospital EMR and insurer interoperability.
    """

    @staticmethod
    def build_patient_resource(patient_profile) -> Dict[str, Any]:
        """Creates FHIR 'Patient' resource."""
        vitals = patient_profile.vitals or {}
        return {
            "resourceType": "Patient",
            "id": str(patient_profile.id),
            "identifier": [
                {
                    "system": "urn:oid:patientpilot:opd_reg_id",
                    "value": patient_profile.opd_reg_id,
                }
            ],
            "name": [{"use": "official", "text": patient_profile.name}],
            "gender": (patient_profile.gender or "unknown").lower(),
            "telecom": [
                {"system": "phone", "value": patient_profile.contact_number}
            ] if patient_profile.contact_number else [],
            "extension": [
                {
                    "url": "http://patientpilot.org/fhir/StructureDefinition/patient-age",
                    "valueString": str(patient_profile.age),
                },
                {
                    "url": "http://patientpilot.org/fhir/StructureDefinition/intake-vitals",
                    "valueQuantity": vitals,
                },
            ],
        }

    @staticmethod
    def build_condition_resource(
        condition_name: str, patient_id: UUID, session_id: UUID, status: str = "active"
    ) -> Dict[str, Any]:
        """Creates FHIR 'Condition' resource."""
        return {
            "resourceType": "Condition",
            "id": f"cond-{abs(hash(condition_name))}",
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": status,
                    }
                ]
            },
            "code": {"text": condition_name},
            "subject": {"reference": f"Patient/{patient_id}"},
            "encounter": {"reference": f"Encounter/{session_id}"},
        }

    @staticmethod
    def build_medication_statement_resource(medication, patient_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Creates FHIR 'MedicationStatement' resource."""
        return {
            "resourceType": "MedicationStatement",
            "id": str(medication.id),
            "status": "active",
            "medicationCodeableConcept": {"text": medication.name},
            "subject": {"reference": f"Patient/{patient_id}"} if patient_id else None,
            "dosage": [
                {
                    "text": f"{medication.dosage} {medication.frequency}",
                    "route": {"text": medication.route or "Oral"},
                    "timing": {"code": {"text": medication.frequency}},
                }
            ],
            "reasonCode": [{"text": medication.indication}] if medication.indication else [],
        }

    @staticmethod
    def build_observation_resource(lab_value, patient_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Creates FHIR 'Observation' resource."""
        interpretation = "N"
        if lab_value.status == "HIGH":
            interpretation = "H"
        elif lab_value.status == "LOW":
            interpretation = "L"
        elif lab_value.status == "CRITICAL":
            interpretation = "AA"

        return {
            "resourceType": "Observation",
            "id": str(lab_value.id),
            "status": "final",
            "code": {"text": lab_value.test_name},
            "subject": {"reference": f"Patient/{patient_id}"} if patient_id else None,
            "valueQuantity": {
                "value": lab_value.result,
                "unit": lab_value.reference_unit,
            },
            "referenceRange": [
                {"text": lab_value.normal_range or "Standard Reference Range"}
            ],
            "interpretation": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": interpretation,
                            "display": lab_value.status,
                        }
                    ]
                }
            ],
        }

    @staticmethod
    def build_composition_resource(
        briefing, session, patient_profile, doctor_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Creates FHIR 'Composition' summary resource."""
        return {
            "resourceType": "Composition",
            "id": str(briefing.id),
            "status": "final" if briefing.reviewed_at else "preliminary",
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "11488-4",
                        "display": "Consultation note",
                    }
                ]
            },
            "subject": {"reference": f"Patient/{patient_profile.id}", "display": patient_profile.name},
            "date": (briefing.reviewed_at or datetime.now(timezone.utc)).isoformat(),
            "author": [{"reference": f"Practitioner/{doctor_id}"}] if doctor_id else [],
            "title": "PatientPilot OPD Intake & Clinical Briefing",
            "section": [
                {
                    "title": "Chief Complaint & History of Present Illness (SOCRATES)",
                    "text": {
                        "status": "generated",
                        "div": f"<div><p><b>Complaint:</b> {session.chief_complaint}</p></div>",
                    },
                },
                {
                    "title": "Clinician Review Notes",
                    "text": {
                        "status": "generated",
                        "div": f"<div><p>{briefing.clinician_notes or 'Pending review'}</p></div>",
                    },
                },
            ],
        }

    @staticmethod
    def assemble_session_bundle(session) -> Dict[str, Any]:
        """Assembles a full FHIR 'Bundle' (collection) containing all resources for a session."""
        entries: List[Dict[str, Any]] = []
        patient = session.patient_profile

        # 1. Patient
        if patient:
            p_res = FHIRService.build_patient_resource(patient)
            entries.append({"fullUrl": f"urn:uuid:{patient.id}", "resource": p_res})

        # 2. Chronic Conditions
        for cond in session.chronic_conditions or []:
            c_res = FHIRService.build_condition_resource(cond, session.patient_profile_id, session.id)
            entries.append({"fullUrl": f"urn:uuid:{c_res['id']}", "resource": c_res})

        # 3. Medications
        for med in session.medications or []:
            m_res = FHIRService.build_medication_statement_resource(med, session.patient_profile_id)
            entries.append({"fullUrl": f"urn:uuid:{med.id}", "resource": m_res})

        # 4. Lab Values
        for lab in session.lab_values or []:
            l_res = FHIRService.build_observation_resource(lab, session.patient_profile_id)
            entries.append({"fullUrl": f"urn:uuid:{lab.id}", "resource": l_res})

        # 5. Composition (if briefing exists)
        if session.briefing and patient:
            comp_res = FHIRService.build_composition_resource(
                session.briefing, session, patient, session.briefing.reviewed_by_user_id
            )
            entries.append({"fullUrl": f"urn:uuid:{session.briefing.id}", "resource": comp_res})

        return {
            "resourceType": "Bundle",
            "id": f"bundle-{session.id}",
            "type": "collection",
            "total": len(entries),
            "entry": entries,
        }


fhir_service = FHIRService()
