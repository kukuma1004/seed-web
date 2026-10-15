import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createExpansionBoss,stepExpansionBoss,expansionBossMove,checkpointExpansionBoss,restoreExpansionBoss} from '../src/act-expansion-runtime.js';
import {expansionBossDamageMultiplier} from '../src/expansion-journey.js';
import {expansionBossHud} from '../src/expansion-boss-hud.js';
import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {createSurvivalSession} from '../src/survival-rules.js';

const main=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n'),start=main.indexOf('function renderBossHud('),end=main.indexOf('\nlet hudLast=',start);
assert(start>0&&end>start);const source=main.slice(start,end);
function hud(){
 const elements=new Map(),dataset={};let writes=0;
 const node={dataset:new Proxy(dataset,{set(t,k,v){writes++;t[k]=v;return true;}}),querySelector(s){if(!elements.has(s))elements.set(s,{});return elements.get(s);}};
 const c={expansionJourney:null,expansionBossHud,$:()=>node,setHidden:(e,v)=>e.hidden=v,setWidth:(e,v)=>e.width=v,setText:(e,v)=>{if(e.text!==v)e.text=v;},pendingEscorts:[]};
 vm.createContext(c);vm.runInContext(source,c);return {c,node,elements,writes:()=>writes};
}
const counts={samples:0,authoredMoves:new Set(),openAttack:0,openRecover:0,closedRecover:0,initialRecovery:0,transitionToAttack:0};
// Full engine cycles at both simulation rates and every HP phase. The host
// adapters are explicit; this is not real-input play or native layout evidence.
for(const id of ['crosswindKeeper','crystalGardener'])for(const hpRatio of [1,.5,.2])for(const hz of [20,60]){
 const model=createExpansionBoss(id),state=hud(),position={x:0,z:0},player={x:5,z:2},walls=[],seen=new Set();
 const actor={expansionBoss:true,type:id,config:{name:id},expansionMotion:model,hp:hpRatio*100,maxHp:100,state:'deliberately stale'};
 const initial=expansionBossHud(actor);assert.equal(initial.move,'결전 시작');assert(!initial.hint.includes('+35%'));counts.initialRecovery++;
 for(let i=0;i<hz*29;i++){
  const previous=model.state,out=stepExpansionBoss(model,1/hz,{position,player,walls,hpRatio});position.x+=out.move.x;position.z+=out.move.z;
  const before=JSON.stringify(model),copy=expansionBossHud(actor),siege=expansionBossHud(actor,true);
  assert.equal(JSON.stringify(model),before,'HUD never changes engine state, RNG, output or collision');assert(Object.isFrozen(copy));
  state.c.renderBossHud(actor);assert.equal(state.elements.get('.boss-move').text,copy.move);assert.equal(state.elements.get('small').text,copy.hint);assert.equal(state.node.dataset.intent,copy.intent);
  if(model.pattern<0){assert.equal(copy.move,'결전 시작');continue;}
  const move=expansionBossMove(model);seen.add(model.pattern+':'+model.state);counts.authoredMoves.add(id+':'+move.id);counts.samples++;
  if(model.state==='tell'){assert.equal(copy.move,move.name+' · 준비');assert.equal(copy.intent,'preparing');assert(!copy.hint.includes('+30%')&&!copy.hint.includes('+35%'));}
  if(model.state==='attack'){assert.equal(copy.move,move.name+' · 공격');if(previous==='tell')counts.transitionToAttack++;}
  const multiplier=expansionBossDamageMultiplier(id==='crystalGardener'?'crystalGorge':'crosswind',model.state,out.coreOpen);
  if(copy.hint.includes('+30%')){assert.equal(id,'crystalGardener');assert.equal(out.coreOpen,true);assert.equal(multiplier,1.3);}
  if(copy.hint.includes('+35%')){assert.equal(id,'crosswindKeeper');assert.equal(model.state,'recover');assert.equal(multiplier,1.35);}
  if(id==='crystalGardener'){
   if(out.coreOpen){assert(copy.hint.includes('+30%'));assert.equal(copy.intent,'open');if(model.state==='attack'){counts.openAttack++;assert(copy.move.endsWith(' · 공격'));}else{counts.openRecover++;assert(copy.move.includes('반격'));}}
   else assert(!copy.hint.includes('+30%'),'pattern 2 alone cannot claim that the core is already open');
   if(model.state==='recover'&&!out.coreOpen){counts.closedRecover++;assert(copy.hint.includes('닫혀'));}
   if(model.pattern===1&&model.state!=='tell'){assert(siege.hint.includes('심장'));assert(!siege.hint.includes('+30%'));}
  }
  if(i%30===0){state.c.expansionJourney={siege:{}};state.c.renderBossHud(actor);assert.equal(state.elements.get('small').text,siege.hint);state.c.expansionJourney=null;}
 }
 for(let pattern=0;pattern<3;pattern++)for(const phase of ['tell','attack','recover'])assert(seen.has(pattern+':'+phase),id+' '+pattern+' '+phase);
 const checkpoint=checkpointExpansionBoss(model),restored=restoreExpansionBoss(checkpoint,id);
 // Restore deliberately has no committed frame output yet; it must not
 // invent a damage window from a name or a saved pattern.
 const copy=expansionBossHud({...actor,expansionMotion:restored});assert(!copy.hint.includes('+30%'));
 stepExpansionBoss(restored,1/hz,{position,player,walls,hpRatio});const after=expansionBossHud({...actor,expansionMotion:restored});
 if(after.hint.includes('+30%'))assert.equal(restored.out.coreOpen,true);
}
assert.equal(counts.authoredMoves.size,6);assert(counts.openAttack>0&&counts.openRecover>0&&counts.closedRecover>0&&counts.transitionToAttack>0);

// Survival keeps the same canonical model/output under its mode adapter.
// It has no Journey/siege UI object, and cannot inherit Journey instructions.
let survivalFrames=0;
for(const act of [3,4]){
 const session=createSurvivalSession(413,{actCount:5});session.act=act;const runtime=createSurvivalExpansion(session),state=hud(),position={x:0,z:0},player={x:5,z:2};
 const actor={expansionBoss:true,type:runtime.boss.id,config:{name:runtime.boss.id},expansionMotion:runtime.boss,hp:100,maxHp:100};
 for(let i=0;i<1800;i++){
  const out=runtime.stepBoss(1/60,{position,player,hpRatio:.5});position.x+=out.move.x;position.z+=out.move.z;actor.state=out.state;state.c.renderBossHud(actor);
  const copy=expansionBossHud(actor);assert.equal(state.elements.get('.boss-move').text,copy.move);
  assert(!copy.hint.includes('정원의 심장')&&!copy.hint.includes('심장 전에'),'Journey siege-only advice cannot leak into ordinary Survival');
  if(copy.hint.includes('+30%'))assert.equal(runtime.coreOpen,true);survivalFrames++;
 }
}

// Steady HUD frames reuse the same copy and do not write data-intent again.
const model=createExpansionBoss('crystalGardener'),actor={expansionBoss:true,type:model.id,config:{name:'수정의 정원사'},expansionMotion:model,hp:50,maxHp:100};
model.pattern=2;model.state='attack';model.out.coreOpen=true;const copy=expansionBossHud(actor),state=hud();state.c.renderBossHud(actor);const writes=state.writes();
for(let i=0;i<20000;i++){assert.equal(expansionBossHud(actor),copy);state.c.renderBossHud(actor);}assert.equal(state.writes(),writes);
state.c.renderBossHud({type:'warden',hp:20,maxHp:40,config:{name:'문지기'},learned:[]});assert(!('intent' in state.node.dataset),'non-expansion HUD cannot inherit an old green open-core style');
for(const actor of [null,{}, {type:'unknown'}, {type:'crystalGardener'}, {expansionMotion:{id:'crystalGardener',pattern:2,state:'tell',out:{coreOpen:true}}}]){
 const copy=expansionBossHud(actor);assert(copy.move&&copy.hint);assert(!copy.hint.includes('+30%'),'invalid/unknown/tell states cannot invent vulnerability');
}
const css=readFileSync('src/journey.css','utf8');assert(css.includes('[data-intent=preparing]'));assert(css.includes('[data-intent=attack]'));assert(css.includes('[data-intent=open]'));
assert(!/createElement|requestAnimationFrame|setInterval|setTimeout/.test(readFileSync('src/expansion-boss-hud.js','utf8')));
console.log(JSON.stringify({...counts,authoredMoves:[...counts.authoredMoves],survivalFrames,steadyHudCalls:20000,extraIntentWrites:state.writes()-writes,scope:'Engine cycles + actual shipping HUD with DOM adapter; not native play, device performance, or screenshots.'}));
