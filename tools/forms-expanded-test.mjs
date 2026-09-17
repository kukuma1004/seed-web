import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAWS} from '../src/laws.js';
import {FORMS,formLevel,formStats,formUpgradeLine} from '../src/forms.js';
import {createFormCombat,FORM_COMBAT,ORBIT_VISUALS,PRISM_CHILD_FALLOFF,orbitPose} from '../src/form-combat.js';
import {blocksShield} from '../src/shield.js';

const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
const enemy=(x,z=0,type='hound')=>({type,g:{position:vec(x,z),rotation:{y:0}},dead:false});
function fixture(foes=[],overrides={}){
 const player={position:vec()},calls=[];
 const combat=createFormCombat(new THREE.Scene(),{player,enemies:()=>foes,hit(e,damage,meta){calls.push({e,damage,...meta});return true;},
  blocked:()=>false,boundary:()=>false,constrain(){},vfx:{},...overrides});
 return {combat,player,calls};
}
const step=(combat,seconds,dt=.01)=>{for(let t=0;t<seconds-1e-9;t+=dt)combat.update(Math.min(dt,seconds-t));};
const walls=(a,b,dir)=>{for(const edge of [4,-4]){if((edge>0&&b.x>edge)||(edge<0&&b.x<edge)){b.x=2*edge-b.x;dir.x*=-1;return true;}}return false;};

// Catalogue: ten forms, unique pairs, every law feeds at least two forms.
assert.equal(Object.keys(FORMS).length,10);
assert.equal(new Set(Object.values(FORMS).map(f=>[...f.requires].sort().join('+'))).size,10);
for(const id of Object.keys(LAWS))assert.ok(Object.values(FORMS).filter(f=>f.requires.includes(id)).length>=2,`${id} feeds fewer than two forms`);
for(const f of Object.values(FORMS)){assert.ok(f.name&&f.desc&&f.strength&&f.weakness&&f.pair.includes('+'));assert.equal(f.requires.length,2);}
assert.match(FORMS.tidepull.desc,/왕복/);assert.equal(FORMS.tidepull.name,'귀환 해일');

