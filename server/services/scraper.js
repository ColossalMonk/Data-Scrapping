const { chromium } = require('playwright');
const { evaluatePage } = require('./evaluator');
const fs = require('fs');
const path = require('path');

// Ensure screenshots directory exists
const SCREENSHOT_DIR = path.resolve(__dirname, '../../client/public/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// --- GEOCODING HELPER (Nominatim - FREE, no API key) ---
async function geocodeLocation(locationName) {
    try {
        // First try with city level detail
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=5&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'FindFlare/1.0' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            // Prefer results with more specific address details
            const bestResult = data.reduce((best, current) => {
                const bestImportance = parseFloat(best.importance || 0);
                const currentImportance = parseFloat(current.importance || 0);
                return currentImportance > bestImportance ? current : best;
            });
            
            const coords = { 
                lat: parseFloat(bestResult.lat), 
                lng: parseFloat(bestResult.lon),
                displayName: bestResult.display_name
            };
            console.log(`[GEOCODE] Best match for "${locationName}":`, coords.displayName);
            return coords;
        }
    } catch (e) {
        console.log('[GEOCODE] Failed:', e.message);
    }
    return null;
}

// --- EMAIL EXTRACTION HELPER ---
function extractEmailsFromHTML(html) {
    if (!html) return [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex) || [];
    // Filter out image extensions and common false positives
    return [...new Set(matches)].filter(e =>
        !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') && !e.endsWith('.svg')
    );
}

const jobs = new Map();

async function startJob(jobId, businessType, location, options = {}) {
    console.log(`[Job ${jobId}] Starting analysis for ${businessType} in ${location} with options:`, options);

    jobs.set(jobId, {
        id: jobId,
        status: 'initializing',
        progress: 0,
        results: [],
        logs: [],
        currentAction: 'Preparing...', // Live feed
        error: null
    });

    try {
        await runScrapingPipeline(jobId, businessType, location, options);
    } catch (error) {
        console.error(`[Job ${jobId}] Failed:`, error);
        const job = jobs.get(jobId);
        if (job) {
            job.status = 'failed';
            job.error = error.message;
            job.currentAction = 'Failed';
        }
    }
}

