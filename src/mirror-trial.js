import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';

// The mirror is one bounded boss AI that translates a build into readable
// patterns. It never runs a second copy of the player's projectile simulation.
export const MIRROR_TRIAL_LIMITS=Object.freeze({
 concurrentAttackFamilies:2,
 hostileProjectilesLow:36,
 hostileProjectilesNormal:52,
 effectsLow:28,
 effectsNormal:44,
 copiedHealing:false,
 copiedRevive:false,
 copiedRelic:false
});

export const MIRROR_COPY_RULES=Object.freeze({
 mode:'exact-tower-build',
 copied:Object.freeze(['laws','forms','levels','dashEvolution','ultimate']),
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

// Open arenas stay the same size. Difficulty comes from movement decisions,
// not from squeezing the player into an increasingly tiny safe area.
export const MIRROR_MOVEMENT_PROFILES=Object.freeze({
 reflection:Object.freeze({name:'비친 새싹',desiredDistance:Object.freeze([4.8,8]),strafe:.52,reposition:.9,dash:false,feint:false}),
 duelist:Object.freeze({name:'거울 결투가',desiredDistance:Object.freeze([4.2,7.4]),strafe:.68,reposition:.72,dash:true,feint:false}),
 trickster:Object.freeze({name:'깨진 형상',desiredDistance:Object.freeze([3.8,7]),strafe:.78,reposition:.62,dash:true,feint:true}),
 apex:Object.freeze({name:'완성된 거울',desiredDistance:Object.freeze([3.5,6.6]),strafe:.86,reposition:.54,dash:true,feint:true})
});

export const MIRROR_TOWER=Object.freeze({
 name:'거울의 탑',
 milestoneFloors:Object.freeze([5,10,15,20]),
 endlessFrom:21,
 checkpointEvery:5,
 choiceEvery:1,
 arenaRadius:13,
 floorHeal:.12,
 milestoneHeal:.35
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
 const n=Math.max(1,Math.floor(Number(floor)||1)),milestone=n%MIRROR_TOWER.checkpointEvery===0;
 const tier=n<5?0:n<10?1:n<15?2:3;
 const movement=[MIRROR_MOVEMENT_PROFILES.reflection,MIRROR_MOVEMENT_PROFILES.duelist,MIRROR_MOVEMENT_PROFILES.trickster,MIRROR_MOVEMENT_PROFILES.apex][tier];
 const low=quality==='low';
 return Object.freeze({
  floor:n,
  milestone,
  checkpoint:milestone,
  endless:n>=MIRROR_TOWER.endlessFrom,
  arena:Object.freeze({radius:MIRROR_TOWER.arenaRadius,solidObstacles:0,shrinks:false}),
  movement,
  concurrentAttackFamilies:n<3?1:MIRROR_TRIAL_LIMITS.concurrentAttackFamilies,
  chainLength:n<5?1:n<10?2:3,
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
 const r=tower.floor,lead=ordered[0][0];
 return Object.freeze({
  attacks:Object.freeze(attacks),
  loadout:mirrorCloneLoadout(snapshot),
  concurrentAttackFamilies:tower.concurrentAttackFamilies,
  ultimate:Object.freeze({...MIRROR_PATTERNS[lead],law:lead,id:`mirror-${MIRROR_PATTERNS[lead].id}`}),
  stats:Object.freeze({
   hpScale:Number((2.15+Math.min(10,r)*.12+Math.min(5,(snapshot?.forms||[]).length)*.08).toFixed(2)),
   moveSpeedScale:Number(Math.min(.94,.7+r*.018).toFixed(3)),
   hitDamageMaxHp:Number(Math.min(.13,.072+r*.004).toFixed(3)),
   attackSpeedScale:Number(Math.min(1.28,.9+r*.025).toFixed(3))
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
 localSliceFloors:10,
 checkpoint:'every-five-floors',
 released:false
});
