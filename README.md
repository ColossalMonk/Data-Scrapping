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
- Playwright automation for Google Maps scraping and screenshots.

## Getting Started

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install
uvicorn app.main:app --reload
```

Open `http://localhost:8000` in your browser.

## Notes

The scraper uses Playwright to collect publicly available Google Maps data and capture website screenshots. The UX evaluator remains a heuristic placeholder; replace `app/ux_eval.py` with a richer evaluator as needed. Use throttling and respect public data policies.

### Troubleshooting

- **Windows Playwright errors**: If you see `NotImplementedError` from `asyncio` subprocesses, ensure Playwright is installed (`pip install playwright` + `playwright install`) and use Python 3.12+; the scraper runs Playwright in a background thread to avoid event loop limitations.
