import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';

// The mirror is one bounded boss AI that translates a build into readable
// patterns. It never runs a second copy of the player's projectile simulation.
export const MIRROR_TRIAL_LIMITS=Object.freeze({
 concurrentAttackFamilies:2,
 // 2026-09-21: 부채꼴 7발(최대 세 공격 연계)이 중간에 잘리지 않게 올렸다. 분신 탄은 묶음으로 그려 드로콜이 늘지 않는다.
 hostileProjectilesLow:60,
 hostileProjectilesNormal:84,
 effectsLow:28,
 effectsNormal:44,
 copiedHealing:false,
 copiedRevive:false,
 copiedRelic:false
});

export const MIRROR_COPY_RULES=Object.freeze({
 mode:'exact-tower-build',
 copied:Object.freeze(['laws','forms','levels','dashEvolution','ultimate','projectileArt']),
 excluded:Object.freeze(['potions','relic','garden','titles']),
 sharesGlobalProjectileBudget:true
});

// Auto-fire remains SEED's basic rule. A near dodge is the player's offensive
// input: three clean passes crack the mirror and create a short burst window.
export const MIRROR_BREAK=Object.freeze({
 perfectDodgeWindow:.16,
 perfectDodgeRadius:.72,
 crackGoal:3,
 breakDuration:2.2,
 damageMultiplier:1.4,
 ultimateCharge:.12
});

export const MIRROR_ATTACK_CADENCE=Object.freeze({
 autoFire:true,
 manualAttackButton:false,
 baseCooldown:.9,
 minimumCooldown:.52,
 perfectDodgeRefund:.28,
 breakInstantReady:true,
 visibleReadyRing:true,
 mirrorUsesSameBaseCooldown:true
});

export function mirrorAttackCooldown(intervalScale=1){
 const scale=Math.max(.35,Math.min(2,Number(intervalScale)||1));
 return Math.max(MIRROR_ATTACK_CADENCE.minimumCooldown,MIRROR_ATTACK_CADENCE.baseCooldown*scale);
}

export function refundMirrorAttackCooldown(remaining,perfectDodges=1){
 const left=Math.max(0,Number(remaining)||0),count=Math.max(0,Math.floor(Number(perfectDodges)||0));
 return Math.max(0,left-MIRROR_ATTACK_CADENCE.perfectDodgeRefund*count);
}

// Open arenas stay the same size. Difficulty comes from movement decisions,
// not from squeezing the player into an increasingly tiny safe area.
export const MIRROR_MOVEMENT_PROFILES=Object.freeze({
 reflection:Object.freeze({name:'비친 새싹',desiredDistance:Object.freeze([4.3,7.4]),strafe:.7,reposition:.68,dash:true,feint:false}),
 duelist:Object.freeze({name:'거울 결투가',desiredDistance:Object.freeze([4,7]),strafe:.8,reposition:.58,dash:true,feint:false}),
 trickster:Object.freeze({name:'깨진 형상',desiredDistance:Object.freeze([3.7,6.7]),strafe:.88,reposition:.5,dash:true,feint:true}),
 apex:Object.freeze({name:'완성된 거울',desiredDistance:Object.freeze([3.4,6.3]),strafe:.96,reposition:.44,dash:true,feint:true})
});

export const MIRROR_TOWER=Object.freeze({
 name:'거울의 탑',
 milestoneFloors:Object.freeze([10,20,30,40,50,60,70,80,90,100]),
 endlessFrom:101,
 checkpointEvery:10,
 choiceEvery:1,
 arenaRadius:13,
 // The public ten-floor challenge should reward clean dodges rather than let
 // a player erase every mistake between floors. Milestones still provide one
 // meaningful recovery beat before the next behaviour tier.
 floorHeal:.08,
 milestoneHeal:.24
});

export const MIRROR_PATTERNS=Object.freeze({
 reflect:Object.freeze({id:'bank-shot',name:'거울 반사',tell:.58,commit:.76,recover:.46,projectiles:5}),
 split:Object.freeze({id:'petal-fan',name:'갈라지는 꽃',tell:.52,commit:.68,recover:.48,projectiles:7}),
 chain:Object.freeze({id:'marked-arc',name:'표식 번개',tell:.66,commit:.54,recover:.5,projectiles:4}),
 orbit:Object.freeze({id:'opening-halo',name:'열리는 고리',tell:.48,commit:1.05,recover:.62,projectiles:6}),
 pierce:Object.freeze({id:'lance-lane',name:'유리 창선',tell:.7,commit:.42,recover:.58,projectiles:3}),
 burst:Object.freeze({id:'delayed-bloom',name:'지연 폭화',tell:.62,commit:.58,recover:.5,projectiles:5}),
 recall:Object.freeze({id:'returning-path',name:'되돌아오는 길',tell:.5,commit:1.12,recover:.44,projectiles:4}),
 gravity:Object.freeze({id:'gravity-well',name:'중력 우물',tell:.72,commit:1.08,recover:.66,projectiles:3}),
 frost:Object.freeze({id:'frost-sector',name:'서리 부채',tell:.56,commit:.86,recover:.55,projectiles:5})
});

