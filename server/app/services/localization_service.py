import logging
from typing import Dict, Any, Optional
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

# Complete list of 23 scheduled + medical languages matching src/types/clinical.ts
SUPPORTED_LANGUAGES: Dict[str, Dict[str, str]] = {
    "en": {"name": "English", "native": "English", "zone": "Pan-India"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "zone": "North & Central"},
    "bn": {"name": "Bengali", "native": "বাংলা", "zone": "East & North-East"},
    "te": {"name": "Telugu", "native": "తెలుగు", "zone": "South"},
    "mr": {"name": "Marathi", "native": "मराठी", "zone": "West"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "zone": "South"},
    "ur": {"name": "Urdu", "native": "اردو", "zone": "North & Central"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "zone": "West"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "zone": "South"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "zone": "South"},
    "or": {"name": "Odia", "native": "ଓଡ଼ିଆ", "zone": "East & North-East"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "zone": "North & Central"},
    "as": {"name": "Assamese", "native": "অসমীয়া", "zone": "East & North-East"},
    "mai": {"name": "Maithili", "native": "मैथिली", "zone": "North & Central"},
    "sat": {"name": "Santali", "native": "ᱥᱟᱱᱛᱟᱲᱤ", "zone": "East & North-East"},
    "ks": {"name": "Kashmiri", "native": "کٲشُر", "zone": "North & Central"},
    "ne": {"name": "Nepali", "native": "नेपाली", "zone": "East & North-East"},
    "kok": {"name": "Konkani", "native": "कोंकणी", "zone": "West"},
    "sd": {"name": "Sindhi", "native": "سنڌي", "zone": "West"},
    "doi": {"name": "Dogri", "native": "डोगरी", "zone": "North & Central"},
    "mni": {"name": "Manipuri", "native": "মৈতৈলোন্", "zone": "East & North-East"},
    "brx": {"name": "Bodo", "native": "बड़ो", "zone": "East & North-East"},
    "sa": {"name": "Sanskrit", "native": "संस्कृतम्", "zone": "Pan-India"},
}

# Pre-localized common clinical phrases for instantaneous response without LLM latency
STANDARD_LOCALIZED_PHRASES: Dict[str, Dict[str, str]] = {
    "welcome": {
        "en": "Welcome to PatientPilot OPD Intake. Please describe your symptoms.",
        "hi": "पेशेंटपायलट ओपीडी में आपका स्वागत है। कृपया अपने लक्षणों का वर्णन करें।",
        "bn": "পেশেন্টপাইলট ওপিডিতে স্বাগতম। অনুগ্রহ করে আপনার লক্ষণগুলি জানান।",
    },
    "emergency_warning": {
        "en": "CRITICAL RED-FLAG DETECTED: Please do not wait in queue. An emergency physician is being alerted.",
        "hi": "गंभीर आपातकालीन लक्षण पाया गया है: कृपया कतार में प्रतीक्षा न करें। आपातकालीन चिकित्सक को सूचित किया जा रहा है।",
        "bn": "জরুরি লাল লক্ষণ শনাক্ত হয়েছে: দয়া করে লাইনে অপেক্ষা করবেন না। জরুরি চিকিৎসককে জানানো হচ্ছে।",
    },
}


class LocalizationService:
    """Centralized multilingual translation & localization service for PatientPilot."""

    def is_supported(self, lang_code: str) -> bool:
        return lang_code in SUPPORTED_LANGUAGES

    def get_language_meta(self, lang_code: str) -> Dict[str, str]:
        return SUPPORTED_LANGUAGES.get(lang_code, SUPPORTED_LANGUAGES["en"])

    def get_fallback_text(
        self, translations: Dict[str, str], lang: str, fallback_text: str = ""
    ) -> str:
        """Returns translated string according to regional -> Hindi -> English fallback chain."""
        if not translations:
            return fallback_text
        if lang in translations and translations[lang]:
            return translations[lang]
        if "hi" in translations and lang != "en" and translations["hi"]:
            return translations["hi"]
        if "en" in translations and translations["en"]:
            return translations["en"]
        return next(iter(translations.values()), fallback_text)

    async def translate_text(
        self, text: str, target_lang: str, source_lang: str = "en"
    ) -> str:
        """
        Translates text into the target LanguageCode using the backend LLM client.
        Preserves clinical precision, drug names, and vital ranges.
        """
        if not text or target_lang == source_lang or target_lang == "en":
            return text

        lang_meta = self.get_language_meta(target_lang)
        target_lang_name = lang_meta["name"]
        target_lang_native = lang_meta["native"]

        if not llm_client.is_available:
            # Fallback if no LLM key: return original text
            return text

        prompt = (
            f"You are a medical translator for an Indian OPD hospital kiosk. "
            f"Translate the following clinical text into {target_lang_name} ({target_lang_native}).\n"
            f"- Ensure clinical and anatomical terms are clear and compassionate.\n"
            f"- Keep medication names and numerical values intact.\n"
            f"- Return ONLY the translated text without notes, quotes, or markdown wrappers.\n\n"
            f"Original text ({source_lang}):\n{text}"
        )

        translated = await llm_client.generate_text(prompt)
        return translated.strip() or text


localization_service = LocalizationService()
