# Radar Scout 🚀

Radar Scout is a high-accuracy business intelligence tool designed to scrape Google Maps data, evaluate lead websites, and generate actionable UX insights.

## ✨ Features

- **Sequential Scraping Engine**: 100% data fidelity with state-aware extraction (no data carryover between leads).
- **Precision Geocoding**: Search by any city or use pixel-perfect Lat/Lng coordinates with radius controls.
- **Deep-Dive Intelligence**: Automated website UX scoring, email extraction, and visual screenshots.
- **Premium Dashboard**: Professional, icon-driven UI with Dark Mode support and real-time progress tracking.
- **Lead Management**: Filter leads by quality and export results directly to CSV.

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), Leaflet (Map Visuals), Vanilla CSS (Premium Glassmorphism).
- **Backend**: Node.js, Express.
- **Automation**: Playwright (Headless Browser), Nominatim API (Geocoding).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- NPM

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ColossalMonk/Data-Scrapping.git
   cd Data-Scrapping
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   npx playwright install chromium
   ```

3. **Setup Client**:
   ```bash
   cd ../client
   npm install
   ```

### Running the App

1. **Start Backend**:
   ```bash
   cd server
   node index.js
   ```

2. **Start Frontend**:
   ```bash
   cd client
   npm run dev
   ```

Visit `http://localhost:5173` to start scouting.

---

## 🛡️ License
Ethical Use Only. Respect Google Maps' terms of service and public data policies.
