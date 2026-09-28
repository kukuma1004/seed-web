import {createDuel,stepDuel,DUEL_CHARACTERS,DUEL_ORDER,DUEL_ARENA,DUEL_PILLARS,DUEL_RULES} from './seed-duel-rules.js';
import {createCanvasVfx} from './canvas-vfx.js';
import {PROJECTILE_DNA_CELLS} from './projectile-sprites.js';
import {lawArt} from './law-art.js';
import {createFramePacer} from './frame-time.js';
import './choice.css';
import './seed-duel.css';

// 씨앗 대전 화면(1차 · 시험). 캐릭터는 본편 단독 진화 씨앗 그림(cute/seed-solo-v1, 4×3칸), 효과는 본편 이펙트 소재.
const BASE=import.meta.env.BASE_URL;
const SOUND={hit:['hit'],heavyHit:['burstHit',{pitch:.85}],block:['reflect',{pitch:.8}],parry:['evolve'],guardBreak:['bossAttack'],dash:['dash'],skill:['shot'],ultimate:['ultimate'],start:['bossWarning'],win:['bossDefeat'],lose:['hurt'],charge:['shotGravity',{pitch:.7}],swing0:['shot'],swing1:['shot',{pitch:1.1}],swing2:['shotPierce'],reflect:['reflect']};
export function mountSeedDuel({host=document.body,audio,onClose=()=>{}}={}){
 const root=document.createElement('section');root.id='seed-duel';root.setAttribute('aria-label','씨앗 대전');
 root.innerHTML=`<canvas aria-label="씨앗 대전"></canvas><header class="sd-top"><div class="sd-side sd-p0"><b></b><div class="sd-hp"><i></i></div><div class="sd-guard"><i></i></div><div class="sd-meter"><i></i></div></div><div class="sd-center"><span class="sd-rounds"></span><strong class="sd-timer"></strong></div><div class="sd-side sd-p1"><b></b><div class="sd-hp"><i></i></div><div class="sd-guard"><i></i></div><div class="sd-meter"><i></i></div></div><button class="sd-pause" aria-label="그만하기">Ⅱ</button></header><div class="sd-message"></div>
 <div class="sd-controls"><div class="sd-stick" role="button" aria-label="이동"><i></i></div><div class="sd-buttons"><button data-act="ult" class="sd-ult">필살<small>O</small></button><button data-act="skill1" class="sd-skill">스킬1<small>U</small></button><button data-act="skill2" class="sd-skill">스킬2<small>I</small></button><button data-act="heavy" class="sd-heavy">강공격<small>L</small></button><button data-act="block" class="sd-block">막기<small>K</small></button><button data-act="dodge" class="sd-dodge">회피<small>Space</small></button><button data-act="attack" class="sd-attack">공격<small>J</small></button></div></div>
 <div class="sd-pc">WASD 이동 · J 공격 · K 누르고 막기(맞기 직전 누르면 반격 막기) · L 강공격(막기 부수기) · Space 회피 · U/I 스킬 · O 필살</div><div class="sd-modal"></div>`;
 host.append(root);document.body.classList.add('seed-duel-open');
 const $=q=>root.querySelector(q),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),assets={},keys=new Set(),held=new Set(),pressed=new Set(),listeners=[];
 const vfx=createCanvasVfx(),pacer=createFramePacer();
 let s=null,raf=0,last=0,closed=false,width=1,height=1,scale=1,ox=0,oy=0,pick={player:'pierce',enemy:'random',difficulty:'normal'},uiAt=0;
 const move={x:0,y:0},listen=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const load=(k,f)=>{const im=new Image();im.src=BASE+'assets/'+f;assets[k]=im;};
 load('solo','cute/seed-solo-v1.webp');load('floor','garden-sanctuary-v2.webp');load('plants','garden-growth-atlas-v3.webp');load('dna','mobile/seed-projectile-dna-v1.png');
 const point=(x,y)=>({x:ox+x*scale,y:oy+y*scale});
 function resize(){const r=root.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(1.5,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/24,(height-40)/14.2);ox=width/2-12*scale;oy=height/2-7.9*scale+14;}
 function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);for(const off of listeners)off();root.remove();document.body.classList.remove('seed-duel-open');onClose();}
 // ── 고르기 화면
 const portrait=(id,extra='')=>{const c=DUEL_CHARACTERS[id];return `<span class="sd-portrait ${extra}" style="background-image:url('${BASE}assets/cute/seed-solo-v1.webp');background-position:${c.tile%4*100/3}% ${Math.floor(c.tile/4)*50}%"></span>`;};
 function select(){
  const card=id=>{const c=DUEL_CHARACTERS[id];return `<button class="sd-card${pick.player===id?' on':''}" data-pick="${id}" style="--ink:${c.ink}">${portrait(id)}<span><b>${c.name}</b><small>${c.role}</small><em>${c.blurb}</em><i>${lawArt(id,'sd-law')} ${c.skills[0].name} · ${c.skills[1].name} · 필살 ${c.ult.name}</i></span></button>`;};
  $('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper"><p class="sd-eyebrow">SEED · DUEL · 시험 모드</p><h1>씨앗 대전</h1><p>공격은 막기에, 막기는 강공격·잡기에 져요. 맞기 직전에 막으면 <b>반격 막기</b>.</p><div class="sd-cards">${DUEL_ORDER.map(card).join('')}</div>
   <div class="sd-row"><span>상대</span>${['random',...DUEL_ORDER].map(id=>`<button class="sd-chip${pick.enemy===id?' on':''}" data-enemy="${id}">${id==='random'?'무작위':DUEL_CHARACTERS[id].name}</button>`).join('')}</div>
   <div class="sd-row"><span>난이도</span>${[['easy','쉬움'],['normal','보통'],['hard','어려움']].map(([id,n])=>`<button class="sd-chip${pick.difficulty===id?' on':''}" data-diff="${id}">${n}</button>`).join('')}</div>
   <button class="sd-primary sd-go">대전 시작 · 세 판 두 선승</button><button class="sd-back">돌아가기</button><small>보상·랭킹 없는 시험 모드예요.</small></div>`;
  root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pick.player=b.dataset.pick;select();});
  root.querySelectorAll('[data-enemy]').forEach(b=>b.onclick=()=>{pick.enemy=b.dataset.enemy;select();});
  root.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{pick.difficulty=b.dataset.diff;select();});
  $('.sd-go').onclick=start;$('.sd-back').onclick=close;
 }
 function start(){const others=DUEL_ORDER.filter(id=>id!==pick.player),enemy=pick.enemy==='random'?others[Math.floor(Math.random()*others.length)]:pick.enemy;s=createDuel({player:pick.player,enemy,seed:Date.now()>>>0,difficulty:pick.difficulty});$('.sd-modal').hidden=true;audio?.unlock?.();$('.sd-p0 b').textContent=DUEL_CHARACTERS[pick.player].name+' (나)';$('.sd-p1 b').textContent=DUEL_CHARACTERS[enemy].name;root.classList.add('sd-playing');last=0;if(!raf)raf=requestAnimationFrame(loop);}
 function result(){const win=s.winner===0;$('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-small"><p class="sd-eyebrow">${win?'VICTORY':'DEFEAT'}</p><h1>${win?'대전 승리!':'대전 패배'}</h1>${portrait(s.fighters[win?0:1].char,'big')}<p>${s.wins[0]} : ${s.wins[1]}</p><button class="sd-primary sd-again">다시 붙기</button><button class="sd-pickagain">캐릭터 다시 고르기</button><button class="sd-back">돌아가기</button></div>`;$('.sd-again').onclick=start;$('.sd-pickagain').onclick=()=>{root.classList.remove('sd-playing');select();};$('.sd-back').onclick=close;}
 // ── 입력
 function input(){const i={x:move.x+((keys.has('KeyD')||keys.has('ArrowRight'))?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft'))?1:0),y:move.y+((keys.has('KeyS')||keys.has('ArrowDown'))?1:0)-((keys.has('KeyW')||keys.has('ArrowUp'))?1:0),block:held.has('block')||keys.has('KeyK')};
  if(Math.hypot(i.x,i.y)>.1){i.aimX=i.x;i.aimY=i.y;}for(const a of pressed)i[a]=true;pressed.clear();return i;}
 const KEY={KeyJ:'attack',KeyL:'heavy',Space:'dodge',KeyU:'skill1',KeyI:'skill2',KeyO:'ult'};
 listen(window,'keydown',e=>{if(e.target?.closest?.('input,textarea'))return;if(e.code==='Escape'){close();return;}if(!s||s.phase==='over')return;if(KEY[e.code]||['KeyW','KeyA','KeyS','KeyD','KeyK','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(KEY[e.code])pressed.add(KEY[e.code]);});
 listen(window,'keyup',e=>keys.delete(e.code));listen(window,'blur',()=>{keys.clear();held.clear();move.x=move.y=0;});
 root.querySelectorAll('[data-act]').forEach(b=>{const a=b.dataset.act;listen(b,'pointerdown',e=>{e.preventDefault();if(a==='block')held.add('block');else pressed.add(a);b.classList.add('down');});for(const n of ['pointerup','pointercancel','pointerleave'])listen(b,n,()=>{if(a==='block')held.delete('block');b.classList.remove('down');});});
 const stick=$('.sd-stick');let stickId=null;
 listen(stick,'pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});listen(stick,'pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});
 for(const n of ['pointerup','pointercancel','lostpointercapture'])listen(stick,n,()=>{stickId=null;move.x=move.y=0;stick.querySelector('i').style.transform='';});
 function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),m=r.width*.36,k=Math.min(1,d/m);move.x=d>8?x/d:0;move.y=d>8?y/d:0;stick.querySelector('i').style.transform=`translate(${(x/(d||1))*k*m}px,${(y/(d||1))*k*m}px)`;}
 $('.sd-pause').onclick=close;
 // ── 루프
 function loop(now){raf=requestAnimationFrame(loop);if(closed||document.hidden||!pacer(now,60))return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(s&&s.phase!=='over'){stepDuel(s,dt,input());for(const ev of s.events){const [id,o]=SOUND[ev]||[];if(id)audio?.play(id,o);}s.events.length=0;if(s.phase==='over'){setTimeout(result,900);}}
  draw();if(now-uiAt>90){uiAt=now;hud();}}
 function hud(){if(!s)return;for(const f of s.fighters){const side=$('.sd-p'+f.team);side.querySelector('.sd-hp i').style.width=Math.max(0,f.hp/f.maxHp*100)+'%';side.querySelector('.sd-guard i').style.width=f.guard/DUEL_RULES.guardMax*100+'%';side.querySelector('.sd-meter i').style.width=f.meter+'%';side.classList.toggle('ult-ready',f.meter>=100);}
  $('.sd-rounds').textContent=`${'●'.repeat(s.wins[0])}${'○'.repeat(2-s.wins[0])}  ${s.round}R  ${'○'.repeat(2-s.wins[1])}${'●'.repeat(s.wins[1])}`;$('.sd-timer').textContent=Math.max(0,Math.ceil(s.roundTime));
  const msg=s.phase==='ready'?`${s.round}라운드 · 준비`:s.message;if($('.sd-message').textContent!==msg){$('.sd-message').textContent=msg;$('.sd-message').classList.remove('pop');void $('.sd-message').offsetWidth;$('.sd-message').classList.add('pop');}
  const p=s.fighters[0],c=DUEL_CHARACTERS[p.char];root.querySelectorAll('.sd-skill').forEach((b,i)=>{b.firstChild.textContent=p.cd[i]>0?Math.ceil(p.cd[i])+'초':c.skills[i].name;b.classList.toggle('cooldown',p.cd[i]>0);});$('.sd-ult').classList.toggle('ready',p.meter>=100);$('.sd-dodge').classList.toggle('cooldown',p.dodgeCd>0);}
 function draw(){
  ctx.fillStyle='#071215';ctx.fillRect(0,0,width,height);
  const a=point(DUEL_ARENA.minX-1.2,DUEL_ARENA.minY-1.6),b=point(DUEL_ARENA.maxX+1.2,DUEL_ARENA.maxY+1.2),fl=assets.floor;
  if(fl?.naturalWidth){ctx.save();ctx.beginPath();ctx.roundRect?.(a.x,a.y,b.x-a.x,b.y-a.y,18);ctx.clip();const w=b.x-a.x,h=b.y-a.y,k=Math.max(w/fl.naturalWidth,h/fl.naturalHeight);ctx.drawImage(fl,a.x+(w-fl.naturalWidth*k)/2,a.y+(h-fl.naturalHeight*k)/2,fl.naturalWidth*k,fl.naturalHeight*k);ctx.fillStyle='#04101444';ctx.fillRect(a.x,a.y,w,h);ctx.restore();}
  ctx.strokeStyle='#e8d9aa55';ctx.lineWidth=2;ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
  if(!s)return;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  for(const h of s.hazards){const ink=DUEL_CHARACTERS[s.fighters[h.owner].char].ink;if(h.kind==='tell'||h.kind==='mine'){ctx.fillStyle=h.kind==='tell'?'#ff6b4a33':'#ffaa6533';ctx.beginPath();ctx.ellipse(h.x,h.y,h.r,h.r*.72,0,0,Math.PI*2);ctx.fill();vfx.fx(ctx,'flame',h.x,h.y-.3,.8+.3*Math.sin(s.time*20),{color:'#ffaa65',alpha:.9});}else vfx.field(ctx,{x:h.x,y:h.y,radius:h.r*.7,kind:'well'},1,s.time*1000,ink);}
  const actors=[...s.fighters.map(f=>({...f,type:'f',ref:f})),...DUEL_PILLARS.map(p=>({...p,type:'p'}))].sort((p,q)=>p.y-q.y);
  for(const o of actors){if(o.type==='p'){const im=assets.plants;if(im?.naturalWidth){const cw=im.naturalWidth/4,ch=im.naturalHeight/3,z=2.6;ctx.drawImage(im,3*cw,2*ch,cw,ch,o.x-z/2,o.y-z*.9,z,z);}continue;}fighterDraw(o.ref);}
  for(const q of s.shots){const im=assets.dna,a2=Math.atan2(q.dy,q.dx),ink=DUEL_CHARACTERS[q.law]?.ink||'#fff';vfx.projectile(ctx,q.law,q.x,q.y-.6,a2,.55,ink,s.time*1000);if(im?.naturalWidth){const cell=PROJECTILE_DNA_CELLS[q.law]??0,cw=im.naturalWidth/4,z=q.kind==='lance'?1.3:.9;ctx.save();ctx.translate(q.x,q.y-.6);ctx.rotate(a2);ctx.drawImage(im,cell%4*cw,Math.floor(cell/4)*cw,cw,cw,-z/2,-z/2,z,z);ctx.restore();}}
  for(const e of s.effects){const t=1-e.life/e.max,ink=e.ink||'#fce6af';
   if(e.type==='swing'){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-t;ctx.translate(e.x,e.y-.55);ctx.scale(1,.75);ctx.strokeStyle=ink;ctx.lineWidth=.22;ctx.beginPath();ctx.arc(0,0,e.r*(.7+t*.3),e.angle-.9+t*.5,e.angle+.9+t*.5);ctx.stroke();ctx.lineWidth=.08;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();continue;}
   const kind={hit:'hit',heavy:'burst',block:'reflect',parry:'sunburst',guardBreak:'core',boom:'explosion',pull:'well',ult:'sunburst',jail:'portal',shield:'pulse',miss:'muzzle'}[e.type]||'hit';
   vfx.effect(ctx,{kind,x:e.x,y:e.y-.6,radius:e.r?e.r*.6:e.type==='guardBreak'?1.2:.8,law:''},t,e.type==='guardBreak'?'#ff7a66':ink,.55);
   if(e.text&&t<.8){ctx.save();ctx.globalAlpha=1-t;ctx.font='bold .6px Georgia';ctx.textAlign='center';ctx.lineWidth=.12;ctx.strokeStyle='#18242a';ctx.fillStyle=e.type==='heavy'?'#ffd36b':'#fff0cf';ctx.strokeText(e.text,e.x,e.y-2.1-t);ctx.fillText(e.text,e.x,e.y-2.1-t);ctx.restore();}}
  ctx.restore();
 }
 function fighterDraw(f){
  const c=DUEL_CHARACTERS[f.char],im=assets.solo,sz=2.3,flip=f.fx<0;
  ctx.fillStyle='#02090a70';ctx.beginPath();ctx.ellipse(f.x,f.y+.05,.7,.26,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=f.team===0?'#8fd3ff':'#ff8a7a';ctx.lineWidth=.07;ctx.beginPath();ctx.ellipse(f.x,f.y+.05,.78,.32,0,0,Math.PI*2);ctx.stroke();
  if(f.state==='heavy'&&f.t>.12)vfx.fx(ctx,'orb',f.x+f.fx*.5,f.y-.9,1.2+(.58-f.t)*2,{color:c.ink,alpha:.9});
  const lean=f.state==='attack'||f.state==='heavy'&&f.t<=.12?.18:f.state==='dash'?.3:0,bob=Math.sin(s.time*6+f.team)*.04;
  ctx.save();ctx.translate(f.x+f.fx*lean,f.y+bob);if(flip)ctx.scale(-1,1);if(f.state==='hit'||f.state==='broken'||f.state==='stagger')ctx.rotate(-.12);
  if(f.inv>0&&f.state==='dodge')ctx.globalAlpha=.55;
  if(im?.naturalWidth){const cw=im.naturalWidth/4,ch=im.naturalHeight/3;ctx.drawImage(im,c.tile%4*cw,Math.floor(c.tile/4)*ch,cw,ch,-sz/2,-sz*.92,sz,sz);}
  ctx.restore();
  if(f.blocking){const a=Math.atan2(f.fy,f.fx);ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(f.x,f.y-.8);ctx.scale(1,.8);ctx.strokeStyle=s.time-f.blockSince<=DUEL_RULES.parryWindow*c.parry?'#fff6c8':c.ink;ctx.lineWidth=.16;ctx.beginPath();ctx.arc(0,0,1.05,a-1,a+1);ctx.stroke();ctx.restore();}
  if(f.shield>0)vfx.fx(ctx,'ring',f.x,f.y-.8,2.6,{color:c.ink,alpha:.8});
  if(f.state==='broken'||f.state==='stagger'||f.state==='jailed'){for(let i=0;i<3;i++){const a=s.time*5+i*2.1;vfx.fx(ctx,'star',f.x+Math.cos(a)*.5,f.y-2+Math.sin(a)*.15,.5,{color:'#ffe08a',alpha:.9});}}
  if(f.state==='jailed')vfx.fx(ctx,'sigil',f.x,f.y-.9,2.4,{color:c.ink,alpha:.7,rotation:s.time});
 }
 listen(window,'resize',resize);resize();select();raf=requestAnimationFrame(loop);
 return {close};
}
