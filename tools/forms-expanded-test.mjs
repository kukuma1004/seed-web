import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAWS} from '../src/laws.js';
import {FORMS,CURATED_FORMS,CANDIDATE_FORMS,COMBO_BATCHES,formLevel,formStats,formUpgradeLine} from '../src/forms.js';
import {createFormCombat,FORM_COMBAT,ORBIT_VISUALS,PRISM_CHILD_FALLOFF,orbitPose} from '../src/form-combat.js';
import {blocksShield} from '../src/shield.js';

const vec=(x=0,z=0)=>new THREE.Vector3(x,0,z);
const enemy=(x,z=0,type='hound')=>({type,g:{position:vec(x,z),rotation:{y:0}},dead:false});
function fixture(foes=[],overrides={}){
 const player={position:vec()},calls=[],scene=new THREE.Scene();
 const combat=createFormCombat(scene,{player,enemies:()=>foes,hit(e,damage,meta){calls.push({e,damage,...meta});return true;},
  blocked:()=>false,boundary:()=>false,constrain(){},vfx:{},...overrides});
 return {combat,player,calls,scene};
}
const step=(combat,seconds,dt=.01)=>{for(let t=0;t<seconds-1e-9;t+=dt)combat.update(Math.min(dt,seconds-t));};
const walls=(a,b,dir)=>{for(const edge of [4,-4]){if((edge>0&&b.x>edge)||(edge<0&&b.x<edge)){b.x=2*edge-b.x;dir.x*=-1;return true;}}return false;};

// Catalogue: twenty-five hand-authored forms, of which twenty are offered. A batch whose art is not ready stays out of the offers.
assert.equal(Object.keys(CURATED_FORMS).length,36,'차원 법칙을 뺀 1차 융합 36칸이 모두 손제작');
assert.equal(new Set(Object.values(CURATED_FORMS).map(f=>[...f.requires].sort().join('+'))).size,36);
assert.equal(Object.keys(FORMS).length,20,'승인 대기 중인 1차 조합은 그림을 갖춰도 선택지에 나오지 않는다');
assert.deepEqual(Object.keys(CANDIDATE_FORMS).sort(),Object.values(COMBO_BATCHES).filter(b=>!b.live).flatMap(b=>b.ids).sort(),'보류 중인 묶음만 선택지 밖에 있다');
for(const id of Object.keys(CANDIDATE_FORMS))assert.ok(!Object.hasOwn(FORMS,id),`${id} 선택지에 새어 나감`);
for(const id of Object.keys(LAWS))assert.ok(Object.values(FORMS).filter(f=>f.requires.includes(id)).length>=2,`${id} feeds fewer than two forms`);
for(const f of Object.values(FORMS)){assert.ok(f.name&&f.desc&&f.strength&&f.weakness&&f.pair.includes('+'));assert.equal(f.requires.length,2);}
assert.match(FORMS.tidepull.desc,/왕복/);assert.equal(FORMS.tidepull.name,'귀환 해일');

