import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS,EXIT,rewardOptions,learnedLaws,canUseExit} from '../src/journey.js';
import {createWarden,tickWarden} from '../src/warden.js';
import {segmentHitsCover} from '../src/collision.js';
assert.equal(ROOMS.length,5);assert.equal(new Set(ROOMS.map(r=>JSON.stringify(r.covers))).size,5);
for(const room of ROOMS)for(const [type,x,z] of [...room.enemies,['player',0,5],['exit',EXIT.x,EXIT.z]])assert.equal(segmentHitsCover({x,z},{x,z},room.covers,type==='warden'?1:.65),false,`${room.name}: ${type} inside cover`);
assert.deepEqual(rewardOptions(0,[]),['reflect','split','chain']);assert.deepEqual(rewardOptions(2,['reflect','split']),['chain']);assert.deepEqual(rewardOptions(3,['reflect','split','chain']),['reflect','split','chain']);
assert.deepEqual(learnedLaws(66,100,['split','reflect','chain']),['split']);assert.deepEqual(learnedLaws(34,100,['split','reflect','chain']),['split','reflect']);
assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:0,z:-6}),true);
for(const extra of [{open:false},{paused:true},{mode:'evolving'},{x:8}])assert.equal(canUseExit({open:true,mode:'playing',paused:false,x:0,z:-6,...extra}),false);
const mat=new THREE.MeshBasicMaterial(),mats={enemy:mat,black:mat,armor:mat,amber:mat},boss=createWarden(new THREE.Scene(),mats),bolts=[];const seen=new Set(),origin=boss.g.position.clone();let damage=0;
boss.hp=250;
for(let i=0;i<1000;i++){tickWarden(boss,.02,i*.02,new THREE.Vector3(0,0,4),['split','reflect'],{collide:()=>{},bolt:(p,d,b)=>bolts.push({d,b}),hit:d=>damage+=d,burst:()=>{}});seen.add(boss.pattern%3);}
assert.equal(seen.size,3);assert.ok(boss.attacks>=3);assert.ok(boss.g.position.distanceTo(origin)>1);assert.ok(bolts.length>=7);assert.ok(bolts.every(b=>b.b===1));assert.equal(learnedLaws(1,100,['chain','reflect']).includes('chain'),true);
boss.g.position.set(0,0,0);boss.state='tell';boss.pattern=2;boss.timer=0;boss.hp=250;damage=0;
tickWarden(boss,.02,21,new THREE.Vector3(0,0,3),['chain','reflect'],{collide:()=>{},bolt:()=>{},hit:d=>damage+=d,burst:()=>{}});
assert.equal(damage,22,'Learned chain shock must reach the shown larger radius');assert.ok(boss.nova.scale.x>1.3);
console.log('Five layouts, safe spawns/exits, rewards/mutation, exit guards, moving three-pattern boss and learned projectiles passed.');
