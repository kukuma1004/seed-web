import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFormCombat,FORM_COMBAT,MIRROR_BOSS_PARRY,mirrorBossParryCapacity,segmentDistance} from '../src/form-combat.js';
import {createFormVisuals} from '../src/form-visuals.js';
import {GENERATED_FORMS,formUpgradeLine} from '../src/forms.js';
import {blocksShield} from '../src/shield.js';

const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
const enemy=(x,z=0,type='hound')=>({type,g:{position:vec(x,z),rotation:{y:0}},dead:false});
function fixture(foes=[],overrides={}){
 const scene=new THREE.Scene(),player={position:vec()},calls=[],constrained=[];
 const combat=createFormCombat(scene,{
  player,enemies:()=>foes,hit(e,damage,metadata){calls.push({e,damage,...metadata});return true;},
  blocked:()=>false,boundary:()=>false,constrain(pos,radius){constrained.push({pos:pos.clone(),radius});},
  vfx:{muzzle(){},pulse(){},burst(){},trail(){}},...overrides
 });
 return {combat,player,calls,constrained,scene};
}
const step=(combat,seconds,dt=.01)=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)combat.update(Math.min(dt,seconds-elapsed));};
const painted=scene=>{const found=[];scene.traverse(o=>{if(o.isMesh&&o.userData.paintedProjectile)found.push(o);});return found;};
assert.ok(MIRROR_BOSS_PARRY.damageScale<=.1,'boss parry must be defense, not a source of boss damage');
assert.deepEqual([1,3,4,6,7,10].map(mirrorBossParryCapacity),[1,1,2,2,3,3]);
assert.match(formUpgradeLine('mirrorguard',3),/보스탄 방어 1 → 2발\/2\.4초/);
assert.equal(segmentDistance(vec(),vec(2),vec(1,1)),1);
assert.equal(segmentDistance(vec(),vec(),vec(3,4)),5);

// Orbiting bodies stop ordinary shots. Only Mirror Guard can occasionally
// parry a boss projectile; every other orbit still leaves boss patterns intact.
for(const id of ['starring','frostguard','stormcrown','mirrorguard','comethalo','halobloom','ebbring','spearring','accretiondisk']){
 const shot={life:3,boss:false,struck:false,ob:{position:vec(100)}};
 const f=fixture([],{enemyShots:()=>[shot]});f.combat.set(id,2);f.combat.update(.01);
 const body=f.scene.children[0].children[0].children[0];
 assert.ok(body?.isMesh,`${id} must have an orbiting body`);
 shot.ob.position.copy(body.position);f.combat.update(.01);
 assert.equal(shot.life,0,`${id} should intercept an ordinary shot`);
 assert.equal(shot.struck,true,`${id} should mark the shot as spent`);
 shot.life=3;shot.struck=false;shot.boss=true;f.combat.update(.01);
 assert.equal(shot.life,id==='mirrorguard'?0:3,`${id} boss interception rule`);
 f.combat.dispose();
}
for(const spriteKey of ['austin','baseball','storm','mirror']){
 const first={life:3,boss:true,spriteKey,struck:false,ob:{position:vec(100)}};
 const shots=[first],f=fixture([],{enemyShots:()=>shots});f.combat.set('mirrorguard',2);f.combat.update(.01);
 const body=f.scene.children[0].children[0].children[0];first.ob.position.copy(body.position);f.combat.update(.01);
 assert.equal(first.life,0,`Mirror Guard must parry ${spriteKey} boss projectiles`);
 const second={life:3,boss:true,spriteKey,struck:false,ob:{position:body.position.clone()}};shots.push(second);f.combat.update(.01);
 assert.equal(second.life,3,'a boss volley must not be erased during parry cooldown');
 second.ob.position.copy(vec(100));step(f.combat,2.5);second.ob.position.copy(body.position);f.combat.update(.01);
 assert.equal(second.life,0,'one more boss projectile can be parried after cooldown');f.combat.dispose();
}

