import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {confirmRunSave} from '../src/run-save-confirmation.js';

let owner='A',calls=0;
const options={owner:'A',currentOwner:()=>owner,required:true,flush:async()=>{calls++;return {ok:true};},accepted:r=>r.ok===true};
assert.deepEqual(await confirmRunSave(options),{ok:true});
assert.equal((await confirmRunSave({...options,flush:async()=>({ok:false})})).ok,false);
assert.equal((await confirmRunSave({...options,flush:async()=>{throw Error('offline');}})).reason,'offline');
assert.equal((await confirmRunSave({...options,required:false})).localOnly,true);
assert.equal(calls,1,'device-only exit does not start a cloud request');
owner='B';assert.equal((await confirmRunSave(options)).reason,'account');assert.equal(calls,1);owner='A';
let finish;
const pending=confirmRunSave({...options,flush:()=>new Promise(resolve=>{finish=resolve;})});
await Promise.resolve();owner='B';finish({ok:true});assert.equal((await pending).reason,'account');owner='A';
let completeLate;
const timeout=await confirmRunSave({...options,timeoutMs:5,flush:()=>new Promise(resolve=>{completeLate=resolve;})});
assert.equal(timeout.reason,'timeout');completeLate({ok:true});await Promise.resolve();

// Execute the shipping save-exit dispatcher, not a second implementation of it.
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf("$('#save-exit').onclick=async()=>{"),end=main.indexOf('\n};',start)+3;
assert(start>=0&&end>start);
function fixture(kind,anonymous=false){
 let exit,leaves=0,setups=0,requests=0,user={uid:'A',isAnonymous:anonymous};
 const button={disabled:false,textContent:'저장하고 나가기',set onclick(fn){exit=fn;}};
 const statuses=[],checkpoint=Object.freeze({id:'run-A',hp:42,forms:{frost:9},inventory:{tonic:2}});
 let result=kind==='survival'?{kind:'offline'}:{ok:false},dirty=false,flush=async()=>{requests++;return result;};
 const scope={$:()=>button,arborJourney:null,currentJourneyOwner:'A',journeyCompletionPending:false,expansionJourney:null,survivalSession:kind==='survival'?{lab:null}:null,localInspection:false,developerRun:false,mirrorSession:null,saveExitBusy:false,exitWithoutSaveArmed:false,roomCleared:false,cloudSaveFailed:false,paused:true,
  account:{user:()=>user},confirmRunSave,saveSurvival:()=>true,saveLeaveState:()=>true,readCheckpoint:()=>checkpoint,actStore:()=>null,saveExitLabel:()=> '저장하고 나가기',
  cloud:{flush:()=>flush(),isDirty:()=>dirty},survivalCloud:{flush:()=>flush()},pauseBuild:{setSaveStatus:text=>statuses.push(text)},
  leavePausedRun(){leaves++;scope.paused=false;},showSurvivalSetup(){setups++;}};
 const c=vm.createContext(scope);vm.runInContext(main.slice(start,end),c);
 return {c,button,statuses,checkpoint,exit:()=>exit(),get leaves(){return leaves;},get setups(){return setups;},get requests(){return requests;},setResult(value){result=value;},setDirty(value){dirty=value;},setFlush(fn){flush=async()=>{requests++;return fn();};},changeUser(){user={uid:'B',isAnonymous:false};}};
}
for(const kind of ['journey','survival']){
 const f=fixture(kind);await f.exit();assert.equal(f.leaves,0,kind+' failed upload retains screen');assert.equal(f.c.paused,true);assert.equal(f.button.disabled,false);assert.equal(f.c.saveExitBusy,false);assert.match(f.statuses.at(-1),/화면을 유지/);assert.equal(f.checkpoint.hp,42);
 f.setResult(kind==='survival'?{kind:'conflict'}:{ok:true});if(kind==='journey')f.setDirty(true);await f.exit();assert.equal(f.leaves,0,kind+' conflict/dirty snapshot cannot authorize exit');
 f.setDirty(false);f.setResult(kind==='survival'?{kind:'synced'}:{ok:true});await f.exit();assert.equal(f.leaves,1,kind+' retry leaves only after acknowledgement');assert.equal(f.setups,kind==='survival'?1:0);
 const guest=fixture(kind,true);await guest.exit();assert.equal(guest.requests,0);assert.equal(guest.leaves,1,kind+' anonymous local save remains playable offline');
 const switched=fixture(kind);switched.setFlush(async()=>{switched.changeUser();return kind==='survival'?{kind:'synced'}:{ok:true};});await switched.exit();assert.equal(switched.leaves,0);assert.match(switched.statuses.at(-1),/계정이 바뀌어/);
 const duplicate=fixture(kind);let finishUpload;duplicate.setFlush(()=>new Promise(resolve=>{finishUpload=resolve;}));const first=duplicate.exit();await Promise.resolve();await duplicate.exit();assert.equal(duplicate.requests,1,kind+' repeated save click shares active handler');finishUpload(kind==='survival'?{kind:'synced'}:{ok:true});await first;assert.equal(duplicate.leaves,1);
 const thrown=fixture(kind);thrown.setFlush(()=>{throw Error('network');});await thrown.exit();assert.equal(thrown.leaves,0);assert.equal(thrown.button.disabled,false);
}
const cleared=fixture('journey');cleared.c.roomCleared=true;cleared.c.saveLeaveState=()=>false;cleared.setResult({ok:true});cleared.changeUser();await cleared.exit();assert.equal(cleared.leaves,0,'cleared room retains original owner, not newly signed-in account');assert.equal(cleared.requests,0,'wrong account never authorizes another run exit');assert.match(cleared.statuses.at(-1),/계정이 바뀌어/);
console.log('PASS save-exit actual Journey/Survival handlers: failure, dirty/conflict, retry, offline guest, owner switch, duplicate, rejection; helper timeout/late reply. Mock cloud, no account/device claim.');
