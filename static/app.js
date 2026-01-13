const form = document.getElementById('scrape-form');
const progressWrapper = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsTable = document.getElementById('results-table');
const exportCsv = document.getElementById('export-csv');
const exportReport = document.getElementById('export-report');

let activeJobId = null;
let pollTimer = null;

const setProgress = (percent, message) => {
  progressWrapper.classList.remove('hidden');
  progressBar.style.width = `${percent}%`;
  progressText.textContent = message;
};

const renderResults = (results) => {
  if (!results.length) {
    resultsTable.classList.add('empty');
    resultsTable.innerHTML = '<p>No results yet. Run an analysis to populate the dashboard.</p>';
    return;
  }

  resultsTable.classList.remove('empty');
  const rows = results
    .map(
      (record) => `
      <div class="result-card">
        <div class="result-header">
          <div>
            <h3>${record.name}</h3>
            <p>${record.address ?? 'No address provided'}</p>
            <p>${record.phone ?? 'No phone listed'}</p>
          </div>
          <div class="result-score">
            <span>Score</span>
            <strong>${record.ux_score ?? '-'}</strong>
          </div>
        </div>
        <div class="result-body">
          <div class="result-meta">
            <p><strong>Website:</strong> ${record.website ?? 'N/A'}</p>
            <p><strong>Contact:</strong> ${record.contact_name ?? 'Not available'}</p>
            <p><strong>Screenshot:</strong> ${record.screenshot_path ?? 'Pending'}</p>
          </div>
          <div class="result-feedback">
            <p>${record.ux_summary ?? 'Analysis pending'}</p>
            <div>
              <h4>Strengths</h4>
              <ul>${(record.ux_strengths || []).map((item) => `<li>${item}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>Weaknesses</h4>
              <ul>${(record.ux_weaknesses || []).map((item) => `<li>${item}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>Recommendations</h4>
              <ul>${(record.ux_recommendations || []).map((item) => `<li>${item}</li>`).join('')}</ul>
            </div>
          </div>
        </div>
      </div>
    `,
    )
    .join('');

  resultsTable.innerHTML = rows;
};

const pollStatus = async () => {
  if (!activeJobId) return;
  try {
    const response = await fetch(`/api/status/${activeJobId}`);
    const data = await response.json();
    setProgress(data.progress, data.message || 'Working...');
    renderResults(data.results || []);

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(pollTimer);
      pollTimer = null;
      if (data.status === 'completed') {
        exportCsv.disabled = false;
        exportReport.disabled = false;
      }
    }
  } catch (error) {
    setProgress(0, 'Error fetching status');
    clearInterval(pollTimer);
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  exportCsv.disabled = true;
  exportReport.disabled = true;
  resultsTable.classList.add('empty');
  resultsTable.innerHTML = '<p>Launching analysis...</p>';

  const formData = new FormData(form);
  const payload = {
    business_type: formData.get('businessType'),
    location: formData.get('location'),
    limit: Number(formData.get('limit')),
    device: formData.get('device'),
  };

  const response = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    setProgress(0, 'Failed to start job');
    return;
  }

  const data = await response.json();
  activeJobId = data.job_id;
  setProgress(data.progress, data.message || 'Queued');

  if (pollTimer) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(pollStatus, 1500);
});

exportCsv.addEventListener('click', () => {
  if (!activeJobId) return;
  window.location.href = `/api/export/${activeJobId}/csv`;
});

exportReport.addEventListener('click', () => {
  if (!activeJobId) return;
  window.location.href = `/api/export/${activeJobId}/report`;
});
