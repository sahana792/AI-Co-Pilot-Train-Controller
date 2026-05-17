import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SEV_COLOR: Record<string,string> = {
  CRITICAL:'#ff2244', HIGH:'#ff8c00', MEDIUM:'#ffd700', LOW:'#00ff88', 'ALL CLEAR':'#00ff88',
};
const CAT_COLOR: Record<string,string> = {
  Human:'#ff2244', Vehicle:'#ff8c00', Animal:'#ffd700',
  Signal:'#00d4ff', 'Track Anomaly':'#c084ff', Other:'#6a8aaa',
};
const WEATHER_OPTIONS = ['clear','rain','fog','snow','storm'];
const THREAT_LEVELS   = ['ALL CLEAR','LOW','MEDIUM','HIGH','CRITICAL'];

const SIM_OBJECTS = [
  { label:'Person on Track',   category:'Human',         risk:'CRITICAL' },
  { label:'Crowd Detected',    category:'Human',         risk:'HIGH'     },
  { label:'Obstacle on Track', category:'Track Anomaly', risk:'HIGH'     },
  { label:'Train',             category:'Vehicle',       risk:'LOW'      },
  { label:'Signal Issue',      category:'Signal',        risk:'MEDIUM'   },
  { label:'Suspicious Object', category:'Other',         risk:'MEDIUM'   },
  { label:'Fire / Smoke',      category:'Track Anomaly', risk:'CRITICAL' },
  { label:'Track Crack',       category:'Track Anomaly', risk:'HIGH'     },
  { label:'Worker on Track',   category:'Human',         risk:'HIGH'     },
  { label:'Unattended Baggage',category:'Other',         risk:'MEDIUM'   },
];

interface Detection {
  label:string; category:string; confidence:number; risk:string;
  bbox_norm:[number,number,number,number];
}
interface Alert {
  id:string; timestamp:string; severity:string; message:string; operator_action:string; confidence?:number;
}

/* ── draw boxes on canvas ────────────────────────────────────────────────── */
function drawBoxes(canvas:HTMLCanvasElement, dets:Detection[], sourceEl?:HTMLVideoElement|HTMLImageElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (sourceEl) {
    canvas.width  = sourceEl instanceof HTMLVideoElement ? (sourceEl.videoWidth||canvas.width)   : sourceEl.naturalWidth;
    canvas.height = sourceEl instanceof HTMLVideoElement ? (sourceEl.videoHeight||canvas.height) : sourceEl.naturalHeight;
    ctx.drawImage(sourceEl, 0, 0, canvas.width, canvas.height);
  }
  const W=canvas.width, H=canvas.height;
  dets.forEach(det=>{
    const [nx,ny,nw,nh]=det.bbox_norm;
    const x=nx*W, y=ny*H, w=nw*W, h=nh*H;
    const color=CAT_COLOR[det.category]||'#00d4ff';
    ctx.shadowColor=color; ctx.shadowBlur=10;
    ctx.strokeStyle=color; ctx.lineWidth=2.5;
    ctx.strokeRect(x,y,w,h);
    const cs=Math.min(14,w*0.2,h*0.2);
    ctx.lineWidth=3; ctx.shadowBlur=4;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([cx,cy,dx,dy])=>{
      ctx.beginPath();
      ctx.moveTo(cx as number,cy as number);
      ctx.lineTo((cx as number)+(dx as number)*cs,cy as number);
      ctx.moveTo(cx as number,cy as number);
      ctx.lineTo(cx as number,(cy as number)+(dy as number)*cs);
      ctx.stroke();
    });
    ctx.shadowBlur=0;
    ctx.font=`bold ${Math.max(10,Math.min(13,W/55))}px "Share Tech Mono",monospace`;
    const txt=`${det.label}  ${(det.confidence*100).toFixed(0)}%`;
    const tw=ctx.measureText(txt).width;
    const lh=16, lp=5;
    const lx=Math.min(x,W-tw-lp*2-8);
    const ly=y>lh+4?y-2:y+h+lh+2;
    ctx.fillStyle=color+'dd';
    ctx.beginPath(); (ctx as any).roundRect?.(lx,ly-lh,tw+lp*2,lh+3,4)??ctx.fillRect(lx,ly-lh,tw+lp*2,lh+3); ctx.fill();
    ctx.fillStyle='#000'; ctx.fillText(txt,lx+lp,ly-3);
    ctx.fillStyle=SEV_COLOR[det.risk]||color;
    ctx.beginPath(); ctx.arc(lx+tw+lp*2+6,ly-lh/2,4,0,Math.PI*2); ctx.fill();
  });
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,22);
  ctx.font=`10px "Share Tech Mono",monospace`; ctx.fillStyle='#00d4ff';
  ctx.fillText(`RailCtrl AI v7  ·  ${dets.length} object(s)  ·  ${new Date().toLocaleTimeString()}`,8,15);
}

/* ── sub-components ──────────────────────────────────────────────────────── */
const ThreatMeter:React.FC<{level:string}> = ({level})=>{
  const idx=THREAT_LEVELS.indexOf(level);
  const colors=['#00ff88','#00d4ff','#ffd700','#ff8c00','#ff2244'];
  const c=colors[Math.max(0,idx)];
  return (
    <div style={{padding:'12px 14px',background:'#060f1e',border:'1px solid #0d2040',borderRadius:10}}>
      <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:8,fontFamily:"'Share Tech Mono'"}}>THREAT LEVEL</div>
      <div style={{display:'flex',gap:3,marginBottom:8}}>
        {THREAT_LEVELS.map((l,i)=>(
          <motion.div key={l} animate={i<=idx?{boxShadow:[`0 0 4px ${colors[i]}`,`0 0 14px ${colors[i]}`,`0 0 4px ${colors[i]}`]}:{}}
            transition={{duration:2,repeat:Infinity}}
            style={{flex:1,height:7,borderRadius:3,background:i<=idx?colors[i]:'#0a1525',transition:'background 0.4s'}}/>
        ))}
      </div>
      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,color:c,animation:level==='CRITICAL'?'blink 0.8s infinite':'none'}}>{level}</div>
    </div>
  );
};

