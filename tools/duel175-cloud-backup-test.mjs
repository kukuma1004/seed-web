import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCloudSync} from '../src/cloud-sync.js';
import {DUEL_STORY_STAGE_COUNT,normalizeDuelStory,mergeDuelStory,readDuelStory,writeDuelStory,duelStorySaveKey} from '../src/seed-duel-story-progress.js';
import {CLOUD_OWNER_KEY,CLOUD_META_KEY} from '../src/cloud-save.js';

// Execute real cloud coordination against independent path/ETag/UID records.
// Rule expressions are evaluated with declared snapshot adapters below; this
// is a Firebase REST mock, not a claim of RTDB emulator/compiler validation.
assert.equal(DUEL_STORY_STAGE_COUNT,175,'root public progression must be connected before this focused check');
const allRules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8'));
const rules=allRules.rules.seedUsers.$uid.duelStoryV2;
const memory=()=>{const data=new Map();return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const copy=v=>v==null?null:structuredClone(v);
const snapshot=value=>({exists:()=>value!==null&&value!==undefined,val:()=>value??null,isNumber:()=>typeof value==='number'&&Number.isFinite(value),isString:()=>typeof value==='string',hasChildren:names=>names?names.every(k=>value?.[k]!==undefined&&value?.[k]!==null):Boolean(value&&typeof value==='object'&&Object.keys(value).length),child:path=>snapshot(path.split('/').reduce((v,k)=>v?.[k],value))});
const evaluate=(expression,previous,next,uid='same',authUid='same',stage='')=>expression===false?false:new Function('data','newData','auth','$uid','now','$stage',`return Boolean(${expression.replaceAll('$stage.matches(','$stage.match(')});`)(snapshot(previous),snapshot(next),authUid?{uid:authUid}:null,uid,1000000,stage);
function validV2(previous,next,uid='same',authUid='same'){
 if(!evaluate(rules['.write'],previous,next,uid,authUid)||!evaluate(rules['.validate'],previous,next,uid,authUid))return false;
 if(Object.keys(next).some(k=>!['version','updatedAt','hero','cleared'].includes(k)))return false;
 for(const [k,v] of Object.entries(next.cleared||{})){
  const r=rules.cleared.$stage;
  if(!evaluate(r['.validate'],previous?.cleared?.[k],v,uid,authUid,k)||Object.keys(v).some(p=>!['losses','at'].includes(p)))return false;
 }
 return true;
}
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
check('V2 rule expressions permit full bounds and reject deletion, regression, foreign owner and unknown fields',()=>{
 const before={version:1,updatedAt:100,hero:'twin-gravityspear',cleared:{s1:{losses:0,at:90},s175:{losses:1,at:100}}};
 assert(validV2(null,before));assert(validV2(before,{...before,updatedAt:101,cleared:{...before.cleared,s175:{losses:0,at:101}}}));
 for(const next of [null,{...before,cleared:{s1:before.cleared.s1}},{...before,cleared:{}},{...before,updatedAt:99},{...before,updatedAt:100.5},{...before,hero:'x'.repeat(49)},{...before,unexpected:true},{...before,cleared:{...before.cleared,s1:{losses:1,at:90}}},{...before,cleared:{...before.cleared,s175:{losses:1,at:99}}},{...before,cleared:{...before.cleared,s176:{losses:0,at:100}}},{...before,cleared:{...before.cleared,s01:{losses:0,at:100}}},{...before,cleared:{...before.cleared,'inspect-twin-gravityspear':{losses:0,at:100}}}])assert(!validV2(before,next));
 assert(!validV2(before,before,'same','other'));assert(!validV2(before,before,'same',null));
 for(let n=1;n<=175;n++)assert(validV2(null,{version:1,updatedAt:1,hero:'pierce',cleared:{['s'+n]:{losses:0,at:1}}}));
 const rank=allRules.rules.seedModeRanking.duel.$uid;assert(rank.storyStage['.validate'].includes('<= 175'));assert(rank.score['.validate'].includes('<= 17523300'));
 assert(allRules.rules.seedUsers.$uid.duelStory['.validate'].includes('<= 16'),'legacy schema remains unchanged');
});
const story=(cleared,hero='pierce',updatedAt=200)=>normalizeDuelStory({version:1,hero,updatedAt,cleared});
function server(initial={}){
 const records=new Map(Object.entries(initial).map(([k,v])=>[k,copy(v)])),versions=new Map(),requests=[];
 const state={records,requests,denyV2:false,conflictV2:null,readGate:null,afterSave:null,omitV2Etag:false};
 state.fetch=async(url,options={})=>{
  const u=new URL(url),path=decodeURIComponent(u.pathname.slice(1,-5)),token=u.searchParams.get('auth'),method=options.method||'GET';requests.push({path,method,ifMatch:options.headers?.['if-match'],token});
  if(state.readGate&&method==='GET')await state.readGate;
  const uid=path.startsWith('seedUsers/')?path.split('/')[1]:null;
  const response=(value,status=200)=>({ok:status>=200&&status<300,status,headers:{get:()=>state.omitV2Etag&&path.endsWith('/duelStoryV2')?null:String(versions.get(path)||0)},json:async()=>copy(value)});
  if(uid&&token!=='token-'+uid)return response({error:'owner'},403);
  if(method==='GET')return response(records.get(path)??null);
  assert.equal(method,'PUT');const next=JSON.parse(options.body);
  if(path.endsWith('/duelStory'))throw Error('New client must never PUT the legacy story authority');
  if(path.endsWith('/duelStoryV2')){
   if(state.denyV2)return response({error:'denied'},403);
   if(state.conflictV2){records.set(path,state.conflictV2(records.get(path)));versions.set(path,(versions.get(path)||0)+1);state.conflictV2=null;return response({error:'conflict'},412);}
   if(!validV2(records.get(path),next,uid,uid))return response({error:'invalidV2'},403);
  }
  if(options.headers?.['if-match']!==String(versions.get(path)||0))return response({error:'stale'},412);
  records.set(path,copy(next));versions.set(path,(versions.get(path)||0)+1);
  if(path.endsWith('/save'))state.afterSave?.();
  return response(next);
 };
 return state;
}
const sessions=[];
function device(s,{uid='same',storage=memory(),owner=uid}={}){
 let currentUid=uid,clock=1000;if(owner)storage.setItem(CLOUD_OWNER_KEY,owner);
 const account={ready:async()=>{},user:()=>currentUid?{uid:currentUid}:null,tokenSession:async()=>currentUid?{uid:currentUid,idToken:'token-'+currentUid}:null};
 const cloud=createCloudSync({storage,account,fetchImpl:s.fetch,now:()=>++clock,debounceMs:60000});sessions.push(cloud);
 return {cloud,storage,switchUid:next=>currentUid=next};
}
try{
 const s=server({'seedUsers/same/duelStory':story({s1:{losses:1,at:100},s36:{losses:0,at:200}},'rewind',200)}),a=device(s);assert.equal((await a.cloud.start()).ok,true);
 assert(s.records.get('seedUsers/same/duelStoryV2').cleared.s36);assert(s.records.get('seedUsers/same/duelStory').cleared.s36);
 assert(s.requests.some(r=>r.path.endsWith('/duelStory')&&r.method==='GET'));assert(s.requests.some(r=>r.path.endsWith('/duelStoryV2')&&r.method==='GET'));
 checks.push('real coordinator seeds V2 from same-owner normal legacy36, reads both paths and never writes legacy');
 const later=story({s37:{losses:0,at:300},s175:{losses:1,at:310}},'twin-tidalhole',400);assert(writeDuelStory(a.cloud.storage,later,'same',400));assert.equal((await a.cloud.flush()).ok,true);
 const v2=copy(s.records.get('seedUsers/same/duelStoryV2'));assert(v2.cleared.s175);assert.equal(v2.hero,'twin-tidalhole');
 s.records.get('seedUsers/same/save').garden.duelStory=story({s1:{losses:1,at:100}},'pierce',100);s.records.set('seedUsers/same/duelStory',story({s1:{losses:1,at:100}},'pierce',100));
 const fresh=device(s);assert.equal((await fresh.cloud.start()).ok,true);assert.deepEqual(readDuelStory(fresh.cloud.storage,'same').cleared,v2.cleared);assert.equal(readDuelStory(fresh.cloud.storage,'same').hero,'twin-tidalhole');
 assert(s.records.get('seedUsers/same/save').garden.duelStory.cleared.s175);checks.push('old36 overwrites both save and legacy backup; fresh device restores s175 from V2');
 const before=s.requests.filter(r=>r.method==='PUT').length;assert.equal((await fresh.cloud.syncNow()).ok,true);assert.equal(s.requests.filter(r=>r.method==='PUT').length,before);checks.push('stable V2 union performs zero duplicate PUTs');
 assert(writeDuelStory(fresh.cloud.storage,story({s174:{losses:1,at:450}},'twin-winterflare',500),'same',500));
 s.conflictV2=previous=>mergeDuelStory(previous,story({s173:{losses:0,at:600},s175:{losses:0,at:600}},'twin-emberhole',600));
 assert.equal((await fresh.cloud.flush()).ok,true);const conflict=s.records.get('seedUsers/same/duelStoryV2');assert(conflict.cleared.s174);assert(conflict.cleared.s173);assert.equal(conflict.cleared.s175.losses,0);
 assert(s.requests.filter(r=>r.path.endsWith('/duelStoryV2')&&r.method==='PUT').every(r=>r.ifMatch!==undefined));checks.push('actual V2 412 refetch/ETag merge retains both devices and better losses');
 s.denyV2=true;assert(writeDuelStory(fresh.cloud.storage,story({s172:{losses:0,at:700}},'twin-returningspear',700),'same',700));const denied=await fresh.cloud.flush();assert.equal(denied.ok,false);assert.equal(denied.reason,'upload');assert(fresh.cloud.isDirty());assert(readDuelStory(fresh.cloud.storage,'same').cleared.s172);assert.equal(s.records.get('seedUsers/same/duelStoryV2').cleared.s172,undefined);
 s.denyV2=false;assert.equal((await fresh.cloud.flush()).ok,true);assert(s.records.get('seedUsers/same/duelStoryV2').cleared.s172);checks.push('V2 403 retains local pending dirty data; retry sends it without claiming early success');
 const other=device(s,{uid:'other',storage:fresh.storage,owner:'same'});assert.equal((await other.cloud.start()).ok,true);assert.equal(readDuelStory(other.cloud.storage,'other').cleared.s175,undefined);assert.equal(s.records.get('seedUsers/other/duelStoryV2')?.cleared?.s175,undefined);checks.push('different UID cannot inherit old account local/garden/V2 story');
 const isolated=memory();isolated.setItem(duelStorySaveKey('guest'),JSON.stringify(later));isolated.setItem(duelStorySaveKey('foreign'),JSON.stringify(later));isolated.setItem('seed-duel-inspection-cleared',JSON.stringify(['inspect-twin-tidalhole']));const clean=device(server(),{storage:isolated});assert.equal((await clean.cloud.start()).ok,true);assert.equal(readDuelStory(clean.cloud.storage,'same').cleared.s175,undefined);checks.push('guest, foreign UID and declared inspection fixture remain outside normal sync');
 const raceServer=server({'seedUsers/same/duelStoryV2':later});let release;raceServer.readGate=new Promise(resolve=>release=resolve);const race=device(raceServer);const running=race.cloud.start();await new Promise(resolve=>setImmediate(resolve));race.switchUid('other');release();assert.equal((await running).reason,'account-changed');assert.equal(race.storage.getItem('seed-garden-v1'),null);assert.equal(raceServer.requests.filter(r=>r.method==='PUT').length,0);checks.push('UID changes during parallel GET cannot apply or upload prior V2 authority');
 const uploadRaceServer=server(),uploadRace=device(uploadRaceServer);await uploadRace.cloud.start();assert(writeDuelStory(uploadRace.cloud.storage,later,'same',400));uploadRaceServer.afterSave=()=>uploadRace.switchUid('other');const swapped=await uploadRace.cloud.flush();assert.equal(swapped.reason,'account-changed');assert.equal(uploadRaceServer.records.get('seedUsers/same/duelStoryV2'),undefined);checks.push('UID change after save PUT prevents subsequent V2 PUT with new token');
 const offlineServer=server(),offline=device(offlineServer);await offline.cloud.start();assert(writeDuelStory(offline.cloud.storage,later,'same',400));offlineServer.readGate=Promise.reject(Error('offline'));const offlineResult=await offline.cloud.flush();assert.equal(offlineResult.ok,false);assert(offline.cloud.isDirty());assert(readDuelStory(offline.cloud.storage,'same').cleared.s175);offlineServer.readGate=null;checks.push('network read failure leaves pending local175 and dirty revision intact');
 const missingTagServer=server(),missingTag=device(missingTagServer);await missingTag.cloud.start();assert(writeDuelStory(missingTag.cloud.storage,later,'same',400));missingTagServer.omitV2Etag=true;const missing=await missingTag.cloud.flush();assert.equal(missing.ok,false);assert.equal(missing.error.message,'missing-duel-story-etag');assert(missingTag.cloud.isDirty());assert.equal(missingTagServer.requests.filter(r=>r.path.endsWith('/duelStoryV2')&&r.method==='PUT').length,0);checks.push('missing V2 ETag fails closed without unconditional PUT and preserves local pending data');
 console.log(JSON.stringify({groups:checks.length,checks,scope:'real createCloudSync / independent UID-path-ETag REST mock / actual local rule expressions; no RTDB compiler or deployment'},null,2));
}finally{for(const c of sessions)c.signOutCleanup();}
