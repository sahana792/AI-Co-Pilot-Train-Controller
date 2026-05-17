import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SUGGESTIONS = [
  'Is there any obstacle on the track?',
  'Which trains are delayed right now?',
  'Show high-risk alert summary',
  'What immediate action should I take?',
  'Signal status report for all stations',
  'Give me a full system overview',
  'Are there any persons detected on track?',
  'Which trains are overspeeding?',
  'Platform occupancy status?',
  'Recommend rerouting for delayed trains',
];

interface Msg { role: 'user' | 'assistant'; content: string; time: string; }

const TypingDots = () => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 4px' }}>
    {[0,1,2].map(i => (
      <motion.div key={i} animate={{ y: [0,-6,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i*0.15 }}
        style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4ff', opacity: 0.7 }} />
    ))}
  </div>
);

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: '🚆 RailCtrl AI Copilot online. I have access to live train data, signal status, platform occupancy, and detection alerts across the Karnataka Railway Network. How can I assist you?',
    time: new Date().toLocaleTimeString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim(), time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/chatbot/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim() }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.answer || 'AI response received.',
        time: new Date().toLocaleTimeString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠ Backend connection error. Please ensure the FastAPI server is running on port 8000.',
        time: new Date().toLocaleTimeString(),
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #0d2040' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: '#e0eaff', letterSpacing: 2, margin: 0 }}>◈ AI COPILOT</h1>
          <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>RAILWAY INTELLIGENCE ASSISTANT · LIVE DATA ACCESS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div animate={{ opacity: [1,0.4,1] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88' }} />
          <span style={{ fontSize: 9, color: '#00ff88', fontFamily: "'Share Tech Mono'" }}>AI ONLINE</span>
          <button onClick={() => setMessages([{role:'assistant',content:'Session cleared. How can I assist?',time:new Date().toLocaleTimeString()}])}
            style={{ marginLeft: 8, padding: '5px 12px', borderRadius: 7, background: 'rgba(255,34,68,0.07)', border: '1px solid rgba(255,34,68,0.25)', color: '#ff4466', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'" }}>
            ✕ CLEAR
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, flex: 1, overflow: 'hidden' }}>
        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#060f1e', border: '1px solid #0d2040', borderRadius: 12, overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {/* Label */}
                  <div style={{ fontSize: 8, color: '#1a4a6a', marginBottom: 5, fontFamily: "'Share Tech Mono'", letterSpacing: 1 }}>
                    {msg.role === 'user' ? 'OPERATOR' : 'RAIL AI'} · {msg.time}
                  </div>
                  <div style={{
                    maxWidth: '82%', padding: '11px 15px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? 'rgba(0,212,255,0.1)' : '#040c18',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.3)' : '#0d2040'}`,
                    color: '#d0e4f4', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    fontFamily: msg.role === 'user' ? "'Exo 2'" : "'Exo 2'",
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ background: '#040c18', border: '1px solid #0d2040', borderRadius: '12px 12px 12px 4px', padding: '6px 14px' }}>
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #0d2040', display: 'flex', gap: 10, background: '#050d1a' }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask the AI Copilot…"
              style={{ flex: 1, padding: '10px 14px', background: '#040c18', border: '1px solid #1a3a6a', borderRadius: 8, color: '#e0eaff', fontSize: 13, fontFamily: "'Exo 2'", outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#00d4ff')}
              onBlur={e => (e.target.style.borderColor = '#1a3a6a')} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => send(input)} disabled={loading || !input.trim()}
              style={{ padding: '10px 20px', borderRadius: 8, background: loading ? '#0a1525' : 'rgba(0,212,255,0.12)', border: `1px solid ${loading ? '#1a3a5a' : 'rgba(0,212,255,0.4)'}`, color: loading ? '#2a5a8a' : '#00d4ff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontFamily: "'Orbitron'", fontWeight: 700 }}>
              ▶
            </motion.button>
          </div>
        </div>

        {/* Quick suggestions */}
        <div style={{ background: '#060f1e', border: '1px solid #0d2040', borderRadius: 12, padding: 14, overflowY: 'auto' }}>
          <div style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, marginBottom: 12, fontFamily: "'Share Tech Mono'" }}>QUICK COMMANDS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SUGGESTIONS.map(s => (
              <motion.button key={s} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={() => send(s)}
                style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 8, background: '#040c18', border: '1px solid #0d2040', color: '#7aaac0', cursor: 'pointer', fontSize: 11, lineHeight: 1.4, fontFamily: "'Exo 2'", transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a5a8a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#0d2040')}>
                {s}
              </motion.button>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 12px', background: '#040c18', border: '1px solid #0a1a2a', borderRadius: 8 }}>
            <div style={{ fontSize: 8, color: '#1a4a6a', marginBottom: 6, fontFamily: "'Share Tech Mono'" }}>AI CAPABILITIES</div>
            {['Live train status','Signal control advice','Delay prediction','Alert analysis','Route planning','Risk assessment'].map(c => (
              <div key={c} style={{ fontSize: 10, color: '#2a5a7a', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#00ff88', fontSize: 8 }}>●</span>{c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Chatbot;
