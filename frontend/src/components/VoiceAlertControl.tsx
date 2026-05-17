/**
 * VoiceAlertControl.tsx — Floating Voice Alert Settings Widget
 * ─────────────────────────────────────────────────────────────
 * Fixed-position widget visible on ALL pages.
 * Features:
 *  🔊 / 🔕  Mute toggle with animated icon
 *  🎚  Volume slider
 *  🎛  Severity filter (which severities to announce)
 *  🔬  Test buttons per severity
 *  📋  Last 5 announcements log
 */

import React, { useState, useEffect, useRef } from 'react';
import voiceAlert, { AlertSeverity } from '../services/voiceAlert';

const SEVERITIES: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const SEV_COLOR: Record<AlertSeverity, string> = {
  CRITICAL: '#ff2244',
  HIGH:     '#ff8c00',
  MEDIUM:   '#ffd700',
  LOW:      '#00ff88',
  INFO:     '#00d4ff',
};
const ENABLED_KEY = 'railctrl_voice_enabled_severities';

function getEnabledSeverities(): Set<AlertSeverity> {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw) return new Set(JSON.parse(raw) as AlertSeverity[]);
  } catch {}
  return new Set(['CRITICAL', 'HIGH', 'MEDIUM'] as AlertSeverity[]);
}

function saveEnabledSeverities(set: Set<AlertSeverity>) {
  localStorage.setItem(ENABLED_KEY, JSON.stringify([...set]));
}

export { getEnabledSeverities }; // exported so other components can check

