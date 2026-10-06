import assert from 'node:assert/strict';
import {createExpeditionAccountTransport,decodeExpeditionCloudHead,encodeExpeditionCloudHead,encodeExpeditionCloudReceipt,decodeExpeditionCloudReceipt,expeditionWireKey} from '../src/expedition/account-transport.js';
import {createExpeditionAccountStore,expeditionAccountStoreKey,expeditionAccountRecoveryKey,EXPEDITION_ACCOUNT_NAMESPACE} from '../src/expedition/account-store.js';
import {createExpeditionAccountController} from '../src/expedition/account-controller.js';
import {createFreshExpeditionAccount,decodeExpeditionAccount,expeditionAccountParent} from '../src/expedition/account-codec.js';
import {nextExpeditionRuntimeAccount} from '../src/expedition/account-runtime.js';
import {createExpeditionLineageReceipt} from '../src/expedition/account-lineage.js';
import {expeditionCombatTurn} from '../src/expedition/combat.js';
import {expeditionMovementJournalKey} from '../src/expedition/account-movement-journal.js';
const copy=v=>structuredClone(v),owner='transport-test',base=1700000000000;
let serial=0,checks=0;const id=()=>`test-${++serial}`;
async function check(name,run){await run();checks++;console.log('PASS '+name);}
function rig(){
 const values=new Map(),versions=new Map(),requests=[];let clock=base,uid=owner,anonymous=false,enabled=true,lock=true,hook=null,tokenHook=null;
 const root=`/${EXPEDITION_ACCOUNT_NAMESPACE}/${owner}/`,head=root+'head',lease=root+'lease';
 const put=(path,value)=>{values.set(path,copy(value));versions.set(path,(versions.get(path)||0)+1);};
 const tag=path=>`"${versions.get(path)||0}"`;
 const result=(value,status=200,etag=null)=>new Response(JSON.stringify(value),{status,headers:etag?{'ETag':etag}:{}});
 const fetchImpl=async(url,options)=>{
  const u=new URL(url),path=u.pathname.replace(/\.json$/,''),method=options.method||'GET';
  assert.equal(u.origin,'http://127.0.0.1:9999');assert.equal(u.searchParams.get('ns'),'demo-seed');assert.equal(u.searchParams.get('auth'),'test-token');
  assert.ok(path.startsWith(root));assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal);
  const entry={path,method,headers:copy(options.headers),query:Object.fromEntries([...u.searchParams].filter(([k])=>k!=='auth'))};requests.push(entry);
  if(hook){const response=await hook({path,method,options});if(response)return response;}
  if(options.signal.aborted)throw Error('aborted');
  if(method==='GET'){
   if(u.searchParams.has('orderBy')){
    assert.equal(options.headers['X-Firebase-ETag'],undefined,'filtered history does not request conditional-write ETag');
    const end=Number(u.searchParams.get('endAt')),limit=Number(u.searchParams.get('limitToLast'));
    const items=[...values].filter(([k,v])=>k.startsWith(path+'/')&&v.revision<=end).sort((a,b)=>a[1].revision-b[1].revision).slice(-limit);
    return result(items.length?Object.fromEntries(items.map(([k,v])=>[k.slice(path.length+1),copy(v)])):null);
   }
   assert.equal(options.headers['X-Firebase-ETag'],'true');return result(values.get(path)??null,200,tag(path));
  }
  assert.equal(method,'PUT','no DELETE/PATCH/full-owner write');assert.equal(options.headers['Content-Type'],'application/json');
  if(options.headers['if-match']!==tag(path))return result({error:'stale'},412,tag(path));
  const body=JSON.parse(options.body);
  if(path!==lease){const l=values.get(lease),w=path===head?decodeExpeditionAccount(body.checkpoint,{owner})?.writer:body.writer;if(!l||l.closed||l.writer.expiresAt<=clock||JSON.stringify(l.writer)!==JSON.stringify(w))return result({error:'lease'},403);}
  if(path.includes('/receipts/')&&values.has(path))return result({error:'immutable'},403);
  put(path,body);return result(body);
 };
 const account={user:()=>({uid,isAnonymous:anonymous}),async tokenSession(){if(tokenHook)await tokenHook();return {uid,idToken:'test-token'};}};
 function device(deviceId='pc',overrides={}){
  const map=new Map(),key=expeditionAccountStoreKey(owner),localLease={key,active:()=>lock};
  const transport=createExpeditionAccountTransport({account,owner,deviceId,localLease,databaseURL:'http://127.0.0.1:9999/?ns=demo-seed',enabled:()=>enabled,fetchImpl,now:()=>clock,idFactory:id,leaseMs:90000,allowEmulator:true,...overrides});
  const store=createExpeditionAccountStore({storage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},owner,localLease,authority:transport.authority,port:transport.port,now:()=>clock,timeout:60000});
  return {transport,store,map,scope:()=>({owner,namespace:EXPEDITION_ACCOUNT_NAMESPACE,ticket:transport.writer(),signal:new AbortController().signal})};
 }
 return {device,values,requests,head,lease,root,put,result,get clock(){return clock;},set clock(v){clock=v;},set uid(v){uid=v;},set anonymous(v){anonymous=v;},set enabled(v){enabled=v;},set lock(v){lock=v;},set hook(v){hook=v;},set tokenHook(v){tokenHook=v;}};
}
async function initial(){const e=rig(),pc=e.device();assert.ok((await pc.transport.acquire()).ok);e.clock++;assert.ok((await pc.store.fresh({idFactory:id})).ok);assert.ok((await pc.store.sync()).ok);return {e,pc};}
async function stage(e,d,commands,generatedIds=[]){const a=decodeExpeditionAccount(d.store.read().confirmedRaw,{owner}),t={version:1,kind:'runtime',receiptId:`write-${a.revision+1}-${id()}`,commands,generatedIds};e.clock++;const b=await nextExpeditionRuntimeAccount(a,{owner,transaction:t,now:e.clock,writer:d.transport.writer()});assert.ok(b.ok,b.reason);assert.ok((await d.store.stage(b.raw,{expectedRaw:JSON.stringify(a),transaction:t})).ok);return {a,b,t};}
async function play(e,d,commands,generatedIds=[]){const x=await stage(e,d,commands,generatedIds);const result=await d.store.sync();assert.ok(result.ok,result.reason);return x.b.record;}

