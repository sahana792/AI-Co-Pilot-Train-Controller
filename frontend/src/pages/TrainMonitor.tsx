import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const RC: Record<string,string> = {Critical:'#ff2244',High:'#ff8c00',Medium:'#ffd700',Low:'#00ff88'};
const SC: Record<string,string> = {running:'#00e676',delayed:'#ffd600',stopped:'#ff1744'};

// ✅ FIX: safely extract array from any API response shape
function toArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const keys = Object.keys(val);
  for (const k of keys) {
    if (Array.isArray(val[k])) return val[k];
  }
  return [];
}

const TrainMonitor: React.FC = () => {
  const [trains, setTrains] = useState<any[]>([]);
  const seenTrainAlerts = React.useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<'name'|'speed'|'delay'>('name');
  const [speedHistory] = useState(
    Array.from({length:20},(_,i)=>({t:i,speed:60+Math.random()*60}))
  );

  const fetchTrains = useCallback(async () => {
    try {
      const r = await fetch(`${API}/trains/`);
      const d = await r.json();
      // ✅ FIX: toArray handles { trains:[...] } or raw array
      const tList = toArray(d);
      setTrains(tList);

      tList.forEach((t: any) => {
        const alertKey = t.train_id + '_' + t.risk_level + '_' + Math.floor((t.delay_minutes||0)/5);
        if (t.risk_level === 'Critical' && !seenTrainAlerts.current.has(alertKey)) {
          seenTrainAlerts.current.add(alertKey);
          voiceAlert.speak(
            `Critical risk on ${t.train_name||t.train_id} at ${t.current_station||'unknown station'}. Immediate action required.`,
            { severity: 'CRITICAL', id: 'train_crit_' + t.train_id }
          );
        } else if ((t.delay_minutes||0) >= 20 && !seenTrainAlerts.current.has(alertKey)) {
          seenTrainAlerts.current.add(alertKey);
          voiceAlert.speak(
            `${t.train_name||t.train_id} delayed by ${t.delay_minutes} minutes at ${t.current_station||'unknown station'}.`,
            { severity: 'HIGH', id: 'train_delay_' + t.train_id }
          );
        }
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchTrains();
    const t = setInterval(fetchTrains, 5000);
    return () => clearInterval(t);
  }, [fetchTrains]);

  const filtered = trains
    .filter(t =>
      search === '' ||
      (t.train_name||'').toLowerCase().includes(search.toLowerCase()) ||
      (t.train_number||'').includes(search)
    )
    .filter(t => statusFilter === 'all' || t.run_status === statusFilter)
    .sort((a,b) =>
      sort === 'speed' ? b.speed - a.speed :
      sort === 'delay' ? b.delay_minutes - a.delay_minutes :
      (a.train_name||'').localeCompare(b.train_name||'')
    );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>🚂 TRAIN MONITOR</h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>LIVE TRAIN STATUS & TRACKING</div>
        </div>
        <button onClick={fetchTrains}
          style={{padding:'7px 14px',borderRadius:7,background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.2)',color:'#00d4ff',cursor:'pointer',fontSize:11,fontFamily:"'Share Tech Mono'"}}>
          ↺ REFRESH
        </button>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search train..."
          style={{flex:1,padding:'8px 14px',background:'#060f1e',border:'1px solid #1a3a6a',borderRadius:8,color:'#e0eaff',fontSize:12,outline:'none'}}/>
        {['all','running','delayed','stopped'].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            style={{padding:'7px 14px',borderRadius:7,
              background:statusFilter===s?'rgba(0,212,255,0.1)':'transparent',
              border:`1px solid ${statusFilter===s?'rgba(0,212,255,0.4)':'#1a3a5a'}`,
              color:statusFilter===s?'#00d4ff':'#4a7a9a',cursor:'pointer',fontSize:11,
              fontFamily:"'Share Tech Mono'",textTransform:'capitalize'}}>
            {s}
          </button>
        ))}
        <select value={sort} onChange={e=>setSort(e.target.value as any)}
          style={{padding:'7px 10px',background:'#060f1e',border:'1px solid #1a3a5a',borderRadius:7,color:'#00d4ff',fontSize:11,fontFamily:"'Share Tech Mono'",outline:'none'}}>
          <option value="name">Sort: Name</option>
          <option value="speed">Sort: Speed</option>
          <option value="delay">Sort: Delay</option>
        </select>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:14}}>
        {/* Train table */}
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 80px 80px 100px',padding:'10px 14px',borderBottom:'1px solid #0d2040',background:'#040c18'}}>
            {['Train','Source','Destination','Platform','Speed','Delay','Status'].map(h=>(
              <div key={h} style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,fontFamily:"'Share Tech Mono'"}}>{h}</div>
            ))}
          </div>
          <div style={{overflowY:'auto',maxHeight:'60vh'}}>
            {filtered.map((t,i)=>{
              const rc = RC[t.risk_level]||'#888';
              const sc = SC[t.run_status]||'#888';
              const sel = selected?.train_id === t.train_id;
              return (
                <motion.div key={t.train_id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  onClick={()=>setSelected(sel?null:t)}
                  style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 80px 80px 100px',
                    padding:'11px 14px',borderBottom:'1px solid #060e18',cursor:'pointer',
                    background:sel?'rgba(0,212,255,0.05)':'transparent',transition:'background 0.15s'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:12,color:'#e0eaff'}}>{t.train_name}</div>
                    <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>#{t.train_number}</div>
                  </div>
                  <div style={{fontSize:11,color:'#6aaac0',alignSelf:'center'}}>{t.source||'—'}</div>
                  <div style={{fontSize:11,color:'#6aaac0',alignSelf:'center'}}>{t.destination||'—'}</div>
                  <div style={{fontSize:11,color:'#c084ff',fontFamily:"'Share Tech Mono'",alignSelf:'center'}}>{t.platform||'—'}</div>
                  <div style={{fontFamily:"'Share Tech Mono'",fontSize:12,fontWeight:700,color:'#00d4ff',alignSelf:'center'}}>{t.speed||0}</div>
                  <div style={{fontFamily:"'Share Tech Mono'",fontSize:12,fontWeight:700,color:t.delay_minutes>0?'#ffd700':'#00ff88',alignSelf:'center'}}>
                    {t.delay_minutes>0?`+${t.delay_minutes}m`:'0m'}
                  </div>
                  <div style={{alignSelf:'center'}}>
                    <span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:`${sc}12`,color:sc,border:`1px solid ${sc}30`,fontFamily:"'Share Tech Mono'"}}>{t.run_status}</span>
                  </div>
                </motion.div>
              );
            })}
            {!filtered.length&&(
              <div style={{textAlign:'center',padding:40,color:'#1a4a6a',fontFamily:"'Share Tech Mono'",fontSize:12}}>No trains found</div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {selected ? (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
              style={{background:'#060f1e',border:`1px solid ${RC[selected.risk_level]||'#0d2040'}40`,borderRadius:12,padding:16}}>
              <div style={{marginBottom:12}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff'}}>{selected.train_name}</div>
                <div style={{fontFamily:"'Share Tech Mono'",fontSize:9,color:'#2a5a8a'}}>#{selected.train_number} · {selected.train_id}</div>
              </div>
              {/* Speed chart */}
              <div style={{marginBottom:14,background:'#040c18',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:8,color:'#2a5a8a',marginBottom:8,fontFamily:"'Share Tech Mono'"}}>SPEED PROFILE</div>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={speedHistory}>
                    <defs>
                      <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="speed" stroke="#00d4ff" strokeWidth={1.5} fill="url(#spd)"/>
                    <YAxis hide domain={[0,160]}/>
                    <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:6,fontSize:10,color:'#e0eaff'}} labelFormatter={()=>''}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {[
                ['Route',`${selected.source||'?'} → ${selected.destination||'?'}`,'#e0eaff'],
                ['Current',selected.current_station||'—','#00d4ff'],
                ['Next',selected.next_station||'—','#ffd700'],
                ['Platform',selected.platform||'—','#c084ff'],
                ['Speed',`${selected.speed||0} km/h`,'#00d4ff'],
                ['Delay',selected.delay_minutes>0?`+${selected.delay_minutes} min`:'On Time',selected.delay_minutes>0?'#ff8c00':'#00ff88'],
                ['Signal',selected.signal_status||'—','#00e676'],
                ['Risk',selected.risk_level||'—',RC[selected.risk_level]||'#888'],
              ].map(([k,v,c])=>(
                <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #070f1a',fontSize:12}}>
                  <span style={{color:'#4a7a9a'}}>{k as string}</span>
                  <span style={{fontFamily:"'Share Tech Mono'",color:c as string,fontWeight:600}}>{v as string}</span>
                </div>
              ))}
              {selected.recommendation&&(
                <div style={{marginTop:12,background:'rgba(0,212,255,0.05)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:8,color:'#2a5a8a',marginBottom:5,fontFamily:"'Share Tech Mono'"}}>AI RECOMMENDATION</div>
                  <div style={{fontSize:11,color:'#c0d4e8',lineHeight:1.5}}>{selected.recommendation}</div>
                </div>
              )}
            </motion.div>
          ) : (
            <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
              <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:12,fontFamily:"'Share Tech Mono'"}}>FLEET SUMMARY</div>
              {[
                ['Total',   trains.length,                                          '#00d4ff'],
                ['Running', trains.filter(t=>t.run_status==='running').length,      '#00ff88'],
                ['Delayed', trains.filter(t=>t.run_status==='delayed').length,      '#ffd700'],
                ['Stopped', trains.filter(t=>t.run_status==='stopped').length,      '#ff1744'],
                ['Critical',trains.filter(t=>t.risk_level==='Critical').length,     '#ff2244'],
              ].map(([k,v,c])=>(
                <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #070f1a'}}>
                  <span style={{fontSize:12,color:'#4a7a9a'}}>{k as string}</span>
                  <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,fontWeight:700,color:c as string}}>{v as number}</span>
                </div>
              ))}
              <div style={{marginTop:14,fontSize:11,color:'#1a4a6a',fontFamily:"'Share Tech Mono'",textAlign:'center'}}>Click a row to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainMonitor;