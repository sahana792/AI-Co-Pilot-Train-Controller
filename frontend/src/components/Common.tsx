import React from 'react';

// ── Risk Badge ────────────────────────────────────────────────────────────────
export const RiskBadge: React.FC<{ level: string; size?: 'sm' | 'md' }> = ({ level, size = 'md' }) => {
  const colors: Record<string, string> = {
    Critical: '#ff0033', High: '#ff8c00', Medium: '#ffd700', Low: '#00ff88',
  };
  const bg: Record<string, string> = {
    Critical: 'rgba(255,0,51,0.15)', High: 'rgba(255,140,0,0.15)',
    Medium: 'rgba(255,215,0,0.15)', Low: 'rgba(0,255,136,0.12)',
  };
  const c = colors[level] || '#6a8aaa';
  const b = bg[level] || 'rgba(106,138,170,0.1)';
  const pad = size === 'sm' ? '2px 8px' : '4px 12px';
  const fs = size === 'sm' ? '11px' : '12px';
  return (
    <span style={{
      background: b, color: c, border: `1px solid ${c}`,
      padding: pad, borderRadius: 4, fontSize: fs,
      fontFamily: "'Share Tech Mono',monospace", fontWeight: 600,
      letterSpacing: '0.5px', whiteSpace: 'nowrap',
    }}>
      {level === 'Critical' && '⚠ '}{level.toUpperCase()}
    </span>
  );
};

// ── Signal Light ─────────────────────────────────────────────────────────────
export const SignalDot: React.FC<{ status: string }> = ({ status }) => {
  const c = status === 'Green' ? '#00ff88' : status === 'Yellow' ? '#ffd700' : '#ff2244';
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
      background: c, boxShadow: `0 0 8px ${c}`, marginRight: 6,
    }} />
  );
};

// ── Card ─────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <div style={{
    background: '#0d1526', border: '1px solid #1a2d4a', borderRadius: 10,
    padding: '20px', ...style,
  }} className={className}>{children}</div>
);

// ── Stat Box ─────────────────────────────────────────────────────────────────
export const StatBox: React.FC<{ label: string; value: string | number; color?: string; sub?: string }> = ({ label, value, color = '#00d4ff', sub }) => (
  <div style={{ background: '#080d18', border: '1px solid #1a2d4a', borderRadius: 8, padding: '16px 20px' }}>
    <div style={{ fontSize: 12, color: '#6a8aaa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'Share Tech Mono',monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#4a6a8a', marginTop: 4 }}>{sub}</div>}
  </div>
);

// ── Section Header ────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: string }> = ({ title, subtitle, icon }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Rajdhani',sans-serif", color: '#e0eaff', letterSpacing: 1 }}>
      {icon && <span style={{ marginRight: 10 }}>{icon}</span>}{title}
    </h2>
    {subtitle && <p style={{ color: '#6a8aaa', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
  </div>
);

// ── Loading Spinner ───────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div style={{
    width: size, height: size, border: `3px solid #1a2d4a`,
    borderTop: `3px solid #00d4ff`, borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', display: 'inline-block',
  }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ value: number; max?: number; color?: string; height?: number }> = ({ value, max = 100, color = '#00d4ff', height = 6 }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ background: '#1a2d4a', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  );
};

// ── Button ────────────────────────────────────────────────────────────────────
export const Btn: React.FC<{
  onClick?: () => void; children: React.ReactNode;
  variant?: 'primary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md'; disabled?: boolean; style?: React.CSSProperties;
}> = ({ onClick, children, variant = 'primary', size = 'md', disabled, style }) => {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid #00d4ff' },
    danger: { background: 'rgba(255,0,51,0.12)', color: '#ff2244', border: '1px solid #ff2244' },
    success: { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid #00ff88' },
    ghost: { background: 'transparent', color: '#6a8aaa', border: '1px solid #1a2d4a' },
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '8px 18px', fontSize: 13 },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant], ...sizes[size],
      borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'Exo 2',sans-serif", fontWeight: 600,
      opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
      letterSpacing: 0.5, ...style,
    }}>{children}</button>
  );
};

// ── Train Card ────────────────────────────────────────────────────────────────
export const TrainCard: React.FC<{ train: any; onClick?: () => void }> = ({ train, onClick }) => {
  const riskColor: Record<string, string> = { Critical: '#ff0033', High: '#ff8c00', Medium: '#ffd700', Low: '#00ff88' };
  const borderColor = riskColor[train.risk_level] || '#1a2d4a';
  return (
    <div onClick={onClick} style={{
      background: '#080d18', border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`, borderRadius: 8,
      padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", color: '#00d4ff', fontWeight: 700 }}>{train.train_id}</span>
        <RiskBadge level={train.risk_level} size="sm" />
      </div>
      <div style={{ fontSize: 12, color: '#6a8aaa', marginBottom: 6 }}>{train.route}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div style={{ fontSize: 11, color: '#4a6a8a' }}>
          <span style={{ color: '#8aacc0' }}>Speed: </span>
          <span style={{ color: '#e0eaff' }}>{train.speed?.toFixed(0)} km/h</span>
        </div>
        <div style={{ fontSize: 11 }}>
          <SignalDot status={train.signal_status} />
          <span style={{ color: '#8aacc0' }}>{train.signal_status}</span>
        </div>
        <div style={{ fontSize: 11, color: train.delay_minutes > 0 ? '#ffd700' : '#00ff88' }}>
          {train.delay_minutes > 0 ? `⏱ ${train.delay_minutes?.toFixed(0)}m delay` : '✓ On time'}
        </div>
      </div>
      {train.detected_objects?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#ff8c00' }}>
          🔍 {train.detected_objects.join(' · ')}
        </div>
      )}
    </div>
  );
};
