import React, { useState, useEffect } from 'react';

function SearchForm({ onSearch }) {
    const [type, setType] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced State
    const [maxResults, setMaxResults] = useState(20);
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [radius, setRadius] = useState(1000); // Default 1km

    // Saved Searches
    const [savedSearches, setSavedSearches] = useState(() => {
        const saved = localStorage.getItem('savedSearches');
        return saved ? JSON.parse(saved) : [];
    });
    const [showSaved, setShowSaved] = useState(false);

    const isPinPoint = lat.trim() !== '' && lng.trim() !== '';

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!type) return;

        // Save this search
        const newSearch = { type, location, maxResults, lat, lng, radius, timestamp: Date.now() };
        const updatedSearches = [newSearch, ...savedSearches.filter(s => !(s.type === type && s.location === location))].slice(0, 5);
        setSavedSearches(updatedSearches);
        localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));

        setLoading(true);
        onSearch(type, location, { maxResults, lat, lng, radius });
    };

    const loadSavedSearch = (search) => {
        setType(search.type);
        setLocation(search.location || '');
        setMaxResults(search.maxResults || 20);
        setLat(search.lat || '');
        setLng(search.lng || '');
        setRadius(search.radius || 1000);
        setShowSaved(false);
    };

    return (
        <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'var(--bg-card)',
                padding: '1.5rem',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-light)'
            }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Business Type (e.g. Gym)"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={loading}
                        style={{ flex: 1, padding: '1rem', background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '1rem', color: 'var(--text-primary)' }}
                    />

                    <input
                        type="text"
                        placeholder={isPinPoint ? "Pin-point Coordinates Selected" : "Location (e.g. Chicago)"}
                        value={isPinPoint ? "" : location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={loading || isPinPoint}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            background: isPinPoint ? 'var(--border-light)' : 'var(--bg-page)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            color: isPinPoint ? 'var(--text-secondary)' : 'var(--text-primary)',
                            cursor: isPinPoint ? 'not-allowed' : 'text'
                        }}
                    />
                </div>

                {/* Saved Searches Dropdown */}
                {savedSearches.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowSaved(!showSaved)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '8px',
                                padding: '0.6rem 1.2rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                                fontWeight: 500
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                            Recent Searches ({savedSearches.length})
                            <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{showSaved ? '▲' : '▼'}</span>
                        </button>
                        {showSaved && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '8px',
                                marginTop: '4px',
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 10,
                                overflow: 'hidden'
                            }}>
                                {savedSearches.map((s, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => loadSavedSearch(s)}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            border: 'none',
                                            background: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderBottom: i < savedSearches.length - 1 ? '1px solid var(--border-light)' : 'none',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <strong>{s.type}</strong> in {s.location || `Coordinates: ${s.lat?.substring(0, 6)}, ${s.lng?.substring(0, 6)}`}
                                        <span style={{ float: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {new Date(s.timestamp).toLocaleDateString()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '0.5rem',
                        transition: 'opacity 0.2s'
                    }}
                >
                    {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                </button>

                {showAdvanced && (
                    <div style={{
                        padding: '1rem',
                        background: '#F3F4F6',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Max Results: {maxResults}</label>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={maxResults}
                                onChange={(e) => setMaxResults(e.target.value)}
                                style={{ width: '60%', accentColor: '#10B981' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Latitude (optional)</label>
                                <input type="text" placeholder="e.g. 40.7128" value={lat} onChange={(e) => setLat(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>Longitude (optional)</label>
                                <input type="text" placeholder="e.g. -74.0060" value={lng} onChange={(e) => setLng(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                        </div>

                        {/* RADIUS SLIDER - Always visible */}
                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#E5E7EB', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>Search Radius</label>
                                <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>{radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}</span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="10000"
                                step="500"
                                value={radius}
                                onChange={(e) => setRadius(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: '#6366F1' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.75rem' }}>
                                Controls search area. Auto-expands if not enough results found.
                            </small>
                        </div>

                        <small style={{ color: '#666' }}>Providing coordinates enables "Pin-point" search mode.</small>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem' }}>
                        {loading ? 'Starting...' : 'Start Analysis'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default SearchForm;
