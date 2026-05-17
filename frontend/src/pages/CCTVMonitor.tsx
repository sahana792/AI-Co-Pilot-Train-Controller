import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

/* ── Camera definitions ──────────────────────────────────────────────────── */
const CAMERAS = [
  {
    id: 'CAM-01', name: 'Platform 1 – Bengaluru City', location: 'SBC PF-1',
    type: 'platform', icon: '🏛',
    videoSrc: '/demo-videos/cam01-platform.mp4',
    defaultDetections: [
      { label: 'CROWD',                color: '#ff8c00', x: 19, y: 46, w: 47, h: 26, conf: 87 },
      { label: 'PERSON ON YELLOW LINE', color: '#ff2244', x: 31, y: 61, w:  9, h: 17, conf: 91 },
    ],
  },
  {
    id: 'CAM-02', name: 'Track Camera – North Yard', location: 'SBC Track-N',
    type: 'track', icon: '🛤',
    videoSrc: '/demo-videos/cam02-track-north.mp4',
    defaultDetections: [
      { label: 'PERSON ON TRACK', color: '#ff2244', x: 46, y: 55, w: 10, h: 21, conf: 94 },
      { label: 'OBSTACLE',        color: '#ff8c00', x: 63, y: 60, w: 10, h: 12, conf: 78 },
    ],
  },
  {
    id: 'CAM-03', name: 'Entry Gate A', location: 'SBC Entry A',
    type: 'gate', icon: '🚪',
    videoSrc: '/demo-videos/cam03-entry-gate.mp4',
    defaultDetections: [
      { label: 'PERSON',            color: '#00ff88', x: 28, y: 38, w:  7, h: 28, conf: 88 },
      { label: 'PERSON',            color: '#00ff88', x: 42, y: 40, w:  7, h: 28, conf: 85 },
      { label: 'SUSPICIOUS OBJECT', color: '#ff2244', x: 62, y: 36, w:  7, h: 20, conf: 83 },
    ],
  },
  {
    id: 'CAM-04', name: 'Signal Junction YPR', location: 'YPR Signal',
    type: 'signal', icon: '🚦',
    videoSrc: '/demo-videos/cam04-signal.mp4',
    defaultDetections: [
      { label: 'SIGNAL ISSUE', color: '#ff2244', x: 50, y: 10, w: 13, h: 36, conf: 88 },
      { label: 'TRAIN',        color: '#00ff88', x: 10, y: 52, w: 14, h: 12, conf: 97 },
    ],
  },
  {
    id: 'CAM-05', name: 'Crowd Monitor – PF-3', location: 'SBC PF-3',
    type: 'crowd', icon: '👥',
    videoSrc: '/demo-videos/cam05-crowd.mp4',
    defaultDetections: [
      { label: 'HIGH CROWD DENSITY', color: '#ff2244', x: 18, y: 57, w: 64, h: 38, conf: 89 },
    ],
  },
  {
    id: 'CAM-06', name: 'Track Camera – South', location: 'KGI Track',
    type: 'track', icon: '🛤',
    videoSrc: '/demo-videos/cam06-track-south.mp4',
    defaultDetections: [
      { label: 'TRAIN',        color: '#00ff88', x: 38, y: 28, w: 24, h: 16, conf: 96 },
      { label: 'TRACK DEBRIS', color: '#ff8c00', x: 24, y: 72, w: 12, h: 14, conf: 74 },
    ],
  },
];

const CAM_COLOR: Record<string, string> = {
  platform: '#00d4ff', track: '#00ff88', gate: '#ffd700',
  signal: '#c084ff',   crowd: '#ff8c00',
};

/* ── Overlay canvas draws bbox on top of <video> ───────────────────────────── */
const BBoxOverlay: React.FC<{
  detections: typeof CAMERAS[0]['defaultDetections'];
  playing: boolean;
  pulse: number;
}> = ({ detections, playing, pulse }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || 180;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!playing) return;

    const W = canvas.width, H = canvas.height;

    detections.forEach(det => {
      const x = det.x / 100 * W;
      const y = det.y / 100 * H;
      const w = det.w / 100 * W;
      const h = det.h / 100 * H;
      const col = det.color;

      // Glow pulse
      const glow = 6 + 4 * Math.sin(pulse * 0.1);
      ctx.shadowColor = col;
      ctx.shadowBlur  = glow;
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, w, h);

      // Corner accents
      const cs = Math.min(10, w * 0.25, h * 0.25);
      ctx.lineWidth = 3;
      [[x, y, 1, 1],[x+w, y, -1, 1],[x, y+h, 1, -1],[x+w, y+h, -1, -1]].forEach(
        ([cx, cy, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(cx as number, cy as number);
          ctx.lineTo((cx as number)+(dx as number)*cs, cy as number);
          ctx.moveTo(cx as number, cy as number);
          ctx.lineTo(cx as number, (cy as number)+(dy as number)*cs);
          ctx.stroke();
        }
      );
      ctx.shadowBlur = 0;

      // Label
      ctx.font = `bold ${Math.max(8, Math.min(11, W/55))}px "Share Tech Mono",monospace`;
      const txt = `${det.label} ${det.conf}%`;
      const tw  = ctx.measureText(txt).width;
      const lh  = 14;
      const lx  = Math.min(x, W - tw - 6);
      const ly  = y > lh + 3 ? y - 2 : y + h + lh + 2;
      ctx.fillStyle = col + 'dd';
      ctx.fillRect(lx, ly - lh, tw + 6, lh + 2);
      ctx.fillStyle = '#000';
      ctx.fillText(txt, lx + 3, ly - 2);
    });

    // Scan line
    const scanY = (pulse * 2.2) % H;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,212,255,0.18)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(W, scanY); ctx.stroke();
  }, [detections, playing, pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      // force redraw on resize
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />
  );
};

