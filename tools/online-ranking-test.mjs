import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOnlineRanking,bestPerPlayer,validRun,seasonRun,AUTH_KEY,FIREBASE,SEASON,PREVIOUS_SEASON,ARCHIVE_SEASON,ARCHIVE_SEASONS,ACT,runAct,FETCH_RECENT,MAX_KILLS_PER_JOURNEY,inSeason,pushKeyPrefix,RUNS_PATH,BUILDS_PATH,SEASON11_RUNS_PATH,SEASON11_BUILDS_PATH,LEGACY_RUNS_PATH,LEGACY_BUILDS_PATH} from '../src/online-ranking.js';
import {MAX_RUN_CYCLE} from '../src/journey.js';
import {buildRecord,bossText,buildText} from '../src/ranking-build.js';
const T0=SEASON.start;

const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),data};};

// A small stand-in for Firebase Auth + Realtime Database REST that enforces the same rules as docs/FIREBASE-RANKING.md.
function fakeFirebase({clock}){
 const users=new Map(),tokens=new Map(),runs={},builds={};let signUps=0,refreshes=0,next=1,offline=false,rulesPublished=true,buildRulesPublished=true;
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
  const runsBase=[RUNS_PATH,SEASON11_RUNS_PATH,LEGACY_RUNS_PATH].find(base=>path===base),buildsBase=[BUILDS_PATH,SEASON11_BUILDS_PATH,LEGACY_BUILDS_PATH].find(base=>path===base||path.startsWith(base+'/'));
  if(runsBase&&opts.method==='POST'){
   const run=JSON.parse(opts.body);
   if(run.uid!==uid||typeof run.name!=='string'||run.name.length<1||run.name.length>16||!(run.score>=1)||![ACT.AUSTIN,ACT.ALWAYS_BEGINNER,ACT.JOHAN].includes(run.act)||run.at?.['.sv']!=='timestamp')return json(401,{error:'Permission denied'});
   // Real push IDs start with their creation time; the rest keeps them unique.
   const id=pushKeyPrefix(clock.t)+String(next++).padStart(12,'0');runs[id]={...run,at:clock.t};return json(200,{name:id});
  }
  if(runsBase&&(!opts.method||opts.method==='GET')){
   const orderBy=u.searchParams.get('orderBy'),limit=Number(u.searchParams.get('limitToLast'));
   if(orderBy==='"$key"'){const from=JSON.parse(u.searchParams.get('startAt')),to=u.searchParams.has('endAt')?JSON.parse(u.searchParams.get('endAt')):null;const kept=Object.entries(runs).filter(([k])=>k>=from&&(!to||k<=to)).sort((a,b)=>a[0]<b[0]?-1:1).slice(-limit);return json(200,Object.fromEntries(kept));}
   if(orderBy==='"uid"'){const own=JSON.parse(u.searchParams.get('equalTo'));return json(200,Object.fromEntries(Object.entries(runs).filter(([,v])=>v.uid===own)));}
   assert.equal(orderBy,'"score"');
   const from=u.searchParams.has('startAt')?JSON.parse(u.searchParams.get('startAt')):-Infinity;
   const kept=Object.entries(runs).filter(([,v])=>v.score>=from).sort((a,b)=>a[1].score-b[1].score);
   return json(200,Object.fromEntries(Number.isFinite(limit)?kept.slice(-limit):kept));
  }
  // Builds: same rules as docs/firebase-rules-with-seed.json — only the run's writer, once, known fields only.
  const bm=buildsBase&&path!==buildsBase?{1:path.slice(buildsBase.length+1)}:null;
  if(buildsBase){
   if(!buildRulesPublished)return json(401,{error:'Permission denied'});
   if(path===buildsBase){const from=JSON.parse(u.searchParams.get('startAt')),to=u.searchParams.has('endAt')?JSON.parse(u.searchParams.get('endAt')):null,limit=Number(u.searchParams.get('limitToLast'));const kept=Object.entries(builds).filter(([k])=>k>=from&&(!to||k<=to)).sort((a,b)=>a[0]<b[0]?-1:1).slice(-limit);return json(200,Object.fromEntries(kept));}
   const id=bm[1];
   if(!opts.method||opts.method==='GET')return json(200,builds[id]||null);
   if(opts.method==='PUT'){
    const b=JSON.parse(opts.body),keys=Object.keys(b).sort().join(',');
    if(builds[id]||runs[id]?.uid!==uid||b.uid!==uid||keys!=='austins,forms,laws,relic,uid,wardens'||b.laws.length>120||b.forms.length>120)return json(401,{error:'Permission denied'});
    builds[id]=b;return json(200,b);
   }
   if(opts.method==='DELETE'){if(builds[id]&&builds[id].uid!==uid)return json(401,{error:'Permission denied'});delete builds[id];return json(200,null);}
  }
  const runBase=[RUNS_PATH,LEGACY_RUNS_PATH].find(base=>path.startsWith(base+'/')),m=runBase?{1:path.slice(runBase.length+1)}:null;
  if(m&&opts.method==='DELETE'){if(runs[m[1]]?.uid!==uid)return json(401,{error:'Permission denied'});delete runs[m[1]];return json(200,null);}
  return json(404,{error:'not found'});
 }
 return {fetchImpl,runs,builds,set buildRulesPublished(v){buildRulesPublished=v;},get signUps(){return signUps;},get refreshes(){return refreshes;},set offline(v){offline=v;},set rulesPublished(v){rulesPublished=v;}};
}

