// Renderless contract evidence only. Synthetic finite hit attempts drive the
// production damage/death code; no boss HP=0 shortcut and no browser victory claim.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as THREE from 'three';
import {fixture,released,source} from './expansion-public-host-test.mjs';
import {createTempestCarrier,tickTempestCarrier,createAct3Warden,damageTempestCarrier,TEMPEST_CARRIER} from '../src/act3-enemies.js';
import {ACT3_PRESSURE,act3Storage} from '../src/act3.js';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';
import {createWarden} from '../src/warden.js';
import {safeArenaSpawn} from '../src/arena.js';
import * as guardianRules from '../src/expansion-guardians.js';
import {creditJourneySignatureKill} from '../src/journey-act-signatures.js';
import {stepExpansionBoss} from '../src/act-expansion-runtime.js';
import {difficulty,readCheckpoint,writeCheckpoint,clearCheckpoint,SAVE_KEY} from '../src/run-save.js';
import {bossCapReached,FINAL_BOSS_CAP,canUseExit,EXIT,roomFor} from '../src/journey.js';
import {addJourneyBossReceipt} from '../src/journey-boss-receipts.js';
import {createModeBossOutbox} from '../src/mode-boss-outbox.js';
import {MODE_BOSSES,recordModeBossVictory} from '../src/mode-boss-titles.js';
import {readAccountProfile,writeAccountProfile,recordBestScore} from '../src/account-profile.js';
import {readDiscoveries,recordDiscovery} from '../src/discoveries.js';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossVictoryLedger} from '../src/boss-victory-events.js';
import {installBossVictoryAccount,readBossVictoryAccount} from '../src/boss-victory-account.js';
import {createBossVictoryEventQueue} from '../src/boss-victory-event-sync.js';
import {ACT,validRun} from '../src/online-ranking.js';
import {killPoints,clearBonus,formatScore,formatTime,escapeHtml,CLEAR_BONUS} from '../src/score.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const range=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`${start} production closure exists`);return source.slice(a,b);};
const execute=(c,start,end)=>vm.runInContext(range(start,end),c);
const rows=[];
const noop=()=>{};
const turn=()=>new Promise(r=>setImmediate(r));
function prepare(f,{epoch=false}={}){
 const c=f.c,storage=f.storage,rankings=[],saveStatuses=[];
 Object.defineProperty(storage,'length',{get:()=>f.data.size});storage.key=i=>[...f.data.keys()][i]??null;
 storage.removeItem('seed-account-profile-v1');storage.setItem('seed-cloud-owner-v1','owner-A');
 if(epoch){const seal=createBossMigrationSeal('owner-A','contract-epoch-09',{version:1,account:{version:1},discoveries:{bosses:[]}},1000);installBossVictoryAccount(storage,{ownerUid:'owner-A',seal,ledger:createBossVictoryLedger('owner-A',seal.epoch,seal.baseline)});}
 Object.assign(c,{THREE,V:THREE.Vector3,readAccountProfile,writeAccountProfile,recordBestScore,readBossVictoryAccount,MODE_BOSSES,recordModeBossVictory,createModeBossOutbox,addJourneyBossReceipt,readCheckpoint,writeCheckpoint,clearCheckpoint,
  readDiscoveries,profile:readDiscoveries(storage),currentJourneyOwner:'owner-A',currentJourneyRunId:'contract-act3',pendingJourneyBossTitles:[],cloud:{flush:async()=>{}},dominantLaw:()=>null,effectiveLevels:levels=>levels,awardExpansionBossTree:()=>true,
  remember:(_kind,id)=>recordDiscovery(storage,readDiscoveries(storage),'bosses',id),journeyCompletionPending:false,saveExitBusy:false,exitWithoutSaveArmed:false,JOURNEY_HEAL:25,maxPlayerHp:()=>100,displayHp:Math.ceil,
  isAct2:r=>r==='stadium',isAct3:r=>r==='skyway',gardenFx:{austinEvery:5},mirrorSession:null,trainingSession:null,austinRoom:false,stage:0,cycle:0,wardensDefeated:0,austinsDefeated:0,
  scene:new THREE.Scene(),camera:{},difficulty,expansionTerrain:null,attachActorArt:noop,expansionActorArt:()=>({}),expansionEnemyArt:()=>({}),chargeActive:noop,bossCharge:()=>1,killCharge:()=>1,
  damageTempestCarrier,killPoints,clearBonus,bossCapReached,FINAL_BOSS_CAP,EXIT,canUseExit,isBoss:e=>e.expansionBoss||e.type==='tempestcarrier'||e.type==='act3warden',isRelayPart:()=>false,
  combatAnalysis:{damage:noop,utility:noop,kill:noop},vfx:{clear:noop,impact:noop,pulse:noop,burst:noop},audio:{play:noop,setPaused:noop},cameraShake:0,act3SupplyDrop:()=>null,
  rng:()=>.8,earnCoins:(_s,n)=>({coins:n}),grantFinalBossGardenMemory:()=>({line:'synthetic memory adapter'}),austinDrops:()=>[],grantGoldenFruitPotion:()=>'',ITEMS:{},wardenRelicDrop:()=>false,
  seedTitle:{isUnlocked:()=>false,isAlwaysBeginnerUnlocked:()=>false,isJohanUnlocked:()=>false,isAustinClearUnlocked:()=>false,isAlwaysClearUnlocked:()=>false,isJohanClearUnlocked:()=>readDiscoveries(storage).bosses.includes('johanclear')},
  AUSTIN:{name:'Austin'},ALWAYS_BEGINNER:{name:'Always'},TEMPEST_CARRIER,JOHAN_TITLE:'Johan',JOHAN_VETERAN_TITLE:'Johan veteran',JOHAN_CLEAR_TITLE:'폭풍 완주',CLEAR_ALL_STATS:.01,
  activeGauge:{value:0,cooldown:0},ACTIVE:{cooldownSeconds:8},guideTarget:null,runDamageTaken:0,runDashes:0,saveOK:false,bossFightDamage0:0,roomCleared:false,exitOpen:false,skywayAdvance:0,
  dashState:{id:'twinsprout'},relicRewardPending:false,dashRewardPending:false,skywaySupplyClaimed:false,chosen:new Set(),mutated:new Set(),levels:new Map(),heldForms:new Map(),inventory:{tonic:2},runBonuses:{},relics:{equipped:null,stored:[]},
  playerName:'검사',ACT,clearForms:noop,clearBonus,formatScore,formatTime,escapeHtml,CLEAR_BONUS,harvestFromRun:()=>({growth:0}),garden:{},growPlants:x=>x,addHarvest:x=>x,writeGarden:noop,refreshGardenEffects:noop,treeWater:noop,
  lastName:()=>'',buildRecord:()=>null,submitScore:(_s,e)=>rankings.push(copy(e)),accountRole:()=>({isAdmin:false,isTester:true}),adminMode:false,betaTesterMode:true,rankingDecision:()=>({eligible:true}),paceTrusted:()=>true,
  online:{flush:async()=>{},submit:async e=>{rankings.push({...copy(e),remoteAdapter:true});return {rank:1};},uid:()=> 'owner-A'},logRankingFailure:noop,setText:(e,s)=>e.textContent=s,SEASON:{name:'contract'},showRanking:noop,paceGame:0,paceReal:0,
 });
 c.pauseBuild.setSaveStatus=s=>saveStatuses.push(s);c.webTelemetry.playPause=async()=>{};
 f.$('#pause').focus=noop;
 for(const sel of ['#overlay','#rank-status','#expansion-rank-status'])f.$(sel).insertAdjacentHTML=noop;
 execute(c,'function protectJourneyBossReceipts(){','function remember(');
 execute(c,'function damageEnemy(e,','function updateFallen(');
 execute(c,'function inAustinRoom(){','const appShell=');
 execute(c,'function saveBoundary(','document.body.insertAdjacentHTML');
 execute(c,'function useExit(','\nconst '); // retain the canonical exit dispatcher only
 execute(c,'function showEnd(','// 점검 중 화면.');
 execute(c,'function saveExitLabel(){',"$('#save-exit').onclick=");
 execute(c,"$('#save-exit').onclick=",'// Separate challenge:');
 execute(c,'function togglePause(){',"window.addEventListener('keydown'");
 c.buildRecord=()=>null;
 return {c,storage,rankings,saveStatuses};
}

