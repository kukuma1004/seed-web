// 씨앗 맞추기의 정원 가꾸기 화면에서 SEED 정원을 2D로 그린다.
// 3D 정원(garden-scene.js)과 같은 배경 그림 · 같은 자리(u,v) · 같은 성장 아틀라스를 써서, 여기서 꾸민 것이 정원에 그대로 보인다.
import {GARDEN_PLOT_ANCHORS,GARDEN_CENTER_ANCHOR,GARDEN_GROWTH_ART,GARDEN_BACKDROP_ART,growthArtTile,centerArtTile} from './garden-scene.js';
import {centerStage} from './garden.js';
import {decorScene} from './garden-decor.js';

// 보이게 할 그림 범위(가장자리 숲은 조금 잘라도 되고, 꾸미는 자리는 다 들어오게).
const VIEW=Object.freeze({u0:.1,u1:.9,v0:.1,v1:.99});
const POP=.9;
export function createPuzzleGarden({base='/'}={}){
 const images={},tinted=new Map();
 const load=(k,f)=>{const im=new Image();im.onload=()=>tinted.clear();im.src=base+f;images[k]=im;};
 load('back','assets/'+GARDEN_BACKDROP_ART);load('growth',GARDEN_GROWTH_ART);
 const ready=k=>images[k]?.complete&&images[k].naturalWidth>0;
 // 아틀라스 칸을 색으로 살짝 물들인 그림(3D 정원의 재질 색과 같은 뜻). 칸·색마다 한 번만 만든다.
 function tile(index,tint=0xffffff){
  const key=index+':'+tint;let c=tinted.get(key);if(c)return c;if(!ready('growth'))return null;
  const im=images.growth,w=im.naturalWidth/4,h=im.naturalHeight/3;c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.drawImage(im,(index%4)*w,Math.floor(index/4)*h,w,h,0,0,w,h);
  if(tint!==0xffffff){g.globalCompositeOperation='multiply';g.fillStyle='#'+tint.toString(16).padStart(6,'0');g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-in';g.drawImage(im,(index%4)*w,Math.floor(index/4)*h,w,h,0,0,w,h);}
  tinted.set(key,c);return c;
 }
 // 배경을 rect 안에 채우고(보이는 범위 VIEW 기준) 그림 좌표 → 화면 좌표 변환을 돌려준다.
 function layout(rect){
  const iw=images.back?.naturalWidth||1920,ih=images.back?.naturalHeight||1080;
  const k=Math.min(rect.w/((VIEW.u1-VIEW.u0)*iw),rect.h/((VIEW.v1-VIEW.v0)*ih))*1.0001;
  const cx=(VIEW.u0+VIEW.u1)/2,cy=(VIEW.v0+VIEW.v1)/2,ox=rect.x+rect.w/2-cx*iw*k,oy=rect.y+rect.h/2-cy*ih*k;
  return {k,iw,ih,ox,oy,at:(u,v)=>[ox+u*iw*k,oy+v*ih*k],unit:ih*k*.085};
 }
 // 식물 한 그루: 뿌리가 자리에 닿게(그림 아래 가운데가 u,v). 멀리 있는 자리는 조금 작게.
 function drawPlant(ctx,L,index,tint,u,v,size,scale=1,alpha=1){
  const img=tile(index,tint);if(!img)return;const [x,y]=L.at(u,v),d=size*L.unit*(.72+.5*v)*scale;
  ctx.globalAlpha=alpha;ctx.drawImage(img,x-d/2,y-d*.94,d,d*img.height/img.width);ctx.globalAlpha=1;
 }
 function drawLantern(ctx,L,u,v,size,t,phase,scale=1){
  const [x,y]=L.at(u,v),d=size*L.unit*(.72+.5*v)*scale,flick=1+Math.sin(t*5+phase)*.06+Math.sin(t*11.3+phase)*.03;
  ctx.fillStyle='#5f5a4d';ctx.fillRect(x-d*.05,y-d*.55,d*.1,d*.55);ctx.fillStyle='#ffd58a';ctx.fillRect(x-d*.09,y-d*.72,d*.18,d*.2);
  ctx.save();ctx.globalCompositeOperation='lighter';const r=d*.36*flick,gr=ctx.createRadialGradient(x,y-d*.62,1,x,y-d*.62,r);
  gr.addColorStop(0,'rgba(255,244,200,.95)');gr.addColorStop(.35,'rgba(255,196,110,.5)');gr.addColorStop(1,'rgba(255,170,80,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y-d*.62,r,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 const seeded=n=>{let s=n*9301+49297;return ()=>(s=(s*9301+49297)%233280)/233280;};
 // garden: 정원 저장(plots·decor 등). fresh: 방금 꾸민 것 {id: 시작 시각}. now: 초.
 function draw(ctx,rect,garden,now,{fresh={},austinDefeated=false}={}){
  const L=layout(rect);
  ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();
  ctx.fillStyle='#071215';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  if(ready('back'))ctx.drawImage(images.back,L.ox,L.oy,L.iw*L.k,L.ih*L.k);
  // 가운데 나무 · 여정 식물(3D 정원과 같은 그림 칸).
  const ci=centerStage(garden,{austinDefeated}),ct=centerArtTile(ci);
  if(ct!==null)drawPlant(ctx,L,ct,0xffffff,GARDEN_CENTER_ANCHOR.u,GARDEN_CENTER_ANCHOR.v,ci>=5?3.25:ci===4?2.55:ci===3?2.05:ci===2?1.62:1.18);
  (garden.plots||[]).forEach((p,i)=>{if(!p)return;const a=GARDEN_PLOT_ANCHORS[i];if(a)drawPlant(ctx,L,growthArtTile(p.growth,p.branch),0xffffff,a.u,a.v,1.6);});
  // 꾸민 것: 뒤(위쪽)부터 앞으로.
  const sc=decorScene(garden.decor);
  const items=sc.items.map((it,n)=>({...it,n})).sort((a,b)=>a.v-b.v);
  for(const it of items){const t0=fresh[it.id],k=t0===undefined?1:Math.min(1,(now-t0)/POP),scale=t0===undefined?1:k<.7?(k/.7)*1.18:1.18-(k-.7)/.3*.18;
   if(scale<=0)continue;
   if(it.kind==='plant')drawPlant(ctx,L,it.tile,it.tint,it.u,it.v,it.size,scale);else drawLantern(ctx,L,it.u,it.v,it.size,now,it.n,scale);
   if(t0!==undefined&&k<1){const [x,y]=L.at(it.u,it.v);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;ctx.fillStyle='#fff3b0';for(let q=0;q<10;q++){const a=q*.63+it.n,r=L.unit*(.2+k*1.4);ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y-L.unit*.6+Math.sin(a)*r*.6,L.unit*.06,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }
  // 반딧불이 · 꽃비.
  const flies=10+sc.fireflies,rnd=seeded(7);ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<flies;i++){const u=.15+rnd()*.7,v=.2+rnd()*.7,sp=.1+rnd()*.25,ph=rnd()*6.28,[x,y]=L.at(u+Math.sin(now*sp+ph)*.03,v+Math.cos(now*sp*1.3+ph)*.02),a=.45+.4*Math.sin(now*2.2+ph);
   const gr=ctx.createRadialGradient(x,y,0,x,y,L.unit*.18);gr.addColorStop(0,`rgba(255,238,170,${a})`);gr.addColorStop(1,'rgba(255,220,120,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,L.unit*.18,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  if(sc.petals){const r2=seeded(3);ctx.fillStyle='#ffc6dcd0';for(let i=0;i<30;i++){const u=r2(),sp=.04+r2()*.05,ph=r2(),v=((now*sp+ph)%1),[x,y]=L.at(u+Math.sin(now*.8+i)*.02,VIEW.v0+v*(VIEW.v1-VIEW.v0));ctx.save();ctx.translate(x,y);ctx.rotate(now*1.5+i);ctx.beginPath();ctx.ellipse(0,0,L.unit*.09,L.unit*.045,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
  ctx.restore();
  return L;
 }
 return {draw,ready:()=>ready('back')&&ready('growth')};
}
