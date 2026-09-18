import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STADIUM_ROOMS,ACT2_REGION,isAct2,actOf,act2Unlocked,act2Available,playableRegion,ACT2_RELEASED,actStorage,ACT2_STORAGE_KEYS} from '../src/act2.js';
import {ACT2_WARDENS,ACT2_WARDEN_ART,act2WardenEncounter,createAct2Warden,tickAct2Warden} from '../src/act2-wardens.js';
import {ALWAYS_BEGINNER,ALWAYS_BEGINNER_ART,ALWAYS_PHASES,createAlwaysBeginner,tickAlwaysBeginner,damageAlwaysBeginner} from '../src/always-beginner.js';
import {BASE_SLIDE,STADIUM_BASES,baseSlideFor} from '../src/stadium.js';
// Act 2 is open to the closed beta on both the hosted web build and Android app.
assert.equal(ACT2_RELEASED,true);assert.equal(act2Available({hostname:'kukuma1004.github.io'}),true);assert.equal(act2Available({hostname:'localhost'}),true);assert.equal(act2Available({hostname:'127.0.0.1'}),true);
assert.equal(playableRegion('stadium',{hostname:'kukuma1004.github.io'}),'stadium');assert.equal(playableRegion('stadium',{hostname:'localhost'}),'stadium');assert.equal(playableRegion('garden',{hostname:'kukuma1004.github.io'}),'garden');
import {ACT2_MINIONS,ACT2_MINION_TYPES,ACT2_ART,isAct2Minion,createAct2Minion,tickAct2Minion,catcherReturn} from '../src/act2-enemies.js';
import {roomFor,ROOMS} from '../src/journey.js';
import {arenaFor,insideArena,ACT2_ARENAS} from '../src/arena.js';
import {trapsFor} from '../src/traps.js';
import {turretSpots} from '../src/turret.js';
import {validCheckpoint,readCheckpoint,writeCheckpoint,SAVE_KEY,REGION_NAMES} from '../src/run-save.js';
import {RANKING_KEY,readRanking,submitScore,KILL_POINTS} from '../src/score.js';
import {blocksShield} from '../src/shield.js';
import {contactShadowRadius} from '../src/contact-shadows.js';
const V=THREE.Vector3;

// Unlock and act marker.
assert.equal(act2Unlocked({bosses:['austin']}),true);assert.equal(act2Unlocked({bosses:['warden']}),false);assert.equal(act2Unlocked(null),false);
assert.equal(isAct2(ACT2_REGION),true);assert.equal(actOf('garden'),1);assert.equal(actOf('stadium'),2);assert.ok(REGION_NAMES.stadium);

// Rooms: five stadium rooms, minions and covers inside their arenas, no star room, traps or turrets.
assert.equal(STADIUM_ROOMS.length,ROOMS.length);
STADIUM_ROOMS.forEach((room,stage)=>{
 assert.equal(roomFor(stage,0,'stadium'),room);assert.equal(roomFor(stage,1,'stadium'),room);
 const arena=arenaFor(stage,1,'stadium');assert.notEqual(arena.shape,'star');
 for(const [type,x,z] of room.enemies){assert.ok(isAct2Minion(type)||type==='act2warden',type);assert.ok(insideArena({x,z},.5,arena),`${room.name} ${type}`);}
 for(const c of room.covers)assert.ok(insideArena({x:c.x,z:c.z},0,arena));
 for(const base of STADIUM_BASES)assert.ok(insideArena(base,BASE_SLIDE.radius,arena),`${room.name} base loop`);
 assert.ok(insideArena(arena.start,.5,arena),`${room.name} start`);assert.ok(insideArena(arena.exit,.4,arena),`${room.name} exit`);
 if(stage===1||stage===3)assert.ok(insideArena({x:0,z:-6.35},.4,arena),`${room.name} relay target`);
 assert.deepEqual(trapsFor(stage,0,'stadium'),[]);assert.deepEqual(turretSpots(stage,1,'stadium'),[]);
});
assert.deepEqual(ACT2_ARENAS.map(a=>a.id),['home-plate','diamond','baseball','glove','ballpark']);
assert.ok(STADIUM_ROOMS.slice(0,4).every(room=>room.enemies.every(([type])=>isAct2Minion(type))));
assert.equal(new Set(STADIUM_ROOMS.flatMap(r=>r.enemies.map(([t])=>t)).filter(isAct2Minion)).size,4,'every minion appears');
assert.notEqual(roomFor(2,0,'garden'),STADIUM_ROOMS[2]);
assert.equal(STADIUM_ROOMS[4].enemies[0][0],'act2warden');

