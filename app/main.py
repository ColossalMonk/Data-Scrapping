from __future__ import annotations

import asyncio
import csv
import sys
import tempfile
import uuid
from pathlib import Path
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .models import JobResult, JobStatus, ScrapeRequest
from .scraper import capture_website_screenshots, scrape_google_maps
from .storage import JobStore
from .ux_eval import evaluate_batch

app = FastAPI(title="Business UX Insights")
store = JobStore()

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    return FileResponse("static/index.html")


@app.post("/api/start", response_model=JobResult)
async def start_analysis(request: ScrapeRequest, background_tasks: BackgroundTasks) -> JobResult:
    job_id = uuid.uuid4().hex
    store.create(job_id)
    background_tasks.add_task(run_job, job_id, request)
    return store.get(job_id)


@app.get("/api/status/{job_id}", response_model=JobResult)
async def check_status(job_id: str) -> JobResult:
    if not store.exists(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return store.get(job_id)


async def run_job(job_id: str, request: ScrapeRequest) -> None:
    store.update(job_id, status=JobStatus.running, progress=5, message="Starting Google Maps scrape")
    try:
        records = await scrape_google_maps(request)
        store.update(job_id, progress=40, message="Captured business listings", results=records)
        await capture_website_screenshots(records, request.device.value)
        store.update(job_id, progress=70, message="Captured website screenshots", results=records)
        evaluated = evaluate_batch(records)
        store.update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            message="Analysis complete",
            results=evaluated,
        )
    except Exception as exc:
        store.update(job_id, status=JobStatus.failed, message=str(exc))


@app.get("/api/export/{job_id}/csv")
async def export_csv(job_id: str) -> FileResponse:
    if not store.exists(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    job = store.get(job_id)
    if not job.results:
        raise HTTPException(status_code=400, detail="No results to export")
    temp_dir = Path(tempfile.gettempdir())
    path = temp_dir / f"{job_id}.csv"
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["name", "address", "phone", "website", "contact_name", "ux_score"])
        for record in job.results:
            writer.writerow(
                [
                    record.name,
                    record.address or "",
                    record.phone or "",
                    record.website or "",
                    record.contact_name or "",
                    record.ux_score or "",
                ]
            )
    return FileResponse(str(path), filename=f"{job_id}.csv")


@app.get("/api/export/{job_id}/report")
async def export_report(job_id: str) -> FileResponse:
    if not store.exists(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    job = store.get(job_id)
    if not job.results:
        raise HTTPException(status_code=400, detail="No results to export")
    lines = [f"# UX Report for {job_id}\n"]
    for record in job.results:
        lines.append(f"## {record.name}\n")
        lines.append(record.ux_summary or "")
        lines.append("\n**Strengths**\n")
        lines.extend([f"- {item}" for item in record.ux_strengths])
        lines.append("\n**Weaknesses**\n")
        lines.extend([f"- {item}" for item in record.ux_weaknesses])
        lines.append("\n**Recommendations**\n")
        lines.extend([f"- {item}" for item in record.ux_recommendations])
        lines.append("\n")
    temp_dir = Path(tempfile.gettempdir())
    path = temp_dir / f"{job_id}.md"
    with path.open("w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    return FileResponse(str(path), filename=f"{job_id}.md")


@app.get("/api/disclaimer")
async def disclaimer() -> dict:
    return {
        "message": (
            "This tool collects only publicly available business information. "
            "Do not use it to access private data or login-protected content. "
            "Respect robots.txt and comply with local regulations."
        )
    }


@app.on_event("startup")
async def warmup() -> None:
    await asyncio.sleep(0)
