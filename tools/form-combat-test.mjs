import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFormCombat,FORM_COMBAT,segmentDistance} from '../src/form-combat.js';
import {GENERATED_FORMS} from '../src/forms.js';
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
assert.equal(segmentDistance(vec(),vec(2),vec(1,1)),1);
assert.equal(segmentDistance(vec(),vec(),vec(3,4)),5);

// Future catalogue forms build one merged projectile only when equipped. This
// proves the 1,090-entry visual grammar is wired to combat without preloading it.
{
 const f=fixture(),id=Object.keys(GENERATED_FORMS)[0];f.combat.set(id,2);f.combat.fire(vec(),vec(1));
 const meshes=[];f.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.ok(meshes.some(o=>o.geometry.name===`seed-combo-projectile-${id}`));
 assert.match(f.combat.audioEvent(),/^shot/);assert.equal(f.combat.state().bolts,1);f.combat.dispose();
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
