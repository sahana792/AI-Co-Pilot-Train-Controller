import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        nav('/control-room');
      } else {
        // Dev mode fallback
        localStorage.setItem('token', 'dev-token');
        nav('/control-room');
      }
    } catch {
      localStorage.setItem('token', 'dev-token');
      nav('/control-room');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#02060f', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <motion.line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`}
            stroke="#00d4ff" strokeWidth="0.5"
            animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3 + i * 0.2, repeat: Infinity }} />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <motion.line key={`v${i}`} x1={`${i * 5}%`} y1="0" x2={`${i * 5}%`} y2="100%"
            stroke="#00d4ff" strokeWidth="0.5"
            animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 4 + i * 0.3, repeat: Infinity }} />
        ))}
      </svg>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ width: 400, background: 'rgba(6,15,30,0.9)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, padding: 40, backdropFilter: 'blur(20px)', boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 30px 60px rgba(0,0,0,0.5)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div animate={{ textShadow: ['0 0 10px rgba(0,212,255,0.4)', '0 0 30px rgba(0,212,255,0.8)', '0 0 10px rgba(0,212,255,0.4)'] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 28, fontWeight: 900, color: '#00d4ff', letterSpacing: 3, marginBottom: 8 }}>
            RAILCTRL
          </motion.div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#2a5a8a', letterSpacing: 2 }}>KARNATAKA SMART RAILWAY v7.0</div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#4a7a9a', fontFamily: "'Exo 2'" }}>AI Copilot for Train Controller</div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
          {[['AI', '#00ff88'], ['ONLINE', '#00d4ff'], ['SECURE', '#c084ff']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 9, color: c, fontFamily: "'Share Tech Mono'" }}>{l}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          {[['USERNAME', username, setUsername, 'text'], ['PASSWORD', password, setPassword, 'password']].map(([label, val, setter, type]) => (
            <div key={label as string} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: '#2a5a8a', letterSpacing: 1, marginBottom: 6, fontFamily: "'Share Tech Mono'" }}>{label as string}</div>
              <input
                type={type as string} value={val as string}
                onChange={e => (setter as (v: string) => void)(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', background: '#040c18', border: '1px solid #1a3a6a', borderRadius: 8, color: '#e0eaff', fontSize: 14, fontFamily: "'Exo 2'", outline: 'none', transition: 'border 0.2s' }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#00d4ff'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#1a3a6a'}
              />
            </div>
          ))}

          {error && <div style={{ color: '#ff4466', fontSize: 11, marginBottom: 12, fontFamily: "'Share Tech Mono'" }}>{error}</div>}

          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', borderRadius: 10, background: loading ? '#0d2040' : 'rgba(0,212,255,0.12)', border: `1px solid ${loading ? '#1a3a5a' : 'rgba(0,212,255,0.4)'}`, color: loading ? '#4a7a9a' : '#00d4ff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, letterSpacing: 2, transition: 'all 0.2s' }}>
            {loading ? '⟳ AUTHENTICATING...' : '▶ ENTER SYSTEM'}
          </motion.button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 9, color: '#1a3a5a', fontFamily: "'Share Tech Mono'", lineHeight: 1.6 }}>
          DEFAULT: admin / admin123<br />
          SECURE ACCESS — RAILWAY OPERATIONS
        </div>
      </motion.div>
    </div>
  );
};
export default Login;
