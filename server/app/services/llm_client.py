import json
import logging
from typing import Optional, Dict, Any, List
from app.config import settings

logger = logging.getLogger(__name__)

# Try to import Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai SDK not installed. Falling back to local offline reasoning.")


class LLMClient:
    """
    Unified backend LLM client wrapping Google GenAI / Gemini API key.
    All LLM calls (chat-based intake reasoning, AYUSH/Dashavidha assessment,
    clinical summarization, OCR entity structuring) route through this service.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY
        self.model_name = model or settings.LLM_MODEL
        self._client = None

        if GENAI_AVAILABLE and self.api_key and self.api_key.strip():
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Google GenAI client: {e}")
                self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text from a prompt."""
        if not self.is_available:
            return "Local AI Fallback: Google GenAI client is not configured with an API key."

        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ) if system_instruction else None

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Error calling LLM generate_text: {e}")
            return f"Error communicating with AI service: {str(e)}"

    async def generate_structured_json(
        self, prompt: str, schema: Optional[Dict[str, Any]] = None, system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate and parse structured JSON from LLM."""
        if not self.is_available:
            return {}

        try:
            json_instruction = (
                (system_instruction + "\n" if system_instruction else "")
                + "Return ONLY a valid, raw JSON object matching the requested schema. Do not enclose in markdown code blocks or backticks."
            )
            config = types.GenerateContentConfig(
                system_instruction=json_instruction,
                response_mime_type="application/json",
                temperature=0.1,
            )

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            text = (response.text or "").strip()
            # Clean possible markdown wrap
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Error in generate_structured_json: {e}")
            return {}

    async def generate_multimodal_json(
        self, prompt: str, mime_type: str, image_bytes: bytes
    ) -> Dict[str, Any]:
        """Process multimodal content (e.g. medical image) and return structured JSON."""
        if not self.is_available:
            return {}

        try:
            part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=[prompt, part],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            text = (response.text or "").strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Error in generate_multimodal_json: {e}")
            return {}


llm_client = LLMClient()
