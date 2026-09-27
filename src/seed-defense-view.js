import {createFramePacer} from './frame-time.js';
import {defensePlacement,placeDefensePad,DEFENSE,PATH,PADS,DEFENSE_LAWS,FUSIONS,createDefense,plantDefense,upgradeDefense,startDefenseWave,chooseDefenseLaw,stepDefense,getDefenseOffers,defenseTowerStats,defenseUpgradeCost,defenseWaveInfo,defensePoint,checkpointDefense,restoreDefense,defenseTowerName,evolveDefense,getDefenseEvolutionOptions,DEFENSE_FORMS,DEFENSE_CATALOG,DEFENSE_CATALOG_COUNTS} from './seed-defense-rules.js';
import './seed-defense.css';
import {defenseBodyParts,paintDefenseGround,paintEvolutionCue} from './seed-defense-art.js';
import './forms.css';
import './combo-art.css';
import {formArt} from './form-art.js';
import {SIGNATURES} from './actives.js';
import {createDefenseCombat,DEFENSE_COMBAT} from './seed-defense-combat.js';
import {actorArtFile,CUTE_ACTOR_BASELINE} from './actor-art.js';
import {SEED_BODY_ART,SEED_SOLO_BODY_ART,SEED_FUSION_BODY_ART,SEED_AWAKEN_BODY_ART} from './seed-body.js';

