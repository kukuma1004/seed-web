import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSurvivalSession,survivalActCount,survivalAct,SURVIVAL,tickSurvival,settleSurvivalKill,advanceSurvivalAct,survivalBossOrdinal,survivalEnemySpec,survivalSpawn,survivalScaling,recordSurvivalResult,readSurvivalRecord} from '../src/survival-rules.js';
import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {createSurvivalArbor,restoreSurvivalArbor,checkpointSurvivalArbor,survivalArborBossArt} from '../src/survival-arbor.js';
import {createSurvivalSaveStore,routeSurvivalSaveStore,validSurvivalSave,queueSurvivalTitle,settleSurvivalTitles} from '../src/survival-save.js';
import {captureSurvivalSixSnapshot,validSurvivalSixSave,validSurvivalSixRecord,survivalSixProgressValid,SURVIVAL_SIX_SAVE_KEY} from '../src/survival-six-save.js';
import {captureSurvivalObjectiveSnapshot} from '../src/survival-objective-save.js';
import {createSurvivalSync} from '../src/survival-sync.js';
import {decodeSurvivalSixCloud} from '../src/survival-six-sync.js';
import {createSurvivalSiege,checkpointSurvivalSiege,SURVIVAL_OBJECTIVE} from '../src/survival-crystal-siege.js';
import {survivalExpansionRankProgress,survivalRankMinimumTime,validSurvivalRank} from '../src/survival-ranking.js';
import {createSurvivalArt} from '../src/survival-art.js';

const options={sixActs:true,objectives:true,currentOwner:()=> 'p1'};
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
function world(session,id='six-run'){
 return {id,revision:0,session,progress:{hp:61,kills:session.kills,score:10*session.kills,choicesTaken:3,choiceKills:7,bankedUpgrades:1,elapsed:session.time,levels:{return:2},forms:{},inventory:{tonic:2}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,0]},pending:null,enemies:[],hostiles:[],...(session.act>=3?{expansion:createSurvivalExpansion(session).checkpoint()}:{})};
}
function captured(session,id='six-run'){
 const siege=session.act===4&&session.objective?checkpointSurvivalSiege(createSurvivalSiege(session)):null;
 return captureSurvivalSixSnapshot(world(session,id),{owner:'p1',siege});
}
const s=createSurvivalSession(142,{actCount:6,objective:SURVIVAL_OBJECTIVE});assert.equal(survivalActCount(s),6);
let checkpoints=0,spawns=0;
for(let leg=0;leg<18;leg++){
 assert(survivalSixProgressValid(s));const snap={...captured(s),revision:1};assert(validSurvivalSixSave(snap));checkpoints++;
 assert.equal(validSurvivalSave({...snap,version:1}),false,'old clients cannot write a six-act timeline');
 const before=s.bossesDefeated;settleSurvivalKill(s,{boss:true});assert.equal(s.bossesDefeated,before,'no victory before real boss entry');
 for(let i=0;i<1800;i++){const out=tickSurvival(s,.1,0);spawns+=out.spawn;}
 if(!s.bossSpawned)tickSurvival(s,.1,0);assert(s.bossSpawned);
 settleSurvivalKill(s,{boss:true});assert.equal(s.bossesDefeated,leg+1);assert(survivalSixProgressValid(s));
 const boss=survivalAct(s).type;if(s.act>=3)assert.equal(survivalBossOrdinal(s,boss),Math.floor(leg/6)+1);
 settleSurvivalKill(s,{boss:true});assert.equal(s.bossesDefeated,leg+1,'one boss cannot credit twice');
 if(s.act===5){assert.equal(s.completedLaps,Math.floor(leg/6)+1);assert.equal(s.arborBossWins,s.completedLaps);}
 assert(advanceSurvivalAct(s));assert.equal(s.act,(leg+1)%6);assert.equal(s.lap,Math.floor((leg+1)/6));assert(survivalSixProgressValid(s));
}
assert.equal(s.completedLaps,3);assert.equal(s.arborBossWins,3);assert(survivalScaling(s).hp>survivalScaling(createSurvivalSession()).hp);
assert(survivalExpansionRankProgress(s).eligible);assert(!survivalExpansionRankProgress({...s,arborBossWins:7}).eligible);
for(let bosses=1;bosses<=18;bosses++){
 const time=survivalRankMinimumTime({actCount:6,bosses}),row={uid:'p1',name:'씨앗',score:bosses*500,kills:bosses,bosses,time,laws:'return:2',forms:'',actCount:6};
 assert(validSurvivalRank(row));assert(!validSurvivalRank({...row,time:time-1}),'one second before the real finite-wave boundary is rejected');
 if(bosses>=5){const old={...row};delete old.actCount;assert(!validSurvivalRank(old),'historical rows keep their old time floor');}
 assert(!validSurvivalRank({...row,actCount:5}));
}
assert.equal(survivalRankMinimumTime({actCount:6,bosses:5}),870);assert.equal(survivalRankMinimumTime({actCount:6,bosses:6}),1050);
for(const legacy of [createSurvivalSession(1),createSurvivalSession(2,{actCount:5})]){
 const count=survivalActCount(legacy);for(let i=0;i<count;i++){legacy.bossSpawned=true;settleSurvivalKill(legacy,{boss:true});advanceSurvivalAct(legacy);}assert.equal(legacy.act,0);assert.equal(legacy.lap,1);assert(!Object.hasOwn(legacy,'arborBossWins'));
}

// The original Arbo patterns pursue outer areas, telegraph roots, cap bolts and
// reproduce the exact mid-attack state. No synthetic replacement boss exists.
const a={...createSurvivalSession(1,{actCount:6}),act:5,lap:0},runtime=createSurvivalArbor(a),position={x:0,z:-4.4},player={x:21,z:17};
const patterns=new Set();let bolts=0,zones=0,sawOuterRoot=false,restored=null,comparison=0,outputIdentity=null;
for(let i=0;i<3000;i++){
 const out=runtime.step(.1,{position,player,activeProjectiles:i%13===0?47:0,hpRatio:.3});if(!outputIdentity)outputIdentity=out;else assert.equal(out,outputIdentity);
 position.x+=out.move.x;position.z+=out.move.z;patterns.add(runtime.model.pattern);bolts+=out.bolts.length;zones+=out.zones.length;
 assert(out.bolts.length<=7);assert(out.zones.length<=1);if(i%13===0)assert(out.bolts.length<=1);
 for(const zone of out.zones)if(zone.position.x>14&&zone.position.z>12)sawOuterRoot=true;
 if(!restored&&runtime.model.phase==='windup'&&runtime.model.pattern===1){restored=createSurvivalArbor(a,runtime.checkpoint());assert(restored);}
 else if(restored&&comparison<120){const replayPosition={x:position.x-out.move.x,z:position.z-out.move.z},other=restored.step(.1,{position:replayPosition,player,activeProjectiles:i%13===0?47:0,hpRatio:.3});assert.deepEqual(other,out);comparison++;}
}
assert.deepEqual([...patterns].sort(),[0,1,2]);assert(bolts>0&&zones>0&&sawOuterRoot&&comparison===120);
const checkpoint=runtime.checkpoint();assert(restoreSurvivalArbor(checkpoint,0));
for(const edit of [v=>v.sequence=[0,2],v=>v.timer=99,v=>v.round=2,v=>v.aim.x=99,v=>v.pattern=8]){const broken=structuredClone(checkpoint);edit(broken);assert.equal(restoreSurvivalArbor(broken,0),null);}
assert.equal(checkpointSurvivalArbor(runtime.model).version,1);assert.match(survivalArborBossArt({mobile:true}).file,/arbo-motion-v1-mobile/);
const bossArt=survivalArborBossArt();assert.equal(bossArt.atlasFrame({expansionMotion:{phase:'windup'},arborAttackTime:.1}),1);assert.equal(bossArt.atlasFrame({expansionMotion:{phase:'recover'},arborAttackTime:.1}),2);assert.equal(bossArt.atlasFrame({expansionMotion:{phase:'recover'},arborAttackTime:0}),3);

