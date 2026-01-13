from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class DeviceType(str, Enum):
    desktop = "desktop"
    mobile = "mobile"


class ScrapeRequest(BaseModel):
    business_type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    limit: int = Field(5, ge=1, le=50)
    device: DeviceType = DeviceType.desktop


class BusinessRecord(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    screenshot_path: Optional[str] = "pending"
    ux_score: Optional[int] = None
    ux_strengths: List[str] = Field(default_factory=list)
    ux_weaknesses: List[str] = Field(default_factory=list)
    ux_recommendations: List[str] = Field(default_factory=list)
    ux_summary: Optional[str] = None


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    message: Optional[str] = None
    results: List[BusinessRecord] = Field(default_factory=list)
