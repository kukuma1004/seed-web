import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,formStats} from '../src/forms.js';
import {SLOT_CAP,offerChoices,chooseLaw,fuse,canFuse,fusionLevel,slotsUsed,effectiveLevels,buildLevel,formOffer,offeredForm} from '../src/progression.js';
import {validCheckpoint} from '../src/run-save.js';
import {createFormCombat} from '../src/form-combat.js';
import {copiedLaws} from '../src/turret.js';
import {formLawHint} from '../src/form-ui.js';

// Fusing removes both ingredient laws and the form takes a single slot.
const levels=new Map([['orbit',2],['frost',3],['split',1],['burst',1],['chain',1]]),forms=new Map();
assert.equal(slotsUsed(levels,forms),SLOT_CAP);
assert.equal(canFuse(levels,'frostguard'),true);assert.equal(fusionLevel(levels,'frostguard'),4);
assert.equal(fuse(levels,forms,'frostguard'),true);
assert.equal(levels.has('orbit')||levels.has('frost'),false,'both ingredients leave their slots');
assert.equal(forms.get('frostguard'),4,'the form keeps the ingredient levels');
assert.equal(slotsUsed(levels,forms),SLOT_CAP-1,'two slots became one');
assert.equal(canFuse(levels,'frostguard'),false);assert.equal(fuse(levels,forms,'frostguard'),false);

// The freed slot takes a fresh law again, including a former ingredient.
assert.ok(offerChoices(levels,{forms,random:()=>.3}).some(id=>!levels.has(id)&&!offeredForm(id)));
assert.equal(chooseLaw(levels,'orbit',forms),true);assert.equal(slotsUsed(levels,forms),SLOT_CAP);
assert.equal(chooseLaw(levels,'reflect',forms),false,'no sixth slot');

// Full slots offer upgrades of laws and of forms; a form upgrade raises only the form.
let seed=11;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
let sawForm=false;
for(let i=0;i<200;i++){
 const offer=offerChoices(levels,{forms,random});
 assert.ok(offer.every(id=>levels.has(id)||(offeredForm(id)&&forms.has(offeredForm(id)))));
 if(offer.includes(formOffer('frostguard')))sawForm=true;
}
assert.ok(sawForm,'held forms appear as upgrade offers');
assert.equal(chooseLaw(levels,formOffer('frostguard'),forms),true);assert.equal(forms.get('frostguard'),5);
assert.equal(chooseLaw(levels,formOffer('prism'),forms),false,'a form that is not held cannot be upgraded');

// Fusing the same pair again feeds the form already held instead of taking another slot.
const again=new Map([['orbit',1],['frost',1]]),held=new Map([['frostguard',5]]);
assert.equal(fuse(again,held,'frostguard'),true);assert.equal(held.get('frostguard'),6);assert.equal(held.size,1);

// Several different forms can be held at once.
const multi=new Map([['gravity',1],['burst',1],['recall',2],['pierce',1]]),owned=new Map();
assert.ok(fuse(multi,owned,'collapse')&&fuse(multi,owned,'returnblade'));
assert.deepEqual([...owned.keys()],['collapse','returnblade']);assert.equal(multi.size,0);assert.equal(owned.get('returnblade'),2);

// Laws inside forms still count for turrets, wardens, pressure and body parts.
const inside=effectiveLevels(new Map([['split',1]]),new Map([['frostguard',4]]));
assert.equal(inside.get('orbit'),4);assert.equal(inside.get('frost'),4);assert.equal(inside.get('split'),1);
assert.deepEqual(copiedLaws(inside),['orbit','frost']);
assert.equal(buildLevel(new Map([['split',2]]),new Map([['frostguard',4]])),6);

// Law card hint names the forms a pick would open.
assert.match(formLawHint('frost',new Set(['orbit'])),/서리 위성/);assert.equal(formLawHint('frost',new Set(['frost','orbit'])),'');

// Saves carry held forms and respect the five slots.
const base={version:1,cycle:0,stage:1,mode:'entry',region:'garden',hp:80,rules:['split'],mutated:[],kills:10,elapsed:20};
assert.equal(validCheckpoint({...base,forms:{frostguard:4,collapse:1}}),true);
assert.equal(validCheckpoint({...base,rules:['split','chain','reflect','pierce'],forms:{frostguard:4,collapse:1}}),false,'six slots');
assert.equal(validCheckpoint({...base,forms:{unknown:1}}),false);assert.equal(validCheckpoint({...base,forms:{collapse:0}}),false);
assert.equal(validCheckpoint({...base,forms:['collapse']}),false);

// Frost satellites now shatter enemy shots, the warden's included, and pulse a cold nova.
{
 const player={position:new THREE.Vector3()},calls=[];
 const foe={type:'hound',g:{position:new THREE.Vector3(1,0,0)},dead:false};
 const shots=[{life:3,ob:{position:new THREE.Vector3(2.5,0,0)}},{life:3,boss:true,ob:{position:new THREE.Vector3(-2.5,0,0)}}];
 const combat=createFormCombat(new THREE.Scene(),{player,enemies:()=>[foe],hit(e,d,meta){calls.push({d,...meta});return true;},blocked:()=>false,boundary:()=>false,constrain(){},vfx:{},enemyShots:()=>shots});
 combat.set('frostguard');combat.update(.01);
 assert.ok(shots.every(q=>q.life===0),'both shots shattered by satellites');
 const stats=formStats('frostguard',1);
 for(let t=0;t<stats.novaEvery+.05;t+=.05)combat.update(.05);
 const nova=calls.filter(c=>c.indirect&&c.kind==='frostguard');
 assert.ok(nova.length>=1,'the nova hits a nearby enemy');assert.equal(nova[0].d,stats.nova);assert.ok(foe.slow>=2.5);
 assert.ok(stats.damage>=40&&stats.satellites>=4,'satellite damage and count were raised');
 combat.dispose();
}
console.log('Fusion: two laws become one slot, freed slots refill, form upgrades and feeding, several forms at once, laws inside forms still count, saves, frost satellites block shots and pulse passed.');
