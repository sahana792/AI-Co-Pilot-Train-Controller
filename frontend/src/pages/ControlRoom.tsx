import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SIG_COLOR: Record<string,string> = { Green:'#00e676', Yellow:'#ffd600', Red:'#ff1744', Fault:'#ff6d00' };
const RISK_COLOR: Record<string,string> = { Critical:'#ff1744', High:'#ff6d00', Medium:'#ffd600', Low:'#00e676' };
const RUN_COLOR: Record<string,{bg:string;border:string;text:string;dot:string}> = {
  running:{bg:'rgba(0,230,118,0.05)',border:'#00e67630',text:'#00e676',dot:'#00e676'},
  delayed:{bg:'rgba(255,214,0,0.05)',border:'#ffd60030',text:'#ffd600',dot:'#ffd600'},
  stopped:{bg:'rgba(255,23,68,0.05)',border:'#ff174430',text:'#ff1744',dot:'#ff1744'},
};

const KARNATAKA_NODES = [
  {id:'N1',label:'Bengaluru',code:'SBC',x:350,y:355,type:'major'},
  {id:'N2',label:'Yeshwanthpur',code:'YPR',x:308,y:322,type:'junction'},
  {id:'N3',label:'KR Puram',code:'KRP',x:422,y:330,type:'normal'},
  {id:'N4',label:'Kengeri',code:'KGI',x:278,y:375,type:'normal'},
  {id:'N5',label:'Mysuru',code:'MYS',x:198,y:435,type:'major'},
  {id:'N6',label:'Hassan',code:'HAS',x:168,y:340,type:'normal'},
  {id:'N7',label:'Mangaluru',code:'MAQ',x:78,y:268,type:'major'},
  {id:'N8',label:'Shivamogga',code:'SMET',x:228,y:268,type:'junction'},
  {id:'N9',label:'Davangere',code:'DVG',x:298,y:198,type:'normal'},
  {id:'N10',label:'Hubballi',code:'UBL',x:248,y:128,type:'major'},
  {id:'N11',label:'Dharwad',code:'DWR',x:198,y:108,type:'normal'},
  {id:'N12',label:'Belagavi',code:'BGM',x:158,y:68,type:'major'},
  {id:'N13',label:'Ballari',code:'BAY',x:432,y:188,type:'junction'},
  {id:'N14',label:'Raichur',code:'RC',x:472,y:108,type:'junction'},
  {id:'N15',label:'Kalaburagi',code:'GR',x:562,y:78,type:'major'},
];

const EDGES = [
  ['N1','N2'],['N1','N3'],['N1','N4'],['N4','N5'],['N5','N6'],['N6','N7'],
  ['N6','N8'],['N8','N9'],['N9','N10'],['N10','N11'],['N11','N12'],
  ['N2','N9'],['N9','N13'],['N13','N14'],['N14','N15'],['N2','N8'],['N1','N13'],
];

const nodeMap = Object.fromEntries(KARNATAKA_NODES.map(n=>[n.id,n]));

// ── FIX: safely extract array from any API response shape ──
function toArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // common shapes: { trains:[...] }, { signals:[...] }, { platforms:[...] }, { alerts:[...] }
  const keys = Object.keys(val);
  for (const k of keys) {
    if (Array.isArray(val[k])) return val[k];
  }
  return [];
}

// ── FIX: map risk/severity to valid VoiceAlert severity ──
function toVoiceSeverity(s: string): 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO' {
  const map: Record<string, 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO'> = {
    critical:'CRITICAL', high:'HIGH', medium:'MEDIUM', low:'LOW', info:'INFO',
    CRITICAL:'CRITICAL', HIGH:'HIGH', MEDIUM:'MEDIUM', LOW:'LOW', INFO:'INFO',
  };
  return map[s] || 'INFO';
}

interface TrainPos {
  train_id:string; train_name:string; train_number:string;
  x:number; y:number; color:string; run_status:string;
  risk_level:string; speed:number; current_station:string;
  route:string; delay_minutes:number;
}

