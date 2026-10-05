import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import * as THREE from 'three';
import * as adapter from '../src/survival-crystal-siege.js';import * as crystal from '../src/crystal-siege-rules.js';
import * as survival from '../src/survival-rules.js';import {createSurvivalExpansion} from '../src/survival-expansion.js';
import {captureSurvivalSession,captureCombatFields,validSurvivalSave,createSurvivalSaveStore} from '../src/survival-save.js';
import {survivalExpansionRankProgress} from '../src/survival-ranking.js';
import {CRYSTAL_DEFENSE_OBJECTIVE} from '../src/expansion-objective.js';
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function source(name){const start=main.indexOf('function '+name+'('),brace=main.indexOf('{',main.indexOf('){',start));assert(start>=0&&brace>start,name);let depth=0;for(let end=brace;end<main.length;end++){if(main[end]==='{')depth++;if(main[end]==='}'&&!--depth)return main.slice(start,end+1);}throw Error(name);}
const s=survival.createSurvivalSession(413,{actCount:5});Object.assign(s,{act:4,lab:'siege',siegeReview:true});
const dom=new Map(),data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
let normalWrites=0,cloudWrites=0,bosses=0,failed=0;
// VM objects have a different Object.prototype; marshal only its captured world
// across that realm like the JSON checkpoint boundary. Game state stays actual.
const ctx=vm.createContext({THREE,V:THREE.Vector3,...survival,CRYSTAL_DEFENSE_OBJECTIVE,survivalSiegeActive:()=>true,survivalSession:s,survivalSiegeApi:{...adapter,checkpointSurvivalSiegeReview:(state,world,threats,owner)=>adapter.checkpointSurvivalSiegeReview(state,JSON.parse(JSON.stringify(world)),threats,owner)},expansionSiegeApi:crystal,survivalSiege:adapter.createSurvivalSiege(s),survivalSiegeOwner:'a',survivalOwner:()=> 'a',localInspection:true,
 enemies:[],enemyShots:[],expansionSiegeInputs:[],expansionTerrain:null,arena:{shape:'rect',halfWidth:7.5,halfDepth:6.5},player:{position:new THREE.Vector3()},
 expansionJourneyView:{beginFrame(){},setSiegePhase(){},tell(){}},line(){},audio:{play(){}},$:id=>{if(!dom.has(id))dom.set(id,{textContent:''});return dom.get(id);},
 levels:new Map([['chain',3],['split',3]]),heldForms:new Map([['prism',4]]),survivalExpansion:createSurvivalExpansion(s),survivalSaveToken:{id:'review',revision:0,owner:'a'},
 combatAnalysis:{snapshot:()=>({start:0,damage:0,sources:[],buckets:[],sourceBuckets:[]})},packSurvivalActor:e=>({fields:captureCombatFields(e),position:e.g.position.toArray(),rotation:e.g.rotation.y}),captureCombatFields,captureSurvivalSession,
 hp:100,kills:0,score:0,choicesTaken:0,choiceKills:0,bankedUpgrades:12,elapsed:0,runDashes:0,runDamageTaken:0,inventory:{tonic:2},mutations:new Map(),mutationsToSave:()=>[],runBonuses:{},rerollUsed:false,hasteTime:0,shellTime:0,potionCD:0,selectedItem:null,dashState:{},dashLock:0,activeGauge:{value:100,cooldown:0},shootCD:0,playerSlow:0,invuln:0,
 baseSlideTime:0,baseSlideCooldown:0,baseSlideLock:-1,baseSlideTarget:new THREE.Vector3(),baseSlideDir:new THREE.Vector3(),lastMove:new THREE.Vector3(0,0,1),survivalPendingChoice:null,runBonusOffer:null,mode:'playing',rawStorage:storage,
 survivalStore(){normalWrites++;throw Error('normal account path');},settleSurvivalTitle(){throw Error('title promotion');},survivalCloud:{changed(){cloudWrites++;}},
 syncExpansionCrystals(){},createSurvivalExpansion,expansionApi:{createCrystalCombatBridge:()=>({sweep:()=>({blocked:false,hits:[]})})},
 damageEnemy(e,n){e.hp-=n;if(e.hp<=0)e.dead=true;},spawnSurvivalBoss(){bosses++;ctx.enemies.push({g:new THREE.Object3D(),hp:6216,maxHp:6216,survivalBoss:true});},finishSurvival(){failed++;},publishSurvivalSiegeInspection(){}
});
for(const name of ['spawnSurvivalEnemy','captureSurvivalSnapshot','saveSurvival','saveSurvivalSiegeReview','updateSurvivalSiege','moveSurvivalSiegeThreat'])vm.runInContext(source(name),ctx);
assert(ctx.saveSurvival());const first=storage.getItem(adapter.survivalSiegeReviewKey('a'));assert(first);const envelope=JSON.parse(first);assert.equal(validSurvivalSave(envelope.world),false);assert.equal(createSurvivalSaveStore(storage,'a').write(envelope.world,{fresh:true}).ok,false);assert(!survivalExpansionRankProgress({...s,lab:null},{acts:Object.fromEntries(['crosswind','crystalGorge'].map(k=>[k,{released:true}]))}).eligible);assert.equal(normalWrites,0);assert.equal(cloudWrites,0);
// Actual host proximity resource and spending/checkpoint, not a test-side resource grant.
ctx.player.position.set(-5,0,-4.5);ctx.updateSurvivalSiege(.1);assert.equal(ctx.survivalSiege.crystal.resources,5);ctx.updateSurvivalSiege(.1);assert.equal(ctx.survivalSiege.crystal.resources,5);
ctx.player.position.set(-3,0,-2.5);assert(crystal.buildCrystalSiege(ctx.survivalSiege.crystal,'pad-0','turret',ctx.player.position).ok);assert(ctx.saveSurvival());const built=adapter.restoreSurvivalSiegeReview(storage.getItem(adapter.survivalSiegeReviewKey('a')),'a');assert(built);assert.equal(built.siege.crystal.resources,2);assert.equal(built.siege.crystal.pads[0].kind,'turret');assert.equal(built.siege.crystal.nodes[0].harvested,true);
assert(adapter.startSurvivalSiege(ctx.survivalSiege));ctx.updateSurvivalSiege(.1);assert.equal(ctx.survivalSiege.spawned,0);ctx.updateSurvivalSiege(.1);ctx.updateSurvivalSiege(.1);ctx.updateSurvivalSiege(.1);assert.equal(ctx.enemies.length,3);assert(ctx.enemies.every(e=>e.survivalSiegeThreat&&e.hp===e.maxHp&&e.g.children.length===0));
assert(ctx.saveSurvival());const active=adapter.restoreSurvivalSiegeReview(storage.getItem(adapter.survivalSiegeReviewKey('a')),'a');assert(active);assert.equal(active.threats.length,3);assert.equal(active.world.enemies.length,3);
const model=ctx.enemies[0],before=model.g.position.clone();for(let i=0;i<60;i++)ctx.moveSurvivalSiegeThreat(model,1/60,1/60);assert(model.g.position.distanceTo(before)>0);assert.equal(ctx.hp,100,'core threats do not become ranged/player damage');
ctx.survivalSiege.crystal.core.hp=0;ctx.updateSurvivalSiege(.1);assert.equal(failed,1);assert.equal(normalWrites,0);assert.equal(cloudWrites,0);
// Manual start routes to correct mode; Journey paid fifth-night hook still strict.
assert.match(main,/if\(expansionJourney\?\.siege\)expansionSiegeApi.startCrystalSiegeDefense/);assert.match(main,/survivalSiegeApi\.startSurvivalSiege\(survivalSiege\)\)saveSurvival/);
assert.match(main,/if\(!survivalSiegeActive\(\)\)for\(let i=0;i<8;i\+\+\)spawnSurvivalEnemy/);
assert.match(main,/survivalSession\.siegeReview\)\{if\(!saveSurvival\(\)\)/);
const j=crystal.createCrystalSiege(0,1);assert(crystal.buildCrystalSiege(j,'pad-0','turret',j.pads[0]).ok);j.phase='clear';assert.equal(crystal.stepCrystalSiegeBossFacilities(j,.1,[{id:'boss',x:-3,z:-2,hp:100}]).hits.length,0);
console.log('Survival siege actual host: proximity harvest, paid facility, original instanced actor spawn, live-threat checkpoint, ownership/account/ranking guards, core failure and unchanged Journey boss gate PASS. Renderless VM; not browser/device or human balance approval.');
