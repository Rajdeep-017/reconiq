"""Partner schemas."""
from __future__ import annotations
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50, pattern="^[a-z0-9_-]+$")
    partner_type: str = Field(..., pattern="^(marketplace|logistics|payment_gateway|cod_provider)$")
    description: str | None = None


class PartnerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class PartnerResponse(BaseModel):
    id: UUID
    name: str
    code: str
    partner_type: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class PartnerListResponse(BaseModel):
    partners: list[PartnerResponse]
    total: int

