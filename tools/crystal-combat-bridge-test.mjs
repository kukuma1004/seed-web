import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCrystalCombatBridge} from '../src/crystal-combat-bridge.js';
import {createExpansionCrystalWalls,checkpointExpansionCourse,restoreExpansionCourse,createExpansionCourse} from '../src/act-expansion-runtime.js';
import {createFormCombat} from '../src/form-combat.js';
import {DISCOVERY_FORMS,TWIN_FORMS} from '../src/forms.js';
const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z),copy=v=>JSON.parse(JSON.stringify(v));
const walls=createExpansionCrystalWalls(0),bridge=createCrystalCombatBridge(walls,{position:vec}),first=bridge.targets[0];
const original=first.g.position.clone(),reuse=[];
assert.equal(bridge.query(vec(walls[0].x+.8,walls[0].z),.3,reuse),reuse);
assert(reuse.includes(first),'nearby query includes the edge of the physical AABB');
assert.equal(bridge.damage({},10),false,'ordinary actors cannot be redirected to wall damage');
assert.equal(bridge.damage(first,NaN),false);assert.equal(bridge.damage(first,-1),false);
assert(bridge.damage(first,20,{law:'burst'}));assert.equal(first.hp,90,'burst applies once, not once per adapter');
assert(bridge.damage(first,90));assert(first.dead&&walls[0].broken);assert(!bridge.query(original,1,reuse).includes(first));
assert.equal(bridge.damage(first,100),false,'broken terrain cannot feed repeated on-hit damage');
const actions=[{type:'regrow',id:first.id,hp:120}];
assert.equal(bridge.apply(actions,[{position:original,radius:.4}]),0,'player blocks regrowth');
assert.equal(bridge.apply(actions,[{g:{position:original},radius:.65}]),0,'ordinary enemy blocks regrowth too');
assert.equal(bridge.apply(actions,[{position:vec(10,10)}]),1);assert(!first.dead);assert.equal(first.hp,120);
assert.equal(bridge.targets[0],first,'break/regrow reuses the proxy and stable wall ID');
const moving=vec(0,walls[0].z);bridge.constrain(moving,.4,vec(-6,walls[0].z));assert(moving.x<original.x-.9,'actor sweep cannot tunnel through cover');
const shot=bridge.sweep(vec(-6,walls[0].z),vec(0,walls[0].z),{damage:5,law:'reflect'});assert(shot.reflected);assert.equal(first.hp,115);assert(shot.dir.x<0);
const broken=bridge.area(original,1,1000,'frost');assert(broken.some(h=>h.id===first.id&&h.broken));assert(first.dead);
const course=createExpansionCourse('crystalGorge',{room:1,seed:13}),savedBridge=createCrystalCombatBridge(course.walls,{position:vec});savedBridge.damage(savedBridge.targets[2],30);savedBridge.damage(savedBridge.targets[3],1000);
const restored=restoreExpansionCourse(copy(checkpointExpansionCourse(course))),restoredBridge=createCrystalCombatBridge(restored.walls,{position:vec});
assert.deepEqual(restoredBridge.targets.map(t=>[t.id,t.hp,t.dead]),savedBridge.targets.map(t=>[t.id,t.hp,t.dead]),'existing course checkpoint preserves terrain; no separate account key');
assert.throws(()=>createCrystalCombatBridge([...walls,walls[0]]));assert.throws(()=>createCrystalCombatBridge(Array(21).fill(walls[0])));

// Exercise the actual published attack engine, not a second terrain-only damage
// implementation. A defensive form may leave route opening to the basic attack.
const hitForms=new Set(),zeroForms=[],ids=Object.keys(DISCOVERY_FORMS);let instances=0,hits=0,peak=0;
assert.equal(ids.length,153);
for(const id of ids){let formHits=0;
 for(const part of TWIN_FORMS[id]?.parts||[id]){
  instances++;const localWalls=createExpansionCrystalWalls(4);for(const w of localWalls)w.hp=w.maxHp=1e9;
  const terrain=createCrystalCombatBridge(localWalls,{position:vec}),scene=new THREE.Scene(),player={position:vec(-1.4,-5)};
  const positions=terrain.targets.map(t=>t.g.position.clone());
  const hostile=Array.from({length:8},(_,i)=>({life:10,boss:true,ob:{position:vec(-1.4+Math.cos(i)*2,-5+Math.sin(i)*2)},dir:vec(-1)}));
  const combat=createFormCombat(scene,{player,enemies:()=>terrain.targets,nearby:(p,r,out)=>terrain.query(p,r,out),enemyShots:()=>hostile,
   hit(target,amount){assert(Number.isFinite(amount)&&amount>=0,`${id}: finite damage`);const ok=terrain.damage(target,amount);if(ok){hits++;formHits++;}return ok;},
   blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:{},renderless:true,motionSpeed:()=>1.3});
  combat.set(part,5,{twin:Boolean(TWIN_FORMS[id]),twinId:TWIN_FORMS[id]?id:null});let cooldown=0;
  for(let frame=0;frame<300;frame++){
   player.position.x=-3+Math.cos(frame*.027)*1.6;player.position.z=-5+Math.sin(frame*.027)*1.6;
   cooldown-=.04;if(cooldown<=0){const target=terrain.targets[0].g.position;cooldown=combat.fire(player.position,target.clone().sub(player.position).normalize(),target);}
   if(frame===80)combat.surge(2,{aim:vec(-1)});combat.update(.04);
   // Inspect BEFORE sync so a mistaken pull/knockback cannot be hidden by repair.
   for(let i=0;i<terrain.targets.length;i++)assert(terrain.targets[i].g.position.equals(positions[i]),`${id}: solid crystal cannot move under gravity/recall/ultimate`);
   peak=Math.max(peak,combat.state().bolts);assert(combat.state().bolts<=24,`${id}: shared projectile budget`);
  }
  combat.dispose();assert.equal(scene.children.length,0);
 }
 if(formHits)hitForms.add(id);else zeroForms.push(id);
}
for(const id of ['blastlance','frostnet','gravitystake','coldwell','prism','thunderlance','frostguard','fullbloom'])assert(hitForms.has(id),`${id}: real authored attacks damage wall proxies`);
// Opting terrain into immobility must not remove ordinary gravity gameplay.
for(const id of ['pullgarden','final-accretiondisk-orbit']){
 const scene=new THREE.Scene(),player={position:vec()},foes=['hound','turret','austin','expansion-boss'].map((type,i)=>({type,immovable:type==='expansion-boss',dead:false,hp:1e9,g:{position:vec(Math.cos(i*1.5)*1.5,Math.sin(i*1.5)*1.5),rotation:{y:0}}}));
 const before=foes.map(e=>e.g.position.clone());
 const combat=createFormCombat(scene,{player,enemies:()=>foes,hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:{},renderless:true});combat.set(id,5);
 for(let i=0;i<150;i++){if(i%20===0)combat.fire(player.position,vec(1),foes[0].g.position);if(i===40)combat.surge(2,{aim:vec(1)});combat.update(.04);}
 assert(!foes[0].g.position.equals(before[0]),`${id}: ordinary enemy can still be pulled`);
 for(let i=1;i<foes.length;i++)assert(foes[i].g.position.equals(before[i]),`${id}: old turret/boss and opted-in expansion boss stay fixed`);
 combat.dispose();
}
console.log(JSON.stringify({catalog:153,instances,hitForms:hitForms.size,zeroForms,hits,peakBolts:peak,checks:'canonical damage, no terrain motion, regrowth occupancy, swept collision, checkpoint, reused proxies; renderless only'}));
