from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


def evaluate_deterministic_safety(
    chief_complaint: str,
    socrates: Optional[Dict[str, Any]] = None,
    associated_symptoms: Optional[List[str]] = None,
    vitals: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Authoritative server-side evaluation of the Deterministic Red-Flag Safety Matrix.
    Strictly ported from src/services/safetyMatrix.ts.
    """
    socrates = socrates or {}
    associated_symptoms = associated_symptoms or []

    triggered_rules: List[Dict[str, Any]] = []

    text_pool = " ".join([
        chief_complaint or "",
        socrates.get("site") or "",
        socrates.get("character") or "",
        socrates.get("radiation") or "",
        socrates.get("onset") or "",
        socrates.get("timeDuration") or "",
        *associated_symptoms,
    ]).lower()

    def has_terms(terms: List[str]) -> bool:
        return any(term.lower() in text_pool for term in terms)

    # 1. CARDIAC RED FLAG (RULE_ACS_01):
    has_chest_pain = has_terms([
        "chest pain", "chest tightness", "chest pressure", "heavy chest",
        "angina", "crushing chest", "heart pain", "chhati me dard", "chhati dard", "buke betha"
    ])
    has_dyspnea = has_terms([
        "dyspnea", "shortness of breath", "breathlessness", "difficulty breathing",
        "gasping", "cant breathe", "saans lene me taklif", "dom bondho"
    ])
    has_radiation = has_terms([
        "left arm", "arm", "jaw", "neck", "shoulder", "back", "radiation to arm", "radiation to jaw"
    ])

    if has_chest_pain and (has_dyspnea or has_radiation):
        matched = ["Chest Pain / Tightness"]
        if has_dyspnea:
            matched.append("Dyspnea / Breathlessness")
        if has_radiation:
            matched.append("Radiation to arm/jaw/shoulder")
        triggered_rules.append({
            "ruleId": "RULE_ACS_01",
            "ruleDescription": "Suspected Acute Coronary Syndrome (Chest pain with dyspnea and/or radiation)",
            "matchedCriteria": matched,
            "level": "EMERGENCY"
        })

    # 2. NEUROLOGICAL ACUTE DEFICIT (RULE_STROKE_02):
    has_sudden_weakness = has_terms([
        "sudden weakness", "unilateral weakness", "arm weakness", "leg weakness",
        "one side weak", "loss of power", "paralysis", "kamzori sudden", "adho ongo"
    ])
    has_facial_droop = has_terms([
        "facial droop", "face drooping", "crooked smile", "face numbness", "droop"
    ])
    has_slurred_speech = has_terms([
        "slurred speech", "slurring", "unable to speak", "difficulty speaking",
        "bolne me taklif", "kotha bolte na para", "aphasia"
    ])

    if has_sudden_weakness or has_facial_droop or has_slurred_speech:
        matched = []
        if has_sudden_weakness:
            matched.append("Sudden Unilateral Weakness")
        if has_facial_droop:
            matched.append("Facial Drooping")
        if has_slurred_speech:
            matched.append("Slurred or Lost Speech")
        triggered_rules.append({
            "ruleId": "RULE_STROKE_02",
            "ruleDescription": "Suspected Acute Neurological Deficit (Sudden weakness, facial droop, or slurred speech)",
            "matchedCriteria": matched,
            "level": "EMERGENCY"
        })

    # 3. AIRWAY / RESPIRATORY STRIDOR & CHOKING (RULE_AIRWAY_03):
    has_airway_compromise = has_terms([
        "stridor", "choking", "throat closing", "gasping for air", "cyanosis", "blue lips", "severe wheeze"
    ])
    if has_airway_compromise:
        triggered_rules.append({
            "ruleId": "RULE_AIRWAY_03",
            "ruleDescription": "Acute Stridor / Severe Airway Obstruction",
            "matchedCriteria": ["Stridor or Acute Choking / Cyanosis"],
            "level": "EMERGENCY"
        })

    # 4. SUDDEN SEVERE "THUNDERCLAP" HEADACHE (RULE_SAH_04):
    has_thunderclap_headache = has_terms([
        "thunderclap", "worst headache of life", "sudden severe headache", "explosive headache", "sudden intense head pain"
    ])
    if has_thunderclap_headache:
        triggered_rules.append({
            "ruleId": "RULE_SAH_04",
            "ruleDescription": "Suspected Subarachnoid Hemorrhage (Sudden severe 'thunderclap' headache)",
            "matchedCriteria": ["Worst sudden onset headache"],
            "level": "EMERGENCY"
        })

    # 5. MENINGEAL / CNS INFECTION RED FLAG (RULE_MENINGISM_05):
    has_high_fever = has_terms([
        "high fever", "severe fever", "103", "104", "shivering fever", "high grade fever", "tez bukhar", "jor"
    ])
    has_neck_stiffness = has_terms([
        "neck stiffness", "stiff neck", "cannot bend neck", "gardan akdan", "neck rigid", "neck with stiffness", "stiffness"
    ])

    if has_high_fever and has_neck_stiffness:
        triggered_rules.append({
            "ruleId": "RULE_MENINGISM_05",
            "ruleDescription": "Suspected Meningeal Irritation (High fever with neck stiffness)",
            "matchedCriteria": ["High-Grade Fever", "Nuchal Rigidity / Stiff Neck"],
            "level": "HIGH_PRIORITY"
        })

    # 6. SEVERE PAIN WITH HIGH ACUITY (RULE_ACUTE_PAIN_06):
    severity = socrates.get("severity")
    if severity is not None:
        try:
            severity_num = int(severity)
            if severity_num >= 9 and not any(r["level"] == "EMERGENCY" for r in triggered_rules):
                triggered_rules.append({
                    "ruleId": "RULE_ACUTE_PAIN_06",
                    "ruleDescription": "Intractable Acute Pain (Rated 9/10 or 10/10)",
                    "matchedCriteria": [f"Severity score {severity_num}/10"],
                    "level": "HIGH_PRIORITY"
                })
        except (ValueError, TypeError):
            pass

    # Determine highest priority level
    final_level = "ROUTINE"
    if any(r["level"] == "EMERGENCY" for r in triggered_rules):
        final_level = "EMERGENCY"
    elif any(r["level"] == "HIGH_PRIORITY" for r in triggered_rules):
        final_level = "HIGH_PRIORITY"

    # Actions and Reasons
    reason = "Routine intake evaluated. Standard OPD consultation recommended."
    action_required = "Proceed through standard queue for doctor consultation."

    if final_level == "EMERGENCY":
        emergency_rules = [r["ruleDescription"] for r in triggered_rules if r["level"] == "EMERGENCY"]
        reason = f"Critical Red-Flag Identified: {'; '.join(emergency_rules)}"
        action_required = (
            "IMMEDIATE CLINICAL ESCALATION REQUIRED. Transfer patient immediately to Resuscitation / "
            "Emergency Triage Room. Alert on-duty physician & nurse immediately."
        )
    elif final_level == "HIGH_PRIORITY":
        hp_rules = [r["ruleDescription"] for r in triggered_rules]
        reason = f"High-Priority Clinical Marker Identified: {'; '.join(hp_rules)}"
        action_required = "Fast-track OPD queue. Escort patient to priority evaluation bay within 15 minutes."

    return {
        "triage_level": final_level,
        "triggered_rules": triggered_rules,
        "reason": reason,
        "action_required": action_required,
        "evaluated_at": datetime.now(timezone.utc),
    }
