import assert from 'node:assert/strict';
import {createExpeditionController} from '../src/expedition/controller.js';
import {createExpeditionSessionStore,expeditionSessionKey,normalizeExpeditionSession} from '../src/expedition/session.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {damageInstance,grantInstanceXP} from '../src/expedition/roster.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
const clone=x=>JSON.parse(JSON.stringify(x));let passed=0,failed=0,accepted=0;
const check=(label,fn)=>{try{fn();passed++;console.log(`PASS ${label}`);}catch(e){failed++;console.error(`FAIL ${label}: ${e.message}`);}};
function rig(owner='independent'){
 const bytes=new Map();let uid=owner,seq=0,writes=0;
 const storage={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>{writes++;bytes.set(k,v);}};
 const options={storage,owner,currentOwner:()=>uid,idFactory:()=>String(++seq)};
 const key=expeditionSessionKey(owner,'review');return {bytes,storage,options,key,open:()=>createExpeditionController(options),owner:v=>uid=v,writes:()=>writes,raw:()=>bytes.get(key),stored:()=>JSON.parse(bytes.get(key))};
}
function walk(c){for(let n=0;n<70;n++)assert(c.dispatch({type:'move',dx:1,dt:.05}).ok);}
function fight(c){let count=0;while(c.state().screen==='battle'){
 const s=c.state(),actor=expeditionCombatTurn(s.battle),target=s.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&u.slot<5).sort((a,b)=>a.slot-b.slot)[0];assert(actor&&target);
 const kind=actor.actions.skill1.some(o=>['damage','split','return'].includes(o.type))?'skill1':'attack';
 const result=c.dispatch(actor.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id});assert(result.ok,result.reason);assert(++count<300);accepted++;
 }}
