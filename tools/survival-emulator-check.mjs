// Run only against the local demo database emulator (never production).
import assert from 'node:assert/strict';
import {createMockUserToken} from '@firebase/util';
import {createSurvivalSync} from '../src/survival-sync.js';
import {createSurvivalSaveStore} from '../src/survival-save.js';
import {createSurvivalRanking} from '../src/survival-ranking.js';
import {createSurvivalRecordSync,survivalRecordStorage,readSurvivalAccountRecord} from '../src/survival-record-sync.js';
import {recordSurvivalResult} from '../src/survival-rules.js';
const databaseURL='http://127.0.0.1:9009',ns='demo-seed-release-default-rtdb';
const request=(url,o)=>{const u=new URL(url);assert.equal(u.origin,databaseURL);u.searchParams.set('ns',ns);return fetch(u,o);};
const token=(sub,provider='google.com')=>createMockUserToken({sub,iat:Math.floor(Date.now()/1000),firebase:{sign_in_provider:provider}},'demo-seed-release');
const owner='qa-'+Date.now(),account={user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:token(owner)})};
const device=()=>{const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)},store=createSurvivalSaveStore(storage,owner);return {storage,store,sync:createSurvivalSync({storage,account,databaseURL,fetchImpl:request}),best:createSurvivalRecordSync({storage,account,databaseURL,fetchImpl:request})};};
const pc=device(),phone=device();
const snapshot={version:1,id:'demo-run',revision:0,session:{act:1,lap:0,time:350,legStartedAt:300,rngState:123},progress:{hp:72,kills:420,score:4800,choicesTaken:12,choiceKills:8,bankedUpgrades:3,elapsed:350,levels:{frost:3},forms:{frostnet:2},inventory:{tonic:3,haste:1}},player:{position:[3,0,4],baseSlideTarget:[11,0,0],baseSlideDir:[1,0,0],lastMove:[1,0,0]},enemies:[],hostiles:[]};
assert(pc.store.write(snapshot,{fresh:true}).ok);assert.equal((await pc.sync.flush()).kind,'synced');
assert.equal((await phone.sync.sync({allowPull:true})).kind,'synced');assert.deepEqual(phone.store.read(),pc.store.read());
const mobile=phone.store.read();mobile.progress.inventory.tonic=2;mobile.progress.forms.frostnet=3;mobile.progress.score=5800;mobile.session.time=400;
assert(phone.store.write(mobile).ok);assert.equal((await phone.sync.flush()).kind,'synced');assert.equal((await pc.sync.sync({allowPull:true})).kind,'synced');assert.deepEqual(pc.store.read(),phone.store.read());
recordSurvivalResult(survivalRecordStorage(pc.storage,owner),{kills:420,time:950,bossesDefeated:3,completedLaps:1,fastestLap:950});
assert.equal((await pc.best.sync()).kind,'synced');assert.equal((await phone.best.sync()).kind,'synced');assert.equal(readSurvivalAccountRecord(phone.storage,owner).bestKills,420);
const rank=createSurvivalRanking({storage:pc.storage,authProvider:account.tokenSession,config:{databaseURL},fetchImpl:request});
await rank.submit({uid:owner,name:'테스트씨앗',score:4800,kills:420,bosses:1,time:350,laws:'frost:3',forms:'frostnet:2'});assert.equal((await rank.board()).mine.score,4800);
for(const auth of [token('someone-else'),token(owner,'anonymous'),'']){
 const r=await request(`${databaseURL}/seedSurvivalSaves/${owner}.json?auth=${auth}`,{});assert(!r.ok,'private checkpoint cannot be read by another/anonymous user');
}
const wrong=await request(`${databaseURL}/seedSurvivalRanking/v1/other.json?auth=${token(owner)}`,{method:'PUT',body:JSON.stringify({uid:'other',score:1})});assert(!wrong.ok);
const bad=await request(`${databaseURL}/seedSurvivalRanking/v1/${owner}.json?auth=${token(owner)}`,{method:'PUT',body:JSON.stringify({uid:owner,name:'검사',score:999999,kills:1,bosses:0,time:1,laws:'',forms:''})});assert(!bad.ok,'impossible score denied by real rules');
pc.sync.stop();phone.sync.stop();
console.log('REAL LOCAL EMULATOR: PC → phone → PC preserves combo/potions/progress; best and ranking persisted; cross-account, anonymous and invalid-score access denied. No production user data used.');
