import {ALL_FORMS,GENERATED_FORMS,SECOND_FORMS,AWAKEN_FORMS,TWIN_FORMS} from './forms.js';
import {LAWS} from './laws.js';
import {activeUltimateEvolutions} from './evolution-family.js';

// One active button, three states, all derived from the evolutions the seed holds:
// LOCKED (no evolution) · SIGNATURE (one: that evolution's own move) · OVERDRIVE (two or more: the two strongest together).
// Numbers here are first-pass values meant to be tuned; they all live in ACTIVE.
export const ACTIVE=Object.freeze({
 max:100,
 kill:1,            // a whole crowd is required; fast-clearing builds no longer loop ultimates
 eliteKill:6,       // elite, shield and turret kills
 bossShare:30,      // a whole boss health bar contributes less than a third of the gauge
 cooldownSeconds:20,// post-use lock prevents a screen clear from paying for the next ultimate
 signatureSeconds:3,
 overdriveSeconds:4.5,
 finaleDamage:100, // raised from 60 with SURGE_DAMAGE so the closing blast finishes what the overdrive started
 finaleRadius:4.2,
 maxArcs:6,
 maxEchoes:2
});

const ALL_LAW_TAGS=Object.freeze({reflect:'BOUNCE',split:'MULTI',chain:'LINK',orbit:'ORBIT',pierce:'PIERCE',burst:'EXPLOSION',recall:'RETURN',gravity:'CONTROL',frost:'FROST',portal:'RIFT'});
export const TAG_NAMES=Object.freeze({BOUNCE:'튕김',MULTI:'분열',LINK:'연결',ORBIT:'공전',PIERCE:'관통',EXPLOSION:'폭발',RETURN:'귀환',CONTROL:'끌림',FROST:'서리',RIFT:'차원'});
export const STATE_NAMES=Object.freeze({LOCKED:'잠김',SIGNATURE:'시그니처',OVERDRIVE:'오버드라이브'});

// A small set of reusable ultimate skeletons. The build selects one from its
// law tags; visuals and themes can style the skeleton without 990 bespoke VFX.
export const ULTIMATE_ARCHETYPES=Object.freeze({
 BURST:Object.freeze({id:'BURST',name:'폭발',desc:'중심에서 힘을 모아 한 번에 터뜨립니다.'}),
 RAIN:Object.freeze({id:'RAIN',name:'낙하',desc:'여러 표적과 경로 위로 연속 공격을 쏟아붓습니다.'}),
 ORBIT:Object.freeze({id:'ORBIT',name:'성환',desc:'씨앗 둘레의 궤도가 넓어지며 전장을 휩씁니다.'}),
 BEAM:Object.freeze({id:'BEAM',name:'광선',desc:'한 축에 힘을 모아 깊고 길게 관통합니다.'}),
 DOMAIN:Object.freeze({id:'DOMAIN',name:'영역',desc:'넓은 공간을 법칙의 장으로 바꿉니다.'}),
 BLACKHOLE:Object.freeze({id:'BLACKHOLE',name:'특이점',desc:'적을 중심으로 끌어들인 뒤 압축해 붕괴시킵니다.'}),
 TIME_STOP:Object.freeze({id:'TIME_STOP',name:'시간 정지',desc:'주변의 움직임을 묶고 멈춘 순간을 깨뜨립니다.'})
});

export function ultimateArchetype(ids=[]){
 const tags=overdriveTags(ids);
 if(tags.includes('CONTROL'))return ULTIMATE_ARCHETYPES.BLACKHOLE;
 if(tags.includes('FROST'))return ULTIMATE_ARCHETYPES.TIME_STOP;
 if(tags.includes('RIFT'))return ULTIMATE_ARCHETYPES.DOMAIN;
 if(tags.includes('PIERCE'))return ULTIMATE_ARCHETYPES.BEAM;
 if(tags.includes('ORBIT'))return ULTIMATE_ARCHETYPES.ORBIT;
 if(tags.includes('LINK')||tags.includes('MULTI'))return ULTIMATE_ARCHETYPES.RAIN;
 return ULTIMATE_ARCHETYPES.BURST;
}

