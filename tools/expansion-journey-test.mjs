import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createExpansionJourney,advanceExpansionJourney,stepExpansionJourney,checkpointExpansionJourney,restoreExpansionJourney,createExpansionThreat,stepExpansionThreat,expansionContactHits,expansionFacing} from '../src/expansion-journey.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const player={x:0,z:0},session=createExpansionJourney('crosswind',0,413);
const spec={id:'test',type:'shooter',position:{x:6,z:0},hp:86,side:'front',speed:2.1,cooldown:1.7,bulletSpeed:5.2,damage:12,shots:1,windup:.7};
const threat=createExpansionThreat(spec);let time=0,total=0,lock=null;
while(time<2){const out=stepExpansionThreat(threat,.05,{player,projectiles:0});time+=.05;total+=out.bolts.length;if(threat.phase==='windup'&&!lock){lock={...threat.aim};player.z=3;}if(out.bolts.length){assert.deepEqual(out.bolts[0].dir,lock);assert(time>=1.35,'entry and locked shot warning are both real');}}
assert.equal(total,1);assert.equal(threat.phase,'recover');
const crowded=createExpansionThreat({...spec,shots:2});for(let i=0;i<100;i++)assert.equal(stepExpansionThreat(crowded,.1,{player:{x:0,z:0},projectiles:48}).bolts.length,0);
assert(['recover','approach','windup'].includes(crowded.phase),'a full projectile budget does not deadlock pacing');
const charger=createExpansionThreat({...spec,type:'charger',position:{x:2,z:0}});let contact;
for(let i=0;i<40&&!contact;i++)contact=stepExpansionThreat(charger,.1,{player:{x:0,z:0}}).contact;
assert(contact);assert(expansionContactHits({from:{x:-3,z:0},to:{x:3,z:0},radius:.7},{x:0,z:0}),'a fast crossing cannot skip contact');
assert(!expansionContactHits(contact,{x:0,z:6}));
const first=stepExpansionThreat(createExpansionThreat(spec),20,{player:{x:0,z:0}});assert.equal(first.bolts.length,0,'resume gap is clamped, not an instant catch-up volley');
for(let room=0;room<5;room++){
 assert.equal(session.room,room);const end=stepExpansionJourney(session,.1,{player:{x:200,z:0},enemyCount:0,projectileCount:0});assert(end.finish);assert.equal(end.spawns.length,0);
 const restored=restoreExpansionJourney(copy(checkpointExpansionJourney(session)));assert(restored);assert.deepEqual(checkpointExpansionJourney(restored),checkpointExpansionJourney(session));
 assert(advanceExpansionJourney(session));
}
assert.equal(session.phase,'boss');assert.equal(session.boss.id,'crosswindKeeper');
for(let i=0;i<20;i++)stepExpansionJourney(session,.1,{position:{x:95,z:0},player:{x:85,z:3},activeProjectiles:0,hpRatio:1});
const saved=copy(checkpointExpansionJourney(session)),resumed=restoreExpansionJourney(saved);assert(resumed);
for(let i=0;i<100;i++){const context={position:{x:95,z:0},player:{x:85,z:3},activeProjectiles:0,hpRatio:.4};assert.deepEqual(copy(stepExpansionJourney(resumed,.05,context)),copy(stepExpansionJourney(session,.05,context)));}
assert.equal(restoreExpansionJourney({...saved,room:2}),null,'a course from a different room cannot be transplanted');
assert.equal(restoreExpansionJourney({...saved,boss:{...saved.boss,id:'crystalGardener'}}),null);
assert.equal(restoreExpansionJourney({...saved,boss:null}),null);
assert.equal(restoreExpansionJourney({...saved,course:{...saved.course,version:999}}),null,'unknown nested version cannot silently restore a different room');
assert.equal(restoreExpansionJourney({...saved,boss:{...saved.boss,version:999}}),null);
assert.equal(restoreExpansionJourney(null),null);
for(const phase of ['windup','charge','tell','attack']){const model={phase,aim:{x:1,z:0}};assert.deepEqual(expansionFacing(model,{x:0,z:0},{x:0,z:4}),model.aim,'attack art preserves the lock after the target moves');}
assert.deepEqual(expansionFacing({phase:'recover'},{x:0,z:0},{x:0,z:4}),{x:0,z:1});
session.phase='finished';assert.equal(advanceExpansionJourney(session),false);assert.equal(stepExpansionJourney(session,.1,{}),null);
// Real production geometry transforms, independent of browser/GPU rendering.
const scene=new THREE.Scene(),texture=new THREE.Texture();let textureDisposed=false;texture.addEventListener('dispose',()=>{textureDisposed=true;});
const view=createExpansionJourneyView(scene,texture);assert.equal(view.root.visible,false);view.setActive(true);view.beginFrame();
view.tell({position:{x:0,z:0},dir:{x:1,z:0},length:6,width:.16});view.root.updateMatrixWorld(true);
const line=view.root.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.visible),box=new THREE.Box3().setFromObject(line);
assert(Math.abs(box.min.x)<.0001&&Math.abs(box.max.x-6)<.0001,'floor warning spans the actual six-unit firing lane');
assert(Math.abs(box.max.y-box.min.y)<.0001,'the warning is flat on the ground, not a vertical strip');
for(let n=0;n<100;n++)view.tell({position:{x:n,z:0}});
assert.equal(view.root.children.filter(o=>o.isMesh&&!o.isInstancedMesh&&o.visible).length,28,'warning pool stays capped');
view.beginFrame();assert.equal(view.root.children.filter(o=>o.isMesh&&!o.isInstancedMesh&&o.visible).length,0);
view.dispose();assert.equal(scene.children.length,0);assert.equal(textureDisposed,false,'shared floor texture survives leaving preview');texture.dispose();
console.log('Expansion journey: five horizontal courses -> boss, locked shot/entry, charge swept contact, caps, resume replay and malformed checkpoints passed. Browser play is separate.');