// Same boss title queue and monotone ordinal; inspection never grants a title.
const titles=createSurvivalSession(5,{actCount:6});assert(queueSurvivalTitle(titles,'arbor',1));assert(queueSurvivalTitle(titles,'arbor',1));let awards=0;assert(settleSurvivalTitles(titles,e=>{assert.equal(e.boss,'arbor');awards++;return true;}));assert.equal(awards,1);
const storeData=memory(),store=createSurvivalSaveStore(storeData,'p1',options),fresh=captured(createSurvivalSession(5,{actCount:6,objective:SURVIVAL_OBJECTIVE}));
let result=store.write(fresh,{fresh:true});assert(result.ok);assert.equal(store.key,SURVIVAL_SIX_SAVE_KEY+':p1');assert(validSurvivalSixRecord(result.value));
const stored=result.value;assert.equal(storeData.getItem('seed-survival-checkpoint-v1:p1'),null);assert.equal(storeData.getItem('seed-survival-checkpoint-v2:p1'),null);
assert.equal(routeSurvivalSaveStore(storeData,'p1',{objectives:true}).kind,'six-locked');
const spend=structuredClone(stored);spend.progress.inventory.tonic=1;assert(store.write(spend).ok);assert.equal(store.write(spend).reason,'conflict');assert.equal(store.read().progress.inventory.tonic,1);
const brokenCredits=structuredClone(store.read());brokenCredits.session.completedLaps=4;assert.equal(store.write(brokenCredits).reason,'invalid');
const realBossSession={...createSurvivalSession(15,{actCount:6}),act:5,bossesDefeated:5,crosswindBossWins:1,crystalBossWins:1,bossSpawned:true,time:1080,legStartedAt:900};
const bossWorld=world(realBossSession);bossWorld.expansion={act:5,walls:[],boss:checkpoint};bossWorld.enemies=[{fields:{survivalBoss:true,type:'arbor',hp:1200,maxHp:5200},position:[position.x,0,position.z],rotation:0}];
assert(validSurvivalSixSave({...captureSurvivalSixSnapshot(bossWorld,{owner:'p1'}),revision:1}),'real Arbo phase and actual alive boss resume together');
const oldData=memory(),oldStore=createSurvivalSaveStore(oldData,'p1');assert(oldStore.write(world(createSurvivalSession(9),'old-run'),{fresh:true}).ok);
const oldBytes=oldData.getItem(oldStore.key);assert.equal(routeSurvivalSaveStore(oldData,'p1',options).kind,'legacy-live');assert.equal(createSurvivalSaveStore(oldData,'p1',options).write(fresh,{fresh:true}).reason,'legacy-active');assert.equal(oldData.getItem(oldStore.key),oldBytes);
assert(oldStore.end('old-run',1));const terminalBytes=oldData.getItem(oldStore.key),childStore=createSurvivalSaveStore(oldData,'p1',options);assert(childStore.write(fresh,{fresh:true}).ok);assert.equal(childStore.read().parent.bytes,terminalBytes);assert.equal(oldData.getItem(oldStore.key),terminalBytes);
const oldV2Data=memory(),oldV2Store=createSurvivalSaveStore(oldV2Data,'p1',{objectives:true}),v2World=captureSurvivalObjectiveSnapshot(world(createSurvivalSession(10,{actCount:5,objective:SURVIVAL_OBJECTIVE}),'v2-run'),{owner:'p1'});
assert(oldV2Store.write(v2World,{fresh:true}).ok);const v2LiveBytes=oldV2Data.getItem(oldV2Store.key);assert.equal(routeSurvivalSaveStore(oldV2Data,'p1',options).kind,'objective');assert.equal(createSurvivalSaveStore(oldV2Data,'p1',options).write(fresh,{fresh:true}).reason,'legacy-active');assert.equal(oldV2Data.getItem(oldV2Store.key),v2LiveBytes);
assert(oldV2Store.end('v2-run',1));const v2TerminalBytes=oldV2Data.getItem(oldV2Store.key),v2Child=createSurvivalSaveStore(oldV2Data,'p1',options);assert(v2Child.write(fresh,{fresh:true}).ok);assert.equal(v2Child.read().parent.bytes,v2TerminalBytes);assert.equal(oldV2Data.getItem(oldV2Store.key),v2TerminalBytes);