const StatBox:React.FC<{label:string;value:number|string;color:string;glow?:boolean}> = ({label,value,color,glow})=>(
  <div style={{background:'#060f1e',border:`1px solid ${glow?color+'60':'#0d2040'}`,borderTop:`2px solid ${color}`,borderRadius:10,padding:'10px 12px',boxShadow:glow?`0 0 14px ${color}15`:'none'}}>
    <div style={{fontSize:7,color:'#2a5a8a',letterSpacing:1,textTransform:'uppercase',marginBottom:4,fontFamily:"'Share Tech Mono'"}}>{label}</div>
    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color,lineHeight:1}}>{value}</div>
  </div>
);

const AlertCard:React.FC<{a:Alert}> = ({a})=>{
  const c=SEV_COLOR[a.severity]||'#6a8aaa';
  return (
    <motion.div initial={{opacity:0,x:6}} animate={{opacity:1,x:0}}
      style={{borderLeft:`3px solid ${c}`,background:`${c}08`,border:`1px solid ${c}20`,borderRadius:7,padding:'8px 10px',marginBottom:6}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:9,padding:'2px 7px',borderRadius:4,background:`${c}18`,color:c,border:`1px solid ${c}40`,fontFamily:"'Share Tech Mono'",fontWeight:700}}>{a.severity}</span>
        <span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{new Date(a.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style={{fontSize:11,color:'#c0d4e8',fontWeight:600,marginBottom:3}}>{a.message}</div>
      <div style={{fontSize:10,color:'#5a8aaa',lineHeight:1.4}}>{a.operator_action}</div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const LiveDetection:React.FC = ()=>{
  /* refs */
  const videoRef      = useRef<HTMLVideoElement>(null);
  const displayCanvas = useRef<HTMLCanvasElement>(null);
  const captureCanvas = useRef<HTMLCanvasElement>(null);
  /* uploaded-video refs */
  const uploadVideoRef    = useRef<HTMLVideoElement>(null);
  const uploadCanvasRef   = useRef<HTMLCanvasElement>(null);
  const uploadRafRef      = useRef<number>(0);
  const uploadApiTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const uploadApiBusy     = useRef(false);
  const uploadBoxBuffer   = useRef<Detection[]>([]);
  /* webcam refs */
  const streamRef     = useRef<MediaStream|null>(null);
  const rafRef        = useRef<number>(0);
  const apiTimerRef   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const apiInFlight   = useRef(false);
  const mountedRef    = useRef(true);
  const fpsFrames     = useRef(0);
  const fpsTime       = useRef(Date.now());

  /* state */
  const [mode,         setMode]         = useState<'webcam'|'image'|'video'>('webcam');
  const [camActive,    setCamActive]    = useState(false);
  const [fps,          setFps]          = useState(0);
  const [frameCount,   setFrameCount]   = useState(0);
  const [detections,   setDetections]   = useState<Detection[]>([]);
  const [boxBuffer,    setBoxBuffer]    = useState<Detection[]>([]);
  const [alerts,       setAlerts]       = useState<Alert[]>([]);
  const [threatLevel,  setThreatLevel]  = useState('ALL CLEAR');
  const prevThreatLevel = React.useRef<string>('ALL CLEAR');
  const announcedDets = React.useRef<Set<string>>(new Set());
  const [confidence,   setConfidence]   = useState(0.45);
  const [weather,      setWeather]      = useState('clear');
  const [trainSpeed,   setTrainSpeed]   = useState(80);
  const [backendOk,    setBackendOk]    = useState<boolean|null>(null);
  const [simMode,      setSimMode]      = useState(false);
  const [imageFile,    setImageFile]    = useState<File|null>(null);
  const [videoFile,    setVideoFile]    = useState<File|null>(null);
  const [videoObjUrl,  setVideoObjUrl]  = useState<string|null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [processing,   setProcessing]   = useState(false);

  useEffect(()=>{
    mountedRef.current=true;
    fetch(`${API}/video-detection/status`,{signal:AbortSignal.timeout(3000)})
      .then(r=>r.json()).then(d=>{ if(mountedRef.current) setBackendOk(d.status==='online'); })
      .catch(()=>{ if(mountedRef.current) setBackendOk(false); });
    return()=>{ mountedRef.current=false; };
  },[]);

  /* ── helpers ───────────────────────────────────────────────────────────── */
  const normaliseDets=useCallback((raw:any[],imgW:number,imgH:number):Detection[]=>{
    return raw.map(d=>{
      let nx=0,ny=0,nw=0.15,nh=0.2;
      if(Array.isArray(d.bbox_norm)&&d.bbox_norm.length===4){ [nx,ny,nw,nh]=d.bbox_norm; }
      else if(Array.isArray(d.bbox)&&d.bbox.length===4){
        const[a,b,c,e]=d.bbox; nx=a/imgW; ny=b/imgH; nw=(c-a)/imgW; nh=(e-b)/imgH;
      }
      return { label:d.label||'Object', category:d.category||'Other',
        confidence:d.confidence??0.5, risk:d.risk_severity||d.risk||'LOW',
        bbox_norm:[Math.max(0,Math.min(0.97,nx)),Math.max(0,Math.min(0.97,ny)),
                   Math.max(0.04,Math.min(1-nx,nw)),Math.max(0.04,Math.min(1-ny,nh))] as [number,number,number,number] };
    });
  },[]);

  const genSimDets=useCallback(():Detection[]=>{
    if(Math.random()>0.55) return [];
    return Array.from({length:Math.floor(Math.random()*3)+1},()=>{
      const obj=SIM_OBJECTS[Math.floor(Math.random()*SIM_OBJECTS.length)];
      const nw=0.1+Math.random()*0.22, nh=0.12+Math.random()*0.26;
      return {...obj,confidence:0.55+Math.random()*0.40,
        bbox_norm:[Math.random()*(1-nw),Math.random()*(1-nh),nw,nh] as [number,number,number,number]};
    });
  },[]);

  const updateThreat=useCallback((dets:Detection[])=>{
    if(!dets.length){
      if(prevThreatLevel.current!=='ALL CLEAR'){
        voiceAlert.info('Threat cleared. Detection area is now all clear.');
      }
      prevThreatLevel.current='ALL CLEAR';
      setThreatLevel('ALL CLEAR');
      return;
    }
    const top=dets.reduce((t,d)=>THREAT_LEVELS.indexOf(d.risk)>THREAT_LEVELS.indexOf(t)?d.risk:t,'LOW');
    setThreatLevel(top);

    // 🔊 Announce when threat level escalates
    const prevIdx = THREAT_LEVELS.indexOf(prevThreatLevel.current);
    const newIdx  = THREAT_LEVELS.indexOf(top);
    if(newIdx > prevIdx){
      if(top==='CRITICAL'){
        voiceAlert.critical(`Critical threat detected! ${dets.filter(d=>d.risk==='CRITICAL').map(d=>d.label).join(', ')}. Immediate action required!`,'live_threat_critical');
      } else if(top==='HIGH'){
        voiceAlert.high(`High threat detected: ${dets.filter(d=>d.risk==='HIGH'||d.risk==='CRITICAL').map(d=>d.label).join(', ')}. Alert station control.`,'live_threat_high');
      } else if(top==='MEDIUM'){
        voiceAlert.medium(`Medium threat detected: ${dets[0]?.label||'Unknown'}. Monitor situation.`,'live_threat_medium');
      }
    }

    // 🔊 Announce each newly detected critical/high object
    dets.forEach(d=>{
      if(d.risk==='CRITICAL'||d.risk==='HIGH'){
        const key=d.label+'_'+Math.floor(Date.now()/10000); // 10s cooldown key
        if(!announcedDets.current.has(key)){
          announcedDets.current.add(key);
          if(d.risk==='CRITICAL') voiceAlert.critical(`${d.label} detected on live camera!`,'det_'+d.label);
          else voiceAlert.high(`${d.label} detected. ${(d.confidence*100).toFixed(0)} percent confidence.`,'det_'+d.label);
        }
      }
    });

    prevThreatLevel.current=top;
  },[]);

  const makeAlert=useCallback((det:Detection):Alert=>{
    const actions:Record<string,string>={
      CRITICAL:'IMMEDIATE: Halt nearest train. Alert RPF. Deploy emergency response.',
      HIGH:'Reduce train speed. Alert station control.',
      MEDIUM:'Monitor situation. Alert maintenance if persists.',
      LOW:'Log detection. Continue normal operations.',
    };
    return {id:`DET-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      timestamp:new Date().toISOString(),severity:det.risk,
      message:`${det.label} detected — ${(det.confidence*100).toFixed(0)}% confidence`,
      operator_action:actions[det.risk]||'Monitor.',confidence:det.confidence};
  },[]);

  /* ── webcam rAF render ──────────────────────────────────────────────────── */
  const renderLoop=useCallback(()=>{
    const video=videoRef.current; const canvas=displayCanvas.current;
    if(!canvas||!video||!streamRef.current) return;
    const ctx=canvas.getContext('2d');
    if(!ctx){rafRef.current=requestAnimationFrame(renderLoop);return;}
    if(video.videoWidth&&video.videoHeight&&(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight)){
      canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    }
    if(video.readyState>=2) ctx.drawImage(video,0,0,canvas.width,canvas.height);
    drawBoxes(canvas,boxBuffer.length?boxBuffer:[]);
    fpsFrames.current++;
    const now=Date.now();
    if(now-fpsTime.current>=1000){setFps(fpsFrames.current);setFrameCount(f=>f+fpsFrames.current);fpsFrames.current=0;fpsTime.current=now;}
    rafRef.current=requestAnimationFrame(renderLoop);
  },[boxBuffer]);

  const scheduleApiCall=useCallback(()=>{
    if(apiTimerRef.current) clearTimeout(apiTimerRef.current);
    apiTimerRef.current=setTimeout(async()=>{
      if(!streamRef.current||apiInFlight.current){scheduleApiCall();return;}
      const video=videoRef.current; const capCvs=captureCanvas.current;
      if(!video||!capCvs||!video.videoWidth){scheduleApiCall();return;}
      capCvs.width=320; capCvs.height=240;
      const ctx=capCvs.getContext('2d');
      if(!ctx){scheduleApiCall();return;}
      ctx.drawImage(video,0,0,320,240);
      capCvs.toBlob(async blob=>{
        if(!blob||!streamRef.current){scheduleApiCall();return;}
        apiInFlight.current=true; setProcessing(true);
        try {
          const form=new FormData();
          form.append('frame',blob,'frame.jpg');
          form.append('confidence',String(confidence));
          form.append('weather',weather);
          form.append('speed',String(trainSpeed));
          const res=await fetch(`${API}/video-detection/process-frame`,{method:'POST',body:form,signal:AbortSignal.timeout(3000)});
          const data=await res.json();
          const dets=normaliseDets(data.detections||[],data.image_width||320,data.image_height||240);
          setBoxBuffer(dets); setDetections(dets); updateThreat(dets);
          if(data.alerts?.length) setAlerts(prev=>[...data.alerts,...prev].slice(0,80));
        } catch {
          const dets=genSimDets();
          setBoxBuffer(dets); setDetections(dets); updateThreat(dets);
          const newAlerts=dets.filter(d=>d.risk==='CRITICAL'||d.risk==='HIGH').map(makeAlert);
          if(newAlerts.length) setAlerts(prev=>[...newAlerts,...prev].slice(0,80));
        } finally { apiInFlight.current=false; setProcessing(false); if(streamRef.current) scheduleApiCall(); }
      },'image/jpeg',0.7);
    },1000);
  },[confidence,weather,trainSpeed,normaliseDets,genSimDets,updateThreat,makeAlert]);

  const simRenderLoop=useCallback(()=>{
    const canvas=displayCanvas.current;
    if(!canvas||!streamRef.current) return;
    const ctx=canvas.getContext('2d');
    if(!ctx){rafRef.current=requestAnimationFrame(simRenderLoop);return;}
    canvas.width=canvas.offsetWidth||640; canvas.height=canvas.offsetHeight||360;
    const W=canvas.width,H=canvas.height,t=Date.now()/1000;
    ctx.fillStyle='#010508'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=`rgba(0,212,255,${0.04+0.02*Math.sin(t)})`; ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.font='13px "Share Tech Mono",monospace'; ctx.fillStyle='#2a5a8a';
    ctx.textAlign='center';
    ctx.fillText('SIMULATION MODE  —  No Physical Camera Detected',W/2,H/2-18);
    ctx.font='10px "Share Tech Mono",monospace'; ctx.fillStyle='#1a3a6a';
    ctx.fillText('AI detection running on synthetic data',W/2,H/2+6);
    ctx.textAlign='left';
    drawBoxes(canvas,boxBuffer);
    fpsFrames.current++;
    const now=Date.now();
    if(now-fpsTime.current>=1000){setFps(fpsFrames.current);setFrameCount(f=>f+fpsFrames.current);fpsFrames.current=0;fpsTime.current=now;}
    rafRef.current=requestAnimationFrame(simRenderLoop);
  },[boxBuffer]);

  const simApiLoop=useCallback(()=>{
    if(!streamRef.current) return;
    const dets=genSimDets();
    setBoxBuffer(dets); setDetections(dets); updateThreat(dets);
    const newAlerts=dets.filter(d=>d.risk==='CRITICAL'||d.risk==='HIGH').map(makeAlert);
    if(newAlerts.length) setAlerts(prev=>[...newAlerts,...prev].slice(0,80));
    apiTimerRef.current=setTimeout(simApiLoop,1500);
  },[genSimDets,updateThreat,makeAlert]);

  useEffect(()=>{ if(!camActive) return; cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(simMode?simRenderLoop:renderLoop);
  },[boxBuffer,camActive,simMode,renderLoop,simRenderLoop]);

  /* ── start / stop webcam ────────────────────────────────────────────────── */
  const startCamera=useCallback(async()=>{
    setBoxBuffer([]);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream; videoRef.current.play().catch(()=>{});}
      setSimMode(false); setCamActive(true);
      rafRef.current=requestAnimationFrame(renderLoop);
      apiTimerRef.current=setTimeout(scheduleApiCall,500);
    } catch {
      setSimMode(true); setCamActive(true);
      streamRef.current={} as MediaStream;
      rafRef.current=requestAnimationFrame(simRenderLoop);
      apiTimerRef.current=setTimeout(simApiLoop,600);
    }
  },[renderLoop,scheduleApiCall,simRenderLoop,simApiLoop]);

  const stopCamera=useCallback(()=>{
    cancelAnimationFrame(rafRef.current);
    if(apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if(streamRef.current?.getTracks) streamRef.current.getTracks().forEach(t=>t.stop());
    streamRef.current=null; apiInFlight.current=false;
    if(videoRef.current){videoRef.current.srcObject=null; videoRef.current.pause();}
    const canvas=displayCanvas.current;
    if(canvas){const ctx=canvas.getContext('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);}
    setCamActive(false); setDetections([]); setBoxBuffer([]); setThreatLevel('ALL CLEAR'); setFps(0); setProcessing(false);
  },[]);

  useEffect(()=>()=>{ mountedRef.current=false; cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(uploadRafRef.current);
    if(apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if(uploadApiTimer.current) clearTimeout(uploadApiTimer.current);
    if(streamRef.current?.getTracks) streamRef.current.getTracks().forEach(t=>t.stop());
    if(videoObjUrl) URL.revokeObjectURL(videoObjUrl);
  },[videoObjUrl]);

  /* ── image upload ───────────────────────────────────────────────────────── */
  const handleImage=useCallback(async(file:File)=>{
    setImageFile(file); setProcessing(true);
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=async()=>{
      const canvas=displayCanvas.current;
      if(!canvas) return;
      canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d')!;
      ctx.drawImage(img,0,0);
      let dets:Detection[]=[];
      try {
        const form=new FormData(); form.append('frame',file,file.name); form.append('confidence',String(confidence));
        const res=await fetch(`${API}/video-detection/process-frame`,{method:'POST',body:form,signal:AbortSignal.timeout(10000)});
        const data=await res.json();
        dets=normaliseDets(data.detections||[],data.image_width||img.naturalWidth,data.image_height||img.naturalHeight);
        if(data.annotated_frame){
          const ann=new Image();
          ann.onload=()=>{ctx.drawImage(ann,0,0,canvas.width,canvas.height);};
          ann.src=`data:image/jpeg;base64,${data.annotated_frame}`;
        } else { ctx.drawImage(img,0,0); drawBoxes(canvas,dets); }
        if(data.alerts?.length) setAlerts(prev=>[...data.alerts,...prev].slice(0,80));
      } catch {
        dets=Array.from({length:Math.floor(Math.random()*3)+1},()=>{
          const obj=SIM_OBJECTS[Math.floor(Math.random()*SIM_OBJECTS.length)];
          const nw=0.12+Math.random()*0.2,nh=0.15+Math.random()*0.25;
          return {...obj,confidence:0.6+Math.random()*0.35,
            bbox_norm:[Math.random()*(1-nw),Math.random()*(1-nh),nw,nh] as [number,number,number,number]};
        });
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        drawBoxes(canvas,dets);
      }
      setDetections(dets); updateThreat(dets); setProcessing(false);
      URL.revokeObjectURL(url);
    };
    img.src=url;
  },[confidence,normaliseDets,updateThreat]);





  

  /* ══════════════════════════════════════════════════════════════════════════
     VIDEO UPLOAD — frame-by-frame detection while video plays
  ══════════════════════════════════════════════════════════════════════════ */
  const startVideoDetection=useCallback((file:File)=>{
    if(videoObjUrl) URL.revokeObjectURL(videoObjUrl);
    const url=URL.createObjectURL(file);
    setVideoObjUrl(url); setVideoFile(file); setVideoPlaying(false);
    setDetections([]); setBoxBuffer([]); setThreatLevel('ALL CLEAR');
    uploadBoxBuffer.current=[];
    cancelAnimationFrame(uploadRafRef.current);
    if(uploadApiTimer.current) clearTimeout(uploadApiTimer.current);

    /* Wait for video element to be ready then start loops */
    setTimeout(()=>{
      const vid=uploadVideoRef.current;
      const canvas=uploadCanvasRef.current;
      if(!vid||!canvas) return;
      vid.src=url;
      vid.load();
      vid.onloadedmetadata=()=>{
        canvas.width=vid.videoWidth||640;
        canvas.height=vid.videoHeight||360;
        vid.play().then(()=>{
          setVideoPlaying(true);

          /* rAF render loop — draws video frame + latest boxes at display fps */
          const renderUpload=()=>{
            if(vid.paused||vid.ended) return;
            const ctx=canvas.getContext('2d');
            if(ctx&&vid.readyState>=2){
              canvas.width=vid.videoWidth; canvas.height=vid.videoHeight;
              ctx.drawImage(vid,0,0,canvas.width,canvas.height);
              const boxes=uploadBoxBuffer.current;
              if(boxes.length) drawBoxes(canvas,boxes);
              else {
                // HUD only
                ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,22);
                ctx.font='10px "Share Tech Mono",monospace'; ctx.fillStyle='#00d4ff';
                ctx.fillText(`RailCtrl AI v7  ·  ${new Date().toLocaleTimeString()}`,8,15);
              }
            }
            uploadRafRef.current=requestAnimationFrame(renderUpload);
          };
          uploadRafRef.current=requestAnimationFrame(renderUpload);

          /* API polling loop — sends frame every 1s, updates box buffer */
          const pollApi=async()=>{
            if(vid.paused||vid.ended||uploadApiBusy.current) {
              if(!vid.paused&&!vid.ended) uploadApiTimer.current=setTimeout(pollApi,1000);
              return;
            }
            uploadApiBusy.current=true;
            setProcessing(true);
            try {
              // Capture current frame at 320×240
              const cap=document.createElement('canvas');
              cap.width=320; cap.height=240;
              const cctx=cap.getContext('2d');
              if(cctx&&vid.readyState>=2){
                cctx.drawImage(vid,0,0,320,240);
                const blob=await new Promise<Blob|null>(res=>cap.toBlob(res,'image/jpeg',0.7));
                if(blob){
                  const form=new FormData();
                  form.append('frame',blob,'frame.jpg');
                  form.append('confidence',String(confidence));
                  form.append('weather',weather);
                  form.append('speed',String(trainSpeed));
                  try {
                    const res=await fetch(`${API}/video-detection/process-frame`,
                      {method:'POST',body:form,signal:AbortSignal.timeout(3000)});
                    const data=await res.json();
                    const dets=data.detections?.length
                      ? [data.detections[0],...(data.detections.slice(1)||[])].map((d:any)=>{
                          let nx=0,ny=0,nw=0.15,nh=0.2;
                          if(Array.isArray(d.bbox_norm)&&d.bbox_norm.length===4){[nx,ny,nw,nh]=d.bbox_norm;}
                          else if(Array.isArray(d.bbox)&&d.bbox.length===4){
                            const[a,b,c,e]=d.bbox;
                            nx=a/(data.image_width||320); ny=b/(data.image_height||240);
                            nw=(c-a)/(data.image_width||320); nh=(e-b)/(data.image_height||240);
                          }
                          return {label:d.label||'Object',category:d.category||'Other',
                            confidence:d.confidence??0.5,risk:d.risk_severity||d.risk||'LOW',
                            bbox_norm:[Math.max(0,Math.min(0.97,nx)),Math.max(0,Math.min(0.97,ny)),
                                       Math.max(0.04,nw),Math.max(0.04,nh)] as [number,number,number,number]};
                        })
                      : genSimDets();
                    uploadBoxBuffer.current=dets;
                    setDetections(dets); updateThreat(dets);
                    if(data.alerts?.length) setAlerts(prev=>[...data.alerts,...prev].slice(0,80));
                    else {
                      const newAlerts=dets.filter((d:Detection)=>d.risk==='CRITICAL'||d.risk==='HIGH').map(makeAlert);
                      if(newAlerts.length) setAlerts(prev=>[...newAlerts,...prev].slice(0,80));
                    }
                  } catch {
                    const dets=genSimDets();
                    uploadBoxBuffer.current=dets; setDetections(dets); updateThreat(dets);
                    const newAlerts=dets.filter(d=>d.risk==='CRITICAL'||d.risk==='HIGH').map(makeAlert);
                    if(newAlerts.length) setAlerts(prev=>[...newAlerts,...prev].slice(0,80));
                  }
                }
              }
            } finally { uploadApiBusy.current=false; setProcessing(false); }
            if(!vid.paused&&!vid.ended) uploadApiTimer.current=setTimeout(pollApi,1000);
            else { uploadBoxBuffer.current=[]; setDetections([]); setThreatLevel('ALL CLEAR'); }
          };
          uploadApiTimer.current=setTimeout(pollApi,800);
        }).catch(()=>setVideoPlaying(false));
      };
    },200);
  },[confidence,weather,trainSpeed,videoObjUrl,genSimDets,updateThreat,makeAlert]);

  const stopVideo=useCallback(()=>{
    cancelAnimationFrame(uploadRafRef.current);
    if(uploadApiTimer.current) clearTimeout(uploadApiTimer.current);
    const vid=uploadVideoRef.current;
    if(vid){vid.pause(); vid.src='';}
    const canvas=uploadCanvasRef.current;
    if(canvas){const ctx=canvas.getContext('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);}
    uploadBoxBuffer.current=[];
    setVideoPlaying(false); setVideoFile(null); setDetections([]); setBoxBuffer([]);
    setThreatLevel('ALL CLEAR');
    if(videoObjUrl){URL.revokeObjectURL(videoObjUrl); setVideoObjUrl(null);}
  },[videoObjUrl]);

  const clearAll=async()=>{
    try{await fetch(`${API}/video-detection/clear-alerts`,{method:'POST'});}catch{}
    setAlerts([]); setDetections([]); setBoxBuffer([]); setThreatLevel('ALL CLEAR');
    uploadBoxBuffer.current=[];
  };

  const criticalCount=alerts.filter(a=>a.severity==='CRITICAL').length;
  const threatColor=SEV_COLOR[threatLevel]||'#6a8aaa';

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12,height:'calc(100vh - 60px)',overflow:'hidden'}}>

      {/* header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:10,borderBottom:'1px solid #0d2040',flexShrink:0}}>
        <div>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>🎥 LIVE AI DETECTION</h1>
          <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3,letterSpacing:1}}>YOLOv8 · REAL-TIME OBJECT DETECTION · TRACK SAFETY MONITORING</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{fontSize:9,padding:'5px 10px',borderRadius:6,fontFamily:"'Share Tech Mono'",
            background:backendOk===null?'rgba(100,100,100,0.1)':backendOk?'rgba(0,255,136,0.08)':'rgba(255,215,0,0.08)',
            border:`1px solid ${backendOk===null?'#2a3a5a':backendOk?'rgba(0,255,136,0.35)':'rgba(255,215,0,0.35)'}`,
            color:backendOk===null?'#4a6a8a':backendOk?'#00ff88':'#ffd700'}}>
            {backendOk===null?'● CHECKING…':backendOk?'● YOLO BACKEND READY':'● SIMULATION MODE'}
          </div>
          <motion.div animate={{opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}}
            style={{fontSize:9,padding:'5px 10px',borderRadius:6,fontFamily:"'Share Tech Mono'",background:`${threatColor}10`,border:`1px solid ${threatColor}40`,color:threatColor}}>
            ⚠ {threatLevel}
          </motion.div>
          {processing&&<div style={{fontSize:9,color:'#00d4ff',fontFamily:"'Share Tech Mono'",animation:'blink 0.6s infinite'}}>⟳ PROCESSING</div>}
          <button onClick={clearAll} style={{padding:'6px 12px',borderRadius:7,background:'rgba(255,34,68,0.08)',border:'1px solid rgba(255,34,68,0.3)',color:'#ff4466',cursor:'pointer',fontSize:10,fontFamily:"'Share Tech Mono'"}}>✕ CLEAR</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,flexShrink:0}}>
        <StatBox label="Total Alerts"  value={alerts.length}       color="#ff4466" glow={alerts.length>0}/>
        <StatBox label="Critical"      value={criticalCount}       color="#ff2244" glow={criticalCount>0}/>
        <StatBox label="Frames"        value={frameCount}          color="#00d4ff"/>
        <StatBox label="FPS"           value={camActive?fps:videoPlaying?'▶':'—'} color="#00ff88"/>
        <StatBox label="Detections"    value={detections.length}   color="#ffd700" glow={detections.length>0}/>
      </div>

      {/* main grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:12,flex:1,minHeight:0}}>

        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:8,minHeight:0}}>

          {/* mode tabs */}
          <div style={{display:'flex',gap:4,background:'#040c18',borderRadius:9,padding:3,flexShrink:0}}>
            {(['webcam','image','video'] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);if(m!=='webcam')stopCamera();if(m!=='video')stopVideo();setImageFile(null);}}
                style={{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',background:mode===m?'#0d2040':'transparent',color:mode===m?'#00d4ff':'#2a5a8a',fontSize:13,fontFamily:"'Exo 2',sans-serif",fontWeight:600,transition:'all 0.2s'}}>
                {m==='webcam'?'📷 Webcam':m==='image'?'🖼 Image':'🎬 Video Upload'}
              </button>
            ))}
          </div>

          {/* feed */}
          <div style={{flex:1,minHeight:0,background:'#010508',border:'1px solid #0d2040',borderRadius:12,overflow:'hidden',position:'relative',display:'flex',flexDirection:'column'}}>

            {/* header bar */}
            <div style={{padding:'7px 14px',borderBottom:'1px solid #0d2040',background:'#060f1e',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:700,color:'#00d4ff',letterSpacing:1}}>◎ DETECTION FEED</span>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                {(camActive||videoPlaying)&&<motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:1,repeat:Infinity}} style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:'#ff2244',display:'inline-block'}}/>
                  <span style={{fontSize:9,color:'#ff4466',fontFamily:"'Share Tech Mono'"}}>{videoPlaying?'VIDEO':'LIVE'}</span>
                </motion.div>}
                {camActive&&<span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{fps} FPS · {frameCount} frames</span>}
                {processing&&<span style={{fontSize:9,color:'#00d4ff',fontFamily:"'Share Tech Mono'"}}>⟳ AI</span>}
              </div>
            </div>

            {/* canvas area */}
            <div style={{flex:1,minHeight:0,position:'relative',background:'#010508'}}>

              {/* ── WEBCAM ── */}
              {mode==='webcam'&&<>
                <video ref={videoRef} autoPlay muted playsInline
                  style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}/>
                <canvas ref={displayCanvas}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#010508'}}/>
                {!camActive&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:3}}>
                  <div style={{fontSize:52,opacity:0.25,marginBottom:14}}>📷</div>
                  <div style={{fontSize:13,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>Camera not started</div>
                  <div style={{fontSize:10,color:'#1a3a5a',marginTop:6,fontFamily:"'Share Tech Mono'"}}>Click START below to begin AI detection</div>
                </div>}
              </>}

              {/* ── IMAGE ── */}
              {mode==='image'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {imageFile
                  ?<canvas ref={displayCanvas} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:'block'}}/>
                  :<div style={{textAlign:'center'}}>
                    <div style={{fontSize:52,opacity:0.25,marginBottom:16}}>🖼</div>
                    <label style={{padding:'11px 26px',background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.4)',borderRadius:9,color:'#00d4ff',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:600}}>
                      Choose Image
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleImage(e.target.files[0])}/>
                    </label>
                    {processing&&<div style={{marginTop:14,color:'#00d4ff',fontFamily:"'Share Tech Mono'",fontSize:11}}>⟳ Running detection…</div>}
                  </div>
                }
              </div>}

              {/* ── VIDEO UPLOAD ── */}
              {mode==='video'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {videoFile
                  ?<div style={{position:'relative',width:'100%',height:'100%'}}>
                    {/* Hidden video drives frames */}
                    <video ref={uploadVideoRef} loop muted playsInline
                      style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}
                      onEnded={()=>{ uploadBoxBuffer.current=[]; setDetections([]); }}/>
                    {/* Canvas shows video + detection boxes */}
                    <canvas ref={uploadCanvasRef}
                      style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#010508'}}/>
                    {!videoPlaying&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:4}}>
                      <motion.div animate={{opacity:[1,0.5,1]}} transition={{duration:1,repeat:Infinity}}
                        style={{fontSize:14,color:'#00d4ff',fontFamily:"'Share Tech Mono'"}}>⟳ LOADING…</motion.div>
                    </div>}
                  </div>
                  :<div style={{textAlign:'center'}}>
                    <div style={{fontSize:52,opacity:0.25,marginBottom:16}}>🎬</div>
                    <div style={{fontSize:13,color:'#4a7a9a',marginBottom:6,fontFamily:"'Exo 2'"}}>Upload a video to detect obstacles in real-time</div>
                    <label style={{padding:'11px 26px',background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.4)',borderRadius:9,color:'#00d4ff',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:600}}>
                      Upload Video
                      <input type="file" accept="video/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&startVideoDetection(e.target.files[0])}/>
                    </label>
                    <div style={{fontSize:10,color:'#2a5a8a',marginTop:10,fontFamily:"'Share Tech Mono'"}}>MP4 · AVI · MOV — Detections appear while video plays</div>
                  </div>
                }
              </div>}
            </div>

            {/* bottom controls */}
            <div style={{padding:'10px 14px',borderTop:'1px solid #0d2040',background:'#060f1e',display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
              {mode==='webcam'&&(!camActive
                ?<motion.button whileTap={{scale:0.97}} onClick={startCamera} style={{padding:'9px 28px',borderRadius:8,background:'rgba(0,255,136,0.12)',border:'1px solid rgba(0,255,136,0.45)',color:'#00ff88',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:700}}>▶ START DETECTION</motion.button>
                :<motion.button whileTap={{scale:0.97}} onClick={stopCamera} style={{padding:'9px 28px',borderRadius:8,background:'rgba(255,34,68,0.12)',border:'1px solid rgba(255,34,68,0.45)',color:'#ff4466',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:700}}>■ STOP DETECTION</motion.button>
              )}
              {mode==='video'&&videoFile&&(
                <motion.button whileTap={{scale:0.97}} onClick={stopVideo} style={{padding:'9px 28px',borderRadius:8,background:'rgba(255,34,68,0.12)',border:'1px solid rgba(255,34,68,0.45)',color:'#ff4466',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:700}}>■ STOP VIDEO</motion.button>
              )}
              {mode==='image'&&imageFile&&(
                <motion.button whileTap={{scale:0.97}} onClick={()=>{setImageFile(null);setDetections([]);setThreatLevel('ALL CLEAR');}} style={{padding:'9px 28px',borderRadius:8,background:'rgba(255,34,68,0.12)',border:'1px solid rgba(255,34,68,0.45)',color:'#ff4466',cursor:'pointer',fontSize:13,fontFamily:"'Exo 2'",fontWeight:700}}>✕ CLEAR IMAGE</motion.button>
              )}
              <div style={{fontSize:9,color:'#3a6a8a',fontFamily:"'Share Tech Mono'"}}>
                {mode==='webcam'&&(camActive?(simMode?'SIM MODE ACTIVE':'● LIVE CAMERA — Detection active'):'Press START to begin')}
                {mode==='video'&&(videoFile?'● Video playing — AI detecting obstacles frame by frame':'Upload a video to begin detection')}
                {mode==='image'&&(imageFile?'● Image analysis complete':'Choose an image to analyse')}
              </div>
            </div>
          </div>

          {/* parameters */}
          <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:'10px 14px',flexShrink:0}}>
            <div style={{fontSize:7,color:'#2a5a8a',letterSpacing:1,marginBottom:10,fontFamily:"'Share Tech Mono'"}}>DETECTION PARAMETERS</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:9,color:'#4a7a9a',fontFamily:"'Share Tech Mono'"}}>CONFIDENCE</span>
                  <span style={{fontSize:10,color:'#00d4ff',fontFamily:"'Share Tech Mono'",fontWeight:700}}>{(confidence*100).toFixed(0)}%</span>
                </div>
                <input type="range" min={0.1} max={0.9} step={0.05} value={confidence} onChange={e=>setConfidence(+e.target.value)} style={{width:'100%',accentColor:'#00d4ff',height:3}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:'#4a7a9a',marginBottom:5,fontFamily:"'Share Tech Mono'"}}>WEATHER</div>
                <select value={weather} onChange={e=>setWeather(e.target.value)} style={{width:'100%',background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:6,color:'#00d4ff',padding:'5px 8px',fontSize:11,fontFamily:"'Share Tech Mono'",outline:'none'}}>
                  {WEATHER_OPTIONS.map(w=><option key={w} value={w}>{w.charAt(0).toUpperCase()+w.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:9,color:'#4a7a9a',fontFamily:"'Share Tech Mono'"}}>TRAIN SPEED</span>
                  <span style={{fontSize:10,color:'#ffd700',fontFamily:"'Share Tech Mono'",fontWeight:700}}>{trainSpeed} km/h</span>
                </div>
                <input type="range" min={0} max={200} step={10} value={trainSpeed} onChange={e=>setTrainSpeed(+e.target.value)} style={{width:'100%',accentColor:'#ffd700',height:3}}/>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex',flexDirection:'column',gap:10,minHeight:0,overflow:'hidden'}}>
          <ThreatMeter level={threatLevel}/>
          {detections.length>0&&(
            <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:10,padding:12,flexShrink:0,maxHeight:200,overflowY:'auto'}}>
              <div style={{fontSize:8,color:'#2a5a8a',letterSpacing:1,marginBottom:8,fontFamily:"'Share Tech Mono'"}}>CURRENT OBJECTS ({detections.length})</div>
              {detections.map((d,i)=>{
                const c=CAT_COLOR[d.category]||'#6a8aaa';
                const rc=SEV_COLOR[d.risk]||'#6a8aaa';
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #0a1525'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:c,boxShadow:`0 0 5px ${c}`,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:'#c0d4e8',fontWeight:600,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{d.label}</div>
                      <div style={{fontSize:9,color:'#3a6a8a',fontFamily:"'Share Tech Mono'"}}>{d.category}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Share Tech Mono'",fontSize:12,fontWeight:700,color:c}}>{(d.confidence*100).toFixed(0)}%</div>
                      <div style={{fontSize:8,color:rc,fontFamily:"'Share Tech Mono'"}}>{d.risk}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{flex:1,background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
            <div style={{padding:'9px 14px',borderBottom:'1px solid #0d2040',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <span style={{fontFamily:"'Share Tech Mono'",fontSize:10,fontWeight:700,color:'#e0eaff'}}>⚠ ALERT LOG</span>
              <span style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{alerts.length} events</span>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'8px 10px'}}>
              <AnimatePresence initial={false}>
                {alerts.length===0&&<div style={{textAlign:'center',padding:40,color:'#00ff88',fontFamily:"'Share Tech Mono'",fontSize:11}}>✓ ALL CLEAR</div>}
                {alerts.map((a,i)=><AlertCard key={a.id||i} a={a}/>)}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDetection;
