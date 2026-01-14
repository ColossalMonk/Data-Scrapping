import React, { useState, useEffect } from 'react';

function BusinessCard({ data }) {
    const { name, website, phone, address, screenshot, uxAnalysis, dataScore, mapsLink, error } = data;
    const [showDetails, setShowDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    // Handle Esc key to close modal
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') setShowDetails(false); };
        if (showDetails) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showDetails]);

    const getBadgeClass = (score) => {
        if (score >= 8) return 'badge-green';
        if (score >= 5) return 'badge-blue';
        return 'badge-red';
    };

    return (
        <>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={{
                    height: '180px',
                    background: 'var(--bg-page)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={screenshot ? `http://localhost:3000${screenshot}` : '/placeholder.svg'}
                        alt={`${name} Screenshot`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#F3F4F6' }}
                        onError={(e) => { e.target.src = '/placeholder.svg'; }}
                    />

                    {/* Badges */}
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                        {data.reviews && data.reviews.rating && (
                            <span className="badge badge-yellow" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {data.reviews.rating} ({parseInt(data.reviews.count || '0', 10).toLocaleString()})
                            </span>
                        )}
                        {uxAnalysis && uxAnalysis.score !== undefined && (
                            <span className={`badge ${getBadgeClass(uxAnalysis.score)}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                UX: {uxAnalysis.score}/10
                            </span>
                        )}
                        {dataScore !== undefined && (
                            <span className={`badge ${getBadgeClass(dataScore)}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                Data: {dataScore}/10
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>{name}</h3>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', flex: 1 }}>
                        {address || 'No address found'} <br />
                        {phone || 'No phone found'}
                    </p>

                    {uxAnalysis && uxAnalysis.summary && (
                        <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            <strong>UX Verdict: </strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{uxAnalysis.summary.substring(0, 80)}...</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        {website ? (
                            <a
                                href={website}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary"
                                style={{ flex: 1, textAlign: 'center', padding: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}
                            >
                                Visit
                            </a>
                        ) : (
                            <button disabled style={{ flex: 1, padding: '0.5rem', border: 'none', background: 'var(--bg-page)', color: 'var(--text-secondary)', borderRadius: '6px' }}>No Site</button>
                        )}

                        <button
                            onClick={() => setShowDetails(true)}
                            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: '6px', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                            Details
                        </button>
                    </div>
                </div>
            </div>

            {/* ENLARGED 2-TAB MODAL */}
            {showDetails && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(10px)'
                }} onClick={() => setShowDetails(false)}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '24px', width: '95%', maxWidth: '850px',
                        maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.4)',
                        display: 'flex', flexDirection: 'column'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border-light)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{name}</h2>
                            <button onClick={() => setShowDetails(false)} style={{ border: 'none', background: 'none', fontSize: '2rem', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1 }}>&times;</button>
                        </div>

                        {/* 2 Tab Navigation */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-page)' }}>
                            <button
                                onClick={() => setActiveTab('details')}
                                style={{
                                    flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'details' ? 'var(--bg-card)' : 'transparent',
                                    borderBottom: activeTab === 'details' ? '3px solid #FF6154' : '3px solid transparent',
                                    fontWeight: activeTab === 'details' ? 700 : 500,
                                    color: activeTab === 'details' ? '#FF6154' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                Intelligence Deep-Dive
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                style={{
                                    flex: 1, padding: '1.25rem', border: 'none', cursor: 'pointer',
                                    background: activeTab === 'reviews' ? 'var(--bg-card)' : 'transparent',
                                    borderBottom: activeTab === 'reviews' ? '3px solid #FF6154' : '3px solid transparent',
                                    fontWeight: activeTab === 'reviews' ? 700 : 500,
                                    color: activeTab === 'reviews' ? '#FF6154' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                Social Consensus
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div style={{ padding: '2.5rem', flex: 1, overflowY: 'auto' }}>
                            {activeTab === 'details' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                                    {/* Scores */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div style={{ background: 'var(--bg-page)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.1em', fontWeight: 600 }}>Data Integrity</div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FF6154', lineHeight: 1 }}>{dataScore}<span style={{ fontSize: '1rem', opacity: 0.5 }}>/10</span></div>
                                        </div>
                                        <div style={{ background: 'var(--bg-page)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.1em', fontWeight: 600 }}>UX Architecture</div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#6366F1', lineHeight: 1 }}>{uxAnalysis?.score || 'N/A'}<span style={{ fontSize: '1rem', opacity: 0.5 }}>/10</span></div>
                                        </div>
                                    </div>

                                    {/* Technical Profile Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', padding: '2.5rem', background: 'var(--bg-page)', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Direct Telephone</strong>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{phone || 'Not available'}</span>
                                            </div>
                                            <div>
                                                <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Verified Email</strong>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: data.email ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{data.email || 'Awaiting discovery'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Digital Domain</strong>
                                                {website ? <a href={website} target="_blank" rel="noreferrer" style={{ color: '#FF6154', wordBreak: 'break-all', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>{website.replace(/^https?:\/\//, '')}</a> : <span style={{ color: 'var(--text-secondary)' }}>N/A</span>}
                                            </div>
                                            <div>
                                                <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Maps Intelligence</strong>
                                                {mapsLink ? <a href={mapsLink} target="_blank" rel="noreferrer" style={{ color: '#FF6154', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>View Source Link</a> : <span style={{ color: 'var(--text-secondary)' }}>N/A</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 1rem' }}>
                                        <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Physical Operations Center</strong>
                                        <span style={{ fontSize: '1.15rem', lineHeight: 1.6, fontWeight: 500 }}>{address || 'Location data restricted'}</span>
                                    </div>

                                    {/* AI Analysis Report */}
                                    {uxAnalysis && uxAnalysis.summary && (
                                        <div style={{ background: 'var(--bg-page)', padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border-light)', margin: '0 0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                                <div style={{ width: '8px', height: '24px', background: '#FF6154', borderRadius: '4px' }}></div>
                                                <strong style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Intelligence Report Summary</strong>
                                            </div>
                                            <p style={{ margin: '0', lineHeight: 1.8, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{uxAnalysis.summary}</p>
                                            {uxAnalysis.details && uxAnalysis.details.length > 0 && (
                                                <ul style={{ paddingLeft: '1.5rem', marginTop: '2rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '15px' }}>
                                                    {uxAnalysis.details.map((d, i) => <li key={i} style={{ fontSize: '1rem', marginBottom: '6px' }}>{d}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
                                    {/* Overall Rating Section */}
                                    <div style={{ padding: '2.5rem', background: 'var(--bg-page)', borderRadius: '24px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{data.reviews?.rating || 'N/A'}</div>
                                        <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginTop: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overall Rating</div>
                                        <div style={{ marginTop: '1.5rem', fontSize: '1.3rem', fontWeight: 700 }}>
                                            {parseInt(data.reviews?.count || '0', 10).toLocaleString()} Reviews
                                        </div>
                                    </div>

                                    {/* Star Breakdown Section */}
                                    {data.reviews?.breakdown && (
                                        <div style={{ padding: '2.5rem', background: 'var(--bg-page)', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                                                <div style={{ width: '8px', height: '24px', background: '#FFD166', borderRadius: '4px' }}></div>
                                                <strong style={{ fontSize: '1.2rem', fontWeight: 800 }}>Rating Breakdown</strong>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {[5, 4, 3, 2, 1].map((stars) => {
                                                    const count = data.reviews.breakdown[stars] || 0;
                                                    const total = parseInt(data.reviews.count) || 1;
                                                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                                    return (
                                                        <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                            <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '1rem', flexShrink: 0 }}>
                                                                {'⭐'.repeat(stars)} {stars} {stars === 1 ? 'Star' : 'Stars'}
                                                            </div>
                                                            <div style={{ width: '300px', background: 'var(--border-light)', height: '24px', borderRadius: '12px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                                                                <div style={{ 
                                                                    height: '100%', 
                                                                    width: `${Math.max(percentage, 2)}%`,  // Minimum 2% width to stay visible
                                                                    background: `linear-gradient(90deg, hsl(${(5-stars)*12}, 85%, 50%), hsl(${(5-stars)*12}, 85%, 60%))`,
                                                                    borderRadius: '12px',
                                                                    transition: 'width 0.4s ease',
                                                                    boxShadow: `0 2px 8px hsla(${(5-stars)*12}, 85%, 50%, 0.3)`
                                                                }} />
                                                            </div>
                                                            <div style={{ minWidth: '70px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1rem', flexShrink: 0 }}>
                                                                {count.toLocaleString()} ({percentage}%)
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center' }}>
                                        Sentiment data aggregated directly from official Google citation sources. Star distribution shows the composition of all reviews.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-page)' }}>
                            <button onClick={() => setShowDetails(false)} style={{ padding: '1rem 3rem', background: '#FF6154', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(255, 97, 84, 0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                Dismiss Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default BusinessCard;
