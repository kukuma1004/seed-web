import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,SOLO_FORMS,AWAKEN_FORMS,ALL_FORMS,AWAKEN,baseFormOf,isAwakenedForm,awakenedFormOf,formStats,formUpgradeLine} from '../src/forms.js';
import {awakenOptions,awakenLevel,awaken,slotsUsed,chooseLaw,formOffer} from '../src/progression.js';
import {createFormCombat} from '../src/form-combat.js';
import {evolutionFamily,isOrbitEvolution,activeUltimateEvolutions} from '../src/evolution-family.js';
import {SIGNATURES,activeState} from '../src/actives.js';
import {buildRecord,parseBuild} from '../src/ranking-build.js';
const V=THREE.Vector3;

// One awakened evolution per fusion, named apart from every other evolution and signature.
assert.equal(Object.keys(AWAKEN_FORMS).length,Object.keys(FORMS).length);
for(const a of Object.values(AWAKEN_FORMS)){
 assert.ok(FORMS[a.base]&&awakenedFormOf(a.base)===a.id&&baseFormOf(a.id)===a.base&&isAwakenedForm(a.id));
 assert.deepEqual([...a.requires],[...FORMS[a.base].requires]);assert.equal(a.passive,FORMS[a.base].passive);
 assert.ok(a.name&&a.desc&&a.strength&&a.weakness&&SIGNATURES[a.id]?.name);
}
assert.equal(new Set(Object.values(ALL_FORMS).map(f=>f.name)).size,Object.keys(ALL_FORMS).length);

// Fusion + solo of one of its laws, or both solos. Other solo pairs have no recipe.
{
 const forms=new Map([['collapse',4],['blackhole',7]]);
 const [o]=awakenOptions(forms);assert.deepEqual(o,{id:'bigcrunch',from:['collapse','blackhole']});
 assert.equal(awakenLevel(forms,o),7+Math.ceil(4/3),'stronger part plus a third of the weaker');
 assert.equal(awaken(forms,{id:'bigcrunch',from:['collapse','mirrormaze']}),false,'made-up options are refused');
 assert.equal(awaken(forms,o),true);assert.deepEqual([...forms],[['bigcrunch',9]]);assert.equal(slotsUsed(new Map(),forms),1,'two slots became one');
 // A third part feeds it.
 forms.set('flarebloom',6);assert.deepEqual(awakenOptions(forms),[{id:'bigcrunch',from:['flarebloom']}]);
 assert.equal(awaken(forms,{id:'bigcrunch',from:['flarebloom']}),true);assert.deepEqual([...forms],[['bigcrunch',11]]);
 // It levels up from cards like any evolution.
 assert.equal(chooseLaw(new Map(),formOffer('bigcrunch'),forms),true);assert.equal(forms.get('bigcrunch'),12);
}
assert.deepEqual(awakenOptions(new Map([['blackhole',5],['flarebloom',5]])),[{id:'bigcrunch',from:['blackhole','flarebloom']}]);
assert.deepEqual(awakenOptions(new Map([['blackhole',5],['mirrormaze',5]])),[]);
assert.deepEqual(awakenOptions(new Map([['collapse',5],['prism',5]])),[]);
// A solo shared by two fusions is offered for both; choosing one uses it up.
{const forms=new Map([['collapse',4],['tidepull',4],['blackhole',5]]);assert.equal(awakenOptions(forms).length,2);awaken(forms,awakenOptions(forms)[0]);assert.deepEqual(awakenOptions(forms),[]);}

// Stats: a lasting part of the surge, and the ultimate still adds more.
for(const a of Object.values(AWAKEN_FORMS)){
 const fusion=formStats(a.base,5),awake=formStats(a.id,5),surged=formStats(a.id,5,{surge:true});
 assert.equal(awake.awakened,true);assert.ok(awake.damage>=fusion.damage*.85,a.id);
 if(Number.isFinite(fusion.interval))assert.ok(awake.interval<fusion.interval&&surged.interval<awake.interval,a.id);
 assert.ok(surged.damage>awake.damage,a.id);assert.match(formUpgradeLine(a.id,5),/진화 Lv\.5 → 6/);
}
// Families: an awakened evolution counts as its fusion (and as the orbit core when that fusion orbits).
assert.equal(evolutionFamily('frostarmada'),'orbit');assert.equal(isOrbitEvolution('mirrorhall'),true);assert.equal(evolutionFamily('bigcrunch'),'collapse');
assert.deepEqual(activeUltimateEvolutions(new Map([['bigcrunch',9],['collapse',3]]),ALL_FORMS).map(e=>e.id),['bigcrunch']);
assert.equal(activeState(new Map([['bigcrunch',9]])).state,'SIGNATURE');

// Combat: fights with the fusion's attack and repeats the opening move on its own when enemies are near.
{
 const enemies=[{hp:1e9,g:{position:new V(0,0,-4)},slow:0}];let damage=0;
 const combat=createFormCombat(new THREE.Scene(),{player:{position:new V()},enemies:()=>enemies,hit:(e,a)=>{damage+=a;return true;},blocked:()=>false,boundary:()=>null,constrain:p=>p,vfx:null});
 combat.set('bigcrunch',6);
 assert.equal(combat.state().active,'collapse');assert.equal(combat.state().evolution,'bigcrunch');
 for(let t=0;t<2.2;t+=.05)combat.update(.05);
 assert.ok(combat.state().wells>0,'the opening move planted wells');assert.ok(combat.state().awakenIn>AWAKEN.openingEvery-.5);
 enemies.length=0;for(let t=0;t<12;t+=.05)combat.update(.05);assert.equal(combat.state().awakenIn,0,'waits for an enemy instead of firing into an empty room');
 combat.set('collapse',6);assert.equal(combat.state().evolution,'collapse');assert.equal(combat.state().awakenIn,null);
 combat.dispose();
}
// Saved builds and rankings keep awakened evolutions.
assert.deepEqual(parseBuild(buildRecord({forms:new Map([['maelstrom',8]])})).forms,[['maelstrom',8]]);
console.log('Awakening: ten recipes, fusion+solo and solo+solo paths, feeding, level rule, lasting surge share, families, self-repeating opening move and saved builds passed.');
