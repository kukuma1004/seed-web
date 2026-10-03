import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ALL_FORMS,formStats} from '../src/forms.js';
import {createFormCombat,PRISM_CHILD_FALLOFF} from '../src/form-combat.js';
import {createCrystalCombatBridge,traceCrystalProjectile} from '../src/crystal-combat-bridge.js';
const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
function fixture(id){
 const scene=new THREE.Scene(),player={position:vec()},walls=[-3,3].map((x,i)=>({id:`wall-${i}`,x,z:0,w:1.2,d:40,hp:1e7,maxHp:1e7,broken:false}));
 const terrain=createCrystalCombatBridge(walls,{position:vec}),foe={type:'hound',dead:false,hp:1e7,g:{position:vec(6),rotation:{y:0}}};
 const contacts=[],proxyHits=[],reflections=[],explosions=[],pulsePositions=[];
 const vfx=new Proxy({reflect:p=>reflections.push(p.clone()),explosion:p=>explosions.push(p.clone()),pulse:p=>pulsePositions.push(p.clone())},{get:(o,k)=>o[k]||(()=>{})});
 const combat=createFormCombat(scene,{player,enemies:()=>[foe,...terrain.targets],nearby:(p,r,out)=>{terrain.query(p,r,out);if(p.distanceTo(foe.g.position)<r)out.push(foe);return out;},
  hit(e,damage,meta){if(e.terrain){proxyHits.push(meta);return terrain.damage(e,damage);}foe.hp-=damage;return true;},
  traceTerrain(shot,from,to,dir,meta){
   const result=traceCrystalProjectile(terrain,shot,from,to,{damage:meta.damage,laws:ALL_FORMS[meta.kind].requires,bounces:0,maxBounces:meta.remainingBounces});
   for(const h of result.hits)contacts.push({...h,gen:shot.gen,bounces:shot.bounces,damageRequested:meta.damage,remaining:meta.remainingBounces});
   return result;
  },
  reflector(a,b){assert.equal(terrain.sweep(a,b,{damage:0}).hits.length,0,'traced cover cannot also run through legacy reflector');return false;},
  blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx,renderless:true});
 combat.set(id,5);combat.fire(vec(),vec(1),vec(6));return {scene,combat,walls,foe,terrain,contacts,proxyHits,reflections,explosions,pulsePositions,stats:formStats(id,5)};
}

const gravity=fixture('gravitymirror');
for(let i=0;i<160;i++)gravity.combat.update(.025);
assert.equal(gravity.contacts.length,gravity.stats.bounces,'gravity lens terminates and detonates at its authored rebound count');
assert.equal(gravity.reflections.length,gravity.stats.bounces-1);assert.equal(gravity.explosions.length,1);
assert(gravity.pulsePositions.length>=gravity.stats.bounces);assert.equal(gravity.foe.hp,1e7);
assert(gravity.proxyHits.every(meta=>meta.indirect),'only the separate compression blast may hit wall proxies');
assert.equal(gravity.combat.state().bolts,0);

const mirror=fixture('mirrormaze');let peakSpeed=0;
for(let i=0;i<160;i++){mirror.combat.update(.025);for(const b of mirror.combat.projectileBodies([]))peakSpeed=Math.max(peakSpeed,b.speed||0);}
assert.equal(mirror.reflections.length,mirror.stats.bounces);assert.equal(mirror.contacts.length,mirror.stats.bounces+1);
assert.equal(mirror.contacts.at(-1).remaining,0,'exhausted reflection budget stops the last contact');
assert(mirror.contacts[2].damage>mirror.contacts[0].damage,'repeat wall contacts preserve the lens damage ramp');
assert(peakSpeed>mirror.stats.speed&&peakSpeed<=24,'authored acceleration retains its speed cap');
assert.equal(mirror.proxyHits.length,0);assert.equal(mirror.foe.hp,1e7);assert.equal(mirror.combat.state().bolts,0);

const prism=fixture('prism');let peak=0,maxGen=0;
for(let i=0;i<200;i++){
 prism.combat.update(.025);const bodies=prism.combat.projectileBodies([]);peak=Math.max(peak,bodies.length);
 for(const b of bodies){maxGen=Math.max(maxGen,b.gen);assert(Math.abs(b.ob.position.x)<2.301,'shards stay on the incident side of solid cover');}
}
assert(maxGen>0&&maxGen<=prism.stats.generations);assert(peak>1&&peak<=24);
assert(prism.contacts.some(h=>h.gen>0),'wall-born child shards use the same physical terrain path');
for(const h of prism.contacts)assert(Math.abs(h.damageRequested-prism.stats.damage*Math.pow(PRISM_CHILD_FALLOFF.base,h.gen))<1e-8,'generation damage falloff is preserved');
assert.equal(prism.proxyHits.length,0);assert.equal(prism.foe.hp,1e7);assert.equal(prism.combat.state().bolts,0);
for(const f of [gravity,mirror,prism]){assert(f.terrain.targets.every(t=>Math.abs(t.g.position.x)===3));f.combat.dispose();assert.equal(f.scene.children.length,0);}
console.log(JSON.stringify({families:3,gravityContacts:gravity.contacts.length,mirrorContacts:mirror.contacts.length,prismContacts:prism.contacts.length,peakPrism:peak,maxGeneration:maxGen,checks:'finite rebound/detonation, accelerated mirror, bounded split generations/falloff, no double reflector/proxy, no behind-cover damage and disposal; renderless only'}));
