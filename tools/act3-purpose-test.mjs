import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACT3_ARENA,ACT3_PRESSURE,ACT3_ROOM_HINTS,SKYWAY_ROOMS,act3CrowdType,act3ReinforcementSpawn,act3SupplyDrop} from '../src/act3.js';
import {ACT3_MINIONS,ACT3_ART,createAct3Minion,tickAct3Minion} from '../src/act3-enemies.js';
import {insideArena,constrainToArena} from '../src/arena.js';

const V=THREE.Vector3,scene=new THREE.Scene();
function fixture(type,{x=0,z=-6.2,player=new V(0,0,5.5),slow=0}={}){
 const e=createAct3Minion(scene,type,()=>.25),shots=[],hits=[];
 e.g.position.set(x,0,z);e.slow=slow;
 const ctx={player,collide:(p,r)=>constrainToArena(p,r,ACT3_ARENA),hit:damage=>{hits.push(damage);return true;},bolt:(p,dir,spec)=>shots.push({p:p.clone(),dir:dir.clone(),spec:{...spec}})};
 let time=0;
 return {e,ctx,shots,hits,tick(dt=.02){time+=dt;tickAct3Minion(e,dt,time,ctx);assert.ok(Number.isFinite(e.g.position.x+e.g.position.z+e.artRoll));assert.ok(insideArena(e.g.position,.51,ACT3_ARENA));},until(predicate,max=16){for(let t=0;t<max&&!predicate();t+=.02)this.tick();assert.ok(predicate(),`${type} reaches expected phase in ${max}s`);}};
}

assert.deepEqual(ACT3_ROOM_HINTS,SKYWAY_ROOMS.map(room=>room.hint));
assert.ok(ACT3_ROOM_HINTS.every(hint=>hint.length>20));
assert.equal(ACT3_PRESSURE.projectileCapNormal,64,'existing phone ceiling stays intact');
assert.deepEqual(Object.values(ACT3_MINIONS).map(({hp,damage})=>[hp,damage]),[[54,11],[28,18],[90,13],[185,13]],'movement pressure adds neither HP nor damage');
assert.equal(Object.keys(ACT3_ART).length,6,'existing enemy and boss art families stay intact');
for(const stage of [0,1,2,3]){
 const types=Array.from({length:12},(_,i)=>act3CrowdType(i,stage));
 assert.equal(types.filter(type=>type==='sky-diver').length,stage<2?2:3);
 assert.equal(types.filter(type=>type==='sky-bomber').length,stage===0?0:stage===1?1:2);
 assert.equal(types.filter(type=>type==='sky-carrier').length,stage>=2?1:0);
}
const bow=Array.from({length:7},(_,i)=>act3ReinforcementSpawn(i)),flank=Array.from({length:7},(_,i)=>act3ReinforcementSpawn(i+7));
assert.ok(bow.every(p=>p.z<-6));
assert.ok(flank.filter(p=>p.z>0).every(p=>Math.abs(p.x)>=7),'side entries leave starting centre open');
assert.ok(flank.some(p=>p.x<0&&p.z>-2)&&flank.some(p=>p.x>0&&p.z>-2),'second group changes pressure to both flanks');
for(let i=0;i<84;i++)assert.ok(insideArena(act3ReinforcementSpawn(i),.52,ACT3_ARENA));
assert.equal(act3SupplyDrop('sky-carrier',2,false,{tonic:4}),'tonic');
assert.equal(act3SupplyDrop('sky-carrier',2,true,{tonic:4}),null);
assert.equal(act3SupplyDrop('sky-carrier',3,false,{tonic:5}),null);