// Levels widen one shared defense window, never grant unlimited boss-shot immunity.
for(const [id,level,expected] of [['mirrorguard',1,1],['mirrorguard',4,2],['mirrorguard',7,3],['mirrorhall',7,3],['final-mirrorguard-orbit',7,3]]){
 const shots=[],f=fixture([],{enemyShots:()=>shots});f.combat.set(id,level);f.combat.update(.01);
 const body=f.scene.children[0].children[0].children[0];
 for(let i=0;i<5;i++)shots.push({life:3,boss:true,spriteKey:'austin',struck:false,ob:{position:body.position.clone()}});
 f.combat.update(.001);
 assert.equal(shots.filter(q=>q.struck).length,expected,`${id} Lv.${level}: capped boss volley`);
 f.combat.surge(1);f.combat.update(.001);
 assert.equal(shots.filter(q=>q.struck).length,expected,`${id} Lv.${level}: opening shares the same budget`);
 f.combat.dispose();
}

// The first curated visual batch must use its real combat geometry: three
// hitscan paths, a persistent frost web, and a single merged orbit petal.
{
 const counts={lance:0,frostWeb:0,rewindTrace:0};
 const vfx={lance(){counts.lance++;},frostWeb(){counts.frostWeb++;},rewindTrace(){counts.rewindTrace++;}};
 for(const id of ['icicle','frostnet','rewindbolt','refractlance']){
  const foes=[enemy(2),enemy(4),enemy(6)],f=fixture(foes,{vfx});
  f.combat.set(id);f.combat.fire(vec(),vec(1));
  assert.ok(f.calls.length>0,`${id} still deals damage through its original attack`);
  assert.equal(f.combat.state().bolts,0,`${id} does not invent a travelling projectile`);
  f.combat.dispose();
 }
 assert.ok(counts.lance>=2,'both lances reach the shared silhouette renderer');
 assert.ok(counts.frostWeb>0,'frost links leave visible web segments');
 assert.ok(counts.rewindTrace>0,'rewind records its attack route');
 const bloom=fixture([enemy(2)]);bloom.combat.set('halobloom');
 assert.ok(bloom.combat.state().orbit>0,'halobloom starts with its petal orbit');
 const petals=[];bloom.scene.traverse(o=>{if(o.isMesh&&o.geometry.name==='seed-form-halo-bloom-petal')petals.push(o);});
 assert.ok(petals.length>0&&petals.every(o=>o.geometry.getAttribute('position').count<=696),'petals use one budgeted merged geometry each');
 bloom.combat.dispose();
}

// The second curated batch has four distinct borrowed-projectile replacements;
// its hit timing and role stay with the existing combat implementation.
{
 const named=(scene,name)=>{let found=[];scene.traverse(o=>{if(o.isMesh&&o.geometry.name===name)found.push(o);});return found;};
 const mirrorCalls=[];
 const thunder=fixture([enemy(2),enemy(3)],{vfx:{mirrorArc(...args){mirrorCalls.push(args);}}});
 thunder.combat.set('thundermirror');thunder.combat.fire(vec(),vec(1));
 assert.ok(mirrorCalls.length>=3,'two-target mirror lightning visibly alternates');
 assert.equal(thunder.combat.state().bolts,0,'mirror lightning remains hitscan');thunder.combat.dispose();
 const sunFx={sunburst:0},sun=fixture([enemy(1.5)],{vfx:{sunburst(){sunFx.sunburst++;}}});
 sun.combat.set('sunmirror');sun.combat.fire(vec(),vec(1));
 assert.ok(painted(sun.scene).length>0,'sun mirror fires a painted 2D projectile');
 step(sun.combat,.35);assert.ok(sunFx.sunburst>0,'sun core finishes in a distinct burst');sun.combat.dispose();
 const shower=fixture([enemy(2)]);shower.combat.set('pierceshower');shower.combat.fire(vec(),vec(1));
 assert.ok(painted(shower.scene).length>0,'spear hits create painted petals');shower.combat.dispose();
 const ebb=fixture();ebb.combat.set('ebbring');
 assert.ok(named(ebb.scene,'seed-form-ebbing-wave-blade').length>0,'the trailing orbit uses its own wave shape');ebb.combat.dispose();
 const gardenFx={gardenVortex:0},garden=fixture([enemy(5)],{vfx:{gardenVortex(){gardenFx.gardenVortex++;}}});
 garden.combat.set('pullgarden');garden.combat.fire(vec(),vec(1));
 assert.ok(painted(garden.scene).length>0,'gravity seeds use the painted 2D sheet');
 step(garden.combat,.7);assert.ok(gardenFx.gardenVortex>0,'landed seeds leave a visible field');garden.combat.dispose();
 const visuals=createFormVisuals();
 for(const id of ['sunMirror','showerPetal','ebbBlade','pullSeed'])assert.ok(visuals.geos[id].getAttribute('position').count<=696,`${id} stays under the mobile triangle cap`);
 for(const geo of Object.values(visuals.geos))geo.dispose();for(const mat of Object.values(visuals.mats))mat.dispose();
}

