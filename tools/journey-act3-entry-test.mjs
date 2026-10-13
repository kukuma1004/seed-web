import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {act3EntryPoint,act3ReinforcementSpawn,SKYWAY_ROOMS,ACT3_ARENA} from '../src/act3.js';
import {createAct3Minion,tickAct3Minion,ACT3_ART,ACT3_MATERIALS} from '../src/act3-enemies.js';
import {constrainToArena,insideArena} from '../src/arena.js';
for(const player of [{x:0,z:5.5},{x:0,z:0},{x:-8,z:0},{x:8,z:5.7}])for(let i=0;i<84;i++){
 const raw=act3ReinforcementSpawn(i),p=act3EntryPoint(raw.x,raw.z,player);assert(insideArena(p,.52,ACT3_ARENA));assert(Math.hypot(p.x-player.x,p.z-player.z)>=3.4);
}
assert.deepEqual(act3EntryPoint(-7,-1.8,{x:0,z:5.5}),{x:-7,z:-1.8},'authored flank is not moved to the roof');
const scene=new THREE.Scene(),player=new THREE.Vector3(0,0,5.5);
function firstTell(legacy){const e=createAct3Minion(scene,'sky-scout',()=>.25),entry=legacy?{x:-4.8,z:-8.05}:act3EntryPoint(-4.8,-3.9,player);e.home.set(-4.8,0,-3.9);e.homeReady=true;e.g.position.set(entry.x,0,entry.z);let t=0,shots=0,hits=0;const ctx={player,collide:(p,r)=>constrainToArena(p,r,ACT3_ARENA),hit:()=>hits++,bolt:()=>shots++};while(e.state!=='tell'&&t<8){tickAct3Minion(e,.02,t,ctx);t+=.02;if(t<.46)assert.equal(shots+hits,0,'entry pause precedes actual attack');}assert.equal(e.state,'tell');return {e,t};}
const nearby=firstTell(false),roof=firstTell(true);assert(nearby.t<roof.t-.3,'close entry yields a real earlier decision');
const e=nearby.e;e.state='recover';e.timer=.6;tickAct3Minion(e,.02,1,{player,collide(){},hit(){},bolt(){}});assert(e.tell.visible&&e.tell.material===ACT3_MATERIALS.opening);e.state='stalk';e.timer=1;tickAct3Minion(e,.02,2,{player,collide(){},hit(){},bolt(){}});assert(!e.tell.visible&&e.tell.material===ACT3_MATERIALS.warning);
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),host=main.split(/\r?\n/).find(line=>line.trim().startsWith('function spawnAct3('));let attached=0;
const context={THREE,scene,player:{position:player},createAct3Minion,ACT3_ART,act3EntryPoint,rng:()=>.25,survivalSession:null,mirrorSession:null,qualityLevel:1,camera:{},release(){},enemies:[],attachActorArt(){attached++;}};vm.createContext(context);vm.runInContext(host,context);const actor=context.spawnAct3('sky-scout',-7,-1.8);assert.equal(actor.g.position.z,-1.8);assert.equal(attached,1);context.survivalSession={};assert.equal(context.spawnAct3('sky-scout',-7,-1.8).g.position.z,-8.05,'shared Survival entry is unchanged');
assert(main.includes("if(e.state==='recover'&&!e.expansionBoss)amount*=1.35"),'green opening represents the existing real counter damage rule');
assert(SKYWAY_ROOMS[0].hint.includes('피해 +35%'));
console.log(`Act3 entry PASS: actual near tell ${nearby.t.toFixed(2)}s vs roof ${roof.t.toFixed(2)}s, safe front/flank entries, original entry pause, green real recovery window, shipping host and shared-mode isolation. CPU/host, not native proof.`);
