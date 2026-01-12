# Business UX Insights

Web-based application to collect Google Maps business data (without the Maps API), capture screenshots, and generate UI/UX commentary.

## Features

- Search by business type and location.
- Optional result limit and device type.
- Progress tracker and results dashboard.
- Export CSV data and Markdown UX reports.
- Ethical-use disclaimer.

## Tech Stack

- FastAPI backend with background jobs.
- Vanilla HTML/CSS/JS frontend.
- Playwright/Selenium-ready automation stubs.

## Getting Started

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://localhost:8000` in your browser.

## Notes

This demo includes stubbed scraping and UX evaluation logic. Replace `app/scraper.py` and `app/ux_eval.py` with full automation and evaluation implementations. Use throttling and respect public data policies.
