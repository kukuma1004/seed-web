import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACTIVE,LAW_TAGS,TAG_NAMES,SIGNATURES,ULTIMATE_ARCHETYPES,ultimateArchetype,activeState,overdriveTags,overdriveFinale,createActiveGauge,chargeActive,killCharge,bossCharge,activeReady,startActive,tickActive,cancelActive,activeSummary,validActiveGauge,validActiveCooldown} from '../src/actives.js';
import {activeCombatEvolutions,orbitCore,canAcquireEvolution} from '../src/evolution-family.js';
import {ALL_FORMS,FORMS,SOLO_FORMS} from '../src/forms.js';
import {LAWS} from '../src/laws.js';
import {createFormCombat} from '../src/form-combat.js';
import {validCheckpoint} from '../src/run-save.js';

// Every law has a tag with a name, every evolution has a signature.
assert.deepEqual(Object.keys(LAW_TAGS).sort(),Object.keys(LAWS).sort());
for(const tag of Object.values(LAW_TAGS))assert.ok(TAG_NAMES[tag]);
assert.deepEqual(Object.keys(SIGNATURES).sort(),Object.keys(ALL_FORMS).sort());
for(const s of Object.values(SIGNATURES))assert.ok(s.name&&s.desc);
assert.equal(new Set(Object.values(SIGNATURES).map(s=>s.name)).size,Object.keys(ALL_FORMS).length,'signature names are unique');
assert.equal(Object.keys(ULTIMATE_ARCHETYPES).length,7);
// 차원(별문 심장)을 숨긴 동안 DOMAIN 궁극기는 나오지 않는다.
assert.deepEqual(['flarebloom','fullbloom','starring','glassspear','blackhole','winterbreath'].map(id=>ultimateArchetype([id]).id),['BURST','RAIN','ORBIT','BEAM','BLACKHOLE','TIME_STOP']);

// States follow the evolutions held: none, one, two or more (the two strongest; ties keep the first gained).
assert.equal(activeState(new Map()).state,'LOCKED');
assert.deepEqual(activeState(new Map([['prism',3]])),{state:'SIGNATURE',forms:['prism'],level:3});
const three=new Map([['prism',2],['collapse',5],['rewind',2]]);
assert.deepEqual(activeState(three),{state:'OVERDRIVE',forms:['collapse','prism'],level:7});
assert.equal(activeState(new Map([['nope',4]])).state,'LOCKED','unknown ids are ignored');
const tripleOrbit=new Map([['frostguard',5],['stormcrown',8],['mirrorguard',7],['collapse',4]]);
assert.deepEqual(activeState(tripleOrbit).forms,['stormcrown','collapse'],'only one orbit family may enter an overdrive');
assert.equal(orbitCore(tripleOrbit,ALL_FORMS),'stormcrown');
assert.deepEqual(activeCombatEvolutions(tripleOrbit,ALL_FORMS).map(x=>x.id),['stormcrown','collapse'],'only the strongest orbit combat stays active');
assert.equal(canAcquireEvolution(new Map([['stormcrown',3]]),'mirrorguard',ALL_FORMS),false,'a second orbit evolution is not offered');
assert.equal(canAcquireEvolution(new Map([['stormcrown',3]]),'stormcrown',ALL_FORMS),true,'the active orbit core may still be upgraded');

// Tags: union of the laws inside the chosen evolutions, each once.
assert.deepEqual(overdriveTags(['collapse','tidepull']),['CONTROL','EXPLOSION','RETURN']);
assert.deepEqual(overdriveTags(['fullbloom','prism']),['MULTI','BOUNCE']);
const plain=overdriveFinale([],2),full=overdriveFinale(Object.values(LAW_TAGS),2);
assert.equal(plain.hits,1);assert.equal(plain.arcs,0);assert.equal(plain.echoes,0);assert.equal(plain.pull,0);assert.equal(plain.slow,0);assert.equal(plain.rifts,0);
assert.ok(full.radius>plain.radius&&full.hits===2&&full.arcs===ACTIVE.maxArcs&&full.pull>0&&full.slow>0&&full.rifts===(Object.values(LAW_TAGS).includes('RIFT')?3:0)&&full.bossScale>1,'차원을 숨긴 동안은 틈이 열리지 않는다');
assert.ok(full.echoes<=ACTIVE.maxEchoes,'echoes are capped');
assert.ok(overdriveFinale([],10).damage>plain.damage,'the blast grows with evolution levels');
assert.ok(full.lines.length>=6);

