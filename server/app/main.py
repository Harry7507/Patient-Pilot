import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers.auth import router as auth_router, limiter
from app.routers.patients import router as patients_router
from app.routers.ai import router as ai_router
from app.routers.doctor import router as doctor_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("patientpilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PatientPilot Backend API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"CORS Allowed Origins: {settings.CORS_ORIGINS}")
    # Ensure database tables exist
    try:
        from app.database import engine, Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified/created successfully.")
    except Exception as e:
        logger.warning(f"Could not verify schema on startup: {e}")
    yield
    logger.info("Shutting down PatientPilot Backend API...")



app = FastAPI(
    title="PatientPilot Backend API",
    description="Production-grade OPD clinical intake, deterministic safety matrix triage, and FHIR interoperability backend.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for Vite development & production hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "PatientPilot Backend",
        "version": "1.0.0",
    }


# Include versioned routers with prefix /api/v1
API_V1_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(patients_router, prefix=API_V1_PREFIX)
app.include_router(ai_router, prefix=API_V1_PREFIX)
app.include_router(doctor_router, prefix=API_V1_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )
