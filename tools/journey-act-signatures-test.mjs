import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createJourneySignature,stepJourneySignature,creditJourneySignatureKill,journeySignatureMoveScale,journeySignatureAttackScale,journeySignatureHint,JOURNEY_SIGNATURE_RULES as R} from '../src/journey-act-signatures.js';
import {createCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege,buildCrystalSiege,harvestCrystalSiege,checkpointCrystalSiege,restoreCrystalSiege,stepCrystalSiegeBossFacilities,stepCrystalSiegeThreat} from '../src/crystal-siege-rules.js';
import {createExpansionThreat} from '../src/expansion-journey.js';
import {createJourneySignatureView} from '../src/journey-act-signature-view.js';
import {createJourneyPresentation} from '../src/journey-presentation.js';

assert.equal(createJourneySignature('garden'),null);assert.equal(createJourneySignature('stadium'),null);
for(let room=0;room<5;room++){
 const still=createJourneySignature('skyway',room),moving=createJourneySignature('skyway',room);let damageStill=0,damageMoving=0,warnings=0;const visited=new Set(),out=still.out;
 for(let t=0;t<42;t+=.02){
  const a=stepJourneySignature(still,.02,{player:{x:-8,z:5}});assert.equal(a,out);damageStill+=a.damage;warnings+=a.warning?1:0;
  // During the full warning, the player moves into the announced gap.
  const p={x:moving.phase==='quiet'?0:moving.lane,z:5};if(moving.phase==='storm')visited.add(moving.lane);
  const b=stepJourneySignature(moving,.02,{player:p});damageMoving+=b.damage;
  assert.equal(journeySignatureAttackScale(moving,{x:moving.lane,z:5}),moving.phase==='storm'?1.25:1);
  assert.equal(journeySignatureAttackScale(moving,{x:-8,z:5}),1);
 }
 assert(warnings>=3);assert.equal(visited.size,3);assert(damageStill>0);assert.equal(damageMoving,0);
 const before=moving.time;stepJourneySignature(moving,0,{player:{x:0,z:0}});stepJourneySignature(moving,NaN,{player:{x:0,z:0}});stepJourneySignature(moving,100,{player:{x:0,z:0}});assert(Math.abs(moving.time-before-.1)<1e-7,'background dt cannot spend whole storm cycles');
 const time=moving.time;stepJourneySignature(moving,1,{player:{x:0,z:0},cleared:true});assert.equal(moving.time,time);
}
const wind=createJourneySignature('crosswind'),player={x:3,z:0};
const kill={hp:0,dead:true,expansionActor:true,expansionThreat:{side:'front'},g:{position:{x:6,z:0}}};
assert(creditJourneySignatureKill(wind,kill,player));assert.equal(journeySignatureMoveScale(wind),1.4);assert(!creditJourneySignatureKill(wind,kill,player),'same real death never credits twice');
for(const change of [{hp:1},{dead:false},{expansionBoss:true},{expansionActor:false},{g:{position:{x:0,z:0}}},{expansionThreat:{side:'rear'}}])assert(!creditJourneySignatureKill(wind,{...kill,journeyWindCredited:false,...change},player));
for(let i=0;i<23;i++)stepJourneySignature(wind,.1,{player});assert.equal(journeySignatureMoveScale(wind),1);assert.equal(journeySignatureMoveScale(null),1);assert.equal(journeySignatureAttackScale(null,player),1);

