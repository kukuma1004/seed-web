import {ALL_FORMS} from './forms.js';
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

export const LAW_TAGS=Object.freeze({reflect:'BOUNCE',split:'MULTI',chain:'LINK',orbit:'ORBIT',pierce:'PIERCE',burst:'EXPLOSION',recall:'RETURN',gravity:'CONTROL',frost:'FROST'});
export const TAG_NAMES=Object.freeze({BOUNCE:'튕김',MULTI:'분열',LINK:'연결',ORBIT:'공전',PIERCE:'관통',EXPLOSION:'폭발',RETURN:'귀환',CONTROL:'끌림',FROST:'서리'});
export const STATE_NAMES=Object.freeze({LOCKED:'잠김',SIGNATURE:'시그니처',OVERDRIVE:'오버드라이브'});

// Each evolution's signature: an opening move the moment it fires, then a few seconds of its stronger self.
const sig=(name,desc)=>Object.freeze({name,desc});
export const SIGNATURES=Object.freeze({
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
 mirrormaze:sig('끝없는 복도','여섯 방향으로 거울탄을 쏘고, 모든 거울탄이 더 많이 튕깁니다.'),
 fullbloom:sig('꽃비','여섯 방향으로 꽃을 쏘고, 맞은 자리마다 꽃잎이 더 많이 퍼집니다.'),
 thunderweb:sig('번개 둥지','가까운 적 셋에게서 동시에 번개 그물이 시작되고, 더 멀리 뜁니다.'),
 starring:sig('초신성 고리','고리가 단숨에 가장 넓게 펼쳐져 두 배로 베고, 더 빨리 숨 쉽니다.'),
 glassspear:sig('유리 폭우','여섯 방향으로 창날을 쏘고, 더 길고 깊게 꿰뚫습니다.'),
 flarebloom:sig('불꽃 축제','가까운 적 넷에게 폭발을 떨어뜨리고, 불씨가 늘어납니다.'),
 rewind:sig('되감기 폭풍','네 방향으로 잎을 날리고, 모든 잎이 한 번 더 왕복합니다.'),
 blackhole:sig('특이점','씨앗 앞에 블랙홀 셋을 한꺼번에 열고, 더 오래 붙잡습니다.'),
 winterbreath:sig('빙하기','사방으로 서리를 내뿜고, 숨결이 더 멀고 넓어집니다.')
});

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
 const out={tags:[...tags],damage,radius,hits:has('MULTI')?2:1,arcs:has('LINK')?ACTIVE.maxArcs:0,pull:has('CONTROL')?3.5:0,slow:has('FROST')?3:0,bossScale:has('PIERCE')?1.25:1,ignoreShields:has('PIERCE'),echoes,echoScale:.6};
 const lines=[`반경 ${radius.toFixed(1)} 폭발 · 피해 ${Math.round(damage)}`];
 if(out.pull)lines.push('터지기 전에 주변 적을 끌어옴');
 if(out.hits>1)lines.push('한 번 더 갈라져 절반 피해');
 if(out.arcs)lines.push(`바깥 적 ${out.arcs}명에게 번개`);
 if(out.slow)lines.push(`${out.slow}초 동안 얼림`);
 if(out.ignoreShields)lines.push('방패를 뚫고 보스에게 +25%');
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
 const tags=overdrive?overdriveTags(s.forms):[];
 gauge.value=0;
 gauge.plan={state:s.state,forms:s.forms,seconds,time:seconds,tags,finale:overdrive?overdriveFinale(tags,s.level):null};
 return gauge.plan;
}
// Returns the finished plan on the frame it ends, otherwise null.
export function tickActive(gauge,dt){
 if(!gauge.plan){gauge.cooldown=Math.max(0,gauge.cooldown-dt);return null;}
 gauge.plan.time-=dt;
 if(gauge.plan.time>0)return null;
 const done=gauge.plan;gauge.plan=null;gauge.cooldown=ACTIVE.cooldownSeconds;return done;
}
export function cancelActive(gauge){if(gauge.plan)gauge.cooldown=Math.max(gauge.cooldown,ACTIVE.cooldownSeconds);gauge.plan=null;}

// Text for the button and the pause sheet.
export function activeSummary(forms,gauge){
 const s=activeState(forms);
 if(s.state==='LOCKED')return {state:s.state,title:'궁극기 잠김',lines:['완성 진화나 단독 진화를 얻으면 열립니다']};
 if(s.state==='SIGNATURE'){const g=SIGNATURES[s.forms[0]];return {state:s.state,forms:s.forms,title:g.name,lines:[g.desc,`${ACTIVE.signatureSeconds}초 · 사용 뒤 ${ACTIVE.cooldownSeconds}초 안정화`]};}
 const tags=overdriveTags(s.forms),finale=overdriveFinale(tags,s.level);
 return {state:s.state,forms:s.forms,title:`오버드라이브 · ${s.forms.map(id=>SIGNATURES[id].name).join(' + ')}`,
  lines:[`두 시그니처를 함께 ${ACTIVE.overdriveSeconds}초`,`공전 진화는 가장 강한 하나만 공명`,`사용 뒤 ${ACTIVE.cooldownSeconds}초 안정화`,`태그 ${tags.map(t=>TAG_NAMES[t]).join('·')}`,`끝날 때 ${finale.lines.join(' · ')}`],tags,finale,ready:gauge?activeReady(gauge,forms):false};
}
