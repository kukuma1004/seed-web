import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {expeditionSessionKey} from '../src/expedition/session.js';
import {EXPEDITION_RELICS,applyExpeditionRelicsToActions,expeditionAppliedRelics} from '../src/expedition/relics.js';
import {EXPEDITION_SPECIES,getExpeditionSpecies} from '../src/expedition/species.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {createExpeditionController} from '../src/expedition/controller.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {createFreshExpeditionAccount,decodeExpeditionAccount} from '../src/expedition/account-codec.js';
import {nextExpeditionRuntimeAccount,auditExpeditionRuntimeTransaction} from '../src/expedition/account-runtime.js';
import {renderExpeditionRelics,renderExpeditionRelicReward,renderExpeditionBattleRelics} from '../src/expedition/home-panels.js';

const copy=structuredClone,owned=Object.keys(EXPEDITION_RELICS);let checks=0,serial=0,actualActions=0;
async function check(label,fn){await fn();checks++;console.log('PASS '+label);}
function battle(speciesId,relics=[]){
 const actions=applyExpeditionRelicsToActions(speciesId,getExpeditionSpecies(speciesId).actionPattern,relics);
 return createExpeditionCombat({allies:[{id:'a',speciesId,slot:0,power:100,speed:100,hp:10000,maxHp:10000,defense:0,actions}],enemies:[{id:'e',speciesId:'burst',slot:0,power:100,speed:1,hp:10000,maxHp:10000,defense:0}],getSpecies:getExpeditionSpecies});
}
function action(s,kind){const u=expeditionCombatTurn(s);assert(u);const r=performExpeditionCombatAction(s,{id:'turn-'+(++serial),unitId:u.id,kind,...(['guard'].includes(kind)?{}:{targetId:u.side==='ally'?'e':'a'})});assert(r.ok,r.reason);actualActions++;return r.events;}
const damageTo=(events,id)=>events.filter(e=>e.type==='damage'&&e.targetId===id).reduce((sum,e)=>sum+e.amount,0);
await check('Eight owned-garden relics: matching laws only, source patterns remain immutable',()=>{
 assert.equal(owned.length,8);assert.deepEqual(owned,Object.keys(EXPEDITION_GARDENS));
 const before=JSON.stringify(EXPEDITION_SPECIES);
 for(const relic of Object.values(EXPEDITION_RELICS))assert.equal(relic.law,EXPEDITION_GARDENS[relic.gardenId].law);
 for(const species of Object.values(EXPEDITION_SPECIES)){
  const base=species.actionPattern,none=applyExpeditionRelicsToActions(species.id,base,[]),enhanced=applyExpeditionRelicsToActions(species.id,base,owned);
  assert.deepEqual(none,base);assert.deepEqual(Object.keys(enhanced),Object.keys(base));
  for(const kind of Object.keys(base)){
   assert.equal(enhanced[kind].length,base[kind].length);assert(enhanced[kind].length<=8);
   for(let n=0;n<base[kind].length;n++){
    const a=base[kind][n],b=enhanced[kind][n];
    for(const field of Object.keys(a).filter(k=>!['ratio','amount'].includes(k)))assert.deepEqual(b[field],a[field]);
    assert((b.ratio??0)-(a.ratio??0)<=.100001);assert((b.ratio??0)<=3);
    if(b.amount!==undefined)assert.equal(a.type,'vulnerable');
   }
  }
  assert.deepEqual(applyExpeditionRelicsToActions(species.id,base,[...owned,...owned,'fake']),enhanced);
 }
 assert.equal(JSON.stringify(EXPEDITION_SPECIES),before);
 assert.deepEqual(applyExpeditionRelicsToActions('chain',getExpeditionSpecies('chain').actionPattern,owned),getExpeditionSpecies('chain').actionPattern,'no ninth combat-garden relic');
});
await check('Real P2 events: column110→120, split65→75, chilled followup70→80; no extra targets/freeze',()=>{
 for(const [speciesId,relic,expected]of [['pierce','meadow',[110,120]],['split','blossom',[65,75]],['frost','snow',[70,80]]]){
  const a=battle(speciesId),b=battle(speciesId,[relic]),ea=action(a,'skill1'),eb=action(b,'skill1');
  assert.equal(damageTo(ea,'e'),expected[0]);assert.equal(damageTo(eb,'e'),expected[1]);
  assert.equal(ea.filter(e=>e.type==='damage').length,eb.filter(e=>e.type==='damage').length);
  if(speciesId==='frost')assert.equal(a.units[1].status.chill,b.units[1].status.chill);
 }
});
await check('Real delayed-return events: recall60→70 and explosion75→85 at the same round/body',()=>{
 for(const [speciesId,relic,expected]of [['recall','autumn',[60,70]],['burst','fire',[75,85]]]){
  const a=battle(speciesId),b=battle(speciesId,[relic]);action(a,'skill1');action(b,'skill1');
  assert.equal(a.pending.length,b.pending.length);assert.equal(a.pending[0].dueRound,b.pending[0].dueRound);
  // Enemy guard would halve the next delayed impact, so use its real attack.
  const ea=action(a,'attack'),eb=action(b,'attack');assert.equal(damageTo(ea,'e'),expected[0]);assert.equal(damageTo(eb,'e'),expected[1]);
  assert.equal(a.pending.length,0);assert.equal(b.pending.length,0);
 }
});
await check('Real protective/counter/vulnerability events: shield140→150, counter100→110, next hit125→150',()=>{
 const a=battle('orbit'),b=battle('orbit',['moon']);action(a,'skill1');action(b,'skill1');assert.equal(a.units[0].status.protection,140);assert.equal(b.units[0].status.protection,150);
 const c=battle('reflect'),d=battle('reflect',['dream']);action(c,'skill1');action(d,'skill1');assert.equal(damageTo(action(c,'attack'),'e'),100);assert.equal(damageTo(action(d,'attack'),'e'),110);
 const e=battle('gravity'),f=battle('gravity',['shadow']);action(e,'skill1');action(f,'skill1');assert.equal(e.units[1].status.vulnerable,1);assert.equal(f.units[1].status.vulnerable,2);
 action(e,'attack');action(f,'attack');assert.equal(damageTo(action(e,'attack'),'e'),125);assert.equal(damageTo(action(f,'attack'),'e'),150);assert.equal(f.units[1].status.vulnerable,0);
});
await check('Overlapping final/twin relics never stack a ratio increment; zero/cap/conditions/timing remain bounded',()=>{
 const species=Object.values(EXPEDITION_SPECIES).find(s=>s.laws.includes('burst')&&s.laws.includes('recall'));
 const actions={attack:[{type:'return',target:'adjacent',ratio:1,rounds:2,when:'crowded',maxTargets:2},{type:'return',target:'all',ratio:3},{type:'return',target:'all',ratio:0}]};
 const result=applyExpeditionRelicsToActions(species.id,actions,['fire','autumn']);assert.equal(result.attack[0].ratio,1.1);assert.equal(result.attack[1].ratio,3);assert.equal(result.attack[2].ratio,0);assert.equal(result.attack[0].rounds,2);assert.equal(result.attack[0].maxTargets,2);assert.equal(result.attack[0].when,'crowded');
 const old=battle('pierce'),enhanced=battle('pierce',['meadow']);assert.equal(expeditionAppliedRelics(old.units[0],owned).length,0);assert.deepEqual(expeditionAppliedRelics(enhanced.units[0],owned).map(r=>r.gardenId),['meadow']);assert.deepEqual(restoreExpeditionCombat(enhanced),enhanced);
});