// Dedicated v3 CAS channel: old checkpoints stay byte-exact, phone and PC keep
// HP/build/potions, stale writers conflict and a death cannot resurrect a run.
const database=new Map(),requests=[];let etag=0;
const fetchImpl=async(url,request={})=>{const path=new URL(url).pathname;requests.push({path,method:request.method||'GET'});const state=database.get(path)||{version:0,payload:null};if(request.method==='PUT'){
 if(request.headers['if-match']!=='e'+state.version)return {ok:false,status:412,headers:{get:()=>null}};
 const payload=JSON.parse(request.body);database.set(path,{version:++etag,payload});return {ok:true,status:200,headers:{get:()=> 'e'+etag},json:async()=>payload};
 }return {ok:true,status:200,headers:{get:()=> 'e'+state.version},json:async()=>structuredClone(state.payload)};};
const account={user:()=>({uid:'p1',isAnonymous:false}),tokenSession:async()=>({uid:'p1',idToken:'mock'})};
const deviceA=memory(),deviceB=memory(),aStore=createSurvivalSaveStore(deviceA,'p1',options);assert(aStore.write(fresh,{fresh:true}).ok);
const syncOptions={account,databaseURL:'https://seed.test',fetchImpl,...options},cloudA=createSurvivalSync({storage:deviceA,...syncOptions}),cloudB=createSurvivalSync({storage:deviceB,...syncOptions});
assert.equal((await cloudA.flush()).kind,'synced');assert(requests.some(r=>r.method==='PUT'&&r.path==='/seedSurvivalSixSaves/p1.json'));assert(!requests.some(r=>r.method==='PUT'&&r.path==='/seedSurvivalSaves/p1.json'));
assert.equal((await cloudB.sync({allowPull:true})).kind,'synced');const bStore=createSurvivalSaveStore(deviceB,'p1',options);assert.equal(bStore.read().progress.hp,61);assert.equal(bStore.read().progress.levels.return,2);const bSave=bStore.read();bSave.progress.inventory.tonic=1;assert(bStore.write(bSave).ok);assert.equal((await cloudB.flush()).kind,'synced');
const aSave=aStore.read();aSave.progress.hp=40;assert(aStore.write(aSave).ok);const conflict=await cloudA.sync({allowPull:true});assert.equal(conflict.kind,'conflict');assert.equal((await cloudA.sync({allowPull:true,choice:'remote',expected:conflict.expected})).kind,'synced');assert.equal(aStore.read().progress.inventory.tonic,1);
const live=bStore.read();assert(bStore.end(live.id,live.revision,live.writeId));assert.equal((await cloudB.flush()).kind,'synced');assert.equal((await cloudA.sync({allowPull:true})).kind,'synced');assert.equal(aStore.read(),null);assert.equal(aStore.readRecord().ended,true);
assert.throws(()=>decodeSurvivalSixCloud({version:2,revision:1,checkpoint:JSON.stringify(stored)},{owner:'p1'}));
cloudA.stop();cloudB.stop();

// A new device must import the existing five/three-act account run before it
// offers six acts; checking a newer mode cannot hide an old live cloud save.
const legacyRemote=memory(),legacyStore=createSurvivalSaveStore(legacyRemote,'p1');assert(legacyStore.write(world(createSurvivalSession(41),'remote-legacy'),{fresh:true}).ok);
database.delete('/seedSurvivalSixSaves/p1.json');database.set('/seedSurvivalSaves/p1.json',{version:++etag,payload:{version:1,revision:7,checkpoint:JSON.stringify(legacyStore.readRecord())}});
const newcomer=memory(),newSync=createSurvivalSync({storage:newcomer,...syncOptions}),requestCount=requests.length;
assert.equal((await newSync.sync({allowPull:true})).kind,'synced');assert.equal(routeSurvivalSaveStore(newcomer,'p1',options).kind,'legacy-live');assert.equal(newcomer.getItem(SURVIVAL_SIX_SAVE_KEY+':p1'),null);assert(!requests.slice(requestCount).some(r=>r.method==='PUT'));newSync.stop();