async function runScrapingPipeline(jobId, businessType, location, options) {
    const job = jobs.get(jobId);
    if (!job) return;

    const { maxResults = 50, radius, lat, lng } = options; 

    job.status = 'scraping_maps';
    job.currentAction = 'Launching Browser...';
    job.progress = 5;

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    let listings = [];

    try {
        // --- GOOGLE MAPS SCRAPING ---
        let query = `${businessType} in ${location}`;
        let url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

        // --- GEOCODING: If manual location given, set as center first ---
        if (lat && lng) {
            job.center = { lat: parseFloat(lat), lng: parseFloat(lng) };
            console.log(`[JOB] Using provided coordinates as center:`, job.center);
        } else if (location) {
            job.currentAction = `Geocoding "${location}"...`;
            const geocodedCenter = await geocodeLocation(location);
            if (geocodedCenter) {
                job.center = geocodedCenter;
                console.log(`[GEOCODE] Resolved "${location}" as initial center:`, geocodedCenter);
            }
        }

        // Pin-point Search logic
        if (lat && lng) {
            job.currentAction = `Pin-point search at ${lat}, ${lng} (Radius: ${radius}m)...`;

            let zoom = 15;
            if (radius) {
                const r = parseInt(radius);
                if (r <= 200) zoom = 17;
                else if (r <= 500) zoom = 16;
                else if (r <= 1000) zoom = 15;
                else if (r <= 2500) zoom = 14;
                else zoom = 13;
            }
            url = `https://www.google.com/maps/search/${encodeURIComponent(businessType)}/@${lat},${lng},${zoom}z`;
        }

        console.log(`Navigating to: ${url}`);
        job.currentAction = `Navigating to Google Maps...`;

        await page.goto(url, { timeout: 60000 });

        // Handle Cookie Consent
        try {
            const consentButton = page.locator('button[aria-label="Accept all"], button:has-text("Accept all")').first();
            if (await consentButton.isVisible({ timeout: 5000 })) {
                await consentButton.click();
            }
        } catch (e) { }

        job.currentAction = 'Waiting for results feed...';
        try {
            await page.waitForSelector('div[role="feed"], div[aria-label^="Results"], a[href*="/maps/place/"]', { timeout: 20000 });
        } catch (e) {
            console.log("Feed not immediately found.");
        }

        job.progress = 10;

        // SCROLL & COLLECT LOOP
        const collectedUrls = new Set();
        let scrollAttempts = 0;
        const maxScrollAttempts = 20;

        while (listings.length < maxResults) {
            job.currentAction = `Scanning area (Found ${listings.length}/${maxResults})...`;

            const items = await page.locator('a[href*="/maps/place/"]').all();
            if (items.length === 0) break;

            for (const item of items) {
                if (listings.length >= maxResults) break;

                const href = await item.getAttribute('href');
                if (!href || collectedUrls.has(href)) continue;
                collectedUrls.add(href);

                try {
                    await item.scrollIntoViewIfNeeded();

                    let name = await item.getAttribute('aria-label');
                    if (!name) name = (await item.innerText()).split('\n')[0];
                    if (!name || name.includes("·")) continue;

                    job.currentAction = `Processing: ${name}`;
                    console.log(`\n[BUSINESS ${listings.length + 1}] ===== ${name} =====`);

                    // Before clicking, we track the name we WANT to find
                    const targetNameLower = name.split('·')[0].trim().toLowerCase().substring(0, 10);

                    // Click for details
                    await item.click({ timeout: 5000 });

                    // HARDENED TRANSITION WAIT
                    const startTime = Date.now();
                    let panelNameMatch = false;
                    
                    while (Date.now() - startTime < 10000) { // Increased to 10s timeout
                        try {
                            const h1 = page.locator('h1').first();
                            if (await h1.isVisible()) {
                                const h1Text = (await h1.textContent())?.toLowerCase() || '';
                                if (h1Text.includes(targetNameLower)) {
                                    panelNameMatch = true;
                                    console.log(`[PANEL] Verified: "${h1Text.substring(0, 20)}..." matches target.`);
                                    break;
                                }
                            }
                        } catch (e) { }
                        await page.waitForTimeout(500);
                    }

                    if (!panelNameMatch) {
                        console.log(`[WARN] Panel name transition failed for ${name}. Giving 3s fail-safe wait.`);
                        await page.waitForTimeout(3000); 
                    } else {
                        // Even after name swap, Google's contact buttons often lag. 
                        // We wait for the "Authority" button to either change or settle.
                        await page.waitForTimeout(1500); 
                    }

                    // Extract details with full state awareness
                    const details = await extractDetails(page, job);

                    // Extract Coordinates
                    let coords = { lat: null, lng: null };
                    try {
                        const currentUrl = page.url();
                        const parseDataCoords = (url) => {
                            const latMatch = url.match(/!3d(-?\d+\.\d+)/);
                            const lngMatch = url.match(/!4d(-?\d+\.\d+)/);
                            if (latMatch && lngMatch) return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) }; 
                            return null;
                        };
                        const parseAtCoords = (url) => {
                            const split = url.split('/@')[1];
                            if (split) {
                                const parts = split.split(',');
                                return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
                            }
                            return null;
                        };
                        coords = parseAtCoords(currentUrl) || parseDataCoords(currentUrl) || parseAtCoords(href) || parseDataCoords(href) || { lat: null, lng: null };

                        if (!job.center && coords.lat && coords.lng) {
                            job.center = coords;
                        }
                    } catch (e) { }

                    const dataScore = calculateDataScore(details, name, href);

                    // SAVE RESULT
                    const businessData = {
                        name,
                        website: details.website || null,
                        phone: details.phone || null,
                        address: details.address || null,
                        reviews: details.reviews || { rating: null, count: null },
                        mapsLink: href,
                        dataScore,
                        status: 'auditing'
                    };

                    // SEQUENTIAL SITE AUDIT
                    if (businessData.website) {
                        console.log(`[AUDIT] Visiting ${businessData.website}...`);
                        try {
                            const sitePage = await context.newPage();
                            await sitePage.goto(businessData.website, { timeout: 25000, waitUntil: 'domcontentloaded' });

                            const scName = `${jobId}_${listings.length}.jpg`;
                            const scPath = path.join(SCREENSHOT_DIR, scName);
                            await sitePage.screenshot({ path: scPath, fullPage: false });

                            const uxAn = await evaluatePage(sitePage, businessData.website);
                            const ems = extractEmailsFromHTML(await sitePage.content());
                            if (ems.length > 0) {
                                businessData.email = ems[0];
                                businessData.allEmails = ems;
                            }

                            businessData.screenshot = `/screenshots/${scName}`;
                            businessData.uxAnalysis = uxAn;
                            await sitePage.close();
                        } catch (e) {
                            businessData.uxAnalysis = { score: 0, summary: "Could not access site." };
                        }
                    } else {
                        businessData.uxAnalysis = { score: 0, summary: "No website available." };
                    }

                    listings.push(businessData);
                    
                    // UPDATE STATE TRACKERS
                    page._lastWebsite = businessData.website;
                    page._lastPhone = businessData.phone;
                    page._lastAddress = businessData.address;
                    page._lastRating = businessData.reviews.rating;
                    page._lastCount = businessData.reviews.count;

                    job.results = [...listings];
                    job.progress = 10 + (listings.length / maxResults) * 85;

                } catch (err) {
                    console.log(`Error processing ${href}:`, err.message);
                }
            }

            // Scroll for more
            const feed = page.locator('div[role="feed"]');
            if (await feed.count() > 0) {
                await feed.evaluate(el => el.scrollTop = el.scrollHeight);
                await page.waitForTimeout(2000);
            } else break;

            scrollAttempts++;
            if (scrollAttempts >= maxScrollAttempts) break;
        }

        job.status = 'completed';
        job.currentAction = 'Analysis Complete';
        job.progress = 100;

    } catch (e) {
        console.error("Scrape failed", e);
        throw e;
    } finally {
        await browser.close();
    }
}

