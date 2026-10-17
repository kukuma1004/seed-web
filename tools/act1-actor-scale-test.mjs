import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as THREE from 'three';
import {journeyActorArt,JOURNEY_ACT1_HEIGHT as H,ARBOR_ACT1_BOSS_SIZE} from '../src/journey-actor-scale.js';
import {journeyPlayerScale} from '../src/journey-player-presentation.js';
import {ACT2_ART} from '../src/act2-enemies.js';
import {ACT2_WARDEN_ART} from '../src/act2-wardens.js';
import {ACT3_ART} from '../src/act3-enemies.js';
import {expansionActorArt,expansionEnemyArt} from '../src/expansion-actor-art.js';
const fixture=JSON.parse(readFileSync('tools/act1-actor-alpha-fixture.json','utf8'));
for(const row of fixture.rows)assert.equal(createHash('sha256').update(readFileSync('public/assets/'+row.file)).digest('hex'),row.sha256,'alpha measurement source must match the shipping original');
const measured=(file,frame=0)=>fixture.rows.find(r=>r.file.split('/').at(-1)===file)?.frames[frame];
const eq=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} != ${b}`);
// Targets are independently calculated from original Act 1 source bounds and
// its actual live root/body scales, not the new helper's own profile records.
eq(H.hound,1.75*1.3*measured('enemy-hound-v4.webp').heightRatio);
eq(H.caster,2.2*1.22*measured('enemy-caster-v4.webp').heightRatio);
eq(H.warden,4.1*measured('warden-memory-v4.png').heightRatio);
eq(H.boss,4.3*1.2*measured('boss-austin-v1.png').heightRatio);
eq(H.turret,3*measured('enemy-turret-v4.webp').heightRatio);
let roles=0;
function check(actor,art,file,frame,target){
 const g=actor.g||new THREE.Group();actor={...actor,g};
 const before={hp:actor.hp,radius:actor.radius,state:actor.state,gScale:g.scale.toArray()};
 const normalized=journeyActorArt(actor,art),body=actor.body||actor.motion?.body||g;
 const parent=g.scale.y*(body!==g?body.scale.y:1);
 eq(normalized.size*parent*measured(file,frame).heightRatio,target);
 assert.deepEqual({...normalized,size:art.size},art,'only art size changes, preserving baseline, pose function, facing and lighting');
 assert.deepEqual({hp:actor.hp,radius:actor.radius,state:actor.state,gScale:g.scale.toArray()},before,'no gameplay or root scaling mutation');
 for(let pose=0;pose<8;pose++){actor.state=pose%2?'attack':'recover';if(actor.expansionThreat)actor.expansionThreat.phase=actor.state;assert.equal(journeyActorArt(actor,art).size,normalized.size,'action changes must not pump body scale');}
 roles++;
}
for(const [type,target] of Object.entries({catcher:H.shield,pitcher:H.caster,runner:H.hound,batter:H.caster}))check({type,hp:85,radius:.65},ACT2_ART[type],ACT2_ART[type].file,0,target);
check({type:'swarm'},{...ACT2_ART.runner,size:.82},ACT2_ART.runner.file,0,H.swarm);
for(const [type,art] of Object.entries(ACT2_WARDEN_ART))check({type:'act2warden',body:new THREE.Group()},art,art.file,0,H.warden);
for(const [type,target] of [['relaymachine',H.turret],['relaymitt',H.shield]])check({type},{file:'enemy-relay-atlas-v1.webp',size:2.65},'enemy-relay-atlas-v1.webp',type==='relaymachine'?0:2,target);
const always=fixture.rows.find(r=>r.file==='boss-always-beginner-v1.webp');check({type:'alwaysbeginner'},{file:always.file,size:always.size,baseline:.02},always.file,0,H.boss);
for(const [type,art] of Object.entries(ACT3_ART)){const frame=type==='tempestcarrier'?1:art.frame;check({type},art,art.file==='enemy-act3-flight-atlas-v2.webp'?'enemy-act3-flight-atlas-v2.webp':art.file,frame,type.includes('warden')?H.warden:type==='tempestcarrier'?H.boss:type==='sky-diver'?H.hound:H.caster);}
for(const [act,types,targets] of [['crosswind',['scout','lobber','charger'],[H.hound,H.caster,H.hound]],['crystalGorge',['swarm','brute','runner'],[H.hound,H.shield,H.hound]]]){
 for(let i=0;i<types.length;i++)check({type:'expansion-minion',expansionThreat:{type:types[i],phase:'charge'}},expansionEnemyArt(act),act==='crosswind'?'enemy-crosswind-motion-v1.webp':'enemy-crystal-motion-v1.webp',i,targets[i]);
 const art=expansionActorArt(act==='crosswind'?'crosswindKeeper':'crystalGardener');check({type:'expansion-boss'},art,art.file.split('/').at(-1),0,H.boss);
}
eq(ARBOR_ACT1_BOSS_SIZE*measured('arbo-motion-v1.webp').heightRatio,H.boss);
// Original Act 1 appearances and unusual test/legacy rigs remain exact.
for(const file of ['enemy-hound-v4.png','enemy-caster-v4.png','warden-memory-v4.png','boss-austin-v1.png','unknown.png']){const art={file,size:2.4};assert.equal(journeyActorArt({type:'hound'},art),art);}
const main=readFileSync('src/main.js','utf8');
const wrapper=main.slice(main.indexOf('function attachActorArt('),main.indexOf('\nfunction enemy(',main.indexOf('function attachActorArt(')));
for(const kind of ['journey','survival','mirror','training']){
 let actual;const context={journeyActorArt,attachRawActorArt:(e,c,r,a)=>(actual=a),survivalSession:kind==='survival'?{}:null,mirrorSession:kind==='mirror'?{}:null,trainingSession:kind==='training'?{}:null};vm.createContext(context);vm.runInContext(wrapper,context);
 const art=expansionActorArt('crosswindKeeper');context.attachActorArt({type:'expansion-boss'},null,null,art);
 if(kind==='journey')assert(actual.size>art.size);else assert.equal(actual,art,'other modes keep their original artwork size');
}
for(const [w,h] of [[1280,720],[640,360],[1920,1080]])for(const act of ['garden','stadium','skyway','crosswind','crystalGorge','arbor'])assert.equal(journeyPlayerScale(w,h,act),1.25);
assert(!main.includes("player.scale.setScalar(expansionJourney?.act==='crosswind'?1.75"));
assert(!main.includes('player.scale.setScalar(!mirrorSession&&!trainingSession&&isAct3(region)?1.75'));
assert(main.indexOf('presentFrame(now*.001);seedTitle.update(')>0,'project title after the current sprite pose update');
assert(main.includes('contactShadows.mesh.visible=!isAct3(region);if(contactShadows.mesh.visible)contactShadows.update('),'invisible contact shadows do no matrix work');
// Exercise the shipping render callback: current camera roll and inherited
// parent transforms must reach matrixWorld immediately, without parent rebuilds.
const actorSource=readFileSync('src/actor-art.js','utf8'),start=actorSource.indexOf('function billboard('),end=actorSource.indexOf('\nexport function attachActorArt',start);
const context={THREE,parentWorld:new THREE.Quaternion(),inverseParent:new THREE.Quaternion(),rollQuaternion:new THREE.Quaternion(),cameraUp:new THREE.Vector3(),localOffset:new THREE.Vector3(),localUp:new THREE.Vector3(0,1,0),localForward:new THREE.Vector3(0,0,1)};vm.createContext(context);vm.runInContext(actorSource.slice(start,end),context);
const scene=new THREE.Scene(),parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1));scene.add(parent);parent.add(mesh);
const camera=new THREE.PerspectiveCamera(45,16/9,.1,100);context.billboard(mesh,camera,2.4,.08);let ancestorRebuilds=0;
const rebuild=parent.updateWorldMatrix;parent.updateWorldMatrix=function(...args){ancestorRebuilds++;return rebuild.apply(this,args);};
const expected=new THREE.Quaternion(),q=new THREE.Quaternion(),foot=new THREE.Vector3(),worldScale=new THREE.Vector3();
for(let i=0;i<6000;i++){
 parent.position.set(Math.sin(i*.01),0,Math.cos(i*.01));parent.rotation.y=i*.009;parent.scale.setScalar(1.2);
 camera.position.set(Math.sin(i*.003)*4,19,19);camera.lookAt(parent.position);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 parent.matrixWorld.decompose(foot,expected,worldScale);expected.invert().multiply(camera.quaternion);q.setFromAxisAngle(context.localForward,Math.sin(i*.02)*.1);expected.multiply(q);
 mesh.userData.roll=Math.sin(i*.02)*.1;mesh.scale.set(2.4,2.4*(1+Math.sin(i*.04)*.035),1);mesh.onBeforeRender();
 assert(mesh.quaternion.angleTo(expected)<1e-7);
 foot.set(0,.08-.5,0).applyMatrix4(mesh.matrixWorld);assert(foot.distanceTo(parent.position)<1e-6,'current rolled plane keeps its foot at the actor without a second external matrix update');
}
assert.equal(ancestorRebuilds,0);mesh.geometry.dispose();mesh.material.dispose();
console.log(JSON.stringify({test:'Act 1 visual ruler',roles,sourceFiles:fixture.rows.length,unchangedModes:3,heroViewportActCases:18,originalSources:'SHA256 exact',gameplayMutations:0,billboardFrames:6000,ancestorRebuilds,sameFramePose:true}));
