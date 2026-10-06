import {decodeExpeditionAccount} from './account-codec.js';
import {nextExpeditionRuntimeAccount,EXPEDITION_RUNTIME_TRANSACTION_VERSION} from './account-runtime.js';
import {projectExpeditionRuntime} from './controller.js';
import {acquireExpeditionAccountLock} from './account-lock.js';
import {createExpeditionAccountTransport} from './account-transport.js';
import {createExpeditionAccountStore} from './account-store.js';

const copy=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,80}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const uuid=()=>globalThis.crypto.randomUUID();

// Owns real finite-lease/store ports. No review session is decoded or imported.
// Movement is projected at input speed, committed in bounded replay batches;
// battle and HOME operations are shown only after their durable local stage.
export async function createExpeditionAccountController({owner,currentOwner=()=>owner,store,transport,localLease,now=Date.now,idFactory=uuid,movementBatch=32,rotationMargin=15000}={}){
 if(!store||!transport||!localLease||!Number.isInteger(movementBatch)||movementBatch<1||movementBatch>128||!Number.isInteger(rotationMargin)||rotationMargin<1000||rotationMargin>30000)throw TypeError('Account controller requires finite authority/store ports');
 let confirmed=null,current=null,snapshot=null,moves=[],events=[],notice='',saveState='saved',paused=false,closed=false,closing=false,flight=null,closeFlight=null,movementOnlyFlight=false;
 const fail=reason=>{notice=String(reason);saveState='error';paused=true;return {ok:false,reason:notice,events:[],saveState};};
 function owned(){const authority=transport.authority();if(currentOwner()!==owner||authority.uid!==owner||authority.isAnonymous!==false)throw Error('계정이 바뀌어 원정대를 멈췄어요');if(authority.enabled!==true)throw Error('원정대 공개 권한을 확인해 주세요');if(!localLease.active())throw Error('다른 창에서 사용 중인 원정대예요');}
 function identity(){const value=idFactory();if(!token(value))throw Error('유효한 저장 식별자를 만들지 못했어요');return value;}
 function accept(raw){const a=decodeExpeditionAccount(raw,{owner});if(!a)throw Error('계정 저장 원본을 확인해 주세요');confirmed=a;current=copy(a.state);snapshot=null;events=[];}
 async function synchronize(){owned();const result=await store.sync({allowPull:true,recoverPending:true});owned();if(!result.ok)throw Error(`계정 저장 확인 실패 · ${result.reason}`);if(result.raw)accept(result.raw);return result;}
 async function authorize(){
  owned();let writer=transport.writer();
  if(!writer||writer.expiresAt-now()<=rotationMargin){
   // Flush precedes a clean rotation. A previously staged dirty checkpoint is
   // recovered against the exact server head after the new lease is acquired.
   if(writer){const released=await transport.release();owned();if(!released.ok)throw Error(`저장 권한 종료 실패 · ${released.reason}`);}
   const acquired=await transport.acquire();owned();if(!acquired.ok)throw Error(`저장 권한 확인 실패 · ${acquired.reason}`);
  }
  const d=store.read();if(!d.ok)throw Error(`계정 저장 확인 실패 · ${d.reason}`);
  if(d.dirty)await synchronize();
  return transport.writer();
 }
 function displayMovement(base){
  current=copy(base);
  for(const move of moves){const projected=projectExpeditionRuntime(current,move);if(!projected.ok)throw Error('이동 기록을 다시 확인해 주세요');current=projected.state;}
  snapshot=null;
 }
 async function commit(commands,{movement=false}={}){
  const previous=confirmed;if(!previous)throw Error('계정 저장을 불러오지 못했어요');
  const writer=await authorize();owned();
  // A recovery can change the base. Only replay these new commands after an
  // exact unchanged state check; never apply them to a competing campaign.
  if(JSON.stringify(previous.state)!==JSON.stringify(confirmed.state))throw Error('다른 기기의 기록을 확인하고 다시 열어 주세요');
  const generatedIds=[];let projected=confirmed.state;
  for(const command of commands){const p=projectExpeditionRuntime(projected,command,{idFactory:()=>{const id=identity();generatedIds.push(id);return id;}});if(!p.ok)return {ok:false,reason:p.reason,events:[],saveState};projected=p.state;}
  const transaction={version:EXPEDITION_RUNTIME_TRANSACTION_VERSION,kind:'runtime',receiptId:`write-${confirmed.revision+1}-${identity()}`,commands:copy(commands),generatedIds};
  const next=await nextExpeditionRuntimeAccount(confirmed,{owner,transaction,now:now(),writer});owned();if(!next.ok)return {ok:false,reason:next.reason,events:[],saveState};
  const staged=await store.stage(next.raw,{expectedRaw:JSON.stringify(confirmed),transaction});owned();if(!staged.ok)throw Error(`진행 저장 실패 · ${staged.reason}`);
  if(movement)displayMovement(next.record.state);else{current=copy(next.record.state);snapshot=null;}
  events=copy(next.events);saveState='pending';
  const result=await store.sync({recoverPending:true});owned();if(!result.ok)throw Error(`서버 저장을 확인하지 못해 멈췄어요 · ${result.reason}`);
  const actual=decodeExpeditionAccount(result.raw,{owner});if(!actual||JSON.stringify(actual.state)!==JSON.stringify(next.record.state))throw Error('서버 저장 결과가 달라 기록을 보존했어요');
  confirmed=actual;if(movement)displayMovement(actual.state);else{current=copy(actual.state);snapshot=null;}
  saveState='saved';notice='';return {ok:true,events:copy(events),saveState};
 }
 async function flush(){return moves.length?commit(moves.splice(0,128),{movement:true}):({ok:true,events:[],saveState});}
 const canMoveWhileSaving=()=>Boolean(flight&&movementOnlyFlight&&!closed&&!closing&&!paused&&saveState!=='error'&&current?.screen==='explore'&&moves.length<128);
 async function dispatch(intent){
  if(closed||closing)return {ok:false,reason:'원정대를 닫았어요',events:[],saveState};
  if(flight&&!(intent?.type==='move'&&canMoveWhileSaving()))return {ok:false,reason:'저장을 확인하고 있어요',events:[],saveState};
  try{
   owned();if(saveState==='error')return {ok:false,reason:notice,events:[],saveState};
   if(intent?.type==='move'){
    if(paused)return {ok:false,reason:'원정이 일시정지됐어요',events:[],saveState};
    const p=projectExpeditionRuntime(current,intent);if(!p.ok)return {ok:false,reason:p.reason,events:[],saveState};
    // Clone input so later mutation cannot alter the replay receipt.
    current=p.state;if(snapshot)snapshot=Object.freeze({...snapshot,route:Object.freeze({...snapshot.route,position:current.route.position,elapsedSeconds:current.route.elapsedSeconds})});moves.push(copy(intent));events=[];
    // A slow movement-only upload may collect one bounded tail. It changes
    // route scalars only; paid actions remain blocked until server confirmation.
    if(flight||moves.length<movementBatch&&transport.writer()?.expiresAt-now()>rotationMargin)return {ok:true,events:[],saveState:'pending'};
   }else if(paused&&intent?.type!=='pause')return {ok:false,reason:'원정이 일시정지됐어요',events:[],saveState};
   const run=async()=>{
    let flushed=await flush();if(!flushed.ok)return flushed;
    if(intent?.type==='move'){
     while(moves.length>=movementBatch&&!closed&&!closing&&!paused){flushed=await flush();if(!flushed.ok)return flushed;}
     return flushed;
    }
    if(intent?.type==='pause'){paused=Boolean(intent.paused);events=[];if(!paused)notice='';return {ok:true,events:[],saveState};}
    const {ok,reason,...result}=await commit([intent]);if(!ok)return {ok:false,reason,...result};return {ok:true,...result};
   };
   movementOnlyFlight=intent?.type==='move';
   flight=run().catch(error=>fail(error.message)).finally(()=>{flight=null;movementOnlyFlight=false;});return await flight;
  }catch(error){return fail(error.message);}
 }
 async function initialize(){
  try{
   owned();const acquired=await transport.acquire();owned();if(!acquired.ok)throw Error(`원정대 저장 권한 확인 실패 · ${acquired.reason}`);
   const result=await synchronize();
   if(result.raw===null){const fresh=await store.fresh({idFactory:identity});owned();if(!fresh.ok)throw Error(`새 원정대 저장 실패 · ${fresh.reason}`);await synchronize();}
   saveState='saved';
  }catch(error){fail(error.message);}
 }
 await initialize();
 return Object.freeze({
  state:()=>{snapshot??=freeze(copy(current||{screen:'home',roster:null,route:null,battle:null,meta:null,lastResult:null}));return {...snapshot,notice,saveState:moves.length&&saveState==='saved'?'pending':saveState,events:freeze(copy(events)),paused,review:false};},
  dispatch,canMoveWhileSaving,isActive:()=>!closed&&!closing&&!paused&&saveState!=='error'&&current?.screen!=='home'&&current?.screen!=='result',
  close(){
   if(closeFlight)return closeFlight;closing=true;paused=true;
   closeFlight=(async()=>{
    let handoff=false;
    try{if(flight)await flight;if(saveState!=='error'){const flushed=await flush();if(!flushed.ok)fail(flushed.reason);}}
    catch(error){fail(error.message);}
    // A confirmed checkpoint and a confirmed lease release are different
    // receipts. Do not promise immediate device handoff after a lost release.
    try{const released=await transport.release();handoff=released?.ok===true&&released.handoff!==false;}catch{handoff=false;}
    finally{try{await localLease.release();}catch{handoff=false;}finally{closed=true;}}
    const saved=saveState!=='error';
    return {ok:saved&&handoff,saved,handoff,reason:!saved?notice:handoff?'':'진행은 서버에 저장됐어요. 기기 전환 확인이 지연되어 잠시 뒤 같은 계정으로 다시 열어 주세요.'};
   })();return closeFlight;
  },
 });
}

export async function openExpeditionAccountController({account,owner,deviceId,storage,databaseURL,enabled,locks,now=Date.now,idFactory=uuid,...options}={}){
 const localLease=await acquireExpeditionAccountLock(owner,{locks});if(!localLease.ok)return {ok:false,reason:localLease.reason};
 try{
  const transport=createExpeditionAccountTransport({account,owner,deviceId,localLease,databaseURL,enabled,now,idFactory});
  const store=createExpeditionAccountStore({storage,owner,authority:transport.authority,localLease,port:transport.port,now,idFactory});
  const controller=await createExpeditionAccountController({owner,currentOwner:()=>account.user()?.uid,store,transport,localLease,now,idFactory,...options});
  if(controller.state().saveState==='error'){const reason=controller.state().notice;await controller.close();return {ok:false,reason};}
  return {ok:true,controller};
 }catch(error){await localLease.release();return {ok:false,reason:error.message};}
}
