import React, { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import Dashboard from './components/Dashboard';

function App() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, initializing, scraping_maps, visiting_sites, completed, failed
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [currentAction, setCurrentAction] = useState('');
  const [jobCenter, setJobCenter] = useState(null); // Dynamic Map Center
  const [searchParams, setSearchParams] = useState({});

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc to close modals (handled in modal components)
      if (e.key === 'Escape' && status !== 'idle') {
        // Could trigger reset, but let's just close modals - they handle their own Esc
      }
      // Ctrl/Cmd + Enter to submit (when in idle state)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && status === 'idle') {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }
      // Ctrl/Cmd + D to toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setDarkMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  const startAnalysis = async (businessType, location, options) => {
    try {
      setError(null);
      setResults([]);
      setStatus('initializing');
      setSearchParams({ businessType, location, ...options });

      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType, location, options })
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const data = await response.json();
      setJobId(data.jobId);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('idle');
    }
  };

  const resetSearch = () => {
    setJobId(null);
    setStatus('idle');
    setResults([]);
    setError(null);
    setCurrentAction('');
    setJobCenter(null);
  };

  // Polling for status
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/status/${jobId}`);
        const data = await response.json();

        setStatus(data.status);
        setResults(data.results || []);
        setCurrentAction(data.currentAction || '');
        if (data.center) setJobCenter(data.center);

        if (data.error) {
          setError(data.error);
        }

      } catch (err) {
        // Ignored during polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status]);

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem', paddingTop: '2rem', position: 'relative' }}>
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(prev => !prev)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '0',
            background: darkMode ? '#374151' : '#F3F4F6',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s',
            color: darkMode ? '#FDE047' : '#4B5563'
          }}
          title="Toggle Dark Mode (Ctrl+D)"
        >
          {darkMode ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>

        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
          color: '#FF6154',
          display: 'inline-block'
        }}>
          Radar Scout
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>
          Business Intelligence Recon • Find Leads Fast
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
          Ctrl+Enter to Submit • Ctrl+D for Dark Mode • Esc to Close Modals
        </p>
      </header>

      <main>
        {error && status === 'idle' && (
          <div style={{ maxWidth: '700px', margin: '0 auto 1rem', padding: '1rem', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', textAlign: 'center' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {status === 'idle' ? (
          <SearchForm onSearch={startAnalysis} />
        ) : (
          <Dashboard
            status={status}
            results={results}
            error={error}
            currentAction={currentAction}
            onReset={resetSearch}
            searchParams={searchParams}
            jobCenter={jobCenter}
          />
        )}
      </main>
    </div>
  );
}

export default App;