// Future catalogue forms use one painted atlas tile when equipped.
{
 const f=fixture(),id=Object.keys(GENERATED_FORMS)[0];f.combat.set(id,2);f.combat.fire(vec(),vec(1));
 const meshes=[];f.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.ok(painted(f.scene).length>0&&painted(f.scene).every(o=>o.geometry.type==='PlaneGeometry'));
 assert.match(f.combat.audioEvent(),/^shot/);assert.equal(f.combat.state().bolts,1);f.combat.dispose();
}

// The held third batch has authored shapes in combat, not only on selection
// cards. Its frost field stays visible, never holds an act boss, and keeps at
// most two persistent meshes even if the player fires again during the field.
{
 const visualNames={spearRing:'seed-form-spear-ring-needle',accretionDisk:'seed-form-accretion-disk',rimeback:'seed-form-returning-rime-leaf',coldwell:'seed-form-cold-well-core',rimeBud:'seed-form-rime-petal-bud',rimeShard:'seed-form-rime-petal-shard',echoOrb:'seed-form-echo-lane-orb'};
 const visuals=createFormVisuals();
 for(const [id,name] of Object.entries(visualNames)){
  const g=visuals.geos[id];assert.equal(g.name,name);
  assert.ok(g.getAttribute('position').count<=696,`${id}: projectile exceeds the mobile triangle budget`);
 }
 for(const geo of Object.values(visuals.geos))geo.dispose();for(const mat of Object.values(visuals.mats))mat.dispose();
 for(const [id,name] of [['spearring',visualNames.spearRing],['accretiondisk',visualNames.accretionDisk],['rimeback',visualNames.rimeback],['coldwell',visualNames.coldwell],['rimepetal',visualNames.rimeBud],['echolane',visualNames.echoOrb]]){
  const f=fixture([enemy(2)]);f.combat.set(id,4);if(!['spearring','accretiondisk'].includes(id))f.combat.fire(vec(),vec(1),vec(2));
  const meshes=[];f.scene.traverse(o=>{if(o.isMesh&&o.geometry.name===name)meshes.push(o);});
  assert.ok(meshes.length||painted(f.scene).length,`${id}: authored attack silhouette is absent from combat`);f.combat.dispose();
 }
 const boss=enemy(3,0,'tempestcarrier'),ordinary=enemy(4.2,.2),f=fixture([boss,ordinary]);
 f.combat.set('coldwell',9);for(let i=0;i<3;i++){f.combat.fire(vec(),vec(1),vec(3));step(f.combat,.52);}
 assert.ok(f.combat.state().coldWells<=2,'cold wells exceed their floor-mesh budget');
 assert.equal(boss.g.position.x,3,'act-three boss must not be pulled by a frost field');
 assert.ok(ordinary.g.position.x<4.2,'ordinary foes still get pulled');
 assert.ok(f.calls.some(c=>c.kind==='coldwell'&&c.phase==='shatter'),'replaced wells must shatter instead of losing their damage');
 f.combat.clear();assert.equal(f.combat.state().coldWells,0);f.combat.dispose();
 const net=fixture([enemy(2,0,'act3warden')]);net.combat.set('frostnet');net.combat.fire(vec(),vec(1));
 assert.equal(net.combat.state().frostLines,1,'a lone act-three boss should leave a short damaging thread');
 step(net.combat,.05);assert.equal(net.combat.state().frostLines,1);net.combat.dispose();
 const crowd=fixture(Array.from({length:8},(_,i)=>enemy(2+i*.45)));crowd.combat.set('frostnet',9);
 for(let i=0;i<12;i++){crowd.combat.fire(vec(),vec(1));assert.ok(crowd.combat.state().frostLines<=24,'surge frost web must stay within its floor-line budget');}
 assert.ok(crowd.calls.length>0&&crowd.scene.children.length>0);
 assert.ok(crowd.combat.state().frostLines>0);
 crowd.combat.dispose();
}
{
 const linked=[enemy(2),enemy(4),enemy(6)],between=enemy(3,.4),boss=enemy(5,.4,'austin');
 const f=fixture([...linked,between,boss]);f.combat.set('frostnet');f.combat.fire(vec(),vec(1));
 assert.ok(linked.every(e=>e.frostLock>=.6),'linked ordinary foes freeze together');
 assert.ok(between.frostLock>=.6,'the frost front also catches an enemy between links');
 assert.equal(boss.frostLock,undefined,'bosses cannot be held by the front');f.combat.dispose();
}

