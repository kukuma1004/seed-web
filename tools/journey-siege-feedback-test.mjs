import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installSiegeFeedbackHost,siegeFeedbackHostSource} from './siege-feedback-host-fixture.mjs';

// Execute the shipping main helper. Only GPU/audio sinks are bounded spies.
const receipts=[],muzzles=[],bursts=[],lines=[],sounds=[];
const c=installSiegeFeedbackHost({elapsed:0,
 expansionSiegeView:{recordSupport(...args){receipts.push(args);return true;}},
 vfx:{muzzle(...args){muzzles.push(args);},burst(...args){bursts.push(args);}},
 line(...args){lines.push(args);},audio:{play(id){sounds.push(id);}},
});
const pad={id:'pad-0',x:-3,z:-2.5},target=new THREE.Vector3(1,0,2.5),original=target.clone();
for(const damage of [0,-1,NaN,Infinity])assert.equal(c.showSiegeSupport(damage,pad.id,target,pad),false);
assert.equal(c.showSiegeSupport(10,pad.id,null,pad),false);assert.equal(c.showSiegeSupport(10,pad.id,target,null),false);
assert.equal(receipts.length+muzzles.length+bursts.length+lines.length+sounds.length,0,'zero actual damage cannot fabricate presentation or sound');
assert.equal(c.showSiegeSupport(7.25,pad.id,target,pad),true);assert.equal(receipts[0][0],7.25);assert.equal(receipts[0][1],pad.id);assert.equal(receipts[0][2],target,'the real current target reaches the view');
assert.equal(muzzles[0][2],'seed');assert.equal(bursts[0][0],target);assert.equal(bursts[0][2],3);assert.equal(bursts[0][3],.2);assert.equal(lines[0][1],target);
assert.deepEqual(muzzles[0][0].toArray(),[-3,.6,-2.5]);assert.equal(muzzles[0][1].y,0);assert.ok(Math.abs(muzzles[0][1].length()-1)<1e-9);assert(target.equals(original),'feedback never moves the damage target');assert.deepEqual(sounds,['shotCrystal']);

c.elapsed=.119;assert(c.showSiegeSupport(3,pad.id,target,pad));assert.equal(sounds.length,1,'sound is throttled while each real hit still renders');
c.elapsed=.12;assert(c.showSiegeSupport(4,pad.id,target,pad));assert.equal(sounds.length,2);
for(let i=0;i<50;i++){c.elapsed=.121;assert(c.showSiegeSupport(1,pad.id,target,pad));}
assert.equal(sounds.length,2);assert.equal(muzzles.length,53);assert.equal(bursts.length,muzzles.length);assert.equal(lines.length,muzzles.length);assert.equal(receipts.length,muzzles.length);
for(const args of muzzles){assert.equal(args[0],muzzles[0][0],'one origin vector is reused');assert.equal(args[1],muzzles[0][1],'one direction vector is reused');}
c.elapsed=.241;assert(c.showSiegeSupport(2,pad.id,target,pad));assert.equal(sounds.length,3);
c.elapsed=0;assert(c.showSiegeSupport(2,pad.id,target,pad));assert.equal(sounds.length,4,'a fresh run clock must not silence the next run');
c.elapsed=.01;assert(c.showSiegeSupport(2,pad.id,target,pad));assert.equal(sounds.length,4,'fresh-run reset does not bypass the normal interval');
assert(!/requestAnimationFrame|setInterval|setTimeout/.test(siegeFeedbackHostSource),'the helper never creates a second loop or timer');
const fallback=installSiegeFeedbackHost({expansionSiegeView:null});assert(fallback.showSiegeSupport(1,pad.id,target,pad),'old host fixtures still execute the actual helper with inert missing GPU/audio endpoints');
const installed=fallback.showSiegeSupport;installSiegeFeedbackHost(fallback);assert.equal(fallback.showSiegeSupport,installed,'installing an existing host retains its helper and vectors');
console.log('PASS shipping siege feedback helper: positive actual receipts/real target; zero damage emits nothing; pooled 3-shard hit and line; two reused vectors; .12s audio throttle; fresh-run clock reset; no timer/RAF. Source VM endpoints only, no native audio/browser proof.');
