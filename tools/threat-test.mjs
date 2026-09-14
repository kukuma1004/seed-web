import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS,EXIT} from '../src/journey.js';
import {arenaFor,insideArena} from '../src/arena.js';
import {segmentHitsCover} from '../src/collision.js';
import {createTurret,tickTurret,turretSpots,copiedLaws,volleySpec,TURRET} from '../src/turret.js';
import {trapsFor,trapPhase,tickTrap,insideTrap,TRAP_TIMING,TRAP_DAMAGE,TRAP_SIZE} from '../src/traps.js';
import {createWarden,tickWarden,wardenVariantFor,WARDEN_VARIANTS,SEAL} from '../src/warden.js';
const V=THREE.Vector3;
const mat=new THREE.MeshBasicMaterial(),mats={enemy:mat,black:mat,armor:mat,amber:mat,dark:mat};
const START={x:0,z:5};

// Placement: turrets and traps sit inside the room, clear of cover, the seed's start and the exit.
for(const [stage,room] of ROOMS.entries()){
 const arena=arenaFor(stage);
 for(const cycle of [0,1]){
  for(const spot of turretSpots(stage,cycle)){
   assert.ok(insideArena(spot,.8,arena),`turret outside room ${stage}`);
   assert.equal(segmentHitsCover(spot,spot,room.covers,.8),false,`turret in cover, room ${stage}`);
   assert.ok(Math.hypot(spot.x-START.x,spot.z-START.z)>4.5);
   assert.ok(Math.hypot(spot.x-EXIT.x,spot.z-EXIT.z)>EXIT.radius+.8);
  }
  for(const trap of trapsFor(stage,cycle)){
   assert.ok(insideArena(trap,TRAP_SIZE/2+.2,arena),`trap outside room ${stage}`);
   assert.equal(segmentHitsCover(trap,trap,room.covers,TRAP_SIZE/2),false,`trap in cover, room ${stage}`);
   assert.equal(insideTrap(trap,START,.6),false);assert.equal(insideTrap(trap,{x:EXIT.x,z:EXIT.z},EXIT.radius),false);
  }
 }
}
assert.equal(trapsFor(0).length,0,'The first room teaches without traps');
assert.ok(turretSpots(3,0).length>=2&&turretSpots(3,1).length>turretSpots(3,0).length);

// Turrets copy the two strongest laws, earliest first on a tie.
assert.deepEqual(copiedLaws(new Map([['reflect',1],['split',3],['frost',3],['orbit',2]])),['split','frost']);
assert.deepEqual(copiedLaws(new Map([['chain',1]])),['chain']);assert.deepEqual(copiedLaws(new Map()),[]);
const spec=volleySpec(['split','reflect']);assert.equal(spec.count,3);assert.equal(spec.bounces,2);
for(const [law,key] of [['pierce','pierce'],['recall','recall'],['frost','frost'],['burst','burst'],['gravity','gravity'],['chain','strike'],['orbit','orbit']]){
 assert.equal(volleySpec([law])[key],true,law);assert.ok(!volleySpec([])[key]);
}

// A split+chain turret: telegraph first, then three bolts and a lightning strike on the marked spot.
const turret=createTurret(new THREE.Scene(),mats,['split','chain']);turret.g.position.set(0,0,-5);
let bolts=0,damage=0,telegraphed=false;const player=new V(0,0,0);
for(let i=0;i<200&&turret.volleys===0;i++){tickTurret(turret,.02,player,{fire:()=>bolts++,hurt:d=>{damage+=d;},strikeFx:()=>{}});if(turret.state==='tell')telegraphed=true;}
assert.ok(telegraphed,'Every volley is telegraphed');assert.equal(bolts,3);assert.equal(damage,TURRET.strikeDamage,'Standing on the marked spot is struck');
const dodger=createTurret(new THREE.Scene(),mats,['chain']);dodger.g.position.set(0,0,-5);damage=0;const moving=new V(0,0,0);
for(let i=0;i<200&&dodger.volleys===0;i++){if(dodger.state==='tell')moving.x=3;tickTurret(dodger,.02,moving,{fire(){},hurt:d=>{damage+=d;},strikeFx(){}});}
assert.equal(damage,0,'Moving out of the marked ring after the telegraph avoids the strike');
const ring=createTurret(new THREE.Scene(),mats,['orbit']);damage=0;
for(let i=0;i<400;i++)tickTurret(ring,.02,new V(TURRET.orbitRadius,0,0),{fire(){},hurt:d=>{damage+=d;},strikeFx(){}});
assert.ok(damage>=TURRET.orbitDamage,'Orbiting turret orbs hurt a seed standing on their path');