// Themes are cosmetic: switching one never changes the immutable combat stats.
{
 const f=fixture();f.combat.set('collapse');const before=FORM_COMBAT.collapse.damage;
 for(const theme of ['void','cyber','celestial','botanical']){assert.equal(f.combat.setTheme(theme),theme);assert.equal(f.combat.state().theme,theme);}
 assert.equal(FORM_COMBAT.collapse.damage,before);f.combat.dispose();
}

// Collapse has a visible gathering delay, limited projectile/well counts,
// and no damage at arbitrary range.
{
 const close=enemy(1),far=enemy(20),f=fixture([close,far]);f.combat.set('collapse');
 assert.equal(f.combat.fire(vec(),vec(1)),FORM_COMBAT.collapse.interval);
 f.combat.update(.1);assert.equal(f.combat.state().wells,1);assert.equal(f.calls.length,0);
 f.combat.update(.6);assert.equal(f.calls.length,0,'Gathering delay must precede explosion damage');
 f.combat.update(.11);assert.equal(f.calls.length,1);assert.equal(f.calls[0].e,close);
 assert.equal(f.calls[0].damage,86);assert.equal(f.calls[0].kind,'collapse');
 assert.ok(f.calls[0].direction instanceof THREE.Vector3);assert.ok(f.constrained.length);
 assert.equal(f.combat.state().wells,0);f.combat.dispose();
}
{
 const f=fixture();f.combat.set('collapse');
 for(let i=0;i<100;i++)f.combat.fire(vec(),vec(1));
 assert.equal(f.combat.state().bolts,5);
 f.combat.update(.65);assert.equal(f.combat.state().bolts,0);assert.equal(f.combat.state().wells,3);
 f.combat.update(.2);assert.equal(f.combat.state().wells,0);f.combat.dispose();
}

// A blade may hit once outbound and once returning, with actual travel
// direction exposed to directional defense and bounded support hooks.
{
 const target=enemy(3),f=fixture([target]);f.combat.set('returnblade');f.combat.fire(vec(),vec(1));
 step(f.combat,1.5);assert.equal(f.calls.length,2);
 assert.ok(f.calls.every(c=>c.kind==='returnblade'&&c.damage===34));
 assert.ok(f.calls[0].direction.x>.99);assert.ok(f.calls[1].direction.x<-.99);
 assert.equal(f.combat.state().bolts,0);f.combat.dispose();
}
{
 const foes=Array.from({length:12},(_,i)=>enemy(1+i*.35)),f=fixture(foes);
 f.combat.set('returnblade');f.combat.fire(vec(),vec(1));step(f.combat,1.5);
 assert.ok(f.calls.length<=10,'At most five targets per outbound/return leg');
 for(const foe of foes)assert.ok(f.calls.filter(c=>c.e===foe).length<=2);
 f.combat.dispose();
}
{
 const shield=enemy(1,0,'shield');shield.g.rotation.y=-Math.PI/2;shield.state='stalk';
 const behind=enemy(1.9),attempts=[];
 // Deliberately put the rear target first in the enemy array.
 const f=fixture([behind,shield],{hit(e,damage,metadata){attempts.push({e,...metadata});return !blocksShield(e,metadata.direction);}});
 f.combat.set('returnblade');f.combat.fire(vec(),vec(1));f.combat.update(.2);
 assert.equal(attempts.length,1);assert.equal(attempts[0].e,shield);
 assert.equal(f.combat.state().hits,0,'A blocked hit does not count as inflicted damage');
 assert.equal(f.combat.state().bolts,0,'A shield stops the blade');
 step(f.combat,2);assert.equal(attempts.length,1);f.combat.dispose();
}