const AnimatedTrain:React.FC<{train:TrainPos; onClick:(t:TrainPos)=>void}> = ({train,onClick}) => {
  const color = RISK_COLOR[train.risk_level] || '#00d4ff';
  return (
    <motion.g
      initial={{opacity:0,scale:0}}
      animate={{opacity:1,scale:1}}
      transition={{duration:0.4}}
      style={{cursor:'pointer'}}
      onClick={()=>onClick(train)}
    >
      <motion.circle
        cx={train.x} cy={train.y} r={9}
        fill={color+'20'} stroke={color} strokeWidth={1.5}
        animate={{r:[9,12,9]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}
      />
      <circle cx={train.x} cy={train.y} r={5} fill={color} />
      <motion.circle
        cx={train.x} cy={train.y} r={14}
        fill="none" stroke={color} strokeWidth={0.5} opacity={0.3}
        animate={{r:[14,22,14],opacity:[0.3,0,0.3]}}
        transition={{duration:2.5,repeat:Infinity,ease:'easeOut'}}
      />
      <text x={train.x+12} y={train.y-8} fill={color} fontSize={8} fontFamily="'Share Tech Mono'"
        style={{pointerEvents:'none'}}>
        {train.train_number}
      </text>
    </motion.g>
  );
};

const TrackMap:React.FC<{trains:TrainPos[];onTrainClick:(t:TrainPos)=>void;signals:any[]}> = ({trains,onTrainClick,signals}) => {
  const [hoveredNode,setHoveredNode] = useState<string|null>(null);
  return (
    <svg viewBox="0 0 640 520" width="100%" height="100%" style={{fontFamily:"'Share Tech Mono',monospace"}}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-strong"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#060f1e" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#02060f" stopOpacity="1"/>
        </radialGradient>
      </defs>

      <rect width="640" height="520" fill="url(#bgGrad)"/>
      <rect width="640" height="520" fill="none" stroke="#00d4ff" strokeWidth="0.5" opacity="0.1"/>

      {Array.from({length:16},(_,i)=>(
        <line key={`h${i}`} x1="0" y1={i*35} x2="640" y2={i*35} stroke="#0d2040" strokeWidth="0.5" opacity="0.4"/>
      ))}
      {Array.from({length:19},(_,i)=>(
        <line key={`v${i}`} x1={i*35} y1="0" x2={i*35} y2="520" stroke="#0d2040" strokeWidth="0.5" opacity="0.4"/>
      ))}

      {EDGES.map(([f,t],i)=>{
        const fn=nodeMap[f]; const tn=nodeMap[t];
        if(!fn||!tn) return null;
        return (
          <g key={i}>
            <line x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y} stroke="#0d2a4a" strokeWidth={4} strokeLinecap="round"/>
            <line x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y} stroke="#1a4a8a" strokeWidth={2} strokeLinecap="round" opacity="0.7"/>
            <motion.line
              x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
              stroke="#00d4ff" strokeWidth={1} strokeLinecap="round" opacity={0.15}
              animate={{opacity:[0.1,0.4,0.1]}}
              transition={{duration:3+i*0.3,repeat:Infinity,ease:'easeInOut'}}
            />
          </g>
        );
      })}

      {signals.slice(0,8).map((sig,i)=>{
        const node = KARNATAKA_NODES[i%KARNATAKA_NODES.length];
        const color = SIG_COLOR[sig.status] || '#888';
        return (
          <g key={sig.signal_id}>
            <rect x={node.x-6} y={node.y-22} width={12} height={18} rx={2}
              fill="#0d1a2a" stroke={color} strokeWidth={0.8}/>
            <circle cx={node.x} cy={node.y-18} r={3} fill={color} filter="url(#glow)"/>
            <motion.circle cx={node.x} cy={node.y-18} r={4} fill="none" stroke={color} strokeWidth={0.5}
              animate={{opacity:[0.5,0,0.5]}} transition={{duration:1.5,repeat:Infinity}}/>
          </g>
        );
      })}

      {KARNATAKA_NODES.map(node=>{
        const isMajor = node.type==='major';
        const isJunction = node.type==='junction';
        const hovered = hoveredNode===node.id;
        const r = isMajor?10:isJunction?8:6;
        return (
          <g key={node.id} style={{cursor:'pointer'}}
            onMouseEnter={()=>setHoveredNode(node.id)}
            onMouseLeave={()=>setHoveredNode(null)}
          >
            {isMajor&&<motion.circle cx={node.x} cy={node.y} r={r+6} fill={`#00d4ff08`}
              stroke="#00d4ff" strokeWidth={0.5}
              animate={{r:[r+6,r+10,r+6]}} transition={{duration:3,repeat:Infinity}}/>}
            <circle cx={node.x} cy={node.y} r={r} fill="#060f1e"
              stroke={isMajor?'#00d4ff':isJunction?'#ffd700':'#1a4a8a'} strokeWidth={isMajor?2:1.5}
              filter={hovered?'url(#glow-strong)':isMajor?'url(#glow)':undefined}/>
            <circle cx={node.x} cy={node.y} r={isMajor?4:isJunction?3:2}
              fill={isMajor?'#00d4ff':isJunction?'#ffd700':'#1a4a8a'}/>
            <text x={node.x} y={node.y+r+12} textAnchor="middle"
              fill={isMajor?'#00d4ff':isJunction?'#ffd70099':'#4a6a8a'}
              fontSize={isMajor?9:8} fontWeight={isMajor?700:400}>
              {node.code}
            </text>
            {hovered&&(
              <foreignObject x={node.x+12} y={node.y-20} width={120} height={50}>
                <div style={{background:'#0a1628',border:'1px solid #00d4ff40',borderRadius:6,padding:'4px 8px',fontSize:10,color:'#00d4ff',fontFamily:"'Share Tech Mono'"}}>
                  {node.label}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {trains.map(train=>(
        <AnimatedTrain key={train.train_id} train={train} onClick={onTrainClick}/>
      ))}

      <g transform="translate(10,460)">
        {[['#00d4ff','Major Station'],['#ffd700','Junction'],['#1a4a8a','Station']].map(([c,l],i)=>(
          <g key={l as string} transform={`translate(${i*130},0)`}>
            <circle cx="4" cy="4" r="4" fill={c as string}/>
            <text x="12" y="8" fill="#4a6a8a" fontSize="9">{l as string}</text>
          </g>
        ))}
      </g>

      <text x="8" y="16" fill="#1a4a8a" fontSize="9" fontFamily="'Share Tech Mono'">KARNATAKA RAILWAY NETWORK — LIVE</text>
      <motion.text x="580" y="16" fill="#00d4ff" fontSize="8" fontFamily="'Share Tech Mono'"
        animate={{opacity:[1,0.4,1]}} transition={{duration:2,repeat:Infinity}}>LIVE</motion.text>
    </svg>
  );
};

const KpiCard:React.FC<{label:string;value:number|string;color:string;sub?:string;blink?:boolean}> = ({label,value,color,sub,blink}) => (
  <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
    style={{background:'#060f1e',border:`1px solid ${blink?color+'50':'#0d2040'}`,borderTop:`3px solid ${color}`,
    borderRadius:10,padding:'12px 16px',boxShadow:blink?`0 0 20px ${color}18`:'none',transition:'box-shadow 0.4s'}}>
    <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1.5,textTransform:'uppercase',marginBottom:5}}>{label}</div>
    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:26,fontWeight:700,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:9,color:'#2a5a7a',marginTop:4,fontFamily:"'Share Tech Mono'"}}>{sub}</div>}
  </motion.div>
);

