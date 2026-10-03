import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {constrainToArena} from '../src/arena.js';
import {createExpansionCrystalWalls} from '../src/act-expansion-runtime.js';
import {createCrystalCombatBridge,traceCrystalProjectile} from '../src/crystal-combat-bridge.js';

// Run the actual host functions with real terrain/Vector3, while replacing UI,
// audio and account side effects. This is NOT a browser or device playtest.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
function hostFunction(name){
 const start=source.indexOf(`function ${name}(`);assert(start>=0,name);
 const firstEnd=source.indexOf('\n',start),line=source.slice(start,firstEnd);
 const end=line.endsWith('}')?firstEnd:source.indexOf('\n}',firstEnd)+2;
 assert(end>start,name);return source.slice(start,end);
}
const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z),walls=createExpansionCrystalWalls(0);
let allowEnemyEffects=false,enemyCharges=0;
const forbidden=()=>{if(!allowEnemyEffects)throw new Error('Terrain fed enemy/account effects');};
const context=vm.createContext({
 expansionTerrain:createCrystalCombatBridge(walls,{position:vec}),expansionApi:{traceCrystalProjectile},expansionTerrainDirty:false,
 player:{position:vec()},chosen:new Set(),levels:new Map(),bankedUpgrades:[],runBonuses:{},relics:{},
 LS:{reflectBounces:2,recallReturn:1.4,critDamage:2,orbitDamage:10},shotPierce:false,BASE_SHOT_DAMAGE:10,
 damageScale:()=>2,runPowerScale:()=>1,gardenPower:()=>1,relicFormScale:()=>1,
 FORMS:{test:{requires:['burst']}},vfx:{burst(){},impact(){},explosion(){}},audio:{play(){}},
 combatAnalysis:{damage:forbidden,utility:forbidden,kill:forbidden},twinResonance:forbidden,
 isBoss:e=>e.expansionBoss||e.type==='austin',chargeActive:()=>{forbidden();enemyCharges++;},bossCharge:()=>1,activeGauge:{},
 survivalSession:null,elapsed:0,enemies:[],cameraShake:0,finaleEchoes:[],
 arena:{shape:'rect',halfWidth:140,halfDepth:10},expansionJourney:{act:'crosswind',phase:'course',course:{distance:0}},
 obstacles:[],constrainToArena,orbitHits:new Map(),o:{position:vec(-3,-5)},
 expansionNearby:(p,r,out)=>context.expansionTerrain.query(p,r,out),nearbyEnemies:[],
});
for(const name of ['damageExpansionCrystal','applyLawHit','formHit','damageEnemy','overdriveBlast','traceExpansionShot','collide'])vm.runInContext(hostFunction(name),context);
const target=context.expansionTerrain.targets[0];
context.formHit(target,10,{kind:'test'});assert.equal(walls[0].hp,90,'scaled native form + explosion affinity applied once');
context.chosen.add('burst');context.applyLawHit(target,10);assert.equal(walls[0].hp,75);
context.damageEnemy(target,10,false,false);assert.equal(walls[0].hp,65);assert.equal(enemyCharges,0);
context.player.position.copy(target.g.position);context.overdriveBlast({hits:2,tags:['EXPLOSION']},.2,5,false);
assert.equal(walls[0].hp,42.5,'ultimate hits retain real scaling and burst bonus, without kill rewards');

// The actual orbit host must not displace a proxy between petals and the next
// sync. A repair at frame end would hide this defect from engine-only tests.
const orbitLine=source.split('\n').find(line=>line.includes('for(const e of expansionNearby(o.position,1.5,'));assert(orbitLine);
const before=target.g.position.clone();vm.runInContext(orbitLine,context);
assert(target.g.position.equals(before));assert.equal(walls[0].hp,27.5);assert.equal(enemyCharges,0);

// An inherited piercing law is stored outside chosen after fusion; the host
// must include it when sweeping the base projectile against cover.
context.chosen.clear();context.shotPierce=true;
const shot={dir:vec(1),life:1,bounces:0},next=vec(0,-5);
assert.equal(context.traceExpansionShot(shot,vec(-6,-5),next),false);assert.equal(walls[0].hp,7.5);
next.set(0,0,-5);context.traceExpansionShot(shot,vec(-3.2,-5),next);assert.equal(walls[0].hp,7.5,'same projectile leg cannot farm repeated wall damage');

// Real host scaling must not multiply the new core bonus by the old generic
// recover bonus. Existing bosses still get their ordinary recovery modifier.
allowEnemyEffects=true;
const boss={type:'expansion-boss',expansionBoss:true,state:'recover',takenScale:1.3,hp:1000,maxHp:1000,g:{position:vec()}};
context.damageEnemy(boss,100,false);assert.equal(boss.hp,870);assert.equal(enemyCharges,1);
const ordinary={type:'caster',state:'recover',hp:1000,g:{position:vec()}};
context.damageEnemy(ordinary,100,false);assert.equal(ordinary.hp,865);

// Rear entries retain their actual warning position, while the player remains
// on the route. Fast player movement collides with the canonical crystal AABB.
const rear=vec(-11);context.expansionTerrain=null;context.collide(rear,.65,rear.clone());assert.equal(rear.x,-11);
context.player.position.set(-1,0,0);context.collide(context.player.position);assert.equal(context.player.position.x,0);
context.expansionTerrain=createCrystalCombatBridge(createExpansionCrystalWalls(0),{position:vec});context.expansionJourney.act='crystalGorge';
context.player.position.set(0,0,-5);context.collide(context.player.position,.4,vec(-6,-5));assert(context.player.position.x<-3.9);
console.log('Actual main host: terrain has no kill/charge/account effects, orbit immobility, inherited piercing, single core multiplier, rear entry and dash collision passed; renderless only.');