// Five-journey guardian ladder: A, B, C, then two staged pair fights.
assert.deepEqual(act2WardenEncounter(0),{primary:'ace',support:null,trigger:0,hpScale:1});
assert.deepEqual(act2WardenEncounter(1),{primary:'diamond',support:null,trigger:0,hpScale:1});
assert.deepEqual(act2WardenEncounter(2),{primary:'slugger',support:null,trigger:0,hpScale:1});
assert.deepEqual(act2WardenEncounter(3),{primary:'ace',support:'diamond',trigger:.6,hpScale:.8});
assert.deepEqual(act2WardenEncounter(4),{primary:'diamond',support:'slugger',trigger:.6,hpScale:.8});
assert.equal(Object.keys(ACT2_WARDENS).length,3);
assert.equal(new Set(Object.values(ACT2_WARDEN_ART).map(art=>art.file)).size,3,'each guardian owns an atlas');
for(const [id,art] of Object.entries(ACT2_WARDEN_ART)){assert.match(art.file,new RegExp(`^warden-act2-${id}-v1\\.webp$`));assert.ok(art.size>=3.7);}

// Stadium bases form one clockwise movement loop; cooldown prevents accidental re-triggering.
assert.equal(STADIUM_BASES.length,4);assert.deepEqual(STADIUM_BASES.map(base=>base.next),[1,2,3,0]);
{const slide=baseSlideFor({x:0,z:4.2});assert.ok(slide);assert.equal(slide.index,0);assert.ok(slide.dx>0&&slide.dz<0);assert.equal(slide.speed,BASE_SLIDE.speed);assert.equal(baseSlideFor({x:0,z:4.2},.1),null);assert.equal(baseSlideFor({x:9,z:7}),null);assert.equal(baseSlideFor({x:0,z:4.2},0,false),null);}

// Storage: act 2 keeps its own checkpoint and local board; the name stays shared.
{
 const data=new Map(),storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 assert.equal(actStorage(storage,1),storage);
 const act2=actStorage(storage,2),save={version:1,cycle:0,region:'stadium',stage:1,mode:'entry',hp:90,rules:[],mutated:[],kills:3,elapsed:20};
 assert.ok(validCheckpoint(save));assert.equal(writeCheckpoint(act2,save),true);
 assert.equal(readCheckpoint(storage),null,'act 1 does not see the act 2 run');assert.equal(readCheckpoint(act2).region,'stadium');
 assert.ok(data.has(ACT2_STORAGE_KEYS[SAVE_KEY]));assert.ok(!data.has(SAVE_KEY));
 submitScore(act2,{name:'가나',score:500,cycle:0,stage:1,kills:3,time:20});
 assert.equal(readRanking(storage).length,0);assert.equal(readRanking(act2).length,1);assert.ok(data.has(ACT2_STORAGE_KEYS[RANKING_KEY]));
 assert.equal(data.get('seed-player-name'),'가나','names are shared');
}
for(const type of ACT2_MINION_TYPES){assert.ok(KILL_POINTS[type]>0,type);assert.ok(contactShadowRadius(type)!==.5||type==='runner',type);assert.ok(ACT2_MINIONS[type].name);}
for(const type of ['act2warden','alwaysbeginner']){assert.ok(KILL_POINTS[type]>0,type);assert.notEqual(contactShadowRadius(type),.5,type);}
assert.equal(new Set(Object.values(ACT2_ART).map(art=>art.file)).size,4,'act 2 roles own four separate atlases');
for(const art of Object.values(ACT2_ART)){assert.match(art.file,/^enemy-(catcher|pitcher|runner|batter)-v1\.webp$/);assert.equal(art.tint,0xffffff);}

// Minion behaviour with a small fake world.
function world(playerAt=new V()){
 const bolts=[],hits=[],batted=[],shots=[];
 const ctx={player:playerAt,collide:()=>{},hit:a=>hits.push(a),bolt:(pos,dir,spec)=>bolts.push({pos,dir,spec}),blocked:()=>false,shots:()=>shots,batShot:s=>{s.life=0;batted.push(s);},canBat:()=>true,random:()=>.3};
 return {ctx,bolts,hits,batted,shots};
}
const run=(e,ctx,seconds,dt=.05,each=()=>{})=>{for(let t=0;t<seconds;t+=dt){tickAct2Minion(e,dt,t,ctx);each(t);}};
const scene=new THREE.Scene();

// Dedicated guardians visibly telegraph and execute their own attacks.
for(const variant of Object.keys(ACT2_WARDENS)){
 const w=world(new V(0,0,0)),e=createAct2Warden(scene,variant);e.g.position.set(0,0,-5);e.timer=0;let sawMove=false;for(let t=0;t<4;t+=.04){tickAct2Warden(e,.04,t,w.ctx);sawMove||=Boolean(e.moveName);}assert.ok(sawMove,variant);assert.ok(e.world?.parent===scene);
}

