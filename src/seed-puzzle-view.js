import {PUZZLE,PUZZLE_STAGES,PUZZLE_STAGE_BY_ID,PUZZLE_SPECIAL_TEXT,PUZZLE_JP,createPuzzle,playPuzzleMove,findHint,puzzleGoalState,puzzleStars,dailyPuzzleStage,seoulDay,
 readPuzzleProgress,writePuzzleProgress,recordPuzzleResult,puzzleUnlocked} from './seed-puzzle-rules.js';
import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';
import {createCanvasVfx} from './canvas-vfx.js';
import {lawArt,LAW_TILES,LAW_ATLAS} from './law-art.js';
import {createFramePacer} from './frame-time.js';
import './choice.css';
import './seed-puzzle.css';

// 씨앗 맞추기 화면(PUZZLE_MATCH3_PLAN.md). 규칙은 seed-puzzle-rules.js 가 정하고, 여기서는 그 결과(steps)를 차례로 그린다.
// 씨앗 그림은 법칙 문양(seed-law-atlas-v4)을 그대로 쓰되, 연쇄·분열(금색)이나 관통·중력(보라)처럼 그림 색이 겹치는 법칙이 있어
// 법칙마다 테두리 모양과 색을 달리해 작은 휴대폰 화면에서도 구분되게 한다. 효과는 본편 이펙트 소재(canvas-vfx)를 물들여 쓴다.
const BASE=import.meta.env.BASE_URL;
const N=PUZZLE.size;
export const PUZZLE_LOOK=Object.freeze({
 burst:{color:'#ff5b4a',shape:'square'},split:{color:'#ff9ec4',shape:'flower'},chain:{color:'#ffd23f',shape:'triangle'},
 pierce:{color:'#b6f24a',shape:'diamond'},orbit:{color:'#4fd77a',shape:'circle'},recall:{color:'#3fd6c0',shape:'shield'},
 frost:{color:'#e6fbff',shape:'hexagon'},reflect:{color:'#4aa8ff',shape:'octagon'},gravity:{color:'#b57bff',shape:'pentagon'},
});
const SUN='#ffd873';
const LAW_SOUND={burst:'burstHit',pierce:'pierceHit',chain:'chain',frost:'frostHit',gravity:'gravityHit',orbit:'shotOrbit',split:'split',reflect:'reflect',recall:'shotReturn'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const escape=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const starText=n=>'★'.repeat(n)+'☆'.repeat(Math.max(0,3-n));
const dayLabel=d=>`${d.slice(4,6)}.${d.slice(6,8)}`;

function shapePath(g,shape,x,y,r){
 g.beginPath();
 const poly=(n,rot=-Math.PI/2,k=1)=>{for(let i=0;i<n;i++){const a=rot+i*2*Math.PI/n;g[i?'lineTo':'moveTo'](x+Math.cos(a)*r*k,y+Math.sin(a)*r*k);}g.closePath();};
 switch(shape){
  case 'circle':g.arc(x,y,r*.94,0,Math.PI*2);break;
  case 'square':{const w=r*.86,q=r*.3;g.roundRect(x-w,y-w,w*2,w*2,q);break;}
  case 'diamond':g.moveTo(x,y-r);g.lineTo(x+r*.8,y);g.lineTo(x,y+r);g.lineTo(x-r*.8,y);g.closePath();break;
  case 'triangle':g.moveTo(x,y-r);g.lineTo(x+r*.98,y+r*.78);g.lineTo(x-r*.98,y+r*.78);g.closePath();break;
  case 'hexagon':poly(6,0,.98);break;
  case 'octagon':poly(8,Math.PI/8,.98);break;
  case 'pentagon':poly(5,-Math.PI/2,1.02);break;
  case 'shield':g.moveTo(x-r*.84,y-r*.8);g.lineTo(x+r*.84,y-r*.8);g.lineTo(x+r*.84,y+r*.05);g.quadraticCurveTo(x+r*.8,y+r*.7,x,y+r);g.quadraticCurveTo(x-r*.8,y+r*.7,x-r*.84,y+r*.05);g.closePath();break;
  // 꽃잎 다섯 장: 테두리 한 줄로(원을 겹쳐 그리면 안쪽 선까지 보인다).
  case 'flower':for(let k=0;k<=90;k++){const a=-Math.PI/2+k*2*Math.PI/90,q=r*(.8+.2*Math.cos(5*(a+Math.PI/2)));g[k?'lineTo':'moveTo'](x+Math.cos(a)*q,y+Math.sin(a)*q);}g.closePath();break;
 }
}

export function mountSeedPuzzle({host=document.body,audio,storage=null,owner='guest',practice=false,onCredit=()=>'',onDiscover=()=>{},onClose=()=>{}}={}){
 const root=document.createElement('section');root.id='seed-puzzle';root.setAttribute('aria-label','씨앗 맞추기');
 root.innerHTML=`<canvas aria-label="씨앗 맞추기 판"></canvas>
 <aside class="sp-hud"><div class="sp-head"><button class="sp-pause" aria-label="일시정지">Ⅱ</button><div><small class="sp-no"></small><b class="sp-name"></b></div></div>
 <div class="sp-stats"><div class="sp-moves"><small>남은 이동</small><strong></strong></div><div class="sp-score"><small>점수</small><strong></strong></div></div>
 <div class="sp-bar" aria-hidden="true"><i></i></div><ul class="sp-goals" aria-label="목표"></ul><p class="sp-keys">끌거나 두 칸을 차례로 눌러 바꾸기 · 방향키 + Space · H 힌트 · Esc 일시정지</p></aside>
 <div class="sp-banner" aria-hidden="true"></div><p class="sp-toast" role="status" aria-live="polite"></p><div class="sp-modal"></div>`;
 host.append(root);document.body.classList.add('seed-puzzle-open');
 const $=q=>root.querySelector(q),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),hud=$('.sp-hud'),modal=$('.sp-modal'),listeners=[];
 const listen=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const vfx=createCanvasVfx(),pacer=createFramePacer(),images={};
 const load=(k,f)=>{const im=new Image();im.onload=()=>{tiles.clear();backdrop=null;};im.src=BASE+f;images[k]=im;};
 const ready=k=>images[k]?.complete&&images[k].naturalWidth>0;
 load('atlas','assets/'+LAW_ATLAS);load('floor','assets/cute/quiet-stone-v1.webp');load('stone','assets/garden-stone-v4.png');load('seed','icons/seed-cute-v1-192.png');load('back','assets/garden-sanctuary-v2.webp');
 let progress=readPuzzleProgress(storage,owner),def=null,s=null,closed=false,raf=0,last=0,clock=0,width=1,height=1,dpr=1,bx=0,by=0,cs=40,backdrop=null;
 // 화면 쪽 판: 칸마다 보이는 씨앗 id. 규칙의 판은 한 수에 끝까지 가 있고, 화면은 steps 를 따라 뒤따라간다.
 let vb=[],vmoss=[],vstone=[],stoneMax=1;
 const sprites=new Map(),effects=[],floaters=[],tiles=new Map();
 let queue=[],cur=null,curT=0,selected=-1,cursor=-1,drag=null,idleAt=0,hint=null,shake=0,announced=new Set(),resultTimer=0,keyboard=false;
 function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);clearTimeout(resultTimer);for(const off of listeners)off();root.remove();document.body.classList.remove('seed-puzzle-open');onClose();}

 // ── 배치
 function resize(){
  const r=root.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  root.classList.toggle('sp-wide',width>=height*1.15);const h=hud.getBoundingClientRect(),wide=root.classList.contains('sp-wide');let size;
  if(wide){const left=h.right+14,avail=width-left-14;size=Math.min(avail,height-20,820);bx=left+(avail-size)/2;by=(height-size)/2;}
  else{const top=h.bottom+10,avail=height-top-14;size=Math.min(width-20,avail);bx=(width-size)/2;by=top+Math.max(0,(avail-size)/2);}
  size=Math.max(160,size);cs=size/N;tiles.clear();backdrop=null;
 }
 listen(window,'resize',()=>resize());
 const cx=i=>bx+(i%N+.5)*cs,cy=i=>by+(Math.floor(i/N)+.5)*cs;
 const cellAt=(x,y)=>{const c=Math.floor((x-bx)/cs),r=Math.floor((y-by)/cs);return c>=0&&c<N&&r>=0&&r<N?r*N+c:-1;};

 // ── 씨앗 그림(법칙 · 크기마다 한 번 굽는다)
 function tile(law){
  const key=law+cs;let c=tiles.get(key);if(c)return c;
  const px=Math.max(8,Math.round(cs*dpr)),g=(c=document.createElement('canvas')).getContext('2d');c.width=c.height=px;
  const look=PUZZLE_LOOK[law],r=px*.44,x=px/2,y=px/2;
  g.save();shapePath(g,look.shape,x,y,r);g.clip();
  const grad=g.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r*1.2);grad.addColorStop(0,look.color);grad.addColorStop(1,'#0b1418');g.fillStyle=grad;g.fillRect(0,0,px,px);
  if(ready('atlas')&&LAW_TILES[law]!==undefined){const im=images.atlas,tw=im.naturalWidth/4,th=im.naturalHeight/3,t=LAW_TILES[law],k=.62;
   g.globalAlpha=.92;g.drawImage(im,(t%4)*tw+tw*(1-k)/2,Math.floor(t/4)*th+th*(1-k)/2,tw*k,th*k,x-r*.78,y-r*.78,r*1.56,r*1.56);g.globalAlpha=1;}
  const edge=g.createRadialGradient(x,y,r*.55,x,y,r*1.05);edge.addColorStop(0,'#0000');edge.addColorStop(1,'#000a');g.fillStyle=edge;g.fillRect(0,0,px,px);
  g.restore();
  shapePath(g,look.shape,x,y,r);g.lineWidth=Math.max(2,px*.07);g.strokeStyle=look.color;g.stroke();
  shapePath(g,look.shape,x,y,r*.9);g.lineWidth=Math.max(1,px*.018);g.strokeStyle='#ffffff66';g.stroke();
  g.fillStyle='#ffffff2e';g.beginPath();g.ellipse(x-r*.28,y-r*.42,r*.34,r*.16,-.5,0,Math.PI*2);g.fill();
  tiles.set(key,c);return c;
 }
 function sunTile(){
  const key='sun'+cs;let c=tiles.get(key);if(c)return c;const px=Math.max(8,Math.round(cs*dpr)),g=(c=document.createElement('canvas')).getContext('2d');c.width=c.height=px;const x=px/2,r=px*.4;
  const grad=g.createRadialGradient(x,x,r*.2,x,x,r*1.1);grad.addColorStop(0,'#fff6c9');grad.addColorStop(1,'#d88d1c');g.fillStyle=grad;g.beginPath();g.arc(x,x,r,0,Math.PI*2);g.fill();
  if(ready('seed')){g.save();g.beginPath();g.arc(x,x,r*.82,0,Math.PI*2);g.clip();g.drawImage(images.seed,x-r*.9,x-r*.9,r*1.8,r*1.8);g.restore();}
  g.lineWidth=px*.06;g.strokeStyle=SUN;g.beginPath();g.arc(x,x,r,0,Math.PI*2);g.stroke();
  tiles.set(key,c);return c;
 }
 function mossTile(){
  const key='moss'+cs;let c=tiles.get(key);if(c)return c;const px=Math.max(8,Math.round(cs*dpr)),g=(c=document.createElement('canvas')).getContext('2d');c.width=c.height=px;
  g.fillStyle='#2f6b2fcc';g.beginPath();g.roundRect(px*.04,px*.04,px*.92,px*.92,px*.18);g.fill();
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let k=0;k<22;k++){g.fillStyle=k%3?'#6fbf4a99':'#a8e0666e';g.beginPath();g.arc(px*(.12+rnd()*.76),px*(.12+rnd()*.76),px*(.04+rnd()*.07),0,Math.PI*2);g.fill();}
  tiles.set(key,c);return c;
 }

 // ── 단계 시작
 function start(d){
  def=d;s=createPuzzle(d,d.daily?d.seed:(Date.now()^Math.floor(Math.random()*1e9))>>>0);
  sprites.clear();effects.length=floaters.length=0;queue=[];cur=null;selected=cursor=-1;drag=null;hint=null;announced=new Set();shake=0;
  vb=s.cells.map(c=>c?.id??null);vmoss=[...s.moss];vstone=[...s.stone];stoneMax=d.stoneHp||1;
  // 시작할 때 씨앗이 위에서 쏟아진다(아래 줄부터 먼저 닿게 조금씩 엇갈려).
  for(let i=0;i<N*N;i++){const c=s.cells[i],r=Math.floor(i/N);if(c)addSprite(c,i%N,r-N-1-(N-r)*.35).ty=r;}
  modal.hidden=true;root.classList.add('sp-playing');resize();hudUpdate();idleAt=clock;audio?.unlock?.();
 }
 function addSprite(c,x,y){const sp={id:c.id,law:c.law,sp:c.sp,dir:c.dir,law2:c.law2,x,y,tx:x,ty:y,vy:0,tw:null,scale:1,pop:0,dying:0};sprites.set(c.id,sp);return sp;}
 const spriteAt=i=>vb[i]!=null?sprites.get(vb[i]):null;

 // ── 입력
 function tryMove(a,b){
  if(!canAct()||a<0||b<0)return;selected=-1;hint=null;idleAt=clock;
  const res=playPuzzleMove(s,a,b);
  if(!res.ok){toast(res.reason);audio?.play('shotArc',{pitch:.6});}
  queue.push(...res.steps);
 }
 const canAct=()=>s&&s.phase==='play'&&!cur&&!queue.length&&modal.hidden;
 const neighbor=(a,b)=>a>=0&&b>=0&&Math.abs(a%N-b%N)+Math.abs(Math.floor(a/N)-Math.floor(b/N))===1;
 listen(canvas,'pointerdown',e=>{if(!canAct())return;audio?.unlock?.();keyboard=false;const i=cellAt(e.offsetX,e.offsetY);if(i<0)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
  if(selected>=0&&neighbor(selected,i)){tryMove(selected,i);return;}drag={i,x:e.offsetX,y:e.offsetY,id:e.pointerId};selected=spriteAt(i)?i:-1;});
 listen(canvas,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.hypot(dx,dy)<cs*.38)return;
  const c=drag.i%N,r=Math.floor(drag.i/N),to=Math.abs(dx)>Math.abs(dy)?(dx>0?(c<N-1?drag.i+1:-1):(c>0?drag.i-1:-1)):(dy>0?(r<N-1?drag.i+N:-1):(r>0?drag.i-N:-1));const from=drag.i;drag=null;if(to>=0)tryMove(from,to);});
 for(const n of ['pointerup','pointercancel'])listen(canvas,n,()=>{drag=null;});
 const KEYS={ArrowLeft:-1,ArrowRight:1,ArrowUp:-N,ArrowDown:N};
 listen(window,'keydown',e=>{
  if(e.target?.closest?.('input,textarea'))return;
  if(e.code==='Escape'){e.preventDefault();if(!modal.hidden&&modal.dataset.kind==='pause'){resume();return;}if(!modal.hidden&&modal.dataset.kind==='menu'){close();return;}if(!modal.hidden&&modal.dataset.kind!=='menu'){menu();return;}pause();return;}
  if(!canAct())return;
  if(e.code==='KeyH'){hint=findHint(s);idleAt=clock-99;return;}
  if(KEYS[e.code]!==undefined){e.preventDefault();keyboard=true;if(cursor<0)cursor=selected>=0?selected:27;const d=KEYS[e.code],next=cursor+d;if(Math.abs(d)===1&&Math.floor(next/N)!==Math.floor(cursor/N)||next<0||next>=N*N)return;
   if(selected>=0&&selected===cursor){tryMove(cursor,next);cursor=next;return;}cursor=next;return;}
  if(e.code==='Space'||e.code==='Enter'){e.preventDefault();keyboard=true;if(cursor<0){cursor=27;return;}if(selected>=0&&neighbor(selected,cursor)){tryMove(selected,cursor);return;}selected=selected===cursor?-1:cursor;}
 });
 $('.sp-pause').onclick=()=>pause();

 // ── steps 재생
 // 안 맞는 바꾸기는 반쯤 갔다가(.14초) 되돌아온다.
 const DUR={swap:.15,bad:.32,clear:.3,shuffle:.5,bonus:.9,end:.2};
 function begin(st){
  curT=0;
  if(st.type==='swap'){const A=spriteAt(st.a),B=spriteAt(st.b);if(!A||!B)return;tween(A,st.b%N,Math.floor(st.b/N),st.ok?DUR.swap:.14);tween(B,st.a%N,Math.floor(st.a/N),st.ok?DUR.swap:.14);
   if(st.ok){[vb[st.a],vb[st.b]]=[vb[st.b],vb[st.a]];audio?.play('shotPetal');}}
  else if(st.type==='clear')clear(st);
  else if(st.type==='fall'){vb=st.cells.map(c=>c?.id??null);vstone=[...st.stone];
   const from=new Map(st.spawns.map(p=>[p.id,p.fromRow]));
   for(let i=0;i<N*N;i++){const c=st.cells[i];if(!c)continue;let sp=sprites.get(c.id);if(!sp)sp=addSprite(c,i%N,from.get(c.id)??-1);Object.assign(sp,{law:c.law,sp:c.sp,dir:c.dir,law2:c.law2,tx:i%N,ty:Math.floor(i/N)});if(!sp.tw&&sp.x!==sp.tx)tween(sp,sp.tx,sp.ty,.12);}}
  else if(st.type==='shuffle'){vb=st.cells.map(c=>c?.id??null);const keep=new Set(vb);
   for(const [id,sp] of sprites)if(!keep.has(id)&&!sp.dying)sp.dying=.001;
   for(let i=0;i<N*N;i++){const c=st.cells[i];if(!c)continue;let sp=sprites.get(c.id);if(!sp){sp=addSprite(c,i%N,Math.floor(i/N));sp.pop=1;}tween(sp,i%N,Math.floor(i/N),DUR.shuffle*.8);}
   banner('섞는 중…','');}
  else if(st.type==='bonus'){if(st.moves)banner(`남은 이동 ${st.moves} × ${PUZZLE.moveBonus}`,`+${st.gained.toLocaleString()}`);audio?.play('pickup');}
  else if(st.type==='end'){hudUpdate();}
 }
 function stepDone(st,t){
  if(st.type==='swap')return t>=(st.ok?DUR.swap:DUR.bad);
  if(st.type==='fall')return t>.1&&[...sprites.values()].every(sp=>sp.dying||!sp.tw&&Math.abs(sp.y-sp.ty)<.001)||t>1.2;
  return t>=(DUR[st.type]??.2);
 }
 function finish(st){
  if(st.type==='end'){clearTimeout(resultTimer);resultTimer=setTimeout(()=>{if(!closed)result();},650);}
 }
 function afterMove(){
  hudUpdate();
  for(const id of s.combos)if(!announced.has(id)){announced.add(id);if(!practice)onDiscover(id);toast(`도감 · ${ALL_FORMS[id]?.name||'조합'} 발견`);}
 }
 function tween(sp,x,y,d){sp.tw={x0:sp.x,y0:sp.y,x1:x,y1:y,t:0,d};sp.tx=x;sp.ty=y;}
 function clear(st){
  let sx=0,sy=0;
  for(const c of st.cleared){const sp=sprites.get(c.id);if(sp&&!sp.dying)sp.dying=.001;if(vb[c.i]===c.id)vb[c.i]=null;sx+=cx(c.i);sy+=cy(c.i);
   if(st.cleared.length<40||c.sp)burstAt(c.i,c.law?PUZZLE_LOOK[c.law].color:SUN,c.sp?'burst':'hit');}
  for(const i of st.moss){vmoss[i]=0;burstAt(i,'#8fe070','split');}
  for(const {i,hp} of st.stones){vstone[i]=hp;burstAt(i,'#c9c2b0',hp?'hit':'burst');}
  for(const e of st.effects)drawEffect(e);
  for(const c of st.created){const sp=addSprite(c.cell,c.i%N,Math.floor(c.i/N));sp.pop=1;vb[c.i]=c.cell.id;}
  if(st.cleared.length){const n=st.cleared.length;floaters.push({text:`+${st.gained.toLocaleString()}`,x:sx/n,y:sy/n,t:0,color:st.combo>1?'#ffe08a':'#fff4d6',size:st.combo>1?1.25:1});}
  if(st.label)banner(st.label,st.effects.some(e=>e.kind==='combo')?'조합 효과':'');else if(st.combo>=3)banner(`연쇄 ×${st.combo}`,'');
  const law=st.effects.find(e=>e.law)?.law;
  audio?.play(st.effects.some(e=>e.kind==='combo')?'ultimate':st.effects.some(e=>e.kind==='sun')?'ultimateBurst':law?LAW_SOUND[law]||'hit':'hit',{pitch:Math.min(1.8,.9+st.combo*.1)});
  if(st.created.length)audio?.play(st.created.some(c=>c.cell.sp==='sun')?'ultimateReady':st.created.some(c=>c.cell.sp==='fusion')?'fusion':'pickup');
  if(st.effects.length)shake=Math.max(shake,st.effects.some(e=>e.big||e.kind==='sun')?.35:.16);
  hudUpdate();
 }
 function burstAt(i,color,kind){effects.push({e:{kind,x:cx(i),y:cy(i),radius:cs*.45},color,t:0,d:.4,unit:cs*.45});}
 function drawEffect(fx){
  const i=fx.i,x=cx(i),y=cy(i),unit=cs*.5,big=fx.big?1.5:1,add=(e,color,d=.5)=>effects.push({e,color,t:0,d,unit});
  const one=(law,color)=>{
   if(law==='burst')add({kind:'burst',x,y,radius:cs*1.5*big},color);
   else if(law==='pierce'){const v=fx.dir==='v';add({kind:'lance',law:'pierce',x:v?x:bx,y:v?by:y,tx:v?x:bx+cs*N,ty:v?by+cs*N:y},color);}
   else if(law==='recall')add({kind:'rewindTrace',law:'recall',x,y:by,tx:x,ty:by+cs*N},color,.6);
   else if(law==='frost'){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])add({kind:'frostWeb',law:'frost',x,y,tx:x+dx*cs*2.2*big,ty:y+dy*cs*2.2*big},color);add({kind:'burst',x,y,radius:cs*.8},color,.35);}
   else if(law==='gravity')add({kind:'well',x,y,radius:cs*2.2*big},color,.6);
   else if(law==='orbit')add({kind:'orbit',x,y,radius:cs*2.2*big},color,.55);
   else if(law==='reflect'){for(const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]])add({kind:'beam',law:'reflect',x,y,tx:x+dx*cs*N,ty:y+dy*cs*N},color,.45);add({kind:'reflect',x,y,radius:cs},color);}
   else if(law==='chain'||law==='split'){for(const j of fx.cells.slice(0,12))if(j!==i)add(law==='chain'?{kind:'chain',x,y,tx:cx(j),ty:cy(j)}:{kind:'split',x:cx(j),y:cy(j),radius:cs*.6},color,.45);}
  };
  if(fx.kind==='sun'||fx.kind==='combo'){add({kind:'sunburst',x,y,radius:cs*(fx.kind==='combo'?2.4:1.6)},SUN,.7);if(fx.kind==='sun')for(const j of fx.cells.slice(0,18))if(j!==i)add({kind:'chain',x,y,tx:cx(j),ty:cy(j)},SUN,.45);}
  if(fx.kind==='return'){const c=fx.i%N,x2=bx+(c+.5)*cs;add({kind:'rewindTrace',law:'recall',x:x2,y:by+cs*N,tx:x2,ty:by},PUZZLE_LOOK.recall.color,.6);return;}
  if(fx.law&&fx.kind!=='sun')one(fx.law,PUZZLE_LOOK[fx.law].color);
  if(fx.law2&&fx.law2!==fx.law)one(fx.law2,PUZZLE_LOOK[fx.law2].color);
 }

 // ── 그리기
 function update(dt){
  if(s){if(!cur&&queue.length){cur=queue.shift();begin(cur);}if(cur){curT+=dt;
   if(cur.type==='swap'&&!cur.ok&&!cur.back&&curT>=.15){cur.back=true;shake=.25;const A=spriteAt(cur.a),B=spriteAt(cur.b);if(A)tween(A,cur.a%N,Math.floor(cur.a/N),.14);if(B)tween(B,cur.b%N,Math.floor(cur.b/N),.14);}
  if(stepDone(cur,curT)){const st=cur;cur=null;finish(st);if(!queue.length)afterMove();}}}
  for(const [id,sp] of sprites){
   if(sp.tw){sp.tw.t+=dt;const k=clamp(sp.tw.t/sp.tw.d,0,1),e=k<.5?2*k*k:1-(-2*k+2)**2/2;sp.x=sp.tw.x0+(sp.tw.x1-sp.tw.x0)*e;sp.y=sp.tw.y0+(sp.tw.y1-sp.tw.y0)*e;if(k>=1){sp.tw=null;sp.vy=0;}}
   else if(sp.y<sp.ty){sp.vy=Math.min(26,sp.vy+60*dt);sp.y=Math.min(sp.ty,sp.y+sp.vy*dt);if(sp.y>=sp.ty)sp.vy=0;}
   else if(sp.y>sp.ty){sp.y=sp.ty;}
   if(sp.pop>0)sp.pop=Math.max(0,sp.pop-dt*3);
   if(sp.dying){sp.dying+=dt;if(sp.dying>.24)sprites.delete(id);}
  }
  for(let k=effects.length-1;k>=0;k--){effects[k].t+=dt;if(effects[k].t>=effects[k].d)effects.splice(k,1);}
  for(let k=floaters.length-1;k>=0;k--){floaters[k].t+=dt;if(floaters[k].t>1)floaters.splice(k,1);}
  shake=Math.max(0,shake-dt);
  if(canAct()&&!hint&&clock-idleAt>7)hint=findHint(s);
 }
 function drawBackdrop(){
  if(!backdrop){backdrop=document.createElement('canvas');backdrop.width=canvas.width;backdrop.height=canvas.height;const g=backdrop.getContext('2d');g.scale(dpr,dpr);
   g.fillStyle='#071215';g.fillRect(0,0,width,height);
   if(ready('back')){const im=images.back,k=Math.max(width/im.naturalWidth,height/im.naturalHeight);g.globalAlpha=.35;g.drawImage(im,(width-im.naturalWidth*k)/2,(height-im.naturalHeight*k)/2,im.naturalWidth*k,im.naturalHeight*k);g.globalAlpha=1;}
   const v=g.createRadialGradient(width/2,height/2,Math.min(width,height)*.2,width/2,height/2,Math.max(width,height)*.75);v.addColorStop(0,'#07121500');v.addColorStop(1,'#030809e6');g.fillStyle=v;g.fillRect(0,0,width,height);
   // 판 바닥: 조용한 돌 길 + 칸 무늬.
   const size=cs*N;g.save();g.beginPath();g.roundRect(bx-8,by-8,size+16,size+16,18);g.fillStyle='#0b1a1dee';g.fill();g.lineWidth=2;g.strokeStyle='#d9bd7466';g.stroke();g.clip();
   if(ready('floor')){g.globalAlpha=.55;g.drawImage(images.floor,bx,by,size,size);g.globalAlpha=1;}
   for(let r=0;r<N;r++)for(let c=0;c<N;c++){g.fillStyle=(r+c)%2?'#ffffff08':'#00000030';g.fillRect(bx+c*cs,by+r*cs,cs,cs);}
   g.restore();}
  ctx.drawImage(backdrop,0,0,width,height);
 }
 function drawStone(i,hp){
  const x=bx+(i%N)*cs,y=by+Math.floor(i/N)*cs,p=cs*.06;ctx.save();ctx.beginPath();ctx.roundRect(x+p,y+p,cs-p*2,cs-p*2,cs*.2);ctx.clip();
  if(ready('stone')){const im=images.stone,w=im.naturalWidth/3;ctx.drawImage(im,(i%3)*w,((i>>3)%3)*w,w,w,x,y,cs,cs);}else{ctx.fillStyle='#6b6a60';ctx.fillRect(x,y,cs,cs);}
  ctx.fillStyle='#0000002e';ctx.fillRect(x,y+cs*.6,cs,cs*.4);ctx.restore();
  ctx.lineWidth=2;ctx.strokeStyle='#e8dfc899';ctx.beginPath();ctx.roundRect(x+p,y+p,cs-p*2,cs-p*2,cs*.2);ctx.stroke();
  if(hp<stoneMax){ctx.strokeStyle='#1b1510aa';ctx.lineWidth=Math.max(1,cs*.025);ctx.beginPath();ctx.moveTo(x+cs*.3,y+cs*.18);ctx.lineTo(x+cs*.48,y+cs*.46);ctx.lineTo(x+cs*.36,y+cs*.62);ctx.lineTo(x+cs*.58,y+cs*.84);ctx.moveTo(x+cs*.48,y+cs*.46);ctx.lineTo(x+cs*.76,y+cs*.4);ctx.stroke();}
  if(stoneMax>1){ctx.fillStyle='#fff3cf';ctx.font=`bold ${Math.round(cs*.24)}px sans-serif`;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(String(hp),x+cs*.9,y+cs*.95);}
 }
 function drawSprite(sp,now){
  const x=bx+(sp.x+.5)*cs,y=by+(sp.y+.5)*cs;if(y<by-cs*.5)return;
  const k=sp.dying?Math.max(0,1-sp.dying/.24):1,scale=(sp.dying?1+sp.dying*1.2:1)*(1+sp.pop*.35),size=cs*scale;
  ctx.globalAlpha=k;
  if(sp.sp==='sun'){vfx.fx(ctx,'sigil',x,y,cs*1.3,{color:SUN,alpha:.55*k,rotation:now*.0012});vfx.fx(ctx,'star',x,y,cs*1.2,{color:SUN,alpha:.5*k,rotation:-now*.0008});ctx.globalAlpha=k;ctx.drawImage(sunTile(),x-size/2,y-size/2,size,size);ctx.globalAlpha=1;return;}
  const look=PUZZLE_LOOK[sp.law];if(!look){ctx.globalAlpha=1;return;}
  if(sp.sp)vfx.fx(ctx,'ring',x,y,cs*(1.15+.08*Math.sin(now*.006)),{color:look.color,alpha:.85*k});
  ctx.drawImage(tile(sp.law),x-size/2,y-size/2,size,size);
  if(sp.sp==='law'){
   ctx.strokeStyle='#fffbe8';ctx.lineWidth=Math.max(2,cs*.06);ctx.lineCap='round';
   if(sp.law==='pierce'||sp.law==='recall'){const v=sp.law==='recall'||sp.dir==='v',a=cs*.46,b=cs*.36,w=cs*.1;ctx.beginPath();
    if(v){ctx.moveTo(x-w,y-b);ctx.lineTo(x,y-a);ctx.lineTo(x+w,y-b);ctx.moveTo(x-w,y+b);ctx.lineTo(x,y+a);ctx.lineTo(x+w,y+b);}else{ctx.moveTo(x-b,y-w);ctx.lineTo(x-a,y);ctx.lineTo(x-b,y+w);ctx.moveTo(x+b,y-w);ctx.lineTo(x+a,y);ctx.lineTo(x+b,y+w);}ctx.stroke();}
   else for(let q=0;q<4;q++){const a=now*.002+q*Math.PI/2;vfx.fx(ctx,'star',x+Math.cos(a)*cs*.42,y+Math.sin(a)*cs*.42,cs*.34,{color:'#ffffff',alpha:.9*k});}
  }else if(sp.sp==='fusion'){const two=PUZZLE_LOOK[sp.law2]?.color||'#fff',a=now*.003;ctx.lineWidth=Math.max(2.5,cs*.08);ctx.lineCap='round';
   ctx.strokeStyle=look.color;ctx.beginPath();ctx.arc(x,y,cs*.5,a,a+Math.PI*.85);ctx.stroke();ctx.strokeStyle=two;ctx.beginPath();ctx.arc(x,y,cs*.5,a+Math.PI,a+Math.PI*1.85);ctx.stroke();
   ctx.globalAlpha=k;const m=cs*.34;ctx.drawImage(tile(sp.law2),x+cs*.18,y+cs*.18,m,m);}
  ctx.globalAlpha=1;
 }
 function draw(now){
  ctx.setTransform(dpr,0,0,dpr,0,0);drawBackdrop();
  if(!s)return;
  const sh=shake>0?Math.sin(now*.09)*shake*cs*.12:0;ctx.save();ctx.translate(sh,0);
  for(let i=0;i<N*N;i++)if(vmoss[i])ctx.drawImage(mossTile(),bx+(i%N)*cs,by+Math.floor(i/N)*cs,cs,cs);
  for(let i=0;i<N*N;i++)if(vstone[i])drawStone(i,vstone[i]);
  if(hint&&canAct()){const a=.35+.3*Math.sin(now*.008);for(const i of hint){ctx.fillStyle=`rgba(255,236,160,${a})`;ctx.beginPath();ctx.roundRect(bx+(i%N)*cs+2,by+Math.floor(i/N)*cs+2,cs-4,cs-4,cs*.2);ctx.fill();}}
  if(selected>=0){ctx.lineWidth=3;ctx.strokeStyle='#fff1b9';ctx.beginPath();ctx.roundRect(bx+(selected%N)*cs+2,by+Math.floor(selected/N)*cs+2,cs-4,cs-4,cs*.2);ctx.stroke();}
  // 판 밖(위)에서 떨어지는 씨앗은 판 안에서만 보이게.
  ctx.save();ctx.beginPath();ctx.rect(bx-4,by-2,cs*N+8,cs*N+cs);ctx.clip();
  for(const sp of sprites.values())if(!sp.dying)drawSprite(sp,now);
  for(const sp of sprites.values())if(sp.dying)drawSprite(sp,now);
  ctx.restore();
  if(keyboard&&cursor>=0&&canAct()){ctx.setLineDash([6,4]);ctx.lineWidth=2;ctx.strokeStyle='#9ee6ff';ctx.strokeRect(bx+(cursor%N)*cs+4,by+Math.floor(cursor/N)*cs+4,cs-8,cs-8);ctx.setLineDash([]);}
  for(const f of effects)vfx.effect(ctx,f.e,f.t/f.d,f.color,f.unit);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const f of floaters){ctx.globalAlpha=1-f.t;ctx.font=`bold ${Math.round(cs*.42*f.size)}px Georgia,'Malgun Gothic',serif`;ctx.lineWidth=4;ctx.strokeStyle='#1d1206';ctx.strokeText(f.text,f.x,f.y-f.t*cs*.8);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-f.t*cs*.8);}
  ctx.globalAlpha=1;ctx.restore();
 }
 function loop(now){raf=requestAnimationFrame(loop);if(closed||document.hidden||!pacer(now,60))return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;clock+=dt;update(dt);draw(now);}

 // ── HUD
 let bannerTimer=0;
 function banner(big,small){const b=$('.sp-banner');b.innerHTML=`<b>${escape(big)}</b>${small?`<small>${escape(small)}</small>`:''}`;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>b.classList.remove('pop'),1300);}
 let toastTimer=0;
 function toast(t){const el=$('.sp-toast');el.textContent=t;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1800);}
 const goalIcon=p=>p.kind==='collect'?lawArt(p.law,'sp-goal-art'):`<span class="sp-goal-ico sp-ico-${p.kind}" aria-hidden="true"></span>`;
 const goalName=p=>p.kind==='score'?'점수':p.kind==='collect'?LAWS[p.law].name:p.kind==='moss'?'이끼':'돌';
 function hudUpdate(){
  if(!s)return;$('.sp-no').textContent=def.daily?`오늘의 단계 · ${dayLabel(def.daily)}`:`단계 ${def.n}`;$('.sp-name').textContent=def.name;
  $('.sp-moves strong').textContent=s.movesLeft;$('.sp-moves').classList.toggle('low',s.movesLeft<=5);$('.sp-score strong').textContent=s.score.toLocaleString();
  const top=def.stars.at(-1)*1.08,bar=$('.sp-bar');bar.querySelector('i').style.width=`${clamp(s.score/top*100,0,100)}%`;
  bar.querySelectorAll('em').forEach(e=>e.remove());def.stars.forEach((v,k)=>{const em=document.createElement('em');em.style.left=`${v/top*100}%`;em.className=s.score>=v?'on':'';em.textContent='★';em.title=`${def.attack?k+1:k+2}번째 별 ${v.toLocaleString()}점`;bar.append(em);});
  $('.sp-goals').innerHTML=def.attack?`<li class="sp-attack">이동 ${def.moves}번 안에 최고 점수</li>`:puzzleGoalState(s).map(p=>`<li class="${p.have>=p.need?'done':''}">${goalIcon(p)}<span>${goalName(p)}</span><b>${p.kind==='score'?`${Math.min(p.have,p.need).toLocaleString()}/${p.need.toLocaleString()}`:`${p.have}/${p.need}`}</b></li>`).join('');
 }

 // ── 화면들
 function show(kind,html){modal.hidden=false;modal.dataset.kind=kind;modal.innerHTML=`<div class="sp-paper sp-${kind}">${html}</div>`;modal.querySelector('button')?.focus({preventScroll:true});}
 function menu(){
  root.classList.remove('sp-playing');s=null;queue=[];cur=null;clearTimeout(resultTimer);progress=readPuzzleProgress(storage,owner);
  const day=seoulDay(),daily=dailyPuzzleStage(day),dp=progress.daily.day===day?progress.daily:null;
  const card=d=>{const p=progress.stages[d.id],open=puzzleUnlocked(progress,d);return `<button class="sp-stage${p?.stars?' cleared':''}" data-stage="${d.id}" ${open?'':'disabled'} aria-label="단계 ${d.n} ${d.name}${open?'':' 잠김'}"><span class="sp-stage-n">${d.n}</span><b>${d.name}</b><span class="sp-stars">${open?starText(p?.stars||0):'🔒'}</span><small>${p?.best?`최고 ${p.best.toLocaleString()}`:open?'도전 전':'앞 단계를 깨면 열려요'}</small></button>`;};
  show('menu',`<p class="sp-eyebrow">SEED · PUZZLE</p><h1>씨앗 맞추기</h1><p class="sp-lead">같은 법칙 셋을 한 줄로 맞춰 터뜨리세요. 넷이면 <b>법칙 씨앗</b>, T·L 다섯이면 <b>융합 씨앗</b>, 다섯 한 줄이면 <b>햇살 씨앗</b>.</p>
   <button class="sp-daily" data-daily="${day}"><span><small>오늘의 단계 · ${dayLabel(day)}</small><b>이동 ${daily.moves}번 점수 도전</b></span><span class="sp-stars">${starText(dp?.stars||0)}</span><small>${dp?.best?`오늘 최고 ${dp.best.toLocaleString()}`:'오늘 누구나 같은 판'}</small></button>
   <div class="sp-stages">${PUZZLE_STAGES.map(card).join('')}</div>
   <div class="sp-row"><button class="sp-help-open">특수 씨앗 도움말</button><button class="sp-exit">돌아가기</button></div>
   <small>${practice?'연습 모드 · 햇살(JP)·도감 보상은 쌓이지 않아요.':`첫 깨기 햇살 ${PUZZLE_JP.firstClear(1)}~${PUZZLE_JP.firstClear(10)} JP · 새 별마다 ${PUZZLE_JP.newStar} JP · 오늘의 단계 첫 별 ${PUZZLE_JP.daily} JP · 조합 효과를 처음 쓰면 도감에 남아요.`}</small>`);
  modal.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>intro(PUZZLE_STAGE_BY_ID[b.dataset.stage]));
  modal.querySelector('[data-daily]').onclick=()=>intro(daily);modal.querySelector('.sp-help-open').onclick=help;modal.querySelector('.sp-exit').onclick=close;
 }
 function goalLines(d){const g=d.goal,out=[];if(d.attack)out.push(`이동 ${d.moves}번 안에 최고 점수 · 별 ${d.stars.map(v=>v.toLocaleString()).join(' / ')}점`);
  if(g.score)out.push(`점수 ${g.score.toLocaleString()}점`);for(const c of g.collect||[])out.push(`${lawArt(c.law,'sp-goal-art')} ${LAWS[c.law].name} ${c.count}개 모으기`);
  if(g.moss)out.push(`<span class="sp-goal-ico sp-ico-moss"></span> 이끼 ${d.moss.length}칸 모두 걷기`);if(g.stone)out.push(`<span class="sp-goal-ico sp-ico-stone"></span> 돌 ${d.stones.length}개 모두 깨기${d.stoneHp>1?` (${d.stoneHp}번씩)`:''}`);
  if(!d.attack)out.push(`이동 ${d.moves}번 · 별 ★★ ${d.stars[0].toLocaleString()} · ★★★ ${d.stars[1].toLocaleString()}점`);return out;}
 function intro(d){
  show('intro',`<p class="sp-eyebrow">${d.daily?`오늘의 단계 · ${dayLabel(d.daily)}`:`단계 ${d.n}`}</p><h1>${escape(d.name)}</h1><ul class="sp-goal-list">${goalLines(d).map(l=>`<li>${l}</li>`).join('')}</ul><p class="sp-tip">${escape(d.tip)}</p>
   <div class="sp-row"><button class="sp-primary sp-go">시작</button><button class="sp-to-menu">단계 고르기</button></div>`);
  modal.querySelector('.sp-go').onclick=()=>start(d);modal.querySelector('.sp-to-menu').onclick=menu;
 }
 function pause(){if(!s||s.phase!=='play'||!modal.hidden)return;show('pause',`<p class="sp-eyebrow">일시정지</p><h1>${escape(def.name)}</h1><ul class="sp-goal-list">${goalLines(def).map(l=>`<li>${l}</li>`).join('')}</ul>
  <div class="sp-row"><button class="sp-primary sp-resume">계속하기</button><button class="sp-restart">처음부터</button><button class="sp-help-open">도움말</button><button class="sp-to-menu">단계 고르기</button></div><small>처음부터·단계 고르기를 누르면 이번 판은 기록되지 않아요.</small>`);
  modal.querySelector('.sp-resume').onclick=resume;modal.querySelector('.sp-restart').onclick=()=>start(def);modal.querySelector('.sp-help-open').onclick=()=>help(pause);modal.querySelector('.sp-to-menu').onclick=menu;}
 function resume(){modal.hidden=true;idleAt=clock;}
 function help(back=menu){
  const shapes=Object.keys(PUZZLE_LOOK).map(id=>`<li>${lawArt(id,'sp-help-art')}<span><b style="color:${PUZZLE_LOOK[id].color}">${LAWS[id].name}</b> ${PUZZLE_SPECIAL_TEXT[id]}</span></li>`).join('');
  show('help',`<p class="sp-eyebrow">도움말</p><h1>특수 씨앗</h1><ul class="sp-rules"><li><b>넷 한 줄</b> → 그 법칙의 <b>법칙 씨앗</b>(반짝이는 테두리)</li><li><b>T·L 모양 다섯</b> → <b>융합 씨앗</b>: 두 법칙 모양이 한꺼번에</li><li><b>다섯 한 줄</b> → <b>햇살 씨앗</b>: 바꾼 씨앗과 같은 법칙을 모두 터뜨려요</li><li><b>특수 씨앗끼리 바꾸기</b> → <b>조합 효과</b>: 두 모양을 크게 합쳐요. 이름은 SEED 도감의 조합 이름이에요</li><li>햇살 + 특수 씨앗 → 그 법칙이 모두 특수 씨앗이 되어 터져요 · 햇살끼리 → 판 전체</li></ul>
   <h3>법칙 씨앗이 터지는 모양</h3><ul class="sp-shapes">${shapes}</ul><div class="sp-row"><button class="sp-primary sp-back">돌아가기</button></div>`);
  modal.querySelector('.sp-back').onclick=()=>back();}
 function result(){
  const record=recordPuzzleResult(progress,s),won=s.phase==='won';progress=record.progress;const saved=writePuzzleProgress(storage,progress,owner);
  let jpNote='';if(record.jp>0)jpNote=practice?`연습 · 햇살 ${record.jp} JP는 쌓이지 않아요`:(onCredit(record.jp)||`햇살 ${record.jp} JP 적립`);
  const next=!def.daily&&PUZZLE_STAGES[def.n]&&puzzleUnlocked(progress,PUZZLE_STAGES[def.n])?PUZZLE_STAGES[def.n]:null;
  const combos=s.combos.map(id=>ALL_FORMS[id]?.name).filter(Boolean);
  show('result',`<p class="sp-eyebrow">${won?(def.attack?'FINISH':'CLEAR'):'MOVES OUT'}</p><h1>${won?(def.attack?'도전 끝!':'단계 성공!'):'이동을 다 썼어요'}</h1>
   <p class="sp-result-stars" aria-label="별 ${record.stars}개">${[0,1,2].map(k=>`<span class="${k<record.stars?'on':''}" style="animation-delay:${.15+k*.22}s">★</span>`).join('')}</p>
   <p class="sp-result-score">${s.score.toLocaleString()}점${s.bonus?` <small>(남은 이동 보너스 ${s.bonus.toLocaleString()})</small>`:''}</p>
   ${won?'':`<ul class="sp-goal-list">${puzzleGoalState(s).filter(p=>p.have<p.need).map(p=>`<li>${goalIcon(p)} ${goalName(p)} ${p.kind==='score'?(p.need-p.have).toLocaleString()+'점':p.need-p.have+'개'} 모자랐어요</li>`).join('')}</ul>`}
   ${record.notes.length||jpNote?`<p class="sp-reward">${escape([...record.notes,jpNote].filter(Boolean).join(' · '))}</p>`:''}
   ${combos.length?`<p class="sp-combos">이번 판 조합 효과 · ${combos.map(escape).join(' · ')}</p>`:''}
   <p class="sp-meta">최대 연쇄 ×${s.maxCombo} · 법칙 씨앗 ${s.created.law} · 융합 ${s.created.fusion} · 햇살 ${s.created.sun}${saved?'':' · 이 기기에 저장하지 못했어요'}</p>
   <div class="sp-row">${next?'<button class="sp-primary sp-next">다음 단계</button>':''}<button class="${next?'':'sp-primary '}sp-again">다시 하기</button><button class="sp-to-menu">단계 고르기</button></div>`);
  if(next)modal.querySelector('.sp-next').onclick=()=>intro(next);modal.querySelector('.sp-again').onclick=()=>start(def);modal.querySelector('.sp-to-menu').onclick=menu;
  audio?.play(won?'evolve':'hurt');
 }

 resize();menu();raf=requestAnimationFrame(loop);
 return {close,
  // 로컬 검증용(화면 시연): 지금 판 상태.
  debug:()=>({stage:def?.id||null,phase:s?.phase||null,score:s?.score||0,moves:s?.movesLeft??null,busy:Boolean(cur||queue.length),sprites:sprites.size,modal:modal.hidden?null:modal.dataset.kind,
   hint:s?findHint(s):null,board:{x:bx,y:by,cell:cs},plant:(i,o)=>{if(!s||!s.cells[i])return false;Object.assign(s.cells[i],o);Object.assign(sprites.get(s.cells[i].id),o);return true;},start:id=>{const d=id==='daily'?dailyPuzzleStage(seoulDay()):PUZZLE_STAGE_BY_ID[id];if(d)start(d);},move:(a,b)=>tryMove(a,b)})};
}
