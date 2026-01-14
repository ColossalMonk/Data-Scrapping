import React, { useState, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import { MapContainer, TileLayer, Circle, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons in Webpack/Vite
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to update map view when props change
function MapUpdater({ lat, lng, radius }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 14); // Dynamic zoom could be passed too
        }
    }, [lat, lng, map]);
    return null;
}

function Dashboard({ status, results, error, onReset, currentAction, searchParams, jobCenter }) {

    const isFinished = status === 'completed' || status === 'failed';

    // Filter & Pagination State
    const [filter, setFilter] = useState({ hasWebsite: '', minScore: 0 });
    const [visibleCount, setVisibleCount] = useState(12);

    // Apply Filters
    const filteredResults = results.filter(r => {
        if (filter.hasWebsite === 'yes' && !r.website) return false;
        if (filter.hasWebsite === 'no' && r.website) return false;
        if (filter.minScore > 0 && (r.dataScore || 0) < filter.minScore) return false;
        return true;
    });

    // Default center (World or User provided)
    // If jobCenter (from scraper) exists, prioritize it!
    // Else if searchParams has lat/lng, use it. Else default to New York.
    const centerLat = jobCenter?.lat || (searchParams?.lat ? parseFloat(searchParams.lat) : 40.7128);
    const centerLng = jobCenter?.lng || (searchParams?.lng ? parseFloat(searchParams.lng) : -74.0060);
    const radius = searchParams?.radius ? parseFloat(searchParams.radius) : 1000;

    // Is this a pinpoint search OR do we have a scraper-found center?
    const isMapActive = (searchParams?.lat && searchParams?.lng) || jobCenter;

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                marginBottom: '2rem'
            }}>
                {/* Live Visualizer Panel - MAP ONLY */}
                <div style={{
                    width: '100%',
                    height: '350px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-xl)',
                    position: 'relative',
                    border: '1px solid #374151'
                }}>
                    {/* Map Layer */}
                    <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%', background: '#1F2937' }}
                        scrollWheelZoom={false}
                        zoomControl={false}
                    >
                        {/* Dark Matter Theme */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {isMapActive && (
                            <>
                                <Circle
                                    center={[centerLat, centerLng]}
                                    radius={radius}
                                    pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.1, weight: 1, dashArray: '5,5' }}
                                />
                                <Marker position={[centerLat, centerLng]}>
                                    <Popup>Target Location</Popup>
                                </Marker>
                                <MapUpdater lat={centerLat} lng={centerLng} radius={radius} />
                            </>
                        )}
                    </MapContainer>

                    {/* Status Badge */}
                    <div style={{ position: 'absolute', top: 15, right: 15 }}>
                        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '4px', border: '1px solid #10B981', color: '#10B981', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {isFinished ? 'SCAN COMPLETE' : 'SCANNING...'}
                        </div>
                    </div>
                </div>

                {/* TERMINAL - NOW BELOW MAP */}
                <div style={{
                    background: 'rgba(17, 24, 39, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #10B981',
                    color: '#10B981',
                    fontFamily: 'monospace',
                    padding: '1rem',
                    maxHeight: '150px',
                    overflowY: 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                        <span>SYSTEM: {isFinished ? 'IDLE' : 'ACTIVE'}</span>
                        <span>COORDS: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                        {status === 'initializing' && <div>&gt; Initializing connection...</div>}
                        {currentAction && <div>&gt; {currentAction}</div>}
                        {results.slice(-3).reverse().map((r, i) => (
                            <div key={i} style={{ opacity: 0.8 }}>
                                &gt; FOUND: {r.name} {r.website ? '[HAS SITE]' : ''}
                            </div>
                        ))}
                        {!isFinished && <div className="cursor-blink">&gt; _</div>}
                    </div>
                </div>

                {/* COUNTER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Found: {results.length} / {searchParams?.maxResults || 50}
                    </div>
                    {!isFinished && <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search in progress...</span>}
                </div>

                {isFinished && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        {/* Export & Filter Controls */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Export CSV Button */}
                            <button
                                onClick={() => {
                                    const headers = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'DataScore', 'UXScore', 'MapsLink'];
                                    const rows = results.map(r => [
                                        r.name || '',
                                        r.phone || '',
                                        r.address || '',
                                        r.website || '',
                                        r.reviews?.rating || '',
                                        r.reviews?.count || '',
                                        r.dataScore || '',
                                        r.uxAnalysis?.score || '',
                                        r.mapsLink || ''
                                    ]);
                                    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `radar_scout_${Date.now()}.csv`;
                                    a.click();
                                }}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export CSV
                            </button>

                            {/* Filter: Has Website */}
                            <select
                                onChange={(e) => setFilter(prev => ({ ...prev, hasWebsite: e.target.value }))}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            >
                                <option value="">All Results</option>
                                <option value="yes">Has Website</option>
                                <option value="no">No Website</option>
                            </select>

                            {/* Filter: Min Score */}
                            <select
                                onChange={(e) => setFilter(prev => ({ ...prev, minScore: parseInt(e.target.value) || 0 }))}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                            >
                                <option value="0">Any Score</option>
                                <option value="5">Score 5+</option>
                                <option value="7">Score 7+</option>
                                <option value="8">Score 8+</option>
                            </select>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={onReset}
                            style={{
                                height: 'fit-content',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.8rem 1.8rem',
                                borderRadius: '10px'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            New Search
                        </button>
                    </div>
                )}
            </div>

            {
                error && (
                    <div style={{ padding: '1rem', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '2rem' }}>
                        <strong>Error:</strong> {error}
                    </div>
                )
            }

            {/* Results Grid with Filtering */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '2rem'
            }}>
                {filteredResults.slice(0, visibleCount).map((item, index) => (
                    <BusinessCard key={index} data={item} />
                ))}
            </div>

            {/* Load More / Pagination */}
            {
                filteredResults.length > visibleCount && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button
                            onClick={() => setVisibleCount(prev => prev + 12)}
                            style={{
                                padding: '0.8rem 2rem',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontWeight: 500
                            }}
                        >
                            Load More ({filteredResults.length - visibleCount} remaining)
                        </button>
                    </div>
                )
            }

            {
                results.length === 0 && isFinished && !error && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem' }}>
                        <p>No results found for your query.</p>
                    </div>
                )
            }
        </div >
    );
}

export default Dashboard;