function simulateJohan(c){
 const e=createTempestCarrier(c.scene);e.g.position.set(0,0,-1.8);e.hp*=difficulty(c.cycle).bossHp;e.maxHp=e.hp;const maxHp=e.maxHp,phases=new Set(),moves=new Set();let time=0,bolts=0,summons=0;
 c.enemies=[e];
 const hooks={player:new THREE.Vector3(0,0,5.5),collide:noop,bolt:()=>bolts++,hit:noop,sound:noop,summon:types=>summons+=types.length};
 while(!e.dead&&time<90){time+=.05;c.elapsed+=.05;hooks.player.x=Math.sin(time*.85)*5.4;hooks.player.z=3+Math.cos(time*.65)*2;
  tickTempestCarrier(e,.05*difficulty(c.cycle).bossTempo*ACT3_PRESSURE.bossTempo,time,hooks);phases.add(e.phaseIndex);if(e.moveName)moves.add(e.moveName);
  c.damageEnemy(e,120,false,false,{kind:'synthetic-contract-hit'});
 }
 assert(e.dead&&e.hp<=0,'normal positive HP drained through canonical capped damage');assert.deepEqual([...phases],[0,1,2]);assert(bolts>0&&summons===4);
 const count=c.austinsDefeated,score=c.score,kills=c.kills;c.damageEnemy(e,120,false);assert.equal(c.austinsDefeated,count);assert.equal(c.score,score);assert.equal(c.kills,kills,'dead actor never repeats death callback');
 return {seconds:+time.toFixed(2),maxHp,bolts,moves:[...moves],phases:[...phases]};
}

