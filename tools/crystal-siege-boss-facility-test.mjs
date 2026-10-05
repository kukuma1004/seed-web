import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import * as THREE from 'three';import * as journey from '../src/expansion-journey.js';import * as siege from '../src/crystal-siege-rules.js';
import {createExpansionEntry,validExpansionEntry} from '../src/expansion-run-save.js';import {constrainToArena} from '../src/arena.js';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),harness=readFileSync(new URL('./crystal-siege-endurance-test.mjs',import.meta.url),'utf8');
// Reuse the frozen endurance's real alive-enemy progression, finite synthetic
// attacks and host closures. No forced room clear or free boss-entry checkpoint.
const source=(name,next)=>main.slice(main.indexOf('function '+name+'('),main.indexOf('\nfunction '+next+'(',main.indexOf('function '+name+'(')));
const hostSource=harness.slice(harness.indexOf('function host(j){'),harness.indexOf('// No enemy is removed'));
const courseSource=harness.slice(harness.indexOf('function course({'),harness.indexOf("group('Actual host end-to-end")).replace(' return result;',' this.lastHost=h;this.lastJourney=j;return result;');
const scope={THREE,journey,siege,assert,vm,createExpansionEntry,validExpansionEntry,constrainToArena,source,updateSource:source('updateExpansionCourse','tickExpansionActor'),actorSource:source('tickExpansionActor','waveExpansionJourney'),copy:x=>JSON.parse(JSON.stringify(x)),earnedEntries:[],initialRun:{version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:2},score:0,choicesTaken:0,choiceKills:0}};
vm.createContext(scope);vm.runInContext(hostSource+'\n'+courseSource,scope);
for(const hz of [20,60]){
 const receipt=scope.course({seed:413,hz,layout:'turrets',shotDamage:40});assert(receipt.boss&&receipt.kills===165);const s=scope.lastJourney,h=scope.lastHost,dt=1/hz;
 assert.equal(s.siege.phase,'clear');
 // The inherited endurance callback models ordinary minion vulnerability.
 // Bosses use main's separate takenScale; generic recovery never adds 35%.
 h.damageEnemy=(enemy,n)=>{if(enemy.dead)return;enemy.hp-=n*(enemy.takenScale||1);if(enemy.hp<=0)enemy.dead=true;};
 const e={dead:false,expansionBoss:true,hp:2400,maxHp:2400,g:{position:new THREE.Vector3(3,0,-2.5),rotation:{}},state:'recover',takenScale:1,hit:0};h.enemies.push(e);
 const before=siege.checkpointCrystalSiege(s.siege),stats=siege.checkpointCrystalSiege(s.siege);h.updateExpansionCourse(0);assert.equal(e.hp,2400,'Paused boss update cannot fire');
 let total=0;for(let n=0;n<hz*3;n++){const hp=e.hp;h.updateExpansionCourse(dt);total+=hp-e.hp;assert(s.siege.out.snares.length===0,'Boss never slowed by retained snares');assert(s.siege.out.spawns.length===0);}
 assert(Math.abs(total-78)<1e-6,'Finite paid turrets use boss damage without generic recovery bonus');assert.equal(s.siege.core.hp,before.core.hp);assert.equal(s.siege.resources,before.resources);assert.deepEqual(s.siege.nodes,before.nodes);assert.equal(s.siege.spawned,before.spawned);
 for(const p of s.siege.pads)p.hp=0;const hp=e.hp;for(let n=0;n<hz;n++)h.updateExpansionCourse(dt);assert.equal(e.hp,hp,'Destroyed turrets cannot fire');
 Object.assign(s.siege.pads[0],{kind:'snare',hp:40,level:1,cooldown:0});assert.equal(siege.stepCrystalSiegeBossFacilities(s.siege,dt,[{id:'boss',x:3,z:-2.5,hp:2400}]).snares.length,0);
 const entry=scope.earnedEntries.find(x=>x.journey.phase==='boss');assert(entry&&validExpansionEntry(entry));assert.deepEqual(journey.checkpointExpansionJourney(journey.restoreExpansionJourney(entry.journey)),entry.journey,'Boss entrance paid facilities remain restorable');
 console.log('Actual earned fifth-night host boss facility PASS',hz+'Hz','turret damage='+total.toFixed(2),'165 finite synthetic kills; original boss completion not certified.');
}
for(const room of [0,3,4])for(const phase of ['prep','defense','failed']){const s=siege.createCrystalSiege(room,1);s.phase=phase;Object.assign(s.pads[0],{kind:'turret',hp:45,level:1,cooldown:0});assert.equal(siege.stepCrystalSiegeBossFacilities(s,.1,[{id:'boss',x:-3,z:-2.5,hp:2400}]).hits.length,0,'Wrong room/phase cannot earn boss support');}
const view=readFileSync(new URL('../src/crystal-siege-view.js',import.meta.url),'utf8');assert(view.includes("!boss&&s.phase===\'prep\'&&!!n&&!n.harvested"));assert(view.includes("boss?' 보스 결전"));assert(main.includes('boss:expansionJourney?.phase===\'boss\''));
console.log('Paused/dead/wrong phase/no snare/no harvest/public save boundaries maintained; boss visuals retained. Node host only, not actual browser/device boss victory.');