const TrainCard:React.FC<{train:any;onSelect:(t:any)=>void;selected:boolean}> = ({train,onSelect,selected}) => {
  const rs = RUN_COLOR[train.run_status as string]||RUN_COLOR.running;
  const rc = RISK_COLOR[train.risk_level as string]||'#fff';
  return (
    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
      whileHover={{borderColor:rc+'60'}}
      onClick={()=>onSelect(train)}
      style={{background:rs.bg,border:`1px solid ${selected?rc:rs.border}`,borderLeft:`3px solid ${selected?rc:rs.dot}`,
      borderRadius:8,padding:'10px 12px',cursor:'pointer',marginBottom:6,
      boxShadow:selected?`0 0 16px ${rc}20`:'none',transition:'all 0.2s'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700,color:'#e0eaff'}}>{train.train_name||train.train_id}</div>
        <div style={{display:'flex',gap:5}}>
          <span style={{fontSize:8,padding:'2px 6px',borderRadius:3,background:`${rs.dot}18`,color:rs.text,border:`1px solid ${rs.dot}40`,fontFamily:"'Share Tech Mono'"}}>
            {(train.run_status||'running').toUpperCase()}
          </span>
          <span style={{fontSize:8,padding:'2px 6px',borderRadius:3,background:`${rc}18`,color:rc,border:`1px solid ${rc}40`,fontFamily:"'Share Tech Mono'"}}>
            {train.risk_level||'Low'}
          </span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,fontSize:10,color:'#4a6a8a'}}>
        <span>📍 {train.current_station}</span>
        <span>→ {train.next_station}</span>
        <span style={{fontFamily:"'Share Tech Mono'",color:'#00d4ff'}}>⚡ {train.speed||0} km/h</span>
        <span style={{color:train.delay_minutes>0?'#ffd700':'#00ff88',fontFamily:"'Share Tech Mono'"}}>
          {train.delay_minutes>0?`+${train.delay_minutes}m`:'On Time'}
        </span>
      </div>
      {train.signal_status&&(
        <div style={{marginTop:6,display:'flex',alignItems:'center',gap:5}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:SIG_COLOR[train.signal_status]||'#888',display:'inline-block',boxShadow:`0 0 6px ${SIG_COLOR[train.signal_status]||'#888'}`}}/>
          <span style={{fontSize:9,color:SIG_COLOR[train.signal_status]||'#888',fontFamily:"'Share Tech Mono'"}}>{train.signal_status} Signal</span>
        </div>
      )}
    </motion.div>
  );
};

