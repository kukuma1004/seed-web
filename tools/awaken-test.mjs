import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS,TWIN,ALL_FORMS,AWAKEN,awakenOpeningEvery,baseFormOf,isAwakenedForm,isTwinForm,attackPartsOf,awakenedFormOf,formStats,formUpgradeLine} from '../src/forms.js';
import {awakenOptions,awakenLevel,awaken,slotsUsed,chooseLaw,formOffer} from '../src/progression.js';
import {createFormCombat} from '../src/form-combat.js';
import {evolutionFamily,isOrbitEvolution,activeUltimateEvolutions} from '../src/evolution-family.js';
import {SIGNATURES,activeState} from '../src/actives.js';
import {buildRecord,parseBuild} from '../src/ranking-build.js';
const V=THREE.Vector3;

// Existing ten stay intact; the opposite gravity branch is the first new final form.
assert.equal(Object.keys(AWAKEN_FORMS).length,11,'기존 10종과 신규 중력 분기 1종');
assert.ok(Object.values(AWAKEN_FORMS).every(a=>Object.hasOwn(FORMS,a.base)),'모든 각성의 기반 조합은 실제 선택에 남아 있음');
for(const a of Object.values(AWAKEN_FORMS)){
 assert.ok(FORMS[a.base]&&awakenedFormOf(a.base,a.addedSolo)===a.id&&baseFormOf(a.id)===a.base&&isAwakenedForm(a.id));
 assert.deepEqual([...a.requires],[...FORMS[a.base].requires]);assert.equal(a.passive,FORMS[a.base].passive);
 assert.ok(a.name&&a.desc&&a.strength&&a.weakness&&SIGNATURES[a.id]?.name);
}
assert.equal(new Set(Object.values(ALL_FORMS).map(f=>f.name)).size,Object.keys(ALL_FORMS).length);

// Fusion + one specified solo. Two solos must always make a separate twin.
{
 const forms=new Map([['collapse',4],['flarebloom',7]]);
 const [o]=awakenOptions(forms);assert.deepEqual(o,{id:'bigcrunch',from:['collapse','flarebloom']});
 assert.equal(awakenLevel(forms,o),7+Math.ceil(4/3),'stronger part plus a third of the weaker');
 assert.equal(awaken(forms,{id:'bigcrunch',from:['collapse','mirrormaze']}),false,'made-up options are refused');
 assert.equal(awaken(forms,o),true);assert.deepEqual([...forms],[['bigcrunch',9]]);assert.equal(slotsUsed(new Map(),forms),1,'two slots became one');
 // A third part feeds it.
 forms.set('flarebloom',6);assert.deepEqual(awakenOptions(forms),[{id:'bigcrunch',from:['flarebloom']}]);
 assert.equal(awaken(forms,{id:'bigcrunch',from:['flarebloom']}),true);assert.deepEqual([...forms],[['bigcrunch',11]]);
 // It levels up from cards like any evolution.
 assert.equal(chooseLaw(new Map(),formOffer('bigcrunch'),forms),true);assert.equal(forms.get('bigcrunch'),12);
}
assert.deepEqual(awakenOptions(new Map([['blackhole',5],['flarebloom',5]])),[{id:'emberhole',from:['flarebloom','blackhole']}]);
assert.deepEqual(awakenOptions(new Map([['collapse',5],['blackhole',5]])),[{id:'pulsegravity',from:['collapse','blackhole']}]);
assert.notEqual(awakenedFormOf('collapse','flarebloom'),awakenedFormOf('collapse','blackhole'));
assert.deepEqual(awakenOptions(new Map([['blackhole',5],['mirrormaze',5]])),[{id:'lensinghole',from:['mirrormaze','blackhole']}]);
// Every one of the 36 solo pairs has its own twin, independent of fusion awakenings.
{
 const solos=Object.keys(SOLO_FORMS);let pairs=0;
 for(let i=0;i<solos.length;i++)for(let j=i+1;j<solos.length;j++){const options=awakenOptions(new Map([[solos[i],5],[solos[j],5]]));assert.equal(options.length,1,`${solos[i]}+${solos[j]}`);assert.ok(TWIN_FORMS[options[0].id]);pairs++;}
 assert.equal(pairs,36);assert.equal(Object.keys(TWIN_FORMS).length,36);
}
for(const t of Object.values(TWIN_FORMS)){
 assert.ok(isTwinForm(t.id)&&t.parts.every(id=>SOLO_FORMS[id])&&SIGNATURES[t.id]?.name&&t.name&&t.desc);
 assert.deepEqual(attackPartsOf(t.id),[...t.parts]);
 assert.ok(t.synergy.name&&t.synergy.window>=2&&t.synergy.bonus>=.1&&t.synergy.bonus<=.25&&t.synergy.effects.length===2);
 const first=Object.values(FORMS).find(f=>[...f.requires].sort().join()===[...t.requires].sort().join());
 if(first){assert.notEqual(first.desc,t.desc,`${t.id}: a direct fusion and a twin awakening must fight differently`);}
}
assert.equal(new Set(Object.values(TWIN_FORMS).map(t=>t.synergy.name)).size,36,'Every twin pair has a distinct resonance.');
{
 const forms=new Map([['gravityspear',6],['blackhole',6]]);assert.deepEqual(awakenOptions(forms),[{id:'gravityspear',from:['blackhole']}]);
 assert.equal(awaken(forms,awakenOptions(forms)[0]),true);assert.deepEqual([...forms],[['gravityspear',8]]);
 const part=formStats('glassspear',5,{twin:true}),solo=formStats('glassspear',5);
 assert.ok(Math.abs(part.damage-solo.damage*TWIN.damage)<1e-9);assert.equal(formStats('gravityspear',5).twin,true);
}
assert.deepEqual(awakenOptions(new Map([['collapse',5],['prism',5]])),[]);
// Twin combats: each attack fights on its own with the twin sheet and its own opening timer.
{
 const enemies=[{hp:1e9,g:{position:new V(0,0,-4)},slow:0}];
 const opts={player:{position:new V()},enemies:()=>enemies,hit:()=>true,blocked:()=>false,boundary:()=>null,constrain:p=>p,vfx:null};
 const a=createFormCombat(new THREE.Scene(),opts),b=createFormCombat(new THREE.Scene(),opts);
 a.set('glassspear',6,{twin:true,openingDelay:2});b.set('blackhole',6,{twin:true,openingDelay:7});
 assert.equal(a.state().twin,true);assert.equal(b.state().awakenIn,7);
 for(let t=0;t<2.2;t+=.05){a.update(.05);b.update(.05);}
 assert.ok(a.state().awakenIn>AWAKEN.openingEvery-.5,'first attack opened');assert.ok(b.state().awakenIn>4,'second attack waits its turn');
 a.dispose();b.dispose();
}
// A solo shared by two fusions is offered for both; choosing one uses it up.
{const forms=new Map([['collapse',4],['tidepull',4],['blackhole',5]]);assert.equal(awakenOptions(forms).length,2);awaken(forms,awakenOptions(forms)[0]);assert.deepEqual(awakenOptions(forms),[]);}