// Each evolution's signature: an opening move the moment it fires, then a few seconds of its stronger self.
const sig=(name,desc)=>Object.freeze({name,desc});
const BASE_SIGNATURES=Object.freeze({
 collapse:sig('사건의 지평','가까운 적 셋의 자리에 붕괴 우물을 한꺼번에 심고, 붕괴 씨앗을 두 배로 쏩니다.'),
 frostguard:sig('절대 영도','넓은 냉기를 즉시 터뜨려 주변을 오래 얼리고, 위성이 늘어 냉기가 쉴 새 없이 터집니다.'),
 returnblade:sig('칼날 폭풍','여덟 방향으로 칼날을 던지고, 돌아오는 칼날 수와 타격이 늘어납니다.'),
 prism:sig('만화경','열두 방향으로 수정 가시를 흩뿌리고, 가시가 한 번 더 갈라집니다.'),
 thunderlance:sig('뇌신의 창','부채꼴로 천둥 창 다섯 자루를 한꺼번에 던지고, 번개가 더 멀리 뜁니다.'),
 frostbloom:sig('빙하 개화','가까운 적 여섯에게 봉오리를 떨어뜨리고, 얼음이 두 배 빨리 부서집니다.'),
 stormcrown:sig('번개 폭우','주변의 모든 적에게 번개를 내리꽂고, 구슬이 늘어 훨씬 자주 칩니다.'),
 tidepull:sig('대조류','네 방향으로 귀환 해일을 보내 사방의 적을 왕복 경로에 휩쓸어옵니다.'),
 seedstorm:sig('씨앗 해일','씨앗을 한 바퀴 둥글게 흩뿌리고, 부채꼴 씨앗이 늘어납니다.'),
 mirrorguard:sig('거울 성채','날아오는 적 탄환(문지기 탄 제외)을 모두 되받아치고, 늘어난 거울마다 0.8초마다 빛 조각을 쏩니다.'),
 // 2026-09-21 1묶음
 icicle:sig('빙하의 창','가까운 적 넷에게 고드름 창을 동시에 박고, 남은 서리 표식을 한꺼번에 깨뜨립니다.'),
 halobloom:sig('만개','고리를 즉시 만개시켜 꽃잎을 사방으로 흩뿌리고, 꽃잎이 훨씬 빨리 다시 자랍니다.'),
 frostnet:sig('설원 결계','가까운 적 셋에서 그물을 동시에 시작해 바닥을 서리 선으로 덮습니다.'),
 rewindbolt:sig('시간 되감기','가까운 적 셋의 번개 길을 이동 없이 곧바로 되감아 겹쳐 흘립니다.'),
 refractlance:sig('굴절 폭풍','부채꼴로 굴절 창 다섯 자루를 던져 벽마다 꺾인 경로를 겹칩니다.'),
 gravitymirror:sig('중력 만화경','여섯 방향으로 중력 거울을 펼쳐 벽마다 적을 끌어당기고 연속 압축 폭발을 만듭니다.'),
 chainburst:sig('낙뢰 기폭','가까운 적 넷에서 연쇄 폭발을 동시에 시작해 전장의 끝점들을 차례로 터뜨립니다.'),
 blastlance:sig('폭성우','부채꼴로 폭발 창 다섯 자루를 쏘아 관통 경로 끝마다 큰 폭발을 남깁니다.'),
 frostkaleidoscope:sig('빙경 파쇄','여덟 방향으로 충전된 서리 만화경을 펼쳐 첫 충돌부터 얼음 파쇄를 일으킵니다.'),
 lightningpetal:sig('천뢰 만개','여덟 방향으로 번개 꽃봉오리를 피워 전기 꽃잎과 후속 번개를 한꺼번에 번지게 합니다.'),
 returnflare:sig('불씨 회천','네 방향으로 귀환 불씨를 보내 바깥 폭발과 귀환 경로, 씨앗 곁의 마지막 폭발을 겹칩니다.'),
 comethalo:sig('혜성 개화','화관을 완전히 충전하고 여덟 방향으로 폭발 혜성을 쏘며, 잠시 동안 움직이지 않아도 충전이 줄지 않습니다.'),
 stormanchor:sig('천둥 정박','가까운 적 넷을 시작점으로 중력 닻을 연달아 박아 적을 끌어모으고 터뜨립니다.'),
 returningpetals:sig('회귀 만개','네 방향에서 꽃봉오리를 터뜨려 여러 귀환 꽃잎이 씨앗을 향해 휘어 돌아오게 합니다.'),
 gravitystake:sig('단일점 붕괴','가장 가까운 적 하나에 중력 말뚝 두 개를 차례로 박아 같은 지점을 연속으로 내파시킵니다.'),
 mirrormaze:sig('끝없는 복도','여섯 방향으로 거울탄을 쏘고, 모든 거울탄이 더 많이 튕깁니다.'),
 fullbloom:sig('꽃비','여섯 방향으로 꽃을 쏘고, 맞은 자리마다 꽃잎이 더 많이 퍼집니다.'),
 thunderweb:sig('번개 둥지','가까운 적 셋에게서 동시에 번개 그물이 시작되고, 더 멀리 뜁니다.'),
 starring:sig('초신성 고리','고리가 단숨에 가장 넓게 펼쳐져 두 배로 베고, 더 빨리 숨 쉽니다.'),
 glassspear:sig('유리 폭우','여섯 방향으로 창날을 쏘고, 더 길고 깊게 꿰뚫습니다.'),
 flarebloom:sig('불꽃 축제','가까운 적 넷에게 폭발을 떨어뜨리고, 불씨가 늘어납니다.'),
 rewind:sig('되감기 폭풍','네 방향으로 잎을 날리고, 모든 잎이 한 번 더 왕복합니다.'),
 blackhole:sig('특이점','씨앗 앞에 블랙홀 셋을 한꺼번에 열고, 더 오래 붙잡습니다.'),
 winterbreath:sig('빙하기','사방으로 서리를 내뿜고, 숨결이 더 멀고 넓어집니다.'),
 riftseed:sig('별문 개방','네 방향으로 차원탄을 쏘고, 네 개의 별문이 동시에 열려 뒷줄을 덮칩니다.')
});
const ALL_SIGNATURES=Object.freeze({
 ...BASE_SIGNATURES,
 ...Object.fromEntries(Object.values(GENERATED_FORMS).map(f=>[f.id,sig(`${f.name} · 개문`,`${f.name}의 핵심 탄을 양쪽으로 펼치고, 잠시 동안 더 자주 쏘며 깊게 관통합니다.`)])),
 ...Object.fromEntries(Object.values(SECOND_FORMS).map(f=>[f.id,sig(`${f.name} · ${f.family==='resonance'?'공명 폭주':'교차 붕괴'}`,f.family==='resonance'?'모든 적중을 공명 주기로 세어 세 번째 탄마다 두 후속 법칙을 함께 증폭합니다.':'표식과 소비 탄을 빠르게 번갈아 쏘고, 교차 폭발 피해와 법칙 반응을 강화합니다.')])),
 // Awakened evolutions keep their fusion's opening move and repeat it every 1.2 seconds while the ultimate lasts.
 ...Object.fromEntries(Object.values(AWAKEN_FORMS).map(f=>[f.id,sig(`각성 ${BASE_SIGNATURES[f.base].name}`,`${BASE_SIGNATURES[f.base].desc} 궁극기 동안 이 기술이 1.2초마다 되풀이됩니다.`)])),
 // Twin awakenings open with both solo moves at once and repeat them every 1.5 seconds while the ultimate lasts.
 ...Object.fromEntries(Object.values(TWIN_FORMS).map(f=>[f.id,sig(`${BASE_SIGNATURES[f.parts[0]].name} × ${BASE_SIGNATURES[f.parts[1]].name}`,`두 기술을 한꺼번에 펼칩니다. ${BASE_SIGNATURES[f.parts[0]].name}: ${BASE_SIGNATURES[f.parts[0]].desc} ${BASE_SIGNATURES[f.parts[1]].name}: ${BASE_SIGNATURES[f.parts[1]].desc} 궁극기 동안 1.5초마다 되풀이됩니다.`)]))
});
// 숨긴 법칙(차원)·자동 조합·재융합의 기술은 정의만 남기고, 게임에 보이는 법칙과 진화만 내보낸다.
export const LAW_TAGS=Object.freeze(Object.fromEntries(Object.entries(ALL_LAW_TAGS).filter(([id])=>Object.hasOwn(LAWS,id))));
export const SIGNATURES=Object.freeze(Object.fromEntries(Object.entries(ALL_SIGNATURES).filter(([id])=>Object.hasOwn(ALL_FORMS,id))));