// Board shaping: one line per player, bad data ignored.
{
 const data={a:{uid:'u1',name:'하나',score:500,cycle:1,stage:2,kills:10,time:50,at:1},b:{uid:'u1',name:'하나',score:900,cycle:2,stage:0,kills:20,time:90,at:2},c:{uid:'u1',name:'둘',score:700,cycle:1,stage:1,kills:12,time:60,at:3},d:{uid:'u2',name:'하나',score:900,cycle:2,stage:0,kills:20,time:90,at:1},e:{uid:'u3',name:'<b>',score:99999,cycle:0,stage:0,kills:0,time:0,at:1},f:'junk',g:{uid:'u4',name:'셋',score:-3,cycle:0,stage:0,kills:0,time:0,at:1}};
 const board=bestPerPlayer(data,20,null);
 assert.deepEqual(board.map(e=>e.id),['d','b','c'],'best per device+name, ties go to the earlier run, invalid rows dropped');
 assert.equal(bestPerPlayer(null).length,0);assert.equal(bestPerPlayer(data,1,null).length,1);
 assert.ok(!validRun({...data.a,stage:5})&&!validRun({...data.a,score:0}));
 assert.equal(runAct(data.a),ACT.AUSTIN,'old season 1.1 rows without act remain Austin records');
 assert.ok(validRun({...data.a,act:ACT.ALWAYS_BEGINNER})&&validRun({...data.a,act:ACT.JOHAN})&&!validRun({...data.a,act:4}));
 const split={...data,a:{...data.a,act:ACT.AUSTIN},b:{...data.b,act:ACT.ALWAYS_BEGINNER},c:{...data.c,act:ACT.ALWAYS_BEGINNER}};
 assert.deepEqual(bestPerPlayer(split,20,null,ACT.ALWAYS_BEGINNER).map(e=>e.id),['b','c'],'boss boards filter before choosing each player best');
 assert.ok(!validRun({...data.a,cycle:2,kills:1000,time:90}),'impossible old kill counts are hidden even if they predate the database rules');
 assert.ok(!validRun({...data.a,cycle:2,kills:20,time:2}),'impossible kill speed is hidden');
 assert.equal(MAX_KILLS_PER_JOURNEY,180);assert.ok(validRun({...data.a,cycle:100,kills:16200,time:3000,score:10000}),'long legitimate dense journeys remain rankable');
}