// 체감 난이도 층(2026-09-22 사용자: "조금 더 어렵게 — 지금 3층 난이도로 1층을 시작하자").
// 모든 층을 두 층 위의 난이도로 싸운다(1층 = 예전 3층). 위층은 기존 상한(체력·이동·공격 준비·한 발 피해)에 걸려 완만해진다.
// 층 번호·회복·기록·체크포인트는 진짜 층을 쓰고, 분신의 강함·행동 단계·탄속만 이 값을 쓴다.
export const MIRROR_DIFFICULTY_SHIFT=2;
export function mirrorDifficultyFloor(floor=1){return Math.max(1,Math.floor(Number(floor)||1))+MIRROR_DIFFICULTY_SHIFT;}
const entryList=value=>value instanceof Map?[...value]:Array.isArray(value)?value:Object.entries(value||{});
const levelOf=value=>Math.max(1,Math.min(99,Math.floor(Number(value)||1)));

export function mirrorBuildSnapshot({levels=new Map(),forms=new Map(),dashEvolution=null}={}){
 const laws=entryList(levels).filter(([id])=>LAWS[id]).map(([id,level])=>Object.freeze({id,level:levelOf(level)}));
 const evolved=entryList(forms).filter(([id])=>ALL_FORMS[id]).map(([id,level])=>{
  const form=ALL_FORMS[id];
  return Object.freeze({id,level:levelOf(level),laws:Object.freeze(form.requires.filter(law=>LAWS[law]))});
 });
 const dash=typeof dashEvolution==='string'&&dashEvolution?dashEvolution:null;
 return Object.freeze({laws:Object.freeze(laws),forms:Object.freeze(evolved),dashEvolution:dash});
}

export function mirrorCloneLoadout(snapshot){
 return Object.freeze({
  laws:Object.freeze((snapshot?.laws||[]).map(x=>Object.freeze({...x}))),
  forms:Object.freeze((snapshot?.forms||[]).map(x=>Object.freeze({...x,laws:Object.freeze([...(x.laws||[])])}))),
  dashEvolution:snapshot?.dashEvolution||null,
  ultimate:'same-build',
  exactCopy:true
 });
}

export function mirrorFloorRules(floor=1,{quality='normal'}={}){
 const n=Math.max(1,Math.floor(Number(floor)||1)),milestone=n%MIRROR_TOWER.checkpointEvery===0,d=mirrorDifficultyFloor(n),ascent=Math.min(9,Math.floor((n-1)/10));
 // Teach one behaviour at a time, then make the last four floors a real
 // mastery check instead of waiting until floor ten to reveal the feint.
 const tier=d<4?0:d<7?1:d<9?2:3;
 const movement=[MIRROR_MOVEMENT_PROFILES.reflection,MIRROR_MOVEMENT_PROFILES.duelist,MIRROR_MOVEMENT_PROFILES.trickster,MIRROR_MOVEMENT_PROFILES.apex][tier];
 const low=quality==='low';
 return Object.freeze({
  floor:n,
  difficulty:d,
  ascent,
  milestone,
  checkpoint:milestone,
  endless:n>=MIRROR_TOWER.endlessFrom,
  arena:Object.freeze({radius:MIRROR_TOWER.arenaRadius,solidObstacles:n<11?0:n<31?2:n<61?3:4,shrinks:false}),
  movement,
  concurrentAttackFamilies:d<3?1:MIRROR_TRIAL_LIMITS.concurrentAttackFamilies,
  chainLength:d<4?1:d<8?2:3,
  healAfter:milestone?MIRROR_TOWER.milestoneHeal:MIRROR_TOWER.floorHeal,
  budget:Object.freeze({
   hostileProjectiles:low?MIRROR_TRIAL_LIMITS.hostileProjectilesLow:MIRROR_TRIAL_LIMITS.hostileProjectilesNormal,
   effects:low?MIRROR_TRIAL_LIMITS.effectsLow:MIRROR_TRIAL_LIMITS.effectsNormal
  })
 });
}

