import {PUZZLE,PUZZLE_STAGES,PUZZLE_STAGE_BY_ID,PUZZLE_POWERS,PUZZLE_TOOLS,PUZZLE_SHOP,PUZZLE_JP,createPuzzle,playPuzzleMove,tapPuzzle,usePuzzleTool,continuePuzzle,giveUpPuzzle,canTap,findHint,
 puzzleGoalState,puzzleStreakGift,puzzleStreakCounts,dailyPuzzleStage,seoulDay,puzzleSaveKey,readPuzzleProgress,writePuzzleProgress,recordPuzzleResult,puzzleUnlocked,breakPuzzleStreak,
 PUZZLE_LIVES,puzzleLives,takePuzzleLife,refundPuzzleLife,refillPuzzleLives,puzzleStarsEarned} from './seed-puzzle-rules.js';
import {DECOR,DECOR_AREAS,decorAreaIndex,decorTasks,decorStars,canDecorate,decorate} from './garden-decor.js';
import {createPuzzleGarden} from './seed-puzzle-garden.js';
import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';
import {createCanvasVfx} from './canvas-vfx.js';
import {lawArt} from './law-art.js';
import {createFramePacer} from './frame-time.js';
import './choice.css';
import './seed-puzzle.css';

// 씨앗 맞추기 화면. 규칙은 seed-puzzle-rules.js 가 정하고, 여기서는 그 결과(steps)를 차례로 그린다.
// 보통 씨앗: 불투명한 색과 실루엣. 내부 법칙 그림/유리 테두리는 쓰지 않는다.
// 특수 씨앗: 한 가지 큰 동작 표시를 가진 원판.
// 2026-09-28 로열 매치 참고: 특수 씨앗은 눌러서 바로 터뜨린다 · 연출 중에도 다음 수를 둘 수 있다(남은 연출을 건너뛰고 바로 둔다) · 연출을 빠르게.
const BASE=import.meta.env.BASE_URL;
const N=PUZZLE.size;
export const PUZZLE_LOOK=Object.freeze({
 burst:{color:'#ff5b4a',shape:'square'},split:{color:'#ff9ec4',shape:'flower'},chain:{color:'#ffd23f',shape:'triangle'},
 pierce:{color:'#b6f24a',shape:'diamond'},orbit:{color:'#4fd77a',shape:'circle'},recall:{color:'#3fd6c0',shape:'shield'},
 frost:{color:'#e6fbff',shape:'hexagon'},reflect:{color:'#4aa8ff',shape:'octagon'},gravity:{color:'#b57bff',shape:'pentagon'},
});
// 특수 씨앗: 캐릭터 칸(4×3 아틀라스)과 빛깔.
const POWER_LOOK=Object.freeze({pierce:{tile:4,color:'#7fd3ff',sound:'pierceHit'},chain:{tile:2,color:'#ffd23f',sound:'chain'},burst:{tile:5,color:'#ff7a4a',sound:'burstHit'},sun:{tile:-1,color:'#ffd873',sound:'ultimateBurst'}});
const SUN='#ffd873';
const TOOL_ICON={hammer:'✂',row:'⇆',col:'⇅',shuffle:'↻'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const escape=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const starText=n=>'★'.repeat(n)+'☆'.repeat(Math.max(0,3-n));
const dayLabel=d=>`${d.slice(4,6)}.${d.slice(6,8)}`;
const jpText=n=>`${n.toLocaleString()} JP`;

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

// wallet(): 지금 햇살(JP). onSpend(jp): 햇살을 쓰고 성공하면 true. 연습(practice)에서는 돈을 받지 않고 모두 무료.
// garden: {get(), set(next)} — SEED 정원 저장(정원 가꾸기가 여기에 꾸민 것을 남긴다). onOpenGarden(): 3D 정원 화면으로.
export function mountSeedPuzzle({host=document.body,audio,storage=null,owner='guest',practice=false,wallet=()=>0,onSpend=()=>false,onCredit=()=>'',onDiscover=()=>{},onPlayed=()=>'',onResult=()=>'',onRanking=()=>{},garden=null,onOpenGarden=null,onSaveAccount=null,onClose=()=>{}}={}){
 // Developer practice starts from the player's record but never changes it.
 if(practice){const key=puzzleSaveKey(owner),data=new Map([[key,JSON.stringify(readPuzzleProgress(storage,owner))]]);storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};let sample=JSON.parse(JSON.stringify(garden?.get?.()||{plots:[],decor:[],puzzleStars:0}));garden={get:()=>sample,set:next=>{sample=next;}};}
 const root=document.createElement('section');root.id='seed-puzzle';root.setAttribute('aria-label','씨앗 맞추기');
 root.innerHTML=`<canvas aria-label="씨앗 맞추기 판"></canvas>
 <aside class="sp-hud"><div class="sp-head"><button class="sp-pause" aria-label="일시정지">Ⅱ</button><div><small class="sp-no"></small><b class="sp-name"></b></div></div>
 <div class="sp-stats"><div class="sp-moves"><small>남은 이동</small><strong></strong></div><div class="sp-score"><small>점수</small><strong></strong></div></div>
 <div class="sp-bar" aria-hidden="true"><i></i></div><ul class="sp-goals" aria-label="목표"></ul><p class="sp-keys">끌어서 바꾸기 · 특수 씨앗은 눌러서 터뜨리기 · 방향키+Space 바꾸기 · Enter 터뜨리기 · H 힌트 · Esc 일시정지</p></aside>
 <nav class="sp-toolbar" aria-label="판 안 도구"><span class="sp-wallet"></span>${Object.values(PUZZLE_TOOLS).map(t=>`<button data-tool="${t.id}" title="${t.name} · ${t.text}"><i aria-hidden="true">${TOOL_ICON[t.id]}</i><b>${t.name}</b><small>${practice?'연습 무료':jpText(PUZZLE_SHOP.tools[t.id])}</small></button>`).join('')}</nav>
 <aside class="sp-garden-panel" aria-label="정원 가꾸기" hidden></aside>
 <div class="sp-banner" aria-hidden="true"></div><p class="sp-toast" role="status" aria-live="polite"></p><div class="sp-modal"></div>`;
 host.append(root);document.body.classList.add('seed-puzzle-open');
 const $=q=>root.querySelector(q),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),hud=$('.sp-hud'),toolbar=$('.sp-toolbar'),modal=$('.sp-modal'),listeners=[];
 const listen=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const vfx=createCanvasVfx(),pacer=createFramePacer(),images={};
 const load=(k,f)=>{const im=new Image();im.onload=()=>{tiles.clear();backdrop=null;};im.src=BASE+f;images[k]=im;};
 const ready=k=>images[k]?.complete&&images[k].naturalWidth>0;
 load('stone','assets/garden-stone-v4.png');load('back','assets/garden-sanctuary-v2.webp');
 let progress=readPuzzleProgress(storage,owner),def=null,s=null,closed=false,raf=0,last=0,clock=0,width=1,height=1,dpr=1,bx=0,by=0,cs=40,backdrop=null,stoneMax=1;
 // 화면 쪽 판: 칸마다 보이는 씨앗 id. 규칙의 판은 한 수에 끝까지 가 있고, 화면은 steps 를 따라 뒤따라간다.
 let vb=[],vmoss=[],vstone=[],vvine=[],visibleScore=0,visibleMoves=0;
 const sprites=new Map(),effects=[],floaters=[],tiles=new Map();
 const STAGE_PAGE=50;let stagePage=null;
 let queue=[],cur=null,curT=0,selected=-1,cursor=-1,drag=null,idleAt=0,hint=null,shake=0,announced=new Set(),resultTimer=0,keyboard=false,armed=null,picks=new Set();
 function close(){if(closed)return;quitRun();closed=true;cancelAnimationFrame(raf);clearTimeout(resultTimer);clearInterval(ticker);for(const off of listeners)off();root.remove();document.body.classList.remove('seed-puzzle-open');onClose();}

 // ── 정원 · 도전 씨앗
 // 정원 저장은 본편(main)이 가진 것을 쓴다. 따로 붙지 않은 화면(시험)에서는 이 화면 안에서만 기억한다.
 let localGarden={plots:[],decor:[],puzzleStars:0},gardenMode=false,fresh={},runLife=false;
 const getGarden=()=>garden?.get?.()||localGarden;
 const setGarden=next=>{if(garden?.set)garden.set(next);else localGarden=next;};
 const painter=createPuzzleGarden({base:BASE});
 const earnedStars=()=>Math.max(puzzleStarsEarned(progress),getGarden().puzzleStars||0);
 const starWallet=()=>decorStars(earnedStars(),getGarden().decor);
 // 모은 별을 정원 저장에도 남긴다(다른 기기에서 꾸밀 때 같은 별을 쓰도록 · 큰 쪽).
 function syncGardenStars(){const g=getGarden(),earned=puzzleStarsEarned(progress);if(earned>(g.puzzleStars||0))setGarden({...g,puzzleStars:earned});}
 const clockText=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
 const livesNow=()=>puzzleLives(progress,Date.now());
 const livesLine=()=>{const l=livesNow();return `${'●'.repeat(l.lives)}${'○'.repeat(PUZZLE_LIVES.max-l.lives)} ${l.lives}/${PUZZLE_LIVES.max}${l.full?'':` · 다음 씨앗 ${clockText(l.nextIn)}`}`;};
 // 남은 시간 표시는 1초마다 다시 적는다(보이는 곳만).
 const ticker=setInterval(()=>{root.querySelectorAll('[data-lives]').forEach(el=>{el.textContent=livesLine();});const go=root.querySelector('[data-needs-life]');if(go&&livesNow().lives>0){go.removeAttribute('data-needs-life');go.disabled=false;}},1000);

 // ── 햇살 쓰기
 function pay(jp,what){if(practice)return true;if(wallet()<jp){toast(`햇살이 모자라요 · ${what} ${jpText(jp)}`);return false;}const ok=onSpend(jp)===true;if(!ok)toast('햇살을 쓰지 못했어요');walletUpdate();return ok;}
 function walletUpdate(){$('.sp-wallet').textContent=practice?'연습 · 도구 무료':`햇살 ${jpText(wallet())}`;}

 // ── 배치
 function resize(){
  const r=root.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  root.classList.toggle('sp-wide',width>=height*1.15);const h=hud.getBoundingClientRect(),t=toolbar.getBoundingClientRect(),wide=root.classList.contains('sp-wide');let size;
  if(wide){const left=Math.max(h.right,t.right)+14,avail=width-left-14;size=Math.min(avail,height-20,820);bx=left+(avail-size)/2;by=(height-size)/2;}
  else{const top=h.bottom+10,avail=height-top-(height-t.top)-12;size=Math.min(width-20,avail);bx=(width-size)/2;by=top+Math.max(0,(avail-size)/2);}
  size=Math.max(160,size);cs=size/N;tiles.clear();backdrop=null;
 }
 listen(window,'resize',()=>resize());
 const cx=i=>bx+(i%N+.5)*cs,cy=i=>by+(Math.floor(i/N)+.5)*cs;
 const cellAt=(x,y)=>{const c=Math.floor((x-bx)/cs),r=Math.floor((y-by)/cs);return c>=0&&c<N&&r>=0&&r<N?r*N+c:-1;};

 // ── 씨앗 그림(크기마다 한 번 굽는다)
 const bake=(key,paint)=>{let c=tiles.get(key+cs);if(c)return c;const px=Math.max(8,Math.round(cs*dpr));c=document.createElement('canvas');c.width=c.height=px;paint(c.getContext('2d'),px);tiles.set(key+cs,c);return c;};
 const tile=law=>bake(law,(g,px)=>{
  const look=PUZZLE_LOOK[law],r=px*.44,x=px/2,y=px/2;
  g.save();shapePath(g,look.shape,x,y,r);g.clip();
  g.fillStyle=look.color;g.fillRect(0,0,px,px);
  const shade=g.createLinearGradient(0,0,0,px);shade.addColorStop(0,'#ffffff24');shade.addColorStop(.45,'#ffffff00');shade.addColorStop(1,'#00000035');g.fillStyle=shade;g.fillRect(0,0,px,px);
  g.restore();
  shapePath(g,look.shape,x,y,r);g.lineWidth=Math.max(1.5,px*.025);g.strokeStyle='#172d32';g.stroke();
 });
 // 특수 씨앗 원판: 조용한 바탕 + 큰 동작 표시 하나.
 const powerTile=sp=>bake('p'+sp,(g,px)=>{
  const look=POWER_LOOK[sp],x=px/2,r=px*.45;
  g.fillStyle=look.color;g.beginPath();g.arc(x,x,r,0,Math.PI*2);g.fill();
  g.lineWidth=px*.035;g.strokeStyle='#fff2c5';g.stroke();
  g.fillStyle='#17323b';g.strokeStyle='#17323b';g.lineWidth=px*.09;g.lineCap='round';
  if(sp==='pierce'){g.beginPath();g.moveTo(x-r*.58,x);g.lineTo(x+r*.58,x);g.moveTo(x+r*.22,x-r*.3);g.lineTo(x+r*.58,x);g.lineTo(x+r*.22,x+r*.3);g.stroke();}
  else if(sp==='chain'){g.beginPath();g.moveTo(x+r*.14,x-r*.64);g.lineTo(x-r*.38,x+r*.08);g.lineTo(x+r*.02,x+r*.08);g.lineTo(x-r*.14,x+r*.64);g.lineTo(x+r*.38,x-r*.08);g.lineTo(x-r*.02,x-r*.08);g.closePath();g.fill();}
  else{shapePath(g,sp==='sun'?'flower':'diamond',x,x,r*.54);g.fill();}
 });
 const mossTile=()=>bake('moss',(g,px)=>{
  g.fillStyle='#2f6b2fcc';g.beginPath();g.roundRect(px*.04,px*.04,px*.92,px*.92,px*.18);g.fill();
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let k=0;k<22;k++){g.fillStyle=k%3?'#6fbf4a99':'#a8e0666e';g.beginPath();g.arc(px*(.12+rnd()*.76),px*(.12+rnd()*.76),px*(.04+rnd()*.07),0,Math.PI*2);g.fill();}
 });
 const vineTile=()=>bake('vine',(g,px)=>{
  g.lineCap='round';g.strokeStyle='#2d5a1ecc';g.lineWidth=px*.1;
  for(const [a,b,c,d] of [[.1,.3,.9,.7],[.1,.7,.9,.3],[.3,.05,.7,.95]]){g.beginPath();g.moveTo(px*a,px*b);g.bezierCurveTo(px*.5,px*(b<.5?.1:.9),px*.5,px*(d<.5?.1:.9),px*c,px*d);g.stroke();}
  g.strokeStyle='#8fcf5a';g.lineWidth=px*.045;for(const [a,b,c,d] of [[.1,.3,.9,.7],[.1,.7,.9,.3]]){g.beginPath();g.moveTo(px*a,px*b);g.bezierCurveTo(px*.5,px*(b<.5?.1:.9),px*.5,px*(d<.5?.1:.9),px*c,px*d);g.stroke();}
  g.fillStyle='#6fbf4a';for(const [a,b] of [[.2,.25],[.78,.7],[.5,.5],[.3,.8]]){g.beginPath();g.ellipse(px*a,px*b,px*.08,px*.045,a*6,0,Math.PI*2);g.fill();}
 });

 // ── 단계 시작
 function start(d,boosters=[]){
  def=d;s=createPuzzle(d,d.daily?d.seed:(Date.now()^Math.floor(Math.random()*1e9))>>>0,boosters);
  visibleScore=s.score;visibleMoves=s.movesLeft;
  sprites.clear();effects.length=floaters.length=0;queue=[];cur=null;selected=cursor=-1;drag=null;hint=null;announced=new Set();shake=0;armed=null;
  vb=s.cells.map(c=>c?.id??null);vmoss=[...s.moss];vstone=[...s.stone];vvine=[...s.vine];stoneMax=Math.max(1,...d.stones.map(x=>x.hp));
  // 시작할 때 씨앗이 위에서 쏟아진다(아래 줄부터 먼저 닿게 조금씩 엇갈려).
  for(let i=0;i<N*N;i++){const c=s.cells[i],r=Math.floor(i/N);if(c)addSprite(c,i%N,r-N-1-(N-r)*.35).ty=r;}
  modal.hidden=true;root.classList.add('sp-playing');resize();hudUpdate();walletUpdate();idleAt=clock;audio?.unlock?.();
  if(s.boosters.length)toast(`시작 선물 · ${s.boosters.map(id=>PUZZLE_POWERS[id].name).join(' · ')}`);
 }
 function addSprite(c,x,y){const sp={id:c.id,law:c.law,sp:c.sp,dir:c.dir,x,y,tx:x,ty:y,vy:0,tw:null,pop:0,dying:0};sprites.set(c.id,sp);return sp;}
 const spriteAt=i=>vb[i]!=null?sprites.get(vb[i]):null;
 // 연출을 건너뛰고 화면을 규칙의 판과 맞춘다(연출 중에 다음 수를 두면).
 function snap(){
  if(!cur&&!queue.length)return;
  const rest=[...(cur?[cur]:[]),...queue];queue=[];cur=null;
  for(const st of rest)if(st.type==='clear'){for(const e of st.effects)drawEffect(e);}
  vb=s.cells.map(c=>c?.id??null);vmoss=[...s.moss];vstone=[...s.stone];vvine=[...s.vine];
  const keep=new Set(vb.filter(v=>v!=null));for(const [id,sp] of sprites)if(!keep.has(id)&&!sp.dying)sp.dying=.001;
  for(let i=0;i<N*N;i++){const c=s.cells[i];if(!c)continue;let sp=sprites.get(c.id);if(!sp)sp=addSprite(c,i%N,Math.floor(i/N)-1);Object.assign(sp,{law:c.law,sp:c.sp,src:c.src,dir:c.dir,tx:i%N,ty:Math.floor(i/N),tw:null});sp.x=sp.tx;if(sp.y>sp.ty)sp.y=sp.ty;}
  afterMove();
 }

 // ── 입력
 const canAct=()=>s&&s.phase==='play'&&modal.hidden;
 const busy=()=>Boolean(cur||queue.length);
 function run(res){if(!res.ok){if(res.reason)toast(res.reason);audio?.play('shotArc',{pitch:.6});}visibleMoves=s.phase==='won'?s.leftAtWin:s.movesLeft;queue.push(...res.steps);selected=-1;hint=null;idleAt=clock;hudUpdate();}
 function tryMove(a,b){if(!canAct()||a<0||b<0)return;snap();run(playPuzzleMove(s,a,b));}
 function tryTap(i){if(!canAct())return;snap();if(!canTap(s,i))return;run(tapPuzzle(s,i));}
 function tryTool(tool,i){if(!canAct())return;snap();if(!pay(PUZZLE_SHOP.tools[tool],PUZZLE_TOOLS[tool].name))return;armed=null;toolbarUpdate();run(usePuzzleTool(s,tool,i));audio?.play('pickup');}
 function arm(tool){if(!canAct())return;if(tool==='shuffle'){tryTool('shuffle',0);return;}armed=armed===tool?null:tool;selected=-1;toolbarUpdate();if(armed)toast(`${PUZZLE_TOOLS[armed].name} · 쓸 칸을 눌러요`);}
 function toolbarUpdate(){toolbar.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('armed',b.dataset.tool===armed));root.classList.toggle('sp-armed',!!armed);}
 toolbar.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>arm(b.dataset.tool));
 const neighbor=(a,b)=>a>=0&&b>=0&&Math.abs(a%N-b%N)+Math.abs(Math.floor(a/N)-Math.floor(b/N))===1;
 listen(canvas,'pointerdown',e=>{if(!canAct())return;audio?.unlock?.();keyboard=false;const i=cellAt(e.offsetX,e.offsetY);if(i<0)return;e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
  if(armed){tryTool(armed,i);return;}
  if(selected>=0&&neighbor(selected,i)){tryMove(selected,i);return;}drag={i,x:e.offsetX,y:e.offsetY,id:e.pointerId};});
 listen(canvas,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.hypot(dx,dy)<cs*.35)return;
  const c=drag.i%N,r=Math.floor(drag.i/N),to=Math.abs(dx)>Math.abs(dy)?(dx>0?(c<N-1?drag.i+1:-1):(c>0?drag.i-1:-1)):(dy>0?(r<N-1?drag.i+N:-1):(r>0?drag.i-N:-1));const from=drag.i;drag=null;if(to>=0)tryMove(from,to);});
 // 끌지 않고 뗐으면: 특수 씨앗은 터뜨리고, 보통 씨앗은 고르기(다음에 이웃을 누르면 바꾼다).
 listen(canvas,'pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const i=drag.i;drag=null;if(s&&canTap(s,i)){tryTap(i);return;}selected=selected===i?-1:(spriteAt(i)?i:-1);});
 listen(canvas,'pointercancel',()=>{drag=null;});
 const KEYS={ArrowLeft:-1,ArrowRight:1,ArrowUp:-N,ArrowDown:N};
 listen(window,'keydown',e=>{
  if(e.target?.closest?.('input,textarea'))return;
  if(e.code==='Escape'&&gardenMode&&modal.hidden){e.preventDefault();leaveGarden();return;}
  if(e.code==='Escape'){e.preventDefault();if(armed){armed=null;toolbarUpdate();return;}const k=modal.hidden?null:modal.dataset.kind;if(k==='pause'){resume();return;}if(k==='menu'){close();return;}if(k==='out')return;if(k){menu();return;}pause();return;}
  if(!canAct())return;
  if(e.code==='KeyH'){snap();hint=findHint(s);idleAt=clock-99;return;}
  if(KEYS[e.code]!==undefined){e.preventDefault();keyboard=true;if(cursor<0)cursor=selected>=0?selected:27;const d=KEYS[e.code],next=cursor+d;if(Math.abs(d)===1&&Math.floor(next/N)!==Math.floor(cursor/N)||next<0||next>=N*N)return;
   if(selected>=0&&selected===cursor){tryMove(cursor,next);cursor=next;return;}cursor=next;return;}
  if(e.code==='Enter'){e.preventDefault();keyboard=true;if(cursor>=0&&armed){tryTool(armed,cursor);return;}if(cursor>=0&&canTap(s,cursor))tryTap(cursor);return;}
  if(e.code==='Space'){e.preventDefault();keyboard=true;if(cursor<0){cursor=27;return;}if(armed){tryTool(armed,cursor);return;}if(selected>=0&&neighbor(selected,cursor)){tryMove(selected,cursor);return;}selected=selected===cursor?-1:cursor;}
 });
 $('.sp-pause').onclick=()=>pause();

 // ── steps 재생(로열 매치처럼 빠르게)
 const DUR={swap:.12,bad:.28,clear:.22,shuffle:.45,bonus:.7,suntime:.7,'bonus-score':.7,end:.2,out:.25};
 function begin(st){
  curT=0;
  if(st.type==='swap'){const A=spriteAt(st.a),B=spriteAt(st.b);if(!A||!B)return;tween(A,st.b%N,Math.floor(st.b/N),st.ok?DUR.swap:.13);tween(B,st.a%N,Math.floor(st.a/N),st.ok?DUR.swap:.13);
   if(st.ok){[vb[st.a],vb[st.b]]=[vb[st.b],vb[st.a]];audio?.play('shotPetal');}}
  else if(st.type==='clear')clear(st);
  else if(st.type==='fall'){vb=st.cells.map(c=>c?.id??null);vstone=[...st.stone];vvine=[...st.vine];
   const from=new Map(st.spawns.map(p=>[p.id,p.fromRow]));
   for(let i=0;i<N*N;i++){const c=st.cells[i];if(!c)continue;let sp=sprites.get(c.id);if(!sp)sp=addSprite(c,i%N,from.get(c.id)??-1);Object.assign(sp,{law:c.law,sp:c.sp,src:c.src,dir:c.dir,tx:i%N,ty:Math.floor(i/N)});if(!sp.tw&&sp.x!==sp.tx)tween(sp,sp.tx,sp.ty,.1);}}
  else if(st.type==='shuffle'){vb=st.cells.map(c=>c?.id??null);const keep=new Set(vb);
   for(const [id,sp] of sprites)if(!keep.has(id)&&!sp.dying)sp.dying=.001;
   for(let i=0;i<N*N;i++){const c=st.cells[i];if(!c)continue;let sp=sprites.get(c.id);if(!sp){sp=addSprite(c,i%N,Math.floor(i/N));sp.pop=1;}tween(sp,i%N,Math.floor(i/N),DUR.shuffle*.8);}
   banner('섞는 중…','');}
  else if(st.type==='bonus'){if(st.moves)banner('햇살 타임!',`남은 이동 ${st.moves}번이 특수 씨앗이 돼요`);audio?.play('pickup');}
  // 햇살 타임: 작은 변환 파동마다 남은 이동과 실제 누적 점수를 표시한다.
  else if(st.type==='suntime'){visibleMoves=st.remaining;for(const i of st.cells){const c=st.board[i];const sp=c&&sprites.get(c.id);if(sp){Object.assign(sp,{law:c.law,sp:c.sp,dir:c.dir});sp.pop=1;}burstAt(i,SUN,'hit');}audio?.play('evolve');hudUpdate();}
  else if(st.type==='bonus-score'){visibleScore=st.score;visibleMoves=0;if(st.gained)banner('이동 보너스',`+${st.gained.toLocaleString()}점`);hudUpdate();}
  else if(st.type==='end'||st.type==='out'){visibleScore=s.score;visibleMoves=s.movesLeft;hudUpdate();}
 }
 function stepDone(st,t){
  if(st.type==='swap')return t>=(st.ok?DUR.swap:DUR.bad);
  if(st.type==='fall')return t>.08&&[...sprites.values()].every(sp=>sp.dying||!sp.tw&&Math.abs(sp.y-sp.ty)<.001)||t>1;
  return t>=(DUR[st.type]??.2);
 }
 function finish(st){
  if(st.type==='end'){clearTimeout(resultTimer);resultTimer=setTimeout(()=>{if(!closed)result();},650);}
  if(st.type==='out'){clearTimeout(resultTimer);resultTimer=setTimeout(()=>{if(!closed)offerMoves(st);},350);}
 }
 function afterMove(){
  visibleScore=s.score;visibleMoves=s.movesLeft;
  hudUpdate();
  for(const id of s.combos)if(!announced.has(id)){announced.add(id);if(!practice)onDiscover(id);toast(`도감 · ${ALL_FORMS[id]?.name||'조합'} 발견`);}
 }
 function tween(sp,x,y,d){sp.tw={x0:sp.x,y0:sp.y,x1:x,y1:y,t:0,d};sp.tx=x;sp.ty=y;}
 function clear(st){
  visibleScore=st.score;
  let sx=0,sy=0;
  for(const c of st.cleared){const sp=sprites.get(c.id);if(sp&&!sp.dying)sp.dying=.001;if(vb[c.i]===c.id)vb[c.i]=null;sx+=cx(c.i);sy+=cy(c.i);
   if(st.cleared.length<40||c.sp)burstAt(c.i,c.sp?POWER_LOOK[c.sp].color:PUZZLE_LOOK[c.law]?.color||SUN,c.sp?'burst':'hit');}
  for(const i of st.moss){vmoss[i]=0;burstAt(i,'#8fe070','split');}
  for(const i of st.vines){vvine[i]=0;burstAt(i,'#6fbf4a','split');}
  for(const {i,hp} of st.stones){vstone[i]=hp;burstAt(i,'#c9c2b0',hp?'hit':'burst');}
  for(const e of st.effects)drawEffect(e);
  for(const c of st.created){const sp=addSprite(c.cell,c.i%N,Math.floor(c.i/N));sp.pop=1;vb[c.i]=c.cell.id;}
  if(st.cleared.length){const n=st.cleared.length;floaters.push({text:`+${st.gained.toLocaleString()}`,x:sx/n,y:sy/n,t:0,color:st.combo>1?'#ffe08a':'#fff4d6',size:st.combo>1?1.25:1});}
  if(st.label)banner(st.label,st.effects.some(e=>e.kind==='combo')?'조합 효과':'');else if(st.combo>=3)banner(`연쇄 ×${st.combo}`,'');
  const fx=st.effects.find(e=>e.kind==='combo')||st.effects.find(e=>POWER_LOOK[e.kind]);
  audio?.play(fx?.kind==='combo'?'ultimate':fx?POWER_LOOK[fx.kind].sound:'hit',{pitch:Math.min(1.8,.9+st.combo*.1)});
  if(st.created.length)audio?.play(st.created.some(c=>c.cell.sp==='sun')?'ultimateReady':st.created.some(c=>c.cell.sp==='burst')?'fusion':'pickup');
  if(st.effects.length)shake=Math.max(shake,st.effects.some(e=>e.big||e.kind==='sun')?.35:.16);
  hudUpdate();
 }
 function burstAt(i,color,kind){effects.push({e:{kind,x:cx(i),y:cy(i),radius:cs*.45},color,t:0,d:.35,unit:cs*.45});}
 function drawEffect(fx){
  const i=fx.i,x=cx(i),y=cy(i),unit=cs*.5,add=(e,color,d=.45)=>effects.push({e,color,t:0,d,unit});
  const lineFx=(at,dir,color,w=1)=>{for(let k=-(w-1)/2;k<=(w-1)/2;k++){const v=dir==='v',px=v?cx(at)+k*cs:bx,py=v?by:cy(at)+k*cs;add({kind:'lance',law:'pierce',x:px,y:py,tx:v?px:bx+cs*N,ty:v?by+cs*N:py},color);}};
  const burstFx=(at,rad,color)=>add({kind:'burst',x:cx(at),y:cy(at),radius:cs*rad},color,.5);
  const flights=color=>{for(const f of fx.flights||[]){add({kind:'chain',x,y,tx:cx(f.to),ty:cy(f.to)},color,.45);if(f.carry==='burst')burstFx(f.to,2.6,POWER_LOOK.burst.color);else if(f.carry==='pierce')lineFx(f.to,'h',POWER_LOOK.pierce.color);else add({kind:'default',x:cx(f.to),y:cy(f.to)},color,.4);}};
  if(fx.kind==='pierce')lineFx(i,fx.dir,POWER_LOOK.pierce.color);
  else if(fx.kind==='burst')burstFx(i,2.6,POWER_LOOK.burst.color);
  else if(fx.kind==='chain'){add({kind:'pulse',x,y,radius:cs*1.2},POWER_LOOK.chain.color,.4);flights(POWER_LOOK.chain.color);}
  else if(fx.kind==='sun'){add({kind:'sunburst',x,y,radius:cs*1.6},SUN,.6);for(const j of fx.cells.slice(0,18))if(j!==i)add({kind:'chain',x,y,tx:cx(j),ty:cy(j)},SUN,.4);}
  else if(fx.kind==='tool'){if(fx.tool==='hammer')burstFx(i,.9,'#e8f5d0');else lineFx(i,fx.dir,'#e8f5d0');}
  else if(fx.kind==='combo'){
   add({kind:'sunburst',x,y,radius:cs*2.4},SUN,.7);const kinds=[fx.a,fx.b];
   if(kinds.includes('sun'))for(const j of fx.cells.slice(0,20))if(j!==i)add({kind:'chain',x,y,tx:cx(j),ty:cy(j)},SUN,.45);
   else if(kinds.includes('chain'))flights(POWER_LOOK.chain.color);
   else if(fx.a==='burst'&&fx.b==='burst')burstFx(i,4.6,POWER_LOOK.burst.color);
   else if(kinds.includes('burst')){lineFx(i,'h',POWER_LOOK.burst.color,3);lineFx(i,'v',POWER_LOOK.pierce.color,3);}
   else{lineFx(i,'h',POWER_LOOK.pierce.color);lineFx(i,'v',POWER_LOOK.pierce.color);}
  }
 }

 // ── 그리기
 function update(dt){
  if(s){if(!cur&&queue.length){cur=queue.shift();begin(cur);}if(cur){curT+=dt;
   if(cur.type==='swap'&&!cur.ok&&!cur.back&&curT>=.14){cur.back=true;shake=.2;const A=spriteAt(cur.a),B=spriteAt(cur.b);if(A)tween(A,cur.a%N,Math.floor(cur.a/N),.13);if(B)tween(B,cur.b%N,Math.floor(cur.b/N),.13);}
   if(stepDone(cur,curT)){const st=cur;cur=null;finish(st);if(!queue.length)afterMove();}}}
  for(const [id,sp] of sprites){
   if(sp.tw){sp.tw.t+=dt;const k=clamp(sp.tw.t/sp.tw.d,0,1),e=k<.5?2*k*k:1-(-2*k+2)**2/2;sp.x=sp.tw.x0+(sp.tw.x1-sp.tw.x0)*e;sp.y=sp.tw.y0+(sp.tw.y1-sp.tw.y0)*e;if(k>=1){sp.tw=null;sp.vy=0;}}
   else if(sp.y<sp.ty){sp.vy=Math.min(34,sp.vy+95*dt);sp.y=Math.min(sp.ty,sp.y+sp.vy*dt);if(sp.y>=sp.ty)sp.vy=0;}
   else if(sp.y>sp.ty)sp.y=sp.ty;
   if(sp.pop>0)sp.pop=Math.max(0,sp.pop-dt*3);
   if(sp.dying){sp.dying+=dt;if(sp.dying>.2)sprites.delete(id);}
  }
  for(let k=effects.length-1;k>=0;k--){effects[k].t+=dt;if(effects[k].t>=effects[k].d)effects.splice(k,1);}
  for(let k=floaters.length-1;k>=0;k--){floaters[k].t+=dt;if(floaters[k].t>1)floaters.splice(k,1);}
  shake=Math.max(0,shake-dt);
  if(canAct()&&!busy()&&!hint&&clock-idleAt>6)hint=findHint(s);
 }
 function drawBackdrop(){
  if(!backdrop){backdrop=document.createElement('canvas');backdrop.width=canvas.width;backdrop.height=canvas.height;const g=backdrop.getContext('2d');g.scale(dpr,dpr);
   g.fillStyle='#071215';g.fillRect(0,0,width,height);
   if(ready('back')){const im=images.back,k=Math.max(width/im.naturalWidth,height/im.naturalHeight);g.globalAlpha=.35;g.drawImage(im,(width-im.naturalWidth*k)/2,(height-im.naturalHeight*k)/2,im.naturalWidth*k,im.naturalHeight*k);g.globalAlpha=1;}
   const v=g.createRadialGradient(width/2,height/2,Math.min(width,height)*.2,width/2,height/2,Math.max(width,height)*.75);v.addColorStop(0,'#07121500');v.addColorStop(1,'#030809e6');g.fillStyle=v;g.fillRect(0,0,width,height);
   // 판 바닥: 조용한 돌 길 + 칸 무늬. 구멍 칸은 비워 둔다.
   const size=cs*N,hole=s?.hole||[];g.save();g.beginPath();g.roundRect(bx-8,by-8,size+16,size+16,18);g.fillStyle='#0b1a1dcc';g.fill();g.lineWidth=2;g.strokeStyle='#d9bd7466';g.stroke();g.clip();
   g.beginPath();for(let i=0;i<N*N;i++)if(!hole[i])g.rect(bx+(i%N)*cs,by+Math.floor(i/N)*cs,cs,cs);g.save();g.clip();
   g.fillStyle='#203538';g.fillRect(bx,by,size,size);
   for(let r=0;r<N;r++)for(let c=0;c<N;c++){g.fillStyle=(r+c)%2?'#ffffff03':'#00000010';g.fillRect(bx+c*cs,by+r*cs,cs,cs);}
   g.restore();
   for(let i=0;i<N*N;i++)if(hole[i]){g.fillStyle='#02070acc';g.fillRect(bx+(i%N)*cs,by+Math.floor(i/N)*cs,cs,cs);}
   g.restore();}
  ctx.drawImage(backdrop,0,0,width,height);
 }
 function drawStone(i,hp){
  const x=bx+(i%N)*cs,y=by+Math.floor(i/N)*cs,p=cs*.06;ctx.save();ctx.beginPath();ctx.roundRect(x+p,y+p,cs-p*2,cs-p*2,cs*.2);ctx.clip();
  if(ready('stone')){const im=images.stone,w=im.naturalWidth/3;ctx.drawImage(im,(i%3)*w,((i>>3)%3)*w,w,w,x,y,cs,cs);}else{ctx.fillStyle='#6b6a60';ctx.fillRect(x,y,cs,cs);}
  ctx.fillStyle=`rgba(0,0,0,${.1+.1*(3-hp)})`;ctx.fillRect(x,y+cs*.6,cs,cs*.4);ctx.restore();
  ctx.lineWidth=2;ctx.strokeStyle=hp>=3?'#ffe3a0cc':hp===2?'#e8dfc8aa':'#e8dfc866';ctx.beginPath();ctx.roundRect(x+p,y+p,cs-p*2,cs-p*2,cs*.2);ctx.stroke();
  if(stoneMax>1){ctx.fillStyle='#fff3cf';ctx.font=`bold ${Math.round(cs*.26)}px sans-serif`;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(String(hp),x+cs*.9,y+cs*.95);}
 }
 function drawSprite(sp,now){
  const x=bx+(sp.x+.5)*cs,y=by+(sp.y+.5)*cs;if(y<by-cs*.5)return;
  const k=sp.dying?Math.max(0,1-sp.dying/.2):1,scale=(sp.dying?1+sp.dying*1.4:1)*(1+sp.pop*.35),size=cs*scale;
  ctx.globalAlpha=k;
  if(sp.sp){const look=POWER_LOOK[sp.sp];
   if(sp.sp==='sun')vfx.fx(ctx,'sigil',x,y,cs*1.3,{color:SUN,alpha:.5*k,rotation:now*.0012});
   vfx.fx(ctx,'ring',x,y,cs*(1.12+.07*Math.sin(now*.007)),{color:look.color,alpha:.8*k});
   ctx.globalAlpha=k;ctx.drawImage(powerTile(sp.sp),x-size/2,y-size/2,size,size);
   if(sp.sp==='pierce'){ctx.strokeStyle='#fffbe8';ctx.lineWidth=Math.max(2,cs*.06);ctx.lineCap='round';const v=sp.dir==='v',a=cs*.5,b=cs*.4,w=cs*.1;ctx.beginPath();
    if(v){ctx.moveTo(x-w,y-b);ctx.lineTo(x,y-a);ctx.lineTo(x+w,y-b);ctx.moveTo(x-w,y+b);ctx.lineTo(x,y+a);ctx.lineTo(x+w,y+b);}else{ctx.moveTo(x-b,y-w);ctx.lineTo(x-a,y);ctx.lineTo(x-b,y+w);ctx.moveTo(x+b,y-w);ctx.lineTo(x+a,y);ctx.lineTo(x+b,y+w);}ctx.stroke();}
   else if(sp.sp==='chain')for(let q=0;q<3;q++){const a=now*.004+q*2.09;vfx.fx(ctx,'star',x+Math.cos(a)*cs*.46,y+Math.sin(a)*cs*.46,cs*.3,{color:'#fff3b0',alpha:.9*k});}
   // 기억한 법칙: 오른쪽 아래 작은 법칙 색 구슬(특수끼리 합치면 두 법칙의 융합 이름).
   if(sp.src&&PUZZLE_LOOK[sp.src]){ctx.globalAlpha=k;ctx.beginPath();ctx.arc(x+cs*.3,y+cs*.3,cs*.13,0,Math.PI*2);ctx.fillStyle=PUZZLE_LOOK[sp.src].color;ctx.fill();ctx.lineWidth=Math.max(1.5,cs*.035);ctx.strokeStyle='#1a1208';ctx.stroke();}
   ctx.globalAlpha=1;return;}
  if(!PUZZLE_LOOK[sp.law]){ctx.globalAlpha=1;return;}
  ctx.drawImage(tile(sp.law),x-size/2,y-size/2,size,size);ctx.globalAlpha=1;
 }
 function cellBox(i,pad=2){return [bx+(i%N)*cs+pad,by+Math.floor(i/N)*cs+pad,cs-pad*2,cs-pad*2];}
 function gardenRect(){const p=$('.sp-garden-panel').getBoundingClientRect(),wide=root.classList.contains('sp-wide');return wide?{x:0,y:0,w:Math.max(160,p.left-8),h:height}:{x:0,y:0,w:width,h:Math.max(160,p.top-8)};}
 function draw(now){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(gardenMode){ctx.fillStyle='#071215';ctx.fillRect(0,0,width,height);painter.draw(ctx,gardenRect(),getGarden(),clock,{fresh});return;}
  drawBackdrop();
  if(!s)return;
  const sh=shake>0?Math.sin(now*.09)*shake*cs*.12:0;ctx.save();ctx.translate(sh,0);
  for(let i=0;i<N*N;i++)if(vmoss[i])ctx.drawImage(mossTile(),bx+(i%N)*cs,by+Math.floor(i/N)*cs,cs,cs);
  for(let i=0;i<N*N;i++)if(vstone[i])drawStone(i,vstone[i]);
  if(hint&&canAct()&&!busy()){const a=.35+.3*Math.sin(now*.008);ctx.fillStyle=`rgba(255,236,160,${a})`;for(const i of hint){ctx.beginPath();ctx.roundRect(...cellBox(i),cs*.2);ctx.fill();}}
  if(selected>=0){ctx.lineWidth=3;ctx.strokeStyle='#fff1b9';ctx.beginPath();ctx.roundRect(...cellBox(selected),cs*.2);ctx.stroke();}
  // 판 밖(위)에서 떨어지는 씨앗은 판 안에서만 보이게.
  ctx.save();ctx.beginPath();ctx.rect(bx-4,by-2,cs*N+8,cs*N+cs);ctx.clip();
  for(const sp of sprites.values())if(!sp.dying)drawSprite(sp,now);
  for(const sp of sprites.values())if(sp.dying)drawSprite(sp,now);
  ctx.restore();
  for(let i=0;i<N*N;i++)if(vvine[i])ctx.drawImage(vineTile(),bx+(i%N)*cs,by+Math.floor(i/N)*cs,cs,cs);
  if(keyboard&&cursor>=0&&canAct()){ctx.setLineDash([6,4]);ctx.lineWidth=2;ctx.strokeStyle='#9ee6ff';ctx.strokeRect(...cellBox(cursor,4));ctx.setLineDash([]);}
  if(armed){ctx.lineWidth=2;ctx.strokeStyle=`rgba(232,245,208,${.4+.3*Math.sin(now*.01)})`;ctx.strokeRect(bx+1,by+1,cs*N-2,cs*N-2);}
  for(const f of effects)vfx.effect(ctx,f.e,f.t/f.d,f.color,f.unit);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const f of floaters){ctx.globalAlpha=1-f.t;ctx.font=`bold ${Math.round(cs*.42*f.size)}px Georgia,'Malgun Gothic',serif`;ctx.lineWidth=4;ctx.strokeStyle='#1d1206';ctx.strokeText(f.text,f.x,f.y-f.t*cs*.8);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-f.t*cs*.8);}
  ctx.globalAlpha=1;ctx.restore();
 }
 function loop(now){raf=requestAnimationFrame(loop);if(closed||document.hidden||!pacer(now,60))return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;clock+=dt;update(dt);draw(now);}

 // ── HUD
 let bannerTimer=0;
 function banner(big,small){const b=$('.sp-banner');b.innerHTML=`<b>${escape(big)}</b>${small?`<small>${escape(small)}</small>`:''}`;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>b.classList.remove('pop'),1200);}
 let toastTimer=0;
 function toast(t){const el=$('.sp-toast');el.textContent=t;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1900);}
 const goalIcon=p=>p.kind==='collect'?lawArt(p.law,'sp-goal-art'):`<span class="sp-goal-ico sp-ico-${p.kind}" aria-hidden="true"></span>`;
 const goalName=p=>p.kind==='score'?'점수':p.kind==='collect'?LAWS[p.law].name:{moss:'이끼',stone:'돌',vine:'덩굴'}[p.kind];
 const goalCount=p=>p.kind==='score'?`${Math.min(p.have,p.need).toLocaleString()}/${p.need.toLocaleString()}`:`${p.have}/${p.need}`;
 function hudUpdate(){
  if(!s)return;$('.sp-no').textContent=def.daily?`오늘의 단계 · ${dayLabel(def.daily)}`:`단계 ${def.n}`;$('.sp-name').textContent=def.name;
  $('.sp-moves strong').textContent=visibleMoves;$('.sp-moves').classList.toggle('low',s.phase==='play'&&visibleMoves<=5);$('.sp-score strong').textContent=visibleScore.toLocaleString();
  // 점수 막대(별 표시는 ★★·★★★ 점수. 오늘의 단계는 ★·★★·★★★ 점수). 남은 이동은 깬 뒤 햇살 타임 점수가 된다.
  const bar=$('.sp-bar'),top=def.stars.at(-1)*1.08;bar.querySelectorAll('em').forEach(e=>e.remove());bar.querySelector('i').style.width=`${clamp(visibleScore/top*100,0,100)}%`;
  def.stars.forEach((v,k)=>{const em=document.createElement('em');em.style.left=`${v/top*100}%`;em.className=visibleScore>=v?'on':'';em.textContent=def.attack?'★':k?'★★★':'★★';em.title=`${def.attack?`${k+1}번째 별`:k?'★★★':'★★'} ${v.toLocaleString()}점`;bar.append(em);});
  $('.sp-goals').innerHTML=def.attack?`<li class="sp-attack">이동 ${def.moves}번 안에 최고 점수</li>`:puzzleGoalState(s).map(p=>`<li class="${p.have>=p.need?'done':''}">${goalIcon(p)}<span>${goalName(p)}</span><b>${goalCount(p)}</b></li>`).join('');
 }

 // ── 화면들
 function show(kind,html){modal.hidden=false;modal.dataset.kind=kind;modal.innerHTML=`<div class="sp-paper sp-${kind}">${html}</div>`;modal.querySelector('button')?.focus({preventScroll:true});}
 // 한 번이라도 둔 판을 도중에 그만두면 연승이 끊긴다(로열 매치와 같다). 오늘의 단계는 상관없다.
 function quitRun(){progress=readPuzzleProgress(storage,owner);if(s&&s.phase==='play'&&s.log.length&&puzzleStreakCounts(progress,def)&&progress.streak>0){progress=breakPuzzleStreak(progress);writePuzzleProgress(storage,progress,owner);}}
 const powerBadge=id=>{const t=POWER_LOOK[id].tile;return `<span class="sp-power" aria-hidden="true" style="--ink:${POWER_LOOK[id].color};background-image:url('${BASE}${id==='sun'?'icons/seed-cute-v1-192.png':'assets/cute/seed-solo-v1.webp'}');${id==='sun'?'background-size:cover':`background-size:400% 300%;background-position:${(t%4)*100/3}% ${Math.floor(t/4)*50}%`}"></span>`;};
 function menu(){
  quitRun();root.classList.remove('sp-playing');s=null;queue=[];cur=null;armed=null;clearTimeout(resultTimer);progress=readPuzzleProgress(storage,owner);
  const day=seoulDay(),daily=dailyPuzzleStage(day),dp=progress.daily.day===day?progress.daily:null,total=Object.values(progress.stages).reduce((a,p)=>a+p.stars,0);
  const card=d=>{const p=progress.stages[d.id],open=puzzleUnlocked(progress,d);return `<button class="sp-stage${p?.stars?' cleared':''}${LEVEL_TAG[d.level]?` sp-level-${d.level}`:''}" data-stage="${d.id}" ${open?'':'disabled'} aria-label="단계 ${d.n} ${d.name}${LEVEL_TAG[d.level]?` ${LEVEL_TAG[d.level]}`:''}${open?'':' 잠김'}"><span class="sp-stage-n">${d.n}</span><b>${d.name}</b><span class="sp-stars">${open?starText(p?.stars||0):'🔒'}</span></button>`;};
  // 999단계는 50개씩 나눠 보여 준다(처음에는 다음에 깰 단계가 든 묶음).
  const next=PUZZLE_STAGES.find(d=>puzzleUnlocked(progress,d)&&!progress.stages[d.id]?.stars),pages=Math.ceil(PUZZLE_STAGES.length/STAGE_PAGE);
  if(stagePage===null)stagePage=Math.floor(((next?.n||1)-1)/STAGE_PAGE);
  const pageStages=PUZZLE_STAGES.slice(stagePage*STAGE_PAGE,(stagePage+1)*STAGE_PAGE),pageStars=k=>PUZZLE_STAGES.slice(k*STAGE_PAGE,(k+1)*STAGE_PAGE).reduce((a,d)=>a+(progress.stages[d.id]?.stars||0),0);
  const chapters=Array.from({length:pages},(_,k)=>{const a=k*STAGE_PAGE+1,b=Math.min(PUZZLE_STAGES.length,(k+1)*STAGE_PAGE),open=puzzleUnlocked(progress,PUZZLE_STAGES[a-1]);return `<button class="sp-chapter${k===stagePage?' on':''}" data-page="${k}" ${open?'':'disabled'} aria-pressed="${k===stagePage}">${a}–${b}<small>${open?`★${pageStars(k)}`:'🔒'}</small></button>`;}).join('');
  syncGardenStars();const g=getGarden(),area=decorAreaIndex(g.decor),stars=starWallet(),doneHere=area<0?0:decorTasks(g.decor).filter(t=>t.done).length;
  show('menu',`<p class="sp-eyebrow">SEED · PUZZLE</p><h1>씨앗 맞추기</h1><p class="sp-lead">같은 법칙 셋을 맞춰 터뜨리세요. <b>넷 한 줄</b> 관통 · <b>네모</b> 연쇄 · <b>T·L</b> 폭발 · <b>다섯 한 줄</b> 햇살 — 특수 씨앗은 눌러서 바로 터뜨려요.</p>
   <button class="sp-garden-card${stars&&area>=0?' ready':''}" data-garden><span class="sp-garden-thumb" aria-hidden="true" style="background-image:url('${BASE}assets/garden-sanctuary-v2.webp')"></span><span><small>정원 가꾸기 · ${area<0?'모두 꾸몄어요':`${DECOR_AREAS[area].name} ${doneHere}/6`}</small><b>${area<0?'SEED 정원을 끝까지 꾸몄어요':stars?`별 ★${stars}개로 정원을 꾸밀 수 있어요`:'단계에서 별을 모아 정원을 꾸며요'}</b></span><i aria-hidden="true">›</i></button>
   <div class="sp-status"><span class="sp-lives" title="도전 씨앗 · 지면 하나 줄고, 10분마다 하나씩 돋아요">🌱 <span data-lives>${livesLine()}</span></span><span>별 ${total}/${PUZZLE_STAGES.length*3}</span><span class="${progress.streak?'hot':''}">🔥 ${progress.streak}연승${progress.streak?` · 다음 선물 ${puzzleStreakGift(progress.streak).map(id=>PUZZLE_POWERS[id].name).join('·')}`:''}</span>${practice?'':`<span>햇살 ${jpText(wallet())}</span>`}</div>
   <button class="sp-daily" data-daily="${day}"><span><small>오늘의 단계 · ${dayLabel(day)}</small><b>이동 ${daily.moves}번 점수 도전</b></span><span class="sp-stars">${starText(dp?.stars||0)}</span><small>${dp?.best?`오늘 최고 ${dp.best.toLocaleString()}`:'오늘 누구나 같은 판'}</small></button>
   <div class="sp-chapters" role="tablist" aria-label="단계 묶음">${chapters}</div>
   <div class="sp-stages">${pageStages.map(card).join('')}</div>
   <div class="sp-row"><button class="sp-help-open">도움말</button><button class="sp-primary sp-rank-open">씨앗 맞추기 랭킹</button>${onSaveAccount&&!practice?'<button class="sp-account-save">계정 저장 확인</button>':''}<button class="sp-exit">돌아가기</button></div>
   <small>${practice?'연습 모드 · 햇살(JP)을 쓰지도 받지도 않고, 도감에도 남지 않아요.':`첫 깨기 햇살 ${PUZZLE_JP.firstClear(1)}~${PUZZLE_JP.firstClear(PUZZLE_STAGES.length)} JP · 별은 점수로(남은 이동은 햇살 타임 점수) · 새 별마다 ${PUZZLE_JP.newStar} JP · 오늘의 단계 첫 별 ${PUZZLE_JP.daily} JP · 조합 효과를 처음 쓰면 도감에 남아요.`}</small>`);
  modal.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>intro(PUZZLE_STAGE_BY_ID[b.dataset.stage]));
  modal.querySelector('[data-daily]').onclick=()=>intro(daily);modal.querySelector('.sp-help-open').onclick=()=>help();modal.querySelector('.sp-rank-open').onclick=onRanking;modal.querySelector('.sp-exit').onclick=close;modal.querySelector('[data-garden]').onclick=gardenScreen;
  modal.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{stagePage=Number(b.dataset.page);menu();});
  const saveButton=modal.querySelector('.sp-account-save');if(saveButton)saveButton.onclick=async()=>{saveButton.disabled=true;saveButton.textContent='저장 확인 중…';try{const ok=await onSaveAccount();saveButton.textContent=ok?'계정에 저장됐어요':'연결 확인 후 다시 시도';if(ok&&!closed){menu();modal.querySelector('.sp-account-save').textContent='계정에 저장됐어요';toast('단계·별·연승을 계정에 저장했어요');}}catch{saveButton.textContent='연결 확인 후 다시 시도';}finally{saveButton.disabled=false;}};
  modal.querySelector('.sp-chapter.on')?.scrollIntoView?.({block:'nearest',inline:'center'});
  modal.querySelector(`[data-stage="${next?.id}"]`)?.scrollIntoView?.({block:'nearest'});
 }
 function goalLines(d){const g=d.goal,out=[];if(d.attack)out.push(`이동 ${d.moves}번 안에 최고 점수 · 별 ${d.stars.map(v=>v.toLocaleString()).join(' / ')}점`);
  for(const c of g.collect||[])out.push(`${lawArt(c.law,'sp-goal-art')} ${LAWS[c.law].name} ${c.count}개 모으기`);
  if(g.moss)out.push(`<span class="sp-goal-ico sp-ico-moss"></span> 이끼 ${d.moss.length}칸 모두 걷기`);if(g.stone)out.push(`<span class="sp-goal-ico sp-ico-stone"></span> 돌 ${d.stones.length}개 모두 깨기`);if(g.vine)out.push(`<span class="sp-goal-ico sp-ico-vine"></span> 덩굴 ${d.vines.length}개 모두 풀기`);
  if(!d.attack)out.push(`<span>이동 ${d.moves}번 · ★★ ${d.stars[0].toLocaleString()}점 · ★★★ ${d.stars[1].toLocaleString()}점<br><small>남은 이동은 햇살 타임 점수가 돼요</small></span>`);return out;}
 const LEVEL_TAG={hard:'어려운 단계',veryHard:'아주 어려운 단계'};
 // 시작 화면: 목표 · 연승 선물 · 시작 전 부스터(햇살로 사기).
 function intro(d){
  progress=readPuzzleProgress(storage,owner);
  picks=new Set();const gift=puzzleStreakCounts(progress,d)?puzzleStreakGift(progress.streak):[];
  const boosterRow=()=>Object.entries(PUZZLE_SHOP.boosters).map(([id,jp])=>`<button class="sp-booster${picks.has(id)?' on':''}" data-booster="${id}" aria-pressed="${picks.has(id)}">${powerBadge(id)}<b>${PUZZLE_POWERS[id].name}</b><small>${practice?'연습 무료':jpText(jp)}</small></button>`).join('');
  const cost=()=>[...picks].reduce((a,id)=>a+PUZZLE_SHOP.boosters[id],0);
  show('intro',`<p class="sp-eyebrow">${d.daily?`오늘의 단계 · ${dayLabel(d.daily)}`:`단계 ${d.n}`}${LEVEL_TAG[d.level]?` · <span class="sp-level-${d.level}">${LEVEL_TAG[d.level]}</span>`:''}</p><h1>${escape(d.name)}</h1><ul class="sp-goal-list">${goalLines(d).map(l=>`<li>${l}</li>`).join('')}</ul><p class="sp-tip">${escape(d.tip)}</p>
   ${gift.length?`<p class="sp-gift">🔥 ${progress.streak}연승 선물 · ${gift.map(id=>`${powerBadge(id)}${PUZZLE_POWERS[id].name}`).join(' ')} <small>지면 사라져요</small></p>`:''}
   <h3>시작 전 부스터</h3><div class="sp-boosters">${boosterRow()}</div><p class="sp-cost"></p>
   ${needsLife(d)?`<p class="sp-life-note">🌱 도전 씨앗 <span data-lives>${livesLine()}</span><br><small>시작할 때 하나 쓰고, 깨면 돌려받아요.</small></p>`:''}
   <div class="sp-row"><button class="sp-primary sp-go">시작</button><button class="sp-to-menu">단계 고르기</button></div>`);
  const sync=()=>{modal.querySelector('.sp-boosters').innerHTML=boosterRow();bind();const c=cost();modal.querySelector('.sp-cost').textContent=c?(practice?'연습 · 무료':`햇살 ${jpText(c)} 사용 · 가진 햇살 ${jpText(wallet())}`):'';};
  const bind=()=>modal.querySelectorAll('[data-booster]').forEach(b=>b.onclick=()=>{const id=b.dataset.booster;picks.has(id)?picks.delete(id):picks.add(id);sync();});
  bind();sync();
  modal.querySelector('.sp-go').onclick=()=>{
   progress=readPuzzleProgress(storage,owner);
   if(needsLife(d)&&livesNow().lives<=0){noLives(d);return;}
   const c=cost();if(c&&!pay(c,'부스터'))return;
   runLife=false;if(needsLife(d)){const r=takePuzzleLife(progress);if(!r.ok){noLives(d);return;}progress=r.progress;writePuzzleProgress(storage,progress,owner);runLife=true;}
   start(d,[...gift,...picks]);};
  modal.querySelector('.sp-to-menu').onclick=menu;
 }
 // 오늘의 단계와 연습은 도전 씨앗을 쓰지 않는다.
 const needsLife=d=>!practice&&!d.daily;
 function noLives(d){
  show('lives',`<p class="sp-eyebrow">도전 씨앗</p><h1>씨앗이 다시 돋는 중이에요</h1><p class="sp-lives-big">🌱 <span data-lives>${livesLine()}</span></p>
   <p>도전 씨앗은 10분마다 하나씩 돋아요. 그동안 <b>오늘의 단계</b>는 씨앗 없이 할 수 있고, 모은 별로 <b>정원</b>을 꾸밀 수 있어요.</p>
   <div class="sp-row"><button class="sp-primary sp-refill">햇살 ${jpText(PUZZLE_LIVES.refill)}로 가득 채우기</button><button class="sp-retry" data-needs-life disabled>다시 도전</button></div>
   <div class="sp-row"><button class="sp-to-garden">정원 가꾸기</button><button class="sp-to-menu">단계 고르기</button></div><small>${practice?'':`가진 햇살 ${jpText(wallet())}`}</small>`);
  modal.querySelector('.sp-refill').onclick=()=>{if(!pay(PUZZLE_LIVES.refill,'도전 씨앗 채우기'))return;progress=refillPuzzleLives(readPuzzleProgress(storage,owner));writePuzzleProgress(storage,progress,owner);toast('도전 씨앗을 가득 채웠어요');intro(d);};
  modal.querySelector('.sp-retry').onclick=()=>intro(d);modal.querySelector('.sp-to-garden').onclick=gardenScreen;modal.querySelector('.sp-to-menu').onclick=menu;
 }
 // ── 정원 가꾸기(로열 매치의 성 꾸미기 → SEED 정원). 별로 꽃·등불·반딧불이를 들이고, 한 구역을 다 꾸미면 햇살 보상.
 function gardenScreen(){
  quitRun();s=null;queue=[];cur=null;modal.hidden=true;root.classList.remove('sp-playing');root.classList.add('sp-gardening');gardenMode=true;syncGardenStars();
  const panel=$('.sp-garden-panel');panel.hidden=false;paintGardenPanel();resize();
 }
 function leaveGarden(){gardenMode=false;fresh={};$('.sp-garden-panel').hidden=true;root.classList.remove('sp-gardening');resize();menu();}
 function paintGardenPanel(){
  const panel=$('.sp-garden-panel'),g=getGarden(),area=decorAreaIndex(g.decor),stars=starWallet(),tasks=decorTasks(g.decor);
  const a=area<0?null:DECOR_AREAS[area],done=tasks.filter(t=>t.done).length;
  panel.innerHTML=`<header><p class="sp-eyebrow">SEED · 정원 가꾸기</p><h2>${a?escape(a.name):'다 꾸민 정원'}</h2><p>${a?escape(a.line):'꽃비가 내리는 SEED 정원을 끝까지 꾸몄어요.'}</p><strong class="sp-star-wallet" title="단계와 오늘의 단계에서 모은 별">★ ${stars}</strong></header>
   ${a?`<div class="sp-area-progress"><i style="width:${done/6*100}%"></i><span>구역 ${area+1}/${DECOR_AREAS.length} · ${done}/6 · 다 꾸미면 햇살 ${jpText(a.reward)}</span></div>
   <ul class="sp-decor-list">${tasks.map(t=>`<li><button data-decor="${t.id}" class="${t.done?'done':stars>=t.cost?'afford':''}" ${t.done?'disabled':''}><b>${escape(t.name)}</b><span>${t.done?'✓ 꾸몄어요':`★${t.cost}`}</span></button></li>`).join('')}</ul>`:''}
   <div class="sp-row"><button class="sp-primary sp-play">단계 하러 가기</button>${onOpenGarden?'<button class="sp-open-garden">정원에서 보기</button>':''}<button class="sp-garden-back">돌아가기</button></div>
   <small>별은 단계(★ 최대 3개)와 오늘의 단계에서 모여요. 꾸민 것은 SEED 정원에 그대로 남고 계정과 함께 옮겨 가요.</small>`;
  panel.querySelectorAll('[data-decor]').forEach(b=>b.onclick=()=>buyDecor(b.dataset.decor));
  panel.querySelector('.sp-play').onclick=leaveGarden;panel.querySelector('.sp-garden-back').onclick=leaveGarden;
  panel.querySelector('.sp-open-garden')?.addEventListener('click',()=>{gardenMode=false;close();onOpenGarden();});
 }
 function buyDecor(id){
  const g=getGarden(),earned=earnedStars();
  if(!canDecorate(g.decor,id,earned)){toast(`별이 모자라요 · 단계에서 별을 더 모아요`);audio?.play('shotArc',{pitch:.6});return;}
  const r=decorate(g.decor,id,earned);setGarden({...g,decor:r.list,puzzleStars:Math.max(g.puzzleStars||0,earned)});fresh[id]=clock;
  audio?.play('evolve');const name=DECOR.find(d=>d.id===id)?.name;
  if(r.area){const note=practice?'연습 · 보상 없음':(onCredit(r.area.reward)||`햇살 ${r.area.reward} JP`);banner(`${r.area.name} 완성!`,note);audio?.play('bossDefeat');}
  else toast(`${name} · 정원에 들였어요`);
  paintGardenPanel();
 }
 function pause(){if(!s||s.phase!=='play'||!modal.hidden)return;snap();const warn=puzzleStreakCounts(progress,def)&&progress.streak>0&&s.log.length?` 그만두면 ${progress.streak}연승이 끊겨요.`:'';
  show('pause',`<p class="sp-eyebrow">일시정지</p><h1>${escape(def.name)}</h1><ul class="sp-goal-list">${goalLines(def).map(l=>`<li>${l}</li>`).join('')}</ul>
  <div class="sp-row"><button class="sp-primary sp-resume">계속하기</button><button class="sp-restart">처음부터</button><button class="sp-help-open">도움말</button><button class="sp-to-menu">단계 고르기</button></div><small>처음부터·단계 고르기를 누르면 이번 판은 기록되지 않아요.${warn}</small>`);
  modal.querySelector('.sp-resume').onclick=resume;modal.querySelector('.sp-restart').onclick=()=>{quitRun();intro(def);};modal.querySelector('.sp-help-open').onclick=()=>help(pause);modal.querySelector('.sp-to-menu').onclick=menu;}
 function resume(){modal.hidden=true;idleAt=clock;}
 // 로열 매치의 '+5 이동': 이동을 다 썼는데 목표가 남았을 때. 두 번까지, 두 번째는 더 비싸다.
 function offerMoves(st){
  const left=puzzleGoalState(s).filter(p=>p.have<p.need),price=st.price;
  show('out',`<p class="sp-eyebrow">OUT OF MOVES</p><h1>${st.left<=.2?'거의 다 왔어요!':'이동을 다 썼어요'}</h1><ul class="sp-goal-list">${left.map(p=>`<li>${goalIcon(p)} ${goalName(p)} <b>${p.kind==='score'?(p.need-p.have).toLocaleString()+'점':p.need-p.have+'개'}</b> 남았어요</li>`).join('')}</ul>
   <div class="sp-row"><button class="sp-primary sp-more">+${PUZZLE.extraMoves} 이동 · ${practice?'연습 무료':jpText(price)}</button><button class="sp-giveup">그만하기</button></div><small>${practice?'':`가진 햇살 ${jpText(wallet())} · `}한 판에 ${PUZZLE.maxContinues}번까지 이어할 수 있어요(${s.continues+1}/${PUZZLE.maxContinues}).</small>`);
  modal.querySelector('.sp-more').onclick=()=>{if(!pay(price,`+${PUZZLE.extraMoves} 이동`))return;const more=continuePuzzle(s);if(more.ok){queue.push(...more.steps);modal.hidden=true;hudUpdate();banner(`+${PUZZLE.extraMoves} 이동`,'');idleAt=clock;}};
  modal.querySelector('.sp-giveup').onclick=()=>{modal.hidden=true;queue.push(...giveUpPuzzle(s).steps);};
 }
 function help(back=menu){
  const powers=Object.values(PUZZLE_POWERS).map(p=>`<li>${powerBadge(p.id)}<span><b>${p.name}</b> · ${p.make}<br>${p.text}</span></li>`).join('');
  show('help',`<p class="sp-eyebrow">도움말</p><h1>특수 씨앗</h1><ul class="sp-shapes">${powers}</ul>
   <ul class="sp-rules"><li>특수 씨앗은 <b>눌러서 바로</b> 터뜨리거나, 아무 이웃과 <b>바꿔서</b> 터뜨려요(이동 1).</li><li><b>특수 씨앗끼리 바꾸기</b> → 조합 효과. 이름은 SEED 도감 이름이고 처음 쓰면 도감에 남아요.
    <br>관통+관통 가로세로 한 줄씩 · 관통+폭발 세 줄씩 · 폭발+폭발 9×9 · 연쇄+무엇 = 싣고 날아가서 터뜨리기 · 햇살+특수 = 가장 많은 법칙이 전부 그 특수 씨앗 · 햇살+햇살 = 판 전체</li>
    <li><b>이끼</b> 위 씨앗을 터뜨리면 걷혀요 · <b>돌</b>은 옆에서 맞추거나 특수 씨앗으로 한 겹씩 · <b>덩굴</b>에 묶인 씨앗은 못 움직이지만 맞추면 풀려요 · <b>구멍</b>은 판에 없는 칸.</li>
    <li>연출 중에도 다음 수를 둘 수 있어요. 한동안 가만히 있으면 둘 곳을 반짝여 줘요.</li>
    <li><b>별</b> 목표를 모두 채우면 ★, 점수로 ★★·★★★. 남은 이동은 <b>햇살 타임</b>에 특수 씨앗이 되어 터지며 점수가 돼요 — 이동을 아끼고 크게 터뜨릴수록 높아요. ★★★는 정말 잘한 판에만! +5 이동으로 깬 판은 ★ 하나.</li>
    <li>끝자리 5는 <b>어려운 단계</b>, 끝자리 0은 <b>아주 어려운 단계</b>예요.</li></ul>
   <h3>햇살 쓰기</h3><ul class="sp-rules"><li><b>+${PUZZLE.extraMoves} 이동</b> ${PUZZLE_SHOP.more.map(jpText).join(' → ')} · <b>시작 전 부스터</b> ${Object.entries(PUZZLE_SHOP.boosters).map(([id,jp])=>`${PUZZLE_POWERS[id].name} ${jpText(jp)}`).join(' · ')}</li>
    <li><b>판 안 도구</b>(이동을 쓰지 않아요) ${Object.values(PUZZLE_TOOLS).map(t=>`${t.name} ${jpText(PUZZLE_SHOP.tools[t.id])}`).join(' · ')}</li>
    <li><b>연승 선물</b> 연속으로 깨면 다음 단계에 ${[1,2,3].map(n=>`${n}연승 ${puzzleStreakGift(n).map(id=>PUZZLE_POWERS[id].name).join('+')}`).join(' · ')}. 처음 깨는 단계만 세요. 지거나 도중에 그만두면 처음부터.</li></ul>
   <div class="sp-row"><button class="sp-primary sp-back">돌아가기</button></div>`);
  modal.querySelector('.sp-back').onclick=()=>back();}
 function result(){
  progress=readPuzzleProgress(storage,owner);
  const prevStreak=progress.streak,counted=puzzleStreakCounts(progress,def),prevStars=def.daily?0:(progress.stages[def.id]?.stars||0),record=recordPuzzleResult(progress,s),won=s.phase==='won';progress=record.progress;
  // 깨면 도전 씨앗을 돌려받는다(지면 시작할 때 쓴 하나가 그대로 줄어 있다).
  if(won&&runLife)progress=refundPuzzleLife(progress);runLife=false;
  const saved=writePuzzleProgress(storage,progress,owner);syncGardenStars();
  const g=getGarden(),canGarden=decorAreaIndex(g.decor)>=0&&decorTasks(g.decor).some(t=>!t.done&&starWallet()>=t.cost);
  // 생명의 나무: 놀고 오면 물방울, 아주 어려운 단계(끝자리 0)·50단계마다 처음 ★★★면 씨앗(main.js가 굴린다).
  const treeNote=practice?'':onPlayed({stage:def.n||0,daily:!!def.daily,won:s.phase==='won',stars:record.stars,firstThree:!def.daily&&prevStars<3&&record.stars===3})||'';if(treeNote)record.notes.push(treeNote);
  let jpNote='';if(record.jp>0)jpNote=practice?`연습 · 햇살 ${record.jp} JP는 쌓이지 않아요`:(onCredit(record.jp)||`햇살 ${record.jp} JP 적립`);
  const next=!def.daily&&PUZZLE_STAGES[def.n]&&puzzleUnlocked(progress,PUZZLE_STAGES[def.n])?PUZZLE_STAGES[def.n]:null;
  const combos=s.combos.map(id=>ALL_FORMS[id]?.name).filter(Boolean),made=Object.entries(s.created).filter(([,n])=>n).map(([id,n])=>`${PUZZLE_POWERS[id].name} ${n}`).join(' · ');
  show('result',`<p class="sp-eyebrow">${won?(def.attack?'FINISH':'CLEAR'):'MOVES OUT'}</p><h1>${won?(def.attack?'도전 끝!':'단계 성공!'):'아쉬워요'}</h1>
   <p class="sp-result-stars" aria-label="별 ${record.stars}개">${[0,1,2].map(k=>`<span class="${k<record.stars?'on':''}" style="animation-delay:${.15+k*.22}s">★</span>`).join('')}</p>
   <p class="sp-result-score">${s.score.toLocaleString()}점${won&&s.bonus?` <small>(햇살 타임 +${s.bonus.toLocaleString()} · 남은 이동 ${s.leftAtWin}번)</small>`:''}${won&&!def.attack?`<br><small>${s.continues?'이어하기로 깬 판은 ★ 하나':`★★ ${def.stars[0].toLocaleString()} · ★★★ ${def.stars[1].toLocaleString()}점`}</small>`:''}</p>
   ${won?'':`<ul class="sp-goal-list">${puzzleGoalState(s).filter(p=>p.have<p.need).map(p=>`<li>${goalIcon(p)} ${goalName(p)} ${p.kind==='score'?(p.need-p.have).toLocaleString()+'점':p.need-p.have+'개'} 모자랐어요</li>`).join('')}</ul>`}
   ${record.notes.length||jpNote?`<p class="sp-reward">${escape([...record.notes,jpNote].filter(Boolean).join(' · '))}</p>`:''}
   ${!won&&counted&&prevStreak>0?`<p class="sp-meta">${prevStreak}연승이 끊겼어요 · 최고 ${record.progress.bestStreak}연승</p>`:''}
   ${combos.length?`<p class="sp-combos">이번 판 조합 효과 · ${combos.map(escape).join(' · ')}</p>`:''}
   <p class="sp-meta">최대 연쇄 ×${s.maxCombo}${made?` · ${made}`:''}${s.tools?` · 도구 ${s.tools}번`:''}${s.continues?` · 이어하기 ${s.continues}번`:''}${saved?'':' · 이 기기에 저장하지 못했어요'}</p>
   ${needsLife(def)?`<p class="sp-meta">🌱 도전 씨앗 <span data-lives>${livesLine()}</span>${won?' · 깨서 돌려받았어요':''}</p>`:''}
   ${canGarden?`<button class="sp-garden-card ready small" data-garden><span class="sp-garden-thumb" aria-hidden="true" style="background-image:url('${BASE}assets/garden-sanctuary-v2.webp')"></span><span><small>정원 가꾸기</small><b>별 ★${starWallet()}개로 정원을 꾸밀 수 있어요</b></span><i aria-hidden="true">›</i></button>`:''}
   <p class="sp-meta sp-rank-status" role="status">랭킹을 확인하는 중…</p><button class="sp-primary sp-rank-open">씨앗 맞추기 랭킹 보기</button>
   <div class="sp-row">${next?'<button class="sp-primary sp-next">다음 단계</button>':''}<button class="${next?'':'sp-primary '}sp-again">다시 하기</button><button class="sp-to-menu">단계 고르기</button></div>`);
  Promise.resolve(onResult({progress,stage:def.n||1,stars:record.stars,score:s.score,def,state:s})).then(note=>{const el=modal.querySelector('.sp-rank-status');if(el&&note)el.textContent=String(note);}).catch(()=>{});
  modal.querySelector('.sp-rank-open').onclick=onRanking;
  if(next)modal.querySelector('.sp-next').onclick=()=>intro(next);modal.querySelector('.sp-again').onclick=()=>intro(def);modal.querySelector('.sp-to-menu').onclick=menu;
  modal.querySelector('[data-garden]')?.addEventListener('click',gardenScreen);
  audio?.play(won?'evolve':'hurt');
 }

 resize();walletUpdate();menu();raf=requestAnimationFrame(loop);
 return {close,
  // 로컬 검증용(화면 시연): 지금 판 상태.
  debug:()=>({stage:def?.id||null,phase:s?.phase||null,score:s?.score||0,moves:s?.movesLeft??null,busy:busy(),sprites:sprites.size,modal:modal.hidden?null:modal.dataset.kind,
   hint:s?findHint(s):null,board:{x:bx,y:by,cell:cs},streak:progress.streak,
   plant:(i,o)=>{if(!s||!s.cells[i])return false;Object.assign(s.cells[i],o);Object.assign(sprites.get(s.cells[i].id),o);return true;},
   lives:()=>livesNow(),stars:()=>({earned:earnedStars(),wallet:starWallet(),decor:[...getGarden().decor]}),garden:()=>gardenScreen(),
   start:(id,boosters=[])=>{const d=id==='daily'?dailyPuzzleStage(seoulDay()):PUZZLE_STAGE_BY_ID[id];if(d)start(d,boosters);},move:(a,b)=>tryMove(a,b),tap:i=>tryTap(i),tool:(t,i)=>tryTool(t,i),setMoves:n=>{if(s)s.movesLeft=n;hudUpdate();}})};
}
