import assert from 'node:assert/strict';
import {createExpeditionController} from '../src/expedition/controller.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {expeditionAutoBattleIntent} from '../src/expedition/auto-battle.js';

let total=0;
for(const garden of Object.values(EXPEDITION_GARDENS)){
 const records=new Map(),storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
 let n=0;const owner='auto-route-'+garden.id,c=createExpeditionController({storage,owner,currentOwner:()=>owner,idFactory:()=>`id-${++n}`});
 assert.ok(c.dispatch({type:'depart',gardenId:garden.id,difficulty:1}).ok);
 let commands=0;
 while(c.state().screen!=='result'&&commands++<2000){
  const s=c.state();let intent;
  if(s.screen==='battle')intent=expeditionCombatTurn(s.battle).side==='enemy'?{type:'enemy'}:expeditionAutoBattleIntent(s.battle);
  else if(s.route.position<12.6)intent={type:'move',dx:1,dt:.1};
  else{const step=EXPEDITION_RUN_STEPS[s.route.step];intent=step==='choice'?{type:'choice',lawId:garden.law}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'};}
  assert.ok(intent,`${garden.id}: no legal command`);const result=c.dispatch(intent);assert.ok(result.ok,`${garden.id}: ${intent.type}/${intent.kind}: ${result.reason}`);
  if(['action','enemy'].includes(intent.type))total++;
 }
 assert.equal(c.state().screen,'result',`${garden.id}: policy must terminate`);
 const final=c.state();c.close();const reopened=createExpeditionController({storage,owner,currentOwner:()=>owner});
 assert.equal(reopened.state().lastResult.kind,final.lastResult.kind);assert.deepEqual(reopened.state().roster.tombstones,final.roster.tombstones);
 reopened.close();console.log(`auto-route ${garden.id}: ${final.lastResult.kind}, survivors ${final.lastResult.survivors}, ${commands} audited inputs`);
}
console.log(`expedition auto-route PASS: ${total} paid battle actions, 8 result/save/reopen paths; simulated local accounts only`);
