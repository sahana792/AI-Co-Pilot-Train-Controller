import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STATIONS_STATIC = [
  { id:'SBC', name:'Bengaluru City Junction', type:'major', platforms:10, status:'operational', crowd:'High',   trains_today:142 },
  { id:'YPR', name:'Yeshwanthpur Junction',   type:'junction', platforms:6, status:'operational', crowd:'Medium', trains_today:88  },
  { id:'MYS', name:'Mysuru Junction',          type:'major', platforms:6, status:'operational', crowd:'Medium', trains_today:64  },
  { id:'MAQ', name:'Mangaluru Central',        type:'major', platforms:5, status:'operational', crowd:'Low',    trains_today:42  },
  { id:'UBL', name:'Hubballi Junction',        type:'major', platforms:7, status:'operational', crowd:'Medium', trains_today:76  },
  { id:'BGM', name:'Belagavi',                 type:'major', platforms:4, status:'operational', crowd:'Low',    trains_today:34  },
  { id:'SMET',name:'Shivamogga Town',          type:'junction', platforms:3, status:'operational', crowd:'Low', trains_today:28  },
  { id:'BAY', name:'Ballari Junction',         type:'junction', platforms:4, status:'maintenance', crowd:'Low', trains_today:18  },
  { id:'GR',  name:'Kalaburagi',               type:'major', platforms:4, status:'operational', crowd:'Low',   trains_today:22  },
  { id:'TK',  name:'Tumakuru',                 type:'normal', platforms:3, status:'operational', crowd:'Low',   trains_today:30  },
];
const CROWD_C: Record<string,string> = { High:'#ff2244', Medium:'#ffd700', Low:'#00ff88' };
const ST_C: Record<string,string> = { operational:'#00e676', maintenance:'#ffd600', closed:'#ff1744' };

