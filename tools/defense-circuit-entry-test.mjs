import assert from 'node:assert/strict';
import {CIRCUIT_ACTS} from '../src/act-expansion.js';
import {chooseDefenseCircuit} from '../src/defense-circuit-entry.js';
import {createDefense,checkpointDefense,plantDefense} from '../src/seed-defense-rules.js';
import {defensePreparationKey} from '../src/defense-save-route.js';
import {defenseAccountKey} from '../src/defense-account-save.js';

const owner='entry-owner',acts=CIRCUIT_ACTS;
const state=circuit=>{const s=createDefense(97,{actCount:circuit});plantDefense(s,0);return checkpointDefense(s);};
const record=(circuit,checkpoint=state(circuit))=>({version:1,ownerUid:owner,circuit,id:checkpoint.runId,revision:1,writeId:'fixture',ended:false,checkpoint});
const cloud=r=>r?{version:1,ownerUid:owner,circuit:r.circuit,revision:1,checkpoint:JSON.stringify(r)}:null;
function setup(){
 const data=new Map(),writes=[];
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes.push(k);data.set(k,v);},removeItem:k=>{writes.push(k);data.delete(k);}};
 const status={textContent:''},controls={children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);},ownerDocument:{createElement:()=>({textContent:'',onclick:null})}};
 let uid=owner,current=true,mode='ok',getHook=null;const requests=[],remote=new Map();
 const account={user:()=>({uid,isAnonymous:false}),tokenSession:async()=>({uid,idToken:'fixture'})};
 const fetchImpl=async(url,options)=>{requests.push({url,options});assert(!options.method||options.method==='GET');assert(!writes.length);if(getHook){const hook=getHook;getHook=null;hook();}if(mode==='offline')throw Error('offline');if(mode==='permission')return {ok:false,status:403};const circuit=Number(url.match(/\/([35])\.json/)[1]);return {ok:true,status:200,json:async()=>remote.get(circuit)??null};};
 const input={storage,account,owner,status,controls,isCurrent:()=>current,databaseURL:'https://fixture.invalid',acts,fetchImpl,timeout:100};
 return {input,data,writes,requests,remote,status,controls,setUid:v=>{uid=v;},setCurrent:v=>{current=v;},setMode:v=>{mode=v;},setHook:v=>{getHook=v;}};
}
async function menu(d){const promise=chooseDefenseCircuit(d.input);for(let i=0;i<20&&!d.controls.children.length;i++)await new Promise(resolve=>setImmediate(resolve));assert(d.controls.children.length,'route choice must become reachable');return {promise,click:part=>{const b=d.controls.children.find(b=>b.textContent.includes(part));assert(b,part);b.onclick();}};}

{
 const d=setup(),r=record(6);d.data.set(defenseAccountKey(owner,6),JSON.stringify(r));
 assert.equal(await chooseDefenseCircuit(d.input),6);assert.equal(d.requests.length,0);assert.equal(d.writes.length,0);
}
{
 const d=setup(),r=record(5);d.remote.set(5,cloud(r));const {promise,click}=await menu(d);
 assert.equal(d.requests.length,2);assert(d.controls.children.some(b=>b.textContent.includes('5막 순환 이어하기')));click('5막 순환 이어하기');assert.equal(await promise,5);assert.equal(d.writes.length,0);assert.equal(d.data.size,0,'inventory is not an account pull');
}
{
 const d=setup(),three=state(3),five=state(5);d.data.set(defensePreparationKey(owner,3,{acts}),JSON.stringify(three));d.data.set(defensePreparationKey(owner,5,{acts}),JSON.stringify(five));const before=[...d.data];const {promise,click}=await menu(d);assert.equal(d.controls.children[0].textContent.startsWith('5막 순환 이어하기'),true);assert(d.controls.children.some(b=>b.textContent.includes('3막 순환 이어하기')));click('새 6막');assert.equal(await promise,6);assert.deepEqual([...d.data],before);assert.equal(d.writes.length,0);
}
{
 const d=setup(),r=record(5);d.data.set(defenseAccountKey(owner,5),JSON.stringify(r));d.remote.set(5,cloud({...r,ended:true,checkpoint:null}));assert.equal(await chooseDefenseCircuit(d.input),6,'server-ended same run cannot be offered as live local save');
}
{
 const d=setup(),r=record(3);d.data.set(defenseAccountKey(owner,3),JSON.stringify({...r,ended:true,checkpoint:null}));d.remote.set(3,cloud(r));assert.equal(await chooseDefenseCircuit(d.input),6,'local terminal cannot resurrect stale server run');
}
for(const mode of ['offline','permission']){
 const d=setup();d.setMode(mode);d.data.set(defensePreparationKey(owner,5,{acts}),JSON.stringify(state(5)));const {promise,click}=await menu(d);assert.match(d.status.textContent,/다른 기기 기록은 확인하지 못/);assert(d.controls.children.some(b=>b.textContent.includes('새 6막')));click('5막 순환 이어하기');assert.equal(await promise,5);assert.equal(d.writes.length,0);
 const empty=setup();empty.setMode(mode);const chosen=await menu(empty);chosen.click('새 6막');assert.equal(await chosen.promise,6,'unconfirmed remote never silently hides the new circuit');
}
{
 const d=setup();d.setHook(()=>d.setUid('other'));assert.equal(await chooseDefenseCircuit(d.input),null);assert.equal(d.writes.length,0);
}
{
 const d=setup();d.remote.set(5,cloud(record(5)));const {promise,click}=await menu(d);d.setCurrent(false);click('5막 순환 이어하기');assert.equal(await promise,null,'navigation invalidation cannot launch stale account');
}
{
 const d=setup();d.input.inspection=true;d.data.set('seed-defense-expansion-preparation-v1:'+encodeURIComponent(owner),JSON.stringify(state(5)));assert.equal(await chooseDefenseCircuit(d.input),6);assert.equal(d.requests.length,0,'inspection bytes never become public route saves');
 const guest=setup();guest.input.inspection=true;guest.data.set(defensePreparationKey(owner,3,{acts}),JSON.stringify(state(3)));const {promise,click}=await menu(guest);assert.equal(guest.requests.length,0);click('3막 순환 이어하기');assert.equal(await promise,3);
}
{
 const d=setup(),key=defenseAccountKey(owner,5);d.data.set(key,'{unknown');const {promise,click}=await menu(d);assert.match(d.status.textContent,/읽을 수 없는 저장/);click('돌아가기');assert.equal(await promise,null);assert.equal(d.data.get(key),'{unknown');assert.equal(d.writes.length,0);
}
console.log('Defense route entry passed: 6-active no extra GET; read-only 3/5 local/server discovery; resume-first explicit six choice; terminal protection; offline/permission local continuation; UID/navigation races; no inspection promotion, no PUT/lease/migration. Simulated network and DOM, not physical/account proof.');
