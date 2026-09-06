from sqlalchemy import JSON, Uuid
from sqlalchemy.dialects.postgresql import JSONB, UUID

# Universal types compatible with PostgreSQL (as native JSONB/UUID) and SQLite/testing (as JSON/CHAR(32))
PG_JSON = JSON().with_variant(JSONB, "postgresql")
PG_UUID = Uuid(as_uuid=True).with_variant(UUID(as_uuid=True), "postgresql")
