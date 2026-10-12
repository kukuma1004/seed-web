// Presentation-only adapters: no timer/RAF, random source, particles or rule writes.
const SHOTS=Object.freeze({burst:'shotBurst',chain:'shotArc',frost:'shotFrost',gravity:'shotGravity',orbit:'shotOrbit',recall:'shotReturn',split:'shotPetal',pierce:'shotPierce',reflect:'shotCrystal'});
const CUES=Object.freeze({hit:{id:'pierceHit',gap:90,priority:0},bank:{id:'reflect',gap:150,priority:1},shatter:{id:'frostHit',gap:160,priority:2},chain:{id:'chain',gap:130,priority:2},burst:{id:'burstHit',gap:160,priority:2}});
export const BOUNCE_FEEDBACK_STYLES=Object.freeze({
 hit:Object.freeze({color:'#f4edc6',shape:'cross'}),bank:Object.freeze({color:'#a8efb4',shape:'diamond'}),
 shatter:Object.freeze({color:'#b7f4ff',shape:'shards'}),chain:Object.freeze({color:'#d4c3ff',shape:'zigzag'}),
 burst:Object.freeze({color:'#ffb36c',shape:'star'}),orbit:Object.freeze({color:'#bbeca6',shape:'petals'}),
 bloom:Object.freeze({color:'#e6e7ae',shape:'ring'})
});

// Call after launch, choose or each physics step, BEFORE showing a paused overlay.
// Drains run.events only. Does not alter run.effects, RNG, combat or counters.
export function createBounceFeedback(audio,{now=()=>performance.now()}={}){
 const last=new Map();let lastOrdinary=-Infinity;
 function cue(event,run){if(event.type==='launch')return{id:SHOTS[run.laws[0]]||'shotPierce',gap:90,priority:1};
  if(event.type==='boss')return{id:event.state==='defeat'?'bossDefeat':'bossWarning',gap:800,priority:3};
  if(event.type==='bank'&&!event.reflect)return null;return CUES[event.type]||null;}
 return {consume(run){if(!run?.events)return 0;const time=now();let played=0;
   // Two bounded scans choose important cues before ordinary impact spam.
   for(let pass=0;pass<2;pass++){let selected=null,selectedEvent=null;
    for(const event of run.events){const c=cue(event,run);if(!c||time-(last.get(c.id)??-Infinity)<c.gap||c.priority<3&&time-lastOrdinary<60)continue;
     if(!selected||c.priority>selected.priority){selected=c;selectedEvent=event;}}
    if(!selected)break;last.set(selected.id,time);if(selected.priority<3)lastOrdinary=time;
    audio?.play?.(selected.id);played++;if(selectedEvent.type==='boss')audio?.setScene?.(selectedEvent.state==='defeat'?'garden':'boss');
   }
   run.events.length=0;return played;
  },reset(){last.clear();lastOrdinary=-Infinity;}};
}

// Reuse the existing 48 pooled rule effects. Shape also identifies each law in
// monochrome; reduced-motion keeps compact static contact marks without pulses.
export function drawBounceEffect(g,fx,{point,scale,reducedMotion=false}){
 if(!fx?.active||fx.ttl<=0)return;const style=BOUNCE_FEEDBACK_STYLES[fx.type]||BOUNCE_FEEDBACK_STYLES.hit;
 const q=point(fx.x,fx.y),r=Math.max(3,(fx.r||.25)*scale),progress=Math.max(0,Math.min(1,1-fx.ttl/(fx.maxTtl||.32)));
 const radius=reducedMotion?Math.min(r,7):r*(.55+progress*.45);
 g.save();g.globalAlpha=reducedMotion?.65:Math.max(0,Math.min(.75,fx.ttl/.32));g.strokeStyle=style.color;g.lineWidth=fx.type==='shatter'?2.5:2;g.beginPath();
 if(style.shape==='zigzag'&&Number.isFinite(fx.x2)&&Number.isFinite(fx.y2)){
  const end=point(fx.x2,fx.y2),dx=end.x-q.x,dy=end.y-q.y,len=Math.hypot(dx,dy)||1,k=reducedMotion?0:Math.min(6,scale*.12);
  g.moveTo(q.x,q.y);g.lineTo(q.x+dx*.35-dy/len*k,q.y+dy*.35+dx/len*k);g.lineTo(q.x+dx*.65+dy/len*k,q.y+dy*.65-dx/len*k);g.lineTo(end.x,end.y);
 }else if(style.shape==='shards'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);g.moveTo(q.x+c*radius*.45,q.y+s*radius*.45);g.lineTo(q.x+c*radius,q.y+s*radius);}
 }else if(style.shape==='star'){
  for(let i=0;i<16;i++){const a=i*Math.PI/8,d=radius*(i%2?.55:1);g[i?'lineTo':'moveTo'](q.x+Math.cos(a)*d,q.y+Math.sin(a)*d);}g.closePath();
 }else if(style.shape==='diamond'){
  g.moveTo(q.x,q.y-radius);g.lineTo(q.x+radius,q.y);g.lineTo(q.x,q.y+radius);g.lineTo(q.x-radius,q.y);g.closePath();
 }else if(style.shape==='petals'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=q.x+Math.cos(a)*radius*.72,y=q.y+Math.sin(a)*radius*.72;g.moveTo(x+radius*.2,y);g.arc(x,y,radius*.2,0,Math.PI*2);}
 }else if(style.shape==='cross'){
  g.moveTo(q.x-radius,q.y);g.lineTo(q.x+radius,q.y);g.moveTo(q.x,q.y-radius);g.lineTo(q.x,q.y+radius);
 }else g.arc(q.x,q.y,radius,0,Math.PI*2);
 g.stroke();g.restore();
}