// The two strongest evolutions decide the active. Ties go to the evolution gained first (map order).
export function activeState(forms=new Map()){
 const held=activeUltimateEvolutions(forms,ALL_FORMS,2);
 const state=held.length===0?'LOCKED':held.length===1?'SIGNATURE':'OVERDRIVE';
 return {state,forms:held.map(h=>h.id),level:held.reduce((n,h)=>n+h.level,0)};
}

// Tags of every law inside the chosen evolutions, each tag once, in a stable order.
export function overdriveTags(ids=[]){
 const out=[];
 for(const id of ids)for(const law of ALL_FORMS[id]?.requires||[]){const tag=LAW_TAGS[law];if(tag&&!out.includes(tag))out.push(tag);}
 return out;
}

// When an overdrive ends, the tag union becomes one closing blast around the seed. Every count is bounded.
export function overdriveFinale(tags=[],level=2){
 const has=tag=>tags.includes(tag);
 const damage=ACTIVE.finaleDamage*(1+.15*Math.max(0,level-2));
 const radius=ACTIVE.finaleRadius+(has('EXPLOSION')?1.4:0)+(has('ORBIT')?.6:0);
 const echoes=Math.min(ACTIVE.maxEchoes,(has('BOUNCE')?1:0)+(has('RETURN')?1:0));
 const out={tags:[...tags],damage,radius,hits:has('MULTI')?2:1,arcs:has('LINK')?ACTIVE.maxArcs:0,pull:has('CONTROL')?3.5:0,slow:has('FROST')?3:0,bossScale:has('PIERCE')?1.25:1,ignoreShields:has('PIERCE'),rifts:has('RIFT')?3:0,echoes,echoScale:.6};
 const lines=[`반경 ${radius.toFixed(1)} 폭발 · 피해 ${Math.round(damage)}`];
 if(out.pull)lines.push('터지기 전에 주변 적을 끌어옴');
 if(out.hits>1)lines.push('한 번 더 갈라져 절반 피해');
 if(out.arcs)lines.push(`바깥 적 ${out.arcs}명에게 번개`);
 if(out.slow)lines.push(`${out.slow}초 동안 얼림`);
 if(out.ignoreShields)lines.push('방패를 뚫고 보스에게 +25%');
 if(out.rifts)lines.push(`멀리 있는 적에게 별문 낙뢰 ${out.rifts}회`);
 if(echoes)lines.push(`메아리 폭발 ${echoes}번(60%)`);
 out.lines=lines;
 return out;
}

