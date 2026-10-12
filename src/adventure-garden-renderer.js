import {GARDEN_OBJECT_ART} from './garden-theme-art.js';

const SETS=['greenhouse','blossom','moon'];
const BEDS=['#263e25','#324933','#202d3d'];
const LANDMARK={glasshouse:'유리 온실 화단','fern-bed':'몬스테라','flower-bed':'벚꽃 화단','cherry-grove':'벚나무(대)','root-arch':'달의 아치','silver-grove':'달빛 나무(대)'};
// One atlas, device-sized cached patterns, no animated water or shadow filters.
export function createAdventureGardenPainter(ctx,assets,shapeOf){
 const patterns=new Map();let actCache=-1;
 function pattern(cell,tile,v){
  const im=assets.garden;if(!im?.complete||!im.naturalWidth)return null;
  if(actCache!==v.act){patterns.clear();actCache=v.act;}
  const px=Math.max(32,Math.min(768,Math.round(tile*v.scale*v.dpr))),key=cell+':'+px;
  let p=patterns.get(key);
  if(!p){const c=document.createElement('canvas');c.width=c.height=px;const g=c.getContext('2d'),half=im.naturalWidth/2;
   g.drawImage(im,cell%2*half,Math.floor(cell/2)*half,half,half,0,0,px,px);p=ctx.createPattern(c,'repeat');
   for(const old of patterns.keys())if(old.startsWith(cell+':'))patterns.delete(old);
   patterns.set(key,p);
  }
  p?.setTransform?.(new DOMMatrix([1,0,0,1,Math.round(v.ox*v.dpr),Math.round(v.oy*v.dpr)]));return p;
 }
 function worldShape(shape,v){const out=new Path2D();out.addPath(shape,new DOMMatrix([v.scale*v.dpr,0,0,v.scale*v.dpr,Math.round(v.ox*v.dpr),Math.round(v.oy*v.dpr)]));return out;}
 function promenades(R){if(R._gardenPaths)return R._gardenPaths;const lines=new Path2D(),courts=new Path2D();
  for(const q of R.paths){const dx=q.bx-q.ax,dy=q.by-q.ay,l=Math.hypot(dx,dy)||1;lines.moveTo(q.ax,q.ay);lines.quadraticCurveTo((q.ax+q.bx)/2-dy/l*.45,(q.ay+q.by)/2+dx/l*.45,q.bx,q.by);}
  for(const n of R.nodes)if(['start','gate','raid','altar'].includes(n.role)){courts.moveTo(n.x+2.5,n.y);courts.arc(n.x,n.y,2.5,0,Math.PI*2);}
  return R._gardenPaths={lines,courts};
 }
 function region(R,v){
  const outline=worldShape(shapeOf(R),v),road=promenades(R);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=BEDS[v.act];ctx.fillRect(0,0,v.width*v.dpr,v.height*v.dpr);
  const grass=pattern(0,10,v);if(grass){ctx.fillStyle=grass;ctx.globalAlpha=.42;ctx.fillRect(0,0,v.width*v.dpr,v.height*v.dpr);ctx.globalAlpha=1;ctx.fill(outline);}
  ctx.fillStyle=pattern(v.act===2?2:1,7,v)||'#aeb8a0';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2.2*v.scale*v.dpr;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(worldShape(road.lines,v));ctx.fill(worldShape(road.courts,v));
  for(const m of R.landmarks||[])if(m.kind==='pond'){
   const pond=new Path2D();pond.ellipse(m.x,m.y,m.size,m.size*.8,0,0,Math.PI*2);const p=worldShape(pond,v);
   ctx.fillStyle=pattern(3,5,v)||'#2c6670';ctx.fill(p);ctx.strokeStyle='#b8bb8c';ctx.lineWidth=.15*v.scale*v.dpr;ctx.stroke(p);
  }
  ctx.restore();
 }
 function arena(v){
  const im=assets.arena;if(im?.complete&&im.naturalWidth){ctx.drawImage(im,v.ox-3*v.scale,v.oy-3*v.scale,30*v.scale,21*v.scale);return;}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=pattern(0,10,v)||BEDS[v.act];ctx.fillRect(0,0,v.width*v.dpr,v.height*v.dpr);
  const court=new Path2D();court.moveTo(4.4,1.9);court.lineTo(19.6,1.9);court.quadraticCurveTo(22.7,1.9,22.7,5);court.lineTo(22.7,11.4);court.quadraticCurveTo(22.7,14.5,19.6,14.5);court.lineTo(4.4,14.5);court.quadraticCurveTo(1.3,14.5,1.3,11.4);court.lineTo(1.3,5);court.quadraticCurveTo(1.3,1.9,4.4,1.9);court.closePath();const p=worldShape(court,v);
  ctx.fillStyle=pattern(v.act===2?2:1,7,v)||'#aeb8a0';ctx.fill(p);ctx.strokeStyle='#bfc6a280';ctx.lineWidth=.14*v.scale*v.dpr;ctx.stroke(p);
  ctx.restore();
 }
 function landmarks(R,v){const im=assets.gardenDecor,meta=GARDEN_OBJECT_ART[SETS[v.act]];if(!im?.complete||!im.naturalWidth||!meta)return;
  const paint=(item,x,y,size,alpha=1)=>{if(!item||Math.abs(x-v.playerX)>18||Math.abs(y-v.playerY)>13)return;const [, ,sx,sy,sw,sh]=item,z=size*v.scale,h=z*sh/sw;ctx.globalAlpha=alpha;ctx.drawImage(im,sx,sy,sw,sh,v.ox+x*v.scale-z/2,v.oy+y*v.scale-h*.88,z,h);};
  const trees=v.act===0?[0,2,9]:v.act===1?[0,1,3,4]:[0,1,3,4],flowers=v.act===0?[3,8,11,18]:v.act===1?[7,11,12,15]:[6,7,9,10];
  for(const t of R.trees||[])paint(meta.items[trees[t.cell%trees.length]],t.x,t.y,t.size,.9);
  for(const d of R.decor||[])paint(meta.items[flowers[d.cell%flowers.length]],d.x,d.y,d.size*.85,.82);
  for(const m of R.landmarks||[]){const name=LANDMARK[m.kind],item=name&&meta.items.find(q=>q[0]===name);paint(item,m.x,m.y,m.size);}
  ctx.globalAlpha=1;
 }
 function obstacle(o,v){const im=assets.gardenDecor,meta=GARDEN_OBJECT_ART[SETS[v.act]];if(!im?.complete||!im.naturalWidth)return false;
  const choices=v.act===0?[2,9,0]:v.act===1?[0,4,16]:[0,3,4],item=meta.items[choices[o.cell%3]],[, ,x,y,w,h]=item,z=o.r*2.2*v.scale;
  ctx.drawImage(im,x,y,w,h,v.ox+o.x*v.scale-z/2,v.oy+o.y*v.scale-z*h/w*.86,z,z*h/w);return true;
 }
 // Called in the prop's translated local context. Reuse current garden art.
 function prop(o,v){const im=assets.gardenDecor,meta=GARDEN_OBJECT_ART[SETS[v.act]];if(o.kind!=='pot'||!im?.complete||!im.naturalWidth)return false;
  const [, ,x,y,w,h]=meta.items[[13,10,14][v.act]],z=v.scale*.75;
  ctx.drawImage(im,x,y,w,h,-z/2,-z*h/w*.9,z,z*h/w);return true;
 }
 function dispose(){patterns.clear();actCache=-1;}
 return {region,arena,landmarks,obstacle,prop,dispose,patternCount:()=>patterns.size};
}
