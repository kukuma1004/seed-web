import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readExpeditionAccountReleaseStatus,expeditionAccountReleaseMessage,EXPEDITION_ACCOUNT_RELEASE_POLICY} from '../src/expedition/account-release.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('async function showSeedExpedition(){'),end=source.indexOf('let defenseLoadSerial=',start);
assert(start>=0&&end>start);const body=source.slice(start,end).replaceAll('await import(','await importModule(');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
let checks=0;
async function run(policy,{offline=false,changed=false,released=true,review=false}={}){
 const original=new Map([['existing-account','opaque-original'],['pending-runtime','opaque-pending']]),records=new Map(original),calls={auth:0,fetch:0,device:0,open:0,mount:0,back:0};let uid='host-owner';
 const dom={overlay:{hidden:false},toast:{textContent:''}},account={user:()=>({uid,isAnonymous:false}),tokenSession:async()=>{calls.auth++;return {uid,idToken:'synthetic'};}};
 const controller={close:async()=>({ok:true})};
 const importModule=async path=>{
  if(path==='./expedition/view.js')return {mountExpedition:o=>{calls.mount++;assert.equal(o.owner,'host-owner');if(!review)assert.equal(o.createController(),controller);return {fixture:true};}};
  if(path==='./expedition/account-release.js')return {readExpeditionAccountReleaseStatus:o=>readExpeditionAccountReleaseStatus({...o,fetchImpl:async()=>{calls.fetch++;if(changed)uid='new-owner';if(offline)throw Error('offline');return new Response(JSON.stringify(policy));}}),expeditionAccountReleaseMessage,expeditionAccountDeviceId:()=>{calls.device++;return 'private-device';}};
  if(path==='./expedition/account-controller.js')return {openExpeditionAccountController:async o=>{calls.open++;assert.equal(o.enabled(),true);assert.equal(o.storage,records);return {ok:true,controller};}};
  throw Error('unexpected import');
 };
 const execute=new AsyncFunction('account','EXPEDITION_ACCOUNT_RELEASED','localInspection','developerRun','touch','keys','stopAnimation','$','showDungeon','startAnimation','audio','rawStorage','FIREBASE_APP','importModule',`let expeditionLoadSerial=0,mode='dungeon',expeditionScreen=null,last=0,realLast=0;${body};await showSeedExpedition();return {mode,expeditionScreen};`);
 const out=await execute(account,released,review,false,{reset(){}},new Set(),()=>{},k=>dom[k.slice(1)],()=>{calls.back++;},()=>{},{},records,{databaseURL:'https://seed-test.firebaseio.com/'},importModule);
 assert.deepEqual(records,original,'no rejected entry rewrites pending or confirmed storage');return {calls,out,toast:dom.toast.textContent};
}
for(const [name,policy,options] of [['future runtime',{...EXPEDITION_ACCOUNT_RELEASE_POLICY,runtimeVersion:EXPEDITION_ACCOUNT_RELEASE_POLICY.runtimeVersion+1},{}],['future combat',{...EXPEDITION_ACCOUNT_RELEASE_POLICY,combatVersion:EXPEDITION_ACCOUNT_RELEASE_POLICY.combatVersion+1},{}],['legacy boolean',true,{}],['closed',false,{}],['malformed',{enabled:true},{}],['offline',null,{offline:true}],['account changed',EXPEDITION_ACCOUNT_RELEASE_POLICY,{changed:true}]]){
 const r=await run(policy,options);assert.equal(r.calls.back,1);assert.equal(r.calls.device,0);assert.equal(r.calls.open,0);assert.equal(r.calls.mount,0);assert(r.toast);if(name.startsWith('future'))assert.match(r.toast,/최신 버전/);checks++;console.log('PASS actual main entry '+name+' preserves account/pending, no lease/controller/mount');
}
const ready=await run(EXPEDITION_ACCOUNT_RELEASE_POLICY);assert.equal(ready.calls.open,1);assert.equal(ready.calls.device,1);assert.equal(ready.calls.mount,1);assert.equal(ready.calls.back,0);checks++;
const off=await run(EXPEDITION_ACCOUNT_RELEASE_POLICY,{released:false});assert.equal(off.calls.auth,0);assert.equal(off.calls.fetch,0);assert.equal(off.calls.open,0);checks++;
const review=await run(null,{released:false,review:true});assert.equal(review.calls.fetch,0);assert.equal(review.calls.open,0);assert.equal(review.calls.mount,1);checks++;
console.log(`Version policy actual main closure: ${checks} cases PASS. Stub DOM/Auth/HTTP; not production login/browser/device evidence.`);