// Act3 canonical route: five regular rooms, one gatekeeper per journey, real
// Johan every fifth gatekeeper. Regular-room traversal is a state contract,
// not a simulated kill of every initial/reinforcement actor.
for(const scenario of ['legacy','v2','clear-write-fault','tombstone-write-fault','tombstone-silent-drop']){
 const epoch=scenario!=='legacy',fault=scenario.includes('fault')||scenario.includes('drop');
 const f=fixture(),{c,storage,rankings,saveStatuses}=prepare(f,{epoch});c.region='skyway';c.startRegion='skyway';c.runStorage=storage;c.actStore=()=>act3Storage(storage);c.currentJourneyRunId='act3-contract-'+scenario;
 let waves=0,actualBosses=0;c.wave=()=>{waves++;assert(roomFor(c.stage,c.cycle,'skyway'));c.roomCleared=false;c.enemies=[];assert(c.saveBoundary(c.stage,c.austinRoom?'austin':'entry'));};c.wave();
 for(let journey=0;journey<15;journey++){
  assert.equal(c.cycle,journey);assert.equal(c.stage,0);
  for(let room=0;room<4;room++){c.exitOpen=true;c.useExit(true);assert.equal(c.stage,room+1);}
  const gate=createAct3Warden(c.scene);c.enemies=[gate];c.damageEnemy(gate,gate.hp+1,false);assert(gate.dead);assert.equal(c.wardensDefeated,journey+1);assert.equal(c.austinsDefeated,actualBosses);assert.equal(c.runComplete(),false,'gatekeeper is not a final boss');
  c.relicRewardPending=false;c.exitOpen=true;c.useExit(true);
  if((journey+1)%5===0){
   assert(c.austinRoom);assert.equal(c.stage,4);assert(c.finalBossAhead()===false);
   const measure=simulateJohan(c);actualBosses++;assert.equal(c.austinsDefeated,actualBosses);assert.equal(readAccountProfile(storage).johanWins,actualBosses);
   const id=c.currentJourneyRunId;c.relicRewardPending=false;
   if(actualBosses<3){assert.equal(c.runComplete(),false);assert(c.saveAfterBoss());const saved=readCheckpoint(c.actStore());assert.equal(saved.austins,actualBosses);assert.equal(saved.wardens,(journey+1));assert.equal(saved.runId,id);assert(saved.hp>0&&saved.hp<=100);
    c.enemies=[];c.restart(copy(saved));assert.equal(c.currentJourneyRunId,id);assert.equal(c.austinsDefeated,actualBosses);assert.equal(c.cycle,journey+1);assert.equal(c.stage,0);
   }else{
    assert(c.runComplete());
    const beforeScore=c.score,beforeCheckpoint=JSON.stringify(readCheckpoint(c.actStore()));let rejectWrite=fault,tombstoneWrites=0;
    const set=storage.setItem.bind(storage);storage.setItem=(key,value)=>{
     const parsed=JSON.parse(value),isTitle=key==='seed-discoveries-v1'&&parsed.bosses?.includes('johanclear'),isTombstone=key.includes('checkpoint')&&parsed.cleared===true;
     if(rejectWrite&&(scenario==='clear-write-fault'?isTitle:isTombstone)){
      if(scenario==='tombstone-silent-drop')return;
      throw Error('injected completion '+scenario);
     }
     set(key,value);if(isTombstone)tombstoneWrites++;
    };
    assert.equal(c.completeRun(),!fault);
    if(fault){
     assert.equal(c.mode,'playing');assert.equal(c.paused,true);assert.equal(c.journeyCompletionPending,true);assert.equal(c.score,beforeScore);assert.equal(rankings.length,0);
     assert.equal(JSON.stringify(readCheckpoint(c.actStore())),beforeCheckpoint,'completion failure keeps the accepted boss entrance');assert.equal(tombstoneWrites,0);
     assert.match(f.$('#save-exit').textContent,/완주 저장 다시 확인/);assert.match(saveStatuses.at(-1),/보스 3회.*결과 정산/);assert.equal(f.$('#save-exit').disabled,false);
     assert.equal(readDiscoveries(storage).bosses.includes('johanclear'),scenario!=='clear-write-fault');
     await f.$('#save-exit').onclick();assert.equal(c.score,beforeScore);assert.equal(rankings.length,0);assert.equal(tombstoneWrites,0,'same visible button cannot finalize while storage still fails');
     c.togglePause();assert.equal(c.paused,true);assert.equal(c.journeyCompletionPending,true);assert.equal(c.score,beforeScore,'continue/key pause route also retries without resuming an unsettled victory');
     rejectWrite=false;await f.$('#save-exit').onclick();
     rows.push({regression:scenario,thirdBossReceipts:3,acceptedEntrancePreserved:true,visibleRetry:true,bonusOnce:true,rankingOnce:true});
    }
    assert.equal(c.mode,'dead');assert.equal(c.journeyCompletionPending,false);assert.equal(readCheckpoint(c.actStore()),null);assert.equal(tombstoneWrites,1);assert(readDiscoveries(storage).bosses.includes('johanclear'));assert.match(f.$('#overlay').innerHTML,/3회 격파.*완주/);
    assert.equal(c.score,beforeScore+clearBonus(c.elapsed),'clear bonus awarded exactly once after durable completion');
    const finalScore=c.score,finalData=JSON.stringify([...f.data]);assert.equal(c.completeRun(),true);await f.$('#save-exit').onclick();c.togglePause();
    assert.equal(c.score,finalScore);assert.equal(tombstoneWrites,1);assert.equal(JSON.stringify([...f.data]),finalData);assert.equal(readAccountProfile(storage).johanWins,3,'completion retries never add another boss victory');
   }
   rows.push({act:3,scenario,epoch:epoch?'synthetic-v2':'legacy',ordinal:actualBosses,...measure});
  }else{assert.equal(c.austinRoom,false);assert.equal(c.cycle,journey+1);}
 }
 await turn();await turn();assert.equal(rankings.filter(x=>!x.remoteAdapter).length,1);assert.equal(rankings.filter(x=>x.remoteAdapter).length,1);assert(rankings.every(x=>x.act===3&&x.done===true&&x.cycle===14&&x.build===null));
 if(epoch){const queue=createBossVictoryEventQueue({storage,ownerUid:'owner-A',epoch:'contract-epoch-09'});assert.deepEqual(queue.pending().map(x=>x.ordinal),[1,2,3]);}
 console.log('PASS Act3 normal-HP damage →15 gatekeepers→3 Johan wins; stable restore after1/2; duplicate damage; terminal local/remote mocked ranking; completion failure/retry exactly once.',{scenario,waves});
}

