from __future__ import annotations

import threading
from typing import Dict

from .models import JobResult, JobStatus


class JobStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: Dict[str, JobResult] = {}

    def create(self, job_id: str) -> JobResult:
        with self._lock:
            job = JobResult(job_id=job_id, status=JobStatus.queued)
            self._jobs[job_id] = job
            return job

    def update(self, job_id: str, **kwargs) -> JobResult:
        with self._lock:
            job = self._jobs[job_id]
            updated = job.model_copy(update=kwargs)
            self._jobs[job_id] = updated
            return updated

    def get(self, job_id: str) -> JobResult:
        with self._lock:
            return self._jobs[job_id]

    def exists(self, job_id: str) -> bool:
        with self._lock:
            return job_id in self._jobs
