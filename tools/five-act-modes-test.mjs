import assert from 'node:assert/strict';
import {createSurvivalSession,survivalAct,survivalActCount,settleSurvivalKill,advanceSurvivalAct,survivalScaling,survivalSpawn,survivalOutcome} from '../src/survival-rules.js';
import {createSurvivalExpansion,migrateSurvivalToFiveActs} from '../src/survival-expansion.js';
import {validSurvivalSave,createSurvivalSaveStore} from '../src/survival-save.js';
import {createDefense,defenseWaveInfo,defensePath,defensePathLength,defensePoint,plantDefense,startDefenseWave,stepDefense,defenseHurt,checkpointDefense,restoreDefense,migrateDefenseToFiveActs} from '../src/seed-defense-rules.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';
import {defenseRankEntry,defenseExpansionRankProgress} from '../src/defense-ranking.js';
import {survivalExpansionRankProgress} from '../src/survival-ranking.js';
import {createDefenseCrystalWalls} from '../src/seed-defense-expansion.js';
import {DEFENSE_FORMS} from '../src/seed-defense-catalog.js';

// Real rules/engines with deterministic orchestration; not an input/GPU test.
const legacy=createSurvivalSession(4);assert.equal(survivalActCount(legacy),3);
const survival=createSurvivalSession(4,{actCount:5}),bosses=[];
for(let n=0;n<15;n++){
 bosses.push(survivalAct(survival).type);survival.time+=190;survival.bossSpawned=true;
 const before=survival.completedLaps;settleSurvivalKill(survival,{boss:true});
 assert.equal(survival.completedLaps,before+Number(survival.act===4));assert(advanceSurvivalAct(survival));
}
assert.deepEqual(bosses.slice(0,5),['austin','alwaysbeginner','tempestcarrier','crosswindKeeper','crystalGardener']);
assert.equal(survival.lap,3);assert.equal(survival.completedLaps,3);assert.match(survivalOutcome(survival).label,/다섯/);
assert(survivalScaling({...survival,lap:3}).hp>survivalScaling({...survival,lap:2}).hp);
for(const act of [3,4]){const s={...createSurvivalSession(7,{actCount:5}),act};let front=0,rear=0;for(let n=0;n<120;n++){const p=survivalSpawn(s,{x:0,z:0});assert(p&&Math.hypot(p.x,p.z)>=10);assert(Math.abs(p.x)<=22.8&&Math.abs(p.z)<=18.8);if(act===3){if(p.x>0)front++;else rear++;}}
 if(act===3){assert(front>rear&&rear>0,'front-led groups include rear flankers');}
 const adapter=createSurvivalExpansion(s);assert(adapter);assert.equal(adapter.terrain.length,act===4?8:0);
 let emitted=0,tells=0,core=0;for(let n=0;n<400;n++){const out=adapter.stepBoss(.05,{position:{x:8,z:0},player:{x:0,z:0}});emitted+=out.bolts.length;tells+=out.events.filter(e=>e.type==='boss-tell').length;core+=Number(out.coreOpen);assert(out.bolts.length<=8);}
 assert(emitted>0&&tells>0);if(act===4)assert(core>0);
 const same=createSurvivalExpansion(s,adapter.checkpoint());assert.deepEqual(same.checkpoint(),adapter.checkpoint());
}

function snapshot(s){return {version:1,id:'five-save',revision:1,savedAt:1,session:s,progress:{hp:40,kills:7,score:70,choicesTaken:2,choiceKills:1,bankedUpgrades:4,elapsed:s.time,levels:{frost:2},forms:{prism:3},inventory:{tonic:3,revive:1}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[1,0,0],lastMove:[1,0,0]},enemies:[],hostiles:[],expansion:s.act>=3?createSurvivalExpansion(s).checkpoint():null};}
const old=snapshot({...legacy,act:1,lap:2,completedLaps:2,fastestLap:650,time:1600,legStartedAt:1500});
const migrated=migrateSurvivalToFiveActs(old);assert(validSurvivalSave(migrated));assert.deepEqual(migrated.progress,old.progress);assert.deepEqual(migrated.player,old.player);assert.equal(migrated.session.act,1);assert.equal(migrated.session.lap,2);assert.equal(migrated.session.completedLaps,0);assert.equal(migrated.session.legacyCompletedLaps,2);
for(const act of [3,4]){const saved=snapshot({...createSurvivalSession(7,{actCount:5}),act});assert(validSurvivalSave(saved));const storage=new Map(),store=createSurvivalSaveStore({getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},'tester');assert(store.write(saved,{fresh:true}).ok);assert.equal(store.read().session.act,act);const first=store.read();assert(store.write(first).ok);assert(!store.write(first).ok,'stale expansion checkpoint cannot overwrite accepted revision');for(const mutate of [s=>s.expansion=null,s=>s.expansion.boss.id='austin',s=>s.expansion.walls.push({id:'bad',hp:1})]){const bad=structuredClone(saved);mutate(bad);assert(!validSurvivalSave(bad));}}
assert.equal(survivalExpansionRankProgress(migrated.session).eligible,false);

assert.deepEqual([12,24,36,48,60].map(w=>defenseWaveInfo(w,{actCount:5}).bossId),bosses.slice(0,5));
assert.equal(defenseWaveInfo(61,{actCount:5}).act,0);assert.equal(defenseWaveInfo(61,{actCount:5}).lap,1);assert(defenseWaveInfo(61,{actCount:5}).hp>defenseWaveInfo(60,{actCount:5}).hp);
function circuit(reload){let s=createDefense(77,{actCount:5}),ticks=0;while(s.wave<61||s.phase==='wave'){
 if(s.phase==='build'){if(reload)s=restoreDefense(checkpointDefense(s));assert(s);if(!s.towers.length)assert(plantDefense(s,2));assert(startDefenseWave(s));}
 stepDefense(s,.1,{update(){for(const e of s.enemies)defenseHurt(s,e,e.hp,true);}});assert(++ticks<60000);
 assert(s.enemies.length<=120&&s.shots.length<=180&&s.effects.length<=100&&(s.crystalWalls||[]).length<=20);
 }return s;}
