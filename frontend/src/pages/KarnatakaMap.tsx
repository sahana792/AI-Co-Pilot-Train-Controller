import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const STATIONS = [
  {id:'SBC',name:'Bengaluru City',lat:12.977,lng:77.572,type:'major',trains:4},
  {id:'YPR',name:'Yeshwanthpur',lat:13.021,lng:77.548,type:'junction',trains:2},
  {id:'MYS',name:'Mysuru Junction',lat:12.295,lng:76.640,type:'major',trains:2},
  {id:'MAQ',name:'Mangaluru Central',lat:12.870,lng:74.843,type:'major',trains:1},
  {id:'UBL',name:'Hubballi Junction',lat:15.362,lng:75.124,type:'major',trains:2},
  {id:'BGM',name:'Belagavi',lat:15.853,lng:74.497,type:'major',trains:1},
  {id:'SMET',name:'Shivamogga',lat:13.930,lng:75.560,type:'junction',trains:1},
  {id:'BAY',name:'Ballari Junction',lat:15.139,lng:76.928,type:'junction',trains:1},
  {id:'GR',name:'Kalaburagi',lat:17.329,lng:76.820,type:'major',trains:1},
  {id:'TK',name:'Tumakuru',lat:13.342,lng:77.103,type:'normal',trains:1},
  {id:'DVG',name:'Davangere',lat:14.465,lng:75.919,type:'normal',trains:1},
  {id:'HAS',name:'Hassan',lat:13.003,lng:76.097,type:'normal',trains:1},
  {id:'RC',name:'Raichur',lat:16.212,lng:77.356,type:'junction',trains:1},
];

const LIVE_TRAINS = [
  {id:'T1',name:'Island Express',number:'16527',from:'SBC',to:'MYS',progress:0.35,speed:95,status:'running',risk:'Low'},
  {id:'T2',name:'Shatabdi Express',number:'12028',from:'SBC',to:'UBL',progress:0.55,speed:120,status:'delayed',risk:'Critical'},
  {id:'T3',name:'Rajya Rani',number:'16589',from:'SBC',to:'MAQ',progress:0.42,speed:85,status:'delayed',risk:'Medium'},
  {id:'T4',name:'Rani Chennamma',number:'11301',from:'SBC',to:'BGM',progress:0.28,speed:110,status:'running',risk:'Low'},
  {id:'T5',name:'Hampi Express',number:'16591',from:'SBC',to:'UBL',progress:0.68,speed:100,status:'running',risk:'Low'},
  {id:'T6',name:'Kalaburagi Exp',number:'17310',from:'SBC',to:'GR',progress:0.72,speed:88,status:'running',risk:'Medium'},
];

// Map lat/lng to SVG coordinates
const toSVG = (lat:number, lng:number) => {
  const minLat=11.5, maxLat=18.5, minLng=73.5, maxLng=78.5;
  const x = ((lng-minLng)/(maxLng-minLng))*700+30;
  const y = ((maxLat-lat)/(maxLat-minLat))*520+20;
  return {x,y};
};

const stationPos = Object.fromEntries(STATIONS.map(s=>[s.id,toSVG(s.lat,s.lng)]));

const ROUTES: [string,string][] = [
  ['SBC','YPR'],['SBC','MYS'],['MYS','HAS'],['HAS','MAQ'],['HAS','SMET'],['SMET','DVG'],
  ['DVG','UBL'],['UBL','BGM'],['SBC','TK'],['TK','DVG'],['SBC','BAY'],['BAY','RC'],['RC','GR'],
  ['SBC','YPR'],['YPR','SMET'],
];

// Interpolate position on route
const interpolate = (fromId:string, toId:string, t:number) => {
  const f = stationPos[fromId]; const to = stationPos[toId];
  if(!f||!to) return {x:350,y:280};
  return {x:f.x+(to.x-f.x)*t, y:f.y+(to.y-f.y)*t};
};

const RISK_COLOR: Record<string,string> = {Critical:'#ff2244',High:'#ff8c00',Medium:'#ffd700',Low:'#00ff88'};
const STATUS_COLOR: Record<string,string> = {running:'#00ff88',delayed:'#ffd700',stopped:'#ff1744'};

