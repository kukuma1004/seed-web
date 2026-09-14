import assert from 'node:assert/strict';
import {createOnlineRanking,bestPerPlayer,validRun,AUTH_KEY,FIREBASE,SEASON,inSeason,pushKeyPrefix} from '../src/online-ranking.js';
const T0=SEASON.start;

const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),data};};

// A small stand-in for Firebase Auth + Realtime Database REST that enforces the same rules as docs/FIREBASE-RANKING.md.
function fakeFirebase({clock}){
 const users=new Map(),tokens=new Map(),runs={};let signUps=0,refreshes=0,next=1,offline=false,rulesPublished=true;
 const json=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
 const issue=uid=>{const id='id-'+uid+'-'+(next++),refresh='rf-'+uid+'-'+(next++);tokens.set(id,{uid,exp:clock.t+3600e3});users.set(refresh,uid);return {id,refresh};};
 async function fetchImpl(url,opts={}){
  if(offline)throw new TypeError('Failed to fetch');
  const u=new URL(url);
  if(u.host==='identitytoolkit.googleapis.com'){assert.equal(u.searchParams.get('key'),FIREBASE.apiKey);signUps++;const uid='user'+signUps;const t=issue(uid);return json(200,{localId:uid,idToken:t.id,refreshToken:t.refresh,expiresIn:'3600'});}
  if(u.host==='securetoken.googleapis.com'){refreshes++;const refresh=new URLSearchParams(opts.body).get('refresh_token');const uid=users.get(refresh);if(!uid)return json(400,{error:{message:'INVALID_REFRESH_TOKEN'}});const t=issue(uid);return json(200,{user_id:uid,id_token:t.id,refresh_token:t.refresh,expires_in:'3600'});}
  const token=tokens.get(u.searchParams.get('auth'));const uid=token&&token.exp>clock.t?token.uid:null;
  if(!rulesPublished||!uid)return json(401,{error:'Permission denied'});
  const path=u.pathname.replace(/\.json$/,'').replace(/^\//,'');
  if(path==='seedRanking/runs'&&opts.method==='POST'){
   const run=JSON.parse(opts.body);
   if(run.uid!==uid||typeof run.name!=='string'||run.name.length<1||run.name.length>16||!(run.score>=1)||run.at?.['.sv']!=='timestamp')return json(401,{error:'Permission denied'});
   // Real push IDs start with their creation time; the rest keeps them unique.
   const id=pushKeyPrefix(clock.t)+String(next++).padStart(12,'0');runs[id]={...run,at:clock.t};return json(200,{name:id});
  }
  if(path==='seedRanking/runs'&&(!opts.method||opts.method==='GET')){
   const orderBy=u.searchParams.get('orderBy'),limit=Number(u.searchParams.get('limitToLast'));
   if(orderBy==='"$key"'){const from=JSON.parse(u.searchParams.get('startAt'));const kept=Object.entries(runs).filter(([k])=>k>=from).sort((a,b)=>a[0]<b[0]?-1:1).slice(-limit);return json(200,Object.fromEntries(kept));}
   assert.equal(orderBy,'"score"');
   const kept=Object.entries(runs).sort((a,b)=>a[1].score-b[1].score).slice(-limit);return json(200,Object.fromEntries(kept));
  }
  const m=path.match(/^seedRanking\/runs\/(.+)$/);
  if(m&&opts.method==='DELETE'){if(runs[m[1]]?.uid!==uid)return json(401,{error:'Permission denied'});delete runs[m[1]];return json(200,null);}
  return json(404,{error:'not found'});
 }
 return {fetchImpl,runs,get signUps(){return signUps;},get refreshes(){return refreshes;},set offline(v){offline=v;},set rulesPublished(v){rulesPublished=v;}};
}

// Board shaping: one line per player, bad data ignored.
{
 const data={a:{uid:'u1',name:'하나',score:500,cycle:1,stage:2,kills:10,time:50,at:1},b:{uid:'u1',name:'하나',score:900,cycle:2,stage:0,kills:20,time:90,at:2},c:{uid:'u1',name:'둘',score:700,cycle:1,stage:1,kills:12,time:60,at:3},d:{uid:'u2',name:'하나',score:900,cycle:2,stage:0,kills:20,time:90,at:1},e:{uid:'u3',name:'<b>',score:99999,cycle:0,stage:0,kills:0,time:0,at:1},f:'junk',g:{uid:'u4',name:'셋',score:-3,cycle:0,stage:0,kills:0,time:0,at:1}};
 const board=bestPerPlayer(data,20,null);
 assert.deepEqual(board.map(e=>e.id),['d','b','c'],'best per device+name, ties go to the earlier run, invalid rows dropped');
 assert.equal(bestPerPlayer(null).length,0);assert.equal(bestPerPlayer(data,1,null).length,1);
 assert.ok(!validRun({...data.a,stage:5})&&!validRun({...data.a,score:0}));
}

// Sign-in, submit, board and rank; the anonymous player is reused across page loads.
{
 const clock={t:T0+1_000_000},fb=fakeFirebase({clock}),storage=memory();
 const ranking=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const base={cycle:1,stage:3,kills:40,time:300};
 const first=await ranking.submit({...base,name:'  민준 ',score:4200});
 assert.equal(first.rank,1);assert.equal(first.bestRank,1);assert.equal(first.board[0].name,'민준');assert.equal(fb.signUps,1);
 assert.ok(JSON.parse(storage.getItem(AUTH_KEY)).refreshToken,'the refresh token is kept so the same player returns');
 const lower=await ranking.submit({...base,name:'민준',score:3000});
 assert.equal(lower.rank,0,'a lower run of the same player is not a new line');assert.equal(lower.bestRank,1);
 // Another device.
 const other=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const second=await other.submit({...base,name:'서연',score:9000});
 assert.equal(second.rank,1);assert.deepEqual(second.board.map(e=>e.name),['서연','민준']);
 // A sibling on the first device keeps a separate line.
 const sibling=await ranking.submit({...base,name:'하준',score:5000});
 assert.equal(sibling.rank,2);assert.deepEqual(sibling.board.map(e=>e.name),['서연','하준','민준']);
 // Page reload after the token expired: refresh, not a new anonymous user.
 clock.t+=2*3600e3;
 const reloaded=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const again=await reloaded.submit({...base,name:'민준',score:12000});
 assert.equal(fb.signUps,2,'no extra sign-up after reload');assert.ok(fb.refreshes>=1);assert.equal(again.rank,1);assert.equal(reloaded.uid(),ranking.uid());
 // Cleanup works for the writer only.
 await assert.rejects(other.remove(again.id),e=>e.status===401);
 assert.ok(await reloaded.remove(again.id));assert.ok(!fb.runs[again.id]);
 assert.equal((await reloaded.top()).find(e=>e.name==='민준').score,4200,'the older best shows again after removal');
}

// Failures surface as errors so the game can fall back to this device's board.
{
 const clock={t:T0+5},fb=fakeFirebase({clock});
 const ranking=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 fb.rulesPublished=false;await assert.rejects(ranking.top(),e=>e.status===401,'rules not published yet');
 fb.rulesPublished=true;fb.offline=true;await assert.rejects(ranking.submit({name:'a',score:5,cycle:0,stage:0,kills:1,time:1}));
 fb.offline=false;await assert.rejects(ranking.submit({name:'   ',score:5,cycle:0,stage:0,kills:1,time:1}),/invalid-run/);
 const hanging=createOnlineRanking({storage:memory(),timeoutMs:30,fetchImpl:(url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
 await assert.rejects(hanging.top(),/aborted/,'a stalled network gives up');
 const brokenStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 const noStore=createOnlineRanking({storage:brokenStorage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 assert.equal((await noStore.submit({name:'저장불가',score:7,cycle:0,stage:0,kills:1,time:1})).rank>0,true,'works without local storage');
}

// Season 2: runs from before the season stay in the database but are not shown, even when they score higher
// and fill the whole score query; push keys find every run of this season.
{
 const clock={t:T0-50_000},fb=fakeFirebase({clock}),ranking=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 for(let i=0;i<120;i++)await ranking.submit({name:'옛기록'+(i%3),score:900000+i,cycle:9,stage:4,kills:999,time:999});
 clock.t=T0+1000;
 const fresh=await ranking.submit({name:'새시즌',score:120,cycle:0,stage:1,kills:12,time:60});
 assert.deepEqual(fresh.board.map(e=>e.name),['새시즌'],'only this season is on the board');assert.equal(fresh.rank,1);
 assert.equal(Object.keys(fb.runs).length,121,'nothing was deleted');
 assert.ok(!inSeason({at:T0-1})&&inSeason({at:T0}));
 assert.ok(pushKeyPrefix(T0)<pushKeyPrefix(T0+1)&&pushKeyPrefix(T0-1)<pushKeyPrefix(T0),'key prefixes follow time');
 assert.equal(pushKeyPrefix(0),'--------');
}

// Runs finished while offline or before the rules were published wait in the browser and go up later.
{
 const clock={t:T0+10},fb=fakeFirebase({clock}),storage=memory();
 const ranking=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 fb.rulesPublished=false;
 for(const score of [300,800])await assert.rejects(ranking.submit({name:'도윤',score,cycle:0,stage:2,kills:9,time:40}));
 assert.equal(ranking.pendingCount(),2);assert.equal(await ranking.flush(),0,'still locked: nothing sent, nothing lost');assert.equal(ranking.pendingCount(),2);
 fb.rulesPublished=true;
 assert.equal(await ranking.flush(),2);assert.equal(ranking.pendingCount(),0);
 assert.deepEqual((await ranking.top()).map(e=>[e.name,e.score]),[['도윤',800]]);
 for(let i=0;i<15;i++){fb.offline=true;await assert.rejects(ranking.submit({name:'많이',score:i+1,cycle:0,stage:0,kills:1,time:1}));}
 fb.offline=false;assert.equal(ranking.pendingCount(),10,'the waiting list is capped');
 await assert.rejects(ranking.submit({name:'',score:5,cycle:0,stage:0,kills:1,time:1}),/invalid-run/);assert.equal(ranking.pendingCount(),10,'invalid runs are never queued');
}

console.log('Online ranking: anonymous sign-in reuse, submit, per-player board, ranks, cleanup, fallbacks and waiting runs passed.');