function memory(){const bytes=new Map();return {getItem:k=>bytes.get(k)??null,setItem:(k,v)=>bytes.set(k,v)};}
function walk(c){for(let n=0;n<35;n++)assert(c.dispatch({type:'move',dx:1,dt:.1}).ok);}
function fight(c){while(c.state().screen==='battle'){
 const s=c.state(),u=expeditionCombatTurn(s.battle),target=s.battle.units.find(e=>e.side==='enemy'&&!e.dead&&e.slot<5),kind=u.actions.skill1.some(o=>['damage','split','return'].includes(o.type))?'skill1':'attack';
 assert(c.dispatch(u.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id}).ok);actualActions++;
}}
await check('Actual boss reward is provisional until return; reload/return grant once; next encounter applies and restore never reapplies',()=>{
 const storage=memory(),owner='relic-local';let c=createExpeditionController({storage,owner,idFactory:()=>String(++serial)});
 assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);
 for(let n=0;n<30&&EXPEDITION_RUN_STEPS[c.state().route.step]!=='return';n++){
  if(c.state().screen==='battle'){fight(c);continue;}walk(c);const step=EXPEDITION_RUN_STEPS[c.state().route.step];assert(c.dispatch(step==='choice'?{type:'choice',lawId:'pierce',mode:'rescue'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'}).ok);
 }
 assert.equal(c.state().meta.relics.length,0);assert(c.state().route.completedBattles.includes(c.state().route.runId+':b8'));
 c.close();c=createExpeditionController({storage,owner});assert.equal(c.state().meta.relics.length,0);assert(c.dispatch({type:'return'}).ok);assert.deepEqual(c.state().meta.relics,['meadow']);assert.match(renderExpeditionRelicReward(c.state()),/길을 잇는 잎맥/);
 const saved=copy(c.state());assert.equal(c.dispatch({type:'return'}).ok,false);assert.deepEqual(c.state().meta,saved.meta);
 assert(c.dispatch({type:'home'}).ok);const found=Object.values(c.state().roster.instances).find(i=>i.status==='alive'&&i.speciesId==='pierce');assert(found);assert(c.dispatch({type:'party',ids:[found.instanceId,...c.state().roster.party.filter(Boolean).filter(id=>id!==found.instanceId)].slice(0,8).concat(Array(8).fill(null)).slice(0,8)}).ok);assert.match(renderExpeditionRelics(c.state()),/보유 1\/8/);
 if(process.argv.includes('--fixture'))writeFileSync('artifacts/expedition-relic-earned-home-20261006.json',storage.getItem(expeditionSessionKey(owner,'review')));
 assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);
 const before=copy(c.state().battle),unit=before.units.find(u=>u.speciesId==='pierce');assert.equal(unit.actions.skill1[0].ratio,1.2);assert.match(renderExpeditionBattleRelics(c.state()),/길을 잇는 잎맥/);c.close();c=createExpeditionController({storage,owner});assert.deepEqual(c.state().battle,before);
 assert(c.dispatch({type:'pause',paused:true}).ok);assert(c.state().notice);assert(c.dispatch({type:'pause',paused:false}).ok);assert.equal(c.state().notice,'');
 assert.equal(renderExpeditionRelicReward({...saved,lastResult:{...saved.lastResult,kind:'wipe'}}),'');
});

await check('Earned account: V1 old receipt, V2 new battle and cross-version audit; old in-flight battle preserves its exact coefficients',async()=>{
 const owner='relic-account',base=1700000000000,writer={deviceId:'pc',leaseId:'relic-finite',issuedAt:base,expiresAt:base+120000};let clock=base+1;
 let record=createFreshExpeditionAccount({owner,now:clock,writer,idFactory:()=>String(++serial)});
 async function next(previous,command,{version=1,generatedIds=[]}={}){
  if(!generatedIds.length&&!Array.isArray(command)&&command.type==='interact'&&EXPEDITION_RUN_STEPS[previous.state.route?.step]==='return'&&previous.state.route.pendingFinds.some(f=>f.kind==='rescue'))generatedIds=['rescued-pierce'];
  const transaction={version,kind:'runtime',receiptId:`write-${previous.revision+1}-${++serial}`,commands:Array.isArray(command)?command:[command],generatedIds};
  const result=await nextExpeditionRuntimeAccount(previous,{owner,transaction,writer,now:++clock});assert(result.ok,result.reason);assert(decodeExpeditionAccount(result.raw,{owner}));return {...result,transaction};
 }
 record=(await next(record,{type:'depart',gardenId:'meadow',difficulty:1},{generatedIds:['earned-route']})).record;
 for(let n=0;n<600&&record.state.screen!=='result';n++){
  const s=record.state;
  if(s.screen==='battle'){
   const u=expeditionCombatTurn(s.battle),target=s.battle.units.find(e=>e.side==='enemy'&&!e.dead&&e.slot<5),kind=u.actions.skill1.some(o=>['damage','split','return'].includes(o.type))?'skill1':'attack';
   record=(await next(record,u.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id})).record;actualActions++;
  }else{
   record=(await next(record,Array.from({length:35},()=>({type:'move',dx:1,dt:.1})))).record;
   const step=EXPEDITION_RUN_STEPS[record.state.route.step];record=(await next(record,step==='choice'?{type:'choice',lawId:'pierce',mode:'rescue'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'})).record;
  }
 }
 assert.equal(record.state.lastResult.kind,'return');assert.deepEqual(record.state.meta.relics,['meadow']);record=(await next(record,{type:'home'})).record;const rescued=Object.values(record.state.roster.instances).find(i=>i.status==='alive'&&i.speciesId==='pierce');assert(rescued);record=(await next(record,{type:'party',ids:[rescued.instanceId,...record.state.roster.party.filter(Boolean).filter(id=>id!==rescued.instanceId)].slice(0,8).concat(Array(8).fill(null)).slice(0,8)})).record;
 record=(await next(record,{type:'depart',gardenId:'meadow',difficulty:1},{version:2,generatedIds:['revisit-route']})).record;
 for(let n=0;n<2;n++){
  record=(await next(record,Array.from({length:35},()=>({type:'move',dx:1,dt:.1})),{version:2})).record;
  if(n===0)record=(await next(record,{type:'interact'},{version:2})).record;
 }
 const legacy=await next(record,{type:'interact'},{version:1}),modern=await next(record,{type:'interact'},{version:2}),current=await next(record,{type:'interact'},{version:3});
 assert.equal(legacy.record.state.battle.units.find(u=>u.speciesId==='pierce').actions.skill1[0].ratio,1.1);
 assert.equal(modern.record.state.battle.units.find(u=>u.speciesId==='pierce').actions.skill1[0].ratio,1.2);
 assert.equal(current.record.state.battle.version,2);assert.equal(modern.record.state.battle.version,1);
 assert.equal(current.record.state.battle.units.find(u=>u.speciesId==='pierce').actions.skill1[0].ratio,1.2,'earned relic applied once to new V2 battle');
 assert((await auditExpeditionRuntimeTransaction(record,current.raw,{owner,transaction:current.transaction})).ok);
 assert.equal((await auditExpeditionRuntimeTransaction(record,current.raw,{owner,transaction:{...current.transaction,version:2}})).ok,false);
 assert((await auditExpeditionRuntimeTransaction(record,legacy.raw,{owner,transaction:legacy.transaction})).ok);
 assert.equal((await auditExpeditionRuntimeTransaction(record,legacy.raw,{owner,transaction:{...legacy.transaction,version:2}})).ok,false);
 assert.equal((await auditExpeditionRuntimeTransaction(record,modern.raw,{owner,transaction:{...modern.transaction,version:1}})).ok,false);
 assert.equal(renderExpeditionBattleRelics(legacy.record.state),'');assert.match(renderExpeditionBattleRelics(modern.record.state),/유물 보강 1종/);
 const oldUnits=copy(legacy.record.state.battle.units),u=expeditionCombatTurn(legacy.record.state.battle),target=legacy.record.state.battle.units.find(e=>e.side==='enemy'&&!e.dead&&e.slot<5);
 const updated=await next(legacy.record,u.side==='enemy'?{type:'enemy'}:{type:'action',kind:'attack',targetId:target.id},{version:2});
 assert.deepEqual(updated.record.state.battle.units.map(u=>u.actions),oldUnits.map(u=>u.actions),'never reapply to a restored battle');
});
console.log(`Expedition relics: ${checks} groups PASS / ${actualActions} actual P2 actions. ZIP reward implemented with local tuning candidates; no human/physical-device/production-account balance claim.`);
