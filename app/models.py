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
    address: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    contact_name: Optional[str]
    screenshot_path: Optional[str]
    ux_score: Optional[int]
    ux_strengths: List[str] = []
    ux_weaknesses: List[str] = []
    ux_recommendations: List[str] = []
    ux_summary: Optional[str]


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    message: Optional[str]
    results: List[BusinessRecord] = []