function course(c,difficulty=1){assert(c.dispatch({type:'depart',gardenId:'meadow',difficulty}).ok);for(let steps=0;steps<30;steps++){
 const state=c.state();if(state.screen==='result')return state;if(state.screen==='battle'){fight(c);continue;}
 assert.equal(state.screen,'explore');walk(c);const step=EXPEDITION_RUN_STEPS[c.state().route.step];
 const command=step==='choice'?{type:'choice',lawId:'orbit'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'};
 const result=c.dispatch(command);assert(result.ok,result.reason);
 }throw Error('course limit');}
check('Old six-character prototype/kind mismatch cannot promote; malformed bytes preserved',()=>{
 const r=rig();r.bytes.set(r.key,JSON.stringify({kind:'seed-expedition',version:1,player:{hp:100}}));const old=r.raw(),c=r.open();assert.equal(c.state().roster,null);assert.equal(r.raw(),old);assert.equal(c.dispatch({type:'depart',gardenId:'meadow'}).ok,false);
 assert.throws(()=>createExpeditionController({...r.options,channel:'account'}));assert.throws(()=>createExpeditionController({...r.options,channel:'guest'}));assert.equal(normalizeExpeditionSession(old,{owner:r.options.owner}),null);
});
check('Nine actual base seeds / eight party / chain remains in nursery and owner change causes zero writes',()=>{
 const r=rig(),c=r.open(),s=c.state();assert.equal(Object.keys(s.roster.instances).length,9);assert.equal(s.roster.party.length,8);const chain=Object.values(s.roster.instances).find(i=>i.speciesId==='chain');assert(chain&&!s.roster.party.includes(chain.instanceId));
 const before=r.raw(),writes=r.writes();r.owner('other');assert.equal(c.dispatch({type:'depart',gardenId:'meadow'}).ok,false);assert.equal(r.raw(),before);assert.equal(r.writes(),writes);assert(c.state().paused);
});
check('Death cannot rewind with exact-current bytes and artificially newer revision',()=>{
 const r=rig();r.open();const alive=r.stored(),store=createExpeditionSessionStore(r.options),dead=clone(alive);dead.revision++;assert(damageInstance(dead.roster,'seed-1',1000,{receiptId:'death',place:'실제 죽음 경계'}));const saved=store.save(dead,r.raw());assert(saved.ok);
 const candidate=clone(alive);candidate.revision=saved.session.revision+1;const before=r.raw(),writes=r.writes(),out=store.save(candidate,before);assert.equal(out.ok,false,'new revision does not authorize erasing a tombstone');assert.equal(r.raw(),before);assert.equal(r.writes(),writes);
});
check('Accepted XP/receipt/discovery/story/result cannot rewind with exact-current bytes',()=>{
 const r=rig();r.open();const original=r.stored(),store=createExpeditionSessionStore(r.options),next=clone(original);next.revision++;grantInstanceXP(next.roster,'seed-1',20,'accepted-xp');next.roster.story.push('story');next.meta.committedRuns.push('run-proof');next.meta.returnCount=1;
 assert(store.save(next,r.raw()).ok);const candidate=clone(original);candidate.revision=2;const before=r.raw();assert.equal(store.save(candidate,before).ok,false);assert.equal(r.raw(),before);
});
check('Owner changes inside final readback: no successful acknowledgement',()=>{
 const r=rig();r.open();const candidate=r.stored();candidate.revision++;let read=0;const baseGet=r.storage.getItem;r.storage.getItem=k=>{const value=baseGet(k);if(++read===4)r.owner('changed-after-read');return value;};const store=createExpeditionSessionStore(r.options),result=store.save(candidate,r.raw());assert.equal(read,4);assert.equal(result.ok,false);assert.equal(result.reason,'owner changed');
});
check('Owner changes during GET, backup write, or backup readback cause zero primary overwrite',()=>{
 for(const boundary of ['get','backup-write','backup-read']){
  const r=rig();r.open();const candidate=r.stored();candidate.revision++;const old=r.raw(),baseGet=r.storage.getItem,baseSet=r.storage.setItem;
  r.storage.getItem=k=>{const v=baseGet(k);if(boundary==='get'||boundary==='backup-read'&&k.endsWith(':backup'))r.owner('changed');return v;};
  r.storage.setItem=(k,v)=>{baseSet(k,v);if(boundary==='backup-write'&&k.endsWith(':backup'))r.owner('changed');};
  const result=createExpeditionSessionStore(r.options).save(candidate,old);assert.equal(result.ok,false);assert.equal(r.raw(),old);
 }
});
check('Stale controller cannot overwrite a newly accepted combat action; critical state saved atomically',()=>{
 const r=rig(),a=r.open();assert(a.dispatch({type:'depart',gardenId:'meadow'}).ok);walk(a);assert(a.dispatch({type:'interact'}).ok);walk(a);assert(a.dispatch({type:'interact'}).ok);assert.equal(a.state().screen,'battle');const b=r.open(),actor=expeditionCombatTurn(b.state().battle);
 const first=b.dispatch(actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'attack'});assert(first.ok);const acceptedRaw=r.raw(),obsolete=a.state();const oldActor=expeditionCombatTurn(obsolete.battle);
 assert.equal(a.dispatch(oldActor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'guard'}).ok,false);assert.equal(r.raw(),acceptedRaw);assert(a.state().paused);assert.deepEqual(r.open().state().battle,b.state().battle);assert.deepEqual(r.open().state().roster,b.state().roster);
});
check('Every critical storage failure pauses without accepting changed route or battle',()=>{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);walk(c);const state=c.state(),raw=r.raw();r.storage.setItem=()=>{throw Error('quota');};const out=c.dispatch({type:'interact'});assert.equal(out.ok,false);assert(c.state().paused);assert.equal(c.state().route.step,state.route.step);assert.equal(r.raw(),raw);
});
check('Strict route owns actual individual IDs, no inherited constructor/prototype party member',()=>{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);for(const id of ['constructor','__proto__','toString','missing']){const bad=r.stored();bad.route.partyIds[0]=id;assert.equal(normalizeExpeditionSession(bad,{owner:r.options.owner}),null,`route member ${id}`);}
});
check('Result is a coherent terminal route/result and cannot contain a live battle',()=>{
 const r=rig();r.open();const malformed=r.stored();malformed.screen='result';assert.equal(normalizeExpeditionSession(malformed,{owner:r.options.owner}),null,'result with no terminal route/summary');
});
check('Battle-free return cannot farm progression or shared-survival receipts',()=>{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);const out=c.dispatch({type:'return'});assert(out.ok,'early retreat remains possible');const s=c.state();assert.equal(s.roster.instances['seed-1'].xp,0,'no encounter return XP');assert.equal(s.roster.instances['seed-1'].survivals,0,'empty trip is not earned common survival');assert.equal(Object.values(s.meta.cores).reduce((n,v)=>n+v,0),0);
});
check('Actual earned two-course return once; material/parent/home level gates and one-way evolution',()=>{
 const r=rig(),c=r.open();for(let trip=0;trip<2;trip++){const end=course(c);assert.equal(end.lastResult.kind,'return');const before=r.raw(),materials=clone(end.meta);assert.equal(c.dispatch({type:'return'}).ok,false);assert.equal(r.raw(),before);assert.deepEqual(c.state().meta,materials);assert.deepEqual(r.open().state().roster,end.roster);assert(c.dispatch({type:'home'}).ok);}
 const s=c.state(),survivor=Object.values(s.roster.instances).find(i=>i.level>=5&&i.status==='alive');assert(survivor,JSON.stringify(Object.values(s.roster.instances).map(i=>[i.speciesId,i.level,i.status])));const id=survivor.instanceId,solo=Object.values(EXPEDITION_SPECIES).find(i=>i.kind==='fusion'&&i.parents.includes(survivor.speciesId)&&i.parents.includes('pierce'));assert(solo);
 assert(s.roster.instances[id].level>=5);const before=s.meta.cores.pierce,result=c.dispatch({type:'evolve',instanceId:id,to:solo.id});assert(result.ok,result.reason);assert.equal(c.state().meta.cores.pierce,before-1);assert.equal(c.state().roster.instances[id].speciesId,solo.id);assert.equal(c.state().roster.instances[id].instanceId,id);
 const bytes=r.raw();assert.equal(c.dispatch({type:'evolve',instanceId:id,to:'pierce'}).ok,false);assert.equal(r.raw(),bytes);assert.deepEqual(r.open().state().roster,c.state().roster);
});
check('Missing core/material/individual risk and wrong canonical parent consume nothing (declared boundary fixture)',()=>{
 const r=rig();r.open();let s=r.stored();grantInstanceXP(s.roster,'seed-3',500,'fixture-xp');s.revision++;const store=createExpeditionSessionStore(r.options);assert(store.save(s,r.raw()).ok);let c=r.open();const fusion=Object.values(EXPEDITION_SPECIES).find(i=>i.kind==='fusion'&&i.parents.includes('pierce'));let before=r.raw();assert.equal(c.dispatch({type:'evolve',instanceId:'seed-3',to:fusion.id}).ok,false);assert.equal(r.raw(),before);
 s=r.stored();s.meta.cores[fusion.laws.find(l=>l!=='pierce')]=1;s.revision++;assert(store.save(s,r.raw()).ok);c=r.open();assert(c.dispatch({type:'evolve',instanceId:'seed-3',to:fusion.id}).ok);const final=Object.values(EXPEDITION_SPECIES).find(i=>i.kind==='final'&&i.parents.includes(fusion.id));s=r.stored();s.meta.cores[final.dominantLaw]=2;s.meta.awakenMaterials=1;s.revision++;assert(store.save(s,r.raw()).ok);c=r.open();before=r.raw();assert.equal(c.dispatch({type:'evolve',instanceId:'seed-3',to:final.id}).ok,false,'no individual high-risk');assert.equal(r.raw(),before);
});
check('Actual higher-risk combat loss persists each dead individual and discards provisional loot',()=>{
 const r=rig(),c=r.open(),end=course(c,5);const dead=Object.values(end.roster.instances).filter(i=>i.status==='dead');assert(dead.length>0,'actual enemy commands must produce at least one death');assert.deepEqual(r.open().state().roster,end.roster);for(const i of dead){assert(end.roster.tombstones[i.instanceId]);assert(!end.roster.party.includes(i.instanceId));}
 if(end.lastResult.kind==='wipe')assert.equal(Object.values(end.meta.cores).reduce((n,v)=>n+v,0),0);assert.equal(end.route.pendingLoot.length,0);
});
console.log(`Independent session review: ${passed} PASS / ${failed} FAIL, ${accepted} actual accepted combat actions. Review-only Node/fake storage; no cloud CAS, human balance, browser or physical device proof.`);
if(failed)process.exitCode=1;
