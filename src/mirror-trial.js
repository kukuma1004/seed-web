import {LAWS} from './laws.js';
import {ALL_FORMS} from './forms.js';

// The mirror is one bounded boss AI that translates a build into readable
// patterns. It never runs a second copy of the player's projectile simulation.
export const MIRROR_TRIAL_LIMITS=Object.freeze({
 patterns:2,
 hostileProjectilesLow:36,
 hostileProjectilesNormal:52,
 effectsLow:28,
 effectsNormal:44,
 copiedHealing:false,
 copiedRevive:false,
 copiedRelic:false
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

export function mirrorBuildSnapshot({levels=new Map(),forms=new Map()}={}){
 const laws=entryList(levels).filter(([id])=>LAWS[id]).map(([id,level])=>Object.freeze({id,level:levelOf(level)}));
 const evolved=entryList(forms).filter(([id])=>ALL_FORMS[id]).map(([id,level])=>{
  const form=ALL_FORMS[id];
  return Object.freeze({id,level:levelOf(level),laws:Object.freeze(form.requires.filter(law=>LAWS[law]))});
 });
 return Object.freeze({laws:Object.freeze(laws),forms:Object.freeze(evolved)});
}

export function mirrorPatternPlan(snapshot,{round=1,quality='normal'}={}){
 const weight=new Map(Object.keys(LAWS).map(id=>[id,0]));
 for(const law of snapshot?.laws||[])weight.set(law.id,(weight.get(law.id)||0)+1+Math.min(2.4,law.level*.2));
 for(const form of snapshot?.forms||[])for(const law of form.laws||[])weight.set(law,(weight.get(law)||0)+2+Math.min(2.8,form.level*.18));
 let ordered=[...weight].filter(([law,score])=>score>0&&MIRROR_PATTERNS[law]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 // A brand-new seed still needs a fair, visible attack to fight.
 if(!ordered.length)ordered=[['pierce',1]];
 const attacks=ordered.slice(0,MIRROR_TRIAL_LIMITS.patterns).map(([law,score],index)=>Object.freeze({
  ...MIRROR_PATTERNS[law],law,weight:Number(score.toFixed(2)),order:index+1
 }));
 const r=Math.max(1,Math.floor(Number(round)||1)),lead=ordered[0][0];
 const cap=quality==='low'?MIRROR_TRIAL_LIMITS.hostileProjectilesLow:MIRROR_TRIAL_LIMITS.hostileProjectilesNormal;
 return Object.freeze({
  attacks:Object.freeze(attacks),
  ultimate:Object.freeze({...MIRROR_PATTERNS[lead],law:lead,id:`mirror-${MIRROR_PATTERNS[lead].id}`}),
  stats:Object.freeze({
   hpScale:Number((2.15+Math.min(10,r)*.12+Math.min(5,(snapshot?.forms||[]).length)*.08).toFixed(2)),
   moveSpeedScale:Number(Math.min(.94,.7+r*.018).toFixed(3)),
   hitDamageMaxHp:Number(Math.min(.13,.072+r*.004).toFixed(3)),
   attackSpeedScale:Number(Math.min(1.28,.9+r*.025).toFixed(3))
  }),
  budget:Object.freeze({hostileProjectiles:cap,effects:quality==='low'?MIRROR_TRIAL_LIMITS.effectsLow:MIRROR_TRIAL_LIMITS.effectsNormal}),
  copied:Object.freeze({healing:false,revive:false,relic:false})
 });
}

export const MIRROR_TRIAL_PROTOTYPE=Object.freeze({
 name:'거울의 시련',
 placement:'separate-challenge',
 unlock:'austin-defeated',
 firstForm:'returnflare',
 rounds:3,
 checkpoint:'between-rounds',
 released:false
});