const td=circuit(false),resumed=circuit(true);assert.deepEqual(td.bossWins,{austin:1,alwaysbeginner:1,tempestcarrier:1,crosswindKeeper:1,crystalGardener:1});
for(const key of ['wave','time','kills','rng','currency'])assert.equal(td[key],resumed[key]);assert.deepEqual(td.bossWins,resumed.bossWins);
assert.equal(defenseRankEntry({...td,phase:'lost'},{uid:'a',name:'테스터'}),null,'preview never leaks into live ranks');
for(const wave of [0,12,24,35,36,37,60,72,73]){const s=createDefense(3);s.wave=wave;assert(plantDefense(s,2));const old=checkpointDefense(s),next=migrateDefenseToFiveActs(old);assert(next,`migration wave ${wave}`);assert.equal(next.wave,Math.floor(wave/36)*60+wave%36);assert.deepEqual(next.towers,s.towers);assert.equal(next.currency,s.currency);assert.equal(next.rng,s.rng);assert.equal(defenseExpansionRankProgress(next).cleared,wave,'skipped new acts never grant ranking waves');assert(restoreDefense(checkpointDefense(next)));}
const rewarded=createDefense(91);rewarded.wave=72;rewarded.bossWins={austin:2,alwaysbeginner:2,tempestcarrier:2};rewarded.pendingBosses=[12,24,36,48,60,72].map((wave,i)=>({wave,boss:['austin','alwaysbeginner','tempestcarrier'][i%3],ordinal:Math.floor(i/3)+1}));assert(plantDefense(rewarded,2));const rewardMigration=migrateDefenseToFiveActs(checkpointDefense(rewarded));assert(rewardMigration);assert.deepEqual(rewardMigration.bossWins,{...rewarded.bossWins,crosswindKeeper:0,crystalGardener:0});assert.deepEqual(rewardMigration.pendingBosses.map(e=>e.wave),[12,24,36,72,84,96]);assert.equal(defenseExpansionRankProgress(rewardMigration).cleared,72);
const horizontal=createDefense(2,{actCount:5});horizontal.wave=37;assert.equal(defensePath(horizontal).length,3);assert.equal(defensePathLength(horizontal),144);assert.deepEqual(defensePoint(60,horizontal),{x:56,y:12});
for(let room=0;room<5;room++){
 const walls=createDefenseCrystalWalls(room);assert.equal(new Set(walls.map(w=>`${w.x},${w.z}`)).size,walls.length,'one visible crystal is one physical wall');
 for(const w of walls)assert(w.x>=0&&w.x<=100&&w.z>=0&&w.z<=60);
}
for(const wave of [48,60]){
 const s=createDefense(87,{actCount:5});s.wave=wave-1;assert(plantDefense(s,2));assert(startDefenseWave(s));s.towers=[];
 const info=defenseWaveInfo(wave,s);s.spawned=info.count-1;s.spawnTimer=0;stepDefense(s,.05);const boss=s.enemies.find(e=>e.bossId);assert(boss);boss.speed=0;boss.hp=boss.maxHp=1e8;
 const patterns=new Set();let peak=0,opened=0;s.coreHp=20;
 if(wave===60)for(const w of s.crystalWalls.slice(2)){w.hp=0;w.broken=true;}
 for(let n=0;n<650;n++){stepDefense(s,.05);patterns.add(boss.expansionPattern);opened+=Number(boss.coreOpen);peak=Math.max(peak,s.shots.length);s.coreHp=20;}
 assert.equal(patterns.size,3,`${boss.bossId} executes all three canonical patterns`);assert(peak>0&&peak<=48);if(wave===60){assert(opened>0);assert(s.crystalWalls.slice(2).some(w=>!w.broken),'the gardener regrows real cover');}
}

// Actual authored form engine attacks real cover with one scaling path. Cover
// never gives kills, currency, boss rewards or ultimate charge on its own.
const cover=createDefense(6,{actCount:5});cover.wave=49;cover.phase='wave';cover.spawned=999;cover.crystalRoom=0;cover.crystalWalls=createDefenseCrystalWalls(0);
const wall=cover.crystalWalls[0];wall.x=30;wall.y=wall.z=12;wall.w=wall.d=3.8;wall.hp=wall.maxHp=1000;
cover.crystalWalls=[wall];const form=DEFENSE_FORMS.returnblade;cover.towers=[{id:1,pad:0,x:14,y:21,level:1,line:'pierce',tier:2,merit:0,stars:0,laws:[...form.requires],lawRanks:{recall:1,pierce:1},formId:form.id,ultimateCharge:0,angle:0,shotTime:0,mirrorTime:0}];
const combat=createDefenseCombat(cover);let peak=0;for(let n=0;n<260;n++){cover.time+=1/60;combat.update(1/60);peak=Math.max(peak,combat.diagnostics().bolts);}assert(wall.hp<1000);assert.equal(cover.kills,0);assert.equal(cover.currency,90);assert.equal(cover.towers[0].ultimateCharge,0);assert(peak<=24);assert.equal(wall.x,30);assert.equal(wall.z,12);combat.dispose();assert.equal(combat.diagnostics().engines,0);
console.log('Five-act modes: 15 survival boss transitions, melee flanks, canonical boss patterns, save CAS/migration, 61 TD waves with reload, horizontal lane, real terrain attacks and gated ranking progress passed. Renderless; visual/mobile/battery QA pending.');
