import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    intake_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    route: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Oral")
    duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    indication: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fhir_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)

    # Relationships
    intake_session = relationship("IntakeSession", back_populates="medications")


class LabValue(Base):
    __tablename__ = "lab_values"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    intake_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    result: Mapped[str] = mapped_column(String(100), nullable=False)
    reference_unit: Mapped[str] = mapped_column(String(50), nullable=False)
    normal_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="NORMAL", nullable=False)  # NORMAL, HIGH, LOW, CRITICAL
    fhir_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)

    # Relationships
    intake_session = relationship("IntakeSession", back_populates="lab_values")


class DocumentUpload(Base):
    __tablename__ = "document_uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    intake_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(100), default="Prescription", nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    raw_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    intake_session = relationship("IntakeSession", back_populates="documents")


class TriageResult(Base):
    __tablename__ = "triage_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    intake_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intake_sessions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    triage_level: Mapped[str] = mapped_column(String(50), nullable=False)  # EMERGENCY | HIGH_PRIORITY | ROUTINE
    triggered_rules: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    action_required: Mapped[str] = mapped_column(Text, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    intake_session = relationship("IntakeSession", back_populates="triage_result")


class ClinicianBriefing(Base):
    __tablename__ = "clinician_briefings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    intake_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("intake_sessions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    clinician_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fhir_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)

    # Relationships
    intake_session = relationship("IntakeSession", back_populates="briefing")
    reviewed_by_user = relationship("User", back_populates="reviewed_briefings")
