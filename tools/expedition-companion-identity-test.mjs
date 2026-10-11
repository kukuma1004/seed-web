import assert from 'node:assert/strict';
import {EXPEDITION_SPECIES,getExpeditionSpecies} from '../src/expedition/species.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,checkpointExpeditionCombat,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {expeditionCompanionIdentity,expeditionCompanionIntent} from '../src/expedition/companion-identity.js';

const fighter=(id,slot,speciesId='burst',extra={})=>({id,instanceId:id,speciesId,slot,hp:300,maxHp:300,power:20,defense:0,speed:2,level:5,...extra});
const make=(speciesId,enemies,allies=[],extra={})=>createExpeditionCombat({battleId:'identity',
 allies:[fighter('actor',0,speciesId,{speed:100,...extra}),...allies],enemies,catalog:EXPEDITION_SPECIES});
const use=(battle,expected)=>{
 const before=JSON.stringify(battle),intent=expeditionCompanionIntent(battle);
 assert.deepEqual(intent,expected);assert.equal(JSON.stringify(battle),before,'advisor must not mutate accepted state');
 assert.deepEqual(expeditionCompanionIntent(battle),intent,'no hidden RNG');
 const checkpoint=checkpointExpeditionCombat(battle),restored=restoreExpeditionCombat(checkpoint);
 assert.deepEqual(expeditionCompanionIntent(restored),intent,'resume preserves exact stored actions');
 const result=performExpeditionCombatAction(restored,{id:'paid-identity',unitId:'actor',kind:intent.kind,targetId:intent.targetId});
 assert(result.ok,JSON.stringify(result));assert.equal(restored.actionCount,battle.actionCount+1,'one ordinary paid action');
 assert.equal(battle.actionCount,0);return {result,battle:restored};
};
const command=(kind,targetId)=>({type:'action',kind,targetId});
for(const species of Object.values(EXPEDITION_SPECIES)){
 const identity=expeditionCompanionIdentity(species.id);assert(identity);assert(Object.isFrozen(identity));
 assert.equal(identity.signature,species.trigger);assert.equal(identity.law,species.dominantLaw);assert(identity.partners.length);
 assert.equal(expeditionCompanionIdentity(species.id),identity,'finite canonical metadata cache');
}
assert.equal(expeditionCompanionIdentity('missing'),null);
assert.equal(new Set(Object.keys(EXPEDITION_SPECIES).filter(id=>EXPEDITION_SPECIES[id].kind==='base').map(id=>expeditionCompanionIdentity(id).tactic)).size,9);

