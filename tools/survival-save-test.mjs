import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {createSurvivalSaveStore,validSurvivalSave,captureCombatFields,restoreCombatFields} from '../src/survival-save.js';
import {createSurvivalSession,survivalAct} from '../src/survival-rules.js';
import {createCombatAnalysis} from '../src/combat-analysis.js';
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const store=createSurvivalSaveStore(storage,'player-a');
const snapshot={version:1,id:'run-a',revision:0,session:{...createSurvivalSession(123),act:1,lap:1,time:945,legStartedAt:900,nextSupply:990,bossSpawned:true},
 progress:{hp:41,kills:217,score:1290,elapsed:945,choicesTaken:17,choiceKills:32,bankedUpgrades:12,levels:{frost:3},forms:{prism:4},inventory:{tonic:2},activeValue:34,activeCooldown:6,dashState:{id:null,charges:0,recharge:1.5},hasteTime:2},
 player:{position:[11,0,0],baseSlideTime:0,baseSlideCooldown:1,baseSlideLock:1,baseSlideTarget:[11,0,0],baseSlideDir:[.707,0,-.707],lastMove:[1,0,0]},
 pending:{offered:['chain','burst','frost'],bonus:[]},enemies:[{fields:{survivalBoss:true,type:'alwaysbeginner',hp:432,maxHp:8600,state:'tell',timer:.4,dir:{vector:[1,0,0]}},position:[5,0,-3],rotation:1}],
 hostiles:[{fields:{boss:true,spriteKey:'baseball',life:2,damage:14,speed:8,dir:{vector:[1,0,0]},origin:{vector:[3,0,-3]}},position:[6,.65,-3]}]};
const initial=store.write(snapshot,{fresh:true});assert(initial.ok);assert.equal(initial.value.revision,1);
assert.equal(createSurvivalSaveStore(storage,'player-b').read(),null,'account isolation');
const loaded=store.read();assert.equal(loaded.progress.hp,41);assert.equal(loaded.progress.choiceKills,32);assert.deepEqual(loaded.pending.offered,['chain','burst','frost']);
loaded.progress.inventory.tonic=1;loaded.pending=null;loaded.progress.levels.frost=4;
const committed=store.write(loaded);assert(committed.ok);assert.equal(store.write(loaded).reason,'conflict','stale tab cannot restore spent items');
assert.equal(store.read().progress.inventory.tonic,1);assert.equal(store.read().progress.levels.frost,4);assert.equal(store.read().progress.choiceKills,32);
assert(!store.end('wrong-run',2));assert(store.end('run-a',2));assert.equal(store.read(),null);assert.equal(store.write(committed.value).reason,'conflict','dead run cannot be resurrected');
assert.equal(createSurvivalSaveStore({getItem:()=>'{oops',setItem:()=>{}},'x').read(),null);
assert.equal(createSurvivalSaveStore({getItem:()=>null,setItem:()=>{throw Error('quota');}}).write(snapshot,{fresh:true}).reason,'storage');
for(const edit of [s=>s.progress.hp=0,s=>s.session.lab='boss',s=>s.session.act=3,s=>s.enemies=[],s=>s.hostiles[0].fields.dir=null,s=>s.player.baseSlideTarget=null,s=>s.progress.inventory.tonic=6,s=>s.session.time=NaN]){const s=structuredClone(initial.value);edit(s);assert(!validSurvivalSave(s));}

const original={hp:40,timer:.2,dir:new THREE.Vector3(1,0,-1),g:new THREE.Object3D(),config:{unsafe:'not serialized'}};
const fields=captureCombatFields(original);assert(!fields.g&&!fields.config);const actor={dir:new THREE.Vector3()};const oldVector=actor.dir;
restoreCombatFields(actor,fields,(...v)=>new THREE.Vector3(...v));assert.equal(actor.dir,oldVector);assert.equal(actor.hp,40);assert.deepEqual(actor.dir.toArray(),[1,0,-1]);
const renderActor={g:new THREE.Object3D(),config:{hp:10}};const renderObject=renderActor.g;restoreCombatFields(renderActor,{g:null,config:0},(...v)=>new THREE.Vector3(...v));assert.equal(renderActor.g,renderObject);assert.equal(renderActor.config.hp,10);

// Damage analysis is bounded without discarding prior damage/peak on resume.
const analysis=createCombatAnalysis();analysis.begin(0);for(let n=0;n<4000;n++)analysis.damage('prism',n===2?100:1,n);
const analysisSave=analysis.snapshot();assert(analysisSave.buckets.length<=3);const restored=createCombatAnalysis();restored.restore(analysisSave);restored.damage('prism',3,4000);const report=restored.finish(4001);assert.equal(report.total,4102);assert.equal(report.peak,100);

// Execute the real main.js restore function with lightweight scene hooks.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=main.indexOf('function restoreSurvivalWorld('),end=main.indexOf('// Choice/evolution transactions',start);
let offer=null;const nodes=new Map();const ctx=vm.createContext({
 THREE,V:THREE.Vector3,restoreCombatFields,survivalAct,enemies:[],enemyShots:[],player:{position:new THREE.Vector3()},playerMotion:{reset(){}},levels:new Map(),heldForms:new Map(),mutations:new Map(),mutated:new Set(),survivalOwner:()=> 'player-a',
 normalizeInventory:v=>({...v}),normalizeRunBonuses:v=>({...v}),mutationsFromSave:()=>[],syncLaws(){},syncForms(){},growth:{select(){}},effectiveLaws:()=>[],drawRoom(){},releaseEnemy(){},
 spawnSurvivalBoss(){const e={g:new THREE.Object3D(),dir:new THREE.Vector3(),survivalBoss:true};ctx.enemies.push(e);return e;},spawnSurvivalEnemy(){throw Error('fixture has only a boss');},
 baseSlideTarget:new THREE.Vector3(),baseSlideDir:new THREE.Vector3(),lastMove:new THREE.Vector3(),createDashState:id=>({id,charges:1,recharge:0}),createActiveGauge:(value,cooldown)=>({value,cooldown}),combatAnalysis:createCombatAnalysis(),
 $:key=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key);},audio:{setScene(){}},musicSceneFor:()=> 'stadium',cardChoice(mid,choices){offer=choices;ctx.mode='cards';},finishEvolutionChoices(){},togglePause(){ctx.paused=true;}
});
vm.runInContext(main.slice(start,end),ctx);ctx.restoreSurvivalWorld(initial.value);
assert.equal(ctx.hp,41);assert.equal(ctx.inventory.tonic,2);assert.equal(ctx.choicesTaken,17);assert.equal(ctx.choiceKills,32);assert.equal(ctx.survivalSession.nextSupply,990);assert.equal(ctx.survivalSession.rngState,123);
assert.equal(ctx.enemies[0].hp,432);assert.equal(ctx.enemies[0].timer,.4);assert.equal(ctx.enemyShots.length,1);assert.equal(ctx.enemyShots[0].life,2);assert.deepEqual(ctx.player.position.toArray(),[11,0,0]);assert.equal(ctx.baseSlideLock,1);assert.equal(ctx.activeGauge.cooldown,6);assert.deepEqual(offer,['chain','burst','frost']);
const playing=structuredClone(initial.value);playing.pending=null;ctx.enemyShots=[];ctx.restoreSurvivalWorld(playing);assert.equal(ctx.paused,true,'resume waits for player input');
console.log('Survival save: atomic choice/items, three-act state, boss/hostile restoration, base lock, stale-tab/death guards, account isolation, quota and bounded analysis passed.');
