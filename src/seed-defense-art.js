import {defenseWaveInfo} from './seed-defense-rules.js';
import {DEFENSE_FORMS} from './seed-defense-catalog.js';
const SOLO={reflect:0,split:1,chain:2,orbit:3,pierce:4,burst:5,recall:6,gravity:7,frost:8};
const FUSION={collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
const AWAKEN={bigcrunch:0,frostarmada:1,thousandblades:2,infiniteprism:3,skyspear:4,icegarden:5,tempestcrown:6,maelstrom:7,bloomtempest:8,mirrorhall:9};
// Reuse the main game's painted bodies. Forms without a dedicated body use both
// ingredient silhouettes, not a cropped card or a claim of 153 unique paintings.
export function defenseBodyParts(t){
 const f=DEFENSE_FORMS[t.formId];if(!f)return [{atlas:'seed',cell:0,cols:2,rows:2,dx:0,size:6.4}];
 if(AWAKEN[f.id]!==undefined)return [{atlas:'awaken',cell:AWAKEN[f.id],dx:0,size:8.3}];
 if(f.kind==='solo')return [{atlas:'solo',cell:SOLO[f.requires[0]],dx:0,size:7.3}];
 if(FUSION[f.id]!==undefined)return [{atlas:'fusion',cell:FUSION[f.id],dx:0,size:7.7}];
 if(f.kind==='final'&&FUSION[f.base]!==undefined)return [{atlas:'fusion',cell:FUSION[f.base],dx:-.8,size:7.8},{atlas:'solo',cell:SOLO[DEFENSE_FORMS[f.addedSolo].requires[0]],dx:2.1,size:4.7}];
 return f.requires.map((law,i)=>({atlas:'solo',cell:SOLO[law],dx:i?1.7:-1.7,size:f.kind==='twin'?6.8:6.1}));
}
export function paintDefenseGround(g,assets,path,state){
 if(assets.floor?.naturalWidth){g.save();g.filter='brightness(1.19) saturate(1.62) contrast(1.13)';g.drawImage(assets.floor,-8,4,118,54);g.restore();}
 else{g.fillStyle='#283c32';g.fillRect(-8,4,118,54);}
 const act=defenseWaveInfo(Math.max(1,state.wave)).act;if(act){g.fillStyle=act===1?'#7c48232b':'#28577c30';g.fillRect(-8,4,118,54);}
 // Directional canopy light is baked once with the ground, never per frame.
 const sunlight=g.createRadialGradient(12,15,1,22,22,69);
 sunlight.addColorStop(0,'#f6dc682e');sunlight.addColorStop(.45,'#c5cb480c');sunlight.addColorStop(1,'#062e3100');
 g.fillStyle=sunlight;g.fillRect(-8,4,118,54);
 const trace=()=>{g.beginPath();path.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));};
 g.lineJoin=g.lineCap='round';trace();g.strokeStyle='#182818a0';g.lineWidth=7.5;g.stroke();trace();g.strokeStyle='#64703d';g.lineWidth=6.2;g.stroke();
 // Worn flagstones are baked into the ground canvas only when layout changes.
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],len=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
  for(let d=1;d<len;d+=5.25){const k=Math.floor(d/5.25)+i*29,noise=Math.sin(k*12.93)*.22;g.save();g.translate(a.x+Math.cos(angle)*d,a.y+Math.sin(angle)*d);g.rotate(noise*.3);
   if(assets.flagstones?.naturalWidth){const img=assets.flagstones,cell=k%4,sw=img.width/2,sh=img.height/2;g.drawImage(img,cell%2*sw,Math.floor(cell/2)*sh,sw,sh,-3.05,-3.4,6.1,6.8);g.restore();continue;}
   g.rotate(angle);g.scale(1.5+noise*.3,.94+noise*.22);
   g.beginPath();g.moveTo(-1.3,-2.3+noise);g.lineTo(1.15,-2.45);g.lineTo(1.45,-.9);g.lineTo(1.3,2.4);g.lineTo(-1.1,2.55-noise);g.lineTo(-1.5,1.5);g.closePath();g.fillStyle=['#717661','#81816a','#777b65','#85846b'][k%4];g.fill();if(assets.stone?.naturalWidth){g.save();g.clip();const img=assets.stone,cut=img.width*.35;g.drawImage(img,(k%3)*img.width*.21,(k%2)*img.height*.28,cut,cut,-1.6,-2.6,3.2,5.2);g.fillStyle='#c6bb7b26';g.fillRect(-1.6,-2.6,3.2,5.2);g.restore();}g.strokeStyle='#303d32a0';g.lineWidth=.13;g.stroke();g.beginPath();g.moveTo(-1.2,-2.1);g.lineTo(1,-2.2);g.strokeStyle='#bbc09b70';g.lineWidth=.14;g.stroke();
   if(k%3===0){g.beginPath();g.moveTo(-1.35,.3);g.lineTo(-.1,.7);g.lineTo(.3,1.8);g.strokeStyle='#404c3970';g.stroke();}g.restore();
  }
 }
 // Sparse warm petals connect the painted grass and stone edges. Cached with
 // the floor, so detail does not add any frame-time particle work.
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],len=Math.hypot(b.x-a.x,b.y-a.y),ux=(b.x-a.x)/len,uy=(b.y-a.y)/len;
  for(let d=6;d<len-3;d+=12.7){const side=Math.sin(d+i*5)>0?1:-1,x=a.x+ux*d-uy*side*2.7,y=a.y+uy*d+ux*side*2.7;g.save();g.translate(x,y);g.rotate(d);for(let j=0;j<4;j++){g.rotate(Math.PI/2);g.fillStyle=j%2?'#e7a356':'#ce7841';g.beginPath();g.ellipse(.29,0,.36,.2,.3,0,Math.PI*2);g.fill();}g.fillStyle='#e7c477';g.beginPath();g.arc(0,0,.13,0,Math.PI*2);g.fill();g.restore();}
 }
 for(const t of state.towers){
  const soil=g.createRadialGradient(t.x,t.y+.7,.8,t.x,t.y+.7,4);soil.addColorStop(0,'#161d11ef');soil.addColorStop(.7,'#302d19ce');soil.addColorStop(1,'#23372000');g.fillStyle=soil;g.beginPath();g.ellipse(t.x,t.y+.7,4,2.1,0,0,Math.PI*2);g.fill();
  for(let j=0;j<11;j++){const a=j*2.4+t.id,x=t.x+Math.cos(a)*3.05,y=t.y+.4+Math.sin(a)*1.4;g.save();g.translate(x,y);g.rotate(a);g.fillStyle=j%3?'#82933d':'#b4b966';g.beginPath();g.ellipse(0,0,.72,.28,.18,0,Math.PI*2);g.fill();g.strokeStyle='#d9d48b65';g.lineWidth=.07;g.beginPath();g.moveTo(-.45,0);g.lineTo(.45,0);g.stroke();g.restore();}
 }
 const heart=path.at(-1),heartLight=g.createRadialGradient(heart.x-1,heart.y-2,.4,heart.x-1,heart.y-2,9);
 heartLight.addColorStop(0,'#ffde7970');heartLight.addColorStop(.4,'#edd66b32');heartLight.addColorStop(1,'#edd66b00');g.fillStyle=heartLight;g.fillRect(heart.x-10,heart.y-11,18,18);
 g.fillStyle='#ebebd0';g.font='1.5px sans-serif';g.textAlign='center';g.fillText('숲의 입구',path[0].x+4,path[0].y-4.8);g.fillText('정원의 심장',heart.x-2,heart.y+7);
}
export function paintEvolutionCue(ctx,cue,age,reduced){
 const p=Math.min(1,age/1.3),fade=Math.min(1,(2.6-age)/.55);if(fade<=0)return;
 ctx.save();ctx.translate(cue.x,cue.y);ctx.globalAlpha=fade;
 if(!reduced&&p<1){
  const charge=p<.36,r=charge?7*(1-p/.36)+.6:1+(p-.36)*11;
  ctx.strokeStyle=cue.ink;ctx.lineWidth=.28;ctx.beginPath();ctx.ellipse(0,-2.5,charge?r*.5:r,charge?r:r*.45,0,0,Math.PI*2);ctx.stroke();
  const bloom=Math.max(0,(p-.32)/.68);for(let i=0;i<12;i++){const a=i*Math.PI/6+(.7*p),d=charge?r:1+bloom*7;ctx.save();ctx.translate(Math.cos(a)*d,-2.5+Math.sin(a)*d*.65);ctx.rotate(a);ctx.fillStyle=i%3?'#e5ecca':cue.ink;ctx.globalAlpha=fade*(charge?.65:1-bloom*.65);ctx.beginPath();ctx.ellipse(0,0,.7,.22,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 }
 // Readable label persists longer than the burst, and reduced motion keeps it.
 ctx.globalAlpha=fade;ctx.font='bold 1.6px system-ui';ctx.textAlign='center';ctx.lineWidth=.65;ctx.strokeStyle='#13201eed';ctx.strokeText(cue.title,0,-8.6);ctx.fillStyle='#fff1b9';ctx.fillText(cue.title,0,-8.6);ctx.restore();
}