// Always Beginner has three phases, a hard damage budget and multiple readable patterns.
{
 const e=createAlwaysBeginner(scene);assert.equal(e.config.name,'항상초심');assert.equal(Object.keys(ALWAYS_PHASES).length,3);
 assert.match(ALWAYS_BEGINNER_ART.file,/^boss-always-beginner-v1\.webp$/);assert.ok(ALWAYS_BEGINNER_ART.size>4);
 const first=damageAlwaysBeginner(e,e.maxHp);assert.ok(first<=e.maxHp*ALWAYS_BEGINNER.damage.burst+.001);assert.equal(damageAlwaysBeginner(e,100),0,'same-frame burst is capped');
 const bolts=[],summons=[],ctx={player:new V(0,0,2),collide:()=>{},hit:()=>true,bolt:(p,d,s)=>bolts.push(s),burst:()=>{},pulse:()=>{},sound:()=>{},clearBolts:()=>{},summon:types=>summons.push(...types)};
 e.damageAllowance=e.maxHp;e.timer=0;for(let t=0;t<8;t+=.04)tickAlwaysBeginner(e,.04,ctx);assert.ok(bolts.length>0,'boss attacks during opening phase');
 e.hp=e.maxHp*.6;e.state='stalk';tickAlwaysBeginner(e,.04,ctx);assert.equal(e.state,'phaseShift');for(let t=0;t<1.2;t+=.04)tickAlwaysBeginner(e,.04,ctx);assert.equal(e.phase,'rally');assert.ok(summons.includes('runner'));
}

// Pitcher: the line fills in first, then a fast straight ball; the third pitch curves.
{
 const w=world(),e=createAct2Minion(scene,'pitcher',()=>.1);e.g.position.set(0,0,-7);let sawLine=false;
 run(e,w.ctx,1.6,.05,()=>{if(e.state==='windup'&&e.line.visible)sawLine=true;});
 assert.ok(sawLine,'windup line shows');assert.equal(w.bolts.length,1);assert.equal(w.bolts[0].spec.speed,ACT2_MINIONS.pitcher.ballSpeed);assert.ok(w.bolts[0].dir.z>.9,'aimed at the seed');
 run(e,w.ctx,8);assert.ok(w.bolts.length>=3);assert.ok(w.bolts[2].spec.curve,'third pitch curves');
 w.ctx.blocked=()=>true;const before=w.bolts.length;e.state='stalk';e.timer=0;run(e,w.ctx,3);assert.equal(w.bolts.length,before,'no pitch without a clear line');
}
// Runner: marks where the seed stood, sprints through, then rests exposed.
{
 const player=new V(),w=world(player),e=createAct2Minion(scene,'runner',()=>.1);e.g.position.set(0,0,-6);e.timer=0;
 run(e,w.ctx,.1);assert.equal(e.state,'mark');assert.ok(e.base.visible);assert.ok(e.basePos.distanceTo(new V())<1e-6);
 player.set(3,0,0);run(e,w.ctx,.9);assert.equal(e.state,'commit');
 run(e,w.ctx,1.3);assert.equal(e.state,'recover');assert.equal(e.takenScale,ACT2_MINIONS.runner.exposed);assert.ok(e.g.position.z>-.2,'ran through the base');assert.equal(w.hits.length,0,'a seed that left the base is safe');
}
// Batter: sends a frontal shot back, but not a piercing one or one from behind.
{
 const w=world(),e=createAct2Minion(scene,'batter',()=>.1);e.g.position.set(0,0,-3);e.g.rotation.y=0;e.timer=5;
 w.shots.push({life:1,ob:{position:new V(0,.7,-2.2)}});run(e,w.ctx,.05);
 assert.equal(w.batted.length,1);assert.equal(w.bolts.length,1);assert.ok(w.bolts[0].dir.z>0);
 const later=world();later.ctx.canBat=()=>false;const b=createAct2Minion(scene,'batter',()=>.1);b.g.position.set(0,0,-3);b.timer=5;later.shots.push({life:1,ob:{position:new V(0,.7,-2.2)}});run(b,later.ctx,.05);assert.equal(later.batted.length,0,'piercing shots pass');
 const back=world();const c=createAct2Minion(scene,'batter',()=>.1);c.g.position.set(0,0,-3);c.g.rotation.y=0;c.timer=5;back.shots.push({life:1,ob:{position:new V(0,.7,-4)}});run(c,back.ctx,.05);assert.equal(back.batted.length,0,'shots from behind pass');
}
// Catcher: blocks from the front only, throws back at most every returnEvery seconds, drops the shield while recovering.
{
 const w=world(),e=createAct2Minion(scene,'catcher',()=>.1);e.g.position.set(0,0,-3);e.g.rotation.y=0;
 assert.equal(blocksShield(e,new V(0,0,-1)),true,'shot flying at its face');assert.equal(blocksShield(e,new V(0,0,1)),false,'shot from behind');
 assert.equal(catcherReturn(e,w.ctx),true);assert.equal(catcherReturn(e,w.ctx),false);assert.equal(w.bolts.length,1);
 e.state='recover';assert.equal(blocksShield(e,new V(0,0,-1)),false);
 const turning=createAct2Minion(scene,'catcher',()=>.1);turning.g.position.set(0,0,-5);turning.g.rotation.y=Math.PI;run(turning,world().ctx,.5);
 assert.ok(Math.abs(Math.atan2(Math.sin(turning.g.rotation.y-Math.PI),Math.cos(turning.g.rotation.y-Math.PI)))<ACT2_MINIONS.catcher.turn*.6+.05,'turns slowly, so flanking works');
}
console.log('Act 2: unlock, separate save, base sliding, guardian ladder, Always Beginner, and stadium enemy rules passed.');
