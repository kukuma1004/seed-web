import assert from 'node:assert/strict';
import {createExpeditionController} from '../src/expedition/controller.js';
import {createExpeditionSessionStore,expeditionSessionKey,normalizeExpeditionSession,normalizeLegacyExpeditionSession} from '../src/expedition/session.js';
import {EXPEDITION_NURSERY_KEYS,emptyExpeditionNursery} from '../src/expedition/nursery.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {damageInstance,grantInstanceXP,recruitInstance,evolveInstance,createRoster,setParty} from '../src/expedition/roster.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
const clone=o=>JSON.parse(JSON.stringify(o));let passed=0,failed=0,actualActions=0;
const check=(name,fn)=>{try{fn();passed++;console.log(`PASS ${name}`);}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`);}};
function rig(owner='nursery-qa'){
 const bytes=new Map();let uid=owner,serial=0;const storage={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>bytes.set(k,v)},options={storage,owner,currentOwner:()=>uid,idFactory:()=>String(++serial)};
 const key=expeditionSessionKey(owner,'review');return {bytes,storage,options,key,open:()=>createExpeditionController(options),raw:()=>bytes.get(key),stored:()=>JSON.parse(bytes.get(key)),owner:v=>uid=v};
}
function walk(c){for(let n=0;n<35;n++)assert(c.dispatch({type:'move',dx:1,dt:.1}).ok);}
function fight(c,guard=false){let steps=0;while(c.state().screen==='battle'){
 const s=c.state(),actor=expeditionCombatTurn(s.battle),target=s.battle.units.filter(i=>i.side==='enemy'&&!i.dead&&i.slot<5).sort((a,b)=>a.slot-b.slot)[0];assert(actor);const kind=guard?'guard':actor.actions.skill1.some(o=>['damage','split','return'].includes(o.type))?'skill1':'attack';
 const out=c.dispatch(actor.side==='enemy'?{type:'enemy'}:{type:'action',kind,...(!guard?{targetId:target.id}:{})});assert(out.ok,out.reason);actualActions++;assert(++steps<400);
 }}
function toChoice(c,mode='egg',difficulty=1,gardenId='meadow'){
 assert(c.dispatch({type:'depart',gardenId,difficulty}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);fight(c);assert.equal(EXPEDITION_RUN_STEPS[c.state().route.step],'choice');walk(c);assert(c.dispatch({type:'choice',lawId:'pierce',mode}).ok);
}
function twoBattleReturn(c,mode='egg'){
 toChoice(c,mode);walk(c);assert(c.dispatch({type:'interact'}).ok);fight(c);assert.equal(c.state().route.completedBattles.length,2);assert(c.dispatch({type:'return'}).ok);assert(c.dispatch({type:'home'}).ok);
}
function legacy(s){const v=clone(s);v.version=1;for(const k of EXPEDITION_NURSERY_KEYS)delete v.meta[k];if(v.route)delete v.route.pendingFinds;return v;}
check('Strict v1->v2 neutral migration preserves actual ongoing combat HP/order/accepted damage receipts; bytes untouched before commit',()=>{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow',difficulty:5}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);
 let turns=0;while(!Object.values(c.state().roster.instances).some(i=>i.status==='dead')&&c.state().screen==='battle'){
  const s=c.state(),actor=expeditionCombatTurn(s.battle),out=c.dispatch(actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'guard'});assert(out.ok,out.reason);actualActions++;assert(++turns<200);
 }
 assert.equal(c.state().screen,'battle');assert(Object.values(c.state().roster.instances).some(i=>i.status==='dead'));
 const old=legacy(r.stored());assert(normalizeLegacyExpeditionSession(old,{owner:r.options.owner}));const raw=JSON.stringify(old);r.bytes.set(r.key,raw);const loaded=r.open().state();assert.equal(r.raw(),raw);assert.equal(loaded.version,2);assert.deepEqual(loaded.battle,old.battle);assert.deepEqual(loaded.roster,old.roster);assert.deepEqual(loaded.route.pendingLoot,old.route.pendingLoot);assert.deepEqual(loaded.route.pendingFinds,[]);
 for(const [k,v] of Object.entries(emptyExpeditionNursery()))assert.deepEqual(loaded.meta[k],v);
 const resumed=r.open();assert(resumed.dispatch({type:'pause',paused:true}).ok);assert.equal(JSON.parse(r.raw()).version,2);assert.equal(r.bytes.get(`${r.key}:backup`),raw);assert.deepEqual(resumed.state().battle,old.battle);
});
check('Malformed old roster/prototype/wrong-owner/partial-new-meta never initializes or grants nursery gifts',()=>{
 const r=rig();r.open();const valid=legacy(r.stored());for(const mutate of [s=>s.roster.instances['seed-1'].hp=0,s=>s.owner='other',s=>s.meta.eggs=[],s=>s.version=99]){
  const bad=clone(valid);mutate(bad);const raw=JSON.stringify(bad);r.bytes.set(r.key,raw);const c=r.open();assert.equal(c.state().roster,null);assert.equal(r.raw(),raw);assert.equal(c.dispatch({type:'resow'}).ok,false);
 }
 r.bytes.set(r.key,'{bad');assert.equal(r.open().state().roster,null);assert.equal(r.raw(),'{bad');
});
check('Actual egg choice stays pending; early earned return commits once; free hatch gets one fresh Lv1 ID',()=>{
 const r=rig(),c=r.open();toChoice(c,'egg');const pending=c.state(),find=pending.route.pendingFinds[0],count=Object.keys(pending.roster.instances).length;assert.equal(pending.meta.eggs.length,0);assert.equal(pending.meta.rewardIds.length,0);assert.equal(Object.keys(r.open().state().roster.instances).length,count);
 assert(c.dispatch({type:'return'}).ok);assert.equal(c.state().meta.eggs.length,1);assert(c.state().meta.rewardIds.includes(find.rewardId));assert.equal(c.state().meta.growthCharges,0,'one fight does not earn growth');assert(c.dispatch({type:'home'}).ok);
 const beforeCores=clone(c.state().meta.cores);assert(c.dispatch({type:'hatch',eggId:find.rewardId}).ok);const after=c.state(),born=Object.values(after.roster.instances).find(i=>!pending.roster.instances[i.instanceId]);assert(born);assert.equal(born.speciesId,'pierce');assert.equal(born.level,1);assert.equal(born.xp,0);assert.equal(born.status,'alive');assert.equal(after.meta.eggs.length,0);assert.deepEqual(after.meta.cores,beforeCores);
 const raw=r.raw();assert.equal(c.dispatch({type:'hatch',eggId:find.rewardId}).ok,false);assert.equal(r.raw(),raw);assert.equal(Object.keys(r.open().state().roster.instances).length,count+1);assert(after.meta.rewardIds.includes(`hatch:${find.rewardId}`));
});
check('Actual rescue is not recruited until return, keeps fixed reward receipt once and survives reload',()=>{
 const r=rig(),c=r.open();toChoice(c,'rescue');const before=c.state(),find=before.route.pendingFinds[0];assert.equal(Object.keys(before.roster.instances).length,9);assert(c.dispatch({type:'return'}).ok);const end=c.state();assert.equal(Object.keys(end.roster.instances).length,10);assert.equal(end.meta.eggs.length,0);assert(end.meta.rewardIds.includes(find.rewardId));const fresh=Object.values(end.roster.instances).find(i=>!before.roster.instances[i.instanceId]);assert(fresh&&fresh.level===1&&fresh.xp===0);
 assert.equal(end.meta.cores.chain,before.meta.cores.chain+1,'confirmed rescue grants one life-current core');const bytes=r.raw();assert.equal(c.dispatch({type:'return'}).ok,false);assert.equal(r.raw(),bytes);assert.deepEqual(r.open().state().roster,end.roster);
});
check('Actual second battle guarding wipe discards pending egg, preserves discovery/story and dead IDs (not forced kill)',()=>{
 const r=rig(),c=r.open();toChoice(c,'egg',5);const before=c.state(),reward=before.route.pendingFinds[0].rewardId;walk(c);assert(c.dispatch({type:'interact'}).ok);fight(c,true);const end=c.state();assert.equal(end.screen,'result');assert.equal(end.lastResult.kind,'wipe');assert.equal(end.route.pendingFinds.length,0);assert.equal(end.meta.eggs.length,0);assert(!end.meta.rewardIds.includes(reward));assert.equal(end.meta.growthCharges,0);
 for(const id of before.roster.discoveries)assert(end.roster.discoveries.includes(id));for(const id of before.roster.story)assert(end.roster.story.includes(id));assert.equal(Object.values(end.roster.instances).filter(i=>i.status==='dead').length,8);assert.equal(Object.values(end.roster.instances).filter(i=>i.status==='alive').length,1,'nursery chain not in combat');assert.deepEqual(r.open().state().roster,end.roster);
});
check('Actual two-encounter return earns exactly one growth; nursery10XP + chain1 paid once, no active-unit growth',()=>{
 const r=rig(),c=r.open();twoBattleReturn(c,'egg');const s=c.state(),chain=Object.values(s.roster.instances).find(i=>i.speciesId==='chain');assert.equal(s.meta.growthCharges,1);assert.equal(s.meta.cores.chain,0);const active=s.roster.party.find(Boolean),raw=r.raw();assert.equal(c.dispatch({type:'grow',instanceId:active}).ok,false);assert.equal(r.raw(),raw);
 assert(c.dispatch({type:'grow',instanceId:chain.instanceId}).ok);assert.equal(c.state().roster.instances[chain.instanceId].xp,10);assert.equal(c.state().meta.cores.chain,1);assert.equal(c.state().meta.growthCharges,0);assert.equal(c.state().meta.growthReceipts.length,1);const saved=r.raw();assert.equal(c.dispatch({type:'grow',instanceId:chain.instanceId}).ok,false);assert.equal(r.raw(),saved);assert.deepEqual(r.open().state().meta,c.state().meta);
});
check('Empty return grants no growth, restoration/relics, chain core or survivals',()=>{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);assert(c.dispatch({type:'return'}).ok);const s=c.state();assert.equal(s.meta.growthCharges,0);assert.equal(s.meta.cores.chain,0);assert.equal(s.meta.relics.length,0);assert.equal(Object.values(s.meta.restoration).reduce((a,b)=>a+b,0),0);assert(Object.values(s.roster.instances).every(i=>i.survivals===0));
});
check('Actual boss+return records garden restoration/relic once and preserves them through later empty retreat',()=>{
 const r=rig(),c=r.open();toChoice(c,'egg');for(let n=0;n<20&&c.state().screen!=='result';n++){
  if(c.state().screen==='battle'){fight(c);continue;}walk(c);const step=EXPEDITION_RUN_STEPS[c.state().route.step],command=step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'};const out=c.dispatch(command);assert(out.ok,out.reason);
 }
 const end=c.state();assert.equal(end.lastResult.kind,'return');assert(end.lastResult.boss);assert.equal(end.meta.restoration.meadow,1);assert.deepEqual(end.meta.relics,['meadow']);assert.equal(end.meta.growthCharges,1);assert(c.dispatch({type:'home'}).ok);assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);assert(c.dispatch({type:'return'}).ok);assert.equal(c.state().meta.restoration.meadow,1);assert.deepEqual(c.state().meta.relics,['meadow']);assert.equal(c.state().meta.growthCharges,1);
});
check('Declared eight-weak-pierce starting fixture: actual blossom egg first discovery survives actual wipe without acquired body',()=>{
 const r=rig();r.open();const fixture=r.stored();fixture.roster=createRoster({owner:r.options.owner,channel:'review'});for(let n=0;n<8;n++)assert(recruitInstance(fixture.roster,{instanceId:`weak-${n}`,speciesId:'pierce'}));assert(setParty(fixture.roster,Array.from({length:8},(_,n)=>`weak-${n}`)));r.bytes.set(r.key,JSON.stringify(fixture));assert(normalizeExpeditionSession(r.raw(),{owner:r.options.owner}));const c=r.open();assert(!c.state().roster.discoveries.includes('split'));toChoice(c,'egg',5,'blossom');assert(c.state().roster.discoveries.includes('split'));walk(c);assert(c.dispatch({type:'interact'}).ok);fight(c,true);assert.equal(c.state().lastResult.kind,'wipe');assert(c.state().roster.discoveries.includes('split'));assert.equal(c.state().meta.eggs.length,0);assert.equal(Object.keys(c.state().roster.instances).length,8);assert(r.open().state().roster.discoveries.includes('split'));
});
check('Storage hatch failure preserves confirmed egg, currency and exact roster/IDs; reload can complete once',()=>{
 const r=rig(),c=r.open();toChoice(c,'egg');assert(c.dispatch({type:'return'}).ok);assert(c.dispatch({type:'home'}).ok);const before=c.state(),raw=r.raw(),set=r.storage.setItem;r.storage.setItem=()=>{throw Error('quota');};assert.equal(c.dispatch({type:'hatch',eggId:before.meta.eggs[0].eggId}).ok,false);assert.equal(r.raw(),raw);assert.deepEqual(c.state().roster,before.roster);assert.deepEqual(c.state().meta,before.meta);r.storage.setItem=set;
 const resumed=r.open();assert(resumed.dispatch({type:'hatch',eggId:before.meta.eggs[0].eggId}).ok);assert.equal(Object.keys(resumed.state().roster.instances).length,Object.keys(before.roster.instances).length+1);
});
check('Declared all-nine-dead boundary: resow one NEW Lv1 base, preserve all old XP/evo/tombstones, then depart',()=>{
 const r=rig();r.open();const fixture=r.stored();grantInstanceXP(fixture.roster,'seed-3',160,'fixture-earned-level');const solo=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='solo'&&s.parents.includes('pierce'));assert(evolveInstance(fixture.roster,'seed-3',solo.id,{receiptId:'fixture-evolution',home:true,validateEvolution:()=>true}));for(const i of Object.values(fixture.roster.instances))assert(damageInstance(fixture.roster,i.instanceId,1000,{receiptId:`fixture-death:${i.instanceId}`,place:'선언된 전멸 경계'}));fixture.revision++;
 assert(createExpeditionSessionStore(r.options).save(fixture,r.raw()).ok);const c=r.open(),before=c.state();assert.equal(Object.values(before.roster.instances).filter(i=>i.status==='alive').length,0);assert(c.dispatch({type:'resow'}).ok);const after=c.state(),fresh=Object.values(after.roster.instances).filter(i=>!before.roster.instances[i.instanceId]);assert.equal(fresh.length,1);assert.equal(fresh[0].level,1);assert.equal(fresh[0].xp,0);assert.equal(fresh[0].speciesId,'pierce');assert.equal(after.roster.party[0],fresh[0].instanceId);assert.deepEqual(after.roster.tombstones,before.roster.tombstones);for(const [id,i]of Object.entries(before.roster.instances))assert.deepEqual(after.roster.instances[id],i);
 assert.equal(c.dispatch({type:'resow'}).ok,false);assert.equal(after.meta.resowIds.length,1);assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);assert.equal(r.open().state().roster.instances[fresh[0].instanceId].status,'alive');
});
check('Declared 256-instance storage boundary: failed hatch cannot consume actual earned egg or publish an ID',()=>{
 const r=rig(),c=r.open();toChoice(c,'egg');assert(c.dispatch({type:'return'}).ok);assert(c.dispatch({type:'home'}).ok);const fixture=r.stored();for(let n=Object.keys(fixture.roster.instances).length;n<256;n++)assert(recruitInstance(fixture.roster,{instanceId:`boundary-${n}`,speciesId:'pierce'}));fixture.revision++;assert(createExpeditionSessionStore(r.options).save(fixture,r.raw()).ok);
 const full=r.open(),before=r.raw(),egg=full.state().meta.eggs[0];assert.equal(full.dispatch({type:'hatch',eggId:egg.eggId}).ok,false);assert.equal(r.raw(),before);assert.equal(full.state().meta.eggs.length,1);assert.equal(Object.keys(full.state().roster.instances).length,256);
});
check('A v1 candidate cannot erase v2 earned growth charge by neutral defaults during restore/retry',()=>{
 const r=rig(),c=r.open();twoBattleReturn(c,'core');const current=r.stored();assert.equal(current.meta.growthCharges,1);const oldCandidate=legacy(current);oldCandidate.revision++;const before=r.raw(),out=createExpeditionSessionStore(r.options).save(oldCandidate,before);assert.equal(out.ok,false,'v1 neutral load migration must not overwrite existing v2 nursery');assert.equal(r.raw(),before);
});
check('Current-byte rewinds cannot remove consumed reward/growth/restoration history; active egg with hatch receipt invalid',()=>{
 const r=rig(),c=r.open();twoBattleReturn(c,'egg');const egg=c.state().meta.eggs[0],old=r.stored();assert(c.dispatch({type:'hatch',eggId:egg.eggId}).ok);const current=r.stored(),store=createExpeditionSessionStore(r.options),rewind=clone(old);rewind.revision=current.revision+1;assert.equal(store.save(rewind,r.raw()).ok,false);
 const resurrectEgg=clone(current);resurrectEgg.meta.eggs.push(egg);assert.equal(normalizeExpeditionSession(resurrectEgg,{owner:r.options.owner})===null,true,'hatched egg may not return to stock even with consumed receipt');
});
console.log(`Independent nursery: ${passed} PASS / ${failed} FAIL; ${actualActions} actual accepted combat actions. All-dead and legacy envelopes are declared boundary fixtures; policy10XP/chain1/free hatch is local tuning, not ZIP numbers. No cloud CAS/browser/device/human-balance claim.`);
if(failed)process.exitCode=1;