// Sign-in, submit, board and rank; the anonymous player is reused across page loads.
{
 const clock={t:T0+1_000_000},fb=fakeFirebase({clock}),storage=memory();
 const ranking=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const base={cycle:1,stage:3,kills:40,time:300};
 const first=await ranking.submit({...base,name:'  민준 ',score:1800});
 assert.equal(first.rank,1);assert.equal(first.bestRank,1);assert.equal(first.board[0].name,'민준');assert.equal(fb.signUps,1);
 assert.ok(JSON.parse(storage.getItem(AUTH_KEY)).refreshToken,'the refresh token is kept so the same player returns');
 const lower=await ranking.submit({...base,name:'민준',score:1200});
 assert.equal(lower.rank,0,'a lower run of the same player is not a new line');assert.equal(lower.bestRank,1);
 // Another device.
 const other=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const second=await other.submit({...base,name:'서연',score:3600});
 assert.equal(second.rank,1);assert.deepEqual(second.board.map(e=>e.name),['서연','민준']);
 // A sibling on the first device keeps a separate line.
 const sibling=await ranking.submit({...base,name:'하준',score:2400});
 assert.equal(sibling.rank,2);assert.deepEqual(sibling.board.map(e=>e.name),['서연','하준','민준']);
 // Page reload after the token expired: refresh, not a new anonymous user.
 clock.t+=2*3600e3;
 const reloaded=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const again=await reloaded.submit({...base,name:'민준',score:3800});
 assert.equal(fb.signUps,2,'no extra sign-up after reload');assert.ok(fb.refreshes>=1);assert.equal(again.rank,1);assert.equal(reloaded.uid(),ranking.uid());
 // Cleanup works for the writer only.
 await assert.rejects(other.remove(again.id),e=>e.status===401);
 assert.ok(await reloaded.remove(again.id));assert.ok(!fb.runs[again.id]);
 assert.equal((await reloaded.top()).find(e=>e.name==='민준').score,1800,'the older best shows again after removal');
 const act2=await other.submit({...base,name:'서연',score:3900,act:ACT.ALWAYS_BEGINNER});
 assert.equal(runAct(fb.runs[act2.id]),ACT.ALWAYS_BEGINNER);assert.deepEqual((await other.top(20,'',SEASON,ACT.ALWAYS_BEGINNER)).map(e=>e.name),['서연']);
 assert.equal((await other.top(20,'',SEASON,ACT.AUSTIN))[0].score,3600,'Austin and Always Beginner keep separate best records');
 const act3=await other.submit({...base,name:'서연',score:18000,kills:100,act:ACT.JOHAN});
 assert.equal(runAct(fb.runs[act3.id]),ACT.JOHAN);assert.deepEqual((await other.top(20,'',SEASON,ACT.JOHAN)).map(e=>e.name),['서연']);
 assert.equal(validRun({...base,uid:'u',name:'서연',score:18000,kills:100,act:ACT.JOHAN,at:T0}),true,'Act 3 boss points stay rankable');
 assert.equal((await other.top(20,'',SEASON,ACT.ALWAYS_BEGINNER))[0].score,3900,'Johan does not replace Act 2 best');
}

// A long-ago personal run must still appear even after it falls outside both
// the top 100 score query and the most recent 500 runs.
{
 const clock={t:T0+1_000_000},fb=fakeFirebase({clock}),ranking=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const posted=await ranking.submit({name:'내기록',score:1000,cycle:1,stage:3,kills:40,time:300});
 for(let i=0;i<600;i++)fb.runs[pushKeyPrefix(clock.t+i+1)+String(i).padStart(12,'0')]={uid:`other-${i}`,name:`도전자${i}`,score:2000+i,cycle:1,stage:3,kills:80,time:300,act:ACT.AUSTIN,at:clock.t+i+1};
 assert.equal((await ranking.top(500,'내기록')).some(row=>row.id===posted.id),false);
 const personal=await ranking.personalRank(SEASON,ACT.AUSTIN);
 assert.equal(personal.entry.id,posted.id);
 assert.equal(personal.rank,601);
 assert.equal((await ranking.personalRank(SEASON,ACT.JOHAN)).entry,null);
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
 for(let i=0;i<120;i++)await ranking.submit({name:'옛기록'+(i%3),score:250000+i,cycle:9,stage:4,kills:999,time:999});
 clock.t=T0+1000;
 const fresh=await ranking.submit({name:'새시즌',score:120,cycle:0,stage:1,kills:12,time:60});
 assert.deepEqual(fresh.board.map(e=>e.name),['새시즌'],'only this season is on the board');assert.equal(fresh.rank,1);
 const archive=await ranking.top(20,'',PREVIOUS_SEASON);assert.deepEqual(new Set(archive.map(e=>e.name)),new Set(['옛기록0','옛기록1','옛기록2']),'the closed season remains readable without new-season runs');
 assert.equal(Object.keys(fb.runs).length,121,'nothing was deleted');
 assert.ok(!inSeason({at:T0-1})&&inSeason({at:T0}));assert.ok(inSeason({at:T0-1},PREVIOUS_SEASON)&&!inSeason({at:T0},PREVIOUS_SEASON));
 // 보관 시즌은 빈틈 없이 이어진다: 1.0 끝 = 1.1 시작, 1.1 끝 = 1.2 시작.
 assert.equal(ARCHIVE_SEASON.end,PREVIOUS_SEASON.start);assert.equal(PREVIOUS_SEASON.end,SEASON.start);assert.deepEqual(ARCHIVE_SEASONS.map(v=>v.id),['1.1','1.0']);
 assert.ok(pushKeyPrefix(T0)<pushKeyPrefix(T0+1)&&pushKeyPrefix(T0-1)<pushKeyPrefix(T0),'key prefixes follow time');
 assert.equal(pushKeyPrefix(0),'--------');
}

