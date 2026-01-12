from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import List

from .models import BusinessRecord, ScrapeRequest


@dataclass
class ScrapeProgress:
    current: int
    total: int
    message: str


async def scrape_google_maps(request: ScrapeRequest) -> List[BusinessRecord]:
    """Scrape Google Maps listings using browser automation.

    This function is intentionally written to be safe-by-default and avoids
    automating login-protected content. Implementations should respect
    rate-limiting, throttling, and only collect publicly visible data.
    """
    await asyncio.sleep(0.2)
    demo_results = []
    for index in range(request.limit):
        demo_results.append(
            BusinessRecord(
                name=f"Sample {request.business_type.title()} {index + 1}",
                address=f"{request.location}",
                phone="(555) 010-0000",
                website="https://example.com",
                contact_name=None,
            )
        )
    return demo_results


async def capture_website_screenshots(records: List[BusinessRecord], device: str) -> None:
    """Capture screenshots for each business website.

    Replace this stub with Playwright or Selenium logic to render pages and
    save full-page screenshots to disk.
    """
    for record in records:
        await asyncio.sleep(0.05)
        record.screenshot_path = f"screenshots/{record.name.replace(' ', '_').lower()}_{device}.png"
