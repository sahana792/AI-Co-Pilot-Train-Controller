/**
 * Alerts.tsx — Alert Center with Voice Announcements
 * ────────────────────────────────────────────────────
 * Integrated with voiceAlert service:
 *  🔊 Auto-announces new alerts as they arrive
 *  🔕 Respects global mute state
 *  🚨 Critical alerts interrupt & speak immediately
 *  📢 Per-severity audio with cooldown (no repeats)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const SEV: Record<string, { color: string; bg: string; icon: string }> = {
  CRITICAL: { color: '#ff2244', bg: 'rgba(255,34,68,0.08)',   icon: '🚨' },
  HIGH:     { color: '#ff8c00', bg: 'rgba(255,140,0,0.07)',   icon: '⚠' },
  MEDIUM:   { color: '#ffd700', bg: 'rgba(255,215,0,0.06)',   icon: '⚡' },
  LOW:      { color: '#00ff88', bg: 'rgba(0,255,136,0.05)',   icon: 'ℹ' },
};

const AlertCard: React.FC<{ alert: any; onAck: (id: string) => void }> = ({ alert, onAck }) => {
  const s = SEV[alert.severity?.toUpperCase() || 'LOW'] || SEV.LOW;
  const isCritical = alert.severity?.toUpperCase() === 'CRITICAL';

  const speakNow = () => {
    voiceAlert.announceAlert({ ...alert, id: alert.id + '_manual' }); // bypass cooldown
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      style={{
        background: s.bg, border: `1px solid ${s.color}30`,
        borderLeft: `3px solid ${s.color}`, borderRadius: 10,
        padding: '12px 14px', marginBottom: 8,
        boxShadow: isCritical ? `0 0 16px ${s.color}12` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>{s.icon}</span>
          <div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, color: '#e0eaff' }}>
              {alert.type || 'Alert'}
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#2a5a8a', marginTop: 1 }}>
              {alert.id}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 4,
            background: `${s.color}18`, color: s.color,
            border: `1px solid ${s.color}40`,
            fontFamily: "'Share Tech Mono'", fontWeight: 700,
            animation: isCritical ? 'blink 1.5s infinite' : 'none',
          }}>{alert.severity?.toUpperCase()}</span>

          {/* 🔊 Speak this alert button */}
          <button
            onClick={speakNow}
            title="Read this alert aloud"
            style={{
              padding: '3px 8px', borderRadius: 5,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
              color: '#00d4ff', cursor: 'pointer', fontSize: 12,
            }}
          >🔊</button>

          <button
            onClick={() => onAck(alert.id)}
            style={{
              padding: '3px 8px', borderRadius: 5,
              background: 'rgba(255,255,255,0.04)', border: '1px solid #1a3a5a',
              color: '#4a7a9a', cursor: 'pointer', fontSize: 10,
              fontFamily: "'Share Tech Mono'",
            }}
          >ACK</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#c0d4e8', lineHeight: 1.5, marginBottom: 6 }}>
        {alert.message}
      </div>
      {alert.operator_action && (
        <div style={{ fontSize: 11, color: '#6aaac0', fontStyle: 'italic', lineHeight: 1.4 }}>
          → {alert.operator_action}
        </div>
      )}
      <div style={{
        marginTop: 8, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: 9, color: '#1a4a6a', fontFamily: "'Share Tech Mono'",
      }}>
        <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : ''}</span>
        {alert.confidence && <span>Conf: {(alert.confidence * 100).toFixed(0)}%</span>}
      </div>
    </motion.div>
  );
};