// Traps: warning always precedes spikes, each activation hits once, wardens and turrets are immune.
assert.equal(trapPhase(0).phase,'idle');assert.equal(trapPhase(TRAP_TIMING.idle+.01).phase,'warn');assert.equal(trapPhase(TRAP_TIMING.idle+TRAP_TIMING.warn+.01).phase,'active');
const trap={x:0,z:0,offset:0,hitPlayer:false,hitEnemies:new Set()};
const minion={type:'swarm',g:{position:new V(.2,0,.2)}},boss={type:'warden',g:{position:new V(0,0,0)}};
let playerHits=0,enemyHits=0;
for(let t=0;t<(TRAP_TIMING.idle+TRAP_TIMING.warn+TRAP_TIMING.active)*2;t+=.02)tickTrap(trap,t,{player:new V(0,0,0),enemies:[minion,boss],hurtPlayer:()=>{playerHits++;},hurtEnemy:(e)=>{enemyHits++;assert.equal(e,minion);}});
assert.equal(playerHits,2);assert.equal(enemyHits,2);
const dashing={...trap,hitPlayer:false,hitEnemies:new Set()};let refused=0;
for(let t=TRAP_TIMING.idle+TRAP_TIMING.warn;t<TRAP_TIMING.idle+TRAP_TIMING.warn+TRAP_TIMING.active;t+=.02)tickTrap(dashing,t,{player:new V(0,0,0),enemies:[],hurtPlayer:()=>{refused++;return false;},hurtEnemy(){}});
assert.ok(refused>1,'An invulnerable seed is checked again, not marked as already hit');
assert.ok(TRAP_DAMAGE.enemy>TRAP_DAMAGE.player,'Luring enemies onto plates pays off');

// Wardens: the rotation depends on the variant.
assert.deepEqual([0,1,2,3].map(wardenVariantFor),['memory','seal','hunter','memory']);
const seal=createWarden(new THREE.Scene(),mats,'seal');seal.pattern=1;seal.state='stalk';seal.timer=0;
const sealed=[];const stand=new V(1,0,3);
for(let i=0;i<120;i++){tickWarden(seal,.02,i*.02,stand,[],{collide(){},bolt(){},hit(){},burst(){},seal:(p,r)=>sealed.push({p,r})});if(seal.state==='tell')stand.x=1;}
assert.equal(sealed.length,1);assert.equal(sealed[0].r,SEAL.radius);assert.ok(sealed[0].p.distanceTo(new V(1,0,3))<1e-6,'The seal lands where the seed stood when the tell began');
const hunter=createWarden(new THREE.Scene(),mats,'hunter');hunter.state='stalk';hunter.timer=0;hunter.pattern=0;
let charges=0,previous=hunter.state;
for(let i=0;i<150;i++){tickWarden(hunter,.02,i*.02,new V(0,0,6),[],{collide(){},bolt(){},hit(){},burst(){}});if(hunter.state==='commit'&&previous!=='commit')charges++;if(hunter.state==='stalk'&&charges)break;previous=hunter.state;}
assert.equal(charges,2,'The hunter charges twice before recovering');
assert.ok(WARDEN_VARIANTS.hunter.chargeSpeed>WARDEN_VARIANTS.memory.chargeSpeed);
console.log('Threats: turret/trap placement, copied-law volleys, dodgeable strikes, trap immunity, seal and hunter wardens passed.');
