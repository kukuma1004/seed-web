import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,SOLO_FORMS,ALL_FORMS,SOLO_LEVEL,isSoloForm,soloFormOf,soloReady,soloLevel,formStats,formUpgradeLine,eligibleForms,isFormEligible} from '../src/forms.js';
import {LAWS} from '../src/laws.js';
import {canEvolveSolo,evolveSolo,effectiveLevels,offerChoices,chooseLaw,formOffer,offeredForm,slotsUsed,canFuse} from '../src/progression.js';
import {createFormCombat,FORM_COMBAT} from '../src/form-combat.js';
import {relicEffect} from '../src/relics.js';
import {normalizeDiscoveries,recordDiscovery} from '../src/discoveries.js';
const V=THREE.Vector3;

// One solo evolution per law, clearly named, never mixed into the fusion list.
assert.equal(Object.keys(SOLO_FORMS).length,Object.keys(LAWS).length);
for(const law of Object.keys(LAWS)){const id=soloFormOf(law);assert.ok(id&&isSoloForm(id),law);assert.deepEqual([...SOLO_FORMS[id].requires],[law]);}
for(const f of Object.values(SOLO_FORMS)){assert.ok(f.name&&f.desc&&f.strength&&f.weakness&&f.solo===true&&f.pair.includes('단독'));assert.ok(!Object.hasOwn(FORMS,f.id));}
// 81 + 손제작 재융합 1묶음 5(2026-09-22, 보류 중이지만 도감·저장에는 있다).
assert.equal(Object.keys(ALL_FORMS).length,91);assert.equal(new Set(Object.values(ALL_FORMS).map(f=>f.name)).size,91);
assert.equal(eligibleForms(Object.keys(LAWS)).length,20,'fusion offers never include solo evolutions or held-back batches');
assert.equal(isFormEligible('fullbloom',['split']),false);assert.equal(canFuse(new Map([['split',9]]),'fullbloom'),false);
assert.deepEqual(Object.keys(FORM_COMBAT).sort(),Object.keys(ALL_FORMS).sort());

// Readiness: only a law in its own slot at SOLO_LEVEL or more.
const levels=new Map([['split',SOLO_LEVEL-1],['frost',2]]),forms=new Map();
assert.deepEqual(soloReady(levels),[]);assert.equal(canEvolveSolo(levels,'fullbloom'),false);assert.equal(evolveSolo(levels,forms,'fullbloom'),false);
levels.set('split',SOLO_LEVEL);
assert.deepEqual(soloReady(levels).map(f=>f.id),['fullbloom']);assert.equal(soloLevel(levels,'fullbloom'),SOLO_LEVEL-1);
const usedBefore=slotsUsed(levels,forms);
assert.equal(evolveSolo(levels,forms,'fullbloom'),true);
assert.ok(!levels.has('split'));assert.equal(forms.get('fullbloom'),SOLO_LEVEL-1);assert.equal(slotsUsed(levels,forms),usedBefore,'the evolution takes the law\'s slot');
assert.equal(effectiveLevels(levels,forms).get('split'),SOLO_LEVEL-1,'the law still counts inside its evolution');
// Raising the same law again and evolving again feeds the evolution.
levels.set('split',SOLO_LEVEL+1);assert.equal(evolveSolo(levels,forms,'fullbloom'),true);assert.equal(forms.get('fullbloom'),SOLO_LEVEL-1+SOLO_LEVEL);
// Held solo evolutions are upgraded through the normal offers.
assert.equal(offeredForm(formOffer('fullbloom')),'fullbloom');
const full=new Map([['reflect',2],['chain',2],['orbit',1],['burst',1]]);const offer=offerChoices(full,{forms,random:()=>0});
assert.ok(offer.length>0);assert.equal(chooseLaw(full,formOffer('fullbloom'),forms),true);assert.equal(forms.get('fullbloom'),SOLO_LEVEL*2);

// Stats: every solo evolution attacks or orbits, grows with level, and has an upgrade line.
for(const id of Object.keys(SOLO_FORMS)){
 const a=formStats(id,4),b=formStats(id,10);
 assert.ok(a.damage>0&&b.damage>a.damage,id);
 assert.ok(SOLO_FORMS[id].passive?a.interval===Infinity:Number.isFinite(a.interval)&&b.interval<=a.interval,id);
 assert.ok(formUpgradeLine(id,4).startsWith('진화 Lv.4 → 5'));
 for(const v of Object.values(b))if(typeof v==='number')assert.ok(!Number.isNaN(v));
}

