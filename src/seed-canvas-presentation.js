import {SEED_VISUAL_LANGUAGE,seedVisualEnabled,paintSeedContact} from './seed-visual-language.js';

// An authored sprite keeps its silhouette and pose. Lighting is baked once per
// atlas cell, never a live actor filter; the original image remains untouched.
export const SEED_CANVAS_LIGHT_CACHE_LIMIT=48;
export const SEED_CANVAS_LIGHT_TILE_LIMIT=256;
export const SEED_CANVAS_LIGHT_BAKES_PER_WINDOW=4;
export const SEED_CANVAS_LIGHT_BAKE_WINDOW_MS=16;
export function createSeedCanvasPaint({review=seedVisualEnabled(globalThis.location),reducedMotion=typeof globalThis.matchMedia==='function'?globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches:false,canvas=()=>document.createElement('canvas'),onCacheChange=()=>{},now=()=>performance.now()}={}){
 const tiles=new Map(),ids=new WeakMap();let nextId=0,disposed=false,oldest=null,newest=null,bytes=0,windowAt=-Infinity,windowBakes=0,bakes=0,deferred=0;
 const stats=()=>({enabled:review,tiles:tiles.size,bytes,limit:SEED_CANVAS_LIGHT_CACHE_LIMIT,bakes,deferred,disposed});
 if(review)onCacheChange(stats());
 function draw(ctx,image,sx,sy,sw,sh,dx,dy,dw,dh){
  if(!review||disposed||!(sw>0&&sh>0))return ctx.drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh);
  let id=ids.get(image);if(!id){id=++nextId;ids.set(image,id);}const key=`${id}:${sx}:${sy}:${sw}:${sh}`;let entry=tiles.get(key);
  if(!entry){
   const at=now();if(at-windowAt>=SEED_CANVAS_LIGHT_BAKE_WINDOW_MS||at<windowAt){windowAt=at;windowBakes=0;}
   // A crowd can request more unique poses than the cache can retain. Preserve
   // the exact authored draw while deferring shade work, rather than baking
   // every missing pose in a single frame. No extra timer or animation owner.
   if(windowBakes>=SEED_CANVAS_LIGHT_BAKES_PER_WINDOW){deferred++;return ctx.drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh);}
   windowBakes++;bakes++;
   const beforeCount=tiles.size,beforeBytes=bytes;
   // Recycle the least recently *drawn* tile. A busy scene with more than 48
   // poses still needs rebakes, but never creates an unbounded stream of DOM
   // canvases or identical gradients. A fixed linked order avoids Map churn
   // on a hit and temporary iterator arrays while finding an eviction victim.
   if(tiles.size>=SEED_CANVAS_LIGHT_CACHE_LIMIT){
    entry=oldest;tiles.delete(entry.key);oldest=entry.next;if(oldest)oldest.prev=null;else newest=null;entry.prev=entry.next=null;
    bytes-=entry.tile.width*entry.tile.height*4;
   }else{const tile=canvas();entry={tile,g:tile.getContext('2d'),light:null,key:null,prev:null,next:null};}
   const tile=entry.tile,g=entry.g,k=Math.min(1,SEED_CANVAS_LIGHT_TILE_LIMIT/Math.max(sw,sh)),width=Math.max(1,Math.round(sw*k)),height=Math.max(1,Math.round(sh*k));
   if(tile.width!==width||tile.height!==height){tile.width=width;tile.height=height;entry.light=null;}
   // Source-over transparent pixels do not erase an old pose in a recycled
   // backing store. Clear before copying, then restore the bake composite.
   g.clearRect(0,0,width,height);g.globalCompositeOperation='source-over';g.drawImage(image,sx,sy,sw,sh,0,0,width,height);
   if(!entry.light){const light=g.createLinearGradient(0,0,width,height);
    light.addColorStop(0,'#fff3c522');light.addColorStop(.36,'#fff4d00a');light.addColorStop(.72,'#1f3a2520');light.addColorStop(1,'#162c2b47');entry.light=light;}
   g.globalCompositeOperation='source-atop';g.fillStyle=entry.light;g.fillRect(0,0,width,height);
   entry.key=key;tiles.set(key,entry);bytes+=width*height*4;
   // Capacity diagnostics need no JSON/DOM update when an eviction keeps the
   // same cell count and byte size; stats() remains an immediate exact read.
   if(tiles.size!==beforeCount||bytes!==beforeBytes)onCacheChange(stats());
  }
  if(entry!==newest){
   if(entry.prev)entry.prev.next=entry.next;else if(oldest===entry)oldest=entry.next;
   if(entry.next)entry.next.prev=entry.prev;
   entry.prev=newest;entry.next=null;if(newest)newest.next=entry;else oldest=entry;newest=entry;
  }
  const tile=entry.tile;ctx.drawImage(tile,0,0,tile.width,tile.height,dx,dy,dw,dh);
 }
 function contact(ctx,x,y,size,options){if(!review||disposed)return false;paintSeedContact(ctx,x,y,size,options);return true;}
 function impact(ctx,x,y,size,progress,color=SEED_VISUAL_LANGUAGE.colors.gold){
  if(!review||disposed||!(size>0)||progress<0||progress>=1)return false;
  const a=1-progress,p=reducedMotion?.28:progress;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=color;ctx.lineWidth=Math.max(size*.055,.025);ctx.beginPath();ctx.ellipse(x,y,size*(.22+.56*p),size*(.12+.28*p),0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=SEED_VISUAL_LANGUAGE.colors.ivory;for(let i=0;i<4;i++){const angle=i*Math.PI/2+.6,d=size*(.12+p*.52);ctx.beginPath();ctx.ellipse(x+Math.cos(angle)*d,y+Math.sin(angle)*d*.76,size*.12*(reducedMotion?1:a),size*.035*(reducedMotion?1:a),angle,0,Math.PI*2);ctx.fill();}ctx.restore();return true;
 }
 return {review,draw,contact,impact,law:(law,fallback)=>review?SEED_VISUAL_LANGUAGE.laws[law]||fallback:fallback,
  stats,
  dispose(){if(disposed)return;disposed=true;for(const e of tiles.values()){e.tile.width=e.tile.height=0;e.light=null;e.prev=e.next=null;}tiles.clear();oldest=newest=null;bytes=0;if(review)onCacheChange(stats());}
 };
}

