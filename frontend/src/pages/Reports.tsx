import React, { useState } from 'react';
import { motion } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const DAILY = Array.from({length:14},(_,i)=>({ day:`D-${13-i}`, trains:18+Math.floor(Math.random()*12), delays:2+Math.floor(Math.random()*8), alerts:1+Math.floor(Math.random()*10), ontime:Math.floor(80+Math.random()*18) }));
const ROUTES = [
  { route:'SBC→MYS', trains:42, avg_delay:3.2, incidents:2, ontime:92 },
  { route:'SBC→UBL', trains:38, avg_delay:8.1, incidents:5, ontime:76 },
  { route:'SBC→MAQ', trains:22, avg_delay:5.4, incidents:3, ontime:84 },
  { route:'SBC→BGM', trains:18, avg_delay:2.1, incidents:1, ontime:95 },
  { route:'SBC→GR',  trains:14, avg_delay:11.3,incidents:7, ontime:68 },
];
const OBJ_DETECTED = [
  { name:'Person on Track', count:12, color:'#ff2244' },
  { name:'Crowd', count:28, color:'#ff8c00' },
  { name:'Obstacle', count:7, color:'#ffd700' },
  { name:'Signal Issue', count:5, color:'#c084ff' },
  { name:'Suspicious', count:3, color:'#00d4ff' },
];

const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'7d'|'14d'|'30d'>('14d');
  const data = period === '7d' ? DAILY.slice(-7) : DAILY;

  const totalTrains = ROUTES.reduce((s,r)=>s+r.trains,0);
  const avgDelay = (ROUTES.reduce((s,r)=>s+r.avg_delay,0)/ROUTES.length).toFixed(1);
  const totalIncidents = ROUTES.reduce((s,r)=>s+r.incidents,0);
  const avgOntime = Math.round(ROUTES.reduce((s,r)=>s+r.ontime,0)/ROUTES.length);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>▤ OPERATIONAL REPORTS</h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>ANALYTICS & PERFORMANCE METRICS</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {(['7d','14d','30d'] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{padding:'6px 14px',borderRadius:7,background:period===p?'rgba(0,212,255,0.1)':'transparent',border:`1px solid ${period===p?'rgba(0,212,255,0.4)':'#1a3a5a'}`,color:period===p?'#00d4ff':'#4a7a9a',cursor:'pointer',fontSize:11,fontFamily:"'Share Tech Mono'"}}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[['Total Trains',totalTrains,'#00d4ff'],['Avg Delay',`${avgDelay}m`,'#ffd700'],['Incidents',totalIncidents,'#ff8c00'],['On-Time %',`${avgOntime}%`,avgOntime>85?'#00ff88':'#ffd700']].map(([l,v,c])=>(
          <div key={l as string} style={{background:'#060f1e',border:'1px solid #0d2040',borderTop:`3px solid ${c as string}`,borderRadius:10,padding:'14px 18px'}}>
            <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:6,fontFamily:"'Share Tech Mono'"}}>{l as string}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:30,fontWeight:700,color:c as string}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>DAILY OPERATIONS TREND</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3}/><stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/></linearGradient>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffd700" stopOpacity={0.3}/><stop offset="100%" stopColor="#ffd700" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{fill:'#2a5a8a',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Area type="monotone" dataKey="trains" stroke="#00d4ff" strokeWidth={2} fill="url(#tg)" name="Trains"/>
              <Area type="monotone" dataKey="delays" stroke="#ffd700" strokeWidth={1.5} fill="url(#dg)" name="Delays"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>DETECTED OBJECTS</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={OBJ_DETECTED} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="count">
                {OBJ_DETECTED.map((o,i)=><Cell key={i} fill={o.color}/>)}
              </Pie>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Legend iconType="circle" wrapperStyle={{fontSize:9,color:'#4a7a9a'}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Route table */}
      <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'10px 16px',borderBottom:'1px solid #0d2040',background:'#040c18',display:'grid',gridTemplateColumns:'1.5fr repeat(4,1fr)'}}>
          {['Route','Trains Run','Avg Delay','Incidents','On-Time %'].map(h=>(
            <div key={h} style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,fontFamily:"'Share Tech Mono'"}}>{h}</div>
          ))}
        </div>
        {ROUTES.map((r,i)=>(
          <motion.div key={r.route} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.05}}
            style={{display:'grid',gridTemplateColumns:'1.5fr repeat(4,1fr)',padding:'12px 16px',borderBottom:'1px solid #060e18',alignItems:'center'}}>
            <div style={{fontFamily:"'Share Tech Mono'",fontSize:12,fontWeight:700,color:'#00d4ff'}}>{r.route}</div>
            <div style={{fontFamily:"'Orbitron'",fontSize:14,color:'#e0eaff'}}>{r.trains}</div>
            <div style={{fontFamily:"'Share Tech Mono'",fontSize:13,color:r.avg_delay>8?'#ff8c00':r.avg_delay>4?'#ffd700':'#00ff88',fontWeight:700}}>{r.avg_delay}m</div>
            <div style={{fontFamily:"'Share Tech Mono'",fontSize:13,color:r.incidents>5?'#ff2244':r.incidents>2?'#ff8c00':'#ffd700',fontWeight:700}}>{r.incidents}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,background:'#0a1525',borderRadius:3,height:4}}>
                <div style={{height:'100%',background:r.ontime>90?'#00ff88':r.ontime>80?'#ffd700':'#ff8c00',borderRadius:3,width:`${r.ontime}%`,transition:'width 0.5s'}}/>
              </div>
              <span style={{fontFamily:"'Share Tech Mono'",fontSize:11,color:'#e0eaff',minWidth:36}}>{r.ontime}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
export default Reports;
