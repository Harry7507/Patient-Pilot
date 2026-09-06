import io
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from app.config import settings
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)


class SpeechToTextProvider(ABC):
    """Abstract interface for Speech-to-Text providers."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str, language: str = "en") -> Dict[str, Any]:
        """
        Accepts raw audio bytes and MIME type, returns dictionary with:
        - transcript: str
        - language: str
        - duration_seconds: Optional[float]
        """
        pass


class GeminiMultimodalSpeechProvider(SpeechToTextProvider):
    """Transcribes audio using Gemini Multimodal Audio capability."""

    async def transcribe(self, audio_bytes: bytes, mime_type: str, language: str = "en") -> Dict[str, Any]:
        if not llm_client.is_available:
            return {
                "transcript": "Audio received (STT simulated: patient reported mild symptoms).",
                "language": language,
                "duration_seconds": 3.0,
            }

        try:
            from google.genai import types

            prompt = (
                f"You are a clinical speech-to-text transcriber for an OPD hospital intake. "
                f"Transcribe the patient's spoken words accurately in the spoken language (preferred language: {language}). "
                f"Output ONLY the exact transcript text without formatting, explanations, or quotes."
            )
            part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)

            response = llm_client._client.models.generate_content(
                model=llm_client.model_name,
                contents=[prompt, part],
            )
            transcript = (response.text or "").strip()
            return {
                "transcript": transcript,
                "language": language,
                "duration_seconds": None,
            }
        except Exception as e:
            logger.error(f"Gemini speech transcription failed: {e}")
            return {
                "transcript": f"Speech transcription error: {str(e)}",
                "language": language,
                "duration_seconds": None,
            }


class MockSpeechProvider(SpeechToTextProvider):
    """Fallback mock speech provider for testing without external keys."""

    async def transcribe(self, audio_bytes: bytes, mime_type: str, language: str = "en") -> Dict[str, Any]:
        return {
            "transcript": "Patient reported chest pain and shortness of breath starting two hours ago.",
            "language": language,
            "duration_seconds": 2.5,
        }


def get_speech_service() -> SpeechToTextProvider:
    """Factory function returning the configured speech provider."""
    if llm_client.is_available:
        return GeminiMultimodalSpeechProvider()
    return MockSpeechProvider()


speech_service = get_speech_service()
