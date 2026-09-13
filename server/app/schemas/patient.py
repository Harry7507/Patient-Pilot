from typing import Optional, Dict, Any, Union
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, AliasChoices


class VitalsSchema(BaseModel):
    bp: Optional[str] = None
    pulse: Optional[str] = None
    temperature: Optional[str] = None
    spO2: Optional[str] = None


class PatientProfileCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1)
    age: Union[str, int] = Field(...)
    gender: str = Field(..., description="'Male' | 'Female' | 'Other' | 'Prefer not to say'")
    opd_reg_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("opd_reg_id", "opdRegId"),
        description="Generated automatically if not supplied",
    )
    contact_number: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("contact_number", "contactNumber", "phone"),
    )
    vitals: Optional[VitalsSchema] = None


class PatientProfileUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    age: Optional[Union[str, int]] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("contact_number", "contactNumber", "phone"),
    )
    vitals: Optional[VitalsSchema] = None


class PatientProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    age: str
    gender: str
    opd_reg_id: str
    contact_number: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    fhir_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
