import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createExpeditionAccountStore,expeditionAccountStoreKey,EXPEDITION_ACCOUNT_NAMESPACE} from '../src/expedition/account-store.js';
import {createFreshExpeditionAccount,nextExpeditionAccount,decodeExpeditionAccount,expeditionAccountParent} from '../src/expedition/account-codec.js';
import {grantInstanceXP,recruitInstance,setParty,damageInstance} from '../src/expedition/roster.js';
const clone=x=>structuredClone(x),owner='store-audit',base=1700000000000;let serial=0,groups=0;
const writer=()=>({deviceId:'pc',leaseId:'finite-a',issuedAt:base,expiresAt:base+60000});
const idFactory=()=>String(++serial);
function env({raw=null,timeout=1000}={}){
 let clock=base+10,uid=owner,enabled=true,anonymous=false,lock=true,w=writer(),remote=raw,etag='"0"',writes=0,gets=0,leases=0,freshChecks=0,hookGet=null,hookPut=null,hookLease=null,hookFresh=null,hookSet=null,readFault=false,setFault=false;
 const memory=new Map(),key=expeditionAccountStoreKey(owner);
 const storage={getItem(k){if(readFault)throw Error('quota');return memory.get(k)??null;},setItem(k,v){if(setFault)throw Error('quota');memory.set(k,v);hookSet?.(k,v);}};
 const port={async verifyLease(scope){assert.equal(scope.owner,owner);assert.equal(scope.namespace,EXPEDITION_ACCOUNT_NAMESPACE);leases++;return hookLease?await hookLease(scope):true;},async authorizeFresh(scope){freshChecks++;assert(decodeExpeditionAccount(scope.raw,{owner}));return hookFresh?await hookFresh(scope):true;},async get(scope){gets++;assert.equal(scope.owner,owner);if(hookGet)await hookGet(scope,gets);return {raw:remote,etag};},async put(scope){writes++;assert.equal(scope.owner,owner);if(hookPut)return hookPut(scope);if(scope.ifMatch!==etag)return {status:412};remote=scope.raw;etag=`"${writes}"`;return {status:200};}};
 const store=createExpeditionAccountStore({storage,owner,authority:()=>({uid,isAnonymous:anonymous,enabled,writer:w}),localLease:{key,active:()=>lock},port,now:()=>clock,timeout});
 return {store,storage,memory,key,port,get raw(){return memory.get(key)??null;},get doc(){return this.raw===null?null:JSON.parse(this.raw);},get remote(){return remote;},set remote(v){remote=v;},get writes(){return writes;},get gets(){return gets;},get leases(){return leases;},get freshChecks(){return freshChecks;},set uid(v){uid=v;},set enabled(v){enabled=v;},set anonymous(v){anonymous=v;},set lock(v){lock=v;},get clock(){return clock;},set clock(v){clock=v;},set writer(v){w=v;},set etag(v){etag=v;},set onGet(v){hookGet=v;},set onPut(v){hookPut=v;},set onLease(v){hookLease=v;},set onFresh(v){hookFresh=v;},set onSet(v){hookSet=v;},set readFault(v){readFault=v;},set setFault(v){setFault=v;}};
}
async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
async function initial(e=env()){assert((await e.store.fresh({idFactory})).ok);assert((await e.store.sync()).ok);assert.equal(e.store.read().dirty,false);return e;}
async function proposed(e,mutate=()=>{}){const a=decodeExpeditionAccount(e.doc.confirmedRaw,{owner}),b=clone(a);b.state=clone(a.state);mutate(b.state);b.revision++;b.writeId=`write-${b.revision}-${idFactory()}`;b.updatedAt++;e.clock=Math.max(e.clock,b.updatedAt);b.parent=await expeditionAccountParent(a,{owner});assert(decodeExpeditionAccount(b,{owner}));return b;}
async function stageParty(e){const raw=e.doc.confirmedRaw,b=await proposed(e,s=>assert(setParty(s.roster,[...s.roster.party].reverse())));const r=await e.store.stage(b,{expectedRaw:raw});assert(r.ok,r.reason);return r.raw;}
const freshRecord=()=>createFreshExpeditionAccount({owner,now:base+10,writer:writer(),idFactory});