// Act4 runs the actual spawn, course-room exit, boss runtime, damage/death,
// durable completion, acknowledgement, lap heal, account resume and ranking.
for(const epoch of [false,true]){
 const f=fixture(),{c,storage,rankings}=prepare(f,{epoch});c.region='garden';c.runStorage=storage;
 execute(c,'function advancePublicExpansionLap(){','\nfor(const material');
 execute(c,'function spawnExpansionActor(','function updateExpansionCourse(');
 Object.assign(c,{...guardianRules,createWarden,safeArenaSpawn,creditJourneySignatureKill,expansionGuardianActor:null,journeySignature:null,journeyRoomLayoutState:null,levelPressure:()=>1,copiedEvolution:()=>null,qualityLevel:1,obstacles:[],mats:{amber:new THREE.MeshBasicMaterial({color:0xffcc55})},arena:{shape:'rect',halfWidth:140,halfDepth:9},collide:noop});
 const previousIsBoss=c.isBoss;c.isBoss=e=>e.type==='warden'||previousIsBoss(e);
 execute(c,'function spawnWardenAt(','\nfunction saveBoundary(');
 execute(c,'function spawnExpansionGuardian(','\nfunction tickExpansionActor(');
 assert(await c.startPublicExpansionJourney('crosswind'));await c.syncPublicExpansion();
 const runId=c.expansionEntry.id,receiptId=c.expansionPublicEntry.campaign.receiptRunId;
 for(let lap=0;lap<3;lap++){
  assert.equal(c.cycle,lap);
  for(let room=0;room<5;room++){
   assert.equal(c.expansionJourney.room,room);assert.equal(c.expansionPublicEntry.campaign.bossWins.crosswindKeeper,lap);
   const s=c.expansionJourney;c.player.position.set(s.course.origin.x,0,s.course.origin.z);let steps=0;
   while(!s.course.finishAnnounced&&steps++<2400){
    c.elapsed+=.05;c.player.position.x+=6.09*1.18*.05;
    const out=c.expansionApi.stepExpansionJourney(s,.05,{player:c.player.position,enemyCount:0,projectileCount:0,laneHalfDepth:9});
    for(const spec of out.spawns){const minion=c.spawnExpansionActor(spec);for(let hits=0;!minion.dead&&hits<200;hits++){c.elapsed+=.05;c.damageEnemy(minion,10,false,false,{kind:'synthetic-contract-hit'});}assert(minion.dead);}
    c.enemies=c.enemies.filter(e=>!e.dead);
   }
   assert(s.course.finishAnnounced);c.spawnExpansionGuardian();const gate=c.expansionGuardianActor;assert(gate?.expansionWarden&&gate.hp>0);
   for(let hits=0;!gate.dead&&hits<1000;hits++){c.elapsed+=.05;c.damageEnemy(gate,10,false,false,{kind:'synthetic-contract-hit'});}
   assert(gate.dead);assert.equal(s.guardians.cleared,room+1);assert.equal(c.wardensDefeated,lap*5+room+1);
   const beforeScore=c.score;c.enemyDown(gate);assert.equal(c.score,beforeScore);assert.equal(s.guardians.cleared,room+1);
   c.enemies=c.enemies.filter(e=>!e.dead);c.exitOpen=true;c.exitExpansionJourney();
  }
  assert.equal(c.expansionJourney.phase,'boss');assert(c.captureExpansionEntry());
  const e=c.spawnExpansionActor({position:{x:c.expansionJourney.course.distance+7,z:0}},true),maxHp=e.maxHp;assert.equal(maxHp,2400*difficulty(lap).bossHp);
  let time=0,bolts=0;const patterns=new Set();while(!e.dead&&time<90){time+=.05;c.elapsed+=.05;const out=stepExpansionBoss(c.expansionJourney.boss,.05,{position:e.g.position,player:{x:e.g.position.x-7,z:Math.sin(time)*3},hpRatio:e.hp/e.maxHp});e.state=out.state;bolts+=out.bolts.length;patterns.add(out.pattern);e.g.position.x+=out.move.x;e.g.position.z+=out.move.z;c.damageEnemy(e,10,false,false,{kind:'synthetic-contract-hit'});}
  assert(e.dead&&e.hp<=0&&bolts>0&&patterns.size===3);assert.equal(c.expansionPublicEntry.campaign.bossWins.crosswindKeeper,lap+1);assert.equal(readAccountProfile(storage).crosswindWins,lap+1);assert.equal(c.expansionPublicEntry.campaign.receiptRunId,receiptId);
  const before=c.score;c.damageEnemy(e,10,false);c.enemyDown(e);assert.equal(c.score,before);assert.equal(readAccountProfile(storage).crosswindWins,lap+1);
  await c.syncPublicExpansion();await c.releaseExpansionSaveLease();assert(await c.startPublicExpansionJourney('crosswind',{resume:true}));assert.equal(c.expansionEntry.id,runId);assert.equal(c.expansionPublicEntry.campaign.bossWins.crosswindKeeper,lap+1);assert.equal(c.expansionPublicEntry.campaign.bossCleared,true);
  c.exitOpen=true;c.exitExpansionJourney();if(lap<2){assert.equal(c.expansionJourney.room,0);assert.equal(c.cycle,lap+1);assert.equal(c.hp,100);}else{assert.equal(c.expansionJourney.phase,'finished');assert(f.getStore('crosswind').read().entry.ended);assert(readDiscoveries(storage).bosses.includes('crosswindclear'));assert.match(f.$('#overlay').innerHTML,/3회 격파.*완주/);}
  rows.push({act:4,epoch:epoch?'synthetic-v2':'legacy',ordinal:lap+1,maxHp,seconds:+time.toFixed(2),bolts,patterns:[...patterns]});
 }
 await turn();await turn();assert.equal(rankings.filter(x=>x.remoteAdapter).length,1);assert.equal(rankings[0].act,4);assert.equal(rankings[0].done,true);assert.equal(rankings[0].cycle,2);assert(validRun({...rankings[0],at:0},{acts:released.EXPANSION_ACTS}));
 if(epoch){const queue=createBossVictoryEventQueue({storage,ownerUid:'owner-A',epoch:'contract-epoch-09'});assert.deepEqual(queue.pending().map(x=>x.ordinal),[1,2,3]);}
 console.log('PASS Act4 normal-HP damage→3 canonical bosses; 5 rooms/lap; save/restore all cleared entrances; one terminal mocked ranking.',{epoch});
}

console.log(JSON.stringify({evidence:'renderless production-host contracts; finite synthetic hits; visual/input/difficulty/account network/device evidence not established',rows},null,2));
