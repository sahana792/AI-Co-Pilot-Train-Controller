import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SIG_COLOR: Record<string, string> = {
  Green: '#00e676',
  Yellow: '#ffd600',
  Red: '#ff1744',
  Fault: '#ff6d00',
};

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

// ─── Signal Light ────────────────────────────────────────────────────────────

const SignalLight: React.FC<{ status: string; size?: number }> = ({ status, size = 14 }) => {
  const states = ['Red', 'Yellow', 'Green'];
  return (
    <div style={{
      background: '#0d1a2a', borderRadius: 6, padding: '6px 4px',
      display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
      border: '1px solid #1a3a5a', width: size * 2,
    }}>
      {states.map(s => {
        const active = s === status;
        const c = SIG_COLOR[s];
        return (
          <div key={s} style={{ position: 'relative' }}>
            <motion.div
              animate={active ? { boxShadow: [`0 0 6px ${c}`, `0 0 20px ${c}`, `0 0 6px ${c}`] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: size, height: size, borderRadius: '50%',
                background: active ? c : '#0a1525',
                border: `1px solid ${active ? c : '#1a3a5a'}`,
                transition: 'all 0.3s',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

// ─── Signal Card ─────────────────────────────────────────────────────────────

const SignalCard: React.FC<{
  signal: any;
  onToggle: (id: string, status: string) => void;
  onAutoToggle: (id: string) => void;
}> = ({ signal, onToggle, onAutoToggle }) => {
  const c = SIG_COLOR[signal.status] || '#888';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#060f1e',
        border: `1px solid ${c}25`,
        borderRadius: 12,
        padding: 14,
        boxShadow: `0 0 15px ${c}08`,
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: '#e0eaff' }}>
            {signal.signal_id}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#2a5a8a', marginTop: 2 }}>
            {signal.location || signal.track || 'N/A'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SignalLight status={signal.status} size={12} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: "'Share Tech Mono'" }}>
              {signal.status}
            </div>
            {signal.auto_mode && (
              <div style={{ fontSize: 8, color: '#00d4ff', fontFamily: "'Share Tech Mono'", marginTop: 2 }}>AUTO</div>
            )}
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div style={{
        background: '#040c18', borderRadius: 8, padding: '8px 10px',
        marginBottom: 10, display: 'flex', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 8, color: '#2a5a8a', marginBottom: 2 }}>TRACK</div>
          <div style={{ fontSize: 11, color: '#c0d4e8', fontFamily: "'Share Tech Mono'" }}>
            {signal.track || 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#2a5a8a', marginBottom: 2 }}>LAST UPDATED</div>
          <div style={{ fontSize: 10, color: '#c0d4e8', fontFamily: "'Share Tech Mono'" }}>
            {signal.last_updated ? new Date(signal.last_updated).toLocaleTimeString() : '--:--'}
          </div>
        </div>
      </div>

      {/* Status Buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['Green', 'Yellow', 'Red'].map(s => {
          const sc = SIG_COLOR[s];
          const active = signal.status === s;
          return (
            <motion.button key={s} whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(signal.signal_id, s)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 7,
                background: active ? `${sc}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? sc : '#1a3a5a'}`,
                color: active ? sc : '#4a6a8a',
                cursor: 'pointer', fontSize: 11,
                fontFamily: "'Share Tech Mono'",
                fontWeight: active ? 700 : 400,
                boxShadow: active ? `0 0 10px ${sc}30` : 'none',
                transition: 'all 0.2s',
              }}>
              {s}
            </motion.button>
          );
        })}
      </div>

      {/* Auto / E-Stop */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onAutoToggle(signal.signal_id)}
          style={{
            flex: 1, padding: '6px', borderRadius: 7,
            background: signal.auto_mode ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${signal.auto_mode ? 'rgba(0,212,255,0.4)' : '#1a3a5a'}`,
            color: signal.auto_mode ? '#00d4ff' : '#4a6a8a',
            cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>
          {signal.auto_mode ? '◉ AUTO ON' : '○ AUTO OFF'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onToggle(signal.signal_id, 'Red')}
          style={{
            flex: 1, padding: '6px', borderRadius: 7,
            background: 'rgba(255,23,68,0.08)',
            border: '1px solid rgba(255,23,68,0.3)',
            color: '#ff1744', cursor: 'pointer',
            fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>
          🛑 E-STOP
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SignalControl: React.FC = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [autoAll, setAutoAll] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: correct endpoint GET /api/signal/status
  const fetchSignals = useCallback(async () => {
    try {
      const r = await fetch(`${API}/signal/status`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const sigs = toArray(d);
      setSignals(sigs);
      setError(null);
    } catch (e: any) {
      setError(`Failed to fetch signals: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const t = setInterval(fetchSignals, 4000);
    return () => clearInterval(t);
  }, [fetchSignals]);

  // ✅ FIXED: correct endpoint POST /api/signal/control
  const toggleSignal = async (id: string, status: string) => {
    // Optimistic local update
    setSignals(prev => prev.map(s => s.signal_id === id ? { ...s, status } : s));
    setLastAction(`${id} → ${status} at ${new Date().toLocaleTimeString()}`);

    try {
      const r = await fetch(`${API}/signal/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_id: id, status, reason: 'Manual override' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(`Signal update failed: ${e.message}`);
      // Re-fetch to sync real state from server
      fetchSignals();
    }
  };

  const toggleAuto = (id: string) => {
    setSignals(prev => prev.map(s => s.signal_id === id ? { ...s, auto_mode: !s.auto_mode } : s));
  };

  // Sequential to avoid hammering the API
  const setAllGreen = async () => {
    for (const s of signals) await toggleSignal(s.signal_id, 'Green');
  };
  const setAllRed = async () => {
    for (const s of signals) await toggleSignal(s.signal_id, 'Red');
  };

  const toggleAutoAll = () => {
    const next = !autoAll;
    setAutoAll(next);
    setSignals(prev => prev.map(s => ({ ...s, auto_mode: next })));
  };

  const filtered = filter === 'All' ? signals : signals.filter(s => s.status === filter);
  const counts: Record<string, number> = { Green: 0, Yellow: 0, Red: 0, Fault: 0 };
  signals.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });

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
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 12, borderBottom: '1px solid #0d2040',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700,
            color: '#e0eaff', letterSpacing: 2, margin: 0,
          }}>🚦 SIGNAL CONTROL</h1>
          <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>
            DIGITAL SIGNAL MANAGEMENT SYSTEM
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={setAllGreen}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.4)',
              color: '#00e676', cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'",
            }}>
            ALL GREEN
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={setAllRed}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.4)',
              color: '#ff1744', cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'",
            }}>
            ALL RED
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={toggleAutoAll}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: autoAll ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.06)',
              border: `1px solid ${autoAll ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}`,
              color: '#00d4ff', cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'",
            }}>
            {autoAll ? '⚡ AUTO ALL' : '○ AUTO ALL'}
          </motion.button>
        </div>
      </div>

      {/* Status Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {Object.entries(counts).map(([s, c]) => {
          const color = SIG_COLOR[s] || '#888';
          return (
            <div key={s}
              onClick={() => setFilter(filter === s ? 'All' : s)}
              style={{
                background: '#060f1e', border: `1px solid ${color}25`,
                borderTop: `2px solid ${color}`, borderRadius: 8,
                padding: '10px 14px', cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, fontFamily: "'Share Tech Mono'" }}>
                  {s.toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 700, color }}>{c}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['All', 'Green', 'Yellow', 'Red'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 7,
              background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(0,212,255,0.4)' : '#1a3a5a'}`,
              color: filter === f ? '#00d4ff' : '#4a6a8a',
              cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'",
            }}>
            {f}
          </button>
        ))}
        {lastAction && (
          <div style={{
            marginLeft: 'auto', fontSize: 9, color: '#2a5a8a',
            fontFamily: "'Share Tech Mono'", alignSelf: 'center',
          }}>
            Last: {lastAction}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: 40, color: '#2a5a8a',
          fontFamily: "'Share Tech Mono'", fontSize: 12,
        }}>
          ⟳ Loading signals...
        </div>
      )}

      {/* Signal Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {filtered.map(sig => (
            <SignalCard key={sig.signal_id} signal={sig} onToggle={toggleSignal} onAutoToggle={toggleAuto} />
          ))}
          {!filtered.length && (
            <div style={{
              gridColumn: '1/-1', textAlign: 'center', padding: 40,
              color: '#2a5a8a', fontFamily: "'Share Tech Mono'", fontSize: 12,
            }}>
              No signals found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SignalControl;