await check('Explicit mock server fresh/lease and external local lock ports are mandatory; no imported fresh state',async()=>{
 assert.throws(()=>createExpeditionAccountStore({owner,storage:{},authority:()=>({}),port:{}}));
 const e=env();assert.equal((await e.store.fresh({state:freshRecord().state})).reason,'invalid');assert.equal(e.raw,null);assert.equal(e.freshChecks,0);
 e.onFresh=()=>false;assert.equal((await e.store.fresh({idFactory})).reason,'fresh denied');assert.equal(e.raw,null);e.onFresh=()=>true;e.onLease=()=>false;assert.equal((await e.store.fresh({idFactory})).reason,'lease');assert.equal(e.raw,null);
});
await check('Fresh nine bodies upload conditionally, durable exact GET readback retains clean pending receipt',async()=>{
 const e=await initial();assert.equal(e.writes,1);assert.equal(e.gets,2);assert.equal(e.freshChecks,2);assert.equal(e.doc.confirmedRaw,e.remote);assert.equal(e.doc.pending.raw,e.remote);assert.equal(e.doc.backupRaw,null);
 const a=decodeExpeditionAccount(e.remote,{owner});assert.equal(Object.keys(a.state.roster.instances).length,9);assert.equal(a.revision,0);assert.equal(a.state.roster.channel,'account');assert((await e.store.sync()).ok);assert.equal(e.writes,1);
});
await check('Empty server check never blocks subsequent explicitly authorized fresh birth',async()=>{
 const e=env();assert.equal((await e.store.sync({allowPull:true})).kind,'empty');assert.equal(e.raw,null);assert((await e.store.fresh({idFactory})).ok);
});
await check('Actual P1 party mutation stages exact parent, then ACK backs up old confirmed atomic bytes',async()=>{
 const e=await initial(),old=e.remote,p=await stageParty(e);assert.equal(e.doc.confirmedRaw,old);assert(e.store.read().dirty);assert.equal(e.doc.pending.raw,p);assert.equal((await e.store.stage(decodeExpeditionAccount(p,{owner}),{expectedRaw:old})).reason,'pending');
 assert((await e.store.sync()).ok);assert.equal(e.doc.backupRaw,old);assert.equal(e.doc.confirmedRaw,p);assert.equal(e.doc.pending.raw,p);assert.equal(e.writes,2);assert.equal(e.store.read().dirty,false);
});
await check('HOME hatch and growth use actual frozen economy auditor; other bodies/payment/return fail closed',async()=>{
 const a=freshRecord(),s=clone(a.state),eggId='paid-trip:find:choice';s.meta.eggs.push({eggId,speciesId:'pierce',sourceRun:'paid-trip',gardenId:'meadow'});s.meta.rewardIds.push(eggId);s.meta.growthCharges=2;
 const fixture={...a,state:s,revision:1,writeId:`write-1-${idFactory()}`,updatedAt:a.updatedAt+1,parent:await expeditionAccountParent(a,{owner})};assert(decodeExpeditionAccount(fixture,{owner}));const e=env({raw:JSON.stringify(fixture)});assert((await e.store.sync({allowPull:true})).ok);
 const id=`born-${idFactory()}`,receiptId=`hatch:${eggId}`,t={version:1,kind:'hatch',eggId,receiptId,instanceId:id},b=await proposed(e,v=>{assert(recruitInstance(v.roster,{instanceId:id,speciesId:'pierce'}));v.meta.eggs=[];v.meta.rewardIds.push(receiptId);});assert((await e.store.stage(b,{expectedRaw:e.doc.confirmedRaw,transaction:t})).ok);assert((await e.store.sync()).ok);
 const grow={version:1,kind:'grow',receiptId:`growth:${idFactory()}`,instanceId:id},c=await proposed(e,v=>{assert(grantInstanceXP(v.roster,id,10,grow.receiptId));v.meta.growthCharges--;v.meta.growthReceipts.push(grow.receiptId);v.meta.cores.chain++;});assert((await e.store.stage(c,{expectedRaw:e.doc.confirmedRaw,transaction:grow})).ok);assert((await e.store.sync()).ok);
 const raw=e.raw,bad=await proposed(e,v=>{v.meta.returnCount++;v.meta.committedRuns.push('free-return');});assert.equal((await e.store.stage(bad,{expectedRaw:e.doc.confirmedRaw})).ok,false);assert.equal(e.raw,raw);
});
await check('Generic structural codec acceptance does not license free XP/story/death/battle ledger in store',async()=>{
 for(const mutation of [s=>assert(grantInstanceXP(s.roster,s.roster.party[0],10,'freeXP')),s=>{s.roster.story.push('free-story');s.roster.revision++;},s=>assert(damageInstance(s.roster,s.roster.party[0],10,{receiptId:'unproven-battle'}))]){const e=await initial(),raw=e.raw,b=await proposed(e,mutation);assert.equal((await e.store.stage(b,{expectedRaw:e.doc.confirmedRaw})).reason,'ledger required');assert.equal(e.raw,raw);assert.equal(e.writes,1);}
});
await check('Stale parent/campaign/review/future candidate never overwrites pending or confirmed',async()=>{
 const e=await initial(),a=await proposed(e),raw=e.raw;
 for(const mutate of [b=>b.parent.checkpointHash='f'.repeat(64),b=>b.campaignId='campaign-other',b=>b.channel='review',b=>b.version=2]){const b=clone(a);mutate(b);assert.equal((await e.store.stage(b,{expectedRaw:e.doc.confirmedRaw})).ok,false);assert.equal(e.raw,raw);}
 assert.equal((await e.store.stage(a,{expectedRaw:'stale'})).reason,'conflict');
});
await check('UID/gate/guest/local lock/TTL/current lease switch rejects before any GET or PUT',async()=>{
 for(const mutate of [e=>e.uid='other',e=>e.enabled=false,e=>e.anonymous=true,e=>e.lock=false,e=>e.clock=base+60000,e=>e.writer={...writer(),expiresAt:base+120001}]){const e=await initial();await stageParty(e);const raw=e.raw,g=e.gets,p=e.writes;mutate(e);assert.equal((await e.store.sync()).ok,false);assert.equal(e.raw,raw);assert.equal(e.gets,g);assert.equal(e.writes,p);}
});
await check('GET account/gate/lock/TTL losses preserve exact local and foreign remote is never applied',async()=>{
 for(const mutate of [e=>e.uid='other',e=>e.enabled=false,e=>e.lock=false,e=>e.clock=base+60001,e=>e.writer={...writer(),leaseId:'changed'}]){const e=await initial();await stageParty(e);const raw=e.raw,p=e.writes;e.onGet=()=>mutate(e);assert.equal((await e.store.sync()).ok,false);assert.equal(e.raw,raw);assert.equal(e.writes,p);}
 const e=env(),foreign=freshRecord();foreign.ownerUid='other';e.remote=JSON.stringify(foreign);assert.equal((await e.store.sync({allowPull:true})).reason,'invalid');assert.equal(e.raw,null);assert.equal(e.writes,0);
});
await check('412 never merges; missing ETag, permission and offline failures retain confirmed backup and pending',async()=>{
 for(const failure of ['412','401','etag','offline']){const e=await initial();await stageParty(e);assert((await e.store.sync()).ok);await stageParty(e);const raw=e.raw,p=e.writes;if(failure==='etag')e.etag=null;else e.onPut=()=>{if(failure==='offline')throw Error('network');return {status:Number(failure)};};const result=await e.store.sync();assert.equal(result.ok,false);assert.equal(e.raw,raw);assert.equal(e.writes,p+(failure==='etag'?0:1));assert(e.doc.backupRaw);}
});
await check('Lost PUT response preserves pending; exact next GET ACK recovers without duplicate PUT',async()=>{
 const e=await initial(),p=await stageParty(e),before=e.raw;e.onPut=scope=>{e.remote=scope.raw;e.etag='"lost"';throw Error('lost response');};assert.equal((await e.store.sync()).reason,'offline');assert.equal(e.raw,before);const writes=e.writes;e.onPut=null;assert((await e.store.sync()).ok);assert.equal(e.writes,writes);assert.equal(e.doc.confirmedRaw,p);assert.equal(e.doc.pending.raw,p);
});
await check('A PUT200 without exact remote readback cannot ACK another campaign/parent',async()=>{
 const e=await initial();await stageParty(e);const raw=e.raw;e.onPut=()=>({status:200});assert.equal((await e.store.sync()).reason,'conflict');assert.equal(e.raw,raw);
});
await check('PostPUT UID loss or lease denial keeps pending and permits lost-response retry only with original authority',async()=>{
 const e=await initial(),pending=await stageParty(e),raw=e.raw;e.onPut=scope=>{e.remote=scope.raw;e.uid='other';return {status:200};};assert.equal((await e.store.sync()).reason,'account');assert.equal(e.raw,raw);e.uid=owner;e.onPut=null;assert((await e.store.sync()).ok);assert.equal(e.doc.confirmedRaw,pending);
 const f=await initial();await stageParty(f);const before=f.raw;f.onPut=scope=>{f.remote=scope.raw;f.onLease=()=>false;return {status:200};};assert.equal((await f.store.sync()).reason,'lease');assert.equal(f.raw,before);
});
await check('ACK durable write followed by UID loss still retains exact pending raw and old confirmed backup',async()=>{
 const e=await initial(),old=e.remote,p=await stageParty(e);e.onSet=(_,v)=>{if(JSON.parse(v).confirmedRaw===p)e.uid='other';};assert.equal((await e.store.sync()).reason,'account');assert.equal(e.doc.pending.raw,p);assert.equal(e.doc.confirmedRaw,p);assert.equal(e.doc.backupRaw,old);e.uid=owner;e.onSet=null;assert((await e.store.sync()).ok);assert.equal(e.writes,2);
});
await check('Storage quota/readback failure and unknown original/backup bytes are preserved with zero PUT',async()=>{
 const e=await initial(),raw=e.raw,b=await proposed(e);e.setFault=true;assert.equal((await e.store.stage(b,{expectedRaw:e.doc.confirmedRaw})).reason,'storage');assert.equal(e.raw,raw);e.setFault=false;e.readFault=true;assert.equal(e.store.read().reason,'storage');assert.equal((await e.store.sync()).reason,'storage');assert.equal(e.raw,raw);
 for(const bad of ['{bad',JSON.stringify({...e.doc,unknown:1}),JSON.stringify({...e.doc,backupRaw:'{unknown'})]){const f=env();f.memory.set(f.key,bad);assert.equal((await f.store.sync()).reason,'invalid');assert.equal(f.raw,bad);assert.equal(f.writes,0);assert.equal(f.gets,0);}
 const g=await initial();await stageParty(g);const before=g.raw;g.onSet=(key)=>g.memory.set(key,before);assert.equal((await g.store.sync()).reason,'storage');assert.equal(g.raw,before);
});
await check('Local bytes changed during GET/async stage cannot be stale uploaded/ACKed',async()=>{
 const e=await initial();await stageParty(e);const original=e.raw,changed=JSON.stringify({...e.doc,etag:'"local-other"'});e.onGet=()=>e.memory.set(e.key,changed);assert.equal((await e.store.sync()).reason,'conflict');assert.equal(e.raw,changed);assert.equal(e.writes,1);assert.notEqual(original,changed);
 const f=await initial(),b=await proposed(f),edited=JSON.stringify({...f.doc,etag:'"other"'});f.onLease=()=>{f.memory.set(f.key,edited);return true;};assert.equal((await f.store.stage(b,{expectedRaw:f.doc.confirmedRaw})).reason,'conflict');assert.equal(f.raw,edited);
});
await check('Fresh denial during retry and existing remote campaign never overwrite server or delete candidate',async()=>{
 const e=env();assert((await e.store.fresh({idFactory})).ok);const raw=e.raw;e.onFresh=()=>false;assert.equal((await e.store.sync()).reason,'fresh denied');assert.equal(e.raw,raw);assert.equal(e.writes,0);
 const f=env({raw:JSON.stringify(freshRecord())});assert((await f.store.fresh({idFactory})).ok);const p=f.raw;assert.equal((await f.store.sync()).reason,'conflict');assert.equal(f.raw,p);assert.equal(f.writes,0);
});
await check('PC-to-phone confirmed pull uses isolated namespace; expired old writer is readable but not authority',async()=>{
 const e=await initial();await stageParty(e);assert((await e.store.sync()).ok);const phone=env({raw:e.remote});phone.writer={deviceId:'phone',leaseId:'phone-lease',issuedAt:base,expiresAt:base+60000};assert((await phone.store.sync({allowPull:true})).ok);assert.equal(phone.doc.confirmedRaw,e.remote);assert.equal(phone.doc.pending,null);const a=decodeExpeditionAccount(phone.doc.confirmedRaw,{owner}),s=clone(a.state);assert(setParty(s.roster,[...s.roster.party].reverse()));const next=await nextExpeditionAccount(a,{owner,state:s,now:base+30,writer:{deviceId:'phone',leaseId:'phone-lease',issuedAt:base,expiresAt:base+60000},idFactory});assert(next.ok);phone.clock=base+30;assert((await phone.store.stage(next.record,{expectedRaw:phone.doc.confirmedRaw})).ok);assert((await phone.store.sync()).ok);e.remote=phone.remote;const before=e.raw;assert.equal((await e.store.sync({allowPull:true})).reason,'conflict','existing campaign descendant requires explicitly audited handoff; no silent replace');assert.equal(e.raw,before);
});
await check('Timeout ends requests and late responses cannot mutate local storage',async()=>{
 const e=env({timeout:10});let release;e.onFresh=()=>new Promise(resolve=>release=resolve);const promise=e.store.fresh({idFactory});assert.equal((await promise).reason,'offline');assert.equal(e.raw,null);release(true);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(e.raw,null);
 const f=await initial(env({timeout:10}));await stageParty(f);const raw=f.raw;f.onGet=()=>new Promise(resolve=>release=resolve);assert.equal((await f.store.sync()).reason,'offline');release();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(f.raw,raw);assert.equal(f.writes,1);
});
await check('Writer identity/future timestamp boundaries reject before staging; simultaneous sync shares one flight',async()=>{
 const e=await initial(),b=await proposed(e),before=e.raw;b.updatedAt=e.clock+1;assert.equal((await e.store.stage(b,{expectedRaw:e.doc.confirmedRaw})).reason,'lease');assert.equal(e.raw,before);
 for(const w of [{...writer(),issuedAt:0},{...writer(),deviceId:'constructor'},{...writer(),leaseId:'x'.repeat(129)}]){const f=env();f.writer=w;assert.equal((await f.store.sync()).reason,'lease');assert.equal(f.gets,0);}
 const f=await initial();await stageParty(f);let release,entered;
 const requestEntered=new Promise(resolve=>entered=resolve);
 f.onGet=()=>new Promise(resolve=>{release=resolve;entered();});
 const p=f.store.sync(),q=f.store.sync();assert.equal(p,q);
 // Account hashing/validation can outlive a nominal zero-delay timer.
 // Observe the actual mock GET barrier before releasing its response.
 let timeout;try{await Promise.race([requestEntered,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('sync never entered the mock GET')),2000);})]);}finally{clearTimeout(timeout);}
 f.onGet=null;release();assert((await p).ok);assert.equal(f.writes,2);
});
await check('Pending persisted tamper/unknown ledger cannot upload even when stored account shape is valid',async()=>{
 const e=await initial(),p=await stageParty(e),valid=e.doc,pending=decodeExpeditionAccount(p,{owner});assert(grantInstanceXP(pending.state.roster,pending.state.roster.party[0],1,'tampered-free-xp'));valid.pending.raw=JSON.stringify(pending);e.memory.set(e.key,JSON.stringify(valid));const before=e.raw;assert.equal((await e.store.sync()).reason,'ledger required');assert.equal(e.raw,before);assert.equal(e.writes,1);
 const f=await initial();await stageParty(f);const doc=f.doc;doc.pending.transaction={version:1,kind:'grow',receiptId:'growth:fake',instanceId:decodeExpeditionAccount(doc.pending.raw,{owner}).state.roster.party[0]};f.memory.set(f.key,JSON.stringify(doc));const raw=f.raw;assert.equal((await f.store.sync()).reason,'ledger required');assert.equal(f.raw,raw);assert.equal(f.writes,1);
});
for(const file of ['src/expedition/account-store.js','src/expedition/account-codec.js','src/expedition/account-economy.js'])console.log(`SOURCE ${file} SHA256 ${createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex')}`);
console.log(`Isolated expedition account store: ${groups} groups PASS. Synthetic account/mock ETag+lease ports; no live Firebase, account gameplay integration, server anti-cheat or device QA proof.`);
