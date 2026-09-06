import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.ai import (
    IntakeChatRequest,
    IntakeChatResponse,
    AyushAssessmentRequest,
    AyushAssessmentResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.llm_client import llm_client
from app.services.localization_service import localization_service
from app.services.safety_matrix import evaluate_deterministic_safety

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intake", tags=["AI & Clinical Reasoning"])


@router.post("/chat", response_model=IntakeChatResponse)
async def intake_chat(
    payload: IntakeChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Conversational AI intake reasoning endpoint.
    Processes patient inputs, extracts SOCRATES history elements,
    and returns localized empathetic clinical prompts.
    """
    lang = payload.language or "en"
    user_msg = payload.user_message

    # 1. Immediate Safety Pre-check
    triage_check = evaluate_deterministic_safety(
        chief_complaint=user_msg,
        socrates=payload.extracted_socrates.model_dump() if payload.extracted_socrates else {},
        associated_symptoms=[user_msg],
    )
    is_emergency = triage_check["triage_level"] == "EMERGENCY"

    if is_emergency:
        warning_en = (
            "CRITICAL WARNING: The symptoms you described indicate a potential medical emergency. "
            "Please alert the nearest healthcare staff or proceed immediately to the emergency triage room."
        )
        localized_warning = await localization_service.translate_text(warning_en, lang)
        return IntakeChatResponse(
            agent_message=warning_en,
            localized_message=localized_warning,
            language=lang,
            suggested_options=["Immediate Emergency Assistance", "Speak to Nurse"],
            is_emergency=True,
        )

    # 2. LLM Clinical Reasoning
    if llm_client.is_available:
        prompt = f"""You are PatientPilot Clinical Intake Assistant at an OPD Hospital Kiosk.
The patient is communicating their symptoms. Current step: {payload.current_step_id or 'General Intake'}.
Language preference: {lang}.
Patient message: "{user_msg}"

Tasks:
1. Provide a warm, concise (1-2 sentences) empathetic acknowledgment and ask the appropriate next clinical follow-up question according to the SOCRATES pain/symptom history protocol (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating factors, Severity).
2. Extract any newly identified SOCRATES details from their message.
3. Suggest 3-4 quick-select response chips for the kiosk screen.

Return ONLY a valid JSON object matching:
{{
  "agent_message": "clinical follow-up question in English",
  "suggested_options": ["option 1", "option 2", "option 3"],
  "extracted_socrates_delta": {{
    "site": null,
    "onset": null,
    "character": null,
    "radiation": null,
    "timeDuration": null,
    "severity": null
  }},
  "next_step_id": "socrates_step_name"
}}"""
        try:
            res = await llm_client.generate_structured_json(prompt)
            if res and "agent_message" in res:
                agent_msg = res["agent_message"]
                localized_msg = await localization_service.translate_text(agent_msg, lang)
                return IntakeChatResponse(
                    agent_message=agent_msg,
                    localized_message=localized_msg,
                    language=lang,
                    suggested_options=res.get("suggested_options", ["Yes", "No", "Unsure"]),
                    extracted_socrates_delta=res.get("extracted_socrates_delta"),
                    next_step_id=res.get("next_step_id"),
                    is_emergency=False,
                )
        except Exception as e:
            logger.warning(f"LLM intake reasoning failed: {e}")

    # Fallback rule-based response
    fallback_en = f"Thank you for sharing. Could you tell me more about where you feel this discomfort and how long it has lasted?"
    fallback_loc = await localization_service.translate_text(fallback_en, lang)
    return IntakeChatResponse(
        agent_message=fallback_en,
        localized_message=fallback_loc,
        language=lang,
        suggested_options=["Mild", "Moderate", "Severe", "Started Today"],
        is_emergency=False,
    )


@router.post("/ayush", response_model=AyushAssessmentResponse)
async def ayush_assessment(
    payload: AyushAssessmentRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Ayurvedic / Dashavidha Pariksha assessment.
    Computes Prakriti constitution, digestive fire (Agni), and holistic lifestyle advice.
    """
    lang = payload.language or "en"
    factors = payload.factors.model_dump(exclude_none=True)

    summary_parts = []
    if factors.get("prakriti"):
        summary_parts.append(f"Constitutional Tendency (Prakriti): {factors['prakriti']}")
    if factors.get("agniAharaShakti"):
        summary_parts.append(f"Digestive Capacity (Agni): {factors['agniAharaShakti']}")
    if factors.get("vyayamaShakti"):
        summary_parts.append(f"Physical Endurance: {factors['vyayamaShakti']}")
    if factors.get("satmya"):
        summary_parts.append(f"Dietary Compatibility (Satmya): {factors['satmya']}")

    base_summary = " | ".join(summary_parts) or "Balanced Dosha Profile (Samadosha)"

    # Determine dosha profile
    prakriti = factors.get("prakriti", "Tridosha")

    dietary = [
        "Drink warm water infused with ginger and cumin to maintain balanced Agni.",
        "Favor freshly cooked, light, and seasonal vegetables; avoid overly stale or refrigerated foods.",
        "Maintain regular meal times aligned with circadian rhythms.",
    ]
    lifestyle = [
        "Engage in moderate morning pranayama (Anulom Vilom and Bhramari).",
        "Maintain regular sleep hygiene (Nidra) - avoid late night meals.",
        "Avoid strenuous physical exertion immediately after eating.",
    ]

    localized_summary = await localization_service.translate_text(base_summary, lang)

    return AyushAssessmentResponse(
        summary=base_summary,
        localized_summary=localized_summary,
        dosha_profile=prakriti,
        dietary_guidelines=dietary,
        lifestyle_recommendations=lifestyle,
    )


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    payload: TranslateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Translates clinical content into any of the 23 constitutional and regional languages.
    """
    if not localization_service.is_supported(payload.target_language):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language code '{payload.target_language}'.",
        )

    translated = await localization_service.translate_text(
        text=payload.text,
        target_lang=payload.target_language,
        source_lang=payload.source_language or "en",
    )

    return TranslateResponse(
        original_text=payload.text,
        translated_text=translated,
        target_language=payload.target_language,
    )
