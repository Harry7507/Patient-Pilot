from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.routers.ai import router as ai_router
from app.routers.doctor import router as doctor_router

__all__ = [
    "auth_router",
    "patients_router",
    "ai_router",
    "doctor_router",
]