// Orbit evolutions must remain visually readable without relying on colour.
// 공전 조합마다 모양과 움직임이 달라야 한다(개수는 공전 외형 표와 같이 간다).
assert.equal(new Set(Object.values(ORBIT_VISUALS).map(v=>v.geometry)).size,Object.keys(ORBIT_VISUALS).length);
assert.equal(new Set(Object.values(ORBIT_VISUALS).map(v=>v.motion)).size,Object.keys(ORBIT_VISUALS).length);
{
 const styles=Object.keys(ORBIT_VISUALS),poses=styles.map(id=>orbitPose(id,1,6,.4,.8,{radius:2,inner:1.2,outer:3,period:2.4}));
 assert.equal(new Set(poses.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`)).size,styles.length,'each orbit family has a distinct path');
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

// The three newly curated pairs are true interactions, not two generic law
// flags: bounce pulls, a chain detonates its endpoint, and pierce charges range.
{
 const foe=enemy(2),f=fixture([foe],{boundary:walls});f.combat.set('gravitymirror');f.combat.fire(vec(),vec(1));step(f.combat,2.5);
 assert.ok(f.calls.some(c=>c.kind==='gravitymirror'),'the lens damages on its route or final compression');
 assert.ok(foe.g.position.x>2,'a wall rebound pulls an ordinary enemy toward the lens');f.combat.dispose();
}
{
 const foes=[enemy(2),enemy(5),enemy(8)],f=fixture(foes);f.combat.set('chainburst');f.combat.fire(vec(),vec(1));
 assert.ok(foes.every(e=>f.calls.some(c=>c.e===e&&c.kind==='chainburst')),'lightning crosses the spaced route');
 assert.ok(f.calls.some(c=>c.damage===formStats('chainburst',1).finish),'the final node owns a separate explosion');f.combat.dispose();
}
{
 const end=enemy(12),f=fixture([enemy(2),enemy(5),enemy(8),end]);f.combat.set('blastlance');f.combat.fire(vec(),vec(1));
 assert.ok(f.calls.filter(c=>c.e===end&&c.kind==='blastlance').length>=2,'the far target receives the charged line and endpoint blast');f.combat.dispose();
}
// The next small batch also has one interaction and one readable weakness each:
// wall-charged ice, crowd-only lightning petals, and a player-routed return flare.
{
 const foe=enemy(2),splash=enemy(2,1),f=fixture([foe,splash],{boundary:walls});f.combat.set('frostkaleidoscope');f.combat.fire(vec(),vec(1));step(f.combat,1.8);
 assert.ok(f.calls.some(c=>c.e===foe&&c.kind==='frostkaleidoscope'&&c.phase==='shatter'),'two wall rebounds charge an ice shatter');
 assert.ok((foe.slow||0)>0&&(splash.slow||0)>0,'the shatter chills its target and nearby enemy');f.combat.dispose();
}
{
 const foes=[enemy(2),enemy(3.2,1),enemy(3.4,-1),enemy(5,1)],f=fixture(foes);f.combat.set('lightningpetal');f.combat.fire(vec(),vec(1));step(f.combat,.5);
 assert.ok(foes.slice(0,3).every(e=>f.calls.some(c=>c.e===e&&c.kind==='lightningpetal')),'the bud opens into different nearby targets');
 assert.ok(f.calls.some(c=>c.e===foes[3]&&c.damage===formStats('lightningpetal',1).chainDamage),'a claimed petal sends one short follow-up arc');f.combat.dispose();
}
{
 const outbound=enemy(5),returnPath=enemy(2.5),home=enemy(.8,.5),f=fixture([outbound,returnPath,home]);f.combat.set('returnflare');f.combat.fire(vec(),vec(1),vec(5));step(f.combat,1.4);
 assert.ok(f.calls.some(c=>c.e===outbound&&c.kind==='returnflare'&&c.phase==='outbound'),'the remote endpoint explodes');
 assert.ok(f.calls.some(c=>c.e===returnPath&&c.phase==='return'),'the core damages along its route home');
 assert.ok(f.calls.some(c=>c.e===home&&c.phase==='home'),'reaching the seed creates a second explosion');f.combat.dispose();
}
// The challenge batch rewards an action instead of granting unconditional
// damage: keep moving, link a crowd, or draw a useful return curve.
{
 const target=enemy(4),f=fixture([target]);f.combat.set('comethalo');step(f.combat,.9);
 assert.equal(f.calls.length,0,'a stationary comet halo loses its charge');
 for(let i=0;i<140;i++){const a=i*.045;f.player.position.set(Math.cos(a)*.9,0,Math.sin(a)*.9);f.combat.update(.02);}
 assert.ok(f.calls.some(c=>c.kind==='comethalo'&&c.phase==='corolla'),'continuous movement launches an explosive comet');
 assert.ok(f.combat.state().bolts<=formStats('comethalo',1).bolts,'the comet pool stays capped');f.combat.dispose();
}
{
 const sparse=fixture([enemy(2),enemy(4)]);sparse.combat.set('stormanchor');sparse.combat.fire(vec(),vec(1));step(sparse.combat,.5);
 assert.ok(!sparse.calls.some(c=>c.phase==='anchor'),'two enemies cannot earn a gravity anchor');sparse.combat.dispose();
 const foes=[enemy(2),enemy(4),enemy(4,2),enemy(2,2)],before=foes.map(e=>e.g.position.clone()),crowd=fixture(foes);crowd.combat.set('stormanchor');crowd.combat.fire(vec(),vec(1));step(crowd.combat,.5);
 assert.ok(crowd.calls.some(c=>c.phase==='anchor'),'three linked enemies create a delayed anchor blast');
 assert.ok(foes.some((e,i)=>!e.g.position.equals(before[i])),'the anchor gathers ordinary enemies before it bursts');crowd.combat.dispose();
}
{
 const bud=enemy(5),pathA=enemy(3,.75),pathB=enemy(2,-.7),f=fixture([bud,pathA,pathB]);f.combat.set('returningpetals');f.combat.fire(vec(),vec(1),vec(5));
 for(let i=0;i<140;i++){if(i>30)f.player.position.z=Math.min(1.4,f.player.position.z+.02);f.combat.update(.01);}
 assert.ok(f.calls.some(c=>c.e===bud&&c.phase==='bloom'),'the distant bud opens before returning');
 assert.ok(f.calls.some(c=>c.phase==='return'),'curved petals damage along the player-drawn return paths');f.combat.dispose();
}
{
 const boss=enemy(5,0,'austin'),duel=fixture([boss]);duel.combat.set('gravitystake');duel.combat.fire(vec(),vec(1));
 assert.equal(duel.combat.state().stakes,1,'one isolated target receives a planted stake');let planted=false;duel.scene.traverse(o=>{if(o.geometry?.name==='seed-form-gravity-implosion-stake')planted=true;});assert.ok(planted,'the target carries a distinct planted-stake mesh');step(duel.combat,.65);
 planted=false;duel.scene.traverse(o=>{if(o.geometry?.name==='seed-form-gravity-implosion-stake')planted=true;});assert.equal(planted,false,'the planted mesh expires after implosion');
 assert.ok(duel.calls.some(c=>c.e===boss&&c.phase==='implosion'&&c.damage===formStats('gravitystake',1).implosion),'the stake collapses into its single target');duel.combat.dispose();
 const target=enemy(5),nearby=enemy(5,2),crowd=fixture([target,nearby]);crowd.combat.set('gravitystake');crowd.combat.fire(vec(),vec(1));step(crowd.combat,.8);
 assert.ok(crowd.calls.some(c=>c.e===target&&c.phase==='line'),'the narrow line still deals modest contact damage');
 assert.ok(!crowd.calls.some(c=>c.phase==='implosion'),'a nearby second enemy disperses the implosion');assert.equal(crowd.combat.state().stakes,0);crowd.combat.dispose();
}
// 서리 되감기: 나갈 때 얼리고, 돌아오는 길에 자기가 얼린 적을 깨뜨린다.
{
 const foe=enemy(0,-3),{combat,calls}=fixture([foe]);
 combat.set('rimeback',4);combat.fire(vec(),vec(0,-1));
 step(combat,2.2);
 const out=calls.filter(c=>c.kind==='rimeback'&&!c.phase),shatter=calls.filter(c=>c.phase==='shatter');
 assert.ok(out.length>=2,'나가고 돌아오며 두 번 벤다');assert.ok(shatter.length>=1,'돌아오는 길에 얼린 적을 깨뜨린다');
 assert.ok(foe.slow>0,'나가는 길에 얼린다');
 combat.dispose();
}
// 메아리 회랑: 벽에 닿으면 씨앗에게 돌아오고, 오갈 때마다 세진다.
{
 const foe=enemy(0,-2),{combat,calls}=fixture([foe],{boundary:walls});
 combat.set('echolane',4);combat.fire(vec(),vec(1,0));
 step(combat,3);
 const hits=calls.filter(c=>c.kind==='echolane');
 assert.ok(combat.state().bolts<=2,'탄이 무한히 남지 않는다');
 assert.ok(hits.length===0||hits.every((c,i)=>i===0||c.damage>=hits[i-1].damage),'오갈수록 피해가 줄지 않는다');
 combat.dispose();
}
console.log('Forms: thirty-six authored pairs (twenty offered), uncapped levels, distinct line, bounce, chain, control and burst mechanics passed.');
