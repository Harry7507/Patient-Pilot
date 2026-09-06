import io
import os
import uuid
import logging
from typing import Optional, Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


class OCRService:
    """
    Handles file verification, upload to storage (Supabase Storage bucket),
    and preparation of raw image/document data for entity extraction.
    """

    def __init__(self):
        self.bucket_name = "medical_documents"

    async def save_file(self, file_bytes: bytes, file_name: str, content_type: str) -> str:
        """
        Saves document to Supabase Storage if configured; otherwise saves to local storage directory.
        Returns the persistent storage path.
        """
        unique_name = f"{uuid.uuid4()}_{file_name}"
        storage_path = f"uploads/{unique_name}"

        # Attempt Supabase Storage upload if service key is configured
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client
                client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                client.storage.from_(self.bucket_name).upload(storage_path, file_bytes, {"content-type": content_type})
                return f"supabase://{self.bucket_name}/{storage_path}"
            except Exception as e:
                logger.warning(f"Supabase storage upload failed, falling back to local storage: {e}")

        # Local storage fallback
        os.makedirs("uploads", exist_ok=True)
        local_path = os.path.join("uploads", unique_name)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return local_path


ocr_service = OCRService()
