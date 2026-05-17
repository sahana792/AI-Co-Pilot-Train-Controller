import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Safely extract array from any API response shape
function toArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const keys = Object.keys(val);
  for (const k of keys) {
    if (Array.isArray(val[k])) return val[k];
  }
  return [];
}

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  occupied:    { color: '#00b0ff', bg: 'rgba(0,176,255,0.07)',   label: 'OCCUPIED' },
  available:   { color: '#00e676', bg: 'rgba(0,230,118,0.06)',   label: 'AVAILABLE' },
  maintenance: { color: '#ffd600', bg: 'rgba(255,214,0,0.06)',   label: 'MAINTENANCE' },
  reserved:    { color: '#c084ff', bg: 'rgba(192,132,255,0.06)', label: 'RESERVED' },
};

// ─── Occupancy Bar ────────────────────────────────────────────────────────────

const OccupancyBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{ background: '#0a1525', borderRadius: 4, height: 5, overflow: 'hidden', marginTop: 6 }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        height: '100%',
        background: pct > 85 ? '#ff2244' : pct > 60 ? '#ffd700' : color,
        borderRadius: 4,
      }}
    />
  </div>
);

// ─── Platform Card ────────────────────────────────────────────────────────────

const PlatformCard: React.FC<{
  pf: any;
  onStatusChange: (id: string, s: string) => void;
}> = ({ pf, onStatusChange }) => {
  const cfg = STATUS_CFG[pf.status] || STATUS_CFG.available;
  const occ = pf.current_occupancy ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 11,
        padding: '13px 15px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 16, fontWeight: 700, color: '#e0eaff' }}>
            PF {pf.platform_number || pf.platform_id}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#2a5a8a', marginTop: 2 }}>
            {pf.station || pf.platform_id}
          </div>
        </div>
        <span style={{
          fontSize: 9, padding: '3px 8px', borderRadius: 4,
          background: `${cfg.color}18`, color: cfg.color,
          border: `1px solid ${cfg.color}40`,
          fontFamily: "'Share Tech Mono'", fontWeight: 700,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Train Info */}
      {pf.train_id && (
        <div style={{
          background: '#040c18', borderRadius: 7, padding: '7px 10px',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12 }}>🚂</span>
          <div>
            <div style={{ fontSize: 11, color: '#00d4ff', fontFamily: "'Share Tech Mono'" }}>{pf.train_id}</div>
            <div style={{ fontSize: 9, color: '#2a5a8a' }}>
              {pf.scheduled_arrival && `Arr: ${pf.scheduled_arrival}`}
              {pf.scheduled_departure && ` · Dep: ${pf.scheduled_departure}`}
            </div>
          </div>
        </div>
      )}

      {/* Occupancy */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#3a6a8a', fontFamily: "'Share Tech Mono'" }}>
          <span>OCCUPANCY</span>
          <span style={{ color: occ > 85 ? '#ff2244' : '#00d4ff' }}>{occ}%</span>
        </div>
        <OccupancyBar pct={occ} color={cfg.color} />
      </div>

      {/* Status Buttons */}
      <div style={{ display: 'flex', gap: 5 }}>
        {Object.keys(STATUS_CFG).map(s => {
          const sc = STATUS_CFG[s];
          return (
            <motion.button key={s} whileTap={{ scale: 0.93 }}
              onClick={() => onStatusChange(pf.platform_id, s)}
              style={{
                flex: 1, padding: '5px 3px', borderRadius: 6,
                background: pf.status === s ? `${sc.color}18` : 'transparent',
                border: `1px solid ${pf.status === s ? sc.color : '#1a3a5a'}`,
                color: pf.status === s ? sc.color : '#2a5a8a',
                cursor: 'pointer', fontSize: 8,
                fontFamily: "'Share Tech Mono'", transition: 'all 0.15s',
              }}>
              {sc.label.slice(0, 4)}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PlatformMgmt: React.FC = () => {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [station, setStation] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // ✅ FIXED: correct endpoint GET /api/platform/status
  const fetchPlatforms = useCallback(async () => {
    try {
      const r = await fetch(`${API}/platform/status`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const pList = toArray(d);
      setPlatforms(pList);
      setError(null);
    } catch (e: any) {
      setError(`Failed to fetch platforms: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
    const t = setInterval(fetchPlatforms, 5000);
    return () => clearInterval(t);
  }, [fetchPlatforms]);

  // ✅ FIXED: correct endpoint POST /api/platform/update
  const changeStatus = async (id: string, status: string) => {
    // Optimistic local update
    setPlatforms(prev => prev.map(p => p.platform_id === id ? { ...p, status } : p));
    setLastAction(`${id} → ${status} at ${new Date().toLocaleTimeString()}`);

    try {
      const r = await fetch(`${API}/platform/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_id: id, status }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(`Platform update failed: ${e.message}`);
      // Re-fetch to sync real state from server
      fetchPlatforms();
    }
  };

  const stations = ['all', ...Array.from(new Set(platforms.map(p => p.station).filter(Boolean)))];
  const filtered = platforms.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (station === 'all' || p.station === station)
  );
  const counts: Record<string, number> = { all: platforms.length, occupied: 0, available: 0, maintenance: 0, reserved: 0 };
  platforms.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.4)',
              borderRadius: 8, padding: '10px 14px', color: '#ff1744',
              fontFamily: "'Share Tech Mono'", fontSize: 11,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
            ⚠ {error}
            <button onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#ff1744', cursor: 'pointer', fontSize: 14 }}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #0d2040' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: '#e0eaff', letterSpacing: 2, margin: 0 }}>
            🛤 PLATFORM MANAGEMENT
          </h1>
          <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>
            REAL-TIME PLATFORM STATUS & CONTROL
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lastAction && (
            <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>
              Last: {lastAction}
            </div>
          )}
          <button onClick={fetchPlatforms}
            style={{
              padding: '7px 14px', borderRadius: 7,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
              color: '#00d4ff', cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'",
            }}>
            ↺ REFRESH
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        {(['all', 'occupied', 'available', 'maintenance', 'reserved'] as const).map(s => {
          const c = s === 'all' ? '#00d4ff' : STATUS_CFG[s]?.color || '#888';
          return (
            <div key={s} onClick={() => setFilter(s)}
              style={{
                background: '#060f1e',
                border: `1px solid ${filter === s ? c + '60' : '#0d2040'}`,
                borderTop: `2px solid ${c}`,
                borderRadius: 8, padding: '10px 14px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
              <div style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, marginBottom: 4, fontFamily: "'Share Tech Mono'", textTransform: 'uppercase' }}>
                {s}
              </div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 700, color: c }}>
                {counts[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Station Filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>STATION:</span>
        {stations.map(s => (
          <button key={s} onClick={() => setStation(s)}
            style={{
              padding: '5px 12px', borderRadius: 6,
              background: station === s ? 'rgba(0,212,255,0.1)' : 'transparent',
              border: `1px solid ${station === s ? 'rgba(0,212,255,0.4)' : '#1a3a5a'}`,
              color: station === s ? '#00d4ff' : '#4a7a9a',
              cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
            }}>
            {s === 'all' ? 'All Stations' : s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", fontSize: 12 }}>
          ⟳ Loading platforms...
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          <AnimatePresence>
            {filtered.map(pf => (
              <PlatformCard key={pf.platform_id} pf={pf} onStatusChange={changeStatus} />
            ))}
            {!filtered.length && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", fontSize: 12 }}>
                No platforms found
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PlatformMgmt;