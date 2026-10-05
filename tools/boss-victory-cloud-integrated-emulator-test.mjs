import assert from 'node:assert/strict';
import {createMockUserToken} from '@firebase/util';
import {collectCloudSnapshot,CLOUD_OWNER_KEY} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile} from '../src/account-profile.js';
import {DISCOVERIES_KEY} from '../src/discoveries.js';
import {bossVictoryAccountKey,readBossVictoryAccount} from '../src/boss-victory-account.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {createModeBossOutbox} from '../src/mode-boss-outbox.js';
import {bossVictoryCounts} from '../src/boss-victory-events.js';
import {decodeBossVictoryCloud,createBossVictoryEventQueue} from '../src/boss-victory-event-sync.js';
import {createBossMigrationRestAdmin,migrateBossVictoryUser} from './boss-victory-admin-migration.mjs';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';

export async function runBossCloudCutoverEmulator(){
 assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:19004','integration is restricted to the local demo emulator');
 const project='demo-seed-linked',base='http://127.0.0.1:19004',uid='cloud-integrated-owner',epoch='cloud-integrated-20261005';
 const token=(owner,provider='password')=>createMockUserToken({sub:owner,firebase:{sign_in_provider:provider}},project);
 const storage=()=>{const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
 const request=async(path,{method='GET',value,owner=uid,provider='password',admin=false}={})=>{
  const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',project);if(!admin)url.searchParams.set('auth',token(owner,provider));
  return fetch(url,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});
 };
 const allow=async(path,options={})=>{const result=await request(path,options);assert(result.ok,`${path}: ${result.status} ${await result.clone().text()}`);return result;};
 const read=async path=>(await allow(path,{admin:true})).json();
 const deny=async(path,options)=>assert.equal((await request(path,options)).status,401,path+' must be denied');
 const initial=storage();initial.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify({version:1,austinWins:8}));
 const original=collectCloudSnapshot(initial);original.discoveries.bosses=['austin','austinveteran'];
 await allow('seedUsers/'+uid,{method:'PUT',value:{save:original},admin:true});
 await allow('seedBossVictories/'+uid,{method:'DELETE',admin:true});
 const admin=createBossMigrationRestAdmin({databaseURL:base,namespace:project,authorization:async()=> 'owner'});
 assert.equal((await migrateBossVictoryUser({admin,ownerUid:uid,epoch,apply:true})).baseline.austinWins,8);
 const requests=[];
 const emulatorFetch=async(url,options={})=>{
  // Every game request is rerouted before fetch; this test never contacts the
  // configured production database, including token-bearing normal saves.
  const source=new URL(url),target=new URL(base+source.pathname);target.search=source.search;target.searchParams.set('ns',project);
  requests.push({path:target.pathname,method:options.method||'GET'});return fetch(target,options);
 };
 const device=(owner=uid,provider='password')=>{
  const raw=storage();raw.setItem(CLOUD_OWNER_KEY,owner);raw.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify({version:1,austinWins:8}));
  const account={ready:async()=>{},user:()=>({uid:owner,isAnonymous:provider==='anonymous'}),tokenSession:async()=>({uid:owner,idToken:token(owner,provider)})};
  const cloud=createCloudSync({storage:raw,account,fetchImpl:emulatorFetch,debounceMs:60_000});return {raw,cloud,account};
 };
 const pc=device(),phone=device();
 try{
  assert.equal((await pc.cloud.start()).ok,true);assert.equal((await phone.cloud.start()).ok,true);
  assert.equal(readAccountProfile(pc.cloud.storage).austinWins,8);assert.equal(readAccountProfile(phone.cloud.storage).austinWins,8);
  assert.equal(readBossVictoryAccount(pc.raw,uid).context.epoch,epoch);
  const shared={mode:'journey',runId:'copied-actual-run',boss:'austin',ordinal:1,bossEpoch:epoch};
  const different={mode:'survival',runId:'phone-distinct-run',boss:'austin',ordinal:1,bossEpoch:epoch};
  assert.deepEqual(recordModeBossVictory(pc.cloud.storage,shared),{saved:true,counted:true,awards:['austin'],wins:9});
  assert.equal(recordModeBossVictory(pc.cloud.storage,shared).counted,false,'local copied death stays idempotent');
  assert.equal(recordModeBossVictory(phone.cloud.storage,shared).saved,true);
  assert.equal(recordModeBossVictory(phone.cloud.storage,different).wins,10);
  assert.equal((await pc.cloud.syncNow()).ok,true);assert.equal((await phone.cloud.syncNow()).ok,true);assert.equal((await pc.cloud.syncNow()).ok,true);
  const ledger=decodeBossVictoryCloud(await read('seedBossVictories/'+uid)),saved=await read('seedUsers/'+uid+'/save');
  assert.equal(Object.keys(ledger.events).length,2,'copied run on two real clients becomes one immutable RTDB event');
  assert.equal(bossVictoryCounts(ledger).austinWins,10);
  assert.equal(readAccountProfile(pc.cloud.storage).austinWins,10);assert.equal(readAccountProfile(phone.cloud.storage).austinWins,10);
  assert.equal(saved.account.austinWins,8,'normal save cannot replace the authoritative baseline with derived counts');
  assert.deepEqual(saved.bossProtocol,{version:2,ownerUid:uid,epoch});
  assert(JSON.parse(pc.raw.getItem(DISCOVERIES_KEY)).bosses.includes('austinveteran'),'server title entitlement survives historical count eight');
  assert.equal(createBossVictoryEventQueue({storage:pc.raw,ownerUid:uid,epoch}).pending().length,0);
  assert.equal(createBossVictoryEventQueue({storage:phone.raw,ownerUid:uid,epoch}).pending().length,0);
  const old={mode:'defense',runId:'old-unmarked-door',boss:'austin',ordinal:1},outbox=createModeBossOutbox(pc.raw,uid);
  assert(outbox.enqueue(old));const key=[...Array(pc.raw.length)].map((_,i)=>pc.raw.key(i)).find(k=>k.includes('old-unmarked-door'));
  assert(key);const bytes=pc.raw.getItem(key);
  assert.equal(outbox.retry(event=>recordModeBossVictory(pc.cloud.storage,{...event,bossEpoch:event.bossEpoch??null}).saved),false);
  assert.equal(pc.raw.getItem(key),bytes,'unmarked old receipt remains available and is never promoted/deleted');
  assert.equal(recordModeBossVictory(pc.cloud.storage,{...old,bossEpoch:'older-epoch'}).saved,false);
  assert.equal(recordModeBossVictory(pc.cloud.storage,{...different,runId:'practice',practice:true}).saved,false);
  assert.equal(readAccountProfile(pc.cloud.storage).austinWins,10);
  assert.equal((await pc.cloud.syncNow()).ok,true);assert.equal(Object.keys((await read('seedBossVictories/'+uid)).events).length,2);
  await deny('seedUsers/'+uid+'/save',{method:'PUT',value:original});
  await deny('seedUsers/'+uid+'/save',{method:'DELETE'});
  await deny('seedUsers/'+uid+'/save/account/austinWins',{method:'PUT',value:10});
  await deny('seedUsers/'+uid+'/save',{method:'PUT',value:saved,owner:'other-user'});
  await deny('seedUsers/'+uid+'/save',{method:'PUT',value:saved,provider:'anonymous'});
  await deny('seedBossVictories/'+uid,{owner:'other-user'});
  assert.equal((await read('seedUsers/'+uid+'/save')).account.austinWins,8);
  const bad=device();bad.raw.setItem(bossVictoryAccountKey(uid),'{"version":99,"retain":"future"}');const oldRaw=bad.raw.getItem(ACCOUNT_PROFILE_KEY),before=requests.filter(r=>r.method==='PUT').length;
  try{assert.equal((await bad.cloud.start()).ok,false);assert.equal(bad.raw.getItem(bossVictoryAccountKey(uid)),'{"version":99,"retain":"future"}');assert.equal(bad.raw.getItem(ACCOUNT_PROFILE_KEY),oldRaw);assert.equal(requests.filter(r=>r.method==='PUT').length,before);}finally{bad.cloud.signOutCleanup();}
  const anon=device(uid,'anonymous');const anonBefore=requests.filter(r=>r.method==='PUT').length;
  try{assert.equal((await anon.cloud.start()).ok,false);assert.equal(requests.filter(r=>r.method==='PUT').length,anonBefore);}finally{anon.cloud.signOutCleanup();}
 }finally{pc.cloud.signOutCleanup();phone.cloud.signOutCleanup();}
 const halfUid='cloud-integrated-half',halfSave=collectCloudSnapshot(storage());halfSave.account.austinWins=2;
 await allow('seedUsers/'+halfUid,{method:'PUT',value:{save:halfSave,bossMigration:createBossMigrationSeal(halfUid,epoch,halfSave)},admin:true});
 await allow('seedBossVictories/'+halfUid,{method:'DELETE',admin:true});
 const half=device(halfUid),halfRaw=half.raw.getItem(ACCOUNT_PROFILE_KEY),halfBefore=requests.filter(r=>r.method==='PUT').length;
 try{assert.equal((await half.cloud.start()).ok,false);assert.equal(half.raw.getItem(ACCOUNT_PROFILE_KEY),halfRaw);assert.equal(requests.filter(r=>r.method==='PUT').length,halfBefore,'half migration never uploads/applies normal profile');}finally{half.cloud.signOutCleanup();}
 console.log('Integrated real demo RTDB clients passed: createCloudSync + mode victories, two device projection10/frozen profile8, distinct/copied tuple union, durable unmarked legacy outbox refusal, practice/anonymous/foreign/old-client boundaries, malformed cache and half migration refusal. No production requests or account migration.');
}
