import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {TWIN_FORMS} from '../src/forms.js';
import {TWIN_INTERACTIONS,createTwinInteractionEngine} from '../src/twin-interactions.js';

const ids=Object.keys(TWIN_FORMS);
assert.equal(ids.length,36);
assert.deepEqual(Object.keys(TWIN_INTERACTIONS).sort(),ids.sort(),'Each playable solo pair needs its own authored interaction.');
assert.equal(new Set(Object.values(TWIN_INTERACTIONS).map(i=>i.name)).size,36);
assert.equal(new Set(Object.values(TWIN_INTERACTIONS).map(i=>i.rule)).size,36);
const allowed=new Set(['arc','spray','line','recall','pull','chill','focus','guard']);
for(const [id,rule] of Object.entries(TWIN_INTERACTIONS)){
 assert.ok(rule.actions.length>=1&&rule.actions.length<=2,`${id}: bounded follow-ups`);
 for(const a of rule.actions){
  assert.ok(allowed.has(a.type),`${id}: unknown action ${a.type}`);
  if(a.ratio!==undefined)assert.ok(a.ratio>0&&a.ratio<=.48,`${id}: excessive follow-up damage`);
  if(a.targets!==undefined)assert.ok(a.targets<=2,`${id}: too many targets`);
  if(a.range!==undefined)assert.ok(a.range<=4.7,`${id}: excessive search radius`);
 }
}

const enemy=(x,z,type='grunt')=>({type,g:{position:new Vector3(x,0,z)},slow:0,dead:false});
let totalTriggers=0;
for(const id of ids){
 const engine=createTwinInteractionEngine();
 const target=enemy(2,0),others=[enemy(3,0),enemy(1,0),enemy(2,.8),enemy(4,0),enemy(6,0)];
 const damage=[],visual=[];
 const fx=Object.fromEntries(['arc','burst','trail','pulse','reflect'].map(k=>[k,()=>visual.push(k)]));
 const context={id,target,enemies:[target,...others],player:new Vector3(0,0,0),now:10,bonus:10,damage:(e,n)=>damage.push([e,n]),fx,isBoss:()=>false,collide:()=>{}};
 assert.equal(engine.apply(context),true,`${id}: first interaction should fire`);
 assert.equal(engine.apply({...context,now:10.1}),false,`${id}: repeated hits on one enemy must be throttled`);
 assert.ok(damage.every(([,n])=>n>0&&n<=4.8),`${id}: direct effect damage must be bounded`);
 assert.ok(damage.reduce((s,[,n])=>s+n,0)<=14.4,`${id}: effect budget too high`);
 assert.ok(visual.length<=2,`${id}: too many VFX calls`);
 assert.equal(engine.apply({...context,now:10.8}),true,`${id}: interaction must recover`);
 totalTriggers++;
}

const e=createTwinInteractionEngine(),t=enemy(2,0);
const fx=Object.fromEntries(['arc','burst','trail','pulse','reflect'].map(k=>[k,()=>{}]));
const base={id:'frozenhole',target:t,enemies:[t],player:new Vector3(),bonus:10,damage:()=>{},fx,isBoss:()=>false,collide:()=>{}};
assert.equal(e.apply({...base,now:15}),true);
assert.equal(e.apply({...base,now:0}),true,'A new run resets the elapsed-time guard.');
const nextTarget=enemy(2.2,0);
assert.equal(e.apply({...base,target:nextTarget,enemies:[nextTarget],now:.05}),false,'Crowd hits share a short global VFX limit.');
assert.equal(e.apply({...base,target:nextTarget,enemies:[nextTarget],now:.1}),true);
const boss=enemy(2,0,'austin'),bossEngine=createTwinInteractionEngine(),bossDamage=[];
assert.equal(bossEngine.apply({...base,id:'frozenhole',target:boss,enemies:[boss],now:3,isBoss:()=>true,damage:(_e,n)=>bossDamage.push(n)}),true);
assert.equal(boss.slow,0,'Twin control must not freeze a boss.');
assert.ok(bossDamage.length>0&&bossDamage.reduce((a,b)=>a+b,0)<=2.6,'Crowd effects need a small bounded single-boss fallback.');
console.log(`Twin interactions: ${totalTriggers} authored pairs, effect budgets, rate limiting and run reset passed.`);
