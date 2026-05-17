import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const COLORS = ['#00d4ff','#00ff88','#ffd700','#ff8c00','#c084ff','#ff2244'];
const HOURS = Array.from({length:12},(_,i)=>({h:`${(i*2).toString().padStart(2,'0')}:00`,trains:8+Math.floor(Math.random()*12),delays:Math.floor(Math.random()*5),alerts:Math.floor(Math.random()*8)}));
const WEEKLY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({d,onTime:85+Math.random()*10,delayed:5+Math.random()*8,cancelled:Math.random()*3}));

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(()=>{
    Promise.allSettled([
      fetch(`${API}/control-room/overview`).then(r=>r.json()),
      fetch(`${API}/trains`).then(r=>r.json()),
    ]).then(([o,t])=>{
      if(o.status==='fulfilled') setOverview(o.value);
      if(t.status==='fulfilled'){
        const tList=t.value.trains||t.value||[];
        setTrains(tList);
        // 🔊 Announce critical status on dashboard load (once)
        const critCount=tList.filter((tr:any)=>tr.risk_level==='Critical').length;
        const delayCount=tList.filter((tr:any)=>tr.run_status==='delayed').length;
        if(critCount>0){
voiceAlert.critical(`Dashboard alert: ${critCount} critical risk train${critCount > 1 ? 's' : ''} require immediate attention.`, 'dash_critical_load');
        } else if(delayCount>3){
voiceAlert.high(`Dashboard: ${delayCount} trains currently delayed. Review operations.`, 'dash_delay_load');        }
      }
    });
  },[]);

  const riskDist = ['Critical','High','Medium','Low'].map(r=>({name:r,value:trains.filter(t=>t.risk_level===r).length})).filter(d=>d.value>0);
  const statusDist = ['running','delayed','stopped'].map(s=>({name:s,value:trains.filter(t=>t.run_status===s).length}));
  const routeData = trains.slice(0,6).map(t=>({route:`${t.source||'?'}→${t.destination||'?'}`.slice(0,12),speed:t.speed||0,delay:t.delay_minutes||0}));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>⬡ ANALYTICS DASHBOARD</h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>OPERATIONAL INTELLIGENCE · KARNATAKA RAILWAY</div>
        </div>
        <div style={{fontSize:10,color:'#3a6a8a',fontFamily:"'Share Tech Mono'"}}>{new Date().toLocaleString()}</div>
      </div>

      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
        {[['Total Trains',overview?.total_trains??trains.length,'#00d4ff'],
          ['On Time',overview?.running??trains.filter(t=>t.run_status==='running').length,'#00ff88'],
          ['Delayed',overview?.delayed??trains.filter(t=>t.run_status==='delayed').length,'#ffd700'],
          ['Critical',trains.filter(t=>t.risk_level==='Critical').length,'#ff2244'],
          ['Avg Speed',`${Math.round(trains.reduce((s,t)=>s+(t.speed||0),0)/Math.max(1,trains.length))} km/h`,'#c084ff'],
          ['On-Time %',`${Math.round(((overview?.running??trains.filter(t=>t.run_status==='running').length)/Math.max(1,trains.length))*100)}%`,'#00ff88'],
        ].map(([l,v,c])=>(
          <div key={l as string} style={{background:'#060f1e',border:'1px solid #0d2040',borderTop:`2px solid ${c as string}`,borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:5,fontFamily:"'Share Tech Mono'"}}>{l as string}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,fontWeight:700,color:c as string}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:14}}>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>HOURLY TRAFFIC & ALERTS</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={HOURS}>
              <defs>
                <linearGradient id="trainGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3}/><stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/></linearGradient>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff2244" stopOpacity={0.3}/><stop offset="100%" stopColor="#ff2244" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="h" tick={{fill:'#2a5a8a',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Area type="monotone" dataKey="trains" stroke="#00d4ff" strokeWidth={2} fill="url(#trainGrad)" name="Trains"/>
              <Area type="monotone" dataKey="alerts" stroke="#ff2244" strokeWidth={1.5} fill="url(#alertGrad)" name="Alerts"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>RISK DISTRIBUTION</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={riskDist.length?riskDist:[{name:'Normal',value:1}]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                {(riskDist.length?riskDist:[{name:'Normal',value:1}]).map((_,i)=><Cell key={i} fill={['#ff2244','#ff8c00','#ffd700','#00ff88','#00d4ff'][i]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Legend iconType="circle" wrapperStyle={{fontSize:10,color:'#4a7a9a'}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>STATUS BREAKDOWN</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusDist} layout="vertical">
              <XAxis type="number" hide/>
              <YAxis type="category" dataKey="name" tick={{fill:'#4a7a9a',fontSize:10}} axisLine={false} tickLine={false} width={60}/>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {statusDist.map((_,i)=><Cell key={i} fill={['#00ff88','#ffd700','#ff1744'][i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>WEEKLY ON-TIME PERFORMANCE</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={WEEKLY}>
              <XAxis dataKey="d" tick={{fill:'#2a5a8a',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Bar dataKey="onTime" stackId="a" fill="#00ff88" name="On Time" radius={[4,4,0,0]}/>
              <Bar dataKey="delayed" stackId="a" fill="#ffd700" name="Delayed"/>
              <Bar dataKey="cancelled" stackId="a" fill="#ff2244" name="Cancelled"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:14,fontFamily:"'Share Tech Mono'"}}>ROUTE SPEED & DELAY</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={routeData}>
              <XAxis dataKey="route" tick={{fill:'#2a5a8a',fontSize:8}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
              <Bar dataKey="speed" fill="#00d4ff" name="Speed (km/h)" radius={[3,3,0,0]}/>
              <Bar dataKey="delay" fill="#ff8c00" name="Delay (min)" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