await check('Firebase origin, finite lease and explicit lock/auth/gate are required before any request',async()=>{
 const e=rig();for(const databaseURL of ['https://evil.example','http://real.firebaseio.com','https://fakefirebaseio.com','https://seed.firebaseio.com/path','https://user:pass@seed.firebaseio.com','https://seed.firebaseio.com/?auth=oops','http://127.0.0.1:9999/?ns=live-seed'])assert.throws(()=>e.device('pc',{databaseURL}),TypeError);
 for(const leaseMs of [0,120001,1.5])assert.throws(()=>e.device('pc',{leaseMs}),TypeError);
 for(const [set,reset] of [[()=>e.uid='foreign',()=>e.uid=owner],[()=>e.anonymous=true,()=>e.anonymous=false],[()=>e.enabled=false,()=>e.enabled=true],[()=>e.lock=false,()=>e.lock=true]]){set();assert.equal((await e.device().transport.acquire()).ok,false);assert.equal(e.requests.length,0);reset();}
 assert.notEqual(expeditionWireKey('write-1.a'),expeditionWireKey('write-1-a'));assert.match(expeditionWireKey('campaign.a'),/^[a-f0-9]+$/);
});
await check('Lease conditional acquire/readback rejects contention, expiry fences old writer and release is retained',async()=>{
 const e=rig(),pc=e.device(),phone=e.device('phone');const both=await Promise.all([pc.transport.acquire(),pc.transport.acquire()]);assert.ok(both.every(x=>x.ok));assert.equal(e.requests.filter(r=>r.method==='PUT').length,1);
 assert.equal((await phone.transport.acquire()).reason,'busy');const old=pc.transport.writer();e.clock=old.expiresAt;assert.equal(pc.store.read().reason,'lease');assert.ok((await phone.transport.acquire()).ok);
 assert.equal(await pc.transport.port.verifyLease(pc.scope()).catch(x=>x.message),'lease');assert.ok((await phone.transport.release()).ok);assert.equal(e.values.get(e.lease).closed,true);assert.ok((await pc.transport.acquire()).ok);assert.notEqual(pc.transport.writer().leaseId,old.leaseId);
});
await check('Lease PUT lost response recovers only the identical proposed ticket, not a new write',async()=>{
 const e=rig(),d=e.device();let once=true;e.hook=({path,method,options})=>{if(path===e.lease&&method==='PUT'&&once){once=false;e.put(path,JSON.parse(options.body));throw Error('response lost');}};
 assert.equal((await d.transport.acquire()).ok,false);const writes=e.requests.filter(r=>r.method==='PUT').length;assert.ok((await d.transport.acquire()).ok);assert.equal(e.requests.filter(r=>r.method==='PUT').length,writes);
});
await check('Head envelope binds owner, raw checkpoint and canonical digest rather than trusting metadata',async()=>{
 const {e,pc}=await initial(),v=e.values.get(e.head);assert.equal(await decodeExpeditionCloudHead(v,{owner}),pc.store.read().confirmedRaw);
 for(const mutate of [x=>x.ownerUid='foreign',x=>x.checkpointHash='0'.repeat(64),x=>x.revision++,x=>x.checkpoint=x.checkpoint.replace('orbit','pierce'),x=>x.extra=true]){const bad=copy(v);mutate(bad);await assert.rejects(decodeExpeditionCloudHead(bad,{owner}));}
 assert.equal(e.requests.some(r=>r.path===e.root.slice(0,-1)&&r.method==='PUT'),false);
});
await check('Exact real naming transaction publishes immutable receipt before conditional head and readback ACK',async()=>{
 const {e,pc}=await initial();let a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),seed=a.state.roster.party[0];await play(e,pc,[{type:'rename',instanceId:seed,name:'잎새'}]);
 const puts=e.requests.filter(r=>r.method==='PUT'),receiptIndex=puts.findIndex(r=>r.path.includes('/receipts/'));assert.ok(receiptIndex>0);assert.equal(puts[receiptIndex+1].path,e.head);assert.ok(puts.every(r=>typeof r.headers['if-match']==='string'));
 assert.equal(decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}).state.roster.instances[seed].nickname,'잎새');assert.equal(pc.store.read().dirty,false);
});
await check('PC→phone→PC uses actual HTTP adapter: named seed, encounter HP/turn and compact ancestry survive',async()=>{
 const {e,pc}=await initial();const seed=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}).state.roster.party[0];await play(e,pc,[{type:'rename',instanceId:seed,name:'새봄'}]);const previous=pc.store.read().confirmedRaw;
 assert.ok((await pc.transport.release()).ok);const phone=e.device('phone');assert.ok((await phone.transport.acquire()).ok);assert.ok((await phone.store.sync({allowPull:true})).ok);
 await play(e,phone,[{type:'depart',gardenId:'meadow',difficulty:1}],[id()]);await play(e,phone,Array.from({length:70},()=>({type:'move',dx:1,dt:.05})));await play(e,phone,[{type:'interact'}]);await play(e,phone,Array.from({length:70},()=>({type:'move',dx:1,dt:.05})));let state=await play(e,phone,[{type:'interact'}]);
 assert.equal(state.state.screen,'battle');for(let n=0;n<12&&state.state.screen==='battle';n++){const actor=expeditionCombatTurn(state.state.battle),target=state.state.battle.units.find(u=>u.side==='enemy'&&!u.dead&&u.slot<5);state=await play(e,phone,[actor.side==='enemy'?{type:'enemy'}:{type:'action',kind:'attack',targetId:target.id}]);}
 const expected=phone.store.read().confirmedRaw;assert.ok((await phone.transport.release()).ok);assert.ok((await pc.transport.acquire()).ok);const writes=e.requests.filter(r=>r.method==='PUT').length;
 const adopted=await pc.store.sync({allowPull:true});assert.ok(adopted.ok,adopted.reason);assert.equal(adopted.raw,expected);assert.equal(pc.store.read().backupRaw,previous);assert.equal(pc.store.read().pending,null);assert.equal(e.requests.filter(r=>r.method==='PUT').length,writes);assert.equal(decodeExpeditionAccount(expected,{owner}).state.roster.instances[seed].nickname,'새봄');
});
await check('Lost head PUT response keeps pending; exact head and published receipt retry never PUT twice',async()=>{
 const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner});await stage(e,pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'별빛'}]);let once=true;
 e.hook=({path,method,options})=>{if(path===e.head&&method==='PUT'&&once){once=false;e.put(path,JSON.parse(options.body));throw Error('lost response');}};
 assert.equal((await pc.store.sync()).ok,false);assert.equal(pc.store.read().dirty,true);const writes=e.requests.filter(r=>r.method==='PUT').length;assert.ok((await pc.store.sync()).ok);assert.equal(pc.store.read().dirty,false);assert.equal(e.requests.filter(r=>r.method==='PUT').length,writes);
});
await check('Receipt collision, missing readback and head race never erase pending or overwrite another branch',async()=>{
 for(const mode of ['collision','readback','race']){
  const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),x=await stage(e,pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'기다림'}]);
  const r=await createExpeditionLineageReceipt(x.a,x.b.raw,{owner,transaction:x.t});assert.ok(r.ok);const path=e.root+`receipts/${expeditionWireKey(r.receipt.campaignId)}/${expeditionWireKey(r.receipt.writeId)}`,saved=pc.map.get(expeditionAccountStoreKey(owner));
  if(mode==='collision')e.put(path,encodeExpeditionCloudReceipt({...r.receipt,checkpointHash:'0'.repeat(64)},{owner}));
  if(mode==='readback')e.hook=({path:p,method})=>{if(p===path&&method==='PUT')return e.result(r.receipt);};
  if(mode==='race')e.hook=({path:p,method})=>{if(p===e.head&&method==='PUT')e.put(e.head,e.values.get(e.head));};
  assert.equal((await pc.store.sync()).ok,false,mode);assert.equal(pc.store.read().dirty,true);assert.equal(pc.map.get(expeditionAccountStoreKey(owner)),saved);
 }
});
await check('Token/GET/body awaits recheck UID, gate, lock and bounded responses without exposing credentials',async()=>{
 for(const kind of ['uid','gate','lock','oversize','noetag','forbidden']){
  const {e,pc}=await initial();e.hook=({path,method})=>{if(path===e.head&&method==='GET'){if(kind==='uid')e.uid='foreign';if(kind==='gate')e.enabled=false;if(kind==='lock')e.lock=false;if(kind==='oversize')return new Response('null',{headers:{'ETag':'"1"','Content-Length':'99999999'}});if(kind==='noetag')return new Response('null');if(kind==='forbidden')return new Response('{"error":"denied"}',{status:403});}};
  const bytes=pc.map.get(expeditionAccountStoreKey(owner));const result=await pc.store.sync();assert.equal(result.ok,false,kind);assert.equal(pc.map.get(expeditionAccountStoreKey(owner)),bytes);assert.equal(JSON.stringify(result).includes('test-token'),false);
 }
 const e=rig(),d=e.device();e.tokenHook=()=>{e.uid='foreign';};assert.equal((await d.transport.acquire()).reason,'account');assert.equal(e.requests.length,0);
});
await check('Fresh factory remains nine pristine bodies; no review import or arbitrary account replacement',async()=>{
 const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner});assert.equal(Object.keys(a.state.roster.instances).length,9);
 assert.equal(await pc.transport.port.authorizeFresh({...pc.scope(),raw:JSON.stringify(a)}),false);const imported=copy(a);imported.channel='review';assert.equal(await pc.transport.port.authorizeFresh({...pc.scope(),raw:JSON.stringify(imported)}),false);
 const second=createFreshExpeditionAccount({owner,now:e.clock,writer:pc.transport.writer(),idFactory:id});await assert.rejects(pc.transport.port.put({...pc.scope(),raw:JSON.stringify(second),ifMatch:(await pc.transport.port.get(pc.scope())).etag,lineage:null}),/conflict/);
});
await check('Abort/timeouts terminate slow auth and never acquire or write after late completion',async()=>{
 const e=rig(),d=e.device('pc',{timeout:15});e.tokenHook=()=>new Promise(resolve=>setTimeout(resolve,45));assert.equal((await d.transport.acquire()).reason,'offline');await new Promise(resolve=>setTimeout(resolve,60));assert.equal(e.requests.length,0);assert.equal(d.transport.writer(),null);
});
await check('Expired lost-response write is ACKed under new lease without rewriting its historical writer or receipt',async()=>{
 const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),x=await stage(e,pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'되찾은 별빛'}]);
 const saved=pc.map.get(expeditionAccountStoreKey(owner));let once=true;
 e.hook=({path,method,options})=>{if(path===e.head&&method==='PUT'&&once){once=false;e.put(path,JSON.parse(options.body));throw Error('lost');}};
 assert.equal((await pc.store.sync()).ok,false);assert.equal(pc.map.get(expeditionAccountStoreKey(owner)),saved);
 e.hook=null;e.clock=pc.transport.writer().expiresAt+1;assert.ok((await pc.transport.acquire()).ok);
 const before=e.requests.filter(r=>r.method==='PUT').length;
 assert.equal((await pc.store.sync()).reason,'lease');
 const recovered=await pc.store.sync({recoverPending:true});assert.ok(recovered.ok,recovered.reason);assert.equal(recovered.raw,x.b.raw);
 assert.equal(e.requests.filter(r=>r.method==='PUT').length,before);assert.equal(pc.store.read().dirty,false);
});
await check('Unsent expired paid command reissues only same-parent/same-state with an archived original',async()=>{
 for(const orphan of [false,true]){
  const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),x=await stage(e,pc,[{type:'depart',gardenId:'meadow',difficulty:1}],['exact-run']);
  if(orphan){e.hook=({path,method})=>{if(path===e.head&&method==='PUT')throw Error('head not sent');};assert.equal((await pc.store.sync()).ok,false);e.hook=null;}
  const old=pc.map.get(expeditionAccountStoreKey(owner)),oldWriter=pc.transport.writer();e.clock=oldWriter.expiresAt+1;assert.ok((await pc.transport.acquire()).ok);
  const result=await pc.store.sync({recoverPending:true});assert.ok(result.ok,result.reason);
  const b=decodeExpeditionAccount(result.raw,{owner});assert.notEqual(b.writeId,x.b.record.writeId);assert.equal(b.revision,1);assert.deepEqual(b.state,x.b.record.state);assert.deepEqual(b.parent,x.b.record.parent);assert.deepEqual(b.writer,pc.transport.writer());
  assert.equal(pc.map.get(expeditionAccountRecoveryKey(owner,x.b.record.writeId)),old);
  const receipt=(await pc.transport.port.getLineage({...pc.scope(),head:(await expeditionAccountParent(b,{owner})),stopAfterRevision:0,limit:1})).receipts[0];
  assert.equal(receipt.transaction.receiptId,b.writeId);assert.deepEqual(receipt.transaction.generatedIds,['exact-run']);
  assert.equal(b.state.route.runId,'run-exact-run');assert.equal(b.state.meta.returnCount,0);
 }
});
await check('Never-uploaded pristine birth retains individuals/campaign and archives original when lease expires',async()=>{
 const e=rig(),pc=e.device();assert.ok((await pc.transport.acquire()).ok);e.clock++;assert.ok((await pc.store.fresh({idFactory:id})).ok);
 const old=pc.map.get(expeditionAccountStoreKey(owner)),a=decodeExpeditionAccount(pc.store.read().pending.raw,{owner});e.clock=pc.transport.writer().expiresAt+1;assert.ok((await pc.transport.acquire()).ok);
 const result=await pc.store.sync({recoverPending:true});assert.ok(result.ok,result.reason);const b=decodeExpeditionAccount(result.raw,{owner});
 assert.equal(b.campaignId,a.campaignId);assert.deepEqual(b.state,a.state);assert.equal(b.createdAt,b.updatedAt);assert.ok(b.createdAt>a.createdAt);assert.equal(pc.map.get(expeditionAccountRecoveryKey(owner,a.writeId)),old);
});
await check('Recovery refuses dirty forks and tampered runtime payment before overwriting exact local bytes',async()=>{
 for(const mode of ['fork','tamper']){
  const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner});await stage(e,pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'소중한 씨앗'}]);
  if(mode==='tamper'){const doc=JSON.parse(pc.map.get(expeditionAccountStoreKey(owner))),b=JSON.parse(doc.pending.raw);b.state.roster.instances[a.state.roster.party[0]].nickname='변조';doc.pending.raw=JSON.stringify(b);pc.map.set(expeditionAccountStoreKey(owner),JSON.stringify(doc));}
  else {const phone=e.device('phone');assert.ok((await pc.transport.release()).ok);assert.ok((await phone.transport.acquire()).ok);assert.ok((await phone.store.sync({allowPull:true})).ok);await play(e,phone,[{type:'rename',instanceId:a.state.roster.party[0],name:'다른 기기'}]);assert.ok((await phone.transport.release()).ok);}
  e.clock+=100000;assert.ok((await pc.transport.acquire()).ok);const old=pc.map.get(expeditionAccountStoreKey(owner)),puts=e.requests.filter(r=>r.method==='PUT').length;
  assert.equal((await pc.store.sync({recoverPending:true})).ok,false);assert.equal(pc.map.get(expeditionAccountStoreKey(owner)),old);assert.equal(e.requests.filter(r=>r.method==='PUT').length,puts);
 }
});
await check('Recovery backup quota, archived collision and post-backup gate loss preserve primary and make zero head PUT',async()=>{
 for(const mode of ['quota','collision','gate']){
  const {e,pc}=await initial(),a=decodeExpeditionAccount(pc.store.read().confirmedRaw,{owner}),x=await stage(e,pc,[{type:'rename',instanceId:a.state.roster.party[0],name:'보존'}]);
  e.clock=pc.transport.writer().expiresAt+1;assert.ok((await pc.transport.acquire()).ok);const old=pc.map.get(expeditionAccountStoreKey(owner)),puts=e.requests.filter(r=>r.method==='PUT').length,key=expeditionAccountRecoveryKey(owner,x.b.record.writeId);
  if(mode==='collision')pc.map.set(key,'unknown original');
  else {const set=pc.map.set.bind(pc.map);pc.map.set=(k,v)=>{if(k===key){if(mode==='quota')throw Error('quota');if(mode==='gate')e.enabled=false;}return set(k,v);};}
  assert.equal((await pc.store.sync({recoverPending:true})).ok,false);assert.equal(pc.map.get(expeditionAccountStoreKey(owner)),old);assert.equal(e.requests.filter(r=>r.method==='PUT').length,puts);
 }
});
async function controlled(e,d){let held=true,released=0;const localLease={active:()=>held,async release(){held=false;released++;}};const controller=await createExpeditionAccountController({owner,currentOwner:()=>e.uid??owner,store:d.store,transport:d.transport,localLease,now:()=>e.clock,idFactory:id});return {controller,get released(){return released;}};}
await check('Account controller creates only server-authorized nine bodies and commits individual name through real wire',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d),s=c.controller.state();assert.equal(s.review,false);assert.equal(s.saveState,'saved');assert.equal(Object.keys(s.roster.instances).length,9);
 const result=await c.controller.dispatch({type:'rename',instanceId:s.roster.party[0],name:'내 원정대'});assert.ok(result.ok,result.reason);assert.equal(c.controller.state().roster.instances[s.roster.party[0]].nickname,'내 원정대');assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.roster.instances[s.roster.party[0]].nickname,'내 원정대');
 assert.ok((await c.controller.close()).ok);assert.equal(c.released,1);assert.equal(e.values.get(e.lease).closed,true);
});
await check('Actual controller movement is bounded and pause/close flushes exact final position without per-frame uploads',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1})).ok);
 const putCount=()=>e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,start=putCount();
 const originalView=c.controller.state(),position=originalView.route.position;
 for(let n=0;n<31;n++){assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.08})).ok);assert.equal(c.controller.state().roster,originalView.roster,'movement must not clone complete history/roster each frame');assert.equal(originalView.route.position,position,'previous displayed snapshot remains immutable');}
 assert.equal(putCount(),start);assert.equal(c.controller.state().saveState,'pending');assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.08})).ok);assert.equal(putCount(),start+1);
 for(let n=0;n<3;n++)await c.controller.dispatch({type:'move',dx:1,dt:.08});const at=c.controller.state().route.position;
 assert.ok((await c.controller.dispatch({type:'pause',paused:true})).ok);assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.route.position,at);assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.08})).ok,false);
 assert.ok((await c.controller.dispatch({type:'pause',paused:false})).ok);await c.controller.dispatch({type:'move',dx:-1,dt:.08});const final=c.controller.state().route.position;assert.ok((await c.controller.close()).ok);assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.route.position,final);assert.equal(c.released,1);
});
await check('Slow movement upload preserves a bounded input tail and exact pause/close result without unlocking paid actions',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'fire',difficulty:1})).ok);
 let release,entered,once=true;const held=new Promise(r=>release=r),reached=new Promise(r=>entered=r);
 e.hook=async({path,method})=>{if(path===e.head&&method==='PUT'&&once){once=false;entered();await held;}};
 for(let n=0;n<31;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
 const first=c.controller.dispatch({type:'move',dx:1,dt:.01});await reached;
 assert(c.controller.canMoveWhileSaving());const roster=c.controller.state().roster;
 for(let n=0;n<12;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
 const arrived=c.controller.state().route.position;assert.equal(c.controller.state().roster,roster);assert(Math.abs(arrived-44*.04)<1e-9);
 assert.equal((await c.controller.dispatch({type:'interact'})).ok,false,'a paid step never races the checkpoint');
 assert.equal((await c.controller.dispatch({type:'rename',instanceId:c.controller.state().roster.party[0],name:'racing'})).ok,false);
 release();assert.ok((await first).ok);assert.equal(c.controller.state().route.position,arrived,'confirmation must not teleport the displayed tail backward');assert.equal(c.controller.state().saveState,'pending');assert.equal(c.controller.canMoveWhileSaving(),false);
 assert.ok((await c.controller.dispatch({type:'pause',paused:true})).ok);assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.route.position,arrived);
 assert.ok((await c.controller.close()).ok);assert.equal(c.released,1);
});
await check('Slow upload buffer applies backpressure and drains full tail as one bounded replay receipt',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1})).ok);
 let release,entered,once=true;const held=new Promise(r=>release=r),reached=new Promise(r=>entered=r);e.hook=async({path,method})=>{if(path===e.head&&method==='PUT'&&once){once=false;entered();await held;}};
 for(let n=0;n<31;n++)await c.controller.dispatch({type:'move',dx:1,dt:.001});const flight=c.controller.dispatch({type:'move',dx:1,dt:.001});await reached;
 for(let n=0;n<128;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.001})).ok);
 const final=c.controller.state().route.position;assert.equal(c.controller.canMoveWhileSaving(),false);assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.001})).ok,false);assert.equal(c.controller.state().route.position,final);
 release();assert.ok((await flight).ok);assert.equal(c.controller.state().route.position,final);assert.equal(c.controller.state().saveState,'saved');assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.route.position,final);
 const payloads=[...e.values.entries()].filter(([path])=>path.includes('/receipts/')).map(([,r])=>JSON.parse(r.payload));assert(payloads.every(r=>r.transaction?.commands?.length<=128));await c.controller.close();
});
await check('UID loss during a movement flight stops queued input and preserves staged original',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'snow',difficulty:1})).ok);
 let release,entered,once=true;const held=new Promise(r=>release=r),reached=new Promise(r=>entered=r);e.hook=async({path,method})=>{if(path===e.head&&method==='PUT'&&once){once=false;entered();await held;}};
 for(let n=0;n<31;n++)await c.controller.dispatch({type:'move',dx:1,dt:.01});const flight=c.controller.dispatch({type:'move',dx:1,dt:.01});await reached;
 const original=d.map.get(expeditionAccountStoreKey(owner)),position=c.controller.state().route.position;e.uid='foreign';assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok,false);assert.equal(c.controller.state().route.position,position);assert(c.controller.state().paused);assert.equal(c.controller.canMoveWhileSaving(),false);
 release();assert.equal((await flight).ok,false);assert.equal(d.map.get(expeditionAccountStoreKey(owner)),original);await c.controller.close();
});
await check('Controller clean lease rotation preserves exact campaign and normal invalid action does not poison session',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d),before=c.controller.state();assert.equal((await c.controller.dispatch({type:'action',kind:'attack',targetId:'absent'})).ok,false);assert.equal(c.controller.state().saveState,'saved');
 const old=d.transport.writer();e.clock=old.expiresAt-14000;const result=await c.controller.dispatch({type:'rename',instanceId:before.roster.party[0],name:'새 권한'});assert.ok(result.ok,result.reason);assert.notEqual(d.transport.writer().leaseId,old.leaseId);assert.equal(c.controller.state().roster.party[0],before.roster.party[0]);assert.equal(e.values.get(e.head).revision,1);await c.controller.close();
});
await check('Controller lost response pauses on durable paid result; close/reopen recovers without duplicate action',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d),s=c.controller.state();let once=true;
 e.hook=({path,method,options})=>{if(path===e.head&&method==='PUT'&&once){once=false;e.put(path,JSON.parse(options.body));throw Error('lost');}};
 assert.equal((await c.controller.dispatch({type:'rename',instanceId:s.roster.party[0],name:'살아 있는 기록'})).ok,false);assert.equal(c.controller.state().paused,true);assert.equal(c.controller.state().roster.instances[s.roster.party[0]].nickname,'살아 있는 기록');
 e.hook=null;assert.equal((await c.controller.close()).ok,false);const count=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length;
 const reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'saved');assert.equal(reopened.controller.state().roster.instances[s.roster.party[0]].nickname,'살아 있는 기록');assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,count);await reopened.controller.close();
});
await check('Controller UID/gate failure never grants a review fallback or performs paid continuation',async()=>{
 const e=rig();e.enabled=false;const d=e.device(),c=await controlled(e,d);assert.equal(c.controller.state().saveState,'error');assert.equal(c.controller.state().roster,null);assert.equal(e.requests.length,0);await c.controller.close();
 const f=rig(),p=f.device(),v=await controlled(f,p);f.uid='foreign';const count=f.requests.length;assert.equal((await v.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1})).ok,false);assert.equal(f.requests.length,count);await v.controller.close();
});
await check('Close distinguishes durable progress from failed lease handoff and always releases the local lock once',async()=>{
 for(const lostAfterWrite of [false,true]){
  const e=rig(),d=e.device(),c=await controlled(e,d);
  assert.ok((await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1})).ok);
  for(let n=0;n<7;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
  const position=c.controller.state().route.position;
  e.hook=({path,method,options})=>{if(path===e.lease&&method==='PUT'&&JSON.parse(options.body).closed){if(lostAfterWrite)e.put(path,JSON.parse(options.body));throw Error('lost release');}};
  const closing=c.controller.close();assert.equal(c.controller.close(),closing);
  const result=await closing;assert.equal(result.ok,false);assert.equal(result.saved,true);assert.equal(result.handoff,false);assert.match(result.reason,/서버에 저장/);
  assert.equal(c.released,1);assert.equal(c.controller.isActive(),false);
  const doc=JSON.parse(d.map.get(expeditionAccountStoreKey(owner)));assert.equal(doc.pending.raw,doc.confirmedRaw);assert.equal(decodeExpeditionAccount(e.values.get(e.head).checkpoint,{owner}).state.route.position,position);
  const raw=e.values.get(e.head).checkpoint,headWrites=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length;
  e.hook=null;const phone=e.device('phone');
  if(!lostAfterWrite){assert.equal((await phone.transport.acquire()).reason,'busy');e.clock=e.values.get(e.lease).writer.expiresAt;}
  assert.ok((await phone.transport.acquire()).ok);assert.ok((await phone.store.sync({allowPull:true})).ok);assert.equal(phone.store.read().confirmedRaw,raw);
  assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,headWrites,'handoff retries cannot replay progress');await phone.transport.release();
 }
});
await check('A PC clock jump cannot claim the server lease is released while the phone still sees a busy writer',async()=>{
 const e=rig();let pcClock=e.clock;const pc=e.device('pc-clock',{now:()=>pcClock}),c=await controlled(e,pc),ticket=pc.transport.writer();
 const raw=e.values.get(e.head).checkpoint,requests=e.requests.length;
 pcClock=ticket.expiresAt;const closed=await c.controller.close();assert.equal(closed.ok,false);assert.equal(closed.saved,true);assert.equal(closed.handoff,false);assert.equal(c.released,1);
 assert.equal(e.requests.length,requests,'expired client cleanup has no authority to close a different clock lease');assert.equal(e.values.get(e.lease).closed,false);assert.equal(e.values.get(e.head).checkpoint,raw);
 const phone=e.device('phone-clock');assert.equal((await phone.transport.acquire()).reason,'busy');e.clock=ticket.expiresAt;assert.ok((await phone.transport.acquire()).ok);assert.ok((await phone.store.sync({allowPull:true})).ok);assert.equal(phone.store.read().confirmedRaw,raw);await phone.transport.release();
});
await check('Movement journal persists accepted inputs before pre-stage network failure and replays exact position once',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1})).ok);
 for(let n=0;n<31;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
 e.hook=({path,method})=>{if(path===e.lease&&method==='GET')throw Error('pre-stage outage');};
 assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok,false);assert.equal(c.controller.state().route.position,1.2800000000000005);
 const journal=JSON.parse(d.map.get(expeditionMovementJournalKey(owner)));assert.equal(journal.moves.length,32);assert.equal(d.store.read().dirty,false);
 e.hook=null;await c.controller.close();const reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'saved');assert.equal(reopened.controller.state().route.position,c.controller.state().route.position);assert.equal(JSON.parse(d.map.get(expeditionMovementJournalKey(owner))).moves.length,0);
 await reopened.controller.close();const writes=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,again=await controlled(e,d);assert.equal(again.controller.state().route.position,reopened.controller.state().route.position);assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,writes);await again.controller.close();
});
await check('Lost movement upload and accepted tail recover exactly, including unsent expired reissue',async()=>{
 for(const accepted of [false,true])for(const expired of [false,true]){
  const e=rig(),d=e.device(),c=await controlled(e,d);assert.ok((await c.controller.dispatch({type:'depart',gardenId:'fire',difficulty:1})).ok);
  let release,entered,once=true;const held=new Promise(r=>release=r),reached=new Promise(r=>entered=r);
  e.hook=async({path,method,options})=>{if(path===e.head&&method==='PUT'&&once){once=false;entered();await held;if(accepted)e.put(path,JSON.parse(options.body));throw Error('lost movement upload');}};
  for(let n=0;n<31;n++)await c.controller.dispatch({type:'move',dx:1,dt:.01});const flight=c.controller.dispatch({type:'move',dx:1,dt:.01});await reached;
  for(let n=0;n<12;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
  const position=c.controller.state().route.position,elapsed=c.controller.state().route.elapsedSeconds;assert.equal(JSON.parse(d.map.get(expeditionMovementJournalKey(owner))).moves.length,44);
  release();assert.equal((await flight).ok,false);e.hook=null;if(expired)e.clock=d.transport.writer().expiresAt+1;await c.controller.close();
  const reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'saved');assert.equal(reopened.controller.state().route.position,position);assert.equal(reopened.controller.state().route.elapsedSeconds,elapsed);assert.equal(JSON.parse(d.map.get(expeditionMovementJournalKey(owner))).moves.length,0);
  assert.equal(e.values.get(e.head).revision,3,'depart, first batch, tail; no duplicate prefix');await reopened.controller.close();
 }
});
await check('Interrupted process below batch threshold replays only durable movement after lease expiry',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'snow',difficulty:1});
 for(let n=0;n<17;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.008})).ok);
 const position=c.controller.state().route.position,elapsed=c.controller.state().route.elapsedSeconds;e.clock=d.transport.writer().expiresAt+1;
 // Deliberately do not close/flush the old controller: emulate process death.
 const reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'saved');assert.equal(reopened.controller.state().route.position,position);assert.equal(reopened.controller.state().route.elapsedSeconds,elapsed);assert.equal(e.values.get(e.head).revision,2);await reopened.controller.close();
});
await check('Movement append quota failure never accepts a new position or erases existing queue',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1});await c.controller.dispatch({type:'move',dx:1,dt:.01});
 const key=expeditionMovementJournalKey(owner),original=d.map.get(key),position=c.controller.state().route.position,set=d.map.set.bind(d.map);
 d.map.set=(k,v)=>{if(k===key)throw Error('quota');return set(k,v);};assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok,false);assert.equal(c.controller.state().route.position,position);assert.equal(d.map.get(key),original);d.map.set=set;await c.controller.close();
 const reopened=await controlled(e,d);assert.equal(reopened.controller.state().route.position,position);await reopened.controller.close();
});
await check('Queue ACK quota failure keeps journal and audits already committed prefix instead of replaying it',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1});const key=expeditionMovementJournalKey(owner),set=d.map.set.bind(d.map);let once=true;
 d.map.set=(k,v)=>{if(k===key&&once&&JSON.parse(v).moves.length===0){once=false;throw Error('ACK quota');}return set(k,v);};
 for(let n=0;n<31;n++)await c.controller.dispatch({type:'move',dx:1,dt:.01});assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok,false);
 const position=c.controller.state().route.position;assert.equal(JSON.parse(d.map.get(key)).moves.length,32);d.map.set=set;await c.controller.close();
 const writes=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'saved');assert.equal(reopened.controller.state().route.position,position);assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,writes);await reopened.controller.close();
});
await check('Unknown or tampered movement journal is retained and never used for checkpoint mutation',async()=>{
 for(const mode of ['unknown','paid','hash']){
  const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1});await c.controller.dispatch({type:'move',dx:1,dt:.01});
  const key=expeditionMovementJournalKey(owner),value=JSON.parse(d.map.get(key));if(mode==='paid')value.moves=[{type:'return'}];if(mode==='hash')value.base.checkpointHash='0'.repeat(64);const raw=mode==='unknown'?'original unknown bytes':JSON.stringify(value);d.map.set(key,raw);
  const writes=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length;assert.equal((await c.controller.close()).ok,false);const reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'error');assert.equal(d.map.get(key),raw);assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,writes);await reopened.controller.close();
 }
});
await check('Foreign device descendant cannot absorb, replace or replay unresolved local movement',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1});await c.controller.dispatch({type:'move',dx:1,dt:.01});const key=expeditionMovementJournalKey(owner),original=d.map.get(key);
 e.hook=({path,method})=>{if(path===e.lease&&method==='GET')throw Error('outage');};assert.equal((await c.controller.dispatch({type:'pause',paused:true})).ok,false);e.hook=null;await c.controller.close();
 const phone=e.device('foreign-phone');assert.ok((await phone.transport.acquire()).ok);assert.ok((await phone.store.sync({allowPull:true})).ok);await play(e,phone,[{type:'move',dx:-1,dt:.01}]);await phone.transport.release();
 const remote=e.values.get(e.head).checkpoint,writes=e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,reopened=await controlled(e,d);assert.equal(reopened.controller.state().saveState,'error');assert.equal(d.map.get(key),original);assert.equal(e.values.get(e.head).checkpoint,remote);assert.equal(e.requests.filter(r=>r.path===e.head&&r.method==='PUT').length,writes);await reopened.controller.close();
});
await check('Inputs arriving during post-ACK hashing retain the entire bounded tail without double application',async()=>{
 const e=rig(),d=e.device(),c=await controlled(e,d);await c.controller.dispatch({type:'depart',gardenId:'meadow',difficulty:1});
 const subtle=globalThis.crypto.subtle,digest=subtle.digest;let release,entered,once=true;const held=new Promise(r=>release=r),reached=new Promise(r=>entered=r);
 subtle.digest=async function(algorithm,bytes){
  const document=d.store.read();
  if(once&&document.ok&&!document.dirty&&decodeExpeditionAccount(document.confirmedRaw,{owner})?.revision===2){once=false;entered();await held;}
  return digest.call(this,algorithm,bytes);
 };
 try{
  for(let n=0;n<31;n++)await c.controller.dispatch({type:'move',dx:1,dt:.01});const flight=c.controller.dispatch({type:'move',dx:1,dt:.01});await reached;
  for(let n=0;n<128;n++)assert.ok((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok);
  const position=c.controller.state().route.position,elapsed=c.controller.state().route.elapsedSeconds;assert.equal(JSON.parse(d.map.get(expeditionMovementJournalKey(owner))).moves.length,160);
  assert.equal((await c.controller.dispatch({type:'move',dx:1,dt:.01})).ok,false);assert.equal(c.controller.state().route.position,position);
  release();assert.ok((await flight).ok);assert.equal(c.controller.state().route.position,position);assert.equal(JSON.parse(d.map.get(expeditionMovementJournalKey(owner))).moves.length,0,'the existing dispatch loop drains the full 128-input tail');assert.equal(e.values.get(e.head).revision,3);
  assert.ok((await c.controller.dispatch({type:'pause',paused:true})).ok);assert.equal(c.controller.state().route.position,position);assert.equal(c.controller.state().route.elapsedSeconds,elapsed);assert.equal(e.values.get(e.head).revision,3);await c.controller.close();
  const reopened=await controlled(e,d);assert.equal(reopened.controller.state().route.position,position);assert.equal(reopened.controller.state().route.elapsedSeconds,elapsed);await reopened.controller.close();
 }finally{release();subtle.digest=digest;}
});
console.log(`Account REST transport/controller: ${checks} groups PASS. Actual transport/shared rules and gameplay controller, fake HTTP Firebase responses and synthetic accounts. No live Firebase rules/auth, main integration, physical-device or deployment proof.`);
