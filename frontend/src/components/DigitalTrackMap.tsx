import React, { useRef, useState, useCallback, useEffect } from 'react';

interface Node { id: string; label: string; x: number; y: number; type: string; }
interface Edge { from: string; to: string; track: string; signal: string; }
interface TrainPos { train_id: string; risk_level: string; speed: number; platform?: string; }
interface NetworkData {
  nodes: Node[];
  edges: Edge[];
  platforms: Array<{ id: string; node: string; x: number; y: number }>;
  signals_pos: Array<{ id: string; x: number; y: number }>;
}
interface Props {
  network: NetworkData;
  signalStates: Record<string, string>;
  platformStates: Record<string, { status: string; train: string | null }>;
  trainPositions: TrainPos[];
  occupiedTracks: string[];
  onNodeClick?: (node: Node) => void;
  onSignalClick?: (id: string, status: string) => void;
}

const SIG_COLOR: Record<string, string> = { Green: '#00ff88', Yellow: '#ffd700', Red: '#ff3344' };
const RISK_COLOR: Record<string, string> = { Critical: '#ff2244', High: '#ff8800', Medium: '#ffd700', Low: '#00ff88' };
const PF_COLOR: Record<string, string> = { available: '#00ff88', occupied: '#00d4ff', maintenance: '#ffd700', reserved: '#c084ff' };

const TrainDot: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  color: string; speed: number; trainId: string;
}> = ({ x1, y1, x2, y2, color, speed, trainId }) => {
  const uid = `tp-${trainId}`;
  const dur = Math.max(1.5, 10 - speed / 15);
  return (
    <>
      <defs><path id={uid} d={`M ${x1} ${y1} L ${x2} ${y2}`} /></defs>
      <circle r="9" fill={color + '18'}>
        <animateMotion dur={`${dur}s`} repeatCount="indefinite"><mpath href={`#${uid}`} /></animateMotion>
      </circle>
      <circle r="4.5" fill={color} filter="url(#trainGlow)">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite"><mpath href={`#${uid}`} /></animateMotion>
      </circle>
      <circle r="1.8" fill="#fff" opacity="0.9">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite"><mpath href={`#${uid}`} /></animateMotion>
      </circle>
    </>
  );
};

