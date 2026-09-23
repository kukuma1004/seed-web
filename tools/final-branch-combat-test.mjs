import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ALL_FORMS,AWAKEN_FORMS} from '../src/forms.js';
import {FINAL_BRANCH_PATTERNS} from '../src/final-branch-patterns.js';
import {createFormCombat} from '../src/form-combat.js';

const candidates=Object.values(AWAKEN_FORMS).filter(f=>f.finalCandidate);
assert.equal(candidates.length,61);
assert.deepEqual(new Set(candidates.map(f=>f.id)),new Set(Object.keys(FINAL_BRANCH_PATTERNS)));
assert.equal(new Set(candidates.map(f=>FINAL_BRANCH_PATTERNS[f.id].ultimate)).size,61);
const V=THREE.Vector3;
let maxShots=0,maxEvents=0,maxFields=0;
const zeroFinal=[];
for(const form of candidates){
 const scene=new THREE.Scene(),player={position:new V(0,0,0)};
 const enemies=[[-4,-3],[-2,-5],[0,-4],[2,-5],[4,-3],[1.2,0]].map(([x,z])=>({type:'chaser',hp:1e8,g:{position:new V(x,0,z)},slow:0}));
 let damage=0,vfxCount=0,finalHits=0;
 const vfx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(name=>[name,()=>{vfxCount++;}]));
 const combat=createFormCombat(scene,{player,enemies:()=>enemies,hit:(_e,amount,metadata)=>{assert.ok(Number.isFinite(amount)&&amount>=0,form.id);if(metadata?.kind)assert.ok(ALL_FORMS[metadata.kind],`${form.id}: invalid hit kind ${metadata.kind}`);if(metadata?.phase==='final')finalHits++;damage+=amount;return true;},
  blocked:()=>false,boundary:()=>false,constrain:p=>p,vfx});
 combat.set(form.id,5,{openingDelay:1});
 for(let frame=0;frame<160;frame++){
  if(frame%18===0)combat.fire(player.position,new V(0,0,-1),enemies[2].g.position);
  if(frame===40)assert.equal(combat.surge(3,{aim:new V(0,0,-1)}),true);
  combat.update(.05);
  const s=combat.state();assert.equal(s.final.id,form.id);
  maxShots=Math.max(maxShots,s.final.shots);maxEvents=Math.max(maxEvents,s.final.events);maxFields=Math.max(maxFields,s.final.fields);
  assert.ok(s.final.shots<=20&&s.final.events<=24&&s.final.fields<=8,`${form.id}: bounded effect state`);
 }
 assert.ok(damage>0&&vfxCount>0,`${form.id}: branch fights visibly`);
 assert.ok(damage<250000,`${form.id}: runaway damage ${damage}`);
 if(!finalHits)zeroFinal.push(form.id);
 combat.clear();assert.equal(combat.state().final.id,null);
 combat.dispose();
}
console.log(`Final branch combat: ${candidates.length} lab-only branches fire, surge and clear; max queued ${maxShots} shots/${maxEvents} events/${maxFields} fields; no pattern damage ${zeroFinal.join(',')||'none'}.`);
