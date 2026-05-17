import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_GROUPS = [
  {
    label: 'OPERATIONS',
    items: [
      { path: '/control-room',   icon: '🎛', label: 'Control Room',    badge: 'LIVE' },
      { path: '/karnataka-map',  icon: '🗺', label: 'Railway Map',     badge: 'NEW' },
      { path: '/live-detection', icon: '🎥', label: 'AI Detection',    badge: 'AI' },
      { path: '/cctv',           icon: '📡', label: 'CCTV Monitor',    badge: 'NEW' },
    ]
  },
  {
    label: 'CONTROL',
    items: [
      { path: '/signals',    icon: '🚦', label: 'Signal Control' },
      { path: '/trains',     icon: '🚂', label: 'Train Monitor' },
      { path: '/platform',   icon: '🛤', label: 'Platform Mgmt' },
      { path: '/traffic',    icon: '⬡',  label: 'Traffic Control' },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { path: '/alerts',   icon: '⚠', label: 'Alert Center' },
      { path: '/chatbot',  icon: '◈', label: 'AI Copilot' },
      { path: '/delay',    icon: '◷', label: 'Delay Prediction' },
      { path: '/dashboard',icon: '⬡', label: 'Analytics' },
    ]
  },
  {
    label: 'MANAGEMENT',
    items: [
      { path: '/stations',   icon: '🚉', label: 'Stations' },
      { path: '/conflict',   icon: '⚡', label: 'Route Conflicts' },
      { path: '/emergency',  icon: '🆘', label: 'Emergency' },
      { path: '/reports',    icon: '▤',  label: 'Reports' },
    ]
  }
];

const Sidebar: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const [time, setTime] = useState(new Date());
  const [alertCount] = useState(3);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour12: false });
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <aside style={{
      width: 230, minHeight: '100vh',
      background: 'linear-gradient(180deg, #030810 0%, #04080f 100%)',
      borderRight: '1px solid #0d2a4a',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100,
      boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #0d2a4a' }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 16, fontWeight: 700, letterSpacing: 2,
          color: '#00d4ff',
          textShadow: '0 0 15px rgba(0,212,255,0.6)',
        }}>
          RAIL<span style={{ color: '#e0eaff' }}>CTRL</span>
          <span style={{ fontSize: 10, marginLeft: 6, color: '#ff2244', fontFamily: "'Share Tech Mono'" }}>v7</span>
        </div>
        <div style={{ fontSize: 9, color: '#2a5a8a', marginTop: 3, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
          KARNATAKA SMART RAILWAY
        </div>
        {/* Status */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 6px #00ff88', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontSize: 9, color: '#00ff88', fontFamily: "'Share Tech Mono', monospace" }}>AI SYSTEMS ONLINE</span>
        </div>
      </div>

      {/* Clock */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #070f1e' }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 20, fontWeight: 700,
          color: '#00d4ff',
          textShadow: '0 0 10px rgba(0,212,255,0.4)',
          letterSpacing: 2,
        }}>{fmt(time)}</div>
        <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 2 }}>{fmtDate(time)} IST</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{
              padding: '8px 16px 4px',
              fontSize: 8, color: '#1a4a6a',
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: 2,
            }}>{group.label}</div>
            {group.items.map(item => {
              const active = loc.pathname === item.path;
              return (
                <div key={item.path}
                  onClick={() => nav(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 14px 8px 12px',
                    cursor: 'pointer',
                    background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                    borderLeft: active ? '2px solid #00d4ff' : '2px solid transparent',
                    color: active ? '#00d4ff' : '#4a6a8a',
                    fontSize: 12,
                    fontWeight: active ? 700 : 400,
                    fontFamily: active ? "'Exo 2'" : undefined,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#8aaac0'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#4a6a8a'; }}
                >
                  <span style={{ fontSize: 13, minWidth: 18, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {(item as any).badge && (
                    <span style={{
                      fontSize: 8, padding: '1px 5px', borderRadius: 3,
                      background: (item as any).badge === 'LIVE' ? 'rgba(255,34,68,0.15)' :
                                  (item as any).badge === 'AI' ? 'rgba(0,212,255,0.15)' : 'rgba(0,255,136,0.1)',
                      color: (item as any).badge === 'LIVE' ? '#ff4466' :
                             (item as any).badge === 'AI' ? '#00d4ff' : '#00ff88',
                      border: `1px solid ${(item as any).badge === 'LIVE' ? 'rgba(255,34,68,0.3)' :
                             (item as any).badge === 'AI' ? 'rgba(0,212,255,0.3)' : 'rgba(0,255,136,0.3)'}`,
                      fontFamily: "'Share Tech Mono'",
                      animation: (item as any).badge === 'LIVE' ? 'blink 2s infinite' : 'none',
                    }}>{(item as any).badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Alert indicator */}
      {alertCount > 0 && (
        <div style={{
          margin: '8px 12px',
          background: 'rgba(255,34,68,0.08)',
          border: '1px solid rgba(255,34,68,0.3)',
          borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', animation: 'blink 3s infinite',
        }} onClick={() => nav('/alerts')}>
          <span style={{ color: '#ff2244', fontSize: 14 }}>⚠</span>
          <span style={{ fontSize: 11, color: '#ff4466', fontFamily: "'Share Tech Mono'" }}>{alertCount} ACTIVE ALERTS</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #0d2a4a' }}>
        <div onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#3a5a7a', fontSize: 12, transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#6a8aaa'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3a5a7a'}
        >
          <span>⏏</span><span>Logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
