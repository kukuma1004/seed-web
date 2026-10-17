import {CIRCUIT_ACTS,publicCircuitActCount} from './act-expansion.js';
import {restoreDefense} from './seed-defense-rules.js';
import {defensePreparationKey} from './defense-save-route.js';
import {defenseAccountKey,validDefenseAccountRecord} from './defense-account-save.js';
import {decodeDefenseAccountCloud} from './defense-account-sync.js';

const flag=value=>typeof value==='function'?value()===true:value===true;
const parsed=text=>{try{return JSON.parse(text);}catch{return null;}};
// This menu inventories existing routes, not their contents. It does not take a
// lease, migrate three acts to five, pull a server record, or write any bytes.
export async function chooseDefenseCircuit({storage,account,owner,databaseURL,status,controls,isCurrent=()=>true,inspection=false,practice=false,acts=CIRCUIT_ACTS,fetchImpl=globalThis.fetch,timeout=6000}={}){
 const released=publicCircuitActCount(acts);
 const current=()=>{try{return isCurrent()&&(!account||account.user()?.uid===owner||owner==='guest'&&!account.user()?.uid);}catch{return false;}};
 if(!current())return null;if(released<6)return released;
 const user=account?.user?.(),online=!flag(inspection)&&!flag(practice)&&owner!=='guest'&&user?.uid===owner&&user.isAnonymous===false;
 let unknown=false;
 const local=circuit=>{
  try{
   if(online){
    const raw=storage.getItem(defenseAccountKey(owner,circuit));
    if(raw!==null){const record=parsed(raw);if(!validDefenseAccountRecord(record,owner,circuit)){unknown=true;return {active:null,terminal:null};}return {active:record.ended?null:record.checkpoint,terminal:record.ended?record.id:null};}
   }
   const raw=storage.getItem(defensePreparationKey(owner,circuit,{acts}));if(raw===null)return {active:null,terminal:null};
   const state=restoreDefense(raw);if(!state||state.objective||(state.actCount??3)!==circuit){unknown=true;return {active:null,terminal:null};}
   return {active:state,terminal:null};
  }catch{unknown=true;return {active:null,terminal:null};}
 };
 // After the first six-act preparation, opening TD must not add two legacy
 // account round trips to every ordinary visit.
 if(local(6).active)return current()?6:null;
 const old=new Map([5,3].map(circuit=>[circuit,local(circuit)]));
 let remoteUnconfirmed=false;
 if(online){
  status.textContent='이전 수호전 준비를 확인하고 있어요…';
  const controller=new AbortController(),alarm=setTimeout(()=>controller.abort(),timeout);
  try{
   const aborted=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('offline')),{once:true});});
   const session=await Promise.race([account.tokenSession(),aborted]);
   if(!current()||session?.uid!==owner||!session.idToken)return null;
   if(typeof databaseURL!=='string'||!databaseURL||typeof fetchImpl!=='function')throw Error('offline');
   const outcomes=await Promise.allSettled([5,3].map(async circuit=>{
    const url=databaseURL.replace(/\/$/,'')+'/seedDefenseSaves/'+encodeURIComponent(owner)+'/'+circuit+'.json?auth='+encodeURIComponent(session.idToken);
    const response=await Promise.race([fetchImpl(url,{signal:controller.signal,cache:'no-store'}),aborted]);
    if(!response.ok)throw Error([401,403].includes(response.status)?'permission':'offline');
    const body=await Promise.race([response.json(),aborted]);
    return {circuit,record:decodeDefenseAccountCloud(body,owner,circuit).record};
   }));
   if(!current())return null;
   for(const outcome of outcomes){
    if(outcome.status!=='fulfilled'){remoteUnconfirmed=true;continue;}
    const {circuit,record}=outcome.value,entry=old.get(circuit);if(!record)continue;
    if(record.ended){if(entry.active?.runId===record.id)entry.active=null;}
    else if(entry.terminal!==record.id)entry.active=record.checkpoint;
   }
  }catch{if(!current())return null;remoteUnconfirmed=true;}finally{clearTimeout(alarm);}
 }
 if(!current())return null;
 const active=[...old].filter(([,entry])=>entry.active);
 if(!active.length&&!remoteUnconfirmed&&!unknown)return 6;
 const notes=[];
 if(active.length)notes.push('이전에 시작한 수호전이 있어요. 이어가거나 새 6막 순환을 선택하세요.');
 if(remoteUnconfirmed)notes.push('연결 또는 권한 문제로 다른 기기 기록은 확인하지 못했어요. 이 기기 기록은 보존돼요.');
 if(unknown)notes.push('읽을 수 없는 저장은 그대로 보존했어요.');
 status.textContent=notes.join(' ');controls.replaceChildren();
 const document=controls.ownerDocument||globalThis.document;
 return new Promise(resolve=>{
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;clearInterval(watch);controls.replaceChildren();resolve(current()?value:null);};
  const watch=setInterval(()=>{if(!current())finish(null);},500);
  const button=(label,value)=>{const node=document.createElement('button');node.textContent=label;node.onclick=()=>finish(value);controls.append(node);};
  for(const [circuit,{active:state}] of active)button(`${circuit}막 순환 이어하기 · ${state.wave}차 습격 · 씨앗 ${state.towers.length}개`,circuit);
  button('새 6막 순환 시작 · 이전 준비는 보존',6);
  button('돌아가기',null);
 });
}
