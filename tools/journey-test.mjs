import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS,EXIT,rewardOptions,learnedLaws,canUseExit} from '../src/journey.js';
import {createWarden,tickWarden,FAN_SPACING,FAN_SHIFT} from '../src/warden.js';
import {segmentHitsCover} from '../src/collision.js';
import {FINAL_BOSS_CAP,FINAL_BOSS_EVERY,MAX_RUN_CYCLE,bossCapReached} from '../src/journey.js';
assert.equal(ROOMS.length,5);assert.equal(new Set(ROOMS.map(r=>JSON.stringify(r.covers))).size,5);
for(const room of ROOMS)for(const [type,x,z] of [...room.enemies,['player',0,5],['exit',EXIT.x,EXIT.z]])assert.equal(segmentHitsCover({x,z},{x,z},room.covers,type==='warden'?1:.65),false,`${room.name}: ${type} inside cover`);
assert.equal(rewardOptions(0,[]).length,3);assert.equal(new Set(rewardOptions(2,['reflect','split'])).size,3);assert.ok(rewardOptions(3,['reflect','split','chain']).every(id=>['reflect','split','chain'].includes(id)));
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

// One fan attack emits exactly three salvos and keeps the telegraph direction.
const fanBoss=createWarden(new THREE.Scene(),mats);fanBoss.state='tell';fanBoss.timer=0;fanBoss.dir.set(0,0,1);
let fanCount=0;for(let i=0;i<30;i++)tickWarden(fanBoss,.02,i*.02,new THREE.Vector3(0,0,4),[],{collide(){},bolt(){fanCount++;},hit(){},burst(){}});
assert.equal(fanCount,15,'Three five-bolt salvos per fan attack');
// Neighbouring bolts leave a lane wider than the seed (hit radius .6 each side) within five units.
{const gap=2*5*Math.sin(FAN_SPACING/2);assert.ok(gap>1.3,`fan lane ${gap.toFixed(2)} at distance 5`);assert.ok(FAN_SHIFT<FAN_SPACING/4,'salvos keep their lanes');}

// 2026-09-21: 한 판은 찐보스를 열 번 이기면 끝난다. 찐보스는 다섯 여정마다이니 마지막은 50번째 여정(cycle 49).
assert.equal(FINAL_BOSS_CAP,10);assert.equal(FINAL_BOSS_EVERY,5);assert.equal(MAX_RUN_CYCLE,49);
assert.equal(bossCapReached(9),false);assert.equal(bossCapReached(10),true);assert.equal(bossCapReached(27),true,'옛 저장처럼 이미 넘겼다면 다음 찐보스에서 끝');assert.equal(bossCapReached(undefined),false);
