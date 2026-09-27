import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFormCombat} from '../src/form-combat.js';
import {DISCOVERY_FORMS,TWIN_FORMS} from '../src/forms.js';

const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
function fixture(overrides={}){
 const scene=new THREE.Scene(),player={position:vec(2,3)},calls=[],effects=[];
 const foes=Array.from({length:14},(_,i)=>({type:i===13?'austin':'hound',g:{position:vec(2+Math.cos(i*.71)*(1.4+i*.28),3+Math.sin(i*.71)*(1.4+i*.28)),rotation:{y:0}},hp:1e9,dead:false,slow:0}));
 const hostile=Array.from({length:8},(_,i)=>({life:10,boss:i%3===0,ob:{position:vec(2+Math.cos(i)*2,3+Math.sin(i)*2)},dir:vec(-1)}));
 const vfx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(key=>[key,(...args)=>effects.push(key)]));
 const combat=createFormCombat(scene,{player,enemies:()=>foes,enemyShots:()=>hostile,hit(e,damage,meta){assert.ok(Number.isFinite(damage)&&damage>=0,`finite damage ${meta.evolution}`);calls.push({damage,...meta});return true;},blocked:()=>false,boundary(previous,next,dir){if(Math.abs(next.x-2)>8){dir.x*=-1;next.x=Math.max(-6,Math.min(10,next.x));return true;}if(Math.abs(next.z-3)>8){dir.z*=-1;next.z=Math.max(-5,Math.min(11,next.z));return true;}return false;},constrain(){},vfx,renderless:true,...overrides});
 return {scene,player,foes,hostile,combat,calls,effects};
}

const originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(){throw new Error('renderless simulation attempted a texture load');};
const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
Object.defineProperty(globalThis,'document',{configurable:true,get(){throw new Error('renderless simulation touched document');}});
let totalHits=0,totalBodies=0,instances=0,peakBolts=0;
try{
 const geometryId=new THREE.BufferGeometry().id,materialId=new THREE.Material().id;
 const ids=Object.keys(DISCOVERY_FORMS);assert.equal(ids.length,153,'exercise the complete currently published evolution catalog');
 for(const id of ids){
  const parts=TWIN_FORMS[id]?.parts||[id],runs=parts.map(part=>{
   const f=fixture({camera:{quaternion:new THREE.Quaternion()},motionSpeed:()=>1.3});
   f.combat.set(part,5,{twin:Boolean(TWIN_FORMS[id]),twinId:TWIN_FORMS[id]?id:null,openingDelay:.4});instances++;return {...f,cooldown:0};
  });
  let formHits=0;
  for(let frame=0;frame<480;frame++)for(const f of runs){
   const dt=1/40;f.player.position.x=2+Math.sin(frame*.023)*.8;f.player.position.z=3+Math.cos(frame*.017)*.6;
   f.cooldown-=dt;
   if(f.cooldown<=0){const target=f.foes[0].g.position;f.cooldown=f.combat.fire(f.player.position,target.clone().sub(f.player.position).normalize(),target);assert.ok(f.cooldown===Infinity||Number.isFinite(f.cooldown),`${id} cadence`);}
   if(frame===120)assert.ok(f.combat.surge(3,{aim:vec(1)}),`${id} authored surge available`);
   f.combat.update(dt);
   const state=f.combat.state();peakBolts=Math.max(peakBolts,state.bolts);assert.ok(state.bolts<=24,`${id} shared projectile cap, including surge and split`);
   assert.ok(state.final.shots<=20&&state.final.events<=24&&state.final.fields<=8,`${id} final-layer budgets`);
   assert.ok(state.embers<=24&&state.frostLines<=24&&state.gardens<=12,`${id} secondary effect budgets`);
   const bodies=f.combat.projectileBodies([]);totalBodies+=bodies.length;
   for(const body of bodies){assert.ok(body.ob.isObject3D,`${id} exported body uses Object3D`);assert.ok(!body.ob.isMesh&&!body.ob.material&&!body.ob.geometry,`${id} has no render resources`);assert.ok([body.ob.position.x,body.ob.position.y,body.ob.position.z,body.visualScale].every(Number.isFinite),`${id} finite visible coordinates`);assert.ok(Number.isInteger(body.spriteCell)&&body.spriteCell>=0&&body.spriteCell<12,`${id} atlas cell`);assert.equal(body.evolution,id);assert.equal(body.painted,true);}
   f.scene.traverse(ob=>assert.ok(!ob.isMesh&&!ob.material&&!ob.geometry,`${id} pure simulation scene`));
  }
  for(const f of runs){formHits+=f.calls.length;f.combat.setTheme('botanical');f.combat.clear();assert.equal(f.combat.projectileBodies([]).length,0,`${id} clear removes all exported bodies`);f.combat.dispose();assert.equal(f.scene.children.length,0,`${id} disposes simulation group`);}
  assert.ok(formHits>0,`${id} actual authored attacks deal damage`);totalHits+=formHits;
 }
 assert.equal(new THREE.BufferGeometry().id,geometryId+1,'all forms allocate zero geometries');
 assert.equal(new THREE.Material().id,materialId+1,'all forms allocate zero materials');

 // The opt-in path changes rendering and explicit budgets, not authored damage.
 // Compare contrasting projectile, hitscan, orbit, field and completed branches.
 for(const id of ['prism','thunderlance','frostguard','comethalo','gravitymirror','gravitystake','coldwell','final-mirrorguard-orbit']){
  const pair=[fixture({renderless:false}),fixture({maxBolts:128})];for(const f of pair)f.combat.set(id,3);
  for(let frame=0;frame<100;frame++)for(const f of pair){
   f.player.position.x=2+Math.sin(frame*.06);
   if(frame%15===0)f.combat.fire(f.player.position,vec(1),f.foes[0].g.position);
   if(frame===30)f.combat.surge(1,{aim:vec(1)});
   f.combat.update(.03);
  }
  const signature=f=>f.calls.map(({damage,kind,evolution,phase})=>({damage,kind,evolution,phase}));
  assert.deepEqual(signature(pair[1]),signature(pair[0]),`${id} rendering choice preserves authored hit sequence`);
  for(const f of pair)f.combat.dispose();
 }

 // Configured cap applies even when an opening bypasses its normal local cap.
 for(const id of ['prism','seedstorm','fullbloom','gravitymirror']){
  const f=fixture({maxBolts:2});f.combat.set(id,99);
  for(let i=0;i<80;i++){f.combat.fire(f.player.position,vec(1),null,true);f.combat.surge(1);f.combat.update(.01);assert.ok(f.combat.state().bolts<=2,`${id} explicit cap`);}
  f.combat.dispose();
 }
 // A rooted comet gains charge only when the host explicitly opts into windup.
 for(const [motionSpeed,expected] of [[undefined,false],[()=>null,false],[()=>1.3,true]]){
  const f=fixture({motionSpeed});f.combat.set('comethalo',1);let emitted=false;
  for(let i=0;i<400;i++){f.combat.update(.02);if(f.combat.projectileBodies([]).some(b=>b.kind==='comethalo'))emitted=true;}
  assert.equal(emitted,expected,'stationary comet honors explicit rooted windup');f.combat.dispose();
 }
 const orbit=fixture();orbit.combat.set('frostguard');orbit.combat.update(.01);const ring=orbit.combat.projectileBodies([]).filter(b=>b.kind==='orbit');assert.ok(ring.length>0);assert.ok(ring.every(b=>Math.hypot(b.ob.position.x-2,b.ob.position.z-3)<4),'orbit positions already include player world translation');orbit.combat.dispose();
 const lance=fixture();lance.combat.set('thunderlance');lance.combat.fire(lance.player.position,vec(1));assert.ok(lance.combat.projectileBodies([]).length>0,'hitscan picture available without camera or texture');lance.combat.dispose();
}finally{
 THREE.TextureLoader.prototype.load=originalLoad;
 if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
}
console.log(`Renderless combat: 153 evolutions, ${instances} attack instances including both twin parts; ${totalHits} authored hits, ${totalBodies} sampled bodies, peak ${peakBolts}/24 bolts; zero textures/materials/geometries.`);