// Builds: the top lines carry what the run was made of; a missing build rule never loses the run.
{
 const clock={t:T0+100},fb=fakeFirebase({clock}),storage=memory(),ranking=createOnlineRanking({storage,fetchImpl:fb.fetchImpl,now:()=>clock.t});
 const build=buildRecord({levels:new Map([['chain',2]]),forms:new Map([['collapse',6],['fullbloom',4]]),relic:'mirror',wardens:5,austins:1});
 const first=await ranking.submit({name:'빌드왕',score:50000,cycle:5,stage:0,kills:605,time:900,build});
 assert.deepEqual(first.board[0].build,{uid:first.board[0].uid,...build},'the build comes back with the line');
 assert.equal(bossText(first.board[0].build),'문지기 5 · 오스틴 1회 격파');
 assert.ok(buildText(first.board[0].build).startsWith('붕괴의 씨앗 Lv.6 · 만개한 꽃 Lv.4 · 연쇄 Lv.2'));
 // Enough later builds push this high score outside the recent-build query. Its exact id is recovered for display.
 for(let i=0;i<=FETCH_RECENT;i++)fb.builds[pushKeyPrefix(clock.t+i+1)+String(i).padStart(12,'0')]={uid:'noise',laws:'chain:1',forms:'',relic:'',wardens:0,austins:0};
 assert.deepEqual((await ranking.top(20,'빌드왕'))[0].build,{uid:first.board[0].uid,...build},'an old top build is fetched directly after it leaves the recent window');
 fb.buildRulesPublished=false;
 const older=await ranking.submit({name:'옛규칙',score:900,cycle:0,stage:2,kills:30,time:100,build});
 assert.ok(older.rank>0,'the run is kept even when the build cannot be written');assert.equal(older.board.find(e=>e.name==='옛규칙').build,undefined);
 assert.equal(ranking.pendingCount(),0,'a refused build does not queue the run again');
 // 2026-09-21: 거부당한 조합을 조용히 버리면 기록만 남고 조합이 영영 사라진다. 이 브라우저에 두었다가 다시 보낸다.
 assert.equal(ranking.pendingBuildCount(),1,'거부당한 조합은 이 브라우저에 남는다');
 fb.buildRulesPublished=true;
 assert.equal(await ranking.flushBuilds(),1,'규칙이 고쳐지면 남아 있던 조합을 다시 보낸다');
 assert.equal(ranking.pendingBuildCount(),0,'다시 보낸 뒤에는 남지 않는다');
 assert.equal(fb.builds[older.id]?.laws,build.laws,'되살린 조합이 그 기록에 붙는다');
 assert.equal(await ranking.flushBuilds(),0,'보낼 것이 없으면 아무 일도 하지 않는다');
 const noBuild=await ranking.submit({name:'빈손',score:10,cycle:0,stage:0,kills:1,time:5});assert.equal(noBuild.board.find(e=>e.name==='빈손').build,undefined);
 // Someone else's build under a run id is ignored.
 fb.builds[older.id]={...fb.builds[first.id],uid:'intruder'};
 assert.equal((await ranking.top()).find(e=>e.id===older.id).build,undefined);
 assert.ok(await ranking.remove(first.id));assert.ok(!fb.builds[first.id]&&!fb.runs[first.id],'removing a run removes its build');
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

// 보안 규칙 파일 점검. 2026-09-21: 시즌 1.1의 조합 쓰기 규칙이 예전 시즌의 기록 경로를 보고 있어
// 165건이 조합 없이 올라갔다. 같은 실수가 다시 나지 않도록 경로 짝을 자동으로 확인한다.
{
 const rules=JSON.parse(fs.readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules;
 const ranking=rules?.seedRanking;
 assert.ok(ranking,'seedRanking 규칙이 있어야 한다');
 // 기록과 조합이 짝으로 있는 구역을 모두 찾는다: 최상위(예전 시즌)와 seasonNN 하위 구역.
 const areas=[{prefix:[],node:ranking},...Object.entries(ranking).filter(([,v])=>v&&typeof v==='object'&&v.runs&&v.builds).map(([name,v])=>({prefix:[name],node:v}))];
 assert.ok(areas.length>=2,'예전 시즌과 현재 시즌 두 구역이 있어야 한다');
 for(const {prefix,node} of areas){
  const where=['seedRanking',...prefix].join('/');
  const write=node.builds?.$runId?.['.write'];
  assert.ok(typeof write==='string',`${where}/builds 쓰기 규칙이 있어야 한다`);
  const chain=['seedRanking',...prefix,'runs'].map(part=>`.child('${part}')`).join('');
  assert.ok(write.includes(`root${chain}.child($runId)`),`${where}/builds 규칙이 ${where}/runs 대신 다른 경로를 본다`);
  assert.ok(node.runs?.$runId?.['.write'],`${where}/runs 쓰기 규칙이 있어야 한다`);
  assert.ok(node.runs['.indexOn']?.includes('score'),`${where}/runs 점수 색인이 있어야 한다`);
 }
 // 이번 시즌 규칙은 열 번째 여정까지만 받고, 완주 표시를 허락해야 한다(게임 밖에서 보내도 막힌다).
 {
  const current=RUNS_PATH.split('/').reduce((at,part)=>at?.[part],rules).$runId;
  assert.ok(current['.validate'].includes(`newData.child('cycle').val() <= ${MAX_RUN_CYCLE}`),'이번 시즌 규칙이 여정 상한을 지키지 않는다');
  assert.equal(current.done?.['.validate'],'newData.isBoolean()','이번 시즌 규칙이 완주 표시를 받지 않는다');
  assert.ok(current.act?.['.validate'].includes('newData.val() == 3'),'현재 시즌 규칙이 요한 기록을 허용해야 한다');
 }
 // 게임이 실제로 쓰는 경로가 규칙에 있는 구역이어야 한다.
 for(const path of [RUNS_PATH,BUILDS_PATH,SEASON11_RUNS_PATH,SEASON11_BUILDS_PATH,LEGACY_RUNS_PATH,LEGACY_BUILDS_PATH]){
  const node=path.split('/').reduce((at,part)=>at?.[part],rules);
  assert.ok(node?.$runId,`${path} 경로에 규칙이 없다`);
 }
}

// 시즌 1.2: 찐보스 열 번(50번째 여정)까지, 같은 점수면 빠른 판이 위, 완주 표시.
{
 assert.equal(MAX_RUN_CYCLE,49);
 const base={uid:'u',name:'가',score:1000,cycle:49,stage:4,kills:5000,time:3000,at:SEASON.start+1};
 assert.equal(seasonRun(base),true,'50번째 여정(cycle 49)까지는 받는다');
 assert.equal(seasonRun({...base,cycle:50,kills:5100,time:3000}),false,'51번째 여정부터는 이번 시즌에 받지 않는다');
 assert.equal(validRun({...base,cycle:136,kills:16000,score:1000,time:9000}),true,'보관 시즌을 읽을 때는 옛 판도 그대로 보인다');
 assert.equal(validRun({...base,done:'yes'}),false,'완주 표시는 참/거짓만');
 const board=bestPerPlayer({a:{...base,uid:'a',name:'느림',time:1500},b:{...base,uid:'b',name:'빠름',time:1200},c:{...base,uid:'c',name:'높음',score:1001,time:5000}},10);
 assert.deepEqual(board.map(e=>e.name),['높음','빠름','느림'],'점수가 먼저, 같은 점수면 빠른 쪽이 위');
 const clock={t:SEASON.start+10},fb=fakeFirebase({clock}),ranking=createOnlineRanking({storage:memory(),fetchImpl:fb.fetchImpl,now:()=>clock.t});
 await assert.rejects(ranking.submit({name:'오래버팀',score:500000,cycle:136,stage:3,kills:16000,time:8200}),/invalid-run/,'상한을 넘긴 옛 판은 올라가지 않는다');
 assert.equal(ranking.pendingCount(),0,'거절된 옛 판이 대기 목록을 막지 않는다');
 const done=await ranking.submit({name:'완주',score:80000,cycle:49,stage:4,kills:5000,time:3000,done:true});
 assert.equal(done.board.find(e=>e.name==='완주').done,true,'완주 표시가 기록에 남는다');
}

console.log('Online ranking: anonymous sign-in reuse, submit, per-player board, ranks, cleanup, fallbacks, waiting runs and the rules file season paths passed.');
