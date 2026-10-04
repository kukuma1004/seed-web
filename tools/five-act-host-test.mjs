import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as expansionApi from '../src/expansion-journey.js';
import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {validSurvivalExpansionCheckpoint} from '../src/survival-expansion-save.js';
import {SURVIVAL,survivalAct,survivalScaling,survivalSpawn,createSurvivalSession,survivalEnemySpec,tickSurvivalRush} from '../src/survival-rules.js';
import {createSpatialIndex} from '../src/spatial-index.js';
import {constrainToArena} from '../src/arena.js';
import {ACT3_ART} from '../src/act3-enemies.js';
import {createCameraFeel} from '../src/camera-feel.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
function fn(name){const start=source.indexOf(`function ${name}(`),first=source.indexOf('\n',start),end=source.slice(start,first).endsWith('}')?first:source.indexOf('\n}',first)+2;assert(start>=0&&end>start,name);return source.slice(start,end);}
const forbidden=()=>{throw new Error('New boss fell through to an old boss implementation');};
const dom=new Map(),$=id=>{if(!dom.has(id))dom.set(id,{textContent:'',hidden:true,classList:{toggle(){}}});return dom.get(id);};
for(const act of [3,4]){
 const session=createSurvivalSession(413,{actCount:5});session.act=act;
 const tells=[],ctx=vm.createContext({THREE,V:THREE.Vector3,scene:new THREE.Scene(),SURVIVAL,survivalAct,survivalScaling,survivalSpawn,survivalEnemySpec,tickSurvivalRush,createSurvivalExpansion,expansionApi,ACT3_ART,constrainToArena,
  survivalSession:session,survivalExpansion:null,expansionJourney:null,expansionTerrain:null,expansionTerrainDirty:false,expansionJourneyView:{setActive(){},setCourse(){},setTerrainOnly(){},syncCrystals(){},tell:t=>tells.push(t)},
  camera:new THREE.PerspectiveCamera(),arena:SURVIVAL.arena,player:new THREE.Object3D(),enemies:[],enemyShots:[],obstacles:[],traps:[],clockFloor:null,shadowClock:0,SHADOW_REFRESH:1,
  arenaGroup:new THREE.Group(),roomCover:new THREE.Group(),trapGroup:new THREE.Group(),hiddenGarden:[],mirrorPanelsActive:false,
  stadium:{setActive(){}},skyway:{setActive(){}},mirrorPanels:{setActive(){}},survivalArt:{setReadability(){},setAct(){},setActive(){}},survivalComparisonEnabled:false,survivalReadability:true,
  LS:{frostFactor:.6},invuln:0,shellTime:0,hits:0,release(){},attachActorArt:e=>{e.artAttached=true;},attachBossActionRig(){},qualityLevel:0,enemyIndex:createSpatialIndex(2.5),separationEnemies:[],survivalRushes:0,survivalCue:new THREE.Vector3(),vfx:{pulse(){}},
  createAustin:forbidden,createAlwaysBeginner:forbidden,createTempestCarrier:forbidden,tickAustin:forbidden,tickAlwaysBeginner:forbidden,tickTempestCarrier:forbidden,
  skywayBolt:(p,d,s)=>ctx.enemyShots.push({position:p.clone(),dir:d.clone(),life:s.life||4,speed:s.speed}),hitPlayer:a=>{ctx.hits+=a;},audio:{setScene(){}},musicSceneFor:x=>x,$,
 });
 for(const name of ['syncExpansionCrystals','collide','drawRoom','spawnSurvivalEnemy','moveSurvivalEnemy','spawnSurvivalBoss','tickSurvivalBoss'])vm.runInContext(fn(name).replaceAll('import.meta.env.BASE_URL',"'/'"),ctx);
 ctx.drawRoom();assert(ctx.survivalExpansion);assert.equal(ctx.survivalExpansion.act,act);
 const boss=ctx.spawnSurvivalBoss();assert.equal(boss.type,act===3?'crosswindKeeper':'crystalGardener');assert(boss.artAttached&&boss.expansionBoss&&boss.survivalBoss);
 let maximum=0,spawned=0,states=new Set();
 for(let frame=0;frame<7200;frame++){
  tells.length=0;const before=ctx.enemyShots.length;ctx.tickSurvivalBoss(boss,1/60,frame/60);spawned+=Math.max(0,ctx.enemyShots.length-before);maximum=Math.max(maximum,ctx.enemyShots.length);states.add(boss.state);
  for(const q of ctx.enemyShots)q.life-=1/60;ctx.enemyShots=ctx.enemyShots.filter(q=>q.life>0);
  assert(Math.abs(boss.g.position.x)<=SURVIVAL.arena.halfWidth&&Math.abs(boss.g.position.z)<=SURVIVAL.arena.halfDepth);
  assert(validSurvivalExpansionCheckpoint(ctx.survivalExpansion.checkpoint(),act,session.lap),`invalid host save at Act${act+1}/frame${frame}: ${JSON.stringify(ctx.survivalExpansion.checkpoint())}`);
 }
 assert(spawned>50);assert(maximum<=48);assert(states.has('tell')&&states.has('attack')&&states.has('recover'));
 const state=ctx.survivalExpansion.checkpoint(),restored=createSurvivalExpansion(session,state);assert.deepEqual(restored.checkpoint(),state);
 if(act===4){const target=ctx.expansionTerrain.targets[0],hp=target.hp;assert(ctx.expansionTerrain.damage(target,10));assert(target.hp<hp);assert.equal(ctx.enemies.length,1,'crystal targets stay outside living enemies');
  const w=ctx.survivalExpansion.terrain[0],p=new THREE.Vector3(w.x-w.w/2-.8,0,w.z),next=new THREE.Vector3(w.x+2,0,w.z);ctx.collide(next,.4,p);assert(next.x<w.x,'actual player collision blocks crossing crystal cover');
  const crowd=ctx.spawnSurvivalEnemy({x:w.x,z:w.z,kind:'runner'});assert(Math.abs(crowd.g.position.x-w.x)>=w.w/2+crowd.radius||Math.abs(crowd.g.position.z-w.z)>=w.d/2+crowd.radius,'spawn never embeds a body inside cover');
  crowd.g.position.copy(p);Object.assign(crowd,{rushState:'rush',rushX:1,rushZ:0,rushTimer:.5});ctx.player.position.set(w.x+3,0,w.z);ctx.enemyIndex.rebuild(ctx.enemies);ctx.moveSurvivalEnemy(crowd,.1,.1,121);assert(crowd.g.position.x<w.x,'a rush cannot tunnel through crystal cover');}
 console.log(`Actual survival Act${act+1} host: ${spawned} boss projectiles, peak ${maximum}, three phases, valid replay and terrain collision passed (renderless).`);
}
const camera=createCameraFeel();let framed;for(let i=0;i<240;i++)framed=camera.follow(1/60,{playerX:5,followX:1,biasX:3});assert(Math.abs(framed.x-8)<.12);assert.equal(camera.follow(0,{biasX:Infinity}).zoom,1);
assert(source.includes("actCount:localInspection&&actCount===5?5:3"),'unvalidated defense expansion stays local');
assert(source.includes("if(fiveActs&&!expansionJourneyView)return prepareExpansionAssets()"));
console.log('Five-act host options remain inspection-only; horizontal look-ahead is camera-only. No browser, GPU, account or device claim.');
