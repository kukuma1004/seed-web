import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,SECOND_FORMS,ALL_FORMS,secondFormOf,formStats} from '../src/forms.js';
import {secondFusionOptions,secondFusionLevel,fuseSecond,slotsUsed,effectiveLevels} from '../src/progression.js';
import {createFormCombat} from '../src/form-combat.js';
import {validCheckpoint} from '../src/run-save.js';

const entries=Object.values(SECOND_FORMS);
assert.equal(entries.length,990);
assert.equal(entries.filter(f=>f.family==='resonance').length,360);
assert.equal(entries.filter(f=>f.family==='convergence').length,630);
for(const form of entries){
 assert.equal(form.parts.length,2,form.id);
 assert.ok(form.parts.every(id=>Object.hasOwn(FORMS,id)),form.id);
 assert.equal(secondFormOf(...form.parts),form.id);
 const stats=formStats(form.id,4);
 assert.ok(stats.damage>0&&Number.isFinite(stats.interval)&&stats.bolts<=3,form.id);
 assert.equal(stats.secondFamily,form.family);
}

const resonance=entries.find(f=>f.family==='resonance'),convergence=entries.find(f=>f.family==='convergence');
const held=new Map([[resonance.parts[0],4],[resonance.parts[1],7],['collapse',2]]);
const option=secondFusionOptions(held).find(o=>o.id===resonance.id);
assert.ok(option);assert.equal(secondFusionLevel(held,option),9);
const before=slotsUsed(new Map(),held);assert.equal(fuseSecond(held,option),true);
assert.equal(held.get(resonance.id),9);assert.ok(!held.has(resonance.parts[0])&&!held.has(resonance.parts[1]));
assert.equal(slotsUsed(new Map(),held),before-1,'two first fusions become one slot');
for(const law of resonance.requires)assert.ok(effectiveLevels(new Map(),held).has(law),`${law} remains effective inside the second fusion`);
assert.equal(fuseSecond(held,option),false,'spent parts cannot be fused twice');

const save={version:1,cycle:0,stage:1,mode:'entry',region:'garden',hp:90,rules:[],mutated:[],kills:20,elapsed:60,forms:{[resonance.id]:9},wardens:0,austins:0};
assert.ok(validCheckpoint(save),'second fusions survive room-entry saves');
assert.ok(Object.hasOwn(ALL_FORMS,resonance.id));

const V=THREE.Vector3;
function combatFor(form){
 const foe={type:'swarm',hp:1e9,dead:false,g:{position:new V(1.4,0,0)}};const calls=[];
 const combat=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>[foe],hit:(e,damage,meta)=>{calls.push({damage,...meta});return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
 combat.set(form.id,4);return {combat,foe,calls};
}
const step=(combat,seconds)=>{for(let t=0;t<seconds;t+=.01)combat.update(.01);};
{
 const {combat,calls}=combatFor(resonance);
 for(let i=0;i<3;i++){combat.fire(new V(),new V(1,0,0));step(combat,.7);}
 assert.equal(calls.filter(c=>c.resonance).length,1,'every third landed hit creates one resonance follow-up');
 assert.ok(combat.state().secondHits>=3);assert.ok(combat.state().bolts<=3);combat.dispose();
}
{
 const {combat,calls}=combatFor(convergence);
 combat.fire(new V(),new V(1,0,0));step(combat,.7);
 combat.fire(new V(),new V(1,0,0));step(combat,.7);
 assert.equal(calls.filter(c=>c.convergence).length,1,'the consuming shot detonates the first shot mark');
 assert.equal(combat.state().secondPhase,2);assert.ok(combat.state().bolts<=3);combat.dispose();
}

console.log('Second fusion: 990 recipes, bounded stats, slot/save migration, resonance cadence and convergence mark-consume combat passed.');
