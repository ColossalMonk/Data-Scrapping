/**
 * Analyzes the page for UI/UX heuristics
 * @param {import('playwright').Page} page 
 * @param {string} url 
 */
async function evaluatePage(page, url) {
    console.log(`Evaluating UI/UX for ${url}`);

    // Default Score
    let score = 5;
    const insights = [];

    try {
        // 1. Mobile Responsiveness Check
        const viewportMeta = await page.$('meta[name="viewport"]');
        if (viewportMeta) {
            score += 2;
            insights.push("Site is mobile-optimized (valid viewport tag).");
        } else {
            score -= 1;
            insights.push("Missing viewport tag; might not be mobile-responsive.");
        }

        // 2. SSL/HTTPS
        if (url.startsWith('https')) {
            score += 1;
            insights.push("Secure connection (HTTPS).");
        } else {
            score -= 2;
            insights.push("Insecure connection (HTTP only).");
        }

        // 3. Heading Structure (Hierarchy)
        const h1Count = await page.locator('h1').count();
        if (h1Count === 1) {
            score += 1;
            insights.push("Good heading hierarchy (Single H1).");
        } else if (h1Count === 0) {
            score -= 1;
            insights.push("No H1 heading found; poor hierarchy.");
        } else {
            insights.push("Multiple H1 tags found; check semantic structure.");
        }

        // 4. Load Performance (Basic)
        const timing = await page.evaluate(() => {
            const nav = performance.getEntriesByType("navigation")[0];
            return nav ? nav.domInteractive : 0;
        });

        if (timing > 0 && timing < 1500) {
            score += 1;
            insights.push("Fast initial render time.");
        } else if (timing > 3000) {
            score -= 1;
            insights.push("Slow initial load; consider optimizing assets.");
        }

        // Cap score 1-10
        score = Math.max(1, Math.min(10, score));

        return {
            score,
            summary: insights.join(" "),
            details: insights
        };

    } catch (error) {
        console.error("Evaluation failed:", error);
        return {
            score: 0,
            summary: "Evaluation failed due to technical error.",
            details: [error.message]
        };
    }
}

module.exports = { evaluatePage };