function fixture(){const siege=createCrystalSiege(0,413),sig=createJourneySignature('crystalGorge');const node=siege.nodes[0];harvestCrystalSiege(siege,node.id,node);assert(buildCrystalSiege(siege,'pad-0','turret',siege.pads[0]).ok);assert(startCrystalSiegeDefense(siege).ok);return{siege,sig};}
const {siege,sig}=fixture(),p=siege.pads[0],target={id:'actual-threat',x:p.x+1,z:p.z,hp:100};
let out=stepCrystalSiege(siege,.1,{enemies:[target]});assert.equal(out.hits[0].damage,24,'shared uncommanded facility baseline');
p.cooldown=0;stepJourneySignature(sig,.1,{player:p,siege});out=stepCrystalSiege(siege,.1,{enemies:[target]});assert.equal(out.hits[0].damage,36,'player actually buffs the nearby paid turret');assert.equal(sig.rallyPad,p.id);assert(journeySignatureHint(sig,siege).includes('+50%'));
p.cooldown=0;stepJourneySignature(sig,.1,{player:{x:7,z:6},siege});assert.equal(stepCrystalSiege(siege,.1,{enemies:[target]}).hits[0].damage,24,'leaving the pad removes the aura');
p.hp=10;const resourceBefore=siege.resources;
for(let i=0;i<14;i++)stepJourneySignature(sig,.1,{player:p,siege});assert.equal(p.hp,10);stepJourneySignature(sig,.1,{player:p,siege});assert.equal(p.hp,35);assert.equal(siege.resources,resourceBefore-1);
const saved=checkpointCrystalSiege(siege);assert(!Object.hasOwn(saved,'journeyRallyPad'));const restored=restoreCrystalSiege(saved);assert.equal(restored.pads[0].hp,35);assert.equal(restored.resources,siege.resources);assert.equal(restored.journeyRallyPad,undefined);assert.deepEqual(checkpointCrystalSiege(restored),saved,'real paid HP/resources restore exactly');
for(let i=0;i<30;i++)stepJourneySignature(sig,.1,{player:p,siege});assert.equal(p.hp,35,'repair cooldown prevents repeated spending');
for(let i=0;i<30;i++)stepJourneySignature(sig,.1,{player:p,siege});assert.equal(p.hp,45);assert.equal(siege.resources,0,'cap HP and finite resources');
p.hp=0;for(let i=0;i<100;i++)stepJourneySignature(sig,.1,{player:p,siege});assert.equal(p.hp,0,'destroyed facilities require a real preparation rebuild');
const another=fixture();another.siege.pads[0].hp=12;for(let i=0;i<8;i++)stepJourneySignature(another.sig,.1,{player:another.siege.pads[0],siege:another.siege});for(let i=0;i<7;i++)stepJourneySignature(another.sig,.1,{player:{x:7,z:6},siege:another.siege});for(let i=0;i<8;i++)stepJourneySignature(another.sig,.1,{player:another.siege.pads[0],siege:another.siege});assert.equal(another.siege.pads[0].hp,12,'absence beyond the dodge grace still breaks a repair channel');
const boss=fixture();boss.siege.room=4;boss.siege.phase='clear';stepJourneySignature(boss.sig,.1,{player:boss.siege.pads[0],siege:boss.siege,boss:true});assert.equal(stepCrystalSiegeBossFacilities(boss.siege,.1,[{...target,x:boss.siege.pads[0].x,z:boss.siege.pads[0].z}]).hits[0].damage,36,'the same support matters against the genuine fifth-night boss');
function raiderCase(commanded){const f=fixture(),pad=f.siege.pads[0],raider=createExpansionThreat({id:'real-charger',type:'charger',position:{x:pad.x+2.2,z:pad.z},hp:70,speed:2.05,damage:7,shots:1,windup:.75,cooldown:1,bulletSpeed:5,side:'front'});let warned=false,hit=false;if(commanded)stepJourneySignature(f.sig,.1,{player:{x:7,z:6},siege:f.siege});for(let i=0;i<80;i++){const o=stepCrystalSiegeThreat(raider,.05,f.siege,{player:{x:7,z:6}});if(o.tell?.target===pad.id)warned=true;if(o.wallHit?.id===pad.id)hit=true;}return{f,warned,hit};}
const raider=raiderCase(true);assert(raider.warned&&raider.hit);assert(raider.f.siege.pads[0].hp<45,'the warned charger threatens an actual paid turret');
const sharedRaider=raiderCase(false);assert(!sharedRaider.warned&&!sharedRaider.hit);assert.equal(sharedRaider.f.siege.pads[0].hp,45,'uncommanded Survival/Defense preserve their original core target');

