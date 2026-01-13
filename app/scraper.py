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

    This implementation uses Playwright to automate Google Maps without the
    official API. It collects publicly visible data only and applies gentle
    throttling to reduce the risk of blocking.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:  # pragma: no cover - dependency fallback
        raise RuntimeError(
            "Playwright is required for live scraping. Install it with "
            "`pip install playwright` and run `playwright install`."
        ) from exc

    query = f"{request.business_type} {request.location}"
    results: List[BusinessRecord] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps", wait_until="domcontentloaded")
        await page.fill("input#searchboxinput", query)
        await page.keyboard.press("Enter")
        await page.wait_for_selector("div[role='feed']", timeout=20000)

        feed = page.locator("div[role='feed']")
        last_count = 0
        while len(results) < request.limit:
            cards = feed.locator("div[role='article']")
            count = await cards.count()
            if count == last_count:
                await page.mouse.wheel(0, 1400)
            last_count = count

            for idx in range(count):
                if len(results) >= request.limit:
                    break
                card = cards.nth(idx)
                await card.click()
                await page.wait_for_timeout(600)

                name = await page.locator("h1[class*='fontHeadlineLarge']").inner_text()
                address = await _safe_text(page, "button[data-item-id='address']")
                phone = await _safe_text(page, "button[data-item-id^='phone']")
                website = await _safe_text(page, "a[data-item-id='authority']")

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

            await page.mouse.wheel(0, 1600)
            await page.wait_for_timeout(800)

        await browser.close()

    return results


async def capture_website_screenshots(records: List[BusinessRecord], device: str) -> None:
    """Capture screenshots for each business website.

    Replace this stub with Playwright or Selenium logic to render pages and
    save full-page screenshots to disk.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:  # pragma: no cover - dependency fallback
        raise RuntimeError(
            "Playwright is required for capturing screenshots. Install it with "
            "`pip install playwright` and run `playwright install`."
        ) from exc

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720} if device == "desktop" else {"width": 390, "height": 844}
        )
        page = await context.new_page()

        for record in records:
            if not record.website:
                record.screenshot_path = "unavailable"
                continue
            safe_name = record.name.replace(" ", "_").lower()
            path = f"screenshots/{safe_name}_{device}.png"
            try:
                await page.goto(record.website, wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(500)
                await page.screenshot(path=path, full_page=True)
                record.screenshot_path = path
            except Exception:
                record.screenshot_path = "unavailable"

        await browser.close()


async def _safe_text(page, selector: str) -> str | None:
    if await page.locator(selector).count() == 0:
        return None
    return await page.locator(selector).first.inner_text()