// The gauge. It does not fill while an active is running, so an active can never pay for the next one.
export function createActiveGauge(value=0,cooldown=0){return {value:clampGauge(value),plan:null,cooldown:clampActiveCooldown(cooldown)};}
export const clampGauge=v=>Number.isFinite(v)?Math.max(0,Math.min(ACTIVE.max,v)):0;
export const clampActiveCooldown=v=>Number.isFinite(v)?Math.max(0,Math.min(ACTIVE.cooldownSeconds,v)):0;
export const validActiveGauge=v=>v===undefined||(Number.isFinite(v)&&v>=0&&v<=ACTIVE.max);
export const validActiveCooldown=v=>v===undefined||(Number.isFinite(v)&&v>=0&&v<=ACTIVE.cooldownSeconds);
export function chargeActive(gauge,amount){
 if(gauge.plan||gauge.cooldown>0||!(amount>0))return gauge.value;
 gauge.value=clampGauge(gauge.value+amount);return gauge.value;
}
export function killCharge(enemy){
 if(!enemy)return 0;
 if(enemy.type==='warden'&&enemy.elite)return ACTIVE.eliteKill*2;
 if(enemy.type==='warden'||enemy.type==='austin')return 0; // bosses charge through damage instead (bossCharge)
 return enemy.type==='shield'||enemy.type==='turret'?ACTIVE.eliteKill:ACTIVE.kill;
}
export function bossCharge(amount,maxHp){return maxHp>0&&amount>0?Math.min(amount,maxHp)/maxHp*ACTIVE.bossShare:0;}
export function activeReady(gauge,forms){return !gauge.plan&&gauge.cooldown<=0&&gauge.value>=ACTIVE.max&&activeState(forms).state!=='LOCKED';}

