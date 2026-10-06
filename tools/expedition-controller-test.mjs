import assert from 'node:assert/strict';
import {createExpeditionController} from '../src/expedition/controller.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {normalizeExpeditionSession,expeditionSessionKey} from '../src/expedition/session.js';

function rig(owner='qa'){
 const bytes=new Map();let n=0,uid=owner,writes=0,blocked=false;
 const storage={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('disk');writes++;bytes.set(k,v);}};
 const options={storage,owner,currentOwner:()=>uid,idFactory:()=>String(++n)};
 return {bytes,storage,options,open:()=>createExpeditionController(options),writes:()=>writes,changeOwner:v=>uid=v,block:()=>blocked=true};
}
function walk(c){for(let i=0;i<36;i++)assert(c.dispatch({type:'move',dx:1,dt:.1}).ok);}
function battle(c){let actions=0;while(c.state().screen==='battle'){
 const s=c.state(),u=expeditionCombatTurn(s.battle);assert(u);
 const target=s.battle.units.filter(v=>v.side==='enemy'&&!v.dead&&v.slot<5).sort((a,b)=>a.slot-b.slot)[0];
 const kind=u.actions.skill1.some(op=>['damage','split','return'].includes(op.type))?'skill1':'attack';
 const r=c.dispatch(u.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id});
 assert(r.ok,r.reason);assert(++actions<300);
 }return actions;}
function run(c,garden,difficulty=1){assert(c.dispatch({type:'depart',gardenId:garden,difficulty}).ok);let guard=0,total=0;
 while(c.state().screen==='explore'||c.state().screen==='battle'){
  assert(++guard<30);if(c.state().screen==='battle'){total+=battle(c);continue;}
  walk(c);const step=EXPEDITION_RUN_STEPS[c.state().route.step];
  const command=step==='choice'?{type:'choice',lawId:'chain'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'};
  const result=c.dispatch(command);assert(result.ok,result.reason);
 }return total;}

{
 const r=rig(),c=r.open();assert.equal(c.state().saveState,'saved');assert.equal(Object.keys(c.state().roster.instances).length,9);assert.equal(c.state().roster.party.length,8);
 assert(!c.dispatch({type:'depart',gardenId:'not-a-garden'}).ok);assert.equal(c.state().screen,'home');
 assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);const writes=r.writes();walk(c);assert(r.writes()>writes&&r.writes()-writes<=2,'one bounded movement checkpoint, never every frame');
 assert(c.dispatch({type:'interact'}).ok);walk(c);assert(c.dispatch({type:'interact'}).ok);assert.equal(c.state().screen,'battle');
 const u=expeditionCombatTurn(c.state().battle),side=u.side,action=side==='enemy'?{type:'enemy'}:{type:'action',kind:'skill1'};
 assert(c.dispatch(action).ok);const a=c.state(),reload=r.open();assert.deepEqual(reload.state().battle,a.battle);assert.deepEqual(reload.state().roster,a.roster,'action and individual damage load together');
 const obsolete=c.state();assert(reload.dispatch(expeditionCombatTurn(reload.state().battle).side==='enemy'?{type:'enemy'}:{type:'action',kind:'guard',targetId:'ignored',reserveId:'ignored'}).ok);
 assert(!c.dispatch(expeditionCombatTurn(c.state().battle).side==='enemy'?{type:'enemy'}:{type:'action',kind:'guard'}).ok,'stale tab must not overwrite combat receipts');assert.deepEqual(c.state().roster,obsolete.roster);
}
{
 const r=rig(),c=r.open();assert(c.dispatch({type:'depart',gardenId:'meadow'}).ok);const raw=r.bytes.get(expeditionSessionKey(r.options.owner,'review'));r.block();
 for(let i=0;i<31;i++)assert(c.dispatch({type:'move',dx:1,dt:.1}).ok);
 assert(!c.dispatch({type:'move',dx:1,dt:.1}).ok);assert.equal(c.state().route.step,1,'failed movement save does not advance stage');assert(c.state().paused);assert.equal(c.state().saveState,'error');assert.equal(r.bytes.get(expeditionSessionKey(r.options.owner,'review')),raw,'failed checkpoint preserves durable original');assert(!c.dispatch({type:'interact'}).ok);
}
{
 const r=rig('sudden-close'),c=r.open();assert(c.dispatch({type:'depart',gardenId:'fire'}).ok);const initialWrites=r.writes(),roster=c.state().roster;
 for(let i=0;i<31;i++)assert(c.dispatch({type:'move',dx:1,dt:1/60}).ok);
 assert.equal(r.writes(),initialWrites,'no serialization during the partial batch');
 assert(c.dispatch({type:'move',dx:1,dt:1/60}).ok);const saved=c.state();
 for(let i=0;i<4;i++)assert(c.dispatch({type:'move',dx:1,dt:1/60}).ok);
 const reload=r.open();assert.equal(reload.state().route.position,saved.route.position,'abandoned controller restores the last movement checkpoint without pause/close');assert.deepEqual(reload.state().roster,roster);assert.equal(reload.state().route.step,1);assert.equal(reload.state().route.pendingLoot.length,0);
 assert(reload.dispatch({type:'move',dx:1,dt:.1}).ok);reload.close();
 for(let i=0;i<27;i++)assert(c.dispatch({type:'move',dx:1,dt:1/60}).ok);
 assert(!c.dispatch({type:'move',dx:1,dt:1/60}).ok,'stale movement checkpoint cannot overwrite the reopened controller');assert(c.state().paused);
}
{
 const r=rig(),c=r.open();r.changeOwner('other');assert(!c.dispatch({type:'depart',gardenId:'meadow'}).ok);assert(c.state().paused);
 assert.throws(()=>createExpeditionController({...r.options,channel:'account'}),/transport/);
 const key=expeditionSessionKey('broken','review');r.bytes.set(key,'{not-json');const broken=createExpeditionController({...r.options,owner:'broken',currentOwner:()=> 'broken'});assert.equal(broken.state().roster,null);assert.equal(r.bytes.get(key),'{not-json');
}
let total=0,outcomes=[];
for(const garden of Object.keys(EXPEDITION_GARDENS)){
 const r=rig(`qa-${garden}`),c=r.open();total+=run(c,garden);const s=c.state();assert.equal(s.screen,'result');assert(s.lastResult);assert.deepEqual(r.open().state().roster,s.roster);assert.deepEqual(r.open().state().lastResult,s.lastResult);
 const key=expeditionSessionKey(r.options.owner,'review'),raw=r.bytes.get(key);assert(normalizeExpeditionSession(raw,{owner:r.options.owner}));
 const ids=s.route.partyIds.filter(Boolean);for(const id of ids)if(s.roster.instances[id].status==='dead'){assert(s.roster.tombstones[id]);assert(!s.roster.party.includes(id));}
 if(s.lastResult.kind==='return'){
  assert.equal(s.meta.returnCount,1);assert.equal(s.meta.cores.chain,1);assert(!c.dispatch({type:'return'}).ok);assert.equal(c.state().meta.returnCount,1);
 }else assert(Object.values(s.meta.cores).every(n=>n===0),'wipe must discard provisional cores');
 assert(c.dispatch({type:'home'}).ok);assert.equal(c.state().route,null);outcomes.push(`${garden}:${s.lastResult.kind}/${s.lastResult.survivors}`);
}
console.log(`PASS expedition controller: 8 garden simulation paths, ${total} accepted actions; ${outcomes.join(', ')}. Local review only; not human balance or cloud/device QA.`);
