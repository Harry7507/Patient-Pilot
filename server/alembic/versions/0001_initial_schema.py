"""0001_initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-06 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="patient"),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_first_login", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # 2. patient_profiles
    op.create_table(
        "patient_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("age", sa.String(length=50), nullable=False),
        sa.Column("gender", sa.String(length=50), nullable=False),
        sa.Column("opd_reg_id", sa.String(length=100), nullable=False),
        sa.Column("contact_number", sa.String(length=50), nullable=True),
        sa.Column("vitals", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("fhir_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index(op.f("ix_patient_profiles_user_id"), "patient_profiles", ["user_id"], unique=True)
    op.create_index(op.f("ix_patient_profiles_opd_reg_id"), "patient_profiles", ["opd_reg_id"], unique=True)

    # 3. intake_sessions
    op.create_table(
        "intake_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chief_complaint", sa.Text(), nullable=False, server_default=""),
        sa.Column("socrates", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("associated_symptoms", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'[]'::jsonb")),
        sa.Column("chronic_conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'[]'::jsonb")),
        sa.Column("is_ayush_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("ayush_assessment", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("language", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="in_progress"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_intake_sessions_patient_profile_id"), "intake_sessions", ["patient_profile_id"], unique=False)

    # 4. medications
    op.create_table(
        "medications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("intake_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("dosage", sa.String(length=100), nullable=False),
        sa.Column("frequency", sa.String(length=100), nullable=False),
        sa.Column("route", sa.String(length=100), nullable=True, server_default="Oral"),
        sa.Column("duration", sa.String(length=100), nullable=True),
        sa.Column("indication", sa.String(length=255), nullable=True),
        sa.Column("fhir_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index(op.f("ix_medications_intake_session_id"), "medications", ["intake_session_id"], unique=False)

    # 5. lab_values
    op.create_table(
        "lab_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("intake_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("test_name", sa.String(length=255), nullable=False),
        sa.Column("result", sa.String(length=100), nullable=False),
        sa.Column("reference_unit", sa.String(length=50), nullable=False),
        sa.Column("normal_range", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="NORMAL"),
        sa.Column("fhir_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index(op.f("ix_lab_values_intake_session_id"), "lab_values", ["intake_session_id"], unique=False)

    # 6. document_uploads
    op.create_table(
        "document_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("intake_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.String(length=100), nullable=False, server_default="Prescription"),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("raw_summary", sa.Text(), nullable=True),
    )
    op.create_index(op.f("ix_document_uploads_intake_session_id"), "document_uploads", ["intake_session_id"], unique=False)

    # 7. triage_results
    op.create_table(
        "triage_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("intake_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("triage_level", sa.String(length=50), nullable=False),
        sa.Column("triggered_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("action_required", sa.Text(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_triage_results_intake_session_id"), "triage_results", ["intake_session_id"], unique=True)

    # 8. clinician_briefings
    op.create_table(
        "clinician_briefings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("intake_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("intake_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clinician_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fhir_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index(op.f("ix_clinician_briefings_intake_session_id"), "clinician_briefings", ["intake_session_id"], unique=True)


def downgrade() -> None:
    op.drop_table("clinician_briefings")
    op.drop_table("triage_results")
    op.drop_table("document_uploads")
    op.drop_table("lab_values")
    op.drop_table("medications")
    op.drop_table("intake_sessions")
    op.drop_table("patient_profiles")
    op.drop_table("users")
