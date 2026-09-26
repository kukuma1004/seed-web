import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSurvivalSaveStore} from '../src/survival-save.js';
import {createSurvivalSync,decodeSurvivalCloud} from '../src/survival-sync.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const snapshot=id=>({version:1,id,revision:0,session:{act:1,lap:2,time:940,legStartedAt:900,rngState:41},progress:{hp:32,kills:273,score:1230,choicesTaken:8,choiceKills:12,bankedUpgrades:0,elapsed:940,levels:{frost:3},forms:{},inventory:{tonic:1}},player:{position:[11,0,0],baseSlideTarget:[0,0,-11],baseSlideDir:[0,0,-1],lastMove:[1,0,0]},pending:{offered:['frost','burst'],bonus:[]},enemies:[],hostiles:[]});
let remote=null,rev=0,getHook=null,putHook=null,mode='ok',requests=0,puts=0;
const fetchImpl=async(url,options)=>{
 requests++;assert(url.includes('/seedSurvivalSaves/a.json?auth='));
 if(mode==='offline')throw Error('network');if(mode==='permission')return {ok:false,status:403};
 if(options.method==='PUT'){
  puts++;if(putHook){const fn=putHook;putHook=null;await fn();}
  if(options.headers['if-match']!==String(rev))return {ok:false,status:412};
  remote=JSON.parse(options.body);remote.updatedAt=100;rev++;return {ok:true,status:200};
 }
 assert.equal(options.headers['X-Firebase-ETag'],'true');const copy=structuredClone(remote),etag=String(rev);
 if(getHook){const fn=getHook;getHook=null;await fn();}
 return {ok:true,status:200,json:async()=>copy,headers:{get:()=>etag}};
};
function device(){const s=storage(),a={uid:'a',isAnonymous:false},account={user:()=>a,tokenSession:async()=>({uid:a.uid,idToken:'test'})},store=createSurvivalSaveStore(s,'a');return {s,a,account,store,sync:createSurvivalSync({storage:s,account,databaseURL:'https://example.invalid',fetchImpl,delay:100000})};}
const pc=device(),phone=device();pc.store.write(snapshot('run'),{fresh:true});
assert.equal((await pc.sync.flush()).kind,'synced');assert.equal(remote.revision,1);
assert.equal((await phone.sync.sync({allowPull:true})).pulled,true);
assert.deepEqual(phone.store.read(),pc.store.read(),'all combat state copied including empty arrays');
assert.deepEqual(phone.store.read().pending.offered,['frost','burst']);
// Unchanged device does not issue redundant writes.
const before=puts;await phone.sync.sync({allowPull:true});assert.equal(puts,before);
// Independent timelines are never combined or chosen using device clocks.
let a=pc.store.read();a.progress.inventory.tonic=0;a.progress.score=1300;pc.store.write(a);await pc.sync.flush();
let b=phone.store.read();b.progress.score=1400;phone.store.write(b);
const conflict=await phone.sync.sync({allowPull:true});assert.equal(conflict.kind,'conflict');assert.equal(phone.store.read().progress.inventory.tonic,1);assert.equal(decodeSurvivalCloud(remote).record.progress.inventory.tonic,0);
assert.equal((await phone.sync.sync({allowPull:true,choice:'remote',expected:conflict.expected})).kind,'synced');assert.equal(phone.store.read().progress.inventory.tonic,0);assert(phone.s.getItem(phone.store.key+':previous'));
// Selecting an obsolete conflict card does not replace a newer remote revision.
b=phone.store.read();b.progress.score=1500;phone.store.write(b);a=pc.store.read();a.progress.score=1600;pc.store.write(a);await pc.sync.flush();const oldConflict=await phone.sync.sync({allowPull:true});
a=pc.store.read();a.progress.score=1700;pc.store.write(a);await pc.sync.flush();
assert.equal((await phone.sync.sync({allowPull:true,choice:'local',expected:oldConflict.expected})).kind,'conflict');assert.equal(decodeSurvivalCloud(remote).record.progress.score,1700);
// Explicit local choice backs up discarded cloud progress and uses the ETag.
const newerConflict=await phone.sync.sync({allowPull:true});assert.equal((await phone.sync.sync({allowPull:true,choice:'local',expected:newerConflict.expected})).kind,'synced');assert(phone.s.getItem(phone.store.key+':previous-cloud'));
await pc.sync.sync({allowPull:true});
// An active combat world is never silently replaced.
a=phone.store.read();a.progress.score=1800;phone.store.write(a);await phone.sync.flush();const retained=pc.store.read();assert.equal((await pc.sync.sync()).kind,'remote');assert.deepEqual(pc.store.read(),retained);await pc.sync.sync({allowPull:true});
// A terminal record prevents same-run resurrection even when this device is dirty.
a=phone.store.read();phone.store.end(a.id,a.revision);await phone.sync.flush();a=pc.store.read();a.progress.score=1900;pc.store.write(a);assert.equal((await pc.sync.sync({allowPull:true})).kind,'synced');assert.equal(pc.store.read(),null);assert(pc.store.readRecord().ended);
// Offline failures preserve the local checkpoint. Retry uploads exactly that state.
pc.store.write(snapshot('next-run'),{fresh:true});mode='offline';assert.equal((await pc.sync.flush()).kind,'offline');assert.equal(pc.store.read().id,'next-run');mode='permission';assert.equal((await pc.sync.flush()).kind,'permission');mode='ok';await pc.sync.flush();
// A new save during upload remains dirty, then flush sends the latest revision.
a=pc.store.read();a.progress.score=2100;pc.store.write(a);putHook=()=>{const s=pc.store.read();s.progress.score=2200;pc.store.write(s);};assert.equal((await pc.sync.flush()).kind,'synced');assert.equal(decodeSurvivalCloud(remote).record.progress.score,2200);
// Another device winning between GET and PUT yields 412, no blind retry overwrite.
a=pc.store.read();a.progress.score=2300;pc.store.write(a);putHook=()=>{remote={...remote,revision:remote.revision+1};rev++;};assert.equal((await pc.sync.flush()).kind,'remote');assert.equal(decodeSurvivalCloud(remote).record.progress.score,2200);
// Local changes during GET cannot be replaced as if they were clean.
await phone.sync.sync({allowPull:true});a=pc.store.read();const c=await pc.sync.sync({allowPull:true});if(c.kind==='conflict')await pc.sync.sync({allowPull:true,choice:'remote',expected:c.expected});
a=phone.store.read();a.progress.score=2400;phone.store.write(a);await phone.sync.flush();getHook=()=>{const s=pc.store.read();s.progress.score=2500;pc.store.write(s);};assert.equal((await pc.sync.sync({allowPull:true})).kind,'conflict');assert.equal(pc.store.read().progress.score,2500);
// UID changes after network read never apply or upload the former user's data.
getHook=()=>{pc.a.uid='b';};assert.equal((await pc.sync.sync({allowPull:true})).kind,'account');pc.a.uid='a';
// Guest stays entirely local.
pc.a.isAnonymous=true;const count=requests;assert.equal((await pc.sync.sync()).kind,'guest');assert.equal(requests,count);
assert.throws(()=>decodeSurvivalCloud({version:1,revision:1,checkpoint:'{}'}));
pc.sync.stop();phone.sync.stop();
// A response lost AFTER a successful PUT is acknowledged on retry, not overwritten.
remote=null;rev=0;const recovery=device();recovery.store.write(snapshot('recovery'),{fresh:true});
putHook=()=>{remote={version:1,revision:1,updatedAt:100,checkpoint:JSON.stringify(recovery.store.read())};rev++;throw Error('response lost');};
assert.equal((await recovery.sync.flush()).kind,'offline');const lostPuts=puts;assert.equal((await recovery.sync.flush()).kind,'synced');assert.equal(puts,lostPuts);
// Auth and storage failures have bounded, non-destructive outcomes.
const timeoutSync=createSurvivalSync({storage:storage(),account:{user:()=>({uid:'a'}),tokenSession:()=>new Promise(()=>{})},databaseURL:'https://example.invalid',fetchImpl,timeout:10});assert.equal((await timeoutSync.flush()).kind,'offline');
const quota=createSurvivalSync({storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}},account:recovery.account,databaseURL:'https://example.invalid',fetchImpl});assert.equal((await quota.sync({allowPull:true})).kind,'storage');
recovery.sync.stop();timeoutSync.stop();quota.stop();
// Execute the actual menu controller: block stale start buttons while checking,
// present both timelines, and wire the exact revision to the user's choice.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const nodes=new Map(),element=()=>({disabled:false,children:[],append(v){this.children.push(v);},replaceChildren(){this.children=[];}});
for(const id of ['survival-cloud-status','start-survival','resume-survival','survival-cloud-retry','survival-cloud-conflict'])nodes.set('#'+id,element());
let complete,args,shown=0;const ctx=vm.createContext({mode:'ready',$:key=>nodes.get(key),document:{createElement:element},survivalClock:n=>String(n),survivalSyncLabel:s=>s.kind,survivalCloud:{sync:options=>{args=options;return new Promise(r=>{complete=r;});}},showSurvivalSetup:()=>shown++});
vm.runInContext(main.slice(main.indexOf('function survivalRecordSummary('),main.indexOf('const survivalRanking=')),ctx);
let task=ctx.refreshSurvivalAccount();assert(nodes.get('#resume-survival').disabled);complete({...conflict});await task;assert(nodes.get('#resume-survival').disabled);assert.equal(nodes.get('#survival-cloud-conflict').children.length,3);
task=nodes.get('#survival-cloud-conflict').children[1].onclick();assert.equal(args.choice,'remote');assert.equal(args.expected,conflict.expected);complete({kind:'synced',pulled:true});await task;assert.equal(shown,1);
// Stale async responses must not reopen a menu after the user left it.
task=ctx.refreshSurvivalAccount();ctx.mode='playing';complete({kind:'synced',pulled:true});await task;assert.equal(shown,1);
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules;
assert.equal(rules['.read'],false);assert.equal(rules['.write'],false);const privateRule=rules.seedSurvivalSaves.$uid;assert(privateRule['.read'].includes('auth.uid == $uid'));assert(privateRule['.write'].includes('newData.exists()'));assert.equal(privateRule.$other['.validate'],false);
console.log('Survival cloud: two-device round trip, choice/items, offline, conflict choices, death, concurrent writes, account change and guest isolation passed.');
