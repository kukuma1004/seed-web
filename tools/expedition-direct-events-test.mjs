import assert from 'node:assert/strict';
import {createExpeditionController} from '../src/expedition/controller.js';
import {createFreshExpeditionAccount} from '../src/expedition/account-codec.js';
import {projectExpeditionRuntimeTransaction,nextExpeditionRuntimeAccount,EXPEDITION_RUNTIME_TRANSACTION_VERSION} from '../src/expedition/account-runtime.js';
import {EXPEDITION_GARDENS,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';

const owner='direct-event-qa',now=1700000000001;
const writer={deviceId:'direct-pc',leaseId:'direct-lease',issuedAt:now-1,expiresAt:now+119999};
let serial=0,actions=0,events=0;
const identity=()=>String(++serial);
const tx=(a,command,ids=[],version=5)=>({version,kind:'runtime',receiptId:`write-${a.revision+1}-${identity()}`,commands:[command],generatedIds:ids});
assert.equal(EXPEDITION_RUNTIME_TRANSACTION_VERSION,5);
const fresh=createFreshExpeditionAccount({owner,now,writer,idFactory:identity});
const departed=await nextExpeditionRuntimeAccount(fresh,{owner,writer,now,transaction:tx(fresh,{type:'depart',gardenId:'moon',difficulty:1},['direct-route'])});
assert(departed.ok,departed.reason);const a=departed.record,before=JSON.stringify(a);
assert.equal(a.state.route.position,0);
for(const version of [1,2,3,4]){
 assert.equal(projectExpeditionRuntimeTransaction(a,{owner,transaction:tx(a,{type:'interact'},[],version)}).ok,false,'historical receipts retain the original distance rule');
}
const accepted=await nextExpeditionRuntimeAccount(a,{owner,writer,now,transaction:tx(a,{type:'interact'})});
assert(accepted.ok,accepted.reason);assert.equal(accepted.record.state.route.step,2);assert.equal(accepted.record.state.route.position,0);assert.equal(accepted.record.state.route.elapsedSeconds,0);
assert.equal(JSON.stringify(a),before,'direct event projection is pure');
assert.equal(projectExpeditionRuntimeTransaction(accepted.record,{owner,transaction:accepted.transaction}).ok,false,'exact-parent event receipt cannot be replayed');
for(const command of [{type:'choice',lawId:'orbit'},{type:'rest'},{type:'boss'}])assert.equal(projectExpeditionRuntimeTransaction(a,{owner,transaction:tx(a,command)}).ok,false,'removing distance never removes event-stage restrictions');
const battle=await nextExpeditionRuntimeAccount(accepted.record,{owner,writer,now,transaction:tx(accepted.record,{type:'interact'})});
assert(battle.ok,battle.reason);assert.equal(battle.record.state.screen,'battle');assert.equal(battle.record.state.route.position,0);

for(const gardenId of Object.keys(EXPEDITION_GARDENS)){
 const data=new Map();let writes=0;
 const options={owner,currentOwner:()=>owner,idFactory:identity,storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes++;data.set(k,v);}}};
 const c=createExpeditionController(options);assert(c.dispatch({type:'depart',gardenId,difficulty:1}).ok);
 while(['explore','battle'].includes(c.state().screen)){
  const s=c.state();assert.equal(s.route.position,0);assert.equal(s.route.elapsedSeconds,0,'no fictitious walking duration');
  let command;
  if(s.screen==='battle'){
   const actor=expeditionCombatTurn(s.battle),target=s.battle.units.find(u=>u.side==='enemy'&&!u.dead&&u.slot<5);
   const kind=actor.actions.skill1.some(op=>['damage','split','return'].includes(op.type))?'skill1':'attack';
   command=actor.side==='enemy'?{type:'enemy'}:{type:'action',kind,targetId:target.id};actions++;
  }else{
   const step=EXPEDITION_RUN_STEPS[s.route.step];
   command=step==='choice'?{type:'choice',lawId:'chain'}:step==='rest'?{type:'rest'}:step==='return_or_boss'?{type:'boss'}:{type:'interact'};events++;
  }
  const count=writes,revision=s.revision,result=c.dispatch(command);assert(result.ok,result.reason);assert.equal(c.state().revision,revision+1,'one durable checkpoint per explicit choice or paid action');assert(writes-count>=1&&writes-count<=2,'current checkpoint plus its preserved backup only');
  assert(actions<2000);
 }
 assert.equal(c.state().screen,'result');const saved=c.state();const reopened=createExpeditionController(options);
 assert.deepEqual(reopened.state().roster,saved.roster);assert.deepEqual(reopened.state().lastResult,saved.lastResult);
 assert.equal(reopened.dispatch({type:'interact'}).ok,false,'result cannot re-grant encounter rewards');
}

// An interrupted older walking checkpoint is retained, not rewritten or
// promoted into an account. Its next event works without finishing the walk.
const saved=new Map(),options={owner,currentOwner:()=>owner,idFactory:identity,storage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)}};
const old=createExpeditionController(options);assert(old.dispatch({type:'depart',gardenId:'snow',difficulty:1}).ok);
for(let n=0;n<8;n++)assert(old.dispatch({type:'move',dx:1,dt:.1}).ok);old.close();
const reopened=createExpeditionController(options),oldPosition=reopened.state().route.position;
assert(oldPosition>0&&oldPosition<12.6);assert(reopened.dispatch({type:'interact'}).ok);assert.equal(reopened.state().route.step,2);
console.log(`PASS direct event runtimeV5: eight no-walk courses, ${events} event choices/${actions} paid battle actions, one save per intent; V1–V4 distance/replay/stage boundaries and old partial-walk restore preserved. Local synthetic evidence only.`);
