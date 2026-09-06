import uuid
from typing import Optional, Dict, Any
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[str] = mapped_column(String(50), nullable=False)
    gender: Mapped[str] = mapped_column(String(50), nullable=False)
    opd_reg_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    contact_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vitals: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)
    fhir_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    intake_sessions = relationship("IntakeSession", back_populates="patient_profile", cascade="all, delete-orphan")