export function startActive(gauge,forms){
 if(!activeReady(gauge,forms))return null;
 const s=activeState(forms),overdrive=s.state==='OVERDRIVE';
 const seconds=overdrive?ACTIVE.overdriveSeconds:ACTIVE.signatureSeconds;
 const tags=overdriveTags(s.forms);
 gauge.value=0;
 gauge.plan={state:s.state,forms:s.forms,seconds,time:seconds,tags,archetype:ultimateArchetype(s.forms).id,finale:overdrive?overdriveFinale(tags,s.level):null};
 return gauge.plan;
}
// Returns the finished plan on the frame it ends, otherwise null.
export function tickActive(gauge,dt,cooldownRate=1){
 if(!gauge.plan){gauge.cooldown=Math.max(0,gauge.cooldown-dt*Math.max(1,Number(cooldownRate)||1));return null;}
 gauge.plan.time-=dt;
 if(gauge.plan.time>0)return null;
 const done=gauge.plan;gauge.plan=null;gauge.cooldown=ACTIVE.cooldownSeconds;return done;
}
export function cancelActive(gauge){if(gauge.plan)gauge.cooldown=Math.max(gauge.cooldown,ACTIVE.cooldownSeconds);gauge.plan=null;}

// Text for the button and the pause sheet.
export function activeSummary(forms,gauge){
 const s=activeState(forms);
 if(s.state==='LOCKED')return {state:s.state,title:'궁극기 잠김',lines:['완성 진화나 단독 진화를 얻으면 열립니다']};
 if(s.state==='SIGNATURE'){const g=SIGNATURES[s.forms[0]],archetype=ultimateArchetype(s.forms);return {state:s.state,forms:s.forms,title:g.name,archetype:archetype.id,lines:[`${archetype.name}형 · ${archetype.desc}`,g.desc,`${ACTIVE.signatureSeconds}초 · 사용 뒤 ${ACTIVE.cooldownSeconds}초 안정화`]};}
 const tags=overdriveTags(s.forms),finale=overdriveFinale(tags,s.level);
 const archetype=ultimateArchetype(s.forms);
 return {state:s.state,forms:s.forms,title:`오버드라이브 · ${s.forms.map(id=>SIGNATURES[id].name).join(' + ')}`,archetype:archetype.id,
  lines:[`${archetype.name}형 · ${archetype.desc}`,`두 시그니처를 함께 ${ACTIVE.overdriveSeconds}초`,`공전 진화는 가장 강한 하나만 공명`,`사용 뒤 ${ACTIVE.cooldownSeconds}초 안정화`,`태그 ${tags.map(t=>TAG_NAMES[t]).join('·')}`,`끝날 때 ${finale.lines.join(' · ')}`],tags,finale,ready:gauge?activeReady(gauge,forms):false};
}
