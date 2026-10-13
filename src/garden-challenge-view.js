import {CHALLENGE,createGardenChallenge,stepGardenChallenge,chooseGardenChallenge,gardenChallengeSummary} from './garden-challenge-rules.js';
import {LAWS} from './laws.js';
import {GARDEN_OBJECT_ART} from './garden-theme-art.js';
import {advanceFrame,createFramePacer} from './frame-time.js';
import {readGardenChallengeRecords,recordGardenChallenge} from './garden-challenge-records.js';
import './garden-challenge.css';

const BASE=import.meta.env.BASE_URL,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=id=>'#'+(LAWS[id]?.color??0xd9edab).toString(16).padStart(6,'0');
const clock=value=>`${Math.floor(Math.max(0,value)/60)}:${String(Math.floor(Math.max(0,value)%60)).padStart(2,'0')}`;
const SHOT={burst:'shotBurst',orbit:'shotOrbit',reflect:'shotCrystal',pierce:'shotPierce',gravity:'shotGravity',chain:'shotArc',frost:'shotFrost',split:'shotPetal',recall:'shotReturn'};
const HIT={burst:'burstHit',gravity:'gravityHit',pierce:'pierceHit',frost:'frostHit',chain:'chain',reflect:'reflect',split:'split'};
const FILES={decor:'garden/objects-greenhouse-v1.webp',garden:'garden-sanctuary-v2.webp',terrain:'adventure/garden-terrain-atlas-v2.webp',seed:'adventure/seed-combat-v1.webp',sprout:'cute/enemy-caster-v4.webp',hound:'cute/enemy-hound-v4.webp',shield:'cute/enemy-shield-v4.webp',boss:'duel/gravity-motion-v1.webp'};

