import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from app.models.custom_types import PG_UUID, PG_JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class IntakeSession(Base):
    __tablename__ = "intake_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, primary_key=True, default=uuid.uuid4
    )
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID, ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False, default="")
    socrates: Mapped[Optional[Dict[str, Any]]] = mapped_column(PG_JSON, nullable=True, default=dict)
    associated_symptoms: Mapped[Optional[List[str]]] = mapped_column(PG_JSON, nullable=True, default=list)
    chronic_conditions: Mapped[Optional[List[str]]] = mapped_column(PG_JSON, nullable=True, default=list)
    is_ayush_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ayush_assessment: Mapped[Optional[Dict[str, Any]]] = mapped_column(PG_JSON, nullable=True, default=dict)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)  # 'in_progress' | 'completed'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="intake_sessions")
    medications = relationship("Medication", back_populates="intake_session", cascade="all, delete-orphan")
    lab_values = relationship("LabValue", back_populates="intake_session", cascade="all, delete-orphan")
    documents = relationship("DocumentUpload", back_populates="intake_session", cascade="all, delete-orphan")
    triage_result = relationship("TriageResult", back_populates="intake_session", uselist=False, cascade="all, delete-orphan")
    briefing = relationship("ClinicianBriefing", back_populates="intake_session", uselist=False, cascade="all, delete-orphan")
