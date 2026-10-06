import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createAccountLoginFlow} from '../src/account-login-flow.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function rig(){const timers=new Map(),states=[];let next=0;const flow=createAccountLoginFlow({onState:s=>states.push(s),setTimer:fn=>{timers.set(++next,fn);return next;},clearTimer:id=>timers.delete(id)});return{flow,timers,states,fire(){const [id,fn]=[...timers][0];timers.delete(id);fn();}};}
{
 const r=rig(),auth=deferred(),sync=deferred();let authCalls=0,syncCalls=0;
 const a=r.flow.run(()=>{authCalls++;return auth.promise;},()=>{syncCalls++;return sync.promise;}),b=r.flow.run(()=>{throw Error('duplicate picker');},()=>{});
 assert.equal(a,b);await Promise.resolve();assert.equal(authCalls,1);assert.equal(syncCalls,0);assert.equal(r.flow.state().phase,'auth');
 r.fire();assert.equal(r.flow.state().waiting,true);assert.equal(syncCalls,0,'waiting is not successful authentication');assert.equal(r.flow.run(()=>{},()=>{}),a,'late reply still owns the sole operation');
 auth.resolve({uid:'existing-uid'});await Promise.resolve();await Promise.resolve();assert.equal(r.flow.state().phase,'sync');assert.equal(r.flow.state().waiting,false);assert.equal(syncCalls,1);
 r.fire();assert.equal(r.flow.state().waiting,true);sync.resolve({changed:false});assert.deepEqual(await a,{changed:false});assert.deepEqual(r.flow.state(),{busy:false,phase:'idle',waiting:false});assert.equal(r.timers.size,0);
 assert(!JSON.stringify(r.states).includes('existing-uid'),'phase notifications contain no account data');
 console.log('PASS Pending and late provider replies: one picker, sync only after auth, phase-specific waiting, no false readiness, no leaked timer');
}
for(const failAt of ['auth','sync']){
 const r=rig(),error=Object.assign(Error('cancelled'),{code:'auth/popup-closed-by-user'});let syncCalls=0;
 await assert.rejects(r.flow.run(()=>failAt==='auth'?Promise.reject(error):Promise.resolve(),()=>{syncCalls++;throw error;}),e=>e===error);
 assert.equal(syncCalls,failAt==='sync'?1:0);assert.equal(r.timers.size,0);assert.equal(r.flow.state().busy,false);
 assert.equal(await r.flow.run(()=>Promise.resolve(),()=>Promise.resolve('retry')),'retry');assert.equal(r.timers.size,0);
}
console.log('PASS Provider cancellation and sync error preserve the real error and release the operation for a later explicit retry');
// Execute the shipped host closure, not a rewritten ideal flow: opening the
// game must remain after authentication, cloud read and renewed access check.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf(' const busy=async(action,provider)=>'),end=main.indexOf(" if($('#account-login-recheck'))",start);
assert(start>0&&end>start);
for(const scenario of ['normal','cloud-changed','auth-failure','sync-failure','access-failure']){
 const calls=[],r=rig(),auth=deferred();let accessReady=false;
 const context={accountLoginFlow:r.flow,backfillPersonalBests:()=>calls.push('backfill'),cloud:{retry:async()=>{calls.push('sync');if(scenario==='sync-failure')throw Error('sync-failure');return{changed:scenario==='cloud-changed'};}},refreshAccessMode:async()=>{calls.push('access');if(scenario==='access-failure')throw Error('access-failure');accessReady=true;},location:{reload:()=>{assert(accessReady);calls.push('reload');}},showEntry:()=>{assert(accessReady);calls.push('entry');},backfillBossVeterans:()=>calls.push('veterans'),webTelemetry:{loginFailure:()=>calls.push('failure')},showAccount:()=>calls.push('account-error'),authMessage:e=>e.message};
 const busy=vm.runInNewContext(main.slice(start,end)+'\nbusy',context),task=busy(()=>{calls.push('auth');return auth.promise;},'google');await Promise.resolve();assert.deepEqual(calls,['auth']);r.fire();assert.deepEqual(calls,['auth'],'waiting cannot open game or sync');
 if(scenario==='auth-failure')auth.reject(Error('cancelled'));else auth.resolve();await task;
 const expected=scenario==='normal'?['auth','backfill','sync','access','entry','veterans']:scenario==='cloud-changed'?['auth','backfill','sync','access','reload']:scenario==='auth-failure'?['auth','failure','account-error']:scenario==='sync-failure'?['auth','backfill','sync','failure','account-error']:['auth','backfill','sync','access','failure','account-error'];
 assert.deepEqual(calls,expected);assert.equal(r.timers.size,0);assert.equal(r.flow.state().busy,false);
}
console.log('PASS Five actual main login-host seams: cloud/access checks precede entry or reload; waiting/failure cannot bypass access');