// Execute the shipping host observer, including the actual player damage hook.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf('function updateJourneySignature(dt){'),end=main.indexOf('\nfunction updateEscorts',start);
const ctx=vm.createContext({journeySignature:createJourneySignature('skyway'),survivalSession:null,mirrorSession:null,trainingSession:null,expansionJourney:null,player:{position:{x:-8,z:5}},journeySignatureContext:{player:{x:-8,z:5}},stepJourneySignature,roomCleared:false,invuln:0,shellTime:0,audio:{play(){}},journeyPresentation:createJourneyPresentation(),journeyPresentationEnabled:()=>true,hitPlayer(d){ctx.hp-=d;},hp:100});vm.runInContext(main.slice(start,end),ctx);for(let i=0;i<70;i++)ctx.updateJourneySignature(.1);assert(ctx.hp<100,'storm reaches the actual host hurt callback');assert.equal(ctx.journeyPresentation.state().kind,'opening','shipping tactical update reaches the presentation observer');
const hp=ctx.hp;ctx.survivalSession={};for(let i=0;i<100;i++)ctx.updateJourneySignature(.1);assert.equal(ctx.hp,hp,'Survival is excluded, even if a stale Journey signature exists');
assert(main.includes('e.onJourneyDefeat?.(e)'));assert(main.includes('journeySignatureMoveScale(journeySignature)'));assert(main.includes('journeySignatureAttackScale(journeySignature,player.position)'));
const nodes=[];globalThis.document={createElement(){const node={hidden:false,textContent:'',setAttribute(){},remove(){this.removed=true;}};nodes.push(node);return node;},body:{append(){}}};
const scene=new THREE.Scene(),view=createJourneySignatureView(scene),root=scene.children[0],signature=createJourneySignature('skyway'),objects=[...root.children];
const geometryIds=objects.map(o=>o.geometry.id),materialIds=objects.map(o=>o.material.id);let peak=0;
for(let i=0;i<20000;i++){stepJourneySignature(signature,.02,{player:{x:0,z:5}});view.update(signature,{x:0,z:5},{visible:true});assert.equal(root.children.length,5);peak=Math.max(peak,root.children.filter(o=>o.visible).length);}
assert.deepEqual(objects.map(o=>o.geometry.id),geometryIds);assert.deepEqual(objects.map(o=>o.material.id),materialIds);assert.equal(peak,4);assert.equal(nodes.length,1,'one bounded status element');
// Warning fills gradually rather than flashing; its edges still match the
// real 4.8-unit gap. One visible hint at a time, no extra world resources.
Object.assign(signature,{phase:'warning',lane:0,time:4.02});
view.update(signature,{x:0,z:5},{visible:true,hideHint:true});assert(root.visible&&nodes[0].hidden);const faint=objects[0].material.opacity,thin=objects[2].scale.x;
signature.time=5.75;view.update(signature,{x:0,z:5},{visible:true});assert(!nodes[0].hidden);assert(objects[0].material.opacity>faint);assert(objects[2].scale.x>thin);
for(const lane of [-5,0,5]){
 signature.lane=lane;view.update(signature,{x:lane,z:5},{visible:true,reducedMotion:true});
 assert.equal(objects[2].position.x,lane-R.stormHalfGap);assert.equal(objects[3].position.x,lane+R.stormHalfGap);
 const stable=[objects[0].material.opacity,objects[2].scale.x];signature.time=4.03;view.update(signature,{x:lane,z:5},{visible:true,reducedMotion:true});assert.deepEqual([objects[0].material.opacity,objects[2].scale.x],stable);
}
signature.phase='storm';view.update(signature,{x:0,z:5},{visible:true});assert.equal(objects[2].scale.x,.14);assert.equal(objects[2].material.color.getHex(),0xb7ecd1);
signature.phase='quiet';view.update(signature,{x:0,z:5},{visible:true});assert(objects.every(o=>!o.visible),'quiet interval leaves the field clear');
// Wind points forward; repair fills only inside the existing facility ring.
wind.tailwind=1;view.update(wind,player,{visible:true});assert.equal(objects[2].position.x,player.x+1.5);assert.equal(objects[2].rotation.z,-Math.PI*3/4);assert.equal(objects[3].rotation.z,-Math.PI/4);
const repair=fixture(),pad=repair.siege.pads[0];repair.sig.rallyPad=repair.sig.repairPad=pad.id;
for(const progress of [0,.25,.75,1,2]){
 repair.sig.repairCharge=R.repairTime*progress;view.update(repair.sig,pad,{visible:true,siege:repair.siege,reducedMotion:true});
 assert(objects[4].visible&&objects[2].visible);assert.equal(objects[2].rotation.z,0);assert.equal(objects[3].rotation.z,0);
 const width=1.1*Math.min(1,progress);assert.equal(objects[3].scale.x,width);assert.equal(objects[3].position.x-width/2,pad.x-.55);assert.equal(objects[3].visible,progress>0);
}
repair.sig.repairPad=null;view.update(repair.sig,pad,{visible:true,siege:repair.siege});assert(objects[4].visible&&!objects[2].visible&&!objects[3].visible,'support ring remains after repair; bar does not');
signature.phase='storm';view.update(signature,player,{visible:true});assert.equal(objects[2].rotation.z,0);assert.equal(objects[3].rotation.z,0);assert.equal(objects[3].scale.y,16,'returning to Act 3 resets the shared repair marker');
assert.deepEqual(objects.map(o=>o.geometry.id),geometryIds);assert.deepEqual(objects.map(o=>o.material.id),materialIds);
view.hide();assert.equal(root.visible,false);assert.equal(nodes[0].hidden,true);view.dispose();view.dispose();assert.equal(scene.children.length,0);assert(nodes[0].removed);delete globalThis.document;
console.log('Journey 3/4/5 signatures: storm lanes and dodge, honest front kills, real turret/support/repair, boss support, exact paid checkpoint, no other-mode leak and 20k fixed-geometry updates PASS.');