const BASE=import.meta.env.BASE_URL;
const BODY={collapse:0,frostguard:1,frostnet:5,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
const SOLO={reflect:0,split:1,chain:2,orbit:3,pierce:4,burst:5,recall:6,gravity:7,frost:8};
const CARD={reflect:0,split:1,pierce:2,orbit:3,burst:4,gravity:5,recall:6,frost:9,chain:10};
const LAW_CELL={burst:6,frost:9,chain:3,pierce:5,split:2,reflect:1,recall:7,gravity:8,orbit:4,hostile:12};
const INK={burst:'#ffaa65',frost:'#b2f1ff',chain:'#ffe391',pierce:'#dbf6b1',split:'#ffa88f',reflect:'#91e4ff',recall:'#a0ebc9',gravity:'#d2a0ff',orbit:'#b7bfff'};
const name=defenseTowerName;
const KIND={base:'기본',solo:'단독 진화',fusion:'융합',final:'완성 진화',twin:'쌍둥이 각성'};
const recipe=f=>f.kind==='base'?'첫 법칙으로 선택':f.kind==='solo'?DEFENSE_LAWS[f.requires[0]].name+' 3단계':f.kind==='final'?DEFENSE_FORMS[f.base].name+' + '+DEFENSE_FORMS[f.addedSolo].name:f.kind==='twin'?f.requires.map(l=>DEFENSE_LAWS[l].name+' 3단계').join(' + '):f.requires.map(l=>DEFENSE_LAWS[l].name).join(' + ');
const art=f=>f.kind==='base'?`<span class="td-law-art" style="background-image:url('${BASE}assets/seed-law-atlas-v4-ui.webp');background-position:${CARD[f.id]%4*100/3}% ${Math.floor(CARD[f.id]/4)*50}%"></span>`:formArt(f.id);
const baseLaw=law=>FUSIONS[law]?.laws[0]||law;
const color=law=>law==='hostile'?'#ff6677':INK[baseLaw(law)]||'#d7e5b4';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// A second WebGL scene is unnecessary here: cached ground + shared painted
// atlases, one capped Canvas2D loop. The parent suspends its combat renderer.
// 2026-09-28 사용자: 습격 사이에 '시작'을 누르지 않아도 다음 습격이 저절로 시작되게.
// 씨앗 정보·배치 창, 도감, 대화창이 열려 있는 동안은 기다린다(정비할 시간은 남긴다).
const DEFENSE_AUTO_START=3,DEFENSE_AUTO_INSPECT=6; // 씨앗 정보 창을 보고 있으면 조금 더 기다린다.
// 심을 수 있는 땅을 반투명 흰 점선으로 보여 준다. 규칙(defensePlacement)을 반 칸 격자로 따라 그려서 규칙과 어긋나지 않는다.
let buildZone=null;
function buildZonePath(){
 if(buildZone)return buildZone;
 const step=.5,x0=0,y0=5,cols=Math.round(98/step),rows=Math.round(50/step),empty={towers:[]};
 const ok=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!defensePlacement(empty,x0+(i+.5)*step,y0+(j+.5)*step);
 const mask=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)mask[j*cols+i]=ok(i,j);
 const at=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&mask[j*cols+i];
 const edges=new Path2D(),fill=new Path2D();
 // 가로 경계: 위·아래 이웃과 다른 칸끼리 이어 한 줄로.
 for(let j=0;j<=rows;j++)for(let i=0;i<cols;){const edge=k=>at(k,j-1)!==at(k,j);if(!edge(i)){i++;continue;}let e=i;while(e<cols&&edge(e))e++;edges.moveTo(x0+i*step,y0+j*step);edges.lineTo(x0+e*step,y0+j*step);i=e;}
 for(let i=0;i<=cols;i++)for(let j=0;j<rows;){const edge=k=>at(i-1,k)!==at(i,k);if(!edge(j)){j++;continue;}let e=j;while(e<rows&&edge(e))e++;edges.moveTo(x0+i*step,y0+j*step);edges.lineTo(x0+i*step,y0+e*step);j=e;}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;){if(!at(i,j)){i++;continue;}let e=i;while(e<cols&&at(e,j))e++;fill.rect(x0+i*step,y0+j*step,(e-i)*step,step);i=e;}
 return buildZone={edges,fill};
}
export function mountSeedDefense({host=document.body,storage=localStorage,owner='guest',audio,onClose=()=>{},onRanking=()=>{},onResult=async()=>'',onBossDefeated=()=>true}={}){
 const key='seed-defense-preparation-v1:'+encodeURIComponent(owner),root=document.createElement('section');
 root.id='seed-defense';root.setAttribute('aria-label','씨앗 수호전');
 root.innerHTML=`<header class="td-top"><div><small>SEED · 씨앗 타워디펜스</small><h1>씨앗 수호전</h1></div><div class="td-meters" aria-live="off"><span id="td-heart"></span><span id="td-sun"></span><span id="td-wave"></span></div><button id="td-speed" aria-label="진행 속도 변경">기본</button><button id="td-book">조합 162</button><button id="td-pause" aria-label="일시정지">Ⅱ</button></header><div class="td-board"><canvas aria-label="정원 방어 전장"></canvas><div class="td-hint" role="status"></div><div class="td-pads"></div><div class="td-plant-prompt" hidden><button id="td-plant-here"></button><button class="td-placement-close" aria-label="심기 취소">×</button></div><button class="td-quick-start">다음 습격 시작</button><div class="td-dialog" hidden></div><pre id="seed-defense-inspection" hidden></pre></div><aside class="td-panel"><button class="td-panel-close" aria-label="씨앗 정보 닫기">×</button><div class="td-scroll"></div><footer><button id="td-start"></button><button id="td-leave">저장하고 돌아가기</button><small id="td-save-note"></small></footer></aside>`;
 host.append(root);document.body.classList.add('seed-defense-open');
 const $=s=>root.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),back=document.createElement('canvas'),bg=back.getContext('2d',{alpha:false});
 let speed=DEFENSE.defaultSpeed,bossRetryAt=0,state=createDefense(Date.now()>>>0),selected=0,paused=false,ended=false,frame=0,last=0,uiAt=0,uiKey='',padKey='',panelRenders=0,saveNote='준비 상태는 이 기기에 저장돼요',width=1,height=1,scale=1,ox=0,oy=0,dirty=true,frames=[],lastEffects=0,renderCosts=[],announced='',confirming=false,autoWait=DEFENSE_AUTO_START,wasInspecting=false;
 const assets={},loads=[],listeners=[],framePacer=createFramePacer();
 const setLabel=(selector,text)=>{const el=$(selector);if(el.textContent!==text)el.textContent=text;};
 const listen=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
 const load=(id,file)=>{const img=new Image();assets[id]=img;loads.push(new Promise(resolve=>{img.onload=()=>{dirty=true;resolve();};img.onerror=resolve;img.src=BASE+'assets/'+file;}));};
 load('combo','combo-projectiles-v1.webp');load('orbit','seed-orbit-sprites-v1.webp');load('orbitAdvanced','seed-orbit-advanced-v1.webp');load('comet','seed-comethalo-sprite-v1.webp');load('floor','seed-defense-garden-v1.webp');load('stone','garden-stone-v4.png');load('flagstones','seed-defense-stones-v1.webp');load('awaken',SEED_AWAKEN_BODY_ART);load('plants','garden-growth-atlas-v3.webp');load('solo',SEED_SOLO_BODY_ART);load('seed',SEED_BODY_ART);load('fusion',SEED_FUSION_BODY_ART);load('projectile','mobile/seed-projectile-dna-v1.png');
 // Canvas2D crops the same front/right/back/left cells as the 3D billboard rigs.
 load('hound',actorArtFile('enemy-hound-v4.png'));load('runner',actorArtFile('enemy-runner-v1.webp'));load('shield',actorArtFile('enemy-shield-v4.png'));load('boss','mobile/warden-memory-v4.webp');load('batter',actorArtFile('enemy-batter-v1.webp'));load('catcher',actorArtFile('enemy-catcher-v1.webp'));load('flight',actorArtFile('enemy-act3-flight-atlas-v2.webp'));load('stadiumWarden','mobile/warden-act2-ace-v1.webp');load('austin','mobile/boss-austin-v1.webp');load('alwaysbeginner','mobile/boss-always-beginner-v1.webp');load('tempestcarrier','mobile/boss-act3-johan-atlas-v2.webp');
 function read(){try{return restoreDefense(JSON.parse(storage.getItem(key)));}catch{return null;}}
 // 2026-09-28 사용자: 예전 2배를 기본 속도로, 거기서 1.5배 더 빠른 모드 하나만.
 $('#td-speed').onclick=()=>{speed=speed===DEFENSE.defaultSpeed?DEFENSE.fastSpeed:DEFENSE.defaultSpeed;const fast=speed===DEFENSE.fastSpeed;setLabel('#td-speed',fast?'1.5배':'기본');$('#td-speed').classList.toggle('td-fast',fast);hint(fast?'전투 속도 1.5배 · 씨앗과 적이 함께 빨라져요':'기본 속도로 돌아왔어요');};
 const saved=read();if(saved){state=saved;selected=state.selectedPad;}
 let combat=createDefenseCombat(state,{sound}),visuals=[],bookOpen=false,bookKind='fusion',bookPage=0,bookWasPaused=false,moving=false,visualClock=0;
 const evolutionCues=[],bodyCache=new Map(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function celebrate(t,previous,kind){for(let i=evolutionCues.length-1;i>=0;i--)if(evolutionCues[i].id===t.id)evolutionCues.splice(i,1);if(evolutionCues.length>=4)evolutionCues.shift();evolutionCues.push({id:t.id,x:t.x,y:t.y,start:visualClock,previous,ink:color(t.laws[0]),title:kind+' · '+name(t)});root.classList.add('td-evolved');hint(kind+' · '+name(t)+' — 새로운 공격이 깨어났어요');}
 function body(t,x,y,sizeMultiplier=1){sizeMultiplier*=1.32;const key=(t.formId||'seed');let parts=bodyCache.get(key);if(!parts){parts=defenseBodyParts(t);bodyCache.set(key,parts);}for(const p of parts)sprite(p.atlas,x+p.dx*sizeMultiplier,y+1,p.size*sizeMultiplier,p.cell,p.cols||4,p.rows||3,1-CUTE_ACTOR_BASELINE);}
 function save(){if(!['build','draft'].includes(state.phase))return;try{const data=checkpointDefense(state);if(data){storage.setItem(key,JSON.stringify(data));saveNote='이번 준비 저장됨 · 이 기기 전용';}}catch{saveNote='저장 공간이 부족해요 · 종료 전 확인해 주세요';}}
 function clearSave(){try{storage.removeItem(key);}catch{}}
 function sound(id){audio?.play(id);}
 function resize(){const r=$('.td-board').getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const dpr=Math.min(1.5,window.devicePixelRatio||1);canvas.width=back.width=Math.round(width*dpr);canvas.height=back.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);bg.setTransform(dpr,0,0,dpr,0,0);// 2026-09-28 사용자: 조금 더 확대. 정원(가로 0~100)과 심을 수 있는 땅(세로 5~55)의 가운데를 맞춘다.
  scale=Math.min(width/110,height/47);ox=width/2-53*scale;oy=height/2-31*scale;dirty=true;placeButtons();}
 function placeButtons(){for(const b of $('.td-pads').children){const p=state.pads[Number(b.dataset.pad)];b.style.left=(ox+p.x*scale)+'px';b.style.top=(oy+p.y*scale)+'px';}positionPlantPrompt();}
 function positionPlantPrompt(){const p=state.pads[selected],prompt=$('.td-plant-prompt');if(!p||prompt.hidden)return;const w=prompt.offsetWidth,h=prompt.offsetHeight,x=ox+p.x*scale,y=oy+p.y*scale;prompt.style.left=Math.max(8,Math.min(width-w-8,x-w/2))+'px';prompt.style.top=Math.max(58,Math.min(height-h-8,y+32+h<height?y+32:y-h-32))+'px';}
 function closeSelection(){root.classList.remove('td-inspecting','td-placing');$('.td-plant-prompt').hidden=true;}
 function showSelection(){const empty=!state.towers.some(t=>t.pad===selected),placing=empty&&['build','draft'].includes(state.phase);root.classList.toggle('td-placing',placing);root.classList.toggle('td-inspecting',!placing);$('.td-plant-prompt').hidden=!placing;$('.td-scroll').scrollTop=0;uiKey='';updateUI();updatePlantPrompt();}
 function updatePlantPrompt(){const button=$('#td-plant-here');button.disabled=state.currency<DEFENSE.plantCost;button.textContent=button.disabled?'햇살 '+(DEFENSE.plantCost-Math.floor(state.currency))+' 더 필요':'여기에 심기 · '+DEFENSE.plantCost+' 햇살';positionPlantPrompt();}
 function plantSelected(){if(plantDefense(state,selected)){dirty=true;sound('pickup');save();uiKey='';updateUI();showSelection();hint('씨앗을 심었어요 · 법칙을 선택하세요');}}
 $('#td-plant-here').onclick=plantSelected;$('.td-placement-close').onclick=closeSelection;
 $('.td-pads').innerHTML=PADS.map((p,i)=>`<button data-pad="${i}" aria-label="${i+1}번 화단 선택"><span>${i+1}</span></button>`).join('');
 for(const b of $('.td-pads').children)b.onclick=()=>{moving=false;selected=Number(b.dataset.pad);state.selectedPad=selected;uiKey='';sound('pickup');updateUI();showSelection();};
 const tower=()=>state.towers.find(t=>t.pad===selected);
 listen(canvas,'click',e=>{
  if(bookOpen||confirming||!['build','draft'].includes(state.phase)){hint('씨앗 배치는 습격 사이에 바꿀 수 있어요');return;}
  const rect=canvas.getBoundingClientRect(),x=Math.round(((e.clientX-rect.left-ox)/scale)*2)/2,y=Math.round(((e.clientY-rect.top-oy)/scale)*2)/2;
  const pad=moving?selected:state.pads.findIndex((_,i)=>!state.towers.some(t=>t.pad===i));
  if(pad<0){hint('씨앗은 최대 8개예요 · 씨앗을 선택해 위치를 옮겨 보세요');return;}
  const error=defensePlacement(state,x,y,pad);if(error){closeSelection();hint(error);return;}
  if(placeDefensePad(state,pad,x,y)){selected=pad;moving=false;combat.reset();dirty=true;placeButtons();save();uiKey='';updateUI();showSelection();hint(tower()?'씨앗을 새 위치로 옮겼어요':'사거리를 확인하고 ‘여기에 심기’를 누르세요');}
 });
 function hint(message){$('.td-hint').textContent=message;}
 function togglePause(){if(paused&&!bookOpen&&!confirming)$('.td-dialog').hidden=true;if(ended||bookOpen||confirming||['won','lost'].includes(state.phase))return;paused=!paused;audio?.setPaused(paused);$('#td-pause').textContent=paused?'▶':'Ⅱ';$('#td-pause').setAttribute('aria-label',paused?'계속하기':'일시정지');hint(paused?'잠시 쉬는 중 · ▶를 눌러 계속하세요':'');uiKey='';updateUI();}
 $('#td-pause').onclick=()=>{if(ended||bookOpen||confirming||['won','lost'].includes(state.phase))return;if(paused){togglePause();return;}togglePause();dialog(`<div><small>씨앗 수호전</small><h2>잠시 쉬어 가세요</h2><button id="td-resume">계속 방어하기</button><button id="td-pause-ranking" ${state.phase==='wave'?'disabled':''}>수호전 랭킹${state.phase==='wave'?' · 습격 사이에 확인':''}</button><button id="td-pause-leave">저장하고 돌아가기</button></div>`);$('#td-pause-ranking').onclick=onRanking;$('#td-resume').onclick=()=>{$('.td-dialog').hidden=true;togglePause();};$('#td-pause-leave').onclick=()=>{$('.td-dialog').hidden=true;$('#td-leave').click();};};
 function dialog(html){$('.td-dialog').hidden=false;$('.td-dialog').innerHTML=html;}
 function showBook(){
  if(!bookOpen){bookWasPaused=paused;bookOpen=true;paused=true;audio?.setPaused(true);}
  const forms=Object.values(DEFENSE_CATALOG).filter(f=>f.kind===bookKind),pages=Math.ceil(forms.length/9);bookPage=Math.min(bookPage,pages-1);
  $('.td-dialog').classList.add('td-book-dialog');
  dialog(`<div class="td-book-sheet"><header><div><small>모든 조합을 수호전에서도</small><h2>씨앗의 162가지 길</h2></div><button id="td-book-close">돌아가기</button></header><nav>${Object.entries(KIND).map(([id,label])=>`<button data-book-kind="${id}" aria-pressed="${bookKind===id}">${label} ${DEFENSE_CATALOG_COUNTS[id]}</button>`).join('')}</nav><p class="td-book-guide">같은 법칙 3단계 → 단독 · 다른 법칙 2개 → 융합<br>융합에서 한 법칙 3단계 → 완성 · 양쪽 법칙 3단계 → 쌍둥이</p><div class="td-book-grid">${forms.slice(bookPage*9,bookPage*9+9).map(f=>`<article>${art(f)}<div><b>${esc(f.name)}</b><small>${esc(recipe(f))}</small><p>${esc(f.desc||DEFENSE_LAWS[f.id]?.desc||'')}</p>${SIGNATURES[f.id]?`<small class="td-gold">궁극기 · ${esc(SIGNATURES[f.id].name)}</small>`:''}</div></article>`).join('')}</div><footer><button id="td-book-prev" ${bookPage===0?'disabled':''}>이전</button><span>${bookPage+1} / ${pages}</span><button id="td-book-next" ${bookPage>=pages-1?'disabled':''}>다음</button></footer></div>`);
  $('#td-book-close').onclick=()=>{bookOpen=false;paused=bookWasPaused;$('.td-dialog').hidden=true;$('.td-dialog').classList.remove('td-book-dialog');audio?.setPaused(paused);$('#td-pause').textContent=paused?'▶':'Ⅱ';$('#td-pause').setAttribute('aria-label',paused?'계속하기':'일시정지');last=performance.now();uiKey='';updateUI();};
  for(const b of root.querySelectorAll('[data-book-kind]'))b.onclick=()=>{bookKind=b.dataset.bookKind;bookPage=0;showBook();};
  $('#td-book-prev').onclick=()=>{bookPage--;showBook();};$('#td-book-next').onclick=()=>{bookPage++;showBook();};
 }
 $('#td-book').onclick=showBook;
 function close(){if(ended)return;save();combat.dispose();ended=true;cancelAnimationFrame(frame);observer.disconnect();listeners.forEach(fn=>fn());root.remove();document.body.classList.remove('seed-defense-open');audio?.setPaused(false);onClose();}
 $('#td-leave').onclick=()=>{if(state.phase!=='wave')return close();paused=true;confirming=true;audio?.setPaused(true);dialog('<div><h2>이번 습격을 나갈까요?</h2><p>마지막 준비 상태가 남아 있어요.<br>이번 습격의 처치와 햇살은 저장되지 않아요.<br>이미 얻은 보스 칭호는 유지돼요.</p><button id="td-quit-yes">준비 상태로 저장하고 나가기</button><button id="td-quit-no">계속 방어하기</button></div>');$('#td-quit-yes').onclick=close;$('#td-quit-no').onclick=()=>{confirming=false;paused=false;$('.td-dialog').hidden=true;audio?.setPaused(false);$('#td-pause').textContent='Ⅱ';$('#td-pause').setAttribute('aria-label','일시정지');last=performance.now();uiKey='';updateUI();};};
 $('.td-panel-close').onclick=closeSelection;
 $('#td-start').onclick=()=>{if(paused){togglePause();return;}if(startDefenseWave(state)){dirty=true;closeSelection();moving=false;hint(state.lastEvent);sound('evolve');uiKey='';updateUI();}};
 function updateUI(){
  setLabel('#td-heart',`♡ ${Math.ceil(state.coreHp)} / 20`);setLabel('#td-sun',`✦ ${Math.floor(state.currency)} 햇살`);const stage=defenseWaveInfo(Math.max(1,state.wave));setLabel('#td-wave',`${stage.lap+1}순환 · ${stage.act+1}막 ${state.wave?stage.localWave:0}/12`);
  const t=tower();
  setLabel('#td-start',paused?'계속하기':state.phase==='wave'?'습격 방어 중':state.phase==='won'?'정원을 지켰어요':state.phase==='lost'?'도전 종료':state.phase==='draft'||state.draftCredit>0?'씨앗에 법칙을 먼저 부여':state.towers.length?`다음 습격 ${Math.max(1,Math.ceil(autoWait))}초 · 바로 시작`:'다음 습격 시작');
  $('#td-start').disabled=!paused&&(state.phase==='wave'||state.phase==='draft'||state.draftCredit>0||['won','lost'].includes(state.phase));
  setLabel('#td-save-note',saveNote);root.classList.toggle('td-in-wave',state.phase==='wave');$('.td-quick-start').hidden=state.phase==='wave'||['won','lost'].includes(state.phase);setLabel('.td-quick-start',!state.towers.length?'씨앗 심기 · 땅을 선택하세요':state.phase==='draft'||state.draftCredit>0?'씨앗 선택 · 법칙 부여':`다음 습격 ${Math.max(1,Math.ceil(autoWait))}초 · 바로 시작`);$('.td-quick-start').onclick=()=>{if(!state.towers.length||state.phase==='draft'||state.draftCredit>0)showSelection();else $('#td-start').click();};
  const padsSignature=[selected,...state.towers.map(t=>t.pad+':'+(t.formId||''))].join('|');
  if(padsSignature!==padKey){padKey=padsSignature;
   for(const b of $('.td-pads').children){const pad=Number(b.dataset.pad),planted=state.towers.some(t=>t.pad===pad);b.hidden=pad!==selected&&!planted;b.classList.toggle('selected',pad===selected);b.classList.toggle('planted',planted);b.setAttribute('aria-pressed',String(pad===selected));}
  }
  if(!$('.td-plant-prompt').hidden)updatePlantPrompt();
  // Hidden cards must not be rebuilt on every kill / second of ultimate charge.
  // Reopening invalidates the signature and paints the current state immediately.
  if(!root.classList.contains('td-inspecting')){uiKey='';return;}
  const offers=t?getDefenseOffers(state,t.id):[],sig=[selected,state.phase,Math.floor(state.currency),t?.level,t?.laws?.join(','),JSON.stringify(t?.lawRanks),t?.formId,Math.floor(t?.ultimateCharge||0),state.draftCredit,offers.join(','),paused,saveNote,moving].join('|');
  if(sig===uiKey)return;uiKey=sig;panelRenders++;root.classList.toggle('td-drafting',Boolean(t&&state.draftCredit===1&&state.phase!=='wave'));
  const info=defenseWaveInfo(Math.min(DEFENSE.waves,state.wave+1));
  let html=`<div class="td-eyebrow">${selected+1}번 화단</div><h2>${esc(t?name(t):'씨앗을 심을 자리')}</h2>${t?.formId?`<div class="td-selected-art">${formArt(t.formId)}</div>`:''}`;
  if(t){const stats=defenseTowerStats(t);html+=`<p class="td-traits">${t.laws.length?t.laws.map(l=>DEFENSE_LAWS[l].name+' '+(t.lawRanks?.[l]||1)+'단계').join(' + '):'아직 어떤 법칙도 품지 않았어요'} · 강화 Lv.${t.level}/5</p><p class="td-detail">${esc(DEFENSE_FORMS[t.formId]?.desc||DEFENSE_LAWS[t.laws[0]]?.desc||'먼저 법칙을 부여해 이 씨앗의 역할을 정하세요.')}</p><div class="td-stats">피해 ${Math.round(stats.damage||0)} · 사거리 ${Math.round(stats.range||0)}</div><button id="td-upgrade" ${state.phase==='wave'||state.currency<defenseUpgradeCost(t)||t.level>=5?'disabled':''}>${t.level>=5?'강화 Lv.5 / 5 · 최대':'강화 Lv.'+t.level+' → '+(t.level+1)+' · '+defenseUpgradeCost(t)+' 햇살'}</button>`;
  }else html+=`<p class="td-detail">모든 타워는 작은 씨앗에서 시작해요. 길의 굴곡은 공전, 긴 직선은 관통에 유리해요.</p><button id="td-plant" ${state.phase==='wave'||state.currency<DEFENSE.plantCost?'disabled':''}>씨앗 심기 · ${DEFENSE.plantCost} 햇살</button>`;
  if(t&&!t.formId){const law=t.laws[0],rank=law?t.lawRanks?.[law]||1:0;html+=`<div class="td-evolution-progress"><b>단독진화 ${Math.min(3,rank)} / 3</b><span>${law?DEFENSE_LAWS[law].name+' 법칙을 '+(rank>=3?'충분히 모았어요. 아래에서 진화를 선택하세요.':(3-rank)+'번 더 선택하세요.'):'먼저 법칙을 하나 선택하세요.'}</span><small>햇살 강화는 피해·사거리를 높여요. 진화 조건은 법칙 선택 횟수예요.</small></div>`;}
  if(t&&['build','draft'].includes(state.phase))html+=`<button id="td-move">${moving?'위치 옮기기 취소':'위치 옮기기 · 무료'}</button>`;
  if(!t)html+='<p class="td-detail">원하는 땅을 누르면 위치를 바꿀 수 있어요. 최대 8개의 씨앗을 심을 수 있어요.</p>';
  const evolutions=t?getDefenseEvolutionOptions(t):[];
  if(t?.formId)html+=`<button id="td-ultimate" ${state.phase!=='wave'||paused||(t.ultimateCharge||0)<DEFENSE_COMBAT.ultimateSeconds?'disabled':''}>${esc(SIGNATURES[t.formId]?.name||'궁극기')} · ${(t.ultimateCharge||0)>=30?'사용':Math.floor((t.ultimateCharge||0)/30*100)+'%'}</button><small class="td-ultimate-note">적이 사거리 안에 있을 때 충전 · ${esc(SIGNATURES[t.formId]?.desc||'')}</small>`;
  if(evolutions.length&&state.phase!=='wave')html+=`<div class="td-draft-title">지금 진화할 수 있어요</div><div class="td-evolutions">${evolutions.map(f=>`<button data-evolution="${f.id}">${formArt(f.id)}<b>${esc(f.name)}</b><small>${KIND[f.kind]} · ${esc(recipe(f))}</small></button>`).join('')}</div><p class="td-detail">진화는 선택 사항이에요. 완성을 고르면 쌍둥이로 바꿀 수 없어요.</p>`;
  if(offers.length&&state.draftCredit===1&&state.phase!=='wave')html+=`<div class="td-draft-title">이 씨앗에 법칙 하나 부여</div><div class="td-law-options">${offers.map(id=>`<button data-law="${id}" style="--law:${color(id)}"><span class="td-law-art" aria-hidden="true" style="background-image:url('${BASE}assets/seed-law-atlas-v4-ui.webp');background-position:${CARD[id]%4*100/3}% ${Math.floor(CARD[id]/4)*50}%"></span><b>${DEFENSE_LAWS[id].name}${t.laws.includes(id)?' '+((t.lawRanks?.[id]||1)+1)+'단계':Object.values(FUSIONS).some(f=>t.laws.length===1&&f.laws.includes(t.laws[0])&&f.laws.includes(id))?' · 융합':''}</b><small>${esc(t.laws.includes(id)?'같은 법칙 3단계부터 단독·완성 진화의 길이 열려요.':DEFENSE_LAWS[id].desc)}</small></button>`).join('')}</div>`;
  else if(state.phase==='draft'||state.draftCredit>0)html+='<p class="td-callout">심은 씨앗을 선택하고 법칙을 부여하세요.</p>';
  else html+=`<div class="td-next"><small>다음 습격</small><p>${esc(info.title)}</p><small>${esc(info.desc)}</small></div>`;
  $('.td-scroll').innerHTML=html;
  if($('#td-plant'))$('#td-plant').onclick=plantSelected;updatePlantPrompt();
  if($('#td-move'))$('#td-move').onclick=()=>{moving=!moving;if(moving)closeSelection();hint(moving?'옮길 땅을 눌러 주세요 · 길과 다른 씨앗 주변은 비워 주세요':'위치 옮기기를 취소했어요');uiKey='';updateUI();};
  if($('#td-upgrade'))$('#td-upgrade').onclick=()=>{if(upgradeDefense(state,t.id)){hint('강화 Lv.'+t.level+' · 피해와 사거리가 늘었어요');sound('evolve');save();uiKey='';updateUI();}};
  for(const b of root.querySelectorAll('[data-law]'))b.onclick=()=>{const previous={...t,laws:[...t.laws]};if(chooseDefenseLaw(state,t.id,b.dataset.law)){const evolved=t.formId!==previous.formId;sound(evolved?'fusion':'evolve');if(evolved){combat.reset();celebrate(t,previous,'융합 진화');}else hint(DEFENSE_LAWS[b.dataset.law].name+' 법칙 '+t.lawRanks[b.dataset.law]+'단계 · 진화 조건을 확인하세요');save();uiKey='';updateUI();if(evolved)$('.td-scroll').scrollTop=0;}};
  if($('#td-ultimate'))$('#td-ultimate').onclick=()=>{if(!paused&&combat.surge(t.id)){sound('evolve');hint(SIGNATURES[t.formId]?.name||'궁극기');uiKey='';updateUI();}};
  for(const b of root.querySelectorAll('[data-evolution]'))b.onclick=()=>{const previous={...t,laws:[...t.laws]};if(evolveDefense(state,t.id,b.dataset.evolution)){combat.reset();sound('fusion');celebrate(t,previous,KIND[DEFENSE_FORMS[t.formId].kind]);save();uiKey='';updateUI();$('.td-scroll').scrollTop=0;}};

 }
 function ground(){
  bg.fillStyle='#10251d';bg.fillRect(0,0,width,height);
  // Fill unused portrait margins with the same painted garden, while the full
  // playable route and pointer transform stay unchanged.
  if(assets.floor?.naturalWidth){const img=assets.floor,s=Math.max(width/img.width,height/img.height);bg.save();bg.globalAlpha=.6;bg.drawImage(img,(width-img.width*s)/2,(height-img.height*s)/2,img.width*s,img.height*s);bg.restore();}
  bg.save();bg.translate(ox,oy);bg.scale(scale,scale);
  paintDefenseGround(bg,assets,PATH,state);
  bg.restore();dirty=false;
 }
 function sprite(id,x,y,size,cell=0,cols=2,rows=2,anchor=.82){const img=assets[id];if(!img?.complete||!img.naturalWidth)return false;const sw=img.width/cols,sh=img.height/rows;ctx.drawImage(img,cell%cols*sw,Math.floor(cell/cols)*sh,sw,sh,x-size/2,y-size*anchor,size,size);return true;}
 function draw(now){
  if(dirty)ground();ctx.drawImage(back,0,0,back.width,back.height,0,0,width,height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  if(['build','draft'].includes(state.phase)){const zone=buildZonePath();ctx.save();ctx.fillStyle='#ffffff0d';ctx.fill(zone.fill);ctx.setLineDash([.9,.7]);ctx.strokeStyle='#ffffff8c';ctx.lineWidth=.22;ctx.stroke(zone.edges);ctx.restore();}
  const end=PATH.at(-1);ctx.fillStyle='#d9e9ae18';ctx.beginPath();ctx.ellipse(end.x,end.y,5.2,3.8,0,0,Math.PI*2);ctx.fill();sprite('plants',end.x-1,end.y,14.8,state.coreHp>10?5:3,4,3);
  const chosen=tower()||(['build','draft'].includes(state.phase)?{...state.pads[selected],laws:[],level:1}:null);if(chosen&&state.phase!=='wave'){ctx.beginPath();ctx.arc(chosen.x,chosen.y,defenseTowerStats(chosen).range,0,Math.PI*2);ctx.fillStyle=color(chosen.laws[0])+'0b';ctx.strokeStyle=color(chosen.laws[0])+'55';ctx.lineWidth=.16;ctx.fill();ctx.stroke();}
  for(const t of state.towers){
   const ink=color(t.laws[0]);ctx.fillStyle='#030d1299';ctx.beginPath();ctx.ellipse(t.x,t.y+1,3.35,1.45,0,0,Math.PI*2);ctx.fill();
   const bob=reducedMotion?0:Math.sin(now*.002+t.id)*.15;
   const cue=evolutionCues.find(c=>c.id===t.id),age=cue?visualClock-cue.start:99;
   const changing=cue&&!reducedMotion&&age<.5,bodyScale=reducedMotion?1:changing?1-.55*Math.min(1,age/.5):age<1?1+.18*Math.sin((age-.5)*Math.PI*2):1;
   body(changing?cue.previous:t,t.x,t.y+bob,bodyScale);if(!t.formId&&t.laws.length)sprite('projectile',t.x+3,t.y-3,3,LAW_CELL[t.laws[0]],4,4);
   if(cue&&!reducedMotion&&age>.4&&age<.85){ctx.save();ctx.globalAlpha=Math.sin((age-.4)/.45*Math.PI)*.65;ctx.fillStyle='#fff5c9';ctx.beginPath();ctx.ellipse(t.x,t.y-2.8,2.3,3.7,0,0,Math.PI*2);ctx.fill();ctx.restore();}
   if(!t.formId&&t.laws.includes('orbit'))for(let j=0;j<3;j++){const a=now*.0015+j*Math.PI*2/3;ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(t.x+Math.cos(a)*3.4,t.y+Math.sin(a)*2.4,.5,.18,a,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle=ink;for(let j=0;j<t.level;j++){ctx.beginPath();ctx.arc(t.x-1.5+j*.75,t.y+2.25,.2,0,Math.PI*2);ctx.fill();}
  }
  for(const f of state.fields){
   const icy=f.kind==='web',ink=icy?'#8ce9ff':'#ba94ee',r=f.radius;ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=.55*Math.min(1,f.life/.3);ctx.strokeStyle=ink;ctx.lineWidth=.22;ctx.beginPath();ctx.ellipse(0,0,r,r*.65,0,0,Math.PI*2);ctx.stroke();ctx.rotate(icy?0:now*.0009);for(let j=0;j<6;j++){const a=j*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);ctx.lineTo(Math.cos(a+.35)*r*.75,Math.sin(a+.35)*r*.5);ctx.stroke();}ctx.restore();
  }
  for(const e of state.enemies){
   const prev=defensePoint(Math.max(0,e.progress-.1)),dx=e.x-prev.x,dy=e.y-prev.y,face=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy<0?2:0);
   const boss=e.kind==='boss',sz=boss?8.8:e.kind==='shield'||e.kind==='resilient'?6.1:4.7;
   ctx.fillStyle='#030b1088';ctx.beginPath();ctx.ellipse(e.x,e.y+.8,sz*.28,.8,0,0,Math.PI*2);ctx.fill();const sky=e.act===2,heavy=e.kind==='shield'||e.kind==='resilient';
   const atlas=boss?(e.bossId||(sky?'tempestcarrier':e.act===1?'stadiumWarden':'boss')):sky?'flight':e.kind==='fast'?'runner':e.act===1?(heavy?'catcher':'batter'):heavy?'shield':'hound';
   const cell=sky?(boss?(e.bossId?1+Number(e.hp<e.maxHp*.66)+Number(e.hp<e.maxHp*.33):0):e.kind==='fast'?1:heavy?2:0):face;
   sprite(atlas,e.x,e.y+(boss?0:.8)+Math.sin(now*.012+e.id)*.14,sz,cell,2,2,boss?.82:1-CUTE_ACTOR_BASELINE);
   if(e.hp<e.maxHp||boss){ctx.fillStyle='#172323';ctx.fillRect(e.x-2,e.y-sz*.7,4,.38);ctx.fillStyle=boss?'#edb16f':'#db8176';ctx.fillRect(e.x-2,e.y-sz*.7,4*Math.max(0,e.hp/e.maxHp),.38);}
   if(e.slowTime>0&&e.slow<1){ctx.strokeStyle='#91dcff';ctx.lineWidth=.2;ctx.beginPath();ctx.arc(e.x,e.y,1.5,0,Math.PI*2);ctx.stroke();}
  }
  for(const q of state.shots){
   const a=Math.atan2(q.vy||q.ty-q.y,q.vx||q.tx-q.x),ink=color(q.law);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(a);ctx.strokeStyle=ink+'90';ctx.lineWidth=.25;ctx.beginPath();ctx.moveTo(-1.5,0);ctx.lineTo(0,0);ctx.stroke();
   if(!sprite('projectile',0,.8,['pierce','thunderlance','returnblade'].includes(q.law)?3.5:2.5,LAW_CELL[baseLaw(q.law)]??0,4,4)){ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(0,0,.7,.26,0,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  for(const q of combat.visuals(visuals)){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.strokeStyle=color(q.law)+'90';ctx.lineWidth=.23;if(!q.orbit){ctx.beginPath();ctx.moveTo(-q.size*.6,0);ctx.lineTo(0,0);ctx.stroke();}sprite(q.spriteKey==='orbit'?'orbit':q.spriteKey==='advancedOrbit'?'orbitAdvanced':q.spriteKey==='comet'?'comet':'combo',0,q.size*.32,q.size,q.cell,q.spriteKey==='comet'?1:q.spriteKey==='orbit'||q.spriteKey==='advancedOrbit'?2:4,q.spriteKey==='comet'?1:q.spriteKey==='orbit'||q.spriteKey==='advancedOrbit'?2:3);ctx.restore();}
  for(const e of state.effects){
   const alpha=Math.min(1,Math.max(0,e.life/(e.maxLife||.35))),ink=typeof e.color==='string'?e.color:color(e.law);ctx.globalAlpha=alpha;ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineWidth=.3;
   if(e.kind==='chain'||e.kind==='beam'||e.kind==='line'){const tx=e.tx??e.x,ty=e.ty??e.y;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo((e.x+tx)/2+.5,(e.y+ty)/2-.5);ctx.lineTo(tx,ty);ctx.stroke();}
   else{const radius=e.radius||e.r||1.3;ctx.save();ctx.translate(e.x,e.y);ctx.rotate((1-alpha)*.8);for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*radius*.45,Math.sin(a)*radius*.45);ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);ctx.stroke();}if(e.kind==='gravity'||e.kind==='well'){ctx.beginPath();ctx.ellipse(0,0,radius,radius*.45,.4,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  }ctx.globalAlpha=1;for(const cue of evolutionCues)paintEvolutionCue(ctx,cue,visualClock-cue.start,reducedMotion);ctx.restore();
 }
 function result(){if(announced===state.phase)return;announced=state.phase;clearSave();sound(state.phase==='won'?'evolve':'hurt');dialog(`<div><small>씨앗 수호전 · 도전 결과</small><h2>${state.phase==='won'?'정원이 다시 숨 쉬어요':'다음 씨앗을 기약하며'}</h2><p>${state.wave}차 습격 · ${state.kills}마리 처치<br>${state.towers.filter(t=>t.formId).length}개 씨앗이 융합 진화했어요</p><p>직선에는 관통, 굴곡에는 공전.<br>입구의 둔화와 출구의 화력을 나눠 보세요.</p><p id="td-rank-status" role="status">최고기록을 확인하는 중…</p><button id="td-result-ranking">수호전 랭킹 보기</button><button id="td-retry">새 씨앗으로 다시</button><button id="td-home">던전으로 돌아가기</button></div>`);const rankStatus=$('#td-rank-status');Promise.resolve(onResult(state)).then(message=>{if(rankStatus.isConnected)rankStatus.textContent=message;}).catch(()=>{if(rankStatus.isConnected)rankStatus.textContent='랭킹 연결을 확인해 주세요.';});$('#td-result-ranking').onclick=onRanking;$('#td-retry').onclick=()=>{closeSelection();combat.dispose();state=createDefense(Date.now()>>>0);combat=createDefenseCombat(state,{sound});selected=0;moving=false;evolutionCues.length=0;dirty=true;placeButtons();paused=false;announced='';$('.td-dialog').hidden=true;uiKey='';save();updateUI();};$('#td-home').onclick=close;}
 function loop(now){if(ended||document.hidden){frame=0;return;}frame=requestAnimationFrame(loop);if(!framePacer(now,paused||state.phase!=='wave'?30:60))return;const workStart=performance.now();const raw=last?(now-last)/1000:0;last=now;visualClock+=Math.min(.05,raw);for(let i=evolutionCues.length-1;i>=0;i--)if(visualClock-evolutionCues[i].start>2.6)evolutionCues.splice(i,1);if(!evolutionCues.length)root.classList.remove('td-evolved');if(raw>0&&raw<1){frames.push(raw*1000);if(frames.length>120)frames.shift();}const inspecting=root.classList.contains('td-inspecting'),waiting=!ended&&!paused&&!confirming&&!bookOpen&&state.phase==='build'&&!state.draftCredit&&state.towers.length>0&&$('.td-dialog').hidden&&!root.classList.contains('td-placing');if(inspecting&&!wasInspecting)autoWait=Math.max(autoWait,DEFENSE_AUTO_INSPECT);wasInspecting=inspecting;if(waiting){autoWait-=Math.min(.25,Math.max(0,raw));if(autoWait<=0){autoWait=DEFENSE_AUTO_START;$('#td-start').click();}}else autoWait=inspecting?DEFENSE_AUTO_INSPECT:DEFENSE_AUTO_START;if(!paused&&!confirming){const phase=state.phase;// 3배속에서도 한 번에 0.1초를 넘기지 않게 나눠 진행한다(규칙의 한 번 최대 진행 시간).
 for(let left=Math.min(.05,raw)*speed;left>1e-6&&!['won','lost'].includes(state.phase);left-=.1)stepDefense(state,Math.min(.1,left),combat);if(state.pendingBosses.length&&now>=bossRetryAt){bossRetryAt=now+2000;state.pendingBosses=state.pendingBosses.filter(event=>onBossDefeated({...event,runId:state.runId})===false);}audio?.tick(Math.min(.05,raw));if(phase!==state.phase){combat.reset();if(['build','draft'].includes(state.phase)){save();sound('pickup');hint(state.lastEvent);if(defenseWaveInfo(state.wave).final)sound('bossDefeat');}if(['won','lost'].includes(state.phase))result();uiKey='';}const effect=state.effects.at(-1);if(effect&&effect!==lastEffects){lastEffects=effect;sound(effect.kind==='chain'?'chain':effect.kind==='burst'?'burstHit':'hit');}}draw(now);renderCosts.push(performance.now()-workStart);if(renderCosts.length>120)renderCosts.shift();if(now-uiAt>150){uiAt=now;updateUI();if(new URLSearchParams(location.search).has('inspect'))$('#seed-defense-inspection').textContent=JSON.stringify({phase:state.phase,wave:state.wave,speed,act:defenseWaveInfo(Math.max(1,state.wave)).act+1,lap:defenseWaveInfo(Math.max(1,state.wave)).lap+1,bossWins:state.bossWins,simulationTime:state.time,coreHp:state.coreHp,currency:state.currency,kills:state.kills,towers:state.towers.map(t=>({id:t.id,pad:t.pad,x:t.x,y:t.y,laws:t.laws,fusion:t.fusion,formId:t.formId,lawRanks:t.lawRanks,ultimateCharge:t.ultimateCharge,level:t.level})),enemies:state.enemies.length,shots:state.shots.length,effects:state.effects.length,fields:state.fields.length,paused,panelRenders,evolutionCues:evolutionCues.map(c=>({title:c.title,age:visualClock-c.start})),frameMsP95:[...frames].sort((a,b)=>a-b)[Math.floor(frames.length*.95)]||0,workMsP95:[...renderCosts].sort((a,b)=>a-b)[Math.floor(renderCosts.length*.95)]||0,assetsReady:Object.values(assets).filter(i=>i.complete&&i.naturalWidth).length,assetCount:Object.keys(assets).length,combat:combat.diagnostics(),catalog:DEFENSE_CATALOG_COUNTS,renderer:'cached Canvas2D',dpr:Math.min(1.5,devicePixelRatio||1)});}}
 const observer=new ResizeObserver(resize);observer.observe($('.td-board'));
 listen(document,'visibilitychange',()=>{if(document.hidden){paused=true;cancelAnimationFrame(frame);frame=0;save();audio?.setPaused(true);$('#td-pause').textContent='▶';$('#td-pause').setAttribute('aria-label','계속하기');hint('전투를 멈췄어요 · ▶를 눌러 계속하세요');}else{last=performance.now();if(!frame)frame=requestAnimationFrame(loop);uiKey='';updateUI();}});
 listen(window,'pagehide',save);listen(window,'keydown',e=>{if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();$('#td-pause').click();}if(e.code==='Space'){e.preventDefault();$('#td-start').click();}});
 audio?.setScene('garden');audio?.setPaused(false);resize();updateUI();hint(saved?'이 기기에 저장된 준비 상태를 불러왔어요':'① 점선 안의 땅 선택 → ② 씨앗 심기 → ③ 법칙 부여 → 습격이 저절로 시작돼요');Promise.all(loads).then(()=>{if(!ended)dirty=true;});frame=requestAnimationFrame(loop);
 return {close};
}