// Frost is local crowd control: it pushes nonbosses through the same movement
// constraint as walking, slows bosses without moving them, and ignores range.
{
 const near=enemy(2.5),boss=enemy(2.5,0,'warden'),far=enemy(8);let constraintCalls=0;
 const f=fixture([near,boss,far],{constrain(pos,radius){constraintCalls++;assert.equal(radius,.65);pos.x=Math.min(pos.x,2.7);}});
 f.combat.set('frostguard');assert.equal(f.combat.fire(vec(),vec(1)),Infinity);f.combat.update(.01);
 assert.equal(f.calls.length,2);assert.ok(f.calls.every(c=>c.kind==='frostguard'));
 assert.equal(near.g.position.x,2.7);assert.equal(boss.g.position.x,2.5);assert.equal(constraintCalls,1);
 assert.ok(near.slow>=1.5&&boss.slow>=1.5);assert.equal(far.slow,undefined);
 f.combat.update(.1);assert.equal(f.calls.length,2,'Per-target cooldown prevents three simultaneous satellite hits');
 f.combat.clear();step(f.combat,3);assert.equal(f.calls.length,2,'Clear must disable persistent frost damage');
 assert.equal(f.combat.state().active,null);f.combat.dispose();
}
{
 const near=enemy(2.5),f=fixture([near],{hit:()=>false});f.combat.set('frostguard');f.combat.update(.01);
 assert.equal(near.g.position.x,2.5);assert.equal(near.slow,undefined);assert.equal(f.combat.state().hits,0);f.combat.dispose();
}
// Tidepull gathers at a remote anchor. It may move a close enemy away from the
// seed, but can never drag one inside its safe ring on the return trip.
{
 const close=enemy(1.2),far=enemy(4.2),f=fixture([close,far]);f.combat.set('tidepull');f.combat.fire(vec(),vec(1));
 step(f.combat,.35);assert.ok(close.g.position.distanceTo(f.player.position)>=FORM_COMBAT.tidepull.safeRadius-.02);
 step(f.combat,1.7);assert.ok(close.g.position.distanceTo(f.player.position)>=FORM_COMBAT.tidepull.safeRadius-.02);
 assert.ok(f.calls.some(c=>c.kind==='tidepull'&&c.damage>=FORM_COMBAT.tidepull.damage),'remote anchor has a meaningful rupture');
 assert.ok(f.calls.some(c=>c.kind==='tidepull'&&c.phase==='return'&&c.damage===FORM_COMBAT.tidepull.returnDamage),'the returning tide damages along its way home');
 assert.ok(close.slow>0||far.slow>0,'the tide controls the gathered crowd');f.combat.dispose();
}
{
 const f=fixture([enemy(1)]);f.combat.set('collapse');f.combat.fire(vec(),vec(1));f.combat.update(.1);
 assert.equal(f.combat.state().wells,1);f.combat.clear();step(f.combat,4);
 assert.equal(f.calls.length,0);assert.equal(f.combat.state().wells,0);
 f.combat.set('returnblade');f.combat.fire(vec(),vec(1));f.combat.clear();step(f.combat,2);
 assert.equal(f.calls.length,0);assert.equal(f.combat.state().bolts,0);f.combat.dispose();
}
console.log('Form combat delay/caps, directional two-leg blade hits and blocking, constrained frost control, and cleanup passed.');