const StationControl: React.FC = () => {
  const [stations, setStations] = useState(STATIONS_STATIC);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = stations.filter(s =>
    (search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search.toUpperCase())) &&
    (filter === 'all' || s.status === filter)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ paddingBottom: 12, borderBottom: '1px solid #0d2040' }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 700, color: '#e0eaff', letterSpacing: 2, margin: 0 }}>🚉 STATION CONTROL</h1>
        <div style={{ fontSize: 9, color: '#2a5a8a', fontFamily: "'Share Tech Mono'", marginTop: 3 }}>KARNATAKA RAILWAY STATION NETWORK</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[['Total Stations', stations.length, '#00d4ff'], ['Operational', stations.filter(s=>s.status==='operational').length, '#00ff88'], ['Maintenance', stations.filter(s=>s.status==='maintenance').length, '#ffd700'], ['High Crowd', stations.filter(s=>s.crowd==='High').length, '#ff2244']].map(([l,v,c])=>(
          <div key={l as string} style={{ background: '#060f1e', border: '1px solid #0d2040', borderTop: `2px solid ${c as string}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, fontFamily: "'Share Tech Mono'" }}>{l as string}</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 700, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search station…"
          style={{ flex: 1, padding: '8px 14px', background: '#060f1e', border: '1px solid #1a3a6a', borderRadius: 8, color: '#e0eaff', fontSize: 12, fontFamily: "'Exo 2'", outline: 'none' }} />
        {['all','operational','maintenance'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding: '7px 14px', borderRadius: 7, background: filter===f?'rgba(0,212,255,0.1)':'transparent', border: `1px solid ${filter===f?'rgba(0,212,255,0.4)':'#1a3a5a'}`, color: filter===f?'#00d4ff':'#4a7a9a', cursor: 'pointer', fontSize: 11, fontFamily: "'Share Tech Mono'", textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <div style={{ background: '#060f1e', border: '1px solid #0d2040', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 80px 100px', padding: '10px 14px', borderBottom: '1px solid #0d2040', background: '#040c18' }}>
            {['Code','Station Name','Type','Platforms','Trains','Status'].map(h=>(
              <div key={h} style={{ fontSize: 8, color: '#2a5a8a', letterSpacing: 1, fontFamily: "'Share Tech Mono'" }}>{h}</div>
            ))}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '55vh' }}>
            {filtered.map((st, i) => {
              const sc = ST_C[st.status] || '#888';
              const sel = selected?.id === st.id;
              return (
                <motion.div key={st.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(sel ? null : st)}
                  style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 80px 100px', padding: '11px 14px', borderBottom: '1px solid #060e18', cursor: 'pointer', background: sel ? 'rgba(0,212,255,0.04)' : 'transparent', transition: 'background 0.15s', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 12, fontWeight: 700, color: '#00d4ff' }}>{st.id}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#e0eaff', fontWeight: 600 }}>{st.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: CROWD_C[st.crowd], display: 'inline-block', boxShadow: `0 0 5px ${CROWD_C[st.crowd]}` }} />
                      <span style={{ fontSize: 9, color: CROWD_C[st.crowd], fontFamily: "'Share Tech Mono'" }}>{st.crowd} Crowd</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: st.type==='major'?'rgba(0,212,255,0.1)':st.type==='junction'?'rgba(255,215,0,0.1)':'rgba(100,100,100,0.1)', color: st.type==='major'?'#00d4ff':st.type==='junction'?'#ffd700':'#6a8aaa', fontFamily: "'Share Tech Mono'", border: `1px solid ${st.type==='major'?'#00d4ff30':st.type==='junction'?'#ffd70030':'#3a3a4a'}` }}>{st.type}</span>
                  <div style={{ fontFamily: "'Orbitron'", fontSize: 16, fontWeight: 700, color: '#c084ff' }}>{st.platforms}</div>
                  <div style={{ fontFamily: "'Orbitron'", fontSize: 14, fontWeight: 700, color: '#e0eaff' }}>{st.trains_today}</div>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: `${sc}12`, color: sc, border: `1px solid ${sc}30`, fontFamily: "'Share Tech Mono'" }}>{st.status}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selected ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#060f1e', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 24, fontWeight: 900, color: '#00d4ff' }}>{selected.id}</div>
                  <div style={{ fontSize: 12, color: '#c0d4e8', marginTop: 3 }}>{selected.name}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background: 'none', border: 'none', color: '#4a6a8a', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {[['Type', selected.type, '#c084ff'], ['Status', selected.status, ST_C[selected.status]], ['Platforms', selected.platforms, '#00d4ff'], ['Trains Today', selected.trains_today, '#e0eaff'], ['Crowd Level', selected.crowd, CROWD_C[selected.crowd]]].map(([k,v,c])=>(
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0a1525', fontSize: 12 }}>
                  <span style={{ color: '#4a7a9a' }}>{k as string}</span>
                  <span style={{ fontFamily: "'Share Tech Mono'", color: c as string, fontWeight: 700, textTransform: 'capitalize' }}>{String(v)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {['operational','maintenance','closed'].map(s=>(
                  <button key={s} onClick={()=>{ setStations(prev=>prev.map(st=>st.id===selected.id?{...st,status:s}:st)); setSelected((p:any)=>({...p,status:s}));
                  // 🔊 Announce station status change
                  if(s==='emergency') voiceAlert.critical(`Emergency declared at ${selected.name}! Evacuate platform immediately.`,'stn_emg_'+selected.id);
                  else if(s==='maintenance') voiceAlert.high(`${selected.name} entering maintenance mode. Trains will be rerouted.`,'stn_maint_'+selected.id);
                  else voiceAlert.medium(`${selected.name} status updated to ${s}.`,'stn_status_'+selected.id); }} style={{ flex: 1, padding: '8px 4px', borderRadius: 7, background: selected.status===s?`${ST_C[s]}15`:'transparent', border: `1px solid ${selected.status===s?ST_C[s]:'#1a3a5a'}`, color: selected.status===s?ST_C[s]:'#3a6a8a', cursor: 'pointer', fontSize: 10, fontFamily: "'Share Tech Mono'", textTransform: 'capitalize' }}>{s.slice(0,5)}</button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div style={{ background: '#060f1e', border: '1px solid #0d2040', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 42, opacity: 0.2, marginBottom: 12 }}>🚉</div>
              <div style={{ fontSize: 12, color: '#2a5a8a', fontFamily: "'Share Tech Mono'" }}>Select a station<br/>to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StationControl;