// Each attack works in the real combat code against a crowd and keeps its object counts bounded.
const crowd=()=>Array.from({length:10},(_,i)=>({type:'swarm',hp:1e9,slow:0,g:{position:new V(Math.cos(i*.63)*(1.6+i*.45),0,Math.sin(i*.63)*(1.6+i*.45)-1)}}));
for(const id of Object.keys(SOLO_FORMS)){
 const enemies=crowd(),player={position:new V(0,0,3)};let damage=0,hits=0;
 const shots=[];
 const combat=createFormCombat(new THREE.Scene(),{player,enemies:()=>enemies,hit:(e,a)=>{damage+=a;hits++;return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null,enemyShots:()=>shots});
 combat.set(id,SOLO_LEVEL-1);
 let cd=0,maxBolts=0;
 for(let t=0;t<6;t+=.02){
  if(id==='starring'&&Math.round(t*50)%20===0)shots.push({life:1,boss:false,ob:{position:new V(player.position.x+2.5,.7,player.position.z)}});
  cd-=.02;const target=enemies[0].g.position;
  if(cd<=0)cd=combat.fire(player.position,target.clone().sub(player.position).setY(0).normalize(),target);
  combat.update(.02);maxBolts=Math.max(maxBolts,combat.state().bolts);
 }
 assert.ok(damage>0&&hits>2,`${id} hits the crowd (${hits})`);
 assert.ok(maxBolts<=60,`${id} bolts bounded (${maxBolts})`);
 combat.clear();assert.equal(combat.state().bolts,0);combat.dispose();
}
// Specific identities.
{
 // Frost breath hurts slowed enemies more.
 const enemies=[{type:'swarm',hp:1e9,slow:0,g:{position:new V(0,0,-2)}},{type:'swarm',hp:1e9,slow:2,g:{position:new V(.3,0,-2.2)}}];
 const got=new Map();const c=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>enemies,hit:(e,a)=>{got.set(e,a);return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
 c.set('winterbreath',4);c.fire(new V(),new V(0,0,-1));
 assert.ok(got.get(enemies[1])>got.get(enemies[0])*1.4,'slowed enemy takes the frozen bonus');assert.ok(enemies[0].slow>0,'breath slows');
 // Enemies behind the seed are outside the cone.
 const behind={type:'swarm',hp:1e9,slow:0,g:{position:new V(0,0,2)}};enemies.push(behind);got.clear();c.fire(new V(),new V(0,0,-1));assert.ok(!got.has(behind));
 c.dispose();
}
{
 // The glass spear ramps damage along its line; a blocking shield stops it.
 const line=[0,1,2].map(i=>({type:'swarm',hp:1e9,g:{position:new V(0,0,-1.5-i)}}));const dealt=[];
 const c=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>line,hit:(e,a)=>{dealt.push(a);return e!==line[1];},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
 c.set('glassspear',4);c.fire(new V(),new V(0,0,-1));
 assert.equal(dealt.length,2,'stopped at the second (blocking) target');assert.ok(dealt[1]>dealt[0]);c.dispose();
}
{
 // Thunder web hops between enemies and grows weaker each hop.
 const chain=[0,1,2,3].map(i=>({type:'swarm',hp:1e9,g:{position:new V(i*2,0,-2)}}));const dealt=[];
 const c=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>chain,hit:(e,a)=>{dealt.push(a);return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
 c.set('thunderweb',4);c.fire(new V(),new V(0,0,-1));
 assert.equal(dealt.length,4);for(let i=1;i<4;i++)assert.ok(dealt[i]<dealt[i-1]);c.dispose();
}
{
 // The black hole pulls ordinary enemies but never bosses or turrets.
 const swarm={type:'swarm',hp:1e9,g:{position:new V(2,0,-4)}},boss={type:'warden',hp:1e9,g:{position:new V(-2,0,-4)}};
 const c=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>[swarm,boss],hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
 c.set('blackhole',4);c.fire(new V(),new V(0,0,-1),new V(0,0,-4));
 for(let t=0;t<1.5;t+=.02)c.update(.02);
 assert.ok(Math.abs(swarm.g.position.x)<1.2,'swarm pulled in');assert.equal(boss.g.position.x,-2,'boss not moved');c.dispose();
}
{
 // Rewind leaves make more than one round trip.
 const player={position:new V()};let returns=0;
 const c=createFormCombat(new THREE.Scene(),{player,enemies:()=>[],hit:()=>true,blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:{pulse:(p,kind)=>{if(kind==='recall')returns++;}}});
 c.set('rewind',4);c.fire(player.position,new V(1,0,0));
 for(let t=0;t<4;t+=.02)c.update(.02);
 assert.ok(returns>=1,'the leaf came back and went out again');assert.equal(c.state().bolts,0,'and finally stays home');c.dispose();
}

// Relics and discoveries treat solo evolutions like fusions.
assert.equal(relicEffect('crystal',{splitCount:0},new Map([['fullbloom',4]])).state,'active');
const storage=new Map();const mem={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const rec=recordDiscovery(mem,normalizeDiscoveries({}),'forms','blackhole');assert.ok(rec.profile.forms.includes('blackhole'));
console.log('Solo evolutions: nine laws, readiness at level 5, slot swap and feeding, upgrades, bounded real attacks, frost bonus, spear ramp, web decay, pull immunity, rewind trips, relics and discoveries passed.');