export function mirrorPatternPlan(snapshot,{floor,round=1,quality='normal'}={}){
 const weight=new Map(Object.keys(LAWS).map(id=>[id,0]));
 for(const law of snapshot?.laws||[])weight.set(law.id,(weight.get(law.id)||0)+1+Math.min(2.4,law.level*.2));
 for(const form of snapshot?.forms||[])for(const law of form.laws||[])weight.set(law,(weight.get(law)||0)+2+Math.min(2.8,form.level*.18));
 let ordered=[...weight].filter(([law,score])=>score>0&&MIRROR_PATTERNS[law]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 // A brand-new seed still needs a fair, visible attack to fight.
 if(!ordered.length)ordered=[['pierce',1]];
 const tower=mirrorFloorRules(floor??round,{quality});
 // Every acquired family stays in the loadout. The scheduler only limits how
 // many may start on the same beat; it never removes a chosen law or form.
 const attacks=ordered.map(([law,score],index)=>Object.freeze({
  ...MIRROR_PATTERNS[law],law,weight:Number(score.toFixed(2)),order:index+1
 }));
 const r=tower.difficulty,lead=ordered[0][0];
 return Object.freeze({
  attacks:Object.freeze(attacks),
  loadout:mirrorCloneLoadout(snapshot),
  concurrentAttackFamilies:tower.concurrentAttackFamilies,
  chainLength:tower.chainLength,
  ultimate:Object.freeze({...MIRROR_PATTERNS[lead],law:lead,id:`mirror-${MIRROR_PATTERNS[lead].id}`}),
  stats:Object.freeze({
   hpScale:Number((2.25+Math.min(10,r)*.14+Math.min(5,(snapshot?.forms||[]).length)*.09+tower.ascent*.15).toFixed(2)),
   moveSpeedScale:Number((Math.min(1.18,.86+r*.028)+tower.ascent*.009).toFixed(3)),
   hitDamageMaxHp:Number((Math.min(.13,.074+r*.0046)+tower.ascent*.002).toFixed(3)),
   attackSpeedScale:Number((Math.min(1.38,.98+r*.035)+tower.ascent*.012).toFixed(3))
  }),
  tower,
  budget:tower.budget,
  copied:Object.freeze({healing:false,revive:false,relic:false})
 });
}

export const MIRROR_TRIAL_PROTOTYPE=Object.freeze({
 name:'거울의 탑',
 placement:'separate-challenge',
 unlock:'austin-defeated',
 copyMode:MIRROR_COPY_RULES.mode,
 localSliceFloors:100,
 releaseFloors:100,
 checkpoint:'every-ten-floors',
 released:true
});

export const MIRROR_RECORD_KEY='seed-mirror-tower-record-v1';
export const MIRROR_CHECKPOINT_KEY='seed-mirror-tower-checkpoint-v1';
export function normalizeMirrorCheckpoint(s){
 try{
  if(s?.cleared===true&&Number.isFinite(s.savedAt))return {version:1,cleared:true,savedAt:s.savedAt};
  if(!s||s.version!==1||!Number.isInteger(s.floor)||s.floor<11||s.floor>91||s.floor%10!==1||!Number.isFinite(s.hp)||s.hp<=0||s.hp>100)return null;
  if(!s.levels||typeof s.levels!=='object'||Array.isArray(s.levels)||Object.entries(s.levels).some(([id,n])=>!LAWS[id]||!Number.isInteger(n)||n<1||n>99))return null;
  if(!s.forms||typeof s.forms!=='object'||Array.isArray(s.forms)||Object.entries(s.forms).some(([id,n])=>!ALL_FORMS[id]||!Number.isInteger(n)||n<1||n>999))return null;
  if(!Array.isArray(s.rules)||s.rules.some(id=>!LAWS[id])||!Array.isArray(s.mutated)||s.mutated.some(id=>!LAWS[id]))return null;
  return s;
 }catch{return null;}
}
export function readMirrorCheckpoint(storage){
 try{const value=normalizeMirrorCheckpoint(JSON.parse(storage?.getItem(MIRROR_CHECKPOINT_KEY)));return value?.cleared?null:value;}catch{return null;}
}
export function writeMirrorCheckpoint(storage,s,now=Date.now()){
 if(!storage||!s||!normalizeMirrorCheckpoint({...s,version:1}))return false;
 try{storage.setItem(MIRROR_CHECKPOINT_KEY,JSON.stringify({...s,version:1,savedAt:now}));return true;}catch{return false;}
}
export function clearMirrorCheckpoint(storage,now=Date.now()){try{storage?.setItem(MIRROR_CHECKPOINT_KEY,JSON.stringify({version:1,cleared:true,savedAt:now}));return true;}catch{return false;}}
export function normalizeMirrorRecord(value){
 const floor=Math.max(0,Math.min(MIRROR_TRIAL_PROTOTYPE.releaseFloors,Math.floor(Number(value?.bestFloor)||0)));
 return Object.freeze({version:1,bestFloor:floor,clears:Math.max(0,Math.min(9999,Math.floor(Number(value?.clears)||0))),perfectDodges:Math.max(0,Math.min(1e7,Math.floor(Number(value?.perfectDodges)||0)))});
}
export function readMirrorRecord(storage){
 try{return normalizeMirrorRecord(JSON.parse(storage?.getItem(MIRROR_RECORD_KEY)));}catch{return normalizeMirrorRecord();}
}
export function recordMirrorResult(storage,{floor=0,won=false,perfectDodges=0}={}){
 const before=readMirrorRecord(storage),next=normalizeMirrorRecord({bestFloor:Math.max(before.bestFloor,floor),clears:before.clears+(won?1:0),perfectDodges:Math.max(before.perfectDodges,perfectDodges)});
 try{storage?.setItem(MIRROR_RECORD_KEY,JSON.stringify(next));}catch{}
 return next;
}
