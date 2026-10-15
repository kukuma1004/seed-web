import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as THREE from 'three';
import {fixture,source,released as releasedRules} from './expansion-public-host-test.mjs';
import {createExpansionJourney,advanceExpansionJourney,createExpansionThreat} from '../src/expansion-journey.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {stepCrystalSiege} from '../src/crystal-siege-rules.js';
import {freshExpansionObjective} from '../src/expansion-objective.js';
import {readAccountProfile} from '../src/account-profile.js';

const fn=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf('\nfunction '+next+'(',source.indexOf('function '+name+'(')));
const tailStart=source.indexOf('if(expansionTerrainDirty)syncExpansionCrystals();enemies=enemies.filter'),tailEnd=source.indexOf('\nif(!mirrorSession',tailStart);
assert(tailStart>0&&tailEnd>tailStart);const roomEnd=source.slice(tailStart,tailEnd);
async function host(act,{save=true}={}){
 const f=fixture({acts:{...releasedRules,freshExpansionObjective}}),c=f.c;c.prepareCrystalSiegeView=async()=>true;assert(await c.startPublicExpansionJourney(act));await c.syncPublicExpansion();
 const j=createExpansionJourney(act,4,413,{siege:act==='crystalGorge',objective:freshExpansionObjective(act)});if(j.siege){for(let i=0;i<2000&&j.siege.phase!=='clear';i++)stepCrystalSiege(j.siege,.1,{player:{x:4,z:4},enemies:[]});assert.equal(j.siege.phase,'clear');}assert(advanceExpansionJourney(j));c.expansionJourney=j;c.stage=4;assert(c.captureExpansionEntry());
 const released=[],audio=[],sounds=[],charges=[],positions=new THREE.Scene();
 const actor=(fields)=>{const g=new THREE.Group();positions.add(g);return {g,hp:100,maxHp:100,dead:false,expansionActor:true,...fields};};
 const boss=actor({hp:2400,maxHp:2400,expansionBoss:true,expansionMotion:j.boss,config:{name:act==='crosswind'?'횡풍의 수호자':'수정의 정원사'}});
 const guard=actor({siegeGuard:true,expansionThreat:createExpansionThreat({id:'last-guard',type:'charger',position:{x:0,z:0},hp:100,speed:1.6,damage:7,shots:1,windup:1,cooldown:1,bulletSpeed:5})});
 const shot={ob:new THREE.Object3D(),life:3,damage:24};positions.add(shot.ob);c.enemies=[boss,guard];c.enemyShots=[shot];c.kills=165;c.choiceKills=12;c.score=3300;c.invuln=0;c.crowdLeft=0;c.roomCleared=c.exitOpen=false;c.mode='playing';
 Object.assign(c,{elapsed:300,isBoss:e=>Boolean(e.expansionBoss),chargeActive:(_g,n)=>charges.push(n),bossCharge:()=>11,killCharge:()=>7,combatAnalysis:{damage(){},utility(){},kill(){}},
  vfx:{impact(){}},releaseEnemy(e){released.push(e);e.g.removeFromParent();},release(ob){ob.removeFromParent();},gate:{visible:false,position:new THREE.Vector3()},
  expansionTerrain:null,expansionTerrainDirty:false,arena:{},bossFalling:false,trainingSession:null,clearForms(){},roomPoints:()=>0,
  journeyCompletionPending:false,saveExitBusy:false,audio:{play:id=>sounds.push(id),setPaused:p=>audio.push(p)},webTelemetry:{playPause(){}},
  awardModeBoss:(mode,runId,boss,ordinal,practice,epoch)=>recordModeBossVictory(f.storage,{mode,runId,boss,ordinal,practice,bossEpoch:epoch}).saved,
  inAustinRoom:()=>true,journeyPresentationEnabled:()=>false});
 c.$('#pause').focus=()=>{};c.pauseBuild.setSaveStatus=text=>{c.saveStatus=text;};
 for(const [name,next] of [['damageEnemy','enemyDown'],['enemyDown','updateFallen'],['openExit','useExit']])vm.runInContext(fn(name,next),c);
 const pauseStart=source.indexOf('function togglePause(){'),pauseEnd=source.indexOf('\nwindow.addEventListener',pauseStart);vm.runInContext(source.slice(pauseStart,pauseEnd),c);
 if(!save)f.storage.fail=true;
 return {...f,c,j,boss,guard,shot,released,audio,sounds,charges,positions,clear(){vm.runInContext(roomEnd,c);}};
}
for(const act of ['crosswind','crystalGorge']){
 const h=await host(act);const key=act==='crosswind'?'crosswindWins':'crystalWins',core=h.j.siege?.core.hp;
 h.c.damageEnemy(h.boss,5000,false);
 assert(h.guard.dead&&h.guard.expansionSettled,'a genuinely defeated final boss retires its remaining guard without another kill');
 assert(!h.positions.children.includes(h.guard.g));assert.equal(h.c.enemyShots.length,0);assert(!h.shot.ob.parent);assert(h.c.invuln>=1.5);
 assert.equal(h.c.kills,166);assert.equal(h.c.choiceKills,13);assert.equal(h.c.score,9300);assert.equal(readAccountProfile(h.storage)[key],1,JSON.stringify({act,paused:h.c.paused,pending:!!h.c.expansionPendingBossCheckpoint,status:h.c.saveStatus,campaign:h.c.expansionPublicEntry.campaign}));
 assert.deepEqual(h.sounds.filter(x=>x==='bossDefeat'),['bossDefeat']);
 assert.deepEqual(h.charges,[11,7],'retiring a guard cannot charge the ultimate');
 h.clear();assert(h.c.roomCleared&&h.c.exitOpen);assert.equal(h.c.enemies.length,0);assert.equal(h.j.siege?.core.hp,core);
 const score=h.c.score,count=readAccountProfile(h.storage)[key];h.c.enemyDown(h.boss);h.c.enemyDown(h.guard);h.c.damageEnemy(h.guard,9999,false);h.clear();
 assert.equal(h.c.score,score);assert.equal(readAccountProfile(h.storage)[key],count);assert.equal(h.c.kills,166);assert.equal(h.sounds.filter(x=>x==='bossDefeat').length,1);
 await h.c.releaseExpansionSaveLease();
}
// Durable receipt failure still blocks travel and resume. A successful retry
// reopens this cleared encounter directly; no reload, new kill or double award.
for(const act of ['crosswind','crystalGorge']){
 const h=await host(act,{save:false}),key=act==='crosswind'?'crosswindWins':'crystalWins';h.c.damageEnemy(h.boss,5000,false);h.clear();
 assert(h.c.paused&&h.c.roomCleared&&!h.c.exitOpen);assert(h.c.expansionPendingBossCheckpoint);assert.equal(readAccountProfile(h.storage)[key],0);
 assert.equal(h.c.enemyShots.length,0);assert(h.guard.dead);assert(h.audio.includes(true),'save-error pause also suspends audio');
 h.c.togglePause();assert(h.c.paused&&!h.c.exitOpen);assert(h.c.saveStatus.includes('저장'));
 h.storage.fail=false;h.setOwner('another-owner');h.c.togglePause();assert(h.c.paused&&!h.c.exitOpen);assert.equal(readAccountProfile(h.storage)[key],0,'a retry cannot credit a switched account');h.setOwner('owner-A');
 h.storage.fail=false;h.c.togglePause();assert(!h.c.paused&&h.c.exitOpen);assert.equal(h.c.expansionPendingBossCheckpoint,null);assert.equal(readAccountProfile(h.storage)[key],1);assert.equal(h.audio.at(-1),false);
 assert.equal(h.c.kills,166);assert.equal(h.c.score,9300);await h.c.releaseExpansionSaveLease();
}
// Legitimate live-boss pauses must remain resumable before any victory exists.
{const h=await host('crosswind');h.c.paused=true;h.c.togglePause();assert(!h.c.paused);assert(!h.c.exitOpen);assert(!h.boss.dead&&!h.guard.dead);await h.c.releaseExpansionSaveLease();}
// Ordinary guard deaths do not clear the live boss's attack or retire peers.
{const h=await host('crystalGorge');h.c.damageEnemy(h.guard,500,false);assert(h.guard.dead&&!h.boss.dead);assert.equal(h.c.enemyShots.length,1);assert.equal(h.c.kills,165);assert.equal(h.c.choiceKills,12);assert.equal(h.c.score,3300);assert.equal(h.sounds.filter(x=>x==='bossDefeat').length,0);await h.c.releaseExpansionSaveLease();}
// A foreign/stale motion model cannot close this encounter's hazards.
{const h=await host('crosswind');h.boss.expansionMotion={...h.j.boss};h.c.damageEnemy(h.boss,5000,false);assert(!h.guard.dead);assert.equal(h.c.enemyShots.length,1);assert.equal(h.sounds.filter(x=>x==='bossDefeat').length,0);await h.c.releaseExpansionSaveLease();}
// Local inspection uses the same cleanup without promoting account progress.
{const h=await host('crystalGorge');h.c.expansionChannel='inspection';const before=JSON.stringify(h.getStore('crystalGorge').read());h.c.damageEnemy(h.boss,5000,false);h.clear();assert(h.guard.dead&&h.c.exitOpen);assert.equal(h.c.score,3320);assert.equal(readAccountProfile(h.storage).crystalWins,0);assert.equal(JSON.stringify(h.getStore('crystalGorge').read()),before);await h.c.releaseExpansionSaveLease();}
console.log('Journey boss handoff PASS: actual damage/death/room-end/open-exit/pause host with local canonical save stores; guard retirement without score/charge, hostile cleanup, once-only defeat, quota failure blocking and durable retry/resume. Explicit local store/UI adapters; not real browser or account play.');