const TrainDetailPanel:React.FC<{train:any;onClose:()=>void}> = ({train,onClose}) => {
  const rc = RISK_COLOR[train.risk_level]||'#fff';
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
      style={{background:'#060f1e',border:`1px solid ${rc}40`,borderRadius:12,padding:16,
      boxShadow:`0 0 30px ${rc}15`}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:18,fontWeight:700,color:'#e0eaff'}}>{train.train_name}</div>
          <div style={{fontFamily:"'Share Tech Mono'",fontSize:10,color:'#4a7a9a'}}>#{train.train_number} · {train.train_id}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#4a6a8a',cursor:'pointer',fontSize:18,padding:'0 4px'}}>✕</button>
      </div>

      <div style={{background:'#04080f',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
        <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:8}}>ROUTE INFO</div>
        <div style={{fontSize:12,color:'#c0d4e8',marginBottom:4}}>{train.source} → {train.destination}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#4a7a9a'}}>
          <span>📍 Now: <span style={{color:'#00d4ff'}}>{train.current_station}</span></span>
          <span>→ Next: <span style={{color:'#ffd700'}}>{train.next_station}</span></span>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
        {[
          ['Speed',`${train.speed} km/h`,'#00d4ff'],
          ['Delay',train.delay_minutes>0?`+${train.delay_minutes} min`:'On Time',train.delay_minutes>0?'#ffd700':'#00ff88'],
          ['Platform',train.platform||'—','#c084ff'],
          ['Signal',train.signal_status||'—',SIG_COLOR[train.signal_status]||'#888'],
        ].map(([k,v,c])=>(
          <div key={k as string} style={{background:'#04080f',borderRadius:6,padding:'8px 10px'}}>
            <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:3}}>{k as string}</div>
            <div style={{fontFamily:"'Share Tech Mono'",fontSize:14,fontWeight:700,color:c as string}}>{v as string}</div>
          </div>
        ))}
      </div>

      <div style={{background:`${rc}08`,border:`1px solid ${rc}30`,borderRadius:8,padding:'10px 12px'}}>
        <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:5}}>AI RECOMMENDATION</div>
        <div style={{fontSize:11,color:'#c0d4e8',lineHeight:1.5}}>{train.recommendation||'Normal operation. Proceed as scheduled.'}</div>
      </div>

      {train.detected_objects?.length>0&&(
        <div style={{marginTop:8,background:'rgba(255,34,68,0.06)',border:'1px solid rgba(255,34,68,0.2)',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:8,color:'#ff4466',letterSpacing:1,marginBottom:5}}>DETECTED OBJECTS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {train.detected_objects.map((obj:string)=>(
              <span key={obj} style={{fontSize:9,padding:'2px 7px',borderRadius:3,background:'rgba(255,34,68,0.1)',color:'#ff6680',border:'1px solid rgba(255,34,68,0.3)',fontFamily:"'Share Tech Mono'"}}>{obj}</span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AlertBanner:React.FC<{alerts:any[]}> = ({alerts}) => {
  const critical = alerts.filter(a=>a.risk_level==='Critical'||a.severity==='CRITICAL'||a.severity==='Critical');
  if(!critical.length) return null;
  return (
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
      style={{background:'rgba(255,23,68,0.06)',border:'1px solid rgba(255,23,68,0.4)',borderRadius:10,
      padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}>
      <span style={{fontSize:18}}>🚨</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:'#ff1744',fontFamily:"'Orbitron'"}}>CRITICAL ALERT</div>
        <div style={{fontSize:11,color:'#ff6680',marginTop:2}}>{critical[0]?.recommendation||critical[0]?.message||'Critical situation detected'}</div>
      </div>
      <span style={{fontSize:10,color:'#ff4466',fontFamily:"'Share Tech Mono'"}}>{critical.length} CRITICAL</span>
    </motion.div>
  );
};

const TRAIN_POSITIONS = [
  {id:'TRN-001',x:278,y:375},{id:'TRN-002',x:298,y:198},{id:'TRN-003',x:168,y:340},
  {id:'TRN-004',x:248,y:128},{id:'TRN-005',x:432,y:188},{id:'TRN-006',x:562,y:78},
];

const ControlRoom: React.FC = () => {
  const [trains, setTrains] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [mapTrains, setMapTrains] = useState<TrainPos[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const seenAlertIds = React.useRef<Set<string>>(new Set());
  const prevCriticalCount = React.useRef<number>(0);

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, pRes, sRes, aRes, oRes] = await Promise.allSettled([
        fetch(`${API}/trains/`).then(r=>r.json()),
        fetch(`${API}/platforms/`).then(r=>r.json()),
        fetch(`${API}/signals/`).then(r=>r.json()),
        fetch(`${API}/alerts/`).then(r=>r.json()),
        fetch(`${API}/trains/stats/summary`).then(r=>r.json()),
      ]);

      if(tRes.status==='fulfilled'){
        // ✅ FIX: use toArray() to safely extract array from any response shape
        const tList = toArray(tRes.value);
        setTrains(tList);
        setMapTrains(tList.map((t:any,i:number)=>{
          const pos = TRAIN_POSITIONS[i%TRAIN_POSITIONS.length];
          return {
            ...pos,
            train_id:t.train_id, train_name:t.train_name, train_number:t.train_number,
            x:pos.x+(Math.random()-0.5)*10, y:pos.y+(Math.random()-0.5)*10,
            color:RISK_COLOR[t.risk_level]||'#00d4ff', run_status:t.run_status,
            risk_level:t.risk_level, speed:t.speed, current_station:t.current_station,
            route:t.route, delay_minutes:t.delay_minutes,
          };
        }));

        // ✅ FIX: safe critical count with guaranteed array
        const critCount = tList.filter((t:any)=>t.risk_level==='Critical').length;
        if(critCount > prevCriticalCount.current && critCount > 0){
          voiceAlert.critical(
            `Warning! ${critCount} critical risk train${critCount>1?'s':''} detected. Immediate attention required.`,
            'ctrl_critical_trains'
          );
        }
        prevCriticalCount.current = critCount;
      }

      // ✅ FIX: toArray() on all responses — no more .filter is not a function
      if(pRes.status==='fulfilled') setPlatforms(toArray(pRes.value));
      if(sRes.status==='fulfilled') setSignals(toArray(sRes.value));

      if(aRes.status==='fulfilled'){
        const incomingAlerts = toArray(aRes.value);
        setAlerts(incomingAlerts);
        incomingAlerts.forEach((alert:any)=>{
          if(!seenAlertIds.current.has(alert.id)){
            seenAlertIds.current.add(alert.id);
            // ✅ FIX: normalize severity before passing to voiceAlert
            const safeSeverity = toVoiceSeverity(alert.severity || alert.risk_level || 'LOW');
            voiceAlert.speak(
              [alert.type, alert.message, alert.operator_action ? `Action: ${alert.operator_action}` : ''].filter(Boolean).join('. '),
              { severity: safeSeverity, id: alert.id }
            );
          }
        });
      }

      if(oRes.status==='fulfilled') setOverview(oRes.value);
      setLastRefresh(new Date());
    } catch(e){ console.error('fetchAll error:', e); }
  },[]);

  useEffect(()=>{
    fetchAll();
    const t = setInterval(fetchAll, 5000);
    return () => clearInterval(t);
  },[fetchAll]);

  const criticalCount = trains.filter(t=>t.risk_level==='Critical').length;
  const delayedCount  = trains.filter(t=>t.run_status==='delayed').length;
  const activeTrains  = trains.filter(t=>t.is_active).length;
  const greenSigs     = signals.filter(s=>s.status==='Green').length;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,minHeight:'100vh'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>
            RAILWAY CONTROL CENTER
          </h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3,letterSpacing:1}}>
            KARNATAKA STATE SMART RAILWAY — REAL-TIME OPERATIONS
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{fontSize:9,color:'#3a6a8a',fontFamily:"'Share Tech Mono'"}}>
            LAST SYNC: {lastRefresh.toLocaleTimeString()}
          </div>
          <button onClick={fetchAll} style={{padding:'6px 14px',borderRadius:7,background:'rgba(0,212,255,0.08)',border:'1px solid rgba(0,212,255,0.3)',color:'#00d4ff',cursor:'pointer',fontSize:11,fontFamily:"'Share Tech Mono'"}}>↺ REFRESH</button>
        </div>
      </div>

      {criticalCount > 0 && <AlertBanner alerts={trains.filter(t=>t.risk_level==='Critical')} />}

      {/* KPI Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
        <KpiCard label="Active Trains"  value={activeTrains}            color="#00d4ff"/>
        <KpiCard label="On Schedule"    value={activeTrains-delayedCount} color="#00ff88"/>
        <KpiCard label="Delayed"        value={delayedCount}             color="#ffd700" blink={delayedCount>0}/>
        <KpiCard label="Critical Alerts"value={criticalCount}            color="#ff1744" blink={criticalCount>0}/>
        <KpiCard label="Green Signals"  value={greenSigs}                color="#00e676"/>
        <KpiCard label="Platforms"      value={platforms.length}         color="#c084ff"/>
      </div>

      {/* Main 3-panel layout */}
      <div style={{display:'grid',gridTemplateColumns:'240px 1fr 260px',gap:12,flex:1}}>

        {/* LEFT: Train list */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:'8px 12px',fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",letterSpacing:1}}>
            ACTIVE TRAINS ({activeTrains})
          </div>
          <div style={{overflowY:'auto',flex:1,maxHeight:'70vh'}}>
            {trains.map(t=>(
              <TrainCard key={t.train_id} train={t} onSelect={setSelectedTrain} selected={selectedTrain?.train_id===t.train_id}/>
            ))}
            {!trains.length&&<div style={{color:'#2a5a8a',textAlign:'center',padding:30,fontSize:12}}>No train data</div>}
          </div>
        </div>

        {/* CENTER: Track Map */}
        <div style={{background:'#040a14',border:'1px solid #0d2040',borderRadius:12,overflow:'hidden',position:'relative',minHeight:480}}>
          <div style={{padding:'8px 14px',borderBottom:'1px solid #0d2040',background:'#060f1e',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:700,color:'#00d4ff',letterSpacing:1}}>🗺 LIVE TRACK MAP</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <motion.div animate={{opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}}
                style={{fontSize:9,color:'#ff2244',fontFamily:"'Share Tech Mono'"}}>● LIVE</motion.div>
              <span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{mapTrains.length} TRAINS</span>
            </div>
          </div>
          <div style={{height:'calc(100% - 38px)'}}>
            <TrackMap trains={mapTrains} onTrainClick={setSelectedTrain} signals={signals}/>
          </div>
        </div>

        {/* RIGHT: Detail / Signals / Platforms */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <AnimatePresence mode="wait">
            {selectedTrain ? (
              <TrainDetailPanel key="detail" train={selectedTrain} onClose={()=>setSelectedTrain(null)}/>
            ) : (
              <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}}
                style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:14}}>
                <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>NETWORK OVERVIEW</div>
                {[
                  ['Total Trains', overview?.total_trains||trains.length,                         '#00d4ff'],
                  ['Running',      overview?.running||trains.filter((t:any)=>t.run_status==='running').length, '#00ff88'],
                  ['Delayed',      overview?.delayed||delayedCount,                               '#ffd700'],
                  ['Stopped',      overview?.stopped||trains.filter((t:any)=>t.run_status==='stopped').length,'#ff1744'],
                ].map(([k,v,c])=>(
                  <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #0a1525'}}>
                    <span style={{fontSize:11,color:'#4a7a9a'}}>{k as string}</span>
                    <span style={{fontFamily:"'Share Tech Mono'",fontSize:14,fontWeight:700,color:c as string}}>{v as number}</span>
                  </div>
                ))}
                <div style={{marginTop:12,fontSize:9,color:'#1a4a6a',fontFamily:"'Share Tech Mono'"}}>Click a train to view details</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signal status */}
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:12}}>
            <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>SIGNAL STATUS</div>
            <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:140,overflowY:'auto'}}>
              {signals.slice(0,8).map(sig=>(
                <div key={sig.signal_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',background:'#04080f',borderRadius:6}}>
                  <span style={{fontSize:10,color:'#4a7a9a',fontFamily:"'Share Tech Mono'"}}>{sig.signal_id}</span>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:SIG_COLOR[sig.status]||'#888',display:'inline-block',boxShadow:`0 0 6px ${SIG_COLOR[sig.status]||'#888'}`}}/>
                    <span style={{fontSize:9,color:SIG_COLOR[sig.status]||'#888',fontFamily:"'Share Tech Mono'"}}>{sig.status}</span>
                  </div>
                </div>
              ))}
              {!signals.length&&<div style={{color:'#2a5a8a',fontSize:11,textAlign:'center',padding:10}}>No signal data</div>}
            </div>
          </div>

          {/* Platform occupancy */}
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:12,flex:1}}>
            <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>PLATFORM STATUS</div>
            <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:160,overflowY:'auto'}}>
              {platforms.slice(0,8).map(pf=>{
                const color = pf.status==='occupied'?'#00b0ff':pf.status==='available'?'#00e676':pf.status==='maintenance'?'#ffd700':'#c084ff';
                return (
                  <div key={pf.platform_id||pf.platform_number} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',background:'#04080f',borderRadius:6}}>
                    <span style={{fontSize:10,color:'#4a7a9a'}}>{pf.platform_id||pf.platform_number}</span>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {pf.current_occupancy!=null&&(
                        <span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{pf.current_occupancy}%</span>
                      )}
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background:`${color}12`,color,border:`1px solid ${color}30`,fontFamily:"'Share Tech Mono'"}}>{pf.status}</span>
                    </div>
                  </div>
                );
              })}
              {!platforms.length&&<div style={{color:'#2a5a8a',fontSize:11,textAlign:'center',padding:10}}>No platform data</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlRoom;