import assert from 'node:assert/strict';
import {createCloudSync} from '../src/cloud-sync.js';
import {CLOUD_OWNER_KEY,collectCloudSnapshot,normalizeCloudSnapshot} from '../src/cloud-save.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile} from '../src/account-profile.js';
import {DISCOVERIES_KEY} from '../src/discoveries.js';
import {SHOP_KEY} from '../src/shop.js';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossVictoryLedger,bossVictoryCloudKey} from '../src/boss-victory-events.js';
import {bossVictoryAccountKey,installBossVictoryAccount,queueBossAccountVictory,readBossVictoryAccount} from '../src/boss-victory-account.js';
const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
class Memory{
 constructor(values={}){this.data=new Map(Object.entries(values).map(([k,v])=>[k,String(v)]));}
 get length(){return this.data.size;}key(i){return [...this.data.keys()][i]??null;}
 getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}
}
const uid='cutover-owner',epoch='cutover-02';
const first={mode:'journey',runId:'server-first',boss:'austin',ordinal:1};
const second={...first,mode:'survival',runId:'pc-second'},third={...first,mode:'defense',runId:'phone-third'};
function setup({migrated=true,event=true}={}){
 const initial=new Memory({[ACCOUNT_PROFILE_KEY]:JSON.stringify({version:1,austinWins:8}),[SHOP_KEY]:JSON.stringify({version:2,coins:200})});
 const save=collectCloudSnapshot(initial,{revision:1,updatedAt:1000});
 const seal=createBossMigrationSeal(uid,epoch,{...save,discoveries:{...save.discoveries,bosses:['austin','austinveteran']}},2000);
 const ledger=createBossVictoryLedger(uid,epoch,seal.baseline);
 ledger.events=event?{[bossVictoryCloudKey(first)]:{epoch,...first}}:{};
 const state={save:copy(save),seal:migrated?seal:null,ledger:migrated?ledger:null,puts:[],requests:[],revision:1,hook:null,failReadback:false};
 const response=(status,value,tag=null)=>({ok:status>=200&&status<300,status,headers:{get:name=>name.toLowerCase()==='etag'?tag:null},json:async()=>copy(value)});
 const fetchImpl=async(url,options={})=>{
  const path=decodeURIComponent(new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'')),method=options.method||'GET';
  state.requests.push({path,method});if(state.hook)state.hook(path,method);
  if(path===`seedUsers/${uid}/bossMigration`)return response(200,state.seal);
  if(path===`seedUsers/${uid}/duelStory`||path===`seedUserRewards/${uid}`)return response(200,null,'empty');
  if(path===`seedUsers/${uid}/save`){
   if(method==='PUT'){
    const value=JSON.parse(options.body);
    if(options.headers?.['if-match']&&options.headers['if-match']!==String(state.revision))return response(412,state.save,String(state.revision));
    if(state.seal){assert.deepEqual(value.bossProtocol,{version:2,ownerUid:uid,epoch});for(const [field,n] of Object.entries(state.seal.baseline))assert.equal(value.account[field],n,'only frozen server counts enter normal save');}
    state.save=value;state.revision++;state.puts.push({path,value});return response(200,value,String(state.revision));
   }
   return response(200,state.save,String(state.revision));
  }
  if(path===`seedBossVictories/${uid}`){if(state.failReadback){state.failReadback=false;return response(503,{error:'readback lost'});}return response(200,state.ledger);}
  const prefix=`seedBossVictories/${uid}/events/`;
  if(path.startsWith(prefix)){
   const key=path.slice(prefix.length),old=state.ledger?.events?.[key]??null;
   if(method==='PUT'){
    if(!state.ledger)return response(403,{error:'missing ledger'});
    if(old!==null)return response(412,old,'present');
    assert.equal(options.headers?.['if-match'],'empty','event creation uses actual per-child ETag');
    const value=JSON.parse(options.body);assert.equal(value.epoch,epoch);
    state.ledger.events={...(state.ledger.events||{}),[key]:value};state.puts.push({path,value});
    return response(200,value,'present');
   }
   return response(200,old,old===null?'empty':'present');
  }
  return response(404,{error:'unexpected route '+path});
 };
 let current=uid;
 const account={ready:async()=>{},user:()=>current?{uid:current,isAnonymous:false}:null,tokenSession:async()=>current?{uid:current,idToken:'mock-owner-token'}:null};
 const create=(storage,onSynced=()=>{})=>createCloudSync({storage,account,fetchImpl,now:()=>3000,debounceMs:60_000,onSynced});
 const storage=()=>new Memory({[CLOUD_OWNER_KEY]:uid,[ACCOUNT_PROFILE_KEY]:JSON.stringify({version:1,austinWins:8}),[SHOP_KEY]:JSON.stringify({version:2,coins:200})});
 return {state,account,create,storage,setOwner:v=>{current=v;}};
}
{
 const f=setup({migrated:false}),local=f.storage(),cloud=f.create(local);
 try{assert.equal((await cloud.start()).ok,true);assert.equal(readAccountProfile(local).austinWins,8);assert.equal(f.state.save.bossProtocol,undefined);assert.equal(readBossVictoryAccount(local,uid),null);assert(f.state.requests.some(r=>r.path.endsWith('/bossMigration')),'legacy startup checks server migration authority');}finally{cloud.signOutCleanup();}
}
{
 const f=setup(),pc=f.storage(),phone=f.storage();
 installBossVictoryAccount(pc,{ownerUid:uid,seal:f.state.seal,ledger:f.state.ledger});
 installBossVictoryAccount(phone,{ownerUid:uid,seal:f.state.seal,ledger:f.state.ledger});
 assert(queueBossAccountVictory(pc,{ownerUid:uid,event:first}));assert(queueBossAccountVictory(pc,{ownerUid:uid,event:second}));
 assert(queueBossAccountVictory(phone,{ownerUid:uid,event:third}));
 assert.equal(readAccountProfile(pc).austinWins,10);
 let callbacks=0;const a=f.create(pc,()=>callbacks++),b=f.create(phone);
 try{
  assert.equal((await a.start()).ok,true);assert.equal(readAccountProfile(pc).austinWins,10);
  assert.equal(readAccountProfile(a.storage).austinWins,10,'game-facing tracked storage enumerates durable pending receipts');
  assert.equal(f.state.save.account.austinWins,8);assert.deepEqual(f.state.save.bossProtocol,{version:2,ownerUid:uid,epoch});
  assert(JSON.parse(pc.getItem(DISCOVERIES_KEY)).bosses.includes('austinveteran'),'existing title entitlement is retained even below historical ten');
  assert.equal((await b.start()).ok,true);assert.equal(readAccountProfile(phone).austinWins,11);
  assert.equal((await a.syncNow()).ok,true);assert.equal(readAccountProfile(pc).austinWins,11,'PC receives independent phone event without max merging counts');
  assert.equal(Object.keys(f.state.ledger.events).length,3);
  assert.equal(f.state.puts.filter(p=>p.path.includes('/events/')).length,2,'copied confirmed event never writes another victory');
  assert(callbacks>0);assert.equal(collectCloudSnapshot(pc,{ownerUid:uid}).account.austinWins,8);
  assert.equal((await a.syncNow()).ok,true);assert.equal(Object.keys(f.state.ledger.events).length,3);
 }finally{a.signOutCleanup();b.signOutCleanup();}
}
for(const failure of ['half-migrated','bad-cache','changed-owner','missing-seal','wrong-epoch','wrong-baseline','anonymous']){
 const f=setup(),local=f.storage();
 if(failure==='half-migrated')f.state.ledger=null;
 if(failure==='bad-cache')local.setItem(bossVictoryAccountKey(uid),'{"version":99,"preserve":"future"}');
 if(failure==='changed-owner')f.state.hook=(path,method)=>{if(method==='GET'&&path.endsWith('/bossMigration'))f.setOwner('another-account');};
 if(failure==='missing-seal'){installBossVictoryAccount(local,{ownerUid:uid,seal:f.state.seal,ledger:f.state.ledger});f.state.seal=null;}
 if(failure==='wrong-epoch')f.state.ledger.epoch='wrong-epoch';
 if(failure==='wrong-baseline')f.state.ledger.baseline.austinWins=99;
 if(failure==='anonymous')f.account.user=()=>({uid,isAnonymous:true});
 const before=local.getItem(ACCOUNT_PROFILE_KEY),cache=local.getItem(bossVictoryAccountKey(uid)),cloud=f.create(local);
 try{
  const result=await cloud.start();assert.equal(result.ok,false,failure+' stops before normal save/apply');
  assert.equal(f.state.puts.length,0,failure+' never writes server data');assert.equal(local.getItem(ACCOUNT_PROFILE_KEY),before);
  if(failure==='bad-cache')assert.equal(local.getItem(bossVictoryAccountKey(uid)),cache,'unknown cache bytes are preserved');
 }finally{cloud.signOutCleanup();}
}
{
 const f=setup(),local=f.storage();installBossVictoryAccount(local,{ownerUid:uid,seal:f.state.seal,ledger:f.state.ledger});assert(queueBossAccountVictory(local,{ownerUid:uid,event:second}));
 let injected=false;f.state.hook=(path,method)=>{if(!injected&&method==='PUT'&&path.includes('/events/')){injected=true;f.state.failReadback=true;}};
 const cloud=f.create(local);
 try{
  assert.equal((await cloud.start()).ok,false,'lost event readback never licenses a normal profile upload');
  assert.equal(f.state.puts.filter(p=>p.path.endsWith('/save')).length,0);assert.equal(readAccountProfile(local).austinWins,10,'pending victory remains available locally');
  f.state.hook=null;assert.equal((await cloud.syncNow()).ok,true);assert.equal(readAccountProfile(local).austinWins,10);
  assert.equal(f.state.puts.filter(p=>p.path.includes('/events/')).length,1,'retry reads the same event and never re-counts it');
 }finally{cloud.signOutCleanup();}
}
{
 const f=setup({event:false}),local=f.storage();
 f.state.seal=createBossMigrationSeal(uid,epoch,f.state.save,2000);
 f.state.ledger.events=Object.fromEntries([first,second].map(e=>[bossVictoryCloudKey(e),{epoch,...e}]));
 const cloud=f.create(local);
 try{const result=await cloud.start();assert.equal(result.ok,true);assert.equal(result.changed,true,'new server events refresh an already constructed title UI');assert.equal(readAccountProfile(local).austinWins,10);assert(JSON.parse(local.getItem(DISCOVERIES_KEY)).bosses.includes('austinveteran'));}finally{cloud.signOutCleanup();}
}
{
 const f=setup({event:false}),local=f.storage();installBossVictoryAccount(local,{ownerUid:uid,seal:f.state.seal,ledger:f.state.ledger});
 for(let i=0;i<65;i++)assert(queueBossAccountVictory(local,{ownerUid:uid,event:{...first,runId:'batch-'+i}}));
 const cloud=f.create(local);
 try{assert.equal((await cloud.start()).ok,true);assert(cloud.isDirty(),'remaining boss batches stay pending after profile upload');assert.equal((await cloud.flush()).ok,true);assert.equal(cloud.isDirty(),false);assert.equal(Object.keys(f.state.ledger.events).length,65);assert.equal(readAccountProfile(local).austinWins,73);assert.equal(f.state.save.account.austinWins,8);}finally{cloud.signOutCleanup();}
}
console.log('Cloud boss cutover passed: frozen baseline, two-device union/dedupe, retained/earned title refresh, 65-receipt batch flush, half migration/owner/cache refusal and lost-readback retry. Mock transport only.');