{
 const w=fixture('sky-scout',{x:-5.6});w.until(()=>w.e.state==='tell');
 assert.ok(w.e.g.position.z>-3,'scout enters middle instead of strafing only at the top');
 assert.ok(w.e.g.position.distanceTo(w.ctx.player)<6,'close scout becomes an accessible priority target');
 assert.equal(w.shots.length,0,'approach does not spray shots');
 assert.equal(w.e.timer,.5,'one readable warning precedes the single shot');
 const aim=w.e.dir.clone(),destination=w.e.formation.clone();w.ctx.player.x=6;
 w.until(()=>w.shots.length>0);assert.equal(w.shots.length,1);assert.ok(w.shots[0].dir.distanceTo(aim)<.000001,'shot commits to warning aim');
 const sweep=w.e.move.clone();w.ctx.player.set(-7,0,-5);w.until(()=>w.e.state==='recover');
 assert.ok(w.e.move.distanceTo(sweep)<.000001,'front pass does not follow the new player position');
 assert.ok(w.e.g.position.distanceTo(destination)<1,'pass opens the space it just left');
 const resting=w.e.g.position.clone(),count=w.shots.length;for(let i=0;i<25;i++)w.tick();
 assert.ok(w.e.g.position.distanceTo(resting)<.000001);assert.equal(w.shots.length,count,'recovery offers an actual punish window');
}
for(const type of ['sky-bomber','sky-carrier']){
 const w=fixture(type);w.until(()=>w.e.state==='tell');const aim=w.e.dir.clone();
 assert.ok(w.e.g.position.z>-6,'heavy craft advances toward its firing shelf');
 assert.equal(w.shots.length,0);assert.ok(w.e.timer>=.65);
 w.ctx.player.x=6;w.until(()=>w.e.state==='recover');assert.equal(w.shots.length,3,'each warned heavy opening has only three shots');
 assert.ok(w.shots[1].dir.distanceTo(aim)<.000001,'fan centre stays on its locked aim');
 const resting=w.e.g.position.clone();for(let i=0;i<25;i++)w.tick();
 assert.ok(w.e.g.position.distanceTo(resting)<.000001);assert.equal(w.shots.length,3);
}
{
 const stand=fixture('sky-diver');stand.until(()=>stand.e.state==='tell');assert.equal(stand.e.timer,.62);
 const aim=stand.e.dir.clone();stand.tick();assert.equal(stand.e.line.visible,true);
 stand.e.g.updateMatrixWorld(true);const forward=new V(0,0,1).transformDirection(stand.e.g.matrixWorld);
 assert.ok(forward.distanceTo(aim)<.000001,'warning line and pass have the same world heading');
 stand.until(()=>stand.e.state==='recover');assert.equal(stand.hits.length,1,'staying on the committed line is dangerous');
 assert.ok(stand.e.g.position.z>5.5,'pass actually reaches the lower player');
 const resting=stand.e.g.position.clone();for(let i=0;i<40;i++)stand.tick();
 assert.equal(stand.hits.length,1);assert.ok(stand.e.g.position.distanceTo(resting)<.000001,'diver has a long stationary recovery');assert.equal(stand.shots.length,0);
 const dodge=fixture('sky-diver');dodge.until(()=>dodge.e.state==='tell');const locked=dodge.e.dir.clone();
 for(let i=0;i<30;i++){dodge.ctx.player.x=Math.min(4,dodge.ctx.player.x+.12);dodge.tick();}
 dodge.until(()=>dodge.e.state==='recover');assert.equal(dodge.hits.length,0,'ordinary sideways movement during the warning escapes the pass');
 assert.ok(dodge.e.dir.distanceTo(locked)<.000001,'diver cannot steer after the warning');
}
{
 const w=fixture('sky-diver',{z:0,player:new V(0,0,3)});w.e.state='commit';w.e.move.set(0,0,1);w.e.dir.copy(w.e.move);w.e.commitRemaining=6;
 w.tick(.5);assert.equal(w.hits.length,1,'segment contact catches a committed body crossing even on a long frame');w.tick(.2);assert.equal(w.hits.length,1);
}
{
 const normal=fixture('sky-scout'),frozen=fixture('sky-scout',{slow:1});
 normal.until(()=>normal.shots.length>0);frozen.until(()=>frozen.shots.length>0);
 assert.ok(frozen.shots[0].spec.speed<normal.shots[0].spec.speed*.85,'freeze still slows emitted projectiles');
}
for(const type of Object.keys(ACT3_MINIONS)){
 const w=fixture(type);for(let i=0;i<700;i++)w.tick();
 assert.ok(w.e.attacks>=2,`${type} completes multiple bounded attack/recovery cycles`);
 assert.ok(w.shots.length<=18,`${type} pressure is not a hail of new shots`);
}
console.log('Act 3 purpose: flank formations, close targets, locked readable attacks, ordinary-movement escape, recovery, unchanged stats/art/caps/save supply passed.');
