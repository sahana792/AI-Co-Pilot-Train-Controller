import React, { useState } from 'react';
import { motion } from 'framer-motion';
import voiceAlert from '../services/voiceAlert';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const DelayPrediction: React.FC = () => {
  const [form, setForm] = useState({ speed:90,distance:150,weather:'Clear',signal_status:'Green',congestion_level:'Low',previous_delay:0,detected_risk_count:0 });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const set = (k:string,v:any) => setForm(p=>({...p,[k]:v}));

  const predict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ml/predict-delay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data = await res.json();
      setResult(data);
      // 🔊 Announce prediction
      const delay = data.predicted_delay_minutes ?? 0;
      const risk  = data.risk_level || (delay > 20 ? 'High' : delay > 10 ? 'Medium' : 'Low');
      if (delay > 20) voiceAlert.high(`Delay prediction: ${Math.round(delay)} minutes expected. Risk ${risk}. Consider rerouting.`,'delay_pred_api');
      else if (delay > 5) voiceAlert.medium(`Delay of ${Math.round(delay)} minutes predicted.`,'delay_pred_minor');
      else voiceAlert.info('No significant delay expected. Train on schedule.','delay_pred_ok');
    } catch {
      // Simulation
      const base = form.previous_delay + (form.congestion_level==='High'?8:form.congestion_level==='Medium'?4:1) + (form.weather!=='Clear'?5:0) + form.detected_risk_count*3;
      setResult({ predicted_delay_minutes: Math.max(0,base+(Math.random()-0.3)*5), confidence:0.75+Math.random()*0.2, recommendation:'Reduce speed at next junction. Alert station control for platform clearance.', reasons:[{factor:'Weather',impact:form.weather!=='Clear'?4:0},{factor:'Congestion',impact:form.congestion_level==='High'?8:4},{factor:'Signal',impact:form.signal_status==='Red'?10:0},{factor:'Speed',impact:form.speed>120?3:0},{factor:'Previous Delay',impact:form.previous_delay}] });
      // 🔊 Announce simulated result
      const sDelay = form.previous_delay + (form.congestion_level==='High'?8:form.congestion_level==='Medium'?4:1) + (form.weather!=='Clear'?5:0) + form.detected_risk_count*3;
      if(sDelay>15) voiceAlert.high(`Delay prediction: ${Math.round(Math.max(0,sDelay))} minute delay expected. Review train operations.`,'sim_delay_high');
      else if(sDelay>5) voiceAlert.medium(`Minor delay of ${Math.round(Math.max(0,sDelay))} minutes predicted.`,'sim_delay_med');
      else voiceAlert.info('Prediction complete. Train expected on schedule.','sim_delay_ok');
    }
    setLoading(false);
  };

  const delayColor = (m:number) => m>15?'#ff2244':m>8?'#ff8c00':m>3?'#ffd700':'#00ff88';
  const dc = result ? delayColor(result.predicted_delay_minutes) : '#00d4ff';

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{paddingBottom:12,borderBottom:'1px solid #0d2040'}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,fontWeight:700,color:'#e0eaff',letterSpacing:2,margin:0}}>◷ DELAY PREDICTION</h1>
        <div style={{fontSize:9,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",marginTop:3}}>AI-POWERED ARRIVAL TIME PREDICTION ENGINE</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'380px 1fr',gap:16}}>
        {/* Input form */}
        <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,fontFamily:"'Share Tech Mono'"}}>INPUT PARAMETERS</div>

          {[{k:'speed',label:'Train Speed (km/h)',type:'range',min:0,max:200,step:5},
            {k:'distance',label:'Distance to Destination (km)',type:'range',min:10,max:600,step:10},
            {k:'previous_delay',label:'Previous Delay (min)',type:'range',min:0,max:60,step:1},
            {k:'detected_risk_count',label:'Detected Risks',type:'range',min:0,max:10,step:1},
          ].map(({k,label,min,max,step})=>(
            <div key={k}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <span style={{fontSize:10,color:'#4a7a9a',fontFamily:"'Share Tech Mono'"}}>{label}</span>
                <span style={{fontSize:13,color:'#00d4ff',fontFamily:"'Orbitron'",fontWeight:700}}>{(form as any)[k]}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={(form as any)[k]} onChange={e=>set(k,+e.target.value)} style={{width:'100%',accentColor:'#00d4ff',height:4}}/>
            </div>
          ))}

          {[{k:'weather',label:'Weather',opts:['Clear','Rain','Fog','Snow','Storm']},
            {k:'signal_status',label:'Signal Status',opts:['Green','Yellow','Red']},
            {k:'congestion_level',label:'Congestion Level',opts:['Low','Medium','High']},
          ].map(({k,label,opts})=>(
            <div key={k}>
              <div style={{fontSize:10,color:'#4a7a9a',marginBottom:7,fontFamily:"'Share Tech Mono'"}}>{label}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {opts.map(o=>{
                  const active=(form as any)[k]===o;
                  const c=k==='signal_status'?{Green:'#00e676',Yellow:'#ffd600',Red:'#ff1744'}[o]||'#00d4ff':'#00d4ff';
                  return <button key={o} onClick={()=>set(k,o)} style={{padding:'5px 12px',borderRadius:6,background:active?`${c}18`:'transparent',border:`1px solid ${active?c:'#1a3a5a'}`,color:active?c:'#4a7a9a',cursor:'pointer',fontSize:11,fontFamily:"'Share Tech Mono'",transition:'all 0.15s'}}>{o}</button>;
                })}
              </div>
            </div>
          ))}

          <motion.button whileTap={{scale:0.97}} onClick={predict} disabled={loading}
            style={{padding:'13px',borderRadius:10,background:loading?'#0a1525':'rgba(0,212,255,0.12)',border:`1px solid ${loading?'#1a3a5a':'rgba(0,212,255,0.4)'}`,color:loading?'#2a5a8a':'#00d4ff',cursor:loading?'not-allowed':'pointer',fontSize:14,fontFamily:"'Orbitron'",fontWeight:700,letterSpacing:1,marginTop:4}}>
            {loading?'⟳ COMPUTING…':'▶ PREDICT DELAY'}
          </motion.button>
        </div>

        {/* Result panel */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {result ? (
            <>
              <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
                style={{background:'#060f1e',border:`1px solid ${dc}40`,borderRadius:12,padding:24,textAlign:'center',boxShadow:`0 0 40px ${dc}12`}}>
                <div style={{fontSize:10,color:'#2a5a8a',letterSpacing:2,fontFamily:"'Share Tech Mono'",marginBottom:10}}>PREDICTED DELAY</div>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:72,fontWeight:900,color:dc,lineHeight:1,textShadow:`0 0 30px ${dc}60`,animation:result.predicted_delay_minutes>15?'blink 2s infinite':'none'}}>
                  {result.predicted_delay_minutes>0?'+':''}{result.predicted_delay_minutes.toFixed(1)}
                  <span style={{fontSize:24,marginLeft:6}}>min</span>
                </div>
                <div style={{marginTop:14,fontSize:13,color:'#00d4ff',fontFamily:"'Share Tech Mono'",opacity:0.8}}>
                  Confidence: {(result.confidence*100).toFixed(1)}%
                </div>
                <div style={{marginTop:16,background:`${dc}08`,border:`1px solid ${dc}20`,borderRadius:10,padding:'12px 16px',textAlign:'left'}}>
                  <div style={{fontSize:9,color:'#2a5a8a',marginBottom:6,letterSpacing:1,fontFamily:"'Share Tech Mono'"}}>AI RECOMMENDATION</div>
                  <div style={{fontSize:12,color:'#c0d4e8',lineHeight:1.6}}>{result.recommendation}</div>
                </div>
              </motion.div>

              {/* Radar chart of factors */}
              <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:16}}>
                <div style={{fontSize:9,color:'#2a5a8a',letterSpacing:1,marginBottom:12,fontFamily:"'Share Tech Mono'"}}>DELAY FACTOR ANALYSIS</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={result.reasons||[]}>
                      <PolarGrid stroke="#0d2040"/>
                      <PolarAngleAxis dataKey="factor" tick={{fill:'#4a7a9a',fontSize:10}}/>
                      <Radar dataKey="impact" stroke={dc} fill={dc} fillOpacity={0.2} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={result.reasons||[]} layout="vertical">
                      <XAxis type="number" hide domain={[0,'auto']}/>
                      <YAxis type="category" dataKey="factor" tick={{fill:'#4a7a9a',fontSize:10}} axisLine={false} tickLine={false} width={80}/>
                      <Tooltip contentStyle={{background:'#0a1525',border:'1px solid #1a3a6a',borderRadius:8,fontSize:11,color:'#e0eaff'}}/>
                      <Bar dataKey="impact" radius={[0,4,4,0]}>
                        {(result.reasons||[]).map((_:any,i:number)=><Cell key={i} fill={[dc,'#c084ff','#00d4ff','#ffd700','#00ff88'][i%5]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div style={{background:'#060f1e',border:'1px solid #0d2040',borderRadius:12,padding:40,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:16}}>
              <div style={{fontSize:64,opacity:0.2}}>◷</div>
              <div style={{fontSize:14,color:'#2a5a8a',fontFamily:"'Share Tech Mono'",textAlign:'center'}}>Configure parameters and click<br/>PREDICT DELAY to run AI analysis</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%',maxWidth:340}}>
                {['Weather Impact','Signal Delays','Congestion','Track Risk'].map(f=>(
                  <div key={f} style={{background:'#040c18',border:'1px solid #0d2040',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:'#1a4a8a',display:'inline-block'}}/>
                    <span style={{fontSize:10,color:'#2a5a8a',fontFamily:"'Share Tech Mono'"}}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DelayPrediction;