// Orbit evolutions must remain visually readable without relying on colour.
assert.deepEqual(new Set(Object.values(ORBIT_VISUALS).map(v=>v.geometry)).size,4);
assert.deepEqual(new Set(Object.values(ORBIT_VISUALS).map(v=>v.motion)).size,4);
{
 const styles=Object.keys(ORBIT_VISUALS),poses=styles.map(id=>orbitPose(id,1,6,.4,.8,{radius:2,inner:1.2,outer:3,period:2.4}));
 assert.equal(new Set(poses.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`)).size,4,'each orbit family has a distinct path');
 assert.ok(poses.every(p=>p.scale.length===3&&Number.isFinite(p.yaw)));
}

// Form level follows both ingredients, without a ceiling; stats grow and counts stay bounded.
assert.equal(formLevel(new Map([['gravity',1],['burst',1]]),'collapse'),1);
assert.equal(formLevel(new Map([['gravity',3],['burst',2]]),'collapse'),4);
assert.equal(formLevel(new Map([['gravity',3]]),'collapse'),0);
for(const id of Object.keys(FORMS)){
 assert.deepEqual(formStats(id,1),{...FORM_COMBAT[id]});
 let previous=formStats(id,1);
 for(let L=2;L<60;L++){
  const next=formStats(id,L);
  assert.ok(next.damage>previous.damage,`${id} damage must keep growing`);
  assert.ok(next.interval<=previous.interval);
  for(const key of ['satellites','orbs','mirrors','seeds','pierce','generations','hitsPerLeg'])if(key in next)assert.ok(next[key]>=previous[key]&&next[key]<=14);
  previous=next;
 }
 assert.match(formUpgradeLine(id,1),/Lv\.1 → 2/);
}

// Prism: shards split on walls, the first shard passes its first enemy, and the swarm is finite.
{
 assert.equal(PRISM_CHILD_FALLOFF.base*2,1.4,'ordinary prism keeps its lively wall growth');
 assert.equal(PRISM_CHILD_FALLOFF.infinite*2,1,'Infinite Prism conserves total damage when one shard becomes two');
 const target=enemy(2),f=fixture([target],{boundary:walls});f.combat.set('prism');
 f.combat.fire(vec(),vec(1));let peak=0;
 for(let i=0;i<400;i++){f.combat.update(.01);peak=Math.max(peak,f.combat.state().bolts);}
 assert.ok(peak>=4,`walls multiply the shards (peak ${peak})`);assert.ok(peak<=formStats('prism',1).shards);
 assert.ok(f.calls.some(c=>c.e===target&&c.kind==='prism'));assert.equal(f.combat.state().bolts,0);f.combat.dispose();
}

// Thunder lance: pierces a line, stops at cover and shields, then jumps to a neighbour.
{
 const a=enemy(2),b=enemy(4),c=enemy(6),side=enemy(6.2,2.4),f=fixture([a,b,c,side]);f.combat.set('thunderlance');
 assert.equal(f.combat.fire(vec(),vec(1)),formStats('thunderlance',1).interval);
 const direct=f.calls.filter(x=>!x.indirect).map(x=>x.e);assert.deepEqual(direct,[a,b,c]);
 assert.ok(f.calls.some(x=>x.indirect&&x.e===side),'lightning jumps from the last pierced enemy');
 const covered=fixture([a,b,c],{blocked:(p,q)=>q.x>5});covered.combat.set('thunderlance');covered.combat.fire(vec(),vec(1));
 assert.ok(!covered.calls.some(x=>x.e===c),'cover stops the lance');
 const shield=enemy(3,0,'shield');shield.g.rotation.y=-Math.PI/2;shield.state='stalk';
 const blocked=fixture([a,shield,c],{hit(e,d,meta){return meta.indirect||!blocksShield(e,meta.direction);}});blocked.combat.set('thunderlance');blocked.combat.fire(vec(),vec(1));
 assert.ok(blocked.combat.state().hits>=1&&blocked.combat.state().hits<3,'a shield face ends the line');
}

// Frost bloom: nothing until it lands, then chill, then a delayed shatter.
{
 const target=enemy(5),f=fixture([target]);f.combat.set('frostbloom');f.combat.fire(vec(),vec(1),vec(5));
 step(f.combat,.5);assert.equal(f.calls.length,0,'the bomb is still in the air');
 step(f.combat,.1);assert.equal(f.calls.length,1);assert.ok(target.slow>=2.2);
 step(f.combat,.9);assert.equal(f.calls.length,2);assert.equal(f.calls[1].damage,formStats('frostbloom',1).shatter);
 const far=fixture([enemy(0,0)]);far.combat.set('frostbloom');far.combat.fire(vec(),vec(1),vec(40));step(far.combat,1.6);
 assert.equal(far.calls.length,0,'range is clamped, so a far throw does not hit the seed position');
}

// Storm crown: passive, zaps near enemies on a pulse, never through cover or at long range.
{
 const near=enemy(3),far=enemy(12),f=fixture([near,far]);f.combat.set('stormcrown');
 assert.equal(f.combat.fire(vec(),vec(1)),Infinity);step(f.combat,.8);
 assert.ok(f.calls.some(c=>c.e===near));assert.ok(!f.calls.some(c=>c.e===far));
 const walled=fixture([enemy(3)],{blocked:()=>true});walled.combat.set('stormcrown');step(walled.combat,2);assert.equal(walled.calls.length,0);
 f.combat.set('stormcrown',7);assert.equal(f.combat.state().orbit,formStats('stormcrown',7).orbs);assert.equal(f.combat.state().level,7);
}

// Tide pull: gathers ordinary enemies at a remote anchor, never across the
// seed's safe ring; wardens hold their ground.
{
 const foe=enemy(5),boss=enemy(5,.5,'warden'),f=fixture([foe,boss]);f.combat.set('tidepull');f.combat.fire(vec(),vec(1));
 step(f.combat,2.5);
 assert.ok(foe.g.position.x>=formStats('tidepull',1).safeRadius-.02,`kept outside the safe ring (x=${foe.g.position.x.toFixed(2)})`);assert.equal(boss.g.position.x,5);
 assert.ok(f.calls.some(c=>c.e===foe&&c.damage===formStats('tidepull',1).damage),'bursts at the remote anchor');
 assert.ok(f.calls.some(c=>c.phase==='return'),'the current hits again while carrying enemies home');
}

// Seed storm: a short fan; close enemies are shredded, distant ones are out of reach.
{
 const close=enemy(2),distant=enemy(8),f=fixture([close,distant]);f.combat.set('seedstorm');f.combat.fire(vec(),vec(1));
 assert.equal(f.combat.state().bolts,formStats('seedstorm',1).seeds);step(f.combat,1);
 assert.ok(f.calls.some(c=>c.e===close));assert.ok(!f.calls.some(c=>c.e===distant));assert.equal(f.combat.state().bolts,0);
}

// Mirror guard: ordinary enemy shots touching a mirror become the seed's shots; warden shots are untouched.
{
 const target=enemy(0,-6),shots=[{life:4,ob:{position:vec(1.9,0)}},{life:4,boss:true,ob:{position:vec(-1.9,0)}}];
 const f=fixture([target],{enemyShots:()=>shots});f.combat.set('mirrorguard');
 f.combat.update(.001);assert.ok(shots[0].life===0&&shots[0].struck,'the ordinary shot was caught');assert.equal(shots[1].life,4,'the warden shot was not');
 step(f.combat,1);
 const damages=f.calls.filter(c=>c.kind==='mirrorguard'&&!c.indirect).map(c=>c.damage).sort((a,b)=>a-b);
 assert.deepEqual(damages,[formStats('mirrorguard',1).damage]);
}
console.log('Forms: ten pairs covering every law twice, uncapped form levels, prism splits, lance lines, bloom delay, crown pulses, tide drag, seed fan, mirror returns passed.');
