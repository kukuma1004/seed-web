import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AWAKEN_FORMS,ALL_FORMS} from '../src/forms.js';
import {FINAL_BRANCH_PATTERNS} from '../src/final-branch-patterns.js';
import {createFinalBranchCombat} from '../src/final-branch-combat.js';
import {createCrystalCombatBridge,traceCrystalProjectile} from '../src/crystal-combat-bridge.js';
const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
function fixture(id){
 const form=AWAKEN_FORMS[id],wall={id:'test-cover',x:3,z:0,w:1.2,d:10,hp:1e6,maxHp:1e6,broken:false};
 const terrain=createCrystalCombatBridge([wall],{position:vec}),foe={type:'hound',hp:1e6,g:{position:vec(6)},dead:false};
 const player={position:vec()},contacts=[],hits=[],reflections=[];
 const combat=createFinalBranchCombat({player,enemies:()=>[foe,...terrain.targets],
  deal(e,amount){hits.push({terrain:e.terrain,amount});if(e.terrain)return terrain.damage(e,amount);foe.hp-=amount;return true;},
  blocked:()=>false,boundary:()=>false,reflector:()=>{throw new Error('terrain trace already owns this surface');},
  fx:{reflect:()=>reflections.push(true)},
  traceTerrain(shot,from,to,dir,meta){
   if(shot.terrainReturning!==Boolean(shot.returning)){shot.crystalHits?.clear();shot.terrainReturning=Boolean(shot.returning);}
   const family=[...ALL_FORMS[meta.kind].requires,meta.finalLaw],laws=meta.ricochet?family.filter(law=>law!=='pierce'):family;
   const result=traceCrystalProjectile(terrain,shot,from,to,{damage:meta.damage,laws,bounces:0,maxBounces:meta.remainingBounces});
   for(const hit of result.hits)if(hit.damage>0)contacts.push(hit);
   assert(Number.isFinite(to.x)&&Number.isFinite(to.z)&&Number.isFinite(dir.x)&&Number.isFinite(dir.z));
   return result;
  }});
 combat.set(id,100,5,false,form.base);return {combat,wall,foe,player,contacts,hits,reflections};
}
const blocked=fixture('final-returnflare-burst');blocked.combat.onFire(vec(),vec(1),vec(6));
for(let i=0;i<45;i++)blocked.combat.update(.05);
assert.equal(blocked.contacts.length,1,'one ordinary shot contacts cover once');
assert.equal(blocked.foe.hp,1e6,'a blocked return shot cannot damage an enemy behind the cover');
assert(!blocked.hits.some(h=>h.terrain),'the traced contact cannot be dealt again via an enemy proxy');
assert.equal(blocked.combat.state().shots,0);

const reflected=fixture('final-refractlance-reflect');reflected.combat.onFire(vec(),vec(1),vec(6));
for(let i=0;i<10;i++)reflected.combat.update(.05);
assert.equal(reflected.reflections.length,1,'authored ricochet keeps reflection despite its root piercing law');
assert.equal(reflected.contacts.length,1);assert(!reflected.hits.some(h=>h.terrain));
const bodies=[];reflected.combat.visualShots(bodies,0);assert(bodies.some(b=>b.dir.x<0&&b.ob.position.x<2.3));
for(let i=0;i<50;i++)reflected.combat.update(.05);assert.equal(reflected.combat.state().shots,0);

const beam=fixture('final-icicle-pierce');beam.combat.onFire(vec(),vec(1),vec(6));
assert.equal(beam.contacts.length,1);assert(beam.foe.hp<1e6,'the real piercing sweep crosses cover');assert(!beam.hits.some(h=>h.terrain),'beam wall damage is not counted twice');

let traced=0,peak=0;
for(const id of Object.keys(FINAL_BRANCH_PATTERNS)){
 const f=fixture(id);
 for(let frame=0;frame<180;frame++){
  if(frame%18===0){f.combat.onFire(vec(),vec(1),vec(6));f.combat.onHit(f.foe);}
  f.combat.update(.05);const state=f.combat.state();peak=Math.max(peak,state.shots);
  assert(state.shots<=20&&state.events<=24&&state.fields<=8,id);
 }
 assert(f.wall.hp>=0&&Number.isFinite(f.wall.hp),id);traced+=f.contacts.length;f.combat.clear();assert.equal(f.combat.state().shots,0);
}
console.log(JSON.stringify({branches:Object.keys(FINAL_BRANCH_PATTERNS).length,traced,peak,checks:'real final-layer shots/sweeps, bounded ricochet, piercing, stop before rear enemy, no duplicate proxy hit; renderless only'}));