const KarnatakaMap: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [trainPositions, setTrainPositions] = useState(LIVE_TRAINS.map(t=>({...t,progress:t.progress})));
  const [heatmap, setHeatmap] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [alerts] = useState([
    {id:1,station:'SBC',type:'Crowd',msg:'High crowd density at PF-3',level:'High'},
    {id:2,station:'DVG',type:'Obstacle',msg:'Person detected on track',level:'Critical'},
    {id:3,station:'UBL',type:'Signal',msg:'Signal SIG-004 malfunction',level:'Medium'},
  ]);

  // Animate trains
  useEffect(()=>{
    const t = setInterval(()=>{
      setTrainPositions(prev=>prev.map(tr=>({
        ...tr,
        progress: tr.status==='running' ? (tr.progress+0.002)%1 : tr.progress
      })));
    }, 100);
    return ()=>clearInterval(t);
  },[]);

  const getTrainPos = (train:any) => interpolate(train.from, train.to, train.progress);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,height:'calc(100vh - 40px)'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>🗺 KARNATAKA RAILWAY MAP</h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>INTERACTIVE LIVE NETWORK VISUALIZATION</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {[['Heatmap',heatmap,()=>setHeatmap(!heatmap)],['Alerts',showAlerts,()=>setShowAlerts(!showAlerts)]].map(([label,active,toggle])=>(
            <button key={label as string} onClick={toggle as ()=>void} style={{padding:'6px 14px',borderRadius:7,background:(active as boolean)?'rgba(0,212,255,0.15)':'rgba(0,212,255,0.05)',border:`1px solid ${(active as boolean)?'rgba(0,212,255,0.5)':'rgba(0,212,255,0.2)'}`,color:(active as boolean)?'#00d4ff':'#4a7a9a',cursor:'pointer',fontSize:11,fontFamily:"'Share Tech Mono'"}}>
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12,flex:1,overflow:'hidden'}}>
        {/* MAP SVG */}
        <div style={{background:'#030810',border:'1px solid #0d2040',borderRadius:12,overflow:'hidden',position:'relative'}}>
          <svg viewBox="0 0 760 560" width="100%" height="100%" style={{fontFamily:"'Share Tech Mono',monospace"}}>
            <defs>
              <filter id="mapglow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <radialGradient id="heatRed" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ff2244" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient>
              <radialGradient id="heatAmber" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffd700" stopOpacity="0.25"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            </defs>

            {/* Background */}
            <rect width="760" height="560" fill="#030810"/>

            {/* Grid */}
            {Array.from({length:16},(_,i)=><line key={`h${i}`} x1="0" y1={i*37} x2="760" y2={i*37} stroke="#050d18" strokeWidth="1"/>)}
            {Array.from({length:21},(_,i)=><line key={`v${i}`} x1={i*37} y1="0" x2={i*37} y2="560" stroke="#050d18" strokeWidth="1"/>)}

            {/* Karnataka outline (simplified) */}
            <text x="360" y="540" textAnchor="middle" fill="#0d2040" fontSize="10">KARNATAKA</text>

            {/* Routes */}
            {ROUTES.map(([f,t],i)=>{
              const fp=stationPos[f]; const tp=stationPos[t];
              if(!fp||!tp) return null;
              return (
                <g key={i}>
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y} stroke="#0a2040" strokeWidth={4}/>
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y} stroke="#1a4a8a" strokeWidth={2} opacity={0.8}/>
                  <motion.line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y} stroke="#00d4ff" strokeWidth={0.8} opacity={0.2}
                    animate={{opacity:[0.1,0.35,0.1]}} transition={{duration:4+i*0.4,repeat:Infinity}}/>
                </g>
              );
            })}

            {/* Heatmap overlay */}
            {heatmap&&alerts.map(a=>{
              const st = STATIONS.find(s=>s.id===a.station);
              if(!st) return null;
              const pos = toSVG(st.lat,st.lng);
              return <circle key={a.id} cx={pos.x} cy={pos.y} r={50} fill={a.level==='Critical'?'url(#heatRed)':'url(#heatAmber)'}/>;
            })}

            {/* Alert indicators */}
            {showAlerts&&alerts.map(a=>{
              const st = STATIONS.find(s=>s.id===a.station);
              if(!st) return null;
              const pos = toSVG(st.lat,st.lng);
              const c = a.level==='Critical'?'#ff2244':a.level==='High'?'#ff8c00':'#ffd700';
              return (
                <motion.g key={a.id} animate={{y:[-3,0,-3]}} transition={{duration:2,repeat:Infinity}}>
                  <text x={pos.x} y={pos.y-28} textAnchor="middle" fontSize="14" style={{cursor:'pointer'}}
                    onClick={()=>setSelectedStation({...st,...a})}>⚠</text>
                  <motion.circle cx={pos.x} cy={pos.y-22} r={8} fill="none" stroke={c} strokeWidth={1}
                    animate={{r:[8,16,8],opacity:[0.8,0,0.8]}} transition={{duration:2,repeat:Infinity}}/>
                </motion.g>
              );
            })}

            {/* Stations */}
            {STATIONS.map(st=>{
              const pos = stationPos[st.id];
              const isMajor = st.type==='major';
              const r = isMajor?10:st.type==='junction'?8:5;
              const isSelected = selectedStation?.id===st.id;
              return (
                <g key={st.id} style={{cursor:'pointer'}} onClick={()=>setSelectedStation(isSelected?null:st)}>
                  {isMajor&&<motion.circle cx={pos.x} cy={pos.y} r={r+8} fill="#00d4ff06" stroke="#00d4ff30" strokeWidth={0.5}
                    animate={{r:[r+8,r+14,r+8]}} transition={{duration:3,repeat:Infinity}}/>}
                  {isSelected&&<circle cx={pos.x} cy={pos.y} r={r+12} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.5}/>}
                  <circle cx={pos.x} cy={pos.y} r={r} fill="#060f1e"
                    stroke={isMajor?'#00d4ff':st.type==='junction'?'#ffd700':'#2a5a8a'} strokeWidth={isMajor?2:1.5}
                    filter={isMajor||isSelected?"url(#mapglow)":undefined}/>
                  <circle cx={pos.x} cy={pos.y} r={isMajor?4:3} fill={isMajor?'#00d4ff':st.type==='junction'?'#ffd700':'#2a5a8a'}/>
                  <text x={pos.x} y={pos.y+r+12} textAnchor="middle" fill={isMajor?'#00d4ff':'#4a7a9a'} fontSize={isMajor?9:8} fontWeight={isMajor?700:400}>
                    {st.id}
                  </text>
                  {isMajor&&<text x={pos.x} y={pos.y+r+21} textAnchor="middle" fill="#2a5a8a" fontSize={7}>{st.name.split(' ')[0]}</text>}
                </g>
              );
            })}

            {/* Live trains */}
            {trainPositions.map(train=>{
              const pos = getTrainPos(train);
              const rc = RISK_COLOR[train.risk]||'#00d4ff';
              const sc = STATUS_COLOR[train.status]||'#00d4ff';
              return (
                <g key={train.id} style={{cursor:'pointer'}} onClick={()=>setSelectedTrain(selectedTrain?.id===train.id?null:train)}>
                  <motion.circle cx={pos.x} cy={pos.y} r={7} fill={rc+'20'} stroke={rc} strokeWidth={1.5}
                    animate={{r:[7,11,7]}} transition={{duration:2,repeat:Infinity}}/>
                  <circle cx={pos.x} cy={pos.y} r={4} fill={rc}/>
                  <motion.circle cx={pos.x} cy={pos.y} r={12} fill="none" stroke={rc} strokeWidth={0.5} opacity={0.3}
                    animate={{r:[12,20,12],opacity:[0.3,0,0.3]}} transition={{duration:2.5,repeat:Infinity}}/>
                  <text x={pos.x+10} y={pos.y-8} fill={rc} fontSize={8} style={{pointerEvents:'none'}}>{train.number}</text>
                  <text x={pos.x+10} y={pos.y+2} fill="#6a8aaa" fontSize={7} style={{pointerEvents:'none'}}>{train.speed}km/h</text>
                </g>
              );
            })}

            {/* Legend */}
            <rect x="10" y="10" width="160" height="70" rx="6" fill="#04080f" stroke="#0d2040" strokeWidth="1" opacity="0.9"/>
            <text x="20" y="26" fill="#2a5a8a" fontSize="8">LEGEND</text>
            {[['#00d4ff','Major Station'],['#ffd700','Junction'],['#ff2244','Critical Train'],['#00ff88','Normal Train']].map(([c,l],i)=>(
              <g key={l} transform={`translate(18,${35+i*14})`}>
                <circle cx="4" cy="0" r="3" fill={c}/>
                <text x="12" y="4" fill="#4a6a8a" fontSize="8">{l}</text>
              </g>
            ))}

            {/* Compass */}
            <text x="720" y="30" fill="#2a5a8a" fontSize="14">N</text>
            <line x1="728" y1="32" x2="728" y2="50" stroke="#1a4a8a" strokeWidth="1.5"/>
            <polygon points="728,32 724,45 728,42 732,45" fill="#00d4ff" opacity="0.8"/>
          </svg>
        </div>

        {/* RIGHT PANEL */}
        <div style={{display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>
          {/* Station info */}
          {selectedStation&&(
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
              style={{background:'#060f1e',border:'1px solid rgba(0,212,255,0.3)',borderRadius:10,padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:16,fontWeight:700,color:'#e0eaff'}}>{selectedStation.name}</div>
                  <div style={{fontFamily:"'Share Tech Mono'",fontSize:9,color:'#2a5a8a'}}>Code: {selectedStation.id||selectedStation.code}</div>
                </div>
                <button onClick={()=>setSelectedStation(null)} style={{background:'none',border:'none',color:'#4a6a8a',cursor:'pointer',fontSize:16}}>✕</button>
              </div>
              {[['Type',selectedStation.type||'Station'],['Lat',selectedStation.lat?.toFixed(3)],['Lng',selectedStation.lng?.toFixed(3)],['Trains',selectedStation.trains||0]].map(([k,v])=>(
                <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #0a1525',fontSize:11}}>
                  <span style={{color:'#4a7a9a'}}>{k as string}</span>
                  <span style={{fontFamily:"'Share Tech Mono'",color:'#00d4ff'}}>{String(v)}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Train info */}
          {selectedTrain&&(
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
              style={{background:'#060f1e',border:`1px solid ${RISK_COLOR[selectedTrain.risk]}40`,borderRadius:10,padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:15,fontWeight:700,color:'#e0eaff'}}>{selectedTrain.name}</div>
                  <div style={{fontFamily:"'Share Tech Mono'",fontSize:9,color:'#2a5a8a'}}>#{selectedTrain.number}</div>
                </div>
                <button onClick={()=>setSelectedTrain(null)} style={{background:'none',border:'none',color:'#4a6a8a',cursor:'pointer',fontSize:16}}>✕</button>
              </div>
              {[['Route',`${selectedTrain.from} → ${selectedTrain.to}`],['Speed',`${selectedTrain.speed} km/h`],['Status',selectedTrain.status],['Risk',selectedTrain.risk]].map(([k,v])=>{
                const c = k==='Risk'?RISK_COLOR[v as string]:k==='Status'?STATUS_COLOR[v as string]:'#00d4ff';
                return (
                  <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #0a1525',fontSize:11}}>
                    <span style={{color:'#4a7a9a'}}>{k as string}</span>
                    <span style={{fontFamily:"'Share Tech Mono'",color:c,fontWeight:700}}>{v as string}</span>
                  </div>
                );
              })}
              <div style={{marginTop:8}}>
                <div style={{fontSize:8,color:'#2a5a8a',marginBottom:5,fontFamily:"'Share Tech Mono'"}}>PROGRESS</div>
                <div style={{background:'#0a1525',borderRadius:4,height:6}}>
                  <motion.div style={{height:'100%',background:RISK_COLOR[selectedTrain.risk],borderRadius:4}}
                    animate={{width:`${selectedTrain.progress*100}%`}} transition={{duration:0.5}}/>
                </div>
              </div>
            </motion.div>
          )}

          {/* Alert list */}
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:12}}>
            <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>ACTIVE ALERTS ({alerts.length})</div>
            {alerts.map(a=>{
              const c = a.level==='Critical'?'#ff2244':a.level==='High'?'#ff8c00':'#ffd700';
              return (
                <motion.div key={a.id} initial={{opacity:0}} animate={{opacity:1}}
                  style={{borderLeft:`3px solid ${c}`,background:`${c}06`,border:`1px solid ${c}20`,borderRadius:7,padding:'8px 10px',marginBottom:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background:`${c}15`,color:c,border:`1px solid ${c}30`,fontFamily:"'Share Tech Mono'"}}>{a.level}</span>
                    <span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{a.station}</span>
                  </div>
                  <div style={{fontSize:11,color:'#c0d4e8',fontWeight:600}}>{a.msg}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Live train list */}
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:12}}>
            <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>LIVE TRAINS ({LIVE_TRAINS.length})</div>
            {LIVE_TRAINS.map(t=>{
              const c = RISK_COLOR[t.risk]||'#00d4ff';
              const sc = STATUS_COLOR[t.status]||'#00d4ff';
              return (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #0a1525'}}>
                  <div>
                    <div style={{fontSize:11,color:'#c0d4e8',fontWeight:600}}>{t.name}</div>
                    <div style={{fontSize:9,color:'#4a7a9a',fontFamily:"'Share Tech Mono'"}}>{t.from}→{t.to} · {t.speed}km/h</div>
                  </div>
                  <div style={{display:'flex',gap:5}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:sc,display:'inline-block',boxShadow:`0 0 5px ${sc}`,marginTop:2}}/>
                    <span style={{fontSize:8,color:c,fontFamily:"'Share Tech Mono'"}}>{t.risk}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default KarnatakaMap;