/* ── Single feed tile ────────────────────────────────────────────────────── */
const CCTVFeed: React.FC<{
  camera: typeof CAMERAS[0];
  isExpanded: boolean;
  onExpand: () => void;
  onAlert: (cam: string, det: typeof CAMERAS[0]['defaultDetections'][0]) => void;
  pulse: number;
  alertActive: boolean;
}> = ({ camera, isExpanded, onExpand, onAlert, pulse, alertActive }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error,   setError]   = useState(false);
  const color = CAM_COLOR[camera.type] || '#00d4ff';
  const hasCritical = camera.defaultDetections.some(d => d.color === '#ff2244');

  // Auto-play on mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => setError(true));
  }, []);

  // Randomly fire an alert every few seconds
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const critical = camera.defaultDetections.filter(d => d.color === '#ff2244');
      if (critical.length && Math.random() > 0.55) {
        onAlert(camera.id, critical[Math.floor(Math.random() * critical.length)]);
      }
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(t);
  }, [playing, camera, onAlert]);

  return (
    <motion.div whileHover={{ borderColor: color + '80' }}
      onClick={onExpand}
      style={{
        background: '#030810', border: `1px solid ${alertActive && hasCritical ? 'rgba(255,34,68,0.5)' : color + '25'}`,
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative',
        boxShadow: isExpanded ? `0 0 24px ${color}30` : hasCritical && alertActive ? '0 0 18px rgba(255,34,68,0.2)' : 'none',
        transition: 'all 0.2s',
      }}>

      {/* Video + overlay */}
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#010508', overflow: 'hidden' }}>
        <video ref={videoRef}
          src={camera.videoSrc}
          loop muted playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', display: error ? 'none' : 'block' }}
          onError={() => setError(true)}
          onPlay={() => setPlaying(true)}
        />

        {/* Error / loading state */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#010508', fontSize: 28 }}>
            <span style={{ marginBottom: 6 }}>{camera.icon}</span>
            <span style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>FEED UNAVAILABLE</span>
          </div>
        )}

        {/* Bounding-box overlay */}
        <BBoxOverlay detections={camera.defaultDetections} playing={playing} pulse={pulse} />

        {/* CRT scanlines */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)', pointerEvents: 'none', zIndex: 3 }} />

        {/* Critical alert flash */}
        {hasCritical && alertActive && (
          <motion.div animate={{ opacity: [0, 0.25, 0] }} transition={{ duration: 0.6, repeat: Infinity }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(255,34,68,0.25)', pointerEvents: 'none', zIndex: 4 }} />
        )}

        {/* Top-left: REC indicator */}
        <div style={{ position: 'absolute', top: 5, left: 7, display: 'flex', alignItems: 'center', gap: 4, zIndex: 5 }}>
          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2244' }} />
          <span style={{ fontSize: 8, color: '#ff4466', fontFamily: "'Share Tech Mono'" }}>REC</span>
        </div>

        {/* Top-right: FPS */}
        <div style={{ position: 'absolute', top: 5, right: 7, fontSize: 8, color: color, fontFamily: "'Share Tech Mono'", zIndex: 5, opacity: 0.8 }}>
          20 FPS
        </div>
      </div>

      {/* Info bar */}
      <div style={{ padding: '7px 10px', borderTop: '1px solid #0d2040', background: '#040c18' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#c0d4e8', fontWeight: 600, marginBottom: 1 }}>{camera.name}</div>
            <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>{camera.id} · {camera.location}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: `${color}12`, color, border: `1px solid ${color}30`, fontFamily: "'Share Tech Mono'" }}>
              {camera.type.toUpperCase()}
            </span>
            {hasCritical && (
              <span style={{ fontSize: 8, color: '#ff2244', fontFamily: "'Share Tech Mono'", animation: 'blink 1s infinite' }}>⚠ ALERT</span>
            )}
          </div>
        </div>

        {/* Detection tags */}
        <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {camera.defaultDetections.map((d, i) => (
            <span key={i} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${d.color}12`, color: d.color, border: `1px solid ${d.color}30`, fontFamily: "'Share Tech Mono'" }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Expanded single-camera view ─────────────────────────────────────────── */
const ExpandedFeed: React.FC<{ camera: typeof CAMERAS[0]; onClose: () => void; pulse: number }> = ({ camera, onClose, pulse }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const color = CAM_COLOR[camera.type] || '#00d4ff';

  useEffect(() => {
    videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(1,5,8,0.96)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: '#e0eaff', letterSpacing: 2 }}>{camera.name}</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#2a5a8a', marginTop: 4 }}>{camera.id} · {camera.location} · {camera.type.toUpperCase()}</div>
        </div>
        <button onClick={onClose}
          style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(255,34,68,0.1)', border: '1px solid rgba(255,34,68,0.4)', color: '#ff4466', cursor: 'pointer', fontSize: 13, fontFamily: "'Share Tech Mono'" }}>
          ✕ CLOSE
        </button>
      </div>

      {/* Big feed */}
      <div style={{ flex: 1, position: 'relative', background: '#010508', borderRadius: 12, overflow: 'hidden', border: `1px solid ${color}30` }}>
        <video ref={videoRef} src={camera.videoSrc} loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onPlay={() => setPlaying(true)} />
        <BBoxOverlay detections={camera.defaultDetections} playing={playing} pulse={pulse} />
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)', pointerEvents: 'none' }} />

        {/* Detections sidebar overlay */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
          {camera.defaultDetections.map((d, i) => (
            <div key={i} style={{ background: 'rgba(4,8,18,0.88)', border: `1px solid ${d.color}40`, borderLeft: `3px solid ${d.color}`, borderRadius: 7, padding: '6px 10px', minWidth: 160 }}>
              <div style={{ fontSize: 10, color: d.color, fontFamily: "'Share Tech Mono'", fontWeight: 700 }}>{d.label}</div>
              <div style={{ fontSize: 9, color: '#4a7a9a', fontFamily: "'Share Tech Mono'", marginTop: 2 }}>Confidence: {d.conf}%</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main CCTVMonitor page ─────────────────────────────────────────────────── */
const CCTVMonitor: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alerts,     setAlerts]     = useState<any[]>([]);
  const [pulse,      setPulse]      = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<Record<string, boolean>>({});

  // Global pulse tick for box animation
  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 80);
    return () => clearInterval(t);
  }, []);

  const handleAlert = useCallback((camId: string, det: any) => {
    const isCritical = det.color === '#ff2244';
    const sev = isCritical ? 'CRITICAL' : det.color === '#ff8c00' ? 'HIGH' : 'MEDIUM';
    setAlerts(prev => [{
      id:       `${camId}-${Date.now()}`,
      camera:   camId,
      time:     new Date().toLocaleTimeString(),
      label:    det.label,
      severity: sev,
      conf:     det.conf,
    }, ...prev].slice(0, 40));
    setActiveAlerts(a => ({ ...a, [camId]: true }));
    setTimeout(() => setActiveAlerts(a => ({ ...a, [camId]: false })), 4000);
  }, []);

  const expandedCam = CAMERAS.find(c => c.id === expandedId);
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const totalDets = CAMERAS.reduce((s, c) => s + c.defaultDetections.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #0d2040', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: '#e0eaff', letterSpacing: 2, margin: 0 }}>📡 CCTV MONITOR</h1>
          <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>
            MULTI-CAMERA SURVEILLANCE  ·  AI DETECTION ACTIVE  ·  DEMO FEEDS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ fontSize: 9, padding: '5px 10px', borderRadius: 6, background: 'rgba(255,34,68,0.08)', border: '1px solid rgba(255,34,68,0.3)', color: '#ff4466', fontFamily: "'Share Tech Mono'" }}>
            ● {CAMERAS.length} CAMERAS LIVE
          </motion.div>
          {criticalCount > 0 && (
            <div style={{ fontSize: 9, padding: '5px 10px', borderRadius: 6, background: 'rgba(255,34,68,0.12)', border: '1px solid rgba(255,34,68,0.5)', color: '#ff2244', fontFamily: "'Share Tech Mono'", animation: 'blink 1s infinite' }}>
              🚨 {criticalCount} CRITICAL
            </div>
          )}
          <button onClick={() => setAlerts([])} style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(255,34,68,0.07)', border: '1px solid rgba(255,34,68,0.25)', color: '#ff4466', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'" }}>✕ CLEAR LOG</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, flexShrink: 0 }}>
        {[
          ['Active Cameras', CAMERAS.length, '#00d4ff'],
          ['AI Detections', totalDets, '#ffd700'],
          ['Critical Alerts', criticalCount, '#ff2244'],
          ['Log Events', alerts.length, '#c084ff'],
        ].map(([l, v, c]) => (
          <div key={l as string} style={{ background: '#060f1e', border: '1px solid #0d2040', borderTop: `2px solid ${c as string}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, fontFamily: "'Share Tech Mono'" }}>{l as string}</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 700, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Feeds + log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* 2×3 camera grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: 10, overflowY: 'auto' }}>
          {CAMERAS.map(cam => (
            <CCTVFeed
              key={cam.id}
              camera={cam}
              isExpanded={expandedId === cam.id}
              onExpand={() => setExpandedId(expandedId === cam.id ? null : cam.id)}
              onAlert={handleAlert}
              pulse={pulse}
              alertActive={!!activeAlerts[cam.id]}
            />
          ))}
        </div>

        {/* Alert log */}
        <div style={{ background: '#060f1e', border: '1px solid #0d2040', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #0d2040', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ff4466', fontFamily: "'Share Tech Mono'" }}>⚠ DETECTION LOG</span>
            <span style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>{alerts.length} events</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            <AnimatePresence initial={false}>
              {alerts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#1a4a6a', fontSize: 11, fontFamily: "'Share Tech Mono'" }}>
                  ✓ No detections yet<br />
                  <span style={{ fontSize: 9, color: '#0d2a4a', marginTop: 8, display: 'block' }}>Alerts appear automatically</span>
                </div>
              )}
              {alerts.map(a => {
                const c = a.severity === 'CRITICAL' ? '#ff2244' : a.severity === 'HIGH' ? '#ff8c00' : '#ffd700';
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    style={{ borderLeft: `3px solid ${c}`, background: `${c}07`, border: `1px solid ${c}20`, borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: `${c}18`, color: c, fontFamily: "'Share Tech Mono'", fontWeight: 700 }}>{a.severity}</span>
                      <span style={{ fontSize: 8, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#c0d4e8', fontWeight: 600 }}>{a.label}</div>
                    <div style={{ fontSize: 9, color: '#4a7a9a', fontFamily: "'Share Tech Mono'", marginTop: 2 }}>{a.camera} · {a.conf}% conf.</div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {expandedCam && (
          <ExpandedFeed camera={expandedCam} onClose={() => setExpandedId(null)} pulse={pulse} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CCTVMonitor;
