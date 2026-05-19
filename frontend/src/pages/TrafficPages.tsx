import React, { useState } from 'react';
import { motion } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const S = { fontFamily:"'Share Tech Mono',monospace" };
const Panel: React.FC<{title:string;sub:string;icon:string;children:React.ReactNode}> = ({title,sub,icon,children})=>(
  <div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div style={{paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>{icon} {title}</h1>
      <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>{sub}</div>
    </div>
    {children}
  </div>
);


// ---------- Traffic Control ----------
export const TrafficControl: React.FC = () => {
  const [junctions] = useState([
    {id:'JCT-01',name:'SBC North Junction',trains:3,status:'clear',priority:'normal'},
    {id:'JCT-02',name:'YPR Main Junction', trains:2,status:'congested',priority:'high'},
    {id:'JCT-03',name:'KRP East Junction', trains:1,status:'clear',priority:'normal'},
    {id:'JCT-04',name:'KGI West Junction', trains:4,status:'blocked',priority:'critical'},
  ]);
  const SC: Record<string,string> = {clear:'#00ff88',congested:'#ffd700',blocked:'#ff2244'};
  return (
    <Panel title="TRAFFIC CONTROL" sub="JUNCTION & ROUTE MANAGEMENT" icon="⬡">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[['Junctions',junctions.length,'#00d4ff'],['Clear',junctions.filter(j=>j.status==='clear').length,'#00ff88'],['Congested',junctions.filter(j=>j.status==='congested').length,'#ffd700'],['Blocked',junctions.filter(j=>j.status==='blocked').length,'#ff2244']].map(([l,v,c])=>(
          <div key={l as string} style={{background:'#060f1e',border:'1px solid #0d2040',borderTop:`2px solid ${c as string}`,borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,...S}}>{l as string}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:700,color:c as string}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
        {junctions.map(j=>{
          const c=SC[j.status]||'#888';
          return (
            <motion.div key={j.id} initial={{opacity:0}} animate={{opacity:1}} style={{background:'#060f1e',border:`1px solid ${c}30`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:15,fontWeight:700,color:'#e0eaff'}}>{j.name}</div><div style={{fontSize:9,color:'#2a5a8a',...S}}>{j.id}</div></div>
                <span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:`${c}15`,color:c,border:`1px solid ${c}30`,...S,textTransform:'uppercase'}}>{j.status}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6aaac0'}}>
                <span>Trains: <span style={{color:'#00d4ff',fontWeight:700,...S}}>{j.trains}</span></span>
                <span>Priority: <span style={{color:j.priority==='critical'?'#ff2244':j.priority==='high'?'#ff8c00':'#00ff88',fontWeight:700,...S}}>{j.priority}</span></span>
              </div>
              <div style={{display:'flex',gap:6,marginTop:10}}>
                <button style={{flex:1,padding:'6px',borderRadius:6,background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.3)',color:'#00ff88',cursor:'pointer',fontSize:10,...S}}>CLEAR</button>
                <button style={{flex:1,padding:'6px',borderRadius:6,background:'rgba(255,34,68,0.08)',border:'1px solid rgba(255,34,68,0.3)',color:'#ff4466',cursor:'pointer',fontSize:10,...S}}>HOLD</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
};

// ---------- Route Conflict ----------
export const RouteConflict: React.FC = () => {
  const [conflicts] = useState([
    {id:'RFC-001',train1:'TRN-001',train2:'TRN-004',location:'SBC North Yard',type:'Head-on',risk:'Critical',time:'14:32'},
    {id:'RFC-002',train1:'TRN-002',train2:'TRN-006',location:'YPR Junction',type:'Merge',risk:'High',time:'14:45'},
    {id:'RFC-003',train1:'TRN-003',train2:'TRN-005',location:'KRP Signal',type:'Overtake',risk:'Medium',time:'15:10'},
  ]);
  const RC: Record<string,string> = {Critical:'#ff2244',High:'#ff8c00',Medium:'#ffd700'};
  return (
    <Panel title="ROUTE CONFLICTS" sub="AI-DETECTED CONFLICT RESOLUTION" icon="⚡">
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[['Critical',conflicts.filter(c=>c.risk==='Critical').length,'#ff2244'],['High',conflicts.filter(c=>c.risk==='High').length,'#ff8c00'],['Medium',conflicts.filter(c=>c.risk==='Medium').length,'#ffd700']].map(([l,v,c])=>(
          <div key={l as string} style={{background:'#060f1e',border:`1px solid ${c as string}30`,borderTop:`2px solid ${c as string}`,borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,...S}}>{l as string}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:700,color:c as string,animation:(v as number)>0&&l==='Critical'?'blink 1.5s infinite':'none'}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {conflicts.map(cf=>{
          const c=RC[cf.risk]||'#888';
          return (
            <motion.div key={cf.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} style={{background:`${c}06`,border:`1px solid ${c}30`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:`${c}18`,color:c,border:`1px solid ${c}40`,...S}}>{cf.risk}</span>
                  <span style={{fontSize:11,color:'#e0eaff',fontWeight:700}}>{cf.type} Conflict</span>
                </div>
                <span style={{fontSize:9,color:'#2a5a8a',...S}}>{cf.id} · {cf.time}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:10,alignItems:'center',marginBottom:10}}>
                <div style={{background:'#040c18',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:'#2a5a8a',...S}}>TRAIN A</div>
                  <div style={{fontSize:14,color:'#00d4ff',fontWeight:700,...S}}>{cf.train1}</div>
                </div>
                <div style={{fontSize:20,color:c,textAlign:'center'}}>⚡</div>
                <div style={{background:'#040c18',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:'#2a5a8a',...S}}>TRAIN B</div>
                  <div style={{fontSize:14,color:'#c084ff',fontWeight:700,...S}}>{cf.train2}</div>
                </div>
              </div>
              <div style={{fontSize:11,color:'#6aaac0',marginBottom:10}}>📍 {cf.location}</div>
              <div style={{display:'flex',gap:8}}>
                <button style={{flex:1,padding:'8px',borderRadius:7,background:'rgba(0,212,255,0.08)',border:'1px solid rgba(0,212,255,0.3)',color:'#00d4ff',cursor:'pointer',fontSize:11,...S}}>AUTO REROUTE</button>
                <button style={{flex:1,padding:'8px',borderRadius:7,background:'rgba(255,215,0,0.08)',border:'1px solid rgba(255,215,0,0.3)',color:'#ffd700',cursor:'pointer',fontSize:11,...S}}>HOLD TRAIN A</button>
                <button style={{flex:1,padding:'8px',borderRadius:7,background:'rgba(255,34,68,0.08)',border:'1px solid rgba(255,34,68,0.3)',color:'#ff4466',cursor:'pointer',fontSize:11,...S}}>E-STOP BOTH</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
};

// ---------- Emergency Override ----------
export const EmergencyOverride: React.FC = () => {
  const [active, setActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg:string)=>setLog(p=>[`[${new Date().toLocaleTimeString()}] ${msg}`,...p].slice(0,20));

  const trigger = (action:string) => {
    setActive(true);
    addLog(`EMERGENCY: ${action} triggered by operator`);
    // 🔊 Voice emergency announcement
    voiceAlert.critical(
      `Emergency override activated! ${action}. All staff respond immediately. Clear all tracks.`,
      'emergency_' + action.replace(/\s/g,'_')
    );
    setTimeout(()=>{
      setActive(false);
      voiceAlert.high('Emergency mode deactivated. Returning to normal operations.','emergency_end');
    },5000);
  };

  return (
    <Panel title="EMERGENCY OVERRIDE" sub="CRITICAL SAFETY CONTROL SYSTEMS" icon="🆘">
      {active && (
        <motion.div animate={{opacity:[1,0.6,1]}} transition={{duration:0.5,repeat:Infinity}} style={{background:'rgba(255,34,68,0.1)',border:'2px solid #ff2244',borderRadius:12,padding:'16px 20px',textAlign:'center'}}>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,color:'#ff2244',letterSpacing:3}}>🚨 EMERGENCY MODE ACTIVE 🚨</div>
          <div style={{fontSize:11,color:'#ff6680',marginTop:6,...S}}>All systems alerted — Awaiting operator confirmation</div>
        </motion.div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {label:'NETWORK ESTOP',desc:'Stop ALL trains immediately',color:'#ff2244',icon:'⛔'},
          {label:'ALL SIGNALS RED',desc:'Set entire network to RED',color:'#ff8c00',icon:'🔴'},
          {label:'EVACUATE MODE',desc:'Trigger station evacuation',color:'#ffd700',icon:'⚠'},
          {label:'LOCKDOWN',desc:'Lock all junctions & platforms',color:'#c084ff',icon:'🔒'},
          {label:'FIRE PROTOCOL',desc:'Alert fire services & evacuate',color:'#ff6600',icon:'🔥'},
          {label:'FLOOD ALERT',desc:'Restrict low-lying line trains',color:'#00b0ff',icon:'🌊'},
        ].map(btn=>(
          <motion.button key={btn.label} whileTap={{scale:0.95}} onClick={()=>trigger(btn.label)} style={{padding:'20px 14px',borderRadius:12,background:`${btn.color}08`,border:`2px solid ${btn.color}40`,color:btn.color,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:10,transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${btn.color}18`; (e.currentTarget as HTMLElement).style.borderColor=btn.color;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${btn.color}08`; (e.currentTarget as HTMLElement).style.borderColor=`${btn.color}40`;}}>
            <span style={{fontSize:32}}>{btn.icon}</span>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1,textAlign:'center'}}>{btn.label}</div>
            <div style={{fontSize:10,color:`${btn.color}99`,...S,textAlign:'center',lineHeight:1.4}}>{btn.desc}</div>
          </motion.button>
        ))}
      </div>
      <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
        <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,...S}}>EMERGENCY ACTION LOG</div>
        <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
          {log.length===0&&<div style={{color:'#1a4a6a',fontSize:11,...S,textAlign:'center',padding:20}}>No emergency actions recorded</div>}
          {log.map((l,i)=>(
            <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} style={{fontSize:11,color:'#ff6680',...S,padding:'5px 10px',background:'rgba(255,34,68,0.05)',borderRadius:6,borderLeft:'2px solid #ff2244'}}>{l}</motion.div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default TrafficControl;