const Alerts: React.FC = () => {
  const [alerts,      setAlerts]      = useState<any[]>([]);
  const [filter,      setFilter]      = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [voiceOn,     setVoiceOn]     = useState(!voiceAlert.isMuted);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/alerts`);
      const d = await r.json();
      const incoming: any[] = d.alerts || d || [];
      setAlerts(incoming);

      // 🔊 Announce only NEW alerts (not seen before)
      incoming.forEach(alert => {
        if (!seenIds.current.has(alert.id)) {
          seenIds.current.add(alert.id);
          voiceAlert.announceAlert(alert);
        }
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    if (autoRefresh) {
      const t = setInterval(fetchAlerts, 4000);
      return () => clearInterval(t);
    }
  }, [fetchAlerts, autoRefresh]);

  // Sync voice toggle with global mute state
// Sync voice toggle with global mute state
useEffect(() => {
  const unsubscribe = voiceAlert.onMuteChange((muted: boolean) => {
    setVoiceOn(!muted);
  });

  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}, []);

  const ack = (id: string) => setAlerts(prev => prev.filter(a => a.id !== id));
  const ackAll = () => setAlerts([]);

  // 🔊 Announce all current alerts (manual trigger)
  const announceAll = () => {
    if (!alerts.length) return;
    voiceAlert.stopAll();
    // Announce critical first
    const sorted = [...alerts].sort((a, b) => {
      const ord: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (ord[b.severity?.toUpperCase()] || 0) - (ord[a.severity?.toUpperCase()] || 0);
    });
    sorted.forEach(a => {
      voiceAlert.announceAlert({ ...a, id: a.id + '_manual' });
    });
  };

  const toggleVoice = () => {
    voiceAlert.toggleMute();
    setVoiceOn(!voiceAlert.isMuted);
  };

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => (a.severity || '').toUpperCase() === filter);
  const counts: Record<string, number> = { ALL: alerts.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  alerts.forEach(a => { const s = (a.severity || 'LOW').toUpperCase(); if (counts[s] !== undefined) counts[s]++; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 12, borderBottom: '1px solid #0d2040',
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700,
            color: '#e0eaff', letterSpacing: 2, margin: 0 }}>⚠ ALERT CENTER</h1>
          <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>
            REAL-TIME AI ALERT MANAGEMENT · VOICE ANNOUNCEMENTS ACTIVE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 🔊 Voice toggle */}
          <button onClick={toggleVoice} style={{
            padding: '6px 12px', borderRadius: 7,
            background: voiceOn ? 'rgba(0,212,255,0.08)' : 'rgba(255,34,68,0.08)',
            border: `1px solid ${voiceOn ? 'rgba(0,212,255,0.3)' : 'rgba(255,34,68,0.3)'}`,
            color: voiceOn ? '#00d4ff' : '#ff4466',
            cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>
            {voiceOn ? '🔊 VOICE ON' : '🔕 VOICE OFF'}
          </button>

          {/* 📢 Announce all */}
          <button onClick={announceAll} style={{
            padding: '6px 12px', borderRadius: 7,
            background: 'rgba(255,140,0,0.07)', border: '1px solid rgba(255,140,0,0.3)',
            color: '#ff8c00', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>📢 READ ALL</button>

          <button onClick={() => setAutoRefresh(a => !a)} style={{
            padding: '6px 12px', borderRadius: 7,
            background: autoRefresh ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${autoRefresh ? 'rgba(0,255,136,0.3)' : '#1a3a5a'}`,
            color: autoRefresh ? '#00ff88' : '#4a7a9a',
            cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>
            {autoRefresh ? '⟳ AUTO' : '○ PAUSED'}
          </button>

          <button onClick={fetchAlerts} style={{
            padding: '6px 12px', borderRadius: 7,
            background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
            color: '#00d4ff', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>↺ REFRESH</button>

          <button onClick={ackAll} style={{
            padding: '6px 12px', borderRadius: 7,
            background: 'rgba(255,34,68,0.07)', border: '1px solid rgba(255,34,68,0.3)',
            color: '#ff4466', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
          }}>✓ ACK ALL</button>
        </div>
      </div>

      {/* Severity count tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => {
          const c = SEV[s]?.color || '#00d4ff';
          return (
            <div key={s}
              style={{
                background: '#060f1e',
                border: `1px solid ${filter === s ? c + '50' : '#0d2040'}`,
                borderTop: `2px solid ${c}`,
                borderRadius: 8, padding: '10px 14px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onClick={() => setFilter(s)}
            >
              <div style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1,
                marginBottom: 4, fontFamily: "'Share Tech Mono'" }}>{s}</div>
              <div style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 700, color: c,
                animation: s === 'CRITICAL' && counts[s] > 0 ? 'blink 2s infinite' : 'none',
              }}>{counts[s]}</div>
              {/* 🔊 Quick speak severity */}
              {counts[s] > 0 && s !== 'ALL' && (
                <div
                  onClick={e => {
                    e.stopPropagation();
                    const sevAlerts = alerts.filter(a => (a.severity || '').toUpperCase() === s);
                    sevAlerts.forEach(a => voiceAlert.announceAlert({ ...a, id: a.id + '_tile' }));
                  }}
                  title={`Read all ${s} alerts`}
                  style={{
                    fontSize: 9, color: c, marginTop: 4, cursor: 'pointer',
                    fontFamily: "'Share Tech Mono'",
                  }}
                >🔊 read</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: 60, color: '#00ff88',
                fontFamily: "'Share Tech Mono'", fontSize: 14 }}>
              ✓ NO ACTIVE ALERTS
            </motion.div>
          )}
          {filtered.map(a => <AlertCard key={a.id} alert={a} onAck={ack} />)}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Alerts;
