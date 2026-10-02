import {createDuel,stepDuel,DUEL_CHARACTERS,DUEL_ORDER,DUEL_ARENA,DUEL_PILLARS,DUEL_SPAWN,DUEL_RULES,availableDuelCharacters} from './seed-duel-rules.js';
import {DUEL_STORY_CHAPTERS,DUEL_STORY_STAGES,completeStoryMatch} from './seed-duel-story.js';
import {readDuelStory,writeDuelStory,normalizeDuelStory,storyUnlocked,nextStoryStage} from './seed-duel-story-progress.js';
import {createCanvasVfx} from './canvas-vfx.js';
import {PROJECTILE_DNA_CELLS} from './projectile-sprites.js';
import {lawArt} from './law-art.js';
import {createFramePacer} from './frame-time.js';
import './choice.css';
import './seed-duel.css';

// 씨앗 대전 화면(시험). 캐릭터는 본편 단독 진화 씨앗 그림(cute/seed-solo-v1, 4×3칸), 효과는 본편 이펙트 소재(vfx-atlas).
// 2026-09-28 사용자: "공격 이미지가 단조롭고 액션감이 없다 · 버튼에 그림 · 맵 조금 더 넓게 · 확대 조금 더 · 회피하면 화면 밖으로 나간다"
// - 경기장은 돌 테두리가 있는 넓은 광장(바닥은 한 번 구워 두고 매 장면 한 장만 옮겨 그린다).
// - 카메라는 두 씨앗을 따라가며 가까우면 당겨 보고 멀면 물러난다(경기장 밖은 보여 주지 않는다).
// - 캐릭터마다 무기(창·불꽃 주먹·수정 칼·중력 구슬)를 들고 1·2·3타·강공격의 궤적과 몸동작이 다르다.
const BASE=import.meta.env.BASE_URL;
const SOUND={hit:['hit'],heavyHit:['burstHit',{pitch:.85}],block:['reflect',{pitch:.8}],parry:['evolve'],guardBreak:['bossAttack'],dash:['dash'],skill:['shot'],ultimate:['ultimate'],start:['bossWarning'],win:['bossDefeat'],lose:['hurt'],charge:['shotGravity',{pitch:.7}],link:['burstHit',{pitch:1.25}],swing0:['shot'],swing1:['shot',{pitch:1.1}],swing2:['shotPierce'],reflect:['reflect']};
// 바닥을 구워 둘 세계 범위와 해상도(세계 1칸 = 40px).
const WX0=-6,WY0=-6,WX1=41,WY1=27,BAKE=40;
// 버튼 그림: 모험의 씨앗 동작 그림(adventure/seed-combat-v1, 4×2칸)과 이펙트 소재(vfx-atlas, 4×4칸).
const POSE={attack:1,heavy:2,block:5,dodge:3};
// GPT 동작 그림(4×2: 서기·1타·2타·3타·강공격 모으기·내리치기·막기·맞음)이 있는 캐릭터. 없으면 서 있는 그림 + 기울기 연출.
const FIRST_GUESTS=['thorn','gale','bastion','comet','lotus','prism'];
const LATEST_GUESTS=['reed','cinder','pebble','echo','pulse','shard'];
const NEW_DUEL=[...FIRST_GUESTS,...LATEST_GUESTS,'heart'];
const MOTION=DUEL_ORDER;
const motionFrame=f=>['hit','broken','stagger','jailed'].includes(f.state)?7:f.state==='attack'&&f.t>0?[1,2,3][f.step]??1:f.state==='heavy'&&f.t>0?(f.t>.12?4:5):f.state==='skill'?(f.t>.12?4:5):f.state==='dash'?3:f.state==='leap'?(f.t>.2?4:5):f.blocking?6:0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function mountSeedDuel({host=document.body,audio,storage=localStorage,owner='guest',practice=false,canSave=()=>true,onProgress=()=>{},onSaveAccount=null,onClose=()=>{}}={}){
 const root=document.createElement('section');root.id='seed-duel';root.setAttribute('aria-label','씨앗 대전');
 const pose=(act,label,key)=>`<button data-act="${act}" class="sd-${act}"><i class="sd-ico sd-pose" style="background-image:url('${BASE}assets/adventure/seed-combat-v1.webp');background-position:${POSE[act]%4*100/3}% ${Math.floor(POSE[act]/4)*100}%"></i><b class="sd-lbl">${label}</b><small>${key}</small></button>`;
 root.innerHTML=`<canvas aria-label="씨앗 대전"></canvas><header class="sd-top"><div class="sd-side sd-p0"><b></b><div class="sd-hp"><i></i></div><div class="sd-guard"><i></i></div><div class="sd-meter"><i></i></div></div><div class="sd-center"><span class="sd-rounds"></span><strong class="sd-timer"></strong></div><div class="sd-side sd-p1"><b></b><div class="sd-hp"><i></i></div><div class="sd-guard"><i></i></div><div class="sd-meter"><i></i></div></div><button class="sd-pause" aria-label="일시정지">Ⅱ</button></header><div class="sd-story-hud" hidden></div><div class="sd-message"></div><div class="sd-combo" aria-hidden="true"></div>
 <div class="sd-controls"><div class="sd-stick" role="button" aria-label="이동"><i></i></div><div class="sd-buttons"><button data-act="ult" class="sd-ult"><i class="sd-ico sd-fx" style="background-image:url('${BASE}assets/vfx-atlas-v1.webp')"></i><b class="sd-lbl">필살</b><small>O</small></button>${pose('block','방어','K')}${pose('dodge','회피','Space')}${pose('attack','공격','J')}<button class="sd-chord sd-chord-heavy" data-chord="heavy" aria-label="공격과 방어 같이 · 강공격"><b>+</b><span>강공격</span></button><button class="sd-chord sd-chord-skill" data-chord="skill1" aria-label="공격과 회피 같이 · 기술"><b>+</b><span class="sd-lbl">기술</span></button></div></div>
 <div class="sd-pc">WASD 이동 · J 공격 · K 방어(누르고 있기 · 맞기 직전 = 반격 막기) · Space 회피 · O 필살 · J+K 같이 = 강공격 · J+Space 같이 = 기술</div><div class="sd-drill" hidden></div><div class="sd-modal"></div>`;
 host.append(root);document.body.classList.add('seed-duel-open');
 const $=q=>root.querySelector(q),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false}),assets={},keys=new Set(),held=new Set(),pressed=new Set(),listeners=[];
 const vfx=createCanvasVfx({onReady:()=>{floor=null;}}),pacer=createFramePacer();
 let s=null,raf=0,last=0,closed=false,width=1,height=1,scale=1,ox=0,oy=0,dpr=1,pick={player:'pierce',enemy:'random',difficulty:'normal'},uiAt=0,floor=null,clock=0;
 let rosterFilter='all';
 let storyProgress=readDuelStory(storage,owner),storyStage=null,storySaved=false,saveNote='',resultTimer=0,paused=false;
 const cam={x:(DUEL_SPAWN[0].x+DUEL_SPAWN[1].x)/2,y:DUEL_SPAWN[0].y,k:0},trails=[[],[]],prevPos=[null,null],pops=[];
 const move={x:0,y:0},listen=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const load=(k,f)=>{if(assets[k])return;const im=new Image();im.onload=()=>{if(closed)return;floor=null;if(!raf){camera(0);draw(0);}};im.src=BASE+'assets/'+f;assets[k]=im;};
 load('solo','cute/seed-solo-v1.webp');load('plants','garden-growth-atlas-v3.webp');load('dna','mobile/seed-projectile-dna-v1.png');load('paving','survival-garden-paving-v1.webp');load('arena','duel/arena-floor-v1.webp');load('grass','ground-garden-v5.webp');
 const ready=k=>assets[k]?.complete&&assets[k].naturalWidth>0;
 function resize(){const r=root.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(1.5,devicePixelRatio||1,Math.max(1,Math.sqrt(2.6e6/Math.max(1,width*height))));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);cam.k=0;if(!raf){camera(0);draw(0);}}
 function close(){if(closed)return;closed=true;clearTimeout(resultTimer);cancelAnimationFrame(raf);for(const off of listeners)off();root.remove();document.body.classList.remove('seed-duel-open');onClose();}
 // ── 고르기 화면
 // 고르기 화면 얼굴도 싸울 때와 같은 동작 그림의 서 있는 칸으로(없으면 예전 단독 진화 그림).
 const portrait=(id,extra='')=>{const c=DUEL_CHARACTERS[id];return NEW_DUEL.includes(id)?`<span class="sd-portrait sd-new-portrait ${extra}" style="background-image:url('${BASE}assets/duel/${id}-portrait-v1.webp')"></span>`:MOTION.includes(id)?`<span class="sd-portrait sd-portrait-motion ${extra}" style="background-image:url('${BASE}assets/duel/${id}-motion-v1.webp')"></span>`:`<span class="sd-portrait ${extra}" style="background-image:url('${BASE}assets/cute/seed-solo-v1.webp');background-position:${c.tile%4*100/3}% ${Math.floor(c.tile/4)*50}%"></span>`;};
 function select(){
  menuRest();storyStage=null;refreshStory();const choices=availableDuelCharacters(storyProgress);if(!choices.includes(pick.player))pick.player='pierce';if(pick.enemy!=='random'&&!choices.includes(pick.enemy))pick.enemy='random';
  const card=id=>{const c=DUEL_CHARACTERS[id];return `<button class="sd-card${pick.player===id?' on':''}" data-pick="${id}" style="--ink:${c.ink}">${portrait(id)}<span><b>${c.name}</b><small>${c.role}</small><em>${c.blurb}</em><i>${lawArt(c.law||id,'sd-law')} 기술 ${c.skills[0].name} · 필살 ${c.ult.name}</i></span></button>`;};
  $('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-roster"><p class="sd-eyebrow">SEED · DUEL · ${choices.length}명의 씨앗</p><h1>씨앗 대전</h1><button class="sd-primary sd-story-open">이야기 모드 · 아홉 빛의 약속</button><small>혼자 떠나는 ${DUEL_STORY_CHAPTERS.length}장 · ${Object.keys(storyProgress.cleared).length}/${DUEL_STORY_STAGES.length} 대전 클리어</small><p>버튼은 <b>공격·방어·회피·필살</b> 네 개. <b>공격+방어</b>를 같이 누르면 강공격(막기 부수기), <b>공격+회피</b>는 캐릭터 기술. 공격은 막기에, 막기는 강공격에 져요. 처음이면 <b>콤보 연습</b>부터!</p><nav class="sd-filters" aria-label="캐릭터 묶음">${[['all',`전체 ${choices.length}`],['new','새 친구 6'],['guests','먼저 온 친구 6'],['original','기본 9']].map(([id,n])=>`<button class="sd-chip${rosterFilter===id?' on':''}" data-filter="${id}">${n}</button>`).join('')}</nav><div class="sd-roster-scroll"><div class="sd-cards">${choices.filter(id=>rosterFilter==='all'||(rosterFilter==='new'?LATEST_GUESTS.includes(id):rosterFilter==='guests'?FIRST_GUESTS.includes(id):DUEL_ORDER.slice(0,9).includes(id))).map(card).join('')}</div>
   <div class="sd-row"><span>상대</span>${['random',...choices].map(id=>`<button class="sd-chip${pick.enemy===id?' on':''}" data-enemy="${id}">${id==='random'?'무작위':DUEL_CHARACTERS[id].name}</button>`).join('')}</div>
   <div class="sd-row"><span>난이도</span>${[['easy','쉬움'],['normal','보통'],['hard','어려움']].map(([id,n])=>`<button class="sd-chip${pick.difficulty===id?' on':''}" data-diff="${id}">${n}</button>`).join('')}</div>
   </div><footer class="sd-roster-footer"><button class="sd-primary sd-go">대전 시작 · 세 판 두 선승</button><button class="sd-practice">콤보 연습 · 기술 익히기</button><button class="sd-back">돌아가기</button><small>자유 대전·연습은 보상 없이 즐겨요. 이야기 모드는 클리어한 상대를 기록해요. ${choices.includes('heart')?'정원의 심장 동료 해금!':'마지막 스테이지 보스를 이기면 정원의 심장이 동료로 합류해요.'}</small></footer></div>`;
  root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{rosterFilter=b.dataset.filter;select();});
  root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pick.player=b.dataset.pick;select();});
  root.querySelectorAll('[data-enemy]').forEach(b=>b.onclick=()=>{pick.enemy=b.dataset.enemy;select();});
  root.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{pick.difficulty=b.dataset.diff;select();});
  $('.sd-story-open').onclick=storyMap;$('.sd-go').onclick=()=>start(false);$('.sd-practice').onclick=()=>start(true);$('.sd-back').onclick=close;
 }
 function start(practice=false){clearTimeout(resultTimer);paused=false;clearInput();storySaved=false;const choices=availableDuelCharacters(storyProgress);if(!choices.includes(pick.player))pick.player='pierce';const others=choices.filter(id=>id!==pick.player),enemy=storyStage?.enemy||(pick.enemy==='random'||practice&&pick.enemy===pick.player?others[Math.floor(Math.random()*others.length)]:pick.enemy);for(const id of [pick.player,enemy])load('motion-'+id,`duel/${id}-motion-v1.webp`);s=createDuel({player:pick.player,enemy,seed:Date.now()>>>0,difficulty:storyStage?.difficulty||pick.difficulty,practice,boss:Boolean(storyStage?.boss)});drill.on=practice;root.classList.toggle('sd-practicing',practice);if(practice){s.phase='fight';s.message='';drill.idx=0;drill.done=new Set();drillStart();}$('.sd-drill').hidden=!practice;$('.sd-modal').hidden=true;audio?.unlock?.();$('.sd-p0 b').textContent=DUEL_CHARACTERS[pick.player].name+' (나)';$('.sd-p1 b').textContent=DUEL_CHARACTERS[enemy].name;
  root.querySelectorAll('.sd-skill .sd-law').forEach(i=>{i.innerHTML=lawArt(DUEL_CHARACTERS[pick.player].law||pick.player,'sd-law-art');});root.style.setProperty('--me',DUEL_CHARACTERS[pick.player].ink);
  root.classList.add('sd-playing');const storyHud=$('.sd-story-hud');storyHud.hidden=!storyStage;if(storyStage)storyHud.textContent=`${storyStage.number}/${DUEL_STORY_STAGES.length} · ${storyStage.title}`;cam.k=0;trails[0].length=trails[1].length=0;last=0;if(!raf)raf=requestAnimationFrame(loop);}
 function result(){resultTimer=0;if(closed)return;menuRest(false);if(storyStage){recordStoryWin();storyResult();return;}const win=s.winner===0;$('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-small"><p class="sd-eyebrow">${win?'VICTORY':'DEFEAT'}</p><h1>${win?'대전 승리!':'대전 패배'}</h1>${portrait(s.fighters[win?0:1].char,'big')}<p>${s.wins[0]} : ${s.wins[1]}</p><button class="sd-primary sd-again">다시 붙기</button><button class="sd-pickagain">캐릭터 다시 고르기</button><button class="sd-back">돌아가기</button></div>`;$('.sd-again').onclick=()=>start(false);$('.sd-pickagain').onclick=()=>{root.classList.remove('sd-playing');select();};$('.sd-back').onclick=close;}

 // ── 혼자 깨는 이야기: 같은 대전 규칙, 다른 상대·대화·진행 기록.
 function clearInput(){keys.clear();held.clear();pressed.clear();move.x=move.y=0;pend=null;suppressBlock=false;root.querySelectorAll('.down').forEach(b=>b.classList.remove('down'));$('.sd-stick i').style.transform='';}
 function menuRest(reset=true){cancelAnimationFrame(raf);raf=0;clearTimeout(resultTimer);resultTimer=0;clearInput();paused=false;drill.on=false;$('.sd-drill').hidden=true;root.classList.remove('sd-practicing');if(reset){s=null;root.classList.remove('sd-playing');$('.sd-story-hud').hidden=true;$('.sd-message').textContent='';$('.sd-combo').textContent='';}camera(0);draw(0);}
 function refreshStory(){if(!practice)storyProgress=readDuelStory(storage,owner);}
 function storyMap(){
  menuRest();storyStage=null;refreshStory();pick.player=storyProgress.hero;const next=nextStoryStage(storyProgress);
  $('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-story-map"><p class="sd-eyebrow">SEED · 아홉 빛의 약속</p><h1>이야기 모드</h1><p>${next?'아홉 빛을 되찾고 먼 정원에서 온 친구들을 만나세요. 한 대전은 세 판 두 선승이에요.':'정원의 심장이 동료가 되었어요. 대전 메뉴에서 새 수호자로도 싸워 보세요.'}</p><div class="sd-row sd-story-heroes" aria-label="함께할 씨앗">${availableDuelCharacters(storyProgress).map(id=>`<button class="sd-chip${pick.player===id?' on':''}" data-hero="${id}">${DUEL_CHARACTERS[id].name}</button>`).join('')}</div><small>상대마다 다른 씨앗으로 도전해도 돼요. 클리어한 대전부터 이어집니다.</small>
  <div class="sd-story-chapters">${DUEL_STORY_CHAPTERS.map((ch,index)=>`<section><h2>${ch.name}</h2><p>${ch.intro}</p><div class="sd-story-stages">${DUEL_STORY_STAGES.filter(v=>v.chapter===index).map(v=>{const done=storyProgress.cleared[v.id],open=storyUnlocked(storyProgress,v.number);return `<button class="sd-story-stage${done?' done':''}${next===v.number?' next':''}" data-stage="${v.number}" ${open?'':'disabled'}>${portrait(v.enemy)}<span><b>${v.number}. ${v.title}</b><small>${done?`✓ 클리어 · 2:${done.losses}`:open?`도전 가능 · ${v.label}`:'앞 대전을 클리어하면 열려요'}</small></span></button>`;}).join('')}</div></section>`).join('')}</div>
  <footer class="sd-story-footer">${next?`<button class="sd-primary sd-story-continue">${next===1?'이야기 시작':`${next}번째 대전 이어하기`}</button>`:'<p class="sd-story-ending">작은 씨앗이 모든 친구의 빛을 연결했습니다.</p>'}<p class="sd-save-note" role="status">${saveNote|| (practice?'로컬 시연 · 진행은 이 화면에서만 유지돼요.':onSaveAccount?'클리어 기록은 계정 저장과 함께 연동돼요.': '클리어 기록은 이 기기에 저장돼요. 로그인하면 계정에 연결할 수 있어요.')}</p>${onSaveAccount&&!practice?'<button class="sd-account-save">계정 저장 확인</button>':''}<button class="sd-back">대전 메뉴로</button></footer></div>`;
  root.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{pick.player=b.dataset.hero;root.querySelectorAll('[data-hero]').forEach(x=>x.classList.toggle('on',x===b));});
  root.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>storyIntro(Number(b.dataset.stage)));
  if(next)$('.sd-story-continue').onclick=()=>storyIntro(next);$('.sd-back').onclick=select;
  const save=$('.sd-account-save');if(save)save.onclick=async()=>{save.disabled=true;save.textContent='저장 확인 중…';let ok=false;try{ok=canSave()&&await onSaveAccount();}catch{}if(closed||!save.isConnected)return;save.disabled=false;save.textContent=ok?'계정 저장 완료':'저장 다시 시도';saveNote=ok?'서버에 기록을 저장했어요. 다른 기기에서 같은 계정으로 이어갈 수 있어요.':'서버 저장을 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';$('.sd-save-note').textContent=saveNote;};
 }
 function storyIntro(n){refreshStory();const stage=DUEL_STORY_STAGES[n-1];if(!stage||!storyUnlocked(storyProgress,n))return;storyStage=stage;
  $('.sd-modal').innerHTML=`<div class="sd-paper sd-small sd-story-dialogue"><div class="sd-dialogue-scroll"><p class="sd-eyebrow">${DUEL_STORY_CHAPTERS[stage.chapter].name}${stage.boss?' · 스테이지 보스':''}</p><h1>${stage.title}</h1>${portrait(stage.enemy,'big')}<b>${DUEL_CHARACTERS[stage.enemy].name}</b><blockquote>${stage.before}</blockquote><p class="sd-story-tip">${stage.tip}</p><small>나: ${DUEL_CHARACTERS[pick.player].name} · 상대: ${stage.label}</small></div><footer class="sd-dialogue-actions"><button class="sd-primary sd-story-fight">대전 시작</button><button class="sd-back">이야기 목록으로</button></footer></div>`;
  $('.sd-story-fight').onclick=()=>start(false);$('.sd-back').onclick=storyMap;
 }
 function recordStoryWin(){if(!storyStage||storySaved||s?.phase!=='over')return;storySaved=true;if(s.winner!==0){saveNote='이번 대전은 다시 도전해요. 이전 클리어 기록은 그대로 남아 있어요.';return;}refreshStory();const next=completeStoryMatch(storyProgress,storyStage,s);if(!next)return;storyProgress=next;
  if(practice){saveNote='로컬 시연 · 클리어 기록은 이 화면에서만 유지돼요.';return;}
  if(!canSave()||!writeDuelStory(storage,storyProgress,owner)){saveNote='이 기기에 기록을 저장하지 못했어요. 계정과 저장 공간을 확인해 주세요.';return;}
  onProgress(storyProgress);saveNote=onSaveAccount?'이 기기에 클리어 기록을 남겼어요. 계정 저장 확인으로 서버 저장도 확인할 수 있어요.':'이 기기에 클리어 기록을 남겼어요.';
 }
 function storyResult(){const stage=storyStage,win=s.winner===0,ending=win&&nextStoryStage(storyProgress)===null;
  $('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-small sd-story-dialogue"><div class="sd-dialogue-scroll"><p class="sd-eyebrow">${win?'빛을 되찾았어요':'다시 도전할 수 있어요'}</p><h1>${ending?'함께 울리는 빛':stage.title}</h1>${portrait(win?pick.player:stage.enemy,'big')}<p>${s.wins[0]} : ${s.wins[1]}</p><blockquote>${win?stage.after:'패배해도 지금까지 모은 빛은 사라지지 않아요.'}</blockquote>${win&&stage.boss?'<p class="sd-boss-unlock">정원의 심장 해금! 자유 대전과 콤보 연습에서 선택할 수 있어요. 동료로 사용할 때는 대전용 능력치가 적용돼요.</p>':''}${ending?'<p>먼 정원의 친구들도 생명의 나무 아래 모였습니다. 작은 씨앗은 서로 다른 싸움법을 배우고 함께 정원을 지키는 약속을 맺었습니다.</p>':`<p class="sd-story-tip">${stage.tip}</p>`}<p class="sd-save-note" role="status">${saveNote}</p></div><footer class="sd-dialogue-actions"><button class="sd-primary sd-story-next">${!win?'같은 상대에게 다시 도전':ending?'이야기 목록으로':'다음 상대 만나기'}</button><button class="sd-back">이야기 목록으로</button></footer></div>`;
  $('.sd-story-next').onclick=()=>{if(!win)start(false);else if(ending)storyMap();else storyIntro(Math.min(DUEL_STORY_STAGES.length,stage.number+1));};$('.sd-back').onclick=storyMap;
 }
 function pause(){if(!s||s.phase==='over'||!$('.sd-modal').hidden)return;paused=true;cancelAnimationFrame(raf);raf=0;clearInput();
  $('.sd-modal').hidden=false;$('.sd-modal').innerHTML=`<div class="sd-paper sd-small"><p class="sd-eyebrow">PAUSE</p><h1>잠깐 쉬어가기</h1><p>${storyStage?'클리어 기록은 남아요. 진행 중인 대전은 다시 시작해야 해요.':'계속하기를 누르면 이 대전으로 돌아와요.'}</p><button class="sd-primary sd-resume">계속하기</button><button class="sd-pickagain">${storyStage?'이야기 목록으로':'대전 메뉴로'}</button><button class="sd-back">던전으로 돌아가기</button></div>`;
  $('.sd-resume').onclick=()=>{paused=false;$('.sd-modal').hidden=true;clearInput();last=0;if(!raf)raf=requestAnimationFrame(loop);};$('.sd-pickagain').onclick=()=>storyStage?storyMap():select();$('.sd-back').onclick=close;
 }
 // ── 입력
 // 2026-09-28 사용자: "키가 너무 많다 · 공격·회피·방어·궁만 · 같이 누르면 다른 기술" — 같이 누르기(0.07초 안)를 알아챈다.
 // 공격 → (0.07초 안에) 방어 = 강공격, 방어를 누른 채 공격 = 강공격, 공격 ↔ 회피 같이 = 기술. 혼자면 0.07초 뒤 그대로 나간다.
 // 터치는 엄지 하나로 두 버튼을 동시에 누르기 어려워서, 두 버튼 사이의 '+' 자리가 같이 누르기다.
 const CHORD_MS=70;let pend=null,suppressBlock=false;
 const blockHeld=()=>held.has('block')||keys.has('KeyK');
 function fire(a){pressed.add(a);}
 function press(a){const now=performance.now(),recent=pend&&now-pend.t<=CHORD_MS;
  if(a==='block'){if(recent&&pend.a==='attack'){pend=null;suppressBlock=true;fire('heavy');}return;}
  if(a==='attack'){if(blockHeld()){suppressBlock=true;fire('heavy');return;}if(recent&&pend.a==='dodge'){pend=null;fire('skill1');return;}if(pend)fire(pend.a);pend={a,t:now};return;}
  if(a==='dodge'){if(recent&&pend.a==='attack'){pend=null;fire('skill1');return;}if(pend)fire(pend.a);pend={a,t:now};return;}
  fire(a);}
 function input(){if(pend&&performance.now()-pend.t>CHORD_MS){fire(pend.a);pend=null;}if(!blockHeld())suppressBlock=false;
  const i={x:move.x+((keys.has('KeyD')||keys.has('ArrowRight'))?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft'))?1:0),y:move.y+((keys.has('KeyS')||keys.has('ArrowDown'))?1:0)-((keys.has('KeyW')||keys.has('ArrowUp'))?1:0),block:blockHeld()&&!suppressBlock};
  if(Math.hypot(i.x,i.y)>.1){i.aimX=i.x;i.aimY=i.y;}for(const a of pressed)i[a]=true;pressed.clear();return i;}
 const KEY={KeyJ:'attack',KeyK:'block',Space:'dodge',KeyO:'ult',KeyL:'heavy',KeyU:'skill1'};
 listen(window,'keydown',e=>{if(e.target?.closest?.('input,textarea'))return;if(e.code==='Escape'){e.preventDefault();if($('.sd-modal').hidden)pause();return;}if(!s||s.phase==='over'||!$('.sd-modal').hidden)return;if(KEY[e.code]||['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(KEY[e.code])press(KEY[e.code]);});
 listen(window,'keyup',e=>keys.delete(e.code));listen(window,'blur',clearInput);listen(document,'visibilitychange',()=>{last=0;clearInput();if(document.hidden){if($('.sd-modal').hidden)pause();cancelAnimationFrame(raf);raf=0;}});
 root.querySelectorAll('[data-act]').forEach(b=>{const a=b.dataset.act;listen(b,'pointerdown',e=>{e.preventDefault();if(a==='block')held.add('block');press(a);b.classList.add('down');});for(const n of ['pointerup','pointercancel','pointerleave'])listen(b,n,()=>{if(a==='block')held.delete('block');b.classList.remove('down');});});
 root.querySelectorAll('[data-chord]').forEach(b=>{listen(b,'pointerdown',e=>{e.preventDefault();fire(b.dataset.chord);b.classList.add('down');});for(const n of ['pointerup','pointercancel','pointerleave'])listen(b,n,()=>b.classList.remove('down'));});
 const stick=$('.sd-stick');let stickId=null;
 listen(stick,'pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});listen(stick,'pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});
 for(const n of ['pointerup','pointercancel','lostpointercapture'])listen(stick,n,()=>{stickId=null;move.x=move.y=0;stick.querySelector('i').style.transform='';});
 function moveStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),m=r.width*.36,k=Math.min(1,d/m);move.x=d>8?x/d:0;move.y=d>8?y/d:0;stick.querySelector('i').style.transform=`translate(${(x/(d||1))*k*m}px,${(y/(d||1))*k*m}px)`;}
 $('.sd-pause').onclick=pause;
 // ── 루프
 function loop(now){raf=0;if(closed||document.hidden||paused||!$('.sd-modal').hidden)return;raf=requestAnimationFrame(loop);if(!pacer(now,60))return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;clock+=dt;
  if(s&&s.phase!=='over'){stepDuel(s,dt,input(),enemyInput(dt));drillEvents(s.events);for(const ev of s.events){const [id,o]=SOUND[ev]||[];if(id)audio?.play(id,o);if(ev==='link')pop(s.fighters[0].x,s.fighters[0].y-2.6,'연계!','#ffd36b');}s.events.length=0;if(s.phase==='over'){recordStoryWin();resultTimer=setTimeout(result,900);}}
  camera(dt);draw(dt);if(now-uiAt>90){uiAt=now;hud();}}
 // ── 콤보 연습(2026-09-28 사용자: "콤보 연습이 있으면 좋겠다 · 콤보가 뭔지도 모르겠다 · 나중에 PvP")
 // 과제를 하나씩: 무엇을 누르는지·왜 쓰는지 알려 주고, 연습 상대(서 있기·막기·공격)가 과제에 맞춰 움직인다. 성공하면 다음 과제.
 const DRILLS=[
  {name:'기본 3연격',keys:['공격','공격','공격'],tip:'공격을 박자에 맞춰 세 번. 1·2타는 좌우로, 3타는 크게 휘둘러 밀어내요.',dummy:'idle',check:p=>p.chainTime>0&&p.chain>=3},
  {name:'연계 강공격',keys:['공격','공격+방어'],tip:'평타가 맞는 순간 공격과 방어를 같이 누르면 준비가 짧은 강공격으로 이어져요. 평타 3타 뒤에도 돼요.',dummy:'idle',on:'linkHit'},
  {name:'막기 부수기',keys:['공격+방어','공격+방어'],tip:'상대가 막고 있으면 평타는 튕겨 나가요. 강공격(공격+방어)을 두세 번 맞히면 막기가 부서져요.',dummy:'block',on:'guardBreak'},
  {name:'기술 연계',keys:['공격','공격+회피'],tip:'평타가 맞은 뒤 공격과 회피를 같이 누르면 캐릭터 기술로 이어져요. 캐릭터마다 기술이 달라요(고르기 화면의 기술 이름).',dummy:'idle',on:'skillCombo'},
  {name:'반격 막기',keys:['상대가 휘두르기 직전','방어'],tip:'상대 공격이 닿기 바로 전에 방어를 누르면 상대가 크게 흔들려요. 미리 누르고 있으면 그냥 막기예요.',dummy:'attack',on:'parry'},
  {name:'회피로 피하기',keys:['상대가 휘두를 때','회피'],tip:'회피하는 순간은 맞지 않아요. 방향키와 같이 누르면 그쪽으로 굴러요.',dummy:'attack',on:'dodgeAvoid'},
  {name:'필살기',keys:['필살'],tip:'공격을 맞히고 맞으면 노란 게이지가 차요. 가득 차면 필살! 연습에서는 늘 가득 차 있어요.',dummy:'idle',on:'ultimate'},
  {name:'풀 콤보',keys:['공격','공격','공격+방어','공격+회피'],tip:'익힌 것을 한 번에! 끊기지 않고 4타 이상 맞혀 보세요.',dummy:'idle',check:p=>p.chainTime>0&&p.chain>=4}
 ];
 const drill={on:false,idx:0,done:new Set(),linkAt:-9,skillAt:-9,dummyCd:1,dummyHit:false,advanceAt:0};
 function drillStart(){if(!s)return;const [p,e]=s.fighters,d=DRILLS[drill.idx];p.x=(DUEL_SPAWN[0].x+DUEL_SPAWN[1].x)/2-1;p.y=DUEL_SPAWN[0].y;e.x=p.x+1.9;e.y=p.y;s.message='';s.shots.length=0;s.hazards.length=0;p.fx=1;p.fy=0;p.cd=[0,0];p.state='idle';p.t=0;e.hp=e.maxHp;e.guard=DUEL_RULES.guardMax;e.state='idle';e.stun=0;p.chain=0;p.chainTime=0;drill.linkAt=drill.skillAt=-9;drill.dummyCd=1.2;drill.advanceAt=0;renderDrill();}
 function dummyInput(dt){const [p,e]=s.fighters,d=DRILLS[drill.idx],dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy)||1,i={aimX:dx,aimY:dy};if(d.on==='ultimate')p.meter=100;p.cd[0]=Math.min(p.cd[0],1);// 연습에서는 기술 대기 1초까지만

  if(d.dummy==='block'){i.block=true;return i;}
  if(d.dummy==='attack'){drill.dummyCd-=dt;if(dist>2.2){i.x=dx/dist;i.y=dy/dist;}else if(drill.dummyCd<=0&&e.state!=='attack'){i.attack=true;drill.dummyCd=1.7;}return i;}
  return i;}
 function drillSuccess(){const d=DRILLS[drill.idx];if(drill.done.has(drill.idx)&&drill.advanceAt)return;drill.done.add(drill.idx);drill.advanceAt=performance.now()+1300;audio?.play('evolve');pop(s.fighters[0].x,s.fighters[0].y-3,'성공!','#9ef0a0');renderDrill();}
 function drillEvents(events){if(!drill.on)return;const [p,e]=s.fighters,d=DRILLS[drill.idx],t=s.time;
  for(const ev of events){if(ev==='link')drill.linkAt=t;if(ev==='heavyHit'&&t-drill.linkAt<.8&&d.on==='linkHit')drillSuccess();if(ev==='guardBreak'&&d.on==='guardBreak')drillSuccess();if(ev==='parry'&&d.on==='parry')drillSuccess();if(ev==='ultimate'&&d.on==='ultimate')drillSuccess();if(ev==='skill'&&p.chainTime>0)drill.skillAt=t;if((ev==='hit'||ev==='heavyHit')&&d.on==='skillCombo'&&t-drill.skillAt<.9&&p.chain>=2)drillSuccess();}
  // 설치·방패 기술은 곧바로 피해를 주지 않으므로 평타 뒤의 실제 시전으로 연계를 확인한다.
  if(d.on==='skillCombo'&&drill.skillAt===t&&['burst','reflect','thorn','bastion','lotus','reed','cinder','pebble','echo','pulse','shard'].includes(p.char))drillSuccess();
  if(d.on==='dodgeAvoid'){const hit=e.state==='attack'&&e.hitDone;if(hit&&!drill.dummyHit&&p.inv>0&&Math.hypot(p.x-e.x,p.y-e.y)<3.2)drillSuccess();drill.dummyHit=hit;}
  if(d.check?.(p))drillSuccess();
  if(drill.advanceAt&&performance.now()>drill.advanceAt){drill.advanceAt=0;if(drill.idx<DRILLS.length-1){drill.idx++;drillStart();}else renderDrill();}}
 function renderDrill(){const box=$('.sd-drill');if(!drill.on){box.hidden=true;return;}const d=DRILLS[drill.idx];box.hidden=false;
  box.innerHTML=`<div class="sd-drill-head"><b>콤보 연습 ${drill.idx+1}/${DRILLS.length}</b><span>${drill.done.size}개 성공</span></div><h3>${drill.done.has(drill.idx)?'✓ ':''}${d.name}</h3><div class="sd-drill-keys">${d.keys.map(k=>`<kbd>${k}</kbd>`).join('<i>→</i>')}</div><p>${d.tip}</p><div class="sd-drill-list">${DRILLS.map((x,n)=>`<button data-drill="${n}" class="${n===drill.idx?'on':''} ${drill.done.has(n)?'done':''}" aria-label="${x.name}">${drill.done.has(n)?'✓':n+1}</button>`).join('')}</div><div class="sd-drill-nav"><button data-drill-nav="-1">◀ 이전</button><button data-drill-nav="1">다음 ▶</button><button class="sd-drill-exit">연습 끝내기</button></div>`;
  box.querySelectorAll('[data-drill]').forEach(b=>b.onclick=()=>{drill.idx=Number(b.dataset.drill);drillStart();});
  box.querySelectorAll('[data-drill-nav]').forEach(b=>b.onclick=()=>{drill.idx=Math.max(0,Math.min(DRILLS.length-1,drill.idx+Number(b.dataset.drillNav)));drillStart();});
  box.querySelector('.sd-drill-exit').onclick=()=>{drill.on=false;root.classList.remove('sd-playing','sd-practicing');box.hidden=true;s=null;select();};}
 const enemyInput=dt=>drill.on&&s?dummyInput(dt):null;
 function pop(x,y,text,color){pops.push({x,y,text,color,t:0});if(pops.length>8)pops.shift();}
 function hud(){if(!s)return;for(const f of s.fighters){const side=$('.sd-p'+f.team);side.querySelector('.sd-hp i').style.width=Math.max(0,f.hp/f.maxHp*100)+'%';side.querySelector('.sd-guard i').style.width=f.guard/DUEL_RULES.guardMax*100+'%';side.querySelector('.sd-meter i').style.width=f.meter+'%';side.classList.toggle('ult-ready',f.meter>=100);}
  if(storyStage?.boss){const b=s.fighters[1],beat=b.bossRecovery>0?'반격할 틈':({well:'중력 꽃 · 원에서 벗어나세요',orbit:'공전 씨앗 · 궤도를 확인하세요',ring:'퍼지는 고리 · 회피하세요'}[b.bossPattern]||'마지막 수호자의 시험');$('.sd-story-hud').textContent=`스테이지 보스 · 정원의 심장 · ${b.bossPhase||1}단계 · ${beat}`;}
  $('.sd-rounds').textContent=`${'●'.repeat(s.wins[0])}${'○'.repeat(2-s.wins[0])}  ${s.round}R  ${'○'.repeat(2-s.wins[1])}${'●'.repeat(s.wins[1])}`;$('.sd-timer').textContent=s.practice?'연습':Math.max(0,Math.ceil(s.roundTime));
  const msg=s.phase==='ready'?`${s.round}라운드 · 준비`:s.message;if($('.sd-message').textContent!==msg){$('.sd-message').textContent=msg;$('.sd-message').classList.remove('pop');void $('.sd-message').offsetWidth;$('.sd-message').classList.add('pop');}
  const p=s.fighters[0],c=DUEL_CHARACTERS[p.char];{const b=$('.sd-chord-skill');b.querySelector('.sd-lbl').textContent=p.cd[0]>0?Math.ceil(p.cd[0])+'초':'기술';b.classList.toggle('cooldown',p.cd[0]>0);}$('.sd-ult').classList.toggle('ready',p.meter>=100);$('.sd-dodge').classList.toggle('cooldown',p.dodgeCd>0);
  const combo=$('.sd-combo'),n=p.chainTime>0?p.chain:0,text=n>=2?`${n} HIT`:'';if(combo.textContent!==text){combo.textContent=text;combo.classList.remove('pop');if(text){void combo.offsetWidth;combo.classList.add('pop');}}}
 // ── 카메라: 두 씨앗이 모두 보이게, 가까우면 당겨 본다. 경기장 밖(숲)은 조금만.
 function camera(dt){
  // 아래쪽은 조이스틱·버튼이 덮으니 그만큼 비워 두고 그 위 공간에 두 씨앗을 담는다(구석에 몰려도 버튼 뒤로 숨지 않게).
  const top=72,bottom=Math.min(150,height*.24),availH=Math.max(120,height-top-bottom),A=DUEL_ARENA;
  const [a,b]=s?s.fighters:DUEL_SPAWN,spanX=Math.abs(a.x-b.x)+10,spanY=Math.abs(a.y-b.y)+7;
  const kMax=Math.min(width/15,availH/9.5),kMin=Math.min(width/(A.maxX-A.minX+5),availH/(A.maxY-A.minY+4.5));
  const k=clamp(Math.min(width/spanX,availH/spanY),kMin,Math.max(kMin,kMax));
  const vw=width/k,vh=availH/k,bound=(v,span,min,max)=>span>=max-min?(min+max)/2:clamp(v,min+span/2,max-span/2);
  const tx=bound((a.x+b.x)/2,vw,A.minX-2.5,A.maxX+2.5),ty=bound((a.y+b.y)/2-.9,vh,A.minY-3.2,A.maxY+2);
  if(!cam.k||!dt){cam.k=k;cam.x=tx;cam.y=ty;}else{const m=1-Math.exp(-3.5*dt),n=1-Math.exp(-7*dt);cam.k+=(k-cam.k)*m;cam.x+=(tx-cam.x)*n;cam.y+=(ty-cam.y)*n;}
  scale=cam.k;const shake=(s?.shake||0)*scale*.22;ox=width/2-cam.x*scale+Math.sin(clock*83)*shake;oy=top+availH/2-cam.y*scale+Math.cos(clock*71)*shake;
 }
 // ── 바닥 굽기: 숲 바닥·돌 테두리·돌바닥·가운데 문양·시작 자리·가장자리 나무. 한 번만 그린다.
 function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
 function tilePattern(g,im,tile,alpha=1){const px=Math.round(tile*BAKE),c=document.createElement('canvas');c.width=c.height=px;const t=c.getContext('2d');t.globalAlpha=alpha;t.drawImage(im,0,0,px,px);const p=g.createPattern(c,'repeat');p.setTransform?.(new DOMMatrix([1/BAKE,0,0,1/BAKE,0,0]));return p;}
 function bakeFloor(){
  const c=document.createElement('canvas');c.width=(WX1-WX0)*BAKE;c.height=(WY1-WY0)*BAKE;const g=c.getContext('2d'),A=DUEL_ARENA;g.scale(BAKE,BAKE);g.translate(-WX0,-WY0);
  g.fillStyle='#0a1612';g.fillRect(WX0,WY0,WX1-WX0,WY1-WY0);
  if(ready('grass')){g.save();g.globalAlpha=.4;g.fillStyle=tilePattern(g,assets.grass,9);g.fillRect(WX0,WY0,WX1-WX0,WY1-WY0);g.restore();}
  const R={x:A.minX-1.3,y:A.minY-1.6,w:A.maxX-A.minX+2.6,h:A.maxY-A.minY+2.8};
  // 테두리 그림자·돌 띠.
  g.save();g.shadowColor='#000c';g.shadowBlur=1.2*BAKE;g.shadowOffsetY=.3*BAKE;roundRect(g,R.x-.6,R.y-.6,R.w+1.2,R.h+1.2,2.6);g.fillStyle='#3d3b31';g.fill();g.restore();
  roundRect(g,R.x-.6,R.y-.6,R.w+1.2,R.h+1.2,2.6);g.lineWidth=.14;g.strokeStyle='#c9bd8f88';g.stroke();
  // 돌바닥.
  g.save();roundRect(g,R.x,R.y,R.w,R.h,2.1);g.clip();g.fillStyle='#5b5a4c';g.fillRect(R.x,R.y,R.w,R.h);
  if(ready('arena')){g.fillStyle=tilePattern(g,assets.arena,9);g.fillRect(R.x,R.y,R.w,R.h);}else if(ready('paving')){g.fillStyle=tilePattern(g,assets.paving,7);g.fillRect(R.x,R.y,R.w,R.h);}
  const cx=(A.minX+A.maxX)/2,cy=(A.minY+A.maxY)/2,light=g.createRadialGradient(cx,cy,1,cx,cy,Math.max(R.w,R.h)*.62);light.addColorStop(0,'#fff3c61c');light.addColorStop(.55,'#0000');light.addColorStop(1,'#050c0e8c');g.fillStyle=light;g.fillRect(R.x,R.y,R.w,R.h);
  g.restore();roundRect(g,R.x,R.y,R.w,R.h,2.1);g.lineWidth=.22;g.strokeStyle='#161b16cc';g.stroke();roundRect(g,R.x+.18,R.y+.18,R.w-.36,R.h-.36,1.95);g.lineWidth=.08;g.strokeStyle='#efe2b455';g.stroke();
  // 가운데 문양: 두 겹 원과 세 잎.
  g.save();g.translate(cx,cy);g.scale(1,.72);g.lineWidth=.12;g.strokeStyle='#e8d9aa40';g.beginPath();g.arc(0,0,3.6,0,Math.PI*2);g.stroke();g.setLineDash([.5,.35]);g.beginPath();g.arc(0,0,2.9,0,Math.PI*2);g.stroke();g.setLineDash([]);
  g.fillStyle='#e8d9aa22';for(let i=0;i<3;i++){g.save();g.rotate(-Math.PI/2+(i-1)*.75);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(.7,-1,1.9,0);g.quadraticCurveTo(.7,1,0,0);g.fill();g.restore();}g.restore();
  // 시작 자리.
  for(const [i,p] of DUEL_SPAWN.entries()){g.save();g.translate(p.x,p.y);g.scale(1,.5);g.lineWidth=.1;g.strokeStyle=i?'#ff8a7a55':'#8fd3ff55';g.beginPath();g.arc(0,0,1.1,0,Math.PI*2);g.stroke();g.restore();}
  // 테두리 말뚝·등불(따뜻한 빛).
  const posts=[];for(let x=R.x+1.5;x<=R.x+R.w-1.4;x+=4)posts.push([x,R.y-.3],[x,R.y+R.h+.3]);for(let y=R.y+2.5;y<=R.y+R.h-2;y+=4)posts.push([R.x-.3,y],[R.x+R.w+.3,y]);
  for(const [x,y] of posts){g.fillStyle='#2a2a22';g.fillRect(x-.28,y-.28,.56,.56);g.fillStyle='#8f8566';g.fillRect(x-.2,y-.36,.4,.4);}
  for(const [x,y] of [[R.x,R.y],[R.x+R.w,R.y],[R.x,R.y+R.h],[R.x+R.w,R.y+R.h]]){const glow=g.createRadialGradient(x,y,0,x,y,2.6);glow.addColorStop(0,'#ffcf7a55');glow.addColorStop(1,'#ffcf7a00');g.fillStyle=glow;g.fillRect(x-2.6,y-2.6,5.2,5.2);g.fillStyle='#ffe6a8';g.beginPath();g.arc(x,y-.3,.22,0,Math.PI*2);g.fill();}
  // 가장자리 나무·풀(경기장 밖이라 씨앗을 가리지 않는다).
  if(ready('plants')){const im=assets.plants,cw=im.naturalWidth/4,ch=im.naturalHeight/3;let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
   const put=(cell,x,y,z)=>g.drawImage(im,cell%4*cw,Math.floor(cell/4)*ch,cw,ch,x-z/2,y-z*.88,z,z);
   for(let x=R.x-2;x<R.x+R.w+3;x+=3.3+rnd()*1.4)put([6,7,11,6][Math.floor(rnd()*4)],x,R.y-1.3,3.4+rnd()*1.2);
   for(let y=R.y+1;y<R.y+R.h+2;y+=3+rnd()*1.2){put([2,3,8,9][Math.floor(rnd()*4)],R.x-2.2-rnd(),y,2+rnd()*.8);put([2,3,8,9][Math.floor(rnd()*4)],R.x+R.w+2.2+rnd(),y,2+rnd()*.8);}
   for(let x=R.x;x<R.x+R.w;x+=3+rnd()*1.5)put([0,1,4,5][Math.floor(rnd()*4)],x,R.y+R.h+2.4,1.6+rnd()*.5);}
  return c;
 }
 const point=(x,y)=>({x:ox+x*scale,y:oy+y*scale});
 function draw(dt){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#071215';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(!floor&&ready('paving')&&ready('plants'))floor=bakeFloor();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(floor){const x0=(0-ox)/scale,y0=(0-oy)/scale,x1=(width-ox)/scale,y1=(height-oy)/scale,sx=Math.max(0,(x0-WX0)*BAKE),sy=Math.max(0,(y0-WY0)*BAKE),ex=Math.min(floor.width,(x1-WX0)*BAKE),ey=Math.min(floor.height,(y1-WY0)*BAKE);if(ex>sx&&ey>sy){const a=point(WX0+sx/BAKE,WY0+sy/BAKE),b=point(WX0+ex/BAKE,WY0+ey/BAKE);ctx.drawImage(floor,sx,sy,ex-sx,ey-sy,a.x,a.y,b.x-a.x,b.y-a.y);}}
  if(!s)return;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  for(const h of s.hazards){const ink=DUEL_CHARACTERS[s.fighters[h.owner].char].ink;
   if(['reedTell','cinderPatch','pebbleOrbit','echoStrike','pulseRing','shardMark','heartWell'].includes(h.kind)){guestHazard(h,ink);continue;}
   if(['bramble','frostBloom','rushTell'].includes(h.kind)){newHazard(h,ink);continue;}
   if(h.kind==='ring'){ctx.save();ctx.strokeStyle=ink+'44';ctx.lineWidth=.08;ctx.beginPath();ctx.ellipse(h.x,h.y-.4,h.r,h.r*.62,0,0,Math.PI*2);ctx.stroke();ctx.restore();const n=h.r>2?5:3;for(let k=0;k<n;k++){const a=clock*5+k*Math.PI*2/n;vfx.fx(ctx,'orb',h.x+Math.cos(a)*h.r,h.y-.6+Math.sin(a)*h.r*.62,.75,{color:ink,alpha:.95});vfx.shot(ctx,'orbit',h.x+Math.cos(a)*h.r,h.y-.6+Math.sin(a)*h.r*.62,.9,{color:ink,alpha:.6,rotation:a});}continue;}
   if(h.kind==='blizzard'){vfx.field(ctx,{x:h.x,y:h.y,radius:h.r*.8,kind:'web'},1,clock*1000,ink);for(let k=0;k<10;k++){const a=clock*1.5+k*.63,r=h.r*(.3+.7*((k*.37+clock*.4)%1));vfx.fx(ctx,k%3?'flecks':'mist',h.x+Math.cos(a)*r,h.y-.5+Math.sin(a)*r*.62,k%3?.7:1.6,{color:ink,alpha:.55});}continue;}
   if(h.kind==='strike'){const k=Math.max(0,Math.min(1,1-h.t/.45));ctx.save();ctx.fillStyle='#ffdd7826';ctx.strokeStyle='#ffdd78cc';ctx.lineWidth=.08;ctx.beginPath();ctx.ellipse(h.x,h.y,h.r,h.r*.62,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(h.x,h.y,h.r*k,h.r*.62*k,0,0,Math.PI*2);ctx.fillStyle='#ffdd7844';ctx.fill();ctx.restore();continue;}if(h.kind==='tell'||h.kind==='mine'){ctx.fillStyle=h.kind==='tell'?'#ff6b4a33':'#ffaa6533';ctx.beginPath();ctx.ellipse(h.x,h.y,h.r,h.r*.72,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=h.kind==='tell'?'#ff8a6acc':'#ffc28a99';ctx.lineWidth=.08;ctx.stroke();vfx.fx(ctx,'flame',h.x,h.y-.3,.8+.3*Math.sin(clock*20),{color:'#ffaa65',alpha:.9});}else vfx.field(ctx,{x:h.x,y:h.y,radius:h.r*.7,kind:'well'},1,clock*1000,ink);}
  for(const f of s.fighters){trail(f,dt);}
  const actors=[...s.fighters.map(f=>({y:f.y,f})),...DUEL_PILLARS.map((p,i)=>({y:p.y,p,i}))].sort((p,q)=>p.y-q.y);
  for(const o of actors){if(o.p){pillar(o.p,o.i);continue;}fighterDraw(o.f);}
  for(const q of s.shots){if(newProjectile(q))continue;const im=assets.dna,a2=Math.atan2(q.dy,q.dx),ink=DUEL_CHARACTERS[q.law]?.ink||'#fff';vfx.projectile(ctx,q.law,q.x,q.y-.7,a2,.6,ink,clock*1000);if(im?.naturalWidth){const cell=PROJECTILE_DNA_CELLS[q.law]??0,cw=im.naturalWidth/4,z=q.kind==='lance'?1.4:1;ctx.save();ctx.translate(q.x,q.y-.7);ctx.rotate(q.kind==='blade'||q.kind==='petal'?clock*14:a2);ctx.drawImage(im,cell%4*cw,Math.floor(cell/4)*cw,cw,cw,-z/2,-z/2,z,z);ctx.restore();}}
  for(const e of s.effects)effect(e);
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;if(p.t>.9){pops.splice(i,1);continue;}const z=p.t<.12?1.4-p.t*3:1;ctx.save();ctx.globalAlpha=Math.min(1,(.9-p.t)*3);ctx.translate(p.x,p.y-p.t*.8);ctx.scale(z,z);ctx.font=`bold .75px Georgia,'Malgun Gothic'`;ctx.textAlign='center';ctx.lineWidth=.14;ctx.strokeStyle='#221607';ctx.strokeText(p.text,0,0);ctx.fillStyle=p.color;ctx.fillText(p.text,0,0);ctx.restore();}
  ctx.restore();
 }
 // Small fixed-cost silhouettes: no new textures or particle recursion.
 function newProjectile(q){if(!NEW_DUEL.includes(q.law))return false;const c=DUEL_CHARACTERS[q.law],a=Math.atan2(q.dy,q.dx),shape=q.law==='gale'?'crescent':q.law==='lotus'?'petal':'shard';ctx.save();ctx.translate(q.x,q.y-.7);ctx.rotate(a);ctx.strokeStyle=c.ink;ctx.lineWidth=.08;ctx.beginPath();ctx.moveTo(-.65,0);ctx.lineTo(.35,0);ctx.stroke();ctx.restore();vfx.fx(ctx,shape,q.x,q.y-.7,q.law==='comet'?1.1:.8,{color:c.ink,alpha:1,rotation:a+Math.PI/4});return true;}
 function newHazard(h,ink){
  ctx.save();ctx.lineWidth=.08;
  if(h.kind==='rushTell'){ctx.strokeStyle=ink;ctx.setLineDash([.3,.22]);ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.endX,h.endY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=ink;ctx.translate(h.endX,h.endY);ctx.rotate(Math.atan2(h.dy,h.dx));ctx.beginPath();ctx.moveTo(.32,0);ctx.lineTo(-.25,-.25);ctx.lineTo(-.25,.25);ctx.closePath();ctx.fill();ctx.restore();return;}
  const arm=h.arm>0,spent=h.triggered;ctx.globalAlpha=spent?.3:1;ctx.fillStyle=arm?ink+'12':ink+'26';ctx.strokeStyle=arm?ink+'88':ink;ctx.setLineDash(arm?[.22,.17]:[]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  const n=h.kind==='bramble'?5:6;for(let i=0;i<n;i++){const a=i*Math.PI*2/n+clock*.25,r=h.r*.65;vfx.fx(ctx,h.kind==='bramble'?'shard':'petal',h.x+Math.cos(a)*r,h.y-.15+Math.sin(a)*r*.72,.48,{color:ink,alpha:arm?.45:.9,rotation:a});}ctx.restore();
 }
 function guestHazard(h,ink){
  const arm=h.arm>0;ctx.save();ctx.strokeStyle=ink;ctx.lineWidth=.08;
  if(h.kind==='reedTell'||h.kind==='shardMark'){
   ctx.strokeStyle=ink+'22';ctx.lineWidth=2*(h.r+.4);ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.endX,h.endY);ctx.stroke();ctx.strokeStyle=ink;ctx.lineWidth=.08;
   ctx.globalAlpha=arm?.6:1;ctx.setLineDash(arm?[.26,.2]:[]);ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.endX,h.endY);ctx.stroke();ctx.setLineDash([]);
   if(!arm){vfx.beam(ctx,'trail',h.x,h.y-.55,h.endX,h.endY-.55,h.kind==='reedTell'?.75:.45,{color:ink,alpha:1});vfx.fx(ctx,'shard',h.endX,h.endY-.55,.85,{color:ink,alpha:1,rotation:Math.atan2(h.dy,h.dx)+Math.PI/4});}
  }else if(h.kind==='heartWell'){
   ctx.globalAlpha=arm?.55:.85;ctx.setLineDash(arm?[.25,.18]:[]);ctx.fillStyle=ink+'18';ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);
   for(let k=0;k<4;k++){const a=k*Math.PI/2+clock*.8;vfx.fx(ctx,'petal',h.x+Math.cos(a)*h.r*.7,h.y+Math.sin(a)*h.r*.7,.45,{color:'#e9daa2',alpha:arm?.4:.85,rotation:a+Math.PI});}
   vfx.fx(ctx,'orb',h.x,h.y-.15,arm?.5:.8,{color:ink,alpha:arm?.45:.8});
  }else if(h.kind==='pebbleOrbit'){
   ctx.globalAlpha=arm?.35:.65;ctx.beginPath();ctx.arc(h.x,h.y,h.orbitR,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
   if(Number.isFinite(h.rockX)&&Number.isFinite(h.rockY)){ctx.fillStyle='#697567';ctx.lineWidth=.06;ctx.beginPath();ctx.arc(h.rockX,h.rockY-.2,h.contactR*.7,0,Math.PI*2);ctx.fill();ctx.stroke();vfx.fx(ctx,'shard',h.rockX,h.rockY-.25,h.contactR,{color:'#d5dfbd',alpha:.8,rotation:h.angle});}
  }else if(h.kind==='echoStrike'){
   const f=s.fighters[h.owner];body(f,h.fromX,h.fromY,{alpha:arm?.28:.5,frame:arm?4:3});ctx.setLineDash([.16,.15]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   if(!arm){vfx.beam(ctx,'trail',h.fromX,h.fromY-.65,h.x,h.y-.65,.5,{color:ink,alpha:.85});vfx.fx(ctx,'crescent',h.x,h.y-.6,2*h.r,{color:ink,alpha:.8,rotation:clock});}
  }else if(h.kind==='pulseRing'){
   ctx.globalAlpha=arm?.4:1;ctx.setLineDash(arm?[.2,.2]:[]);ctx.beginPath();ctx.arc(h.x,h.y,arm?.4:h.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   if(!arm){ctx.globalAlpha=.25;ctx.lineWidth=.22;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.stroke();}
  }else{
   ctx.globalAlpha=h.triggered?.25:arm?.4:1;ctx.setLineDash(arm?[.2,.17]:[]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   for(let k=0;k<3;k++){const a=k*Math.PI*2/3;vfx.fx(ctx,'flame',h.x+Math.cos(a)*h.r*.5,h.y-.25+Math.sin(a)*h.r*.5,.7,{color:ink,alpha:arm?.35:.9});}
  }ctx.restore();
 }
 function pillar(p,i){const im=assets.plants;ctx.fillStyle='#02090a80';ctx.beginPath();ctx.ellipse(p.x,p.y+.1,1.1,.42,0,0,Math.PI*2);ctx.fill();if(im?.naturalWidth){const cw=im.naturalWidth/4,ch=im.naturalHeight/3,cell=i%2?11:7,z=3.6;ctx.drawImage(im,cell%4*cw,Math.floor(cell/4)*ch,cw,ch,p.x-z/2,p.y-z*.9,z,z);}}
 // 빠르게 움직이는 동안(회피·돌진·도약·강공격) 지나온 자리에 잔상.
 function trail(f,dt){const t=trails[f.team],fast=['dodge','dash','leap'].includes(f.state)||f.state==='heavy'&&f.linked&&f.t>.12;if(fast)t.push({x:f.x,y:f.y,life:.22});for(let i=t.length-1;i>=0;i--){t[i].life-=dt;if(t[i].life<=0)t.splice(i,1);}if(t.length>10)t.shift();}
 // ── 씨앗: 몸동작(웅크림·늘어남·기울기·구르기·들썩임)과 무기, 맞으면 하얗게 번쩍.
 function body(f,x,y,{sx=1,sy=1,rot=0,alpha=1,flash=0,frame=-1}={}){const c=DUEL_CHARACTERS[f.char],mo=frame>=0?assets['motion-'+f.char]:null,useMotion=mo?.naturalWidth>0,im=useMotion?mo:assets.solo,sz=(useMotion?2.75:2.5)*(s?.boss&&f.team===1?1.35:1),face=f.fx<0?-1:1;if(!im?.naturalWidth)return;const cw=im.naturalWidth/4,ch=useMotion?im.naturalHeight/2:im.naturalHeight/3,src=useMotion?[frame%4*cw,Math.floor(frame/4)*ch,cw,ch]:[c.tile%4*cw,Math.floor(c.tile/4)*ch,cw,ch];
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rot);ctx.scale(face*sx,sy);ctx.drawImage(im,...src,-sz/2,-sz*.92,sz,sz);if(flash>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=flash;ctx.drawImage(im,...src,-sz/2,-sz*.92,sz,sz);}ctx.restore();}
 function fighterDraw(f){
  const c=DUEL_CHARACTERS[f.char],face=f.fx<0?-1:1,prev=prevPos[f.team],speed=prev?Math.hypot(f.x-prev.x,f.y-prev.y):0;prevPos[f.team]={x:f.x,y:f.y};
  let sx=1,sy=1,rot=0,lx=0,lift=0;const t=clock;
  const phase=f.total?1-f.t/f.total:1;
  if(f.state==='attack'&&f.t>0){const hp=1-f.hitAt/f.total;if(phase<hp){const k=phase/hp;sx=1+.1*k;sy=1-.1*k;rot=-.16*face*k;}else{const k=1-(phase-hp)/(1-hp);sx=1-.12*k;sy=1+.12*k;rot=(f.step===2?.32:.22)*face*k;lx=.3*k;}}
  else if(f.state==='heavy'&&f.t>0){const release=f.t<=.12;if(!release){const k=Math.min(1,phase/.8);sx=1+.14*k;sy=1-.16*k;rot=-.28*face*k;lift=.12*k;}else{const k=f.t/.12;sx=.84+.16*(1-k);sy=1.18-.18*(1-k);rot=.42*face*k;lx=.45*k;}}
  else if(f.state==='dodge'&&f.t>0){const k=1-f.t/.24;rot=face*Math.PI*2*k;sx=sy=.9;}
  else if(f.state==='dash'){sx=1.18;sy=.86;rot=.18*face;lx=.2;}
  else if(f.state==='leap'){const k=1-f.t/.55;lift=Math.sin(k*Math.PI)*2.2;rot=face*(k-.5)*.6;}
  else if(f.state==='hit'){rot=-.24*face;lx=-.12;}
  else if(['broken','stagger','jailed'].includes(f.state)){rot=.16*Math.sin(t*18);sy=.94;}
  else if(f.blocking){sx=1.06;sy=.92;}
  else if(speed>.01){lift=Math.abs(Math.sin(t*13+f.team))*.14;rot=.07*face;}
  else{sy=1+.025*Math.sin(t*4+f.team);sx=1-.015*Math.sin(t*4+f.team);}
  // 그림자(뜨면 작아짐)·편 표시 고리.
  const shadow=1-Math.min(.5,lift*.2);ctx.fillStyle='#02090a70';ctx.beginPath();ctx.ellipse(f.x,f.y+.05,.72*shadow,.27*shadow,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=f.team===0?'#8fd3ff':'#ff8a7a';ctx.lineWidth=.07;ctx.beginPath();ctx.ellipse(f.x,f.y+.05,.8,.33,0,0,Math.PI*2);ctx.stroke();
  {const tf=MOTION.includes(f.char)&&assets['motion-'+f.char]?.naturalWidth>0?motionFrame(f):-1;for(const [i,g] of trails[f.team].entries())body(f,g.x,g.y,{alpha:g.life*1.6*(i/trails[f.team].length),sx:1.05,flash:.5,frame:tf});}
  // 강공격 기 모으기.
  if(f.state==='heavy'&&f.t>.12){const k=1-(f.t-.12)/Math.max(.01,f.total-.12);vfx.fx(ctx,'orb',f.x+f.fx*.5,f.y-1,1+k*1.6,{color:c.ink,alpha:.55+k*.4});vfx.fx(ctx,'ring',f.x,f.y-.9,3.2-k*1.8,{color:c.ink,alpha:.35+k*.4,rotation:clock*4});}
  const x=f.x+f.fx*lx,y=f.y-lift,hasMotion=MOTION.includes(f.char)&&assets['motion-'+f.char]?.naturalWidth>0,frame=hasMotion?motionFrame(f):-1;
  // 동작 그림이 있으면 자세는 그림이 맡고, 기울기는 조금만(구르기 회전은 그대로). 무기도 그림에 있어 따로 그리지 않는다.
  if(hasMotion&&f.state!=='dodge')rot*=.35;
  const behind=f.fy<-.3;if(behind&&!hasMotion)weapon(f,x,y);
  body(f,x,y,{sx,sy,rot,frame,flash:f.flash>0?f.flash/.14*.8:0});
  if(!behind&&!hasMotion)weapon(f,x,y);
  if(f.blocking){const a=Math.atan2(f.fy,f.fx),perfect=s.time-f.blockSince<=DUEL_RULES.parryWindow*c.parry;ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(f.x,f.y-.85);ctx.scale(1,.8);ctx.strokeStyle=perfect?'#fff6c8':c.ink;ctx.lineWidth=.18;ctx.beginPath();ctx.arc(0,0,1.1,a-1,a+1);ctx.stroke();ctx.lineWidth=.06;ctx.strokeStyle='#ffffffaa';ctx.stroke();ctx.restore();if(perfect)vfx.fx(ctx,'star',f.x+f.fx*1.1,f.y-.85+f.fy*.8,1.1,{color:'#fff6c8',alpha:.8});}
  if(f.counterShield>0&&f.shieldHits>0){const a=Math.atan2(f.fy,f.fx);ctx.save();ctx.translate(f.x,f.y-.85);ctx.scale(1,.8);ctx.strokeStyle=c.ink;ctx.lineWidth=.2;for(let k=0;k<f.shieldHits;k++){ctx.beginPath();ctx.arc(0,0,1.35,a-1+k*.65,a-.48+k*.65);ctx.stroke();}ctx.restore();}
  if(f.shield>0)vfx.fx(ctx,'ring',f.x,f.y-.85,2.8,{color:c.ink,alpha:.85,rotation:clock*2});
  if(['broken','stagger','jailed'].includes(f.state)){for(let i=0;i<3;i++){const a=clock*5+i*2.1;vfx.fx(ctx,'star',f.x+Math.cos(a)*.55,f.y-2.3+Math.sin(a)*.16,.55,{color:'#ffe08a',alpha:.9});}}
  if(f.state==='jailed')vfx.fx(ctx,'sigil',f.x,f.y-.95,2.6,{color:c.ink,alpha:.7,rotation:clock});
 }
 // 캐릭터마다 다른 무기. 평타는 1타·2타가 반대 방향으로 휘두르고 3타는 크게, 창은 찌른다.
 function weaponPose(f){
  const a=Math.atan2(f.fy,f.fx);if(!f.total||f.t<=0||!['attack','heavy'].includes(f.state))return {a:a+.9*(f.fx<0?-1:1),reach:0,active:false};
  const phase=1-f.t/f.total,hp=f.state==='attack'?1-f.hitAt/f.total:1-.12/f.total,side=f.state==='attack'&&f.step===1?-1:1;
  if(f.char==='pierce'){const k=phase<hp?-.35*(phase/hp):Math.max(0,1-(phase-hp)/(1-hp)*1.4);return {a,reach:k,active:phase>=hp};}
  const from=-1.35*side,to=1.2*side,k=phase<hp?(phase/hp):1,ang=phase<hp?from*(0.4+.6*k):to-(to-from)*.1*((phase-hp)/(1-hp));return {a:a+ang,reach:.2,active:phase>=hp};
 }
 function weapon(f,x,y){
  const c=DUEL_CHARACTERS[f.char],w=weaponPose(f),hx=x+Math.cos(w.a)*.55,hy=y-.85+Math.sin(w.a)*.4,ca=Math.cos(w.a),sa=Math.sin(w.a);
  if(f.char==='pierce'){const len=1.9+w.reach*1.3,bx=hx-ca*.5,by=hy-sa*.5,tx=hx+ca*len,ty=hy+sa*len*.8;ctx.save();ctx.lineCap='round';ctx.strokeStyle='#5a4128';ctx.lineWidth=.13;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(tx,ty);ctx.stroke();ctx.strokeStyle='#d9c79a';ctx.lineWidth=.06;ctx.stroke();ctx.translate(tx,ty);ctx.rotate(Math.atan2(ty-by,tx-bx));ctx.fillStyle='#e9fbff';ctx.strokeStyle=c.ink;ctx.lineWidth=.05;ctx.beginPath();ctx.moveTo(.55,0);ctx.lineTo(-.05,-.17);ctx.lineTo(0,0);ctx.lineTo(-.05,.17);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();if(w.active&&w.reach>.3)vfx.beam(ctx,'trail',hx,hy,tx+ca*.4,ty+sa*.3,.55,{color:c.ink,alpha:.7*w.reach});return;}
  if(f.char==='burst'){vfx.fx(ctx,'flame',hx,hy-.15,.9+(w.active?.5:0)+.08*Math.sin(clock*22),{color:'#ffaa65',alpha:.95});vfx.fx(ctx,'orb',hx,hy,.55,{color:'#ffe0a0',alpha:.8});return;}
  if(f.char==='reflect'){const bl=1.25;vfx.fx(ctx,'shard',hx+ca*bl*.45,hy+sa*bl*.36,bl,{color:c.ink,alpha:.95,rotation:w.a+Math.PI/4});return;}
  if(f.char==='split'){for(const o of [-.35,.35])vfx.fx(ctx,'petal',hx+Math.cos(w.a+o)*.35,hy+Math.sin(w.a+o)*.28,.75+(w.active?.25:0),{color:c.ink,alpha:.95,rotation:clock*3+o*4});return;}
  if(f.char==='chain'){vfx.fx(ctx,'orb',hx,hy,.6,{color:c.ink,alpha:.9});vfx.beam(ctx,'lightning',hx,hy,hx+Math.cos(w.a)*(w.active?1.5:.8),hy+Math.sin(w.a)*(w.active?1.2:.6)-.2,.45,{color:c.ink,alpha:.55+.35*Math.abs(Math.sin(clock*30))});return;}
  if(f.char==='recall'){if(s.shots.some(q=>q.owner===f.team&&q.kind==='blade'))return;vfx.fx(ctx,'crescent',hx+ca*.35,hy+sa*.28,1.25,{color:c.ink,alpha:.95,rotation:w.a+Math.PI/2});return;}
  if(f.char==='orbit'){for(let k=0;k<3;k++){const a=clock*4+k*Math.PI*2/3;vfx.fx(ctx,'orb',x+Math.cos(a)*.95,y-.8+Math.sin(a)*.55,.5,{color:c.ink,alpha:.9});}return;}
  if(f.char==='frost'){vfx.fx(ctx,'shard',hx+ca*.4,hy+sa*.3,1.15,{color:c.ink,alpha:.95,rotation:w.a+Math.PI/4});vfx.fx(ctx,'mist',hx,hy,.9,{color:c.ink,alpha:.35});return;}
  if(f.char==='gravity'){vfx.fx(ctx,'orb',hx,hy,.75,{color:c.ink,alpha:.95});vfx.fx(ctx,'ring',hx,hy,1.05,{color:c.ink,alpha:.6,rotation:clock*6});}
 }
 // ── 효과
 function arcSlash(e,t,{r,width,side=1,spread=1.2,ink,core='#ffffff'}){
  const grow=Math.min(1,t/.35),fade=1-Math.max(0,(t-.3)/.7),a0=e.angle-spread*side,a1=a0+spread*2*side*grow;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(e.x,e.y-.8);ctx.scale(1,.78);ctx.lineCap='round';
  ctx.globalAlpha=.45*fade;ctx.strokeStyle=ink;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,r*.9,a0,a1,side<0);ctx.stroke();
  ctx.globalAlpha=.9*fade;ctx.lineWidth=width*.28;ctx.strokeStyle=core;ctx.beginPath();ctx.arc(0,0,r,a0,a1,side<0);ctx.stroke();ctx.restore();
  vfx.fx(ctx,'crescent',e.x+Math.cos(e.angle)*r*.55,e.y-.8+Math.sin(e.angle)*r*.43,r*1.25,{color:ink,alpha:.85*fade,rotation:e.angle+(side<0?Math.PI:0)});
 }
 function effect(e){const t=1-e.life/e.max,ink=e.ink||'#fce6af',fade=1-t;
  if(e.type==='swing'){const side=e.step===1?-1:1,big=e.step===2;
   if(e.char==='comet'){const len=e.r*(big?1.2:1);vfx.beam(ctx,'trail',e.x,e.y-.8,e.x+Math.cos(e.angle)*len,e.y-.8+Math.sin(e.angle)*len*.78,.5,{color:ink,alpha:fade});vfx.fx(ctx,'shard',e.x+Math.cos(e.angle)*len,e.y-.8+Math.sin(e.angle)*len*.78,.85,{color:ink,alpha:fade,rotation:e.angle});return;}
   if(e.char==='pierce'){const len=e.r*(big?1.25:1),tx=e.x+Math.cos(e.angle)*len,ty=e.y-.8+Math.sin(e.angle)*len*.78;vfx.beam(ctx,'trail',e.x+Math.cos(e.angle)*.4,e.y-.8,tx,ty,big?.9:.6,{color:ink,alpha:fade});vfx.fx(ctx,'star',tx,ty,(big?1.6:1)*(1-t*.5),{color:'#ffffff',alpha:fade});if(big)for(const o of [-.25,.25])vfx.beam(ctx,'trail',e.x,e.y-.8,e.x+Math.cos(e.angle+o)*len*.8,e.y-.8+Math.sin(e.angle+o)*len*.6,.4,{color:ink,alpha:fade*.6});return;}
   arcSlash(e,t,{r:e.r*(big?1.1:.95),width:big?.7:.45,side,spread:big?1.5:1.1,ink});
   if(e.char==='burst')for(let i=0;i<(big?5:3);i++){const a=e.angle+(i/(big?4:2)-.5)*1.6*side;vfx.fx(ctx,'flame',e.x+Math.cos(a)*e.r*(.6+t*.4),e.y-.9+Math.sin(a)*e.r*.5,.9*fade,{color:'#ffaa65',alpha:fade});}
   if(e.char==='reflect')for(let i=0;i<(big?5:3);i++){const a=e.angle+(i/(big?4:2)-.5)*1.4*side;vfx.fx(ctx,'shard',e.x+Math.cos(a)*e.r*(.5+t*.7),e.y-.85+Math.sin(a)*e.r*(.4+t*.5),.7*fade,{color:ink,alpha:fade,rotation:a});}
   if(e.char==='gravity'){vfx.fx(ctx,'ring',e.x+Math.cos(e.angle)*e.r*.7,e.y-.8+Math.sin(e.angle)*e.r*.5,(big?2.4:1.6)*(1-t*.6),{color:ink,alpha:fade,rotation:clock*8});}
   if(e.char==='split')for(let i=0;i<(big?6:3);i++){const a=e.angle+(i/(big?5:2)-.5)*1.7*side;vfx.fx(ctx,'petal',e.x+Math.cos(a)*e.r*(.5+t*.8),e.y-.85+Math.sin(a)*e.r*(.4+t*.6),.7*fade,{color:ink,alpha:fade,rotation:a+t*6});}
   if(e.char==='chain'){const a=e.angle+side*.9*(1-t),tx=e.x+Math.cos(a)*e.r,ty=e.y-.8+Math.sin(a)*e.r*.78;vfx.beam(ctx,'lightning',e.x,e.y-.8,tx,ty,.7,{color:ink,alpha:fade});}
   if(e.char==='recall')vfx.fx(ctx,'crescent',e.x+Math.cos(e.angle)*e.r*.7,e.y-.8+Math.sin(e.angle)*e.r*.55,(big?2:1.4)*(1-t*.3),{color:'#ffffff',alpha:fade*.7,rotation:e.angle+t*4*side});
   if(e.char==='orbit')vfx.fx(ctx,'ring',e.x,e.y-.8,(big?3:2.2)*(.6+t*.5),{color:ink,alpha:fade*.8,rotation:clock*5});
   if(e.char==='frost')for(let i=0;i<3;i++){const a=e.angle+(i-1)*.5*side;vfx.fx(ctx,'mist',e.x+Math.cos(a)*e.r*(.6+t*.5),e.y-.8+Math.sin(a)*e.r*.5,1.1,{color:ink,alpha:fade*.6});}
   if(NEW_DUEL.includes(e.char))for(let i=0;i<3;i++){const a=e.angle+(i-1)*.5,shape={thorn:'petal',gale:'crescent',bastion:'shard',lotus:'petal',prism:'shard'}[e.char]||'star';vfx.fx(ctx,shape,e.x+Math.cos(a)*e.r*(.55+t*.35),e.y-.8+Math.sin(a)*e.r*.5,.65*fade,{color:ink,alpha:fade,rotation:a+t*2});}
   if(big)vfx.fx(ctx,'shock',e.x+Math.cos(e.angle)*e.r*.8,e.y-.6+Math.sin(e.angle)*e.r*.6,1+t*2.4,{color:ink,alpha:fade*.8});return;}
  if(e.type==='heavySwing'){const fx=e.x+Math.cos(e.angle)*e.r*.8,fy=e.y-.6+Math.sin(e.angle)*e.r*.6;
   if(e.char==='pierce'){const len=e.r*1.6;vfx.beam(ctx,'trail',e.x,e.y-.8,e.x+Math.cos(e.angle)*len,e.y-.8+Math.sin(e.angle)*len*.78,1.3,{color:ink,alpha:fade});vfx.beam(ctx,'lightning',e.x,e.y-.8,e.x+Math.cos(e.angle)*len,e.y-.8+Math.sin(e.angle)*len*.78,.8,{color:'#ffffff',alpha:fade*.7});}
   else arcSlash(e,t,{r:e.r*1.15,width:1,side:1,spread:1.7,ink});
   vfx.fx(ctx,'shock',fx,fy,1.2+t*3.6,{color:ink,alpha:fade});vfx.fx(ctx,'flecks',fx,fy-.2,1.5+t*2.4,{color:'#ffffff',alpha:fade});
   if(e.char==='burst')vfx.fx(ctx,'flame',fx,fy-.4,2.4*fade+.6,{color:'#ffaa65',alpha:fade});
   if(e.char==='gravity')vfx.fx(ctx,'ring',fx,fy,3.2*(1-t)+.4,{color:ink,alpha:fade,rotation:-clock*6});
   if(e.char==='split')for(let i=0;i<8;i++){const a=i/8*Math.PI*2+t;vfx.fx(ctx,'petal',fx+Math.cos(a)*t*2.2,fy+Math.sin(a)*t*1.5,.8*fade,{color:ink,alpha:fade,rotation:a});}
   if(e.char==='chain')for(let i=0;i<3;i++){const a=i/3*Math.PI*2+t*3;vfx.beam(ctx,'lightning',fx,fy,fx+Math.cos(a)*2,fy+Math.sin(a)*1.4,.6,{color:ink,alpha:fade});}
   if(e.char==='recall')vfx.fx(ctx,'crescent',fx,fy-.2,2.6*(1-t*.4),{color:ink,alpha:fade,rotation:t*8});
   if(e.char==='orbit')vfx.fx(ctx,'ring',fx,fy,1+t*3,{color:ink,alpha:fade,rotation:clock*6});
   if(e.char==='frost')for(let i=0;i<5;i++){const a=i/5*Math.PI*2;vfx.fx(ctx,'shard',fx+Math.cos(a)*t*1.6,fy+Math.sin(a)*t*1.1,.8*fade,{color:ink,alpha:fade,rotation:a});}
   if(e.char==='reflect')for(let i=0;i<6;i++){const a=i/6*Math.PI*2;vfx.fx(ctx,'shard',fx+Math.cos(a)*t*2,fy+Math.sin(a)*t*1.4,.8*fade,{color:ink,alpha:fade,rotation:a});}
   if(e.linked)vfx.fx(ctx,'star',fx,fy-.3,2.4*fade,{color:'#ffd36b',alpha:fade});return;}
  if(e.type==='bolt'){vfx.beam(ctx,'lightning',e.fromX,e.fromY-.9,e.x,e.y-.8,1,{color:ink,alpha:fade});vfx.fx(ctx,'star',e.x,e.y-.8,1.8*fade,{color:'#fffbe0',alpha:fade});return;}
  if(e.type==='breath'){for(let i=0;i<7;i++){const k=i/6,a=e.angle+(k-.5)*1.1,r=e.r*(.35+.65*Math.min(1,t*2.2))*(.6+.4*Math.abs(Math.sin(i*1.7)));vfx.fx(ctx,i%2?'mist':'shard',e.x+Math.cos(a)*r,e.y-.8+Math.sin(a)*r*.7,i%2?1.5:.7,{color:ink,alpha:fade*.8,rotation:a});}return;}
  const kind={hit:'hit',heavy:'burst',block:'reflect',parry:'sunburst',guardBreak:'core',boom:'explosion',pull:'well',ult:'sunburst',jail:'portal',shield:'pulse',miss:'muzzle'}[e.type]||'hit';
  if(e.type==='hit'||e.type==='heavy'){const heavy=e.type==='heavy';vfx.fx(ctx,'star',e.x,e.y-.9,(heavy?2.6:1.7)*(1-t*.6),{color:'#ffffff',alpha:fade});vfx.fx(ctx,'flecks',e.x,e.y-.9,(heavy?2.6:1.6)*(.6+t),{color:ink,alpha:fade});if(heavy)vfx.fx(ctx,'shock',e.x,e.y-.7,1+t*2.8,{color:ink,alpha:fade});}
  else vfx.effect(ctx,{kind,x:e.x,y:e.y-.7,radius:e.r?e.r*.6:e.type==='guardBreak'?1.3:.9,law:''},t,e.type==='guardBreak'?'#ff7a66':ink,.6);
  if(e.type==='guardBreak'){vfx.fx(ctx,'shock',e.x,e.y-.7,1.4+t*3.4,{color:'#ff7a66',alpha:fade});for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3;vfx.fx(ctx,'shard',e.x+Math.cos(a)*t*1.8,e.y-.9+Math.sin(a)*t*1.2,.7*fade,{color:'#9ccfe8',alpha:fade,rotation:a});}}
  if(e.type==='parry')vfx.fx(ctx,'sigil',e.x,e.y-.9,2.4*(1-t*.3),{color:'#fff1b9',alpha:fade,rotation:t*2});
  if(e.text&&t<.85){const z=t<.1?1.5-t*5:1;ctx.save();ctx.globalAlpha=Math.min(1,fade*1.6);ctx.translate(e.x+.3,e.y-2.3-t*.9);ctx.scale(z,z);ctx.font=`bold ${e.type==='heavy'?.85:.62}px Georgia`;ctx.textAlign='center';ctx.lineWidth=.13;ctx.strokeStyle='#18242a';ctx.fillStyle=e.type==='heavy'?'#ffd36b':'#fff0cf';ctx.strokeText(e.text,0,0);ctx.fillText(e.text,0,0);ctx.restore();}
 }
 // 로컬 점검용(?inspect): 화면이 숨겨져 있어도 몇 초씩 진행해 보고 그린다.
 if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('inspect')){root.seedDuelState=()=>s;root.seedDuelPress=a=>press(a);root.seedDuelHold=(on)=>{if(on)held.add('block');else held.delete('block');};root.seedDuelInput=()=>input();root.seedDuelAdvance=(seconds,inputs={})=>{for(let t=0;t<seconds&&s&&s.phase!=='over';t+=1/60){const i=typeof inputs==='function'?inputs(t):inputs;stepDuel(s,1/60,i,enemyInput(1/60));drillEvents(s.events);s.events.length=0;clock+=1/60;camera(1/60);}s.events.length=0;draw(1/60);hud();return s;};}
 listen(window,'resize',resize);resize();select();
 return {close};
}
