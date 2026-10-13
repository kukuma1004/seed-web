// 씨앗 맞추기의 정원 가꾸기 화면에서 SEED 정원을 2D로 그린다.
// 3D 정원(garden-scene.js)과 같은 배경 그림 · 같은 자리(u,v) · 같은 성장 아틀라스를 써서, 여기서 꾸민 것이 정원에 그대로 보인다.
import {GARDEN_PLOT_ANCHORS,GARDEN_CENTER_ANCHOR,GARDEN_GROWTH_ART,GARDEN_BACKDROP_ART,growthArtTile,centerArtTile} from './garden-scene.js';
import {centerStage} from './garden.js';
import {decorScene} from './garden-decor.js';
import {decorLayoutKey,normalizeDecorPlacements,gardenDecorLayout,GARDEN_DECOR_VIEW} from './garden-decor-placement.js';
import {DECOR_PROP_ART,DECOR_PROP_COLUMNS,DECOR_PROP_ROWS,DECOR_PROP_REGIONS} from './garden-decor-art.js';
import {seedVisualEnabled,paintSeedContact} from './seed-visual-language.js';

// 보이게 할 그림 범위(가장자리 숲은 조금 잘라도 되고, 꾸미는 자리는 다 들어오게).
const VIEW=GARDEN_DECOR_VIEW;
const POP=.9;
export function createPuzzleGarden({base='/',visualReview=seedVisualEnabled(globalThis.location)}={}){
 const images={},tinted=new Map();let disposed=false;
 const clearTiles=()=>{for(const c of tinted.values())c.width=c.height=0;tinted.clear();};
 const load=(k,f)=>{const im=new Image();im.onload=()=>{if(!disposed)clearTiles();};im.src=base+f;images[k]=im;};
 load('back','assets/'+GARDEN_BACKDROP_ART);load('growth',GARDEN_GROWTH_ART);load('props',DECOR_PROP_ART);
 const ready=k=>!disposed&&images[k]?.complete&&images[k].naturalWidth>0;
 // 아틀라스 칸을 색으로 살짝 물들인 그림(3D 정원의 재질 색과 같은 뜻). 칸·색마다 한 번만 만든다.
 function tile(index,tint=0xffffff,source='growth'){
  const key=source+':'+index+':'+tint;let c=tinted.get(key);if(c)return c;if(!ready(source))return null;
  const columns=source==='props'?DECOR_PROP_COLUMNS:4,rows=source==='props'?DECOR_PROP_ROWS:3;
  const im=images[source],cw=im.naturalWidth/columns,ch=im.naturalHeight/rows,[x0,y0,x1,y1]=source==='props'?DECOR_PROP_REGIONS[index]:[0,0,1,1],sx=(index%columns+x0)*cw,sy=(Math.floor(index/columns)+y0)*ch,w=(x1-x0)*cw,h=(y1-y0)*ch;c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);const g=c.getContext('2d');
  g.drawImage(im,sx,sy,w,h,0,0,c.width,c.height);
  if(tint!==0xffffff){g.globalCompositeOperation='multiply';g.fillStyle='#'+tint.toString(16).padStart(6,'0');g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-in';g.drawImage(im,sx,sy,w,h,0,0,c.width,c.height);}
  tinted.set(key,c);return c;
 }
 // 배경을 rect 안에 채우고(보이는 범위 VIEW 기준) 그림 좌표 → 화면 좌표 변환을 돌려준다.
 function layout(rect){
  return gardenDecorLayout(rect,images.back?.naturalWidth||1920,images.back?.naturalHeight||1080);
 }
 // 식물 한 그루: 뿌리가 자리에 닿게(그림 아래 가운데가 u,v). 멀리 있는 자리는 조금 작게.
 function drawPlant(ctx,L,index,tint,u,v,size,scale=1,alpha=1,source='growth'){
  const img=tile(index,tint,source);if(!img)return;const [x,y]=L.at(u,v),d=size*L.unit*(.72+.5*v)*scale;
  const prop=source==='props',w=prop?d*img.width/img.height:d,h=prop?d:d*img.height/img.width;
  if(visualReview)paintSeedContact(ctx,x,y,Math.min(w,d)*.64,{alpha});
  ctx.globalAlpha=alpha;ctx.drawImage(img,x-w/2,y-(prop?h:d*.94),w,h);ctx.globalAlpha=1;
 }
 // The light stamps and seeded ambient paths are created once, not once per
 // firefly/lantern per frame. Opacity and size animate without new gradients.
 function lightStamp(inner,middle){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,inner);gr.addColorStop(.35,middle);gr.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return c;
 }
 const lanternLight=lightStamp('rgba(255,244,200,.95)','rgba(255,196,110,.5)'),flyLight=lightStamp('rgba(255,238,170,1)','rgba(255,220,120,.3)');
 function drawLantern(ctx,L,u,v,size,t,phase,scale=1){
  const [x,y]=L.at(u,v),d=size*L.unit*(.72+.5*v)*scale,flick=1+Math.sin(t*5+phase)*.06+Math.sin(t*11.3+phase)*.03;
  ctx.fillStyle='#5f5a4d';ctx.fillRect(x-d*.05,y-d*.55,d*.1,d*.55);ctx.fillStyle='#ffd58a';ctx.fillRect(x-d*.09,y-d*.72,d*.18,d*.2);
  ctx.save();ctx.globalCompositeOperation='lighter';const r=d*.36*flick;ctx.drawImage(lanternLight,x-r,y-d*.62-r,r*2,r*2);ctx.restore();
 }
 const seeded=n=>{let s=n*9301+49297;return ()=>(s=(s*9301+49297)%233280)/233280;};
 const rnd=seeded(7),flies=Array.from({length:46},()=>({u:.15+rnd()*.7,v:.2+rnd()*.7,sp:.1+rnd()*.25,ph:rnd()*6.28}));
 const r2=seeded(3),petals=Array.from({length:30},()=>({u:r2(),sp:.04+r2()*.05,ph:r2()}));
 let decorKey=null,decorCache=null,sceneKey=null,sceneItems=[];
 function preparedDecor(list,positions){
  const key=decorLayoutKey(list,positions);if(key===decorKey)return decorCache;decorKey=key;
  const sc=decorScene(list,normalizeDecorPlacements(positions,list));sc.items=sc.items.map((it,n)=>({...it,n})).sort((a,b)=>a.v-b.v);decorCache=sc;return sc;
 }
 // garden: 정원 저장(plots·decor 등). fresh: 방금 꾸민 것 {id: 시작 시각}. now: 초.
 function draw(ctx,rect,garden,now,{fresh={},austinDefeated=false,placement=null,editing=false}={}){
  const L=layout(rect);
  ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();
  ctx.fillStyle='#071215';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  if(ready('back'))ctx.drawImage(images.back,L.ox,L.oy,L.iw*L.k,L.ih*L.k);
  // Everything shares the same back-to-front order, so a bench behind a bed
  // cannot paint over its foreground flowers. All roots use the original anchors.
  const ci=centerStage(garden,{austinDefeated}),ct=centerArtTile(ci),sc=preparedDecor(garden.decor,garden.decorPositions);
  let key=decorKey+':'+ci;for(const p of garden.plots||[])key+='|'+(p?growthArtTile(p.growth,p.branch):'-');
  if(key!==sceneKey){sceneKey=key;const items=[];
  if(ct!==null)items.push({kind:'plant',tile:ct,tint:0xffffff,...GARDEN_CENTER_ANCHOR,size:ci>=5?3.25:ci===4?2.55:ci===3?2.05:ci===2?1.62:1.18});
  (garden.plots||[]).forEach((p,i)=>{if(!p)return;const a=GARDEN_PLOT_ANCHORS[i];if(a)items.push({kind:'plant',tile:growthArtTile(p.growth,p.branch),tint:0xffffff,...a,size:1.6});});
  items.push(...sc.items);items.sort((a,b)=>a.v-b.v);sceneItems=items;}
  for(const it of sceneItems){const t0=fresh[it.id],k=t0===undefined?1:Math.min(1,(now-t0)/POP),scale=t0===undefined?1:k<.7?(k/.7)*1.18:1.18-(k-.7)/.3*.18;
   if(scale<=0)continue;
   if(it.kind==='lantern')drawLantern(ctx,L,it.u,it.v,it.size,now,it.n,scale);
   else drawPlant(ctx,L,it.tile,it.tint??0xffffff,it.u,it.v,it.size,scale,1,it.kind==='prop'?'props':'growth');
   if(t0!==undefined&&k<1){const [x,y]=L.at(it.u,it.v);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;ctx.fillStyle='#fff3b0';for(let q=0;q<10;q++){const a=q*.63+it.n,r=L.unit*(.2+k*1.4);ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y-L.unit*.6+Math.sin(a)*r*.6,L.unit*.06,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }
  if(editing){for(const it of sc.items)if(it.kind==='prop'){const [x,y]=L.at(it.u,it.v);ctx.strokeStyle='#dce3bd';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,L.unit*.3,L.unit*.12,0,0,Math.PI*2);ctx.stroke();}}
  if(placement){const it=sc.items.find(i=>i.id===placement.id);if(it){const [x,y]=L.at(placement.point.u,placement.point.v);ctx.strokeStyle=placement.valid?'#dbf6a0':'#f29f88';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,L.unit*.45,L.unit*.19,0,0,Math.PI*2);ctx.stroke();drawPlant(ctx,L,it.tile,it.tint,placement.point.u,placement.point.v,it.size,1,.72,'props');}}
  // 반딧불이 · 꽃비.
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<Math.min(flies.length,10+sc.fireflies);i++){const f=flies[i],[x,y]=L.at(f.u+Math.sin(now*f.sp+f.ph)*.03,f.v+Math.cos(now*f.sp*1.3+f.ph)*.02),r=L.unit*.18;
   ctx.globalAlpha=.45+.4*Math.sin(now*2.2+f.ph);ctx.drawImage(flyLight,x-r,y-r,r*2,r*2);}
  ctx.restore();
  if(sc.petals){ctx.fillStyle='#ffc6dcd0';for(let i=0;i<petals.length;i++){const p=petals[i],v=(now*p.sp+p.ph)%1,[x,y]=L.at(p.u+Math.sin(now*.8+i)*.02,VIEW.v0+v*(VIEW.v1-VIEW.v0));ctx.save();ctx.translate(x,y);ctx.rotate(now*1.5+i);ctx.beginPath();ctx.ellipse(0,0,L.unit*.09,L.unit*.045,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
  ctx.restore();
  return L;
 }
 return {draw,layout,ready:()=>ready('back')&&ready('growth')&&ready('props'),dispose(){if(disposed)return;disposed=true;clearTiles();for(const im of Object.values(images))im.onload=null;lanternLight.width=lanternLight.height=flyLight.width=flyLight.height=0;}};
}