// Stats: a lasting part of the surge, and the ultimate still adds more.
for(const a of Object.values(AWAKEN_FORMS)){
 const fusion=formStats(a.base,5),awake=formStats(a.id,5),surged=formStats(a.id,5,{surge:true});
  assert.equal(awake.awakened,true);
  // Some awakenings spread their power across more simultaneous bodies (the
  // maelstrom's second tide core), so compare the complete volley rather than
  // requiring every individual body to keep the old per-hit damage.
  const volley=s=>s.damage*(s.vortices||1);
  if(a.id==='pulsegravity'){
   assert.ok(awake.pulseWell&&awake.pulseDamage>0&&awake.damage<fusion.damage*.5,'other branch trades burst for repeated gravity damage');
  }else assert.ok(volley(awake)>=volley(fusion)*.85,a.id);
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
 combat.set('bigcrunch',6,{openingDelay:2});
 assert.equal(combat.state().active,'collapse');assert.equal(combat.state().evolution,'bigcrunch');
 for(let t=0;t<2.2;t+=.05)combat.update(.05);
 assert.ok(combat.state().wells>0,'the opening move planted wells');assert.ok(combat.state().awakenIn>awakenOpeningEvery('bigcrunch')-.5);
 enemies.length=0;for(let t=0;t<16;t+=.05)combat.update(.05);assert.equal(combat.state().awakenIn,0,'waits for an enemy instead of firing into an empty room');
 combat.set('collapse',6);assert.equal(combat.state().evolution,'collapse');assert.equal(combat.state().awakenIn,null);
 combat.dispose();
}
// Same fusion, different added solo: burst branch resolves in fewer large hits;
// gravity branch keeps a well active and deals bounded repeated pulses.
{
 const measure=id=>{
  const player={position:new V()},enemy={hp:1e9,g:{position:new V(0,0,-4)},slow:0};let damage=0;
  const combat=createFormCombat(new THREE.Scene(),{player,enemies:()=>[enemy],hit:(_e,amount)=>{damage+=amount;return true;},blocked:()=>false,boundary:()=>null,constrain:p=>p,vfx:null});
  combat.set(id,5,{openingDelay:50});
  for(let frame=0;frame<200;frame++){if(frame%19===0)combat.fire(player.position,new V(0,0,-1));combat.update(.05);}
  const hits=combat.state().hits;combat.dispose();return {damage,hits};
 };
 const burst=measure('bigcrunch'),gravity=measure('pulsegravity');
 assert.ok(gravity.hits>burst.hits*2,`gravity pulses ${gravity.hits}, burst hits ${burst.hits}`);
 assert.ok(gravity.damage>burst.damage*.55&&gravity.damage<burst.damage*1.8,'branch DPS stays bounded while hit rhythm changes');
}
// Saved builds and rankings keep awakened evolutions.
assert.deepEqual(parseBuild(buildRecord({forms:new Map([['maelstrom',8]])})).forms,[['maelstrom',8]]);
console.log('Awakening: eleven distinct fusion+solo branches and 36 separate solo+solo twins, feeding, level rule, lasting surge share, families, opening move and saved builds passed.');