async function extractDetails(page, job) {
    const details = { 
        website: null, 
        phone: null, 
        address: null, 
        reviews: { 
            rating: null, 
            count: null,
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            reviews: []
        } 
    };
    
    // TRACKING FOR STALE DETECTION - Read THEN RESET
    const lastWebsite = page._lastWebsite || null;
    const lastPhone = page._lastPhone || null;
    const lastAddress = page._lastAddress || null;
    const lastRating = page._lastRating || null;
    const lastCount = page._lastCount || null;
    
    // Reset state for fresh extraction
    page._lastWebsite = null;
    page._lastPhone = null;
    page._lastAddress = null;
    page._lastRating = null;
    page._lastCount = null;

    const isValidWeb = (url) => {
        if (!url) return false;
        const blocked = ['google.com', 'google.co.in', 'gstatic.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'yelp.com'];
        const low = url.toLowerCase();
        if (blocked.some(d => low.includes(d))) return false;
        return low.startsWith('http');
    };

    job.currentAction = 'Extracting Identity...';

    // 1. WEBSITE (Hardened with stale check)
    try {
        const webBtn = page.locator('a[data-item-id="authority"]').first();
        if (await webBtn.count() > 0 && await webBtn.isVisible()) {
            let href = await webBtn.getAttribute('href');
            if (isValidWeb(href)) {
                if (href === lastWebsite && href !== null) {
                    console.log(`[STALE] Website ${href} matches last result. Re-verifying in 1s...`);
                    await page.waitForTimeout(1000);
                    href = await webBtn.getAttribute('href');
                }
                if (isValidWeb(href)) details.website = href;
            }
        }
        // Fallback
        if (!details.website) {
            const fallbackLink = page.locator('a[aria-label*="website"], a[aria-label*="Website"]').first();
            if (await fallbackLink.count() > 0 && await fallbackLink.isVisible()) {
                const fhref = await fallbackLink.getAttribute('href');
                if (isValidWeb(fhref) && fhref !== lastWebsite) details.website = fhref;
            }
        }
    } catch (e) { }

    // 2. PHONE
    try {
        const pBtn = page.locator('button[data-item-id^="phone:tel:"], a[href^="tel:"]').first();
        if (await pBtn.isVisible()) {
            let ph = (await pBtn.getAttribute('aria-label') || '').replace('Call', '').trim();
            if (ph === lastPhone && ph !== '') {
                await page.waitForTimeout(500);
                ph = (await pBtn.getAttribute('aria-label') || '').replace('Call', '').trim();
            }
            details.phone = ph || null;
        }
    } catch (e) { }

    // 3. ADDRESS
    try {
        const aBtn = page.locator('button[data-item-id="address"]').first();
        if (await aBtn.isVisible()) {
            let ad = (await aBtn.getAttribute('aria-label') || '').replace('Address: ', '').trim();
            if (ad === lastAddress && ad !== '') {
                await page.waitForTimeout(500);
                ad = (await aBtn.getAttribute('aria-label') || '').replace('Address: ', '').trim();
            }
            details.address = ad || null;
        }
    } catch (e) { }

    // 4. REVIEWS (Hardened)
    try {
        // RATING - Extract overall star rating
        const rSpan = page.locator('span[role="img"][aria-label*="star"]').first();
        if (await rSpan.count() > 0) {
            const label = await rSpan.getAttribute('aria-label');
            const match = label?.match(/(\d+\.?\d*)/);
            if (match) {
                details.reviews.rating = match[1];
                console.log(`[REVIEWS] Rating found: ${details.reviews.rating} from "${label}"`);
            }
        }

        // COUNT - Multiple fallback selectors for robustness
        let foundCount = false;
        console.log(`[REVIEWS] Starting review count extraction...`);
        
        // Strategy 1: Button with aria-label containing "review"
        let cBtn = page.locator('button[aria-label*="review"]').first();
        let reviewButtonCount = await cBtn.count();
        console.log(`[REVIEWS] Selector 1 (button[aria-label*="review"]): found ${reviewButtonCount}`);
        
        if (reviewButtonCount === 0) {
            cBtn = page.locator('a[aria-label*="review"]').first();
            reviewButtonCount = await cBtn.count();
            console.log(`[REVIEWS] Selector 2 (a[aria-label*="review"]): found ${reviewButtonCount}`);
        }
        
        if (reviewButtonCount === 0) {
            // Selector 3: Any element with review in aria-label
            cBtn = page.locator('[aria-label*="review"]').first();
            reviewButtonCount = await cBtn.count();
            console.log(`[REVIEWS] Selector 3 ([aria-label*="review"]): found ${reviewButtonCount}`);
        }
        
        if (reviewButtonCount > 0) {
            const label = await cBtn.getAttribute('aria-label');
            const role = await cBtn.getAttribute('role');
            console.log(`[REVIEWS] Review element found - role: ${role}, label: "${label}"`);
            
            // More flexible regex to match various formats: "123 reviews", "1.2K reviews", etc.
            let match = label?.match(/(\d+[\d,\.]*)\s*(?:K|M)?\s*reviews?/i);
            if (!match) {
                match = label?.match(/(\d[\d,\.]*)/);
            }
            
            if (match) {
                let count = match[1].replace(/,/g, '').replace(/\./g, '');
                
                // Handle K and M suffixes
                if (label.toLowerCase().includes('k')) {
                    count = Math.floor(parseFloat(match[1].replace(/,/g, '')) * 1000).toString();
                } else if (label.toLowerCase().includes('m')) {
                    count = Math.floor(parseFloat(match[1].replace(/,/g, '')) * 1000000).toString();
                }
                
                console.log(`[REVIEWS] Extracted count: ${count} from label: "${label}"`);
                
                // Stale count detection
                if (count === lastCount && details.reviews.rating === lastRating && count !== '0') {
                    console.log(`[STALE] Review count ${count} might be stale. Refreshing...`);
                    await page.waitForTimeout(1000);
                    const freshLabel = await cBtn.getAttribute('aria-label');
                    let freshMatch = freshLabel?.match(/(\d+[\d,\.]*)\s*(?:K|M)?\s*reviews?/i);
                    if (!freshMatch) {
                        freshMatch = freshLabel?.match(/(\d[\d,\.]*)/);
                    }
                    if (freshMatch) {
                        let freshCount = freshMatch[1].replace(/,/g, '').replace(/\./g, '');
                        if (freshLabel.toLowerCase().includes('k')) {
                            freshCount = Math.floor(parseFloat(freshMatch[1].replace(/,/g, '')) * 1000).toString();
                        } else if (freshLabel.toLowerCase().includes('m')) {
                            freshCount = Math.floor(parseFloat(freshMatch[1].replace(/,/g, '')) * 1000000).toString();
                        }
                        details.reviews.count = freshCount;
                    } else {
                        details.reviews.count = count;
                    }
                } else {
                    details.reviews.count = count;
                }
                foundCount = true;
            }
        }
        
        // Fallback 1: Search for text nodes containing "reviews"
        if (!foundCount) {
            console.log(`[REVIEWS] Trying text fallback...`);
            const pageText = await page.locator('body').textContent();
            const patterns = [
                /(\d+[\d,\.]*)\s*(?:K|M)?\s*reviews?/i,
                /review[^0-9]*(\d+[\d,\.]*)/i,
                /(\d+[\d,\.]*)\s*ratings?/i
            ];
            
            for (const pattern of patterns) {
                const match = pageText?.match(pattern);
                if (match && match[1]) {
                    let count = match[1].replace(/,/g, '');
                    if (match[0].toLowerCase().includes('k')) {
                        count = Math.floor(parseFloat(count) * 1000).toString();
                    } else if (match[0].toLowerCase().includes('m')) {
                        count = Math.floor(parseFloat(count) * 1000000).toString();
                    }
                    details.reviews.count = count;
                    foundCount = true;
                    console.log(`[REVIEWS] Found via text pattern: ${count} from "${match[0]}"`);
                    break;
                }
            }
        }

        if (!foundCount) {
            console.log(`[REVIEWS] WARNING: Could not extract review count - defaulting to "0"`);
            details.reviews.count = '0';
        }

        // STAR BREAKDOWN - Try to extract 5-star, 4-star, etc. counts
        try {
            const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            console.log(`[STAR-BREAKDOWN] Attempting to extract star distribution...`);
            console.log(`[STAR-BREAKDOWN] Total review count for validation: ${details.reviews.count}`);
            
            // Strategy: Look for clickable star rating buttons/filters
            const totalReviews = parseInt(details.reviews.count, 10) || 1;
            
            // First attempt: Direct selector for star rating buttons
            for (let stars = 5; stars >= 1; stars--) {
                const starBtn = page.locator(`button[aria-label*="${stars} star"]`).first();
                const starBtnCount = await starBtn.count();
                
                if (starBtnCount > 0) {
                    const label = await starBtn.getAttribute('aria-label');
                    console.log(`[STAR-BREAKDOWN] Found ${stars}-star button: "${label}"`);
                    
                    // Extract number from pattern like "X stars (123 reviews)" or "123 reviews with X stars"
                    const patterns = [
                        new RegExp(`${stars}\\s*star[s]?[^0-9]*(\\d+[\\d,\\.]*)[^0-9]*review`, 'i'),
                        new RegExp(`(\\d+[\\d,\\.]*)[^0-9]*review[^0-9]*${stars}\\s*star`, 'i'),
                        new RegExp(`${stars}\\s*star[s]?[^0-9]*(\\d+[\\d,\\.]*)`, 'i'),
                        new RegExp(`(\\d+[\\d,\\.]*)`, 'i')
                    ];
                    
                    let found = false;
                    for (const pattern of patterns) {
                        const match = label.match(pattern);
                        if (match && match[1]) {
                            let count = match[1].replace(/,/g, '');
                            const numValue = parseInt(count, 10);
                            
                            // Validate: count should be reasonable (not more than total reviews * 1.5)
                            if (numValue > 0 && numValue <= totalReviews * 1.5) {
                                breakdown[stars] = numValue;
                                console.log(`[STAR-BREAKDOWN] ${stars}-star: ${numValue} from pattern: "${match[0]}"`);
                                found = true;
                                break;
                            }
                        }
                    }
                    
                    if (!found) {
                        console.log(`[STAR-BREAKDOWN] Could not extract valid count for ${stars}-star from: "${label}"`);
                    }
                }
            }
            
            // Validate the breakdown
            const breakdownSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
            console.log(`[STAR-BREAKDOWN] Sum of breakdown: ${breakdownSum}, Total reviews: ${totalReviews}`);
            
            // If breakdown seems wrong (way off from total), reset it
            if (breakdownSum > totalReviews * 1.5 || (breakdownSum === 0 && totalReviews > 0)) {
                console.log(`[STAR-BREAKDOWN] Breakdown sum (${breakdownSum}) is unreasonable for ${totalReviews} total reviews. Resetting breakdown.`);
                details.reviews.breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            } else {
                details.reviews.breakdown = breakdown;
            }
            
            console.log(`[STAR-BREAKDOWN] Final breakdown:`, details.reviews.breakdown);
        } catch (e) {
            console.log(`[STAR-BREAKDOWN] Extraction failed:`, e.message);
            details.reviews.breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        }
    } catch (e) { 
        console.log(`[REVIEWS] Error during review extraction:`, e.message);
    }

    return details;
}

function calculateDataScore(details, name, mapsLink) {
    let score = 0;
    if (name) score += 2;
    if (details.website) score += 3;
    if (details.phone) score += 2;
    if (details.address) score += 2;
    if (mapsLink) score += 1;
    return Math.min(10, score);
}

function getJobStatus(jobId) {
    return jobs.get(jobId);
}

module.exports = {
    startJob,
    getJobStatus
};
