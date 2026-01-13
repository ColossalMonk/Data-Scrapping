from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import List

from playwright.sync_api import sync_playwright

from .models import BusinessRecord, ScrapeRequest


@dataclass
class ScrapeProgress:
    current: int
    total: int
    message: str


async def scrape_google_maps(request: ScrapeRequest) -> List[BusinessRecord]:
    """Scrape Google Maps listings using browser automation.

    This implementation uses Playwright to automate Google Maps without the
    official API. It collects publicly visible data only and applies gentle
    throttling to reduce the risk of blocking.
    """
    return await asyncio.to_thread(_scrape_google_maps_sync, request)


async def capture_website_screenshots(records: List[BusinessRecord], device: str) -> None:
    """Capture screenshots for each business website.

    Replace this stub with Playwright or Selenium logic to render pages and
    save full-page screenshots to disk.
    """
    await asyncio.to_thread(_capture_website_screenshots_sync, records, device)


def _scrape_google_maps_sync(request: ScrapeRequest) -> List[BusinessRecord]:
    query = f"{request.business_type} {request.location}"
    results: List[BusinessRecord] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.google.com/maps", wait_until="domcontentloaded")
        page.fill("input#searchboxinput", query)
        page.keyboard.press("Enter")
        page.wait_for_selector("div[role='feed']", timeout=20000)

        feed = page.locator("div[role='feed']")
        last_count = 0
        scroll_attempts = 0
        while len(results) < request.limit and scroll_attempts < 12:
            cards = feed.locator("div[role='article']")
            count = cards.count()
            if count == last_count:
                scroll_attempts += 1
                page.mouse.wheel(0, 1400)
                page.wait_for_timeout(700)
            last_count = count

            for idx in range(count):
                if len(results) >= request.limit:
                    break
                card = cards.nth(idx)
                card.click()
                page.wait_for_timeout(600)

                name = page.locator("h1[class*='fontHeadlineLarge']").inner_text()
                address = _safe_text_sync(page, "button[data-item-id='address']")
                phone = _safe_text_sync(page, "button[data-item-id^='phone']")
                website = _safe_text_sync(page, "a[data-item-id='authority']")

                results.append(
                    BusinessRecord(
                        name=name,
                        address=address,
                        phone=phone,
                        website=website,
                        contact_name=None,
                        screenshot_path="pending",
                    )
                )

            page.mouse.wheel(0, 1600)
            page.wait_for_timeout(800)

        browser.close()

    return results


def _capture_website_screenshots_sync(records: List[BusinessRecord], device: str) -> None:
    shots_dir = Path("screenshots")
    shots_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        viewport = {"width": 1280, "height": 720} if device == "desktop" else {"width": 390, "height": 844}
        context = browser.new_context(viewport=viewport)
        page = context.new_page()

        for record in records:
            if not record.website:
                record.screenshot_path = "unavailable"
                continue
            safe_name = _sanitize_name(record.name)
            path = shots_dir / f"{safe_name}_{device}.png"
            try:
                page.goto(record.website, wait_until="networkidle", timeout=20000)
                page.wait_for_timeout(500)
                page.screenshot(path=str(path), full_page=True)
                record.screenshot_path = str(path)
            except Exception:
                record.screenshot_path = "unavailable"

        browser.close()


def _safe_text_sync(page, selector: str) -> str | None:
    if page.locator(selector).count() == 0:
        return None
    return page.locator(selector).first.inner_text()


def _sanitize_name(name: str) -> str:
    safe = "".join(ch for ch in name.lower().strip() if ch.isalnum() or ch in {" ", "_", "-"})
    return safe.replace(" ", "_") or "business"
