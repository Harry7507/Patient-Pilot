from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FHIRResource(BaseModel):
    resourceType: str
    id: str
    meta: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


class FHIRBundleEntry(BaseModel):
    fullUrl: Optional[str] = None
    resource: Dict[str, Any]


class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    total: int
    entry: List[FHIRBundleEntry] = Field(default_factory=list)
