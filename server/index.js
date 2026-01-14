const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path'); // Import path
const scraperService = require('./services/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded
}));
app.use(express.json());

// Serve static screenshots with absolute path stability
// app.use('/screenshots', express.static(path.join(__dirname, '../client/public/screenshots')));
// Fix: Resolve to the exact folder
const screenshotPath = path.resolve(__dirname, '../client/public/screenshots');
app.use('/screenshots', express.static(screenshotPath));
console.log("Serving screenshots from:", screenshotPath);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start Scraping Job
app.post('/api/analyze', async (req, res) => {
  try {
    const { businessType, location, options } = req.body; // options: { maxResults, duration, radius, lat, lng }
    if (!businessType && !location) {
      // Allow location to be empty if lat/lng is present
      if (!options || (!options.lat && !options.lng)) {
        return res.status(400).json({ error: 'Missing businessType or location' });
      }
    }

    const jobId = Date.now().toString();

    // Pass options to scraper
    scraperService.startJob(jobId, businessType, location || "Area", options || {});

    res.json({ success: true, jobId, message: 'Analysis started' });
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Poll Status
app.get('/api/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = scraperService.getJobStatus(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