// A fifth-act paid defense remains a genuine sixth-circuit state with the
// original finite waves; neither snapshot API nor validators discard it.
const fifth={...createSurvivalSession(9,{actCount:6,objective:SURVIVAL_OBJECTIVE}),act:4,bossesDefeated:4,crosswindBossWins:1,time:720,legStartedAt:720};
const fifthSnapshot={...captured(fifth),revision:1};assert(validSurvivalSixSave(fifthSnapshot));assert(fifthSnapshot.siege.state);const noSiege=structuredClone(fifthSnapshot);noSiege.siege=null;assert(!validSurvivalSixSave(noSiege));

// One extra floor map only. Switching all six acts reuses the original twelve
// body batches, GPU buffers, shadows and defeat pool at the 300-enemy ceiling.
const load=THREE.TextureLoader.prototype.load,loaded=[];THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.userData.url=url;loaded.push(t);return t;};
try{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,19,19);camera.lookAt(0,0,0);camera.updateMatrixWorld();const art=createSurvivalArt(scene,camera,{mobile:true,capacity:300});art.setActive(true);
 const root=scene.getObjectByName('survival-garden-art'),bodies=root.children.filter(o=>/^survival-(swarm|runner|brute)-/.test(o.name)),buffers=bodies.map(b=>b.instanceMatrix.array),originalChildren=[...root.children];
 const crowd=Array.from({length:301},(_,i)=>{const g=new THREE.Group();g.position.set(i%20,0,Math.floor(i/20));return {g,survivalKind:['swarm','runner','brute'][i%3],phase:i,radius:.3};});
 for(let pass=0;pass<2;pass++)for(let act=0;act<6;act++){art.setAct(act);assert.equal(art.update(crowd,pass*6+act),300);assert.equal(art.state().overflow,1);}
 art.setAct(5);const warmed=loaded.length;for(let i=0;i<600;i++){art.update(crowd,i/60);assert.equal(loaded.length,warmed);}
 assert.deepEqual(root.children,originalChildren);assert(bodies.every((b,i)=>b.instanceMatrix.array===buffers[i]));assert.equal(art.state().actorArt.length,3);assert.match(art.state().groundArt,/survival-garden-paving-v1/);assert.equal(art.state().maxBodyBatches,12);art.dispose();
}finally{THREE.TextureLoader.prototype.load=load;}
const records=memory();recordSurvivalResult(records,{...s,kills:8000,time:4000,fastestLap:1100});const best=readSurvivalRecord(records);assert.equal(best.sixWins,3);assert.equal(best.wins,0);assert.equal(best.fastestSixClear,1100);assert.equal(best.fiveWins,undefined);
recordSurvivalResult(records,{...s,kills:8000,time:4000,fastestLap:1050});assert.equal(readSurvivalRecord(records).fastestSixClear,1050);recordSurvivalResult(records,{...s,kills:8000,time:4000,fastestLap:1049});assert.equal(readSurvivalRecord(records).fastestSixClear,1050,'impossible fast clear never replaces a genuine finite-wave clear');
const points={...createSurvivalSession(19,{actCount:6}),act:5,time:120,legStartedAt:0};for(let i=0;i<600;i++){const spawn=survivalSpawn(points,{x:20,z:17});assert(spawn);assert(Math.hypot(spawn.x-20,spawn.z-17)>=SURVIVAL.minSpawnDistance-1e-8);assert(survivalEnemySpec(spawn.kind,points).hp>0);}
console.log(JSON.stringify({pass:true,checkpoints,realBossCreditLegs:18,spawnAttempts:spawns,arborPatternFrames:3000,arborReplayFrames:comparison,arborBolts:bolts,arborRootZones:zones,crowdVisualFrames:612,contactEnemies:300,bodyBatches:12,cloud:'mock ETag v3 separate endpoint; not real accounts or phones'}));