// Cached-floor-only ledges. These outlines do not foreshorten the simulation,
// pad centres or picking coordinates; the authored paving stays the top face.
export function paintSeedRaisedPath(ctx,path,assets={}){
 if(!Array.isArray(path)||path.length<2)return;
 const image=assets.flagstones?.naturalWidth?assets.flagstones:null;
 ctx.save();ctx.lineJoin='bevel';ctx.lineCap='butt';
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],length=Math.hypot(b.x-a.x,b.y-a.y),horizontal=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y),ux=(b.x-a.x)/length,uy=(b.y-a.y)/length;
  // Side faces stop before shared bends: no strip cuts over the next top face.
  const first=i?3.5:.2,last=length-(i<path.length-2?3.5:.2);
  for(let d=1;d<length;d+=5.25){
   const lo=Math.max(first,d-2.52),hi=Math.min(last,d+2.52);if(hi-lo<.5)continue;
   const index=Math.floor(d/5.25)+i*29,noise=Math.sin(index*12.93)*.12,drop=.58+(index%3)*.1;
   let points;
   if(horizontal){const x1=a.x+ux*lo,x2=a.x+ux*hi,y=a.y+3.22+noise;points=[[x1,y],[x2,y-noise*.3],[x2+.12,y+drop],[x1+.12,y+drop+.08]];}
   else{const y1=a.y+uy*lo,y2=a.y+uy*hi,x=a.x+3.04+noise;points=[[x,y1],[x,y2],[x+.5,y2+.28],[x+.5,y1+.28]];}
   const trace=(dx=0,dy=0)=>{ctx.beginPath();for(let j=0;j<points.length;j++)ctx[j?'lineTo':'moveTo'](points[j][0]+dx,points[j][1]+dy);ctx.closePath();};
   trace(.14,.21);ctx.fillStyle='#10251c40';ctx.fill();trace();ctx.fillStyle=index%2?'#84907a':'#788571';ctx.fill();
   if(image){
    const sw=image.width/2,sh=image.height/2,cell=index%4,x0=Math.min(...points.map(p=>p[0])),y0=Math.min(...points.map(p=>p[1])),w=Math.max(...points.map(p=>p[0]))-x0,h=Math.max(...points.map(p=>p[1]))-y0;
    ctx.save();trace();ctx.clip();ctx.drawImage(image,cell%2*sw+sw*.12,Math.floor(cell/2)*sh+sh*.61,sw*.76,sh*.28,x0,y0,w,h);ctx.fillStyle=horizontal?'#20362b43':'#1b302960';ctx.fillRect(x0,y0,w,h);ctx.restore();
   }
   trace();ctx.strokeStyle='#243a2942';ctx.lineWidth=.08;ctx.stroke();ctx.beginPath();ctx.moveTo(...points[0]);ctx.lineTo(...points[1]);ctx.strokeStyle='#dfe0bf67';ctx.lineWidth=.095;ctx.stroke();
  }
 }
 ctx.restore();
}
export function paintSeedBoardDepth(ctx,x,y,width,height,radius,depth){
 if(!(width>0&&height>0&&depth>0))return;
 ctx.save();ctx.fillStyle='#0c201ec7';ctx.beginPath();ctx.roundRect(x-2,y+depth*.6,width+4,height+depth,Math.max(2,radius));ctx.fill();
 ctx.fillStyle='#465d4c';ctx.beginPath();ctx.roundRect(x,y+depth*.35,width,height+depth*.65,Math.max(2,radius));ctx.fill();
 ctx.strokeStyle='#c7cbb083';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+radius,y+height+depth*.5);ctx.lineTo(x+width-radius,y+height+depth*.5);ctx.stroke();ctx.restore();
}