const VoiceAlertControl: React.FC = () => {
  const [open,    setOpen]    = useState(false);
  const [muted,   setMuted]   = useState(voiceAlert.isMuted);
  const [volume,  setVolume]  = useState(voiceAlert.volume);
  const [enabled, setEnabled] = useState<Set<AlertSeverity>>(getEnabledSeverities());
  const [log,     setLog]     = useState<string[]>([]);
  const [pulse,   setPulse]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Subscribe to mute changes from anywhere
  useEffect(() => {
    return voiceAlert.onMuteChange(m => setMuted(m));
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleMute = () => {
    const nowMuted = voiceAlert.toggleMute();
    setMuted(nowMuted);
  };

  const changeVolume = (v: number) => {
    voiceAlert.volume = v;
    setVolume(v);
  };

  const toggleSeverity = (s: AlertSeverity) => {
    const next = new Set(enabled);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } // keep at least 1
    else next.add(s);
    setEnabled(next);
    saveEnabledSeverities(next);
  };

  const testVoice = (s: AlertSeverity) => {
    voiceAlert.test(s);
    const msg = `[${s}] Test announcement`;
    setLog(prev => [msg, ...prev].slice(0, 5));
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
  };

  // Pulse animation when new alert fires
  const handleNewAlert = () => {
    if (!muted) {
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={muted ? 'Voice Alerts: MUTED — Click to configure' : 'Voice Alerts: ON — Click to configure'}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: muted
            ? 'rgba(255,34,68,0.15)'
            : pulse
            ? 'rgba(0,212,255,0.3)'
            : 'rgba(0,212,255,0.12)',
          border: `2px solid ${muted ? '#ff224488' : pulse ? '#00d4ff' : '#00d4ff55'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          boxShadow: muted
            ? '0 0 20px rgba(255,34,68,0.2)'
            : pulse
            ? '0 0 28px rgba(0,212,255,0.6)'
            : '0 0 16px rgba(0,212,255,0.2)',
          transition: 'all 0.25s ease',
          transform: pulse ? 'scale(1.12)' : 'scale(1)',
        }}
      >
        {muted ? '🔕' : '🔊'}
      </button>

      {/* Muted badge */}
      {muted && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          background: '#ff2244', borderRadius: '50%',
          width: 16, height: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: 'white', fontWeight: 700,
          border: '2px solid #02060f',
        }}>✕</div>
      )}

      {/* ── Settings panel ── */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 62, right: 0,
          width: 300,
          background: 'linear-gradient(180deg, #060f1e 0%, #040810 100%)',
          border: '1px solid #0d2a4a',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', background: 'rgba(0,212,255,0.05)',
            borderBottom: '1px solid #0d2a4a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700,
                color: '#00d4ff', letterSpacing: 1.5 }}>VOICE ALERTS</div>
              <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'",
                marginTop: 2 }}>SPEECH ANNOUNCEMENT SYSTEM</div>
            </div>
            <button
              onClick={toggleMute}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: muted ? 'rgba(255,34,68,0.15)' : 'rgba(0,255,136,0.1)',
                color: muted ? '#ff4466' : '#00ff88',
                fontSize: 11, fontFamily: "'Share Tech Mono'", fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {muted ? '🔕 MUTED' : '🔊 ACTIVE'}
            </button>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Volume */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'",
                  letterSpacing: 1 }}>VOLUME</span>
                <span style={{ fontSize: 9, color: '#00d4ff', fontFamily: "'Share Tech Mono'" }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={volume} onChange={e => changeVolume(parseFloat(e.target.value))}
                  disabled={muted}
                  style={{
                    width: '100%', accentColor: '#00d4ff',
                    opacity: muted ? 0.4 : 1, cursor: muted ? 'not-allowed' : 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Severity toggles */}
            <div>
              <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'",
                letterSpacing: 1, marginBottom: 8 }}>ANNOUNCE SEVERITIES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEVERITIES.map(s => {
                  const on = enabled.has(s);
                  return (
                    <div key={s} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '5px 10px', borderRadius: 7,
                      background: on ? `${SEV_COLOR[s]}10` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${on ? SEV_COLOR[s] + '30' : '#0d2040'}`,
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: on ? SEV_COLOR[s] : '#1a3a5a',
                          boxShadow: on ? `0 0 6px ${SEV_COLOR[s]}` : 'none',
                          transition: 'all 0.2s',
                        }} />
                        <span style={{
                          fontSize: 10, fontFamily: "'Share Tech Mono'",
                          color: on ? SEV_COLOR[s] : '#2a5a8a', fontWeight: 700,
                        }}>{s}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Test button */}
                        <button
                          onClick={() => testVoice(s)}
                          disabled={muted}
                          title={`Test ${s} voice`}
                          style={{
                            padding: '2px 8px', borderRadius: 4, border: `1px solid ${SEV_COLOR[s]}30`,
                            background: 'rgba(255,255,255,0.03)', color: SEV_COLOR[s],
                            cursor: muted ? 'not-allowed' : 'pointer', fontSize: 9,
                            fontFamily: "'Share Tech Mono'", opacity: muted ? 0.4 : 1,
                          }}
                        >▶ TEST</button>
                        {/* Toggle */}
                        <button
                          onClick={() => toggleSeverity(s)}
                          style={{
                            width: 32, height: 18, borderRadius: 9, border: 'none',
                            background: on ? SEV_COLOR[s] : '#0d2040',
                            cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                          }}
                        >
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: 'white',
                            position: 'absolute', top: 3,
                            left: on ? 17 : 3,
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Announcement log */}
            {log.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'",
                  letterSpacing: 1, marginBottom: 6 }}>RECENT ANNOUNCEMENTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {log.map((l, i) => (
                    <div key={i} style={{
                      fontSize: 9, color: '#3a6a8a', fontFamily: "'Share Tech Mono'",
                      padding: '3px 8px', background: 'rgba(0,212,255,0.04)',
                      borderRadius: 4, borderLeft: '2px solid #0d3a5a',
                    }}>{l}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Stop all */}
            <button
              onClick={() => voiceAlert.stopAll()}
              style={{
                padding: '7px', borderRadius: 7, border: '1px solid rgba(255,34,68,0.3)',
                background: 'rgba(255,34,68,0.07)', color: '#ff4466',
                cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'",
                letterSpacing: 1, fontWeight: 700,
              }}
            >⏹ STOP ALL SPEECH</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAlertControl;
