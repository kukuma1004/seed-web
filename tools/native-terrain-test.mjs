import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ALL_FORMS} from '../src/forms.js';
import {createFormCombat} from '../src/form-combat.js';
import {createCrystalCombatBridge,traceCrystalProjectile} from '../src/crystal-combat-bridge.js';
const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
function fixture(id){
 const scene=new THREE.Scene(),player={position:vec()},wall={id:'cover',x:3,z:0,w:1.2,d:20,hp:1e6,maxHp:1e6,broken:false};
 const terrain=createCrystalCombatBridge([wall],{position:vec}),foe={type:'hound',dead:false,hp:1e6,g:{position:vec(6),rotation:{y:0}}};
 const contacts=[],hits=[],explosions=[];
 const vfx=new Proxy({explosion:p=>explosions.push(p.clone())},{get:(o,k)=>o[k]||(()=>{})});
 const combat=createFormCombat(scene,{player,enemies:()=>[foe,...terrain.targets],nearby:(p,r,out)=>{terrain.query(p,r,out);if(p.distanceTo(foe.g.position)<r)out.push(foe);return out;},
  hit(e,damage,meta){hits.push({terrain:e.terrain,damage,phase:meta.phase,kind:meta.kind});if(e.terrain)return terrain.damage(e,damage,{law:ALL_FORMS[meta.kind].requires.includes('burst')?'burst':null});foe.hp-=damage;return true;},
  traceTerrain(shot,from,to,dir,meta){
   if(shot.terrainReturning!==Boolean(shot.returning)){shot.crystalHits?.clear();shot.terrainReturning=Boolean(shot.returning);}
   const result=traceCrystalProjectile(terrain,shot,from,to,{damage:meta.damage,laws:ALL_FORMS[meta.kind].requires,bounces:0,maxBounces:meta.remainingBounces});
   for(const h of result.hits)contacts.push({...h,kind:meta.kind,position:to.clone()});return result;
  },
  blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx,renderless:true,motionSpeed:()=>1.3});
 combat.set(id,5);return {scene,combat,wall,terrain,foe,player,contacts,hits,explosions};
}
const blade=fixture('returnblade');blade.combat.fire(vec(),vec(1),vec(6));let returned=false,crossed=false;
for(let i=0;i<70;i++){
 blade.combat.update(.025);const bodies=blade.combat.projectileBodies([]);
 returned ||= bodies.some(b=>b.kind==='returnblade'&&b.returning);
 crossed ||= bodies.some(b=>b.kind==='returnblade'&&b.ob.position.x>3.7);
}
assert(returned&&crossed,'the actual recall+pierce recipe crosses cover before returning');assert.equal(blade.contacts.filter(h=>h.damage>0).length,2,'one wall hit per outward/return leg');assert(blade.foe.hp<1e6);
assert(!blade.hits.some(h=>h.terrain),'a traced blade must not hit the proxy a second time');blade.combat.dispose();

const petals=fixture('returningpetals');petals.combat.fire(vec(),vec(1),vec(6));let returnedPetals=false;
for(let i=0;i<80;i++){
 petals.combat.update(.025);const bodies=petals.combat.projectileBodies([]);returnedPetals ||= bodies.some(b=>b.kind==='returningpetal');
 assert(bodies.filter(b=>b.kind==='returningpetals').every(b=>b.ob.position.x<2.31));
}
assert(returnedPetals,'blocked carrier blooms into authored home-going petals');assert(petals.explosions.some(p=>Math.abs(p.x-2.3)<.02));
assert.equal(petals.foe.hp,1e6);assert(petals.wall.hp<1e6,'bloom area damage opens terrain');petals.combat.dispose();

const collapse=fixture('collapse');collapse.combat.fire(vec(),vec(1),vec(6));let planted=false;
for(let i=0;i<25;i++){collapse.combat.update(.025);planted ||= collapse.combat.state().wells>0;}
assert(planted);assert(collapse.contacts.length>0);assert(collapse.contacts.every(h=>h.damage===0),'planting preserves delayed field damage instead of inventing impact damage');
for(let i=0;i<160;i++)collapse.combat.update(.025);
assert(collapse.wall.hp<1e6);assert.equal(collapse.terrain.targets[0].g.position.x,3,'the planted gravity well cannot move its solid crystal');collapse.combat.dispose();

const comet=fixture('comethalo');
for(let i=0;i<180;i++)comet.combat.update(.025);
assert(comet.contacts.some(h=>h.damage>0&&h.kind==='comethalo'),'charged authored comet hits physical cover');
assert(comet.hits.some(h=>h.terrain&&h.phase==='corolla'),'the comet keeps its separate impact bloom');
assert(!comet.hits.some(h=>h.terrain&&h.phase==='comet'),'impact damage is not duplicated via the proxy');
assert(comet.explosions.length>0);assert(comet.combat.state().bolts<=24);comet.combat.dispose();
for(const f of [blade,petals,collapse,comet])assert.equal(f.scene.children.length,0);
console.log('Native terrain: piercing outward/return legs, carrier bloom/home petals, delayed planted gravity, charged comet impact+corolla, no duplicate contact and disposal passed; renderless only.');