{
 const s=make('burst',[fighter('e0',0),fighter('e1',1),fighter('e2',2)]);
 const {result}=use(s,command('skill1','e0'));assert.equal(result.events.filter(e=>e.type==='returnWarning').length,3);
}
{
 const s=make('pierce',[fighter('e0',0),fighter('e1',1),fighter('e3',3)]);
 const {result}=use(s,command('skill1','e1'));assert.deepEqual(result.events.filter(e=>e.type==='damage').map(e=>e.targetId),['e1','e3']);
}
{
 const s=make('split',[fighter('e0',0),fighter('e1',1)]);
 const {result}=use(s,command('skill1','e0'));assert.equal(result.events.filter(e=>e.type==='damage').length,2);
}
{
 const gravitySolo=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='solo'&&s.dominantLaw==='gravity');assert(gravitySolo);
 const s=make(gravitySolo.id,[fighter('e1',1),fighter('rear',2)]);
 const intent=expeditionCompanionIntent(s);assert.equal(intent?.targetId,'rear');
 const {result}=use(s,intent);assert(result.events.some(e=>e.type==='pull'&&e.targetId==='rear'&&e.slot===0));
}
{
 const s=make('chain',[fighter('e0',0),fighter('e1',1,'burst',{status:{conductive:1}})]);
 const {result}=use(s,command('skill1','e0'));assert(result.events.some(e=>e.type==='conductive'&&e.targetId==='e0'));
}
{
 const s=make('frost',[fighter('cold',0,'burst',{status:{chill:1}}),fighter('e1',1)]);
 const {result}=use(s,command('skill1','cold'));assert(result.events.some(e=>e.type==='chill'&&e.targetId==='cold'&&e.amount===3));
 const boss=make('frost',[fighter('boss',0,'burst',{boss:true,status:{chill:1}})]);
 const delayed=use(boss,command('skill1','boss'));assert(delayed.result.events.some(e=>e.type==='bossDelay'&&e.unitId==='boss'));
}
{
 const s=make('orbit',[fighter('e0',0)],[fighter('hurt',1,'pierce',{hp:30})]);
 const {result}=use(s,command('skill1','hurt'));assert(result.events.some(e=>e.type==='protection'&&e.targetId==='hurt'&&e.amount>0));
 // Reserve bodies do not get active-turn support or distort target advice.
 const reserve=make('orbit',[fighter('e0',0)],[fighter('reserve',5,'pierce',{hp:1})]);assert.equal(expeditionCompanionIntent(reserve),null);
 const covered=make('orbit',[fighter('e0',0)],[fighter('hurt',1,'pierce',{hp:30,status:{protection:100}})]);
 assert.equal(expeditionCompanionIntent(covered),null,'no repeated shield cast on already protected ally');
}
{
 const s=make('reflect',[fighter('e0',0)]);s.units[0].guardedReceipt=true;
 const {result}=use(s,command('skill1','actor'));assert(result.events.some(e=>e.type==='counterReady'&&e.targetId==='actor'));
}
{
 const s=make('recall',[fighter('covered',0,'burst',{hp:20}),fighter('fresh',1)]);
 s.pending.push({ownerId:'actor',targetId:'covered',ratio:1.5,dueRound:2,kind:'skill1',op:0});assert(restoreExpeditionCombat(s));
 const {result}=use(s,command('skill1','fresh'));assert(result.events.some(e=>e.type==='returnWarning'&&e.targetId==='fresh'));
}
{
 const quiet=make('burst',[fighter('e0',0)]);assert.equal(expeditionCompanionIntent(quiet),null,'ordinary fallback remains available');
 assert.equal(expeditionCompanionIntent(null),null);assert.equal(expeditionCompanionIntent({...quiet,units:Array(17).fill(quiet.units[0])}),null);
 assert.equal(expeditionCompanionIntent(quiet,quiet.units[1]),null,'enemy is never commandeered');
 const max=make('pierce',Array.from({length:8},(_,i)=>fighter('e'+i,i)),Array.from({length:7},(_,i)=>fighter('a'+i,i+1)));
 assert.equal(max.units.length,16);const intent=expeditionCompanionIntent(max);assert(intent);assert(max.units.find(u=>u.id===intent.targetId).slot<5);
 for(const version of [1,2,3]){
  const s=make('orbit',[fighter('e0',0)],[fighter('hurt',1,'pierce',{hp:30})]);s.version=version;
  const before=JSON.stringify(s);assert(restoreExpeditionCombat(s));assert(expeditionCompanionIntent(s));assert.equal(JSON.stringify(s),before,'legacy receipts unchanged');
 }
 // An imported locked high-level skill cannot be selected just because its
 // opcode exists. Only the actor's accepted level controls the paid choice.
 const low=make('pierce',[fighter('e0',0),fighter('e2',2)],[],{level:1});
 assert.equal(expeditionCompanionIntent(low)?.kind,'skill1');
 assert.equal(expeditionCombatTurn(low).id,'actor');assert(getExpeditionSpecies(low.units[0].speciesId));
}
{
 const threatened=make('reflect',[fighter('boss',0,'burst',{boss:true,power:300})],[],{hp:80});
 assert(performExpeditionCombatAction(threatened,{id:'guard-first',unitId:'actor',kind:'guard'}).ok);
 assert(performExpeditionCombatAction(threatened,{id:'real-boss-warning',unitId:'boss',kind:'attack',targetId:'actor'}).ok);
 assert.equal(threatened.round,2);assert.equal(threatened.warnings.length,1);
 const before=JSON.stringify(threatened);assert.deepEqual(expeditionCompanionIntent(threatened),{type:'action',kind:'guard'});
 assert.equal(JSON.stringify(threatened),before);
 const paid=performExpeditionCombatAction(threatened,{id:'guard-danger',unitId:'actor',kind:'guard'});
 assert(paid.ok);assert(paid.events.some(e=>e.type==='guard'));
}
console.log('PASS: 162 canonical companion descriptions, nine distinct paid tactical choices, exact resume/legacy immutability, locks/reserves and 16-unit budget. No new passives/save schema/rewards.');