// Gauge: kills fill it, bosses fill it through damage, it never fills while an active runs.
const g=createActiveGauge();
assert.equal(killCharge({type:'swarm'}),ACTIVE.kill);assert.equal(killCharge({type:'turret'}),ACTIVE.eliteKill);
assert.equal(killCharge({type:'warden',elite:true}),ACTIVE.eliteKill*2);assert.equal(killCharge({type:'warden'}),0);assert.equal(killCharge({type:'austin'}),0);
assert.equal(bossCharge(500,1000),ACTIVE.bossShare/2);assert.equal(bossCharge(5000,1000),ACTIVE.bossShare,'overkill counts once');
for(let i=0;i<Math.ceil(ACTIVE.max/ACTIVE.kill)-1;i++)chargeActive(g,ACTIVE.kill);
assert.ok(g.value<ACTIVE.max);assert.equal(activeReady(g,new Map([['prism',1]])),false);
chargeActive(g,ACTIVE.kill);assert.equal(g.value,ACTIVE.max);chargeActive(g,50);assert.equal(g.value,ACTIVE.max,'capped');
assert.equal(startActive(g,new Map()),null,'locked without an evolution');assert.equal(g.value,ACTIVE.max,'a refused start spends nothing');
const plan=startActive(g,new Map([['prism',2]]));
assert.equal(plan.state,'SIGNATURE');assert.equal(plan.seconds,ACTIVE.signatureSeconds);assert.equal(g.value,0);assert.equal(plan.finale,null);
assert.equal(plan.archetype,'RAIN');
chargeActive(g,40);assert.equal(g.value,0,'no charge while the active runs (no self-refilling loop)');
assert.equal(startActive(g,new Map([['prism',2]])),null,'no second start while running');
assert.equal(tickActive(g,ACTIVE.signatureSeconds-.1),null);const ended=tickActive(g,.2);assert.equal(ended,plan);assert.equal(g.plan,null);
// 2026-09-21: 안정화 없음 — 끝나자마자 다시 충전된다(발동 중에는 여전히 충전 안 됨).
assert.equal(ACTIVE.cooldownSeconds,0);assert.equal(g.cooldown,0);chargeActive(g,10);assert.equal(g.value,10,'사용 뒤 곧바로 충전');
assert.equal(createActiveGauge(0,10).cooldown,0,'예전 저장의 안정화 값은 0으로 읽는다');
g.value=ACTIVE.max;const od=startActive(g,three);
assert.equal(od.state,'OVERDRIVE');assert.equal(od.seconds,ACTIVE.overdriveSeconds);assert.deepEqual(od.tags,['CONTROL','EXPLOSION','BOUNCE','MULTI']);assert.ok(od.finale.pull>0&&od.finale.hits===2);
assert.equal(od.archetype,'BLACKHOLE');
cancelActive(g);assert.equal(g.plan,null);
assert.equal(createActiveGauge(250).value,ACTIVE.max);assert.equal(createActiveGauge(NaN).value,0);
assert.equal(createActiveGauge(0,999).cooldown,0);
const normalCycle=ACTIVE.max/(ACTIVE.kill*2)+ACTIVE.cooldownSeconds,fastCycle=ACTIVE.max/(ACTIVE.kill*8)+ACTIVE.cooldownSeconds;
// 충전 20% 빠르게: 일반 84마리. 초당 2마리면 약 42초, 초당 8마리 몰아잡기여도 10초는 넘는다.
assert.equal(Math.ceil(ACTIVE.max/ACTIVE.kill),84);
assert.ok(normalCycle>=40&&fastCycle>=10,`ultimate cadence (${normalCycle}s normal, ${fastCycle}s fast-clear)`);

// Texts for the pause sheet.
assert.equal(activeSummary(new Map(),g).state,'LOCKED');
assert.ok(activeSummary(new Map([['rewind',4]]),g).title===SIGNATURES.rewind.name);
assert.ok(activeSummary(three,g).title.includes(SIGNATURES.collapse.name)&&activeSummary(three,g).lines.some(l=>l.includes('끝날 때')));

// Saves: the gauge is optional, bounded, and solo evolutions are valid held forms.
const save={version:1,cycle:0,stage:1,mode:'entry',region:'garden',hp:90,rules:['split'],mutated:[],kills:20,elapsed:60,forms:{rewind:4},wardens:0,austins:0};
assert.ok(validCheckpoint(save),'solo evolution in a save');
assert.ok(validCheckpoint({...save,activeGauge:70}));assert.ok(validCheckpoint({...save,activeGauge:0}));
for(const bad of [-1,101,NaN,'50'])assert.ok(!validCheckpoint({...save,activeGauge:bad}),String(bad));
assert.ok(validCheckpoint({...save,activeCooldown:12.5}),'예전 저장의 안정화 값도 그대로 열린다');assert.ok(!validCheckpoint({...save,activeCooldown:ACTIVE.legacyCooldownMax+.1}));
assert.ok(validActiveGauge(undefined));assert.ok(validActiveCooldown(undefined));

// Every evolution's surge runs in the real combat code: its opening move and boosted attacks deal damage, then it calms down.
const V=THREE.Vector3;
for(const id of Object.keys(ALL_FORMS)){
 const enemies=Array.from({length:9},(_,i)=>({type:'swarm',hp:1e9,g:{position:new V(Math.cos(i*.7)*(1.4+i*.5),0,Math.sin(i*.7)*(1.4+i*.5))}}));
 const player={position:new V(0,0,0)};let damage=0;
 const shots=Array.from({length:6},(_,i)=>({life:2,boss:false,ob:{position:new V(Math.cos(i)*1.9,.7,Math.sin(i)*1.9)}}));
 const combat=createFormCombat(new THREE.Scene(),{player,enemies:()=>enemies,hit:(e,a)=>{damage+=a;return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null,enemyShots:()=>shots});
 combat.set(id,4);
 assert.equal(combat.surge(0),false,'a zero-length surge does nothing');
 assert.equal(combat.surge(ACTIVE.signatureSeconds,{aim:new V(1,0,0)}),true);
 assert.ok(combat.state().surge>0,id);
 for(let t=0;t<ACTIVE.signatureSeconds+.5;t+=.02){combat.update(.02);}
 assert.ok(damage>0,`${id} surge deals damage`);
 assert.equal(combat.state().surge,0,`${id} calms down on its own`);
 assert.ok(combat.state().bolts<=80,`${id} keeps projectiles bounded (${combat.state().bolts})`);
 combat.surge(2);combat.calm();assert.equal(combat.state().surge,0);
 combat.dispose();
}
assert.equal(Object.keys(FORMS).length+Object.keys(SOLO_FORMS).length,29,'공개된 손제작 조합 20 + 단독 진화 9');
console.log(`Actives: ${Object.keys(SIGNATURES).length} signatures, one orbit core, measured recharge cadence, stabilization, saves and every surge in real combat passed.`);