const DigitalTrackMap: React.FC<Props> = ({
  network, signalStates, platformStates, trainPositions,
  occupiedTracks, onNodeClick, onSignalClick,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<{ info: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeMap = Object.fromEntries(network.nodes.map(n => [n.id, n]));

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setZoom(z => Math.min(3, Math.max(0.35, z + delta)));
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at 40% 40%, #030c1a 0%, #010608 100%)' }}
      onWheel={onWheel}
    >
      {/* Live indicator */}
      <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', animation: 'livePulse 1.5s infinite' }} />
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#1a6a3a', letterSpacing: 1 }}>LIVE</span>
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          { l: '+', fn: () => setZoom(z => Math.min(z + 0.2, 3)) },
          { l: '−', fn: () => setZoom(z => Math.max(z - 0.2, 0.35)) },
          { l: '⊙', fn: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
        ].map(b => (
          <button key={b.l} onClick={b.fn} style={{
            width: 24, height: 24, borderRadius: 5,
            background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.18)',
            color: '#00d4ff', fontSize: 13, cursor: 'pointer', lineHeight: '22px', textAlign: 'center',
          }}>{b.l}</button>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', zIndex: 30, pointerEvents: 'none',
          left: Math.min(hovered.x + 12, 520), top: Math.max(hovered.y - 34, 4),
          background: 'rgba(2,6,16,0.96)', border: '1px solid #1a4a8a',
          borderRadius: 7, padding: '5px 10px',
          fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#7ad4ff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          whiteSpace: 'pre-line',
        }}>
          {hovered.info}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox="0 0 700 580"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <filter id="trainGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="nodeGlowStrong" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="trackGlow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="signalGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a50bb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#081525" stopOpacity="0.98" />
          </radialGradient>
          <radialGradient id="majorGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0d2d5a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050c18" stopOpacity="0.98" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <g opacity="0.05">
          {Array.from({ length: 19 }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * 32} x2={700} y2={i * 32} stroke="#1a4a9a" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 23 }, (_, i) => (
            <line key={`gv${i}`} x1={i * 32} y1={0} x2={i * 32} y2={580} stroke="#1a4a9a" strokeWidth="0.5" />
          ))}
        </g>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* ── Edges (tracks) ── */}
          {network.edges.map((e, i) => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];
            if (!from || !to) return null;
            const occ = occupiedTracks.includes(e.track);
            const sig = signalStates[e.signal] || 'Green';
            const trackColor = occ ? '#ff3344' : sig === 'Red' ? '#ff334480' : sig === 'Yellow' ? '#ffd700' : '#1a5aee';
            const glowCol = occ ? '#ff334435' : sig === 'Yellow' ? '#ffd70028' : '#1a5aee28';
            const dx = to.x - from.x, dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const flowDur = Math.max(1.5, dist / 65);

            return (
              <g key={`edge${i}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={glowCol} strokeWidth="10" filter="url(#trackGlow)" />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={trackColor} strokeWidth={occ ? 2.8 : 2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={ev => setHovered({ info: `${e.track}\n${e.signal}: ${sig}`, x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY })}
                  onMouseLeave={() => setHovered(null)}
                />
                {!occ && sig !== 'Red' && [0, 1, 2].map(k => {
                  const uid = `flow${i}k${k}`;
                  const delay = k * (flowDur / 3);
                  return (
                    <g key={k}>
                      <defs><path id={uid} d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} /></defs>
                      <circle r="1.5" fill={trackColor} opacity="0.55">
                        <animateMotion dur={`${flowDur}s`} begin={`${delay}s`} repeatCount="indefinite">
                          <mpath href={`#${uid}`} />
                        </animateMotion>
                      </circle>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ── Trains ── */}
          {trainPositions.map((tp, idx) => {
            const ei = idx % Math.max(1, network.edges.length);
            const e = network.edges[ei];
            const from = nodeMap[e?.from], to = nodeMap[e?.to];
            if (!from || !to) return null;
            return <TrainDot key={tp.train_id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} color={RISK_COLOR[tp.risk_level] || '#00ff88'} speed={tp.speed} trainId={tp.train_id} />;
          })}

          {/* ── Platforms ── */}
          {network.platforms.map(pf => {
            const state = platformStates[pf.id];
            const color = PF_COLOR[state?.status || 'available'];
            const occ = state?.status === 'occupied';
            return (
              <g key={pf.id} style={{ cursor: 'pointer' }}
                onMouseEnter={ev => setHovered({ info: `${pf.id}\n${state?.status || 'available'}${state?.train ? `\n${state.train}` : ''}`, x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY })}
                onMouseLeave={() => setHovered(null)}
              >
                {occ && <rect x={pf.x - 12} y={pf.y - 7} width={24} height={14} rx={3} fill={color} opacity={0.1} filter="url(#nodeGlow)" />}
                <rect x={pf.x - 9} y={pf.y - 5} width={18} height={10} rx={2} fill="#030810" stroke={color} strokeWidth={occ ? 1.5 : 1} />
                <rect x={pf.x - 7} y={pf.y - 3} width={14} height={6} rx={1.5} fill={color} opacity={occ ? 0.88 : 0.55} />
              </g>
            );
          })}

          {/* ── Signals ── */}
          {network.signals_pos.map(sp => {
            const status = signalStates[sp.id] || 'Green';
            const color = SIG_COLOR[status];
            return (
              <g key={sp.id} style={{ cursor: 'pointer' }}
                onClick={() => onSignalClick && onSignalClick(sp.id, status)}
                onMouseEnter={ev => setHovered({ info: `${sp.id}\n${status}`, x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY })}
                onMouseLeave={() => setHovered(null)}
              >
                <line x1={sp.x} y1={sp.y + 4} x2={sp.x} y2={sp.y + 13} stroke="#223355" strokeWidth="1.5" />
                <rect x={sp.x - 7} y={sp.y - 9} width={14} height={15} rx={2} fill="#080f1e" stroke="#1a2d50" strokeWidth="0.8" />
                {['Red', 'Yellow', 'Green'].map((c, ci) => (
                  <circle key={c} cx={sp.x} cy={sp.y - 5 + ci * 4.5} r={2.2}
                    fill={status === c ? SIG_COLOR[c] : '#0c1828'}
                    filter={status === c ? 'url(#signalGlow)' : undefined}
                  >
                    {status === c && <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite" />}
                  </circle>
                ))}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {network.nodes.map(n => {
            const isHub = n.type === 'hub';
            const isMajor = n.type === 'major';
            const r = isHub ? 18 : isMajor ? 12 : n.type === 'junction' ? 9 : 6;
            const trainsHere = trainPositions.filter(tp => tp.platform?.includes(n.id));
            const hasCritical = trainsHere.some(t => t.risk_level === 'Critical');
            return (
              <g key={n.id} style={{ cursor: 'pointer' }}
                onClick={() => onNodeClick && onNodeClick(n)}
                onMouseEnter={ev => setHovered({ info: `${n.label}\nTrains: ${trainsHere.length}`, x: ev.nativeEvent.offsetX, y: ev.nativeEvent.offsetY })}
                onMouseLeave={() => setHovered(null)}
              >
                {hasCritical && (
                  <circle cx={n.x} cy={n.y} r={r + 12} fill="none" stroke="#ff2244" strokeWidth="1">
                    <animate attributeName="r" values={`${r + 8};${r + 18};${r + 8}`} dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                {isHub && (
                  <>
                    <circle cx={n.x} cy={n.y} r={r + 9} fill="rgba(0,70,180,0.06)" stroke="rgba(0,120,255,0.12)" strokeWidth="1" />
                    <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="rgba(0,180,255,0.18)" strokeWidth="0.7" strokeDasharray="4 3">
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur="10s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                <circle cx={n.x} cy={n.y} r={r}
                  fill={isHub ? 'url(#hubGrad)' : isMajor ? 'url(#majorGrad)' : '#050d1a'}
                  stroke={isHub ? '#3a8aff' : isMajor ? '#1a5aaa' : '#0d2850'}
                  strokeWidth={isHub ? 2 : 1.5}
                  filter={isHub ? 'url(#nodeGlowStrong)' : isMajor ? 'url(#nodeGlow)' : undefined}
                />
                {isHub && <circle cx={n.x} cy={n.y} r={r - 6} fill="none" stroke="#5aafff" strokeWidth="0.7" opacity="0.45" />}
                {/* Train count badge */}
                {trainsHere.length > 0 && (
                  <>
                    <circle cx={n.x + r - 1} cy={n.y - r + 1} r={5} fill={hasCritical ? '#ff2244' : '#00d4ff'} stroke="#020810" strokeWidth="0.8" />
                    <text x={n.x + r - 1} y={n.y - r + 4.5} textAnchor="middle" fontSize="5.5" fill="#fff" fontWeight="bold" fontFamily="monospace">{trainsHere.length}</text>
                  </>
                )}
                {/* Label */}
                {isHub ? (
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="6" fill="#90c4ff" fontWeight="bold" fontFamily="'Share Tech Mono',monospace">
                    {n.label.split(' ')[0].slice(0, 4).toUpperCase()}
                  </text>
                ) : (
                  <text x={n.x} y={n.y + r + 9} textAnchor="middle" fontSize={isMajor ? 7 : 6} fill={isMajor ? '#3a80c0' : '#1a4a6a'} fontFamily="'Share Tech Mono',monospace">
                    {n.label.split(' ')[0].slice(0, 6)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <style>{`
        @keyframes livePulse { 0%,100%{box-shadow:0 0 8px #00ff88;opacity:1} 50%{box-shadow:0 0 16px #00ff88;opacity:0.4} }
      `}</style>
    </div>
  );
};

export default DigitalTrackMap;