// Standalone short-run scene. It reads/writes only its dedicated local journal.
export function mountGardenChallenge({host=document.body,audio,storage,onClose=()=>{}}={}){
 const root=document.createElement('section');root.id='garden-challenge';root.setAttribute('aria-label','3분 정원 도전');
 root.innerHTML=`<canvas aria-label="움직이며 적을 피하는 정원 전장" tabindex="0"></canvas><header class="gc-hud"><div class="gc-identity"><small>SEED</small><b>정원 도전</b></div><div class="gc-health"><span>생명 <b>—</b></span><meter min="0" max="100" value="100" aria-label="남은 생명"></meter></div><strong class="gc-clock">3:00</strong><small class="gc-score">0점</small><button class="gc-mute" aria-label="소리 끄기">♪</button><button class="gc-pause" aria-label="일시정지">Ⅱ</button></header><div class="gc-goal" role="status"></div><div class="gc-boss" hidden><span>밤의 정원 수호자</span><meter aria-label="보스 남은 생명"></meter></div><div class="gc-notice" role="status"></div><footer class="gc-controls"><div class="gc-stick" role="group" aria-label="이동 조이스틱"><i></i><span>이동</span></div><p class="gc-build"></p><button class="gc-dodge" aria-label="회피"><span>↗</span><b>회피</b><small>Space</small></button></footer><div class="gc-modal"></div>`;
 host.append(root);
 const $=q=>root.querySelector(q),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),modal=$('.gc-modal'),images={},listeners=[],keys=new Set(),move={x:0,y:0},intent={x:0,y:0,dash:false},order=[];
 const previousAudio=audio?.state?.()||{},media=window.matchMedia?.('(prefers-reduced-motion: reduce)'),pacer=createFramePacer();
 let closed=false,run=null,paused=false,shown='',raf=0,last=0,hudAt=0,width=1,height=1,dpr=1,scale=1,bx=0,by=0,back=null,stickId=null,dodgeId=null,dashPending=false,picked='normal',loadFailed=false,loads=0,noticeUntil=0,shotPose=0,reduced=Boolean(media?.matches),saved=null;
 let muted=Boolean(previousAudio.muted),journal=readGardenChallengeRecords(storage);
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 const sound=(id,options)=>{if(!muted)audio?.play?.(id,options);};
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
 function resetInput(){keys.clear();move.x=move.y=0;dashPending=false;for(const [element,id] of [[$('.gc-stick'),stickId],[$('.gc-dodge'),dodgeId]]){if(id!==null)try{element.releasePointerCapture?.(id);}catch{}}stickId=dodgeId=null;$('.gc-stick i').style.transform='';}
 function wake(){if(!closed&&!paused&&!document.hidden&&run?.phase==='playing'&&!raf)raf=requestAnimationFrame(loop);}
 function setOverlay(html){stop();resetInput();root.classList.add('gc-overlay');modal.hidden=false;modal.innerHTML=html;const primary=modal.querySelector('button:not(:disabled)');primary?.focus({preventScroll:true});}
 function resume(){if(closed||document.hidden||run?.phase!=='playing')return;paused=false;shown='';root.classList.remove('gc-overlay');modal.hidden=true;resetInput();audio?.setScene?.(run.bossSpawned?'boss':'combat');const resumed=audio?.setPaused(false);canvas.focus({preventScroll:true});hud();draw();wake();return resumed;}
 function close(){if(closed)return;closed=true;stop();resetInput();for(const off of listeners)off();for(const im of Object.values(images))im.onload=im.onerror=null;back=null;order.length=0;root.remove();audio?.setMuted?.(Boolean(previousAudio.muted));audio?.setScene?.(previousAudio.musicScene||'garden');audio?.setPaused(Boolean(previousAudio.paused));onClose();}
 function loadAssets(){
  const generation=++loads;loadFailed=false;
  for(const [key,path] of Object.entries(FILES)){const im=new Image();images[key]=im;im.onload=()=>{if(closed||generation!==loads)return;back=null;ready();draw();};im.onerror=()=>{if(closed||generation!==loads)return;loadFailed=true;ready();};im.src=BASE+'assets/'+path;}
  ready();
 }
 const loaded=()=>!loadFailed&&Object.keys(FILES).every(key=>images[key]?.naturalWidth>0);
 function ready(){const button=$('.gc-start');if(!button)return;button.disabled=!loaded();const text=$('.gc-loading');if(text)text.textContent=loadFailed?'정원 그림을 불러오지 못했어요. 다시 준비해 주세요.':loaded()?'준비됐어요 · 자동 공격, 움직임은 내가':'정원 그림을 준비하고 있어요…';const retry=$('.gc-load-retry');if(retry)retry.hidden=!loadFailed;}
 function recordLine(mode){const r=journal.records[mode];return r.plays?`최고 ${r.bestScore.toLocaleString()}점 · ${r.wins}/${r.plays}승`:'첫 씨앗을 심어 보세요';}
 function menu(){
  stop();resetInput();run=null;paused=false;saved=null;shown='menu';journal=readGardenChallengeRecords(storage);audio?.setScene?.('garden');audio?.setPaused(Boolean(document.hidden));
  setOverlay(`<article class="gc-intro"><small>작은 씨앗 · 나만의 싸움법</small><h1>3분 정원 도전</h1><p>몰려오는 적을 피하며 두 법칙을 키우세요.<br><b>마지막 수호자를 쓰러뜨리면 승리!</b></p><div class="gc-modes"><button data-mode="normal" class="${picked==='normal'?'on':''}"><b>일반</b><span>처음이어도 괜찮아요</span><small>${recordLine('normal')}</small></button><button data-mode="expert" class="${picked==='expert'?'on':''}"><b>숙련</b><span>더 빠른 압박 · 더 높은 기록</span><small>${recordLine('expert')}</small></button></div><p class="gc-loading" role="status"></p><button class="gc-start gc-primary" disabled>정원으로 출발</button><button class="gc-load-retry" hidden>그림 다시 준비</button><button class="gc-exit">돌아가기</button><small class="gc-help">WASD / 방향키 이동 · Space 회피 · Esc 잠시 쉬기<br>전투 최대 3분 · 성장 선택과 휴식은 시간에서 제외<br>기록은 이 기기에만 · 계정·정원·랭킹 보상과 별개</small>${journal.error?`<p class="gc-storage-note">${escape(journal.error)}</p>`:''}</article>`);
  for(const button of root.querySelectorAll('[data-mode]'))button.onclick=()=>{picked=button.dataset.mode;root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b===button));sound('select');};
  $('.gc-start').onclick=start;$('.gc-load-retry').onclick=loadAssets;$('.gc-exit').onclick=close;ready();hud();draw();
 }
 function start(){if(!loaded()||closed||document.hidden)return;stop();resetInput();run=createGardenChallenge(Date.now(),picked);saved=null;paused=false;shown='';noticeUntil=0;shotPose=0;$('.gc-notice').textContent='';audio?.unlock?.();resume();}
 function pause(reason='이동과 공격은 잠시 기다려요.'){if(!run||run.phase!=='playing'||paused)return;paused=true;shown='pause';audio?.setPaused(true);setOverlay(`<article><small>3분 정원 도전 · ${picked==='expert'?'숙련':'일반'}</small><h2>잠시 쉬어 가요</h2><p>${escape(reason)}</p><button class="gc-resume gc-primary">계속하기</button><button class="gc-retry">처음부터 다시</button><button class="gc-exit">돌아가기</button><small>선택·일시정지 동안 제한 시간은 흐르지 않아요.</small></article>`);$('.gc-resume').onclick=resume;$('.gc-retry').onclick=start;$('.gc-exit').onclick=close;hud();draw();}
 function choice(){
  if(shown==='choice')return;shown='choice';audio?.setPaused(true);const offers=run.offers||[],featured=offers.filter(o=>o.recommended).slice(0,3);for(const o of offers)if(featured.length<3&&!featured.includes(o))featured.push(o);const more=offers.filter(o=>!featured.includes(o));
  const card=o=>`<button class="gc-offer" data-choice="${escape(o.id)}"><i style="--law:${color(o.law)}">${escape(LAWS[o.law]?.icon||'✦')}</i><div><b>${escape(o.name)}</b><span>${escape(o.description)}</span></div></button>`;
  setOverlay(`<article class="gc-growth"><small>시간은 멈춰 있어요 · ${clock(run.time)}</small><h2>내 씨앗의 다음 법칙</h2><p>선택한 힘은 지금부터 실제 공격에 반영돼요.</p><div class="gc-featured">${featured.map(card).join('')}</div>${more.length?`<details class="gc-other"><summary>다른 법칙·성장 보기 (${more.length})</summary><div>${more.map(card).join('')}</div></details>`:''}<button class="gc-exit gc-subtle">돌아가기</button><small>${run.fusion?`현재 융합: ${escape(run.fusion.name)}`:'두 법칙을 키우면 이번 판의 융합이 열려요.'}</small></article>`);
  for(const button of root.querySelectorAll('[data-choice]'))button.onclick=async()=>{if(closed||document.hidden||!chooseGardenChallenge(run,button.dataset.choice))return;const selected=run,cue=button.dataset.choice.startsWith('fusion:')?'fusion':'evolve';if(run.phase==='playing'){const resumed=resume();if(resumed?.then)await resumed;if(closed||paused||run!==selected||run.phase!=='playing')return;sound(cue);notice(cue==='fusion'?`${run.fusion.name} 완성`:'씨앗이 자랐어요',2.2);}else{shown='';syncPhase();}};
  $('.gc-exit').onclick=close;hud();draw();
 }
 function finish(){
  if(shown==='result')return;shown='result';paused=false;stop();resetInput();audio?.setScene?.('garden');audio?.setPaused(Boolean(document.hidden));sound(run.phase==='won'?'bossDefeat':'hurt');
  const summary=gardenChallengeSummary(run),build=Object.entries(run.levels||{}).filter(([,level])=>level>0).map(([id,level])=>`${LAWS[id]?.name||id} Lv.${level}`);
  if(summary.supportGrowth.tempo)build.push(`빠른 꽃잎 ${summary.supportGrowth.tempo}회`);
  if(summary.supportGrowth.vigor)build.push(`단단한 새싹 ${summary.supportGrowth.vigor}회 · 최대 생명 +${summary.supportGrowth.vigor*14}`);
  saved=recordGardenChallenge({...summary,phase:run.phase,difficulty:run.difficulty,score:run.score,kills:run.kills,seconds:run.time,build,fusion:run.fusion?.name||'',reason:run.reason||''},storage);journal={records:saved.records};
  const row=saved.records[picked],recent=saved.records.recent.slice(0,4),won=run.phase==='won';
  setOverlay(`<article class="gc-result"><small>${picked==='expert'?'숙련':'일반'} · 이번 판의 씨앗</small><h1>${won?'정원을 지켰어요!':'다음 씨앗으로 다시 도전'}</h1><p class="gc-result-score">${run.score.toLocaleString()}<span>점</span></p><p>${clock(run.time)} · ${run.kills}마리 격파 · 수집한 공급 꽃 ${run.suppliesCollected||0}개</p><p>${escape(won?'움직임과 두 법칙이 하나의 싸움법이 됐어요.':run.reason||'무리 사이의 빈 길을 찾아 움직이고, 붉은 예고에서 회피해 보세요.')}</p><div class="gc-recap"><b>${escape(run.fusion?.name||'이번 판의 빌드')}</b><span>${escape(build.join(' + ')||'기본 씨앗')}</span></div><div class="gc-result-actions"><button class="gc-retry gc-primary">다시 도전</button><button class="gc-menu">난이도</button><button class="gc-exit">돌아가기</button></div><details class="gc-journal"><summary>이 기기의 씨앗 기록 · 최고 ${row.bestScore.toLocaleString()}점</summary>${recent.map(r=>`<p><b>${r.difficulty==='expert'?'숙련':'일반'} · ${r.phase==='won'?'승리':'도전'}</b> ${r.score.toLocaleString()}점 · ${clock(r.seconds)}<small>${escape([r.fusion,...r.build].filter(Boolean).join(' · ')||'기본 씨앗')}</small></p>`).join('')}</details><small>${saved.ok?'이 기기에 기록했어요 · 계정·정원·랭킹에는 반영하지 않아요.':escape(saved.error)}</small></article>`);
  $('.gc-retry').onclick=start;$('.gc-menu').onclick=menu;$('.gc-exit').onclick=close;hud();draw();
 }
 function syncPhase(){if(!run)return;if(run.phase==='choice')choice();else if(run.phase==='won'||run.phase==='lost')finish();}
 function consume(){
  for(const event of run.events||[]){const type=event.type;
   if(type==='shot'){shotPose=.12;sound(SHOT[event.law]||'shot');}
   else if(type==='hit')sound(HIT[event.law]||'hit');
   else if(type==='hurt')sound('hurt');else if(type==='dash')sound('dash');
   else if(type==='heal'){sound('pickup');notice(`공급 꽃 · 생명 +${event.value??24}`,1.4);}
   else if(type==='supply'){sound('harvest');notice('공급 꽃이 피었어요 · 꽃으로 움직여 회복',2.6);}
   else if(type==='boss'){sound('bossWarning');notice('수호자 등장 · 붉은 예고를 피하세요',3);audio?.setScene?.('boss');}
   else if(type==='bossBreather')notice(`마지막 결전 · 생명 +${event.value}`,2.6);
   else if(type==='warning')sound('bossWarning',{intensity:.6});
   else if(type==='growth'){sound(event.law==='fusion'?'fusion':'evolve');notice(event.law==='fusion'?`${run.fusion?.name||'융합'} 완성`:'씨앗이 자랐어요',2.2);}
   else if(type==='shatter')sound('frostHit');else if(type==='reflect')sound('reflect');
  }
 }
 function notice(text,seconds){$('.gc-notice').textContent=text;noticeUntil=run.time+seconds;}
 function hud(){
  if(!run){$('.gc-health b').textContent='—';$('.gc-clock').textContent='3:00';$('.gc-score').textContent='0점';$('.gc-goal').textContent='';$('.gc-build').textContent='';$('.gc-boss').hidden=true;$('.gc-dodge').disabled=true;return;}
  $('.gc-score').textContent=run.score.toLocaleString()+'점';const p=run.player;$('.gc-health b').textContent=Math.ceil(p.hp)+'/'+p.maxHp;const hp=$('.gc-health meter');hp.max=p.maxHp;hp.value=p.hp;$('.gc-health').classList.toggle('low',p.hp/p.maxHp<.3);$('.gc-clock').textContent=clock(CHALLENGE.duration-run.time);$('.gc-clock').classList.toggle('urgent',run.time>160);$('.gc-goal').textContent=paused?'일시정지':run.bossSpawned?'수호자를 쓰러뜨리세요 · 붉은 예고에서 벗어나기':run.time<9?'공격은 자동 · 적 사이 빈 길로 움직여 보세요':`두 법칙을 키우며 살아남기 · 수호자까지 ${Math.max(0,Math.ceil(CHALLENGE.bossAt-run.time))}초`;
  $('.gc-build').textContent=run.fusion?run.fusion.name:Object.entries(run.levels||{}).filter(([,n])=>n>0).map(([id,n])=>`${LAWS[id]?.name||id} ${n}`).join(' + ')||'나만의 씨앗을 키우세요';
  const dodge=$('.gc-dodge');dodge.disabled=paused||run.phase!=='playing'||p.dashCd>0;dodge.querySelector('small').textContent=p.dashCd>0?Math.ceil(p.dashCd)+'초':'Space';dodge.classList.toggle('ready',p.dashCd<=0);
  const boss=run.enemies.find(e=>e.active&&e.type==='boss');$('.gc-boss').hidden=!boss;if(boss){const meter=$('.gc-boss meter');meter.max=boss.maxHp;meter.value=boss.hp;}
  $('.gc-pause').disabled=run.phase!=='playing';if(run.time>=noticeUntil)$('.gc-notice').textContent='';
 }
 const px=x=>bx+(x+CHALLENGE.width/2)*scale,py=y=>by+(y+CHALLENGE.height/2)*scale;
 function ring(x,y,r,ink,fill=false){ctx.beginPath();ctx.arc(px(x),py(y),r*scale,0,Math.PI*2);ctx.lineWidth=2;ctx.strokeStyle=ink;ctx.fillStyle=ink;fill?ctx.fill():ctx.stroke();}
 function backdrop(){
  if(back)return;back=document.createElement('canvas');back.width=Math.ceil(width*dpr);back.height=Math.ceil(height*dpr);const g=back.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#122820';g.fillRect(0,0,width,height);
  const garden=images.garden;if(garden?.naturalWidth){const z=Math.max(width/garden.naturalWidth,height/garden.naturalHeight);g.drawImage(garden,(width-garden.naturalWidth*z)/2,(height-garden.naturalHeight*z)/2,garden.naturalWidth*z,garden.naturalHeight*z);g.fillStyle='#071c19b3';g.fillRect(0,0,width,height);}
  const w=CHALLENGE.width*scale,h=CHALLENGE.height*scale;g.save();g.beginPath();g.roundRect(bx-5,by-5,w+10,h+10,18);g.fillStyle='#98af7766';g.fill();g.clip();
  const im=images.terrain;if(im?.naturalWidth){const tile=im.naturalWidth/2;for(let y=0;y<CHALLENGE.height;y+=7)for(let x=0;x<CHALLENGE.width;x+=8){g.drawImage(im,0,0,tile,tile,bx+x*scale,by+y*scale,8*scale,7*scale);}}
  else{g.fillStyle='#315743';g.fillRect(bx,by,w,h);}g.fillStyle='#173d2b86';g.fillRect(bx,by,w,h);
  const shade=g.createRadialGradient(bx+w*.5,by+h*.5,h*.2,bx+w*.5,by+h*.5,w*.55);shade.addColorStop(0,'#243c2710');shade.addColorStop(1,'#061d1ad0');g.fillStyle=shade;g.fillRect(bx-5,by-5,w+10,h+10);
  // Restrained inset stone edging gives movement limits a readable silhouette.
  g.strokeStyle='#bac3a365';g.lineWidth=2;g.strokeRect(bx+1,by+1,w-2,h-2);g.restore();
  const decor=images.decor,items=GARDEN_OBJECT_ART.greenhouse.items;if(decor?.naturalWidth){for(const [index,x,y] of [[2,bx-26,by+h*.32],[0,bx-23,by+h*.78],[3,bx+w+29,by+h*.7],[1,bx+w+25,by+h*.25]]){const item=items[index],z=clamp(scale*2.6,42,105),h=z*item[5]/item[4];g.drawImage(decor,item[2],item[3],item[4],item[5],x-z/2,y-h*.85,z,h);}}
 }
 function sprite(key,x,y,size,frame=0,face=1,alpha=1){const im=images[key];if(!im?.naturalWidth)return;const cols=key==='seed'||key==='boss'?4:2,sw=im.naturalWidth/cols,sh=im.naturalHeight/2,qx=px(x),qy=py(y);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#031a126b';ctx.beginPath();ctx.ellipse(qx,qy+size*.21,size*.25,size*.075,0,0,Math.PI*2);ctx.fill();ctx.translate(qx,qy);if(face<0)ctx.scale(-1,1);ctx.drawImage(im,(frame%cols)*sw,Math.floor(frame/cols)*sh,sw,sh,-size/2,-size*.73,size,size);ctx.restore();}
 function supply(p){const x=px(p.x),y=py(p.y),r=Math.max(9,scale*.36);ctx.save();ctx.translate(x,y);ctx.strokeStyle='#eece7d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.stroke();for(let i=0;i<5;i++){ctx.rotate(Math.PI*2/5);ctx.fillStyle='#f1e5b9';ctx.beginPath();ctx.ellipse(0,-r*.7,r*.35,r*.65,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#eec268';ctx.beginPath();ctx.arc(0,0,r*.4,0,Math.PI*2);ctx.fill();ctx.restore();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f9e8b3';ctx.fillText('회복',x,y+r*2.6);}
 function effect(e){
  if(!e.active||e.ttl<=0)return;ctx.save();ctx.globalAlpha=clamp(e.ttl/(e.max||.35),0,1);const ink=color(e.law),r=e.r||.45;
  if(Number.isFinite(e.x2)&&Number.isFinite(e.y2)){ctx.strokeStyle=ink;ctx.lineWidth=e.kind==='chain'?3:2;ctx.beginPath();ctx.moveTo(px(e.x),py(e.y));ctx.lineTo(px(e.x2),py(e.y2));ctx.stroke();}
  else if(e.kind==='hit'){const x=px(e.x),y=py(e.y),z=Math.max(6,r*scale);ctx.strokeStyle='#fff3bc';ctx.lineWidth=2;for(let i=0;i<3;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(x-Math.cos(a)*z,y-Math.sin(a)*z);ctx.lineTo(x+Math.cos(a)*z,y+Math.sin(a)*z);ctx.stroke();}}
  else {ring(e.x,e.y,r,ink);if(e.kind==='burst'||e.kind==='frost'||e.kind==='gravity'){ctx.globalAlpha*=.14;ring(e.x,e.y,r,ink,true);}}
  ctx.restore();
 }
 function draw(){
  if(closed||width<2||height<2)return;ctx.setTransform(dpr,0,0,dpr,0,0);backdrop();ctx.drawImage(back,0,0,back.width,back.height,0,0,width,height);if(!run)return;
  for(const h of run.hazards){if(!h.active)continue;if(h.kind==='gravity'){ring(h.x,h.y,h.r,'#bc9aee22',true);ring(h.x,h.y,h.r,'#d2a2eb70');continue;}const warning=h.warning>0;ring(h.x,h.y,h.r,warning?'#ffbd8570':'#e35a526b',true);ctx.setLineDash(warning?[5,5]:[]);ring(h.x,h.y,h.r,warning?'#ffc491':'#ff8c71');ctx.setLineDash([]);if(warning){ctx.fillStyle='#fff0d0';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('!',px(h.x),py(h.y)+6);}}
  for(const p of run.pickups)if(p.active)supply(p);
  for(const e of run.effects)if(e.kind==='gravity')effect(e);
  order.length=0;for(const e of run.enemies)if(e.active)order.push(e);order.sort((a,b)=>a.y-b.y);const p=run.player;let heroDrawn=false;
  function hero(){const size=clamp(scale*2.4,56,84);ring(p.x,p.y,p.r+.08,p.inv>0?'#fff2a4':'#d8efb56b');sprite('seed',p.x,p.y,size,p.dashTime>0?3:shotPose>0?1:0,p.dx<0?-1:1,p.inv>0&&!reduced?.82:1);}
  for(const e of order){if(!heroDrawn&&e.y>p.y){hero();heroDrawn=true;}const boss=e.type==='boss',size=boss?clamp(scale*3.8,90,145):clamp(scale*1.25,27,46),nearHero=e.y>p.y&&Math.abs(e.x-p.x)<1&&e.y-p.y<1;let frame=boss?(e.flash>0?7:e.attackTime<.55?4:0):(Math.abs(Math.cos(e.angle))>.7?Math.cos(e.angle)<0?3:1:Math.sin(e.angle)<0?2:0);sprite(e.type,e.x,e.y,size,frame,boss?(Math.cos(e.angle)<0?-1:1):1,nearHero?.58:1);if(e.flash>0){ring(e.x,e.y,e.r,'#fff0b2');}if(e.frost>0)ring(e.x,e.y,e.r+.15,'#9aeaf5');if(!boss&&(e.hp<e.maxHp||e.type==='shield')){const x=px(e.x)-size*.32,y=py(e.y)-size*.68;ctx.fillStyle='#152c26';ctx.fillRect(x,y,size*.64,3);ctx.fillStyle=e.type==='shield'?'#e7c789':'#d2a58d';ctx.fillRect(x,y,size*.64*clamp(e.hp/e.maxHp,0,1),3);}}
  if(!heroDrawn)hero();
  for(const shot of run.shots){if(!shot.active)continue;const x=px(shot.x),y=py(shot.y),r=Math.max(3,shot.r*scale);ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(shot.vy,shot.vx));ctx.fillStyle=shot.owner==='enemy'?'#fa9978':color(shot.law);ctx.beginPath();if(shot.owner==='enemy'){ctx.moveTo(r*1.3,0);ctx.lineTo(0,r);ctx.lineTo(-r*1.3,0);ctx.lineTo(0,-r);ctx.closePath();}else ctx.ellipse(0,0,r*1.9,r*.7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4ce';ctx.fillRect(-r*.6,-.8,r*1.4,1.6);ctx.restore();}
  for(const e of run.effects)if(e.kind!=='gravity')effect(e);
  if(p.hp/p.maxHp<.3){ctx.strokeStyle='#f18b6e80';ctx.lineWidth=5;ctx.strokeRect(bx+3,by+3,CHALLENGE.width*scale-6,CHALLENGE.height*scale-6);}
 }
 function loop(now){
  raf=0;if(closed||paused||document.hidden||run?.phase!=='playing')return;if(!pacer(now,60)){wake();return;}const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;
  intent.x=move.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));intent.y=move.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  advanceFrame(dt,run.time+dt,step=>{if(run.phase!=='playing')return;intent.dash=dashPending;dashPending=false;stepGardenChallenge(run,step,intent);consume();});shotPose=Math.max(0,shotPose-dt);audio?.tick?.(dt);if(now-hudAt>100||run.phase!=='playing'){hudAt=now;hud();}draw();syncPhase();wake();
 }
 function resize(){const rect=root.getBoundingClientRect();if(rect.width<2||rect.height<2){pause('화면이 다시 보이면 계속하기를 눌러 주세요.');stop();return;}width=rect.width;height=rect.height;dpr=Math.min(1.5,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const top=height<430?72:88,bottom=height<430?72:96;scale=Math.max(1,Math.min((width-26)/CHALLENGE.width,(height-top-bottom)/CHALLENGE.height));bx=(width-CHALLENGE.width*scale)/2;by=top+Math.max(0,(height-top-bottom-CHALLENGE.height*scale)/2);back=null;draw();}
 const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
 listen(window,'keydown',event=>{if(closed||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if((event.code==='Escape'||event.code==='KeyP')&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();if(paused)resume();else pause();return;}if(paused||run?.phase!=='playing'||event.code==='Space'&&event.target?.closest?.('button'))return;if(!movement.includes(event.code)&&event.code!=='Space')return;event.preventDefault();event.stopImmediatePropagation();if(movement.includes(event.code))keys.add(event.code);if(event.code==='Space'&&!event.repeat)dashPending=true;},true);
 listen(window,'keyup',event=>{if(keys.has(event.code)){keys.delete(event.code);event.preventDefault();event.stopImmediatePropagation();}},true);
 const stick=$('.gc-stick'),dodge=$('.gc-dodge');
 function stickMove(event){const r=stick.getBoundingClientRect(),x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2,d=Math.hypot(x,y),length=Math.max(1,d),amount=clamp((d-6)/24,0,1);move.x=x/length*amount;move.y=y/length*amount;stick.querySelector('i').style.transform=`translate(${x/length*Math.min(23,d)}px,${y/length*Math.min(23,d)}px)`;}
 listen(stick,'pointerdown',event=>{if(run?.phase!=='playing'||paused||stickId!==null)return;event.preventDefault();stickId=event.pointerId;stick.setPointerCapture?.(stickId);stickMove(event);});listen(stick,'pointermove',event=>{if(event.pointerId===stickId)stickMove(event);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(stick,type,event=>{if(event.pointerId!==stickId)return;stickId=null;move.x=move.y=0;stick.querySelector('i').style.transform='';});
 listen(dodge,'pointerdown',event=>{if(run?.phase!=='playing'||paused||dodge.disabled||dodgeId!==null)return;event.preventDefault();dodgeId=event.pointerId;dodge.setPointerCapture?.(dodgeId);dashPending=true;});for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(dodge,type,event=>{if(event.pointerId===dodgeId)dodgeId=null;});
 // Keyboard activation remains accessible without duplicating a pointer-triggered dodge.
 dodge.onclick=event=>{if(event.detail===0&&run?.phase==='playing'&&!paused&&!dodge.disabled)dashPending=true;};
 function suspend(){resetInput();if(run?.phase==='playing')pause('게임 화면을 떠나 시간이 멈췄어요.');else stop();audio?.setPaused(true);}
 listen(window,'blur',suspend);listen(window,'pagehide',suspend);listen(document,'visibilitychange',()=>{if(document.hidden)suspend();});listen(window,'resize',resize);if(media)listen(media,'change',event=>{reduced=event.matches;draw();});
 $('.gc-pause').onclick=()=>pause();$('.gc-mute').onclick=()=>{muted=!muted;audio?.setMuted?.(muted);$('.gc-mute').textContent=muted?'♩':'♪';$('.gc-mute').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');$('.gc-mute').setAttribute('aria-pressed',String(muted));};$('.gc-mute').setAttribute('aria-pressed',String(muted));$('.gc-mute').textContent=muted?'♩':'♪';$('.gc-mute').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');
 try{resize();menu();loadAssets();}catch(error){close();throw error;}
 return {close,inspect:()=>run?{phase:run.phase,paused,time:run.time,hp:run.player.hp,score:run.score,kills:run.kills,difficulty:run.difficulty,levels:{...run.levels},fusion:run.fusion?.name||null,bossSpawned:run.bossSpawned,bossDefeated:run.bossDefeated,enemies:run.enemies.filter(e=>e.active).length,raf:Boolean(raf),loaded:loaded(),saved:saved?.ok??null}: {phase:'menu',loaded:loaded(),raf:Boolean(raf)}};
}
