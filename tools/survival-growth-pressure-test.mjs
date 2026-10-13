import assert from 'node:assert/strict';
import {buildLevel,damageScale,lawStats,chooseLaw} from '../src/progression.js';
import {createSurvivalSession,lockSurvivalBuildPressure,survivalScaling,survivalEnemySpec,advanceSurvivalAct} from '../src/survival-rules.js';
import {captureSurvivalSession,createSurvivalSaveStore,validSurvivalSave} from '../src/survival-save.js';

// Use the real capped Frost stat, global shot bonus, spawn health and earned
// upgrade transaction. This is arithmetic/controller evidence, not a playtest.
for(const frost of [8,258]){
 const levels=new Map([['frost',frost],['reflect',8],['split',9],['chain',9],['pierce',8],['recall',8]]),forms=new Map();
 const session={...createSurvivalSession(413),act:1,lap:2,time:800,legStartedAt:720};
 lockSurvivalBuildPressure(session,buildLevel(levels,forms));
 const health=survivalEnemySpec('brute',session).hp,stats=lawStats(levels),scale=survivalScaling(session),damage=damageScale(levels);
 assert(chooseLaw(levels,'frost',forms));
 lockSurvivalBuildPressure(session,buildLevel(levels,forms));
 assert.equal(lawStats(levels).frostTime,stats.frostTime);assert.equal(lawStats(levels).frostFactor,stats.frostFactor);
 assert(damageScale(levels)>damage);assert.equal(survivalEnemySpec('brute',session).hp,health);
 assert.deepEqual(survivalScaling(session),scale,'an earned capped-utility upgrade still improves damage without a matching enemy buff');
 session.won=true;assert(advanceSurvivalAct(session));assert.equal(session.pressureBuildLevel,undefined);
 lockSurvivalBuildPressure(session,buildLevel(levels,forms));assert.equal(session.pressureBuildLevel,buildLevel(levels,forms));
 assert(survivalScaling(session).hp>scale.hp,'next act still raises difficulty');
}
const zero=createSurvivalSession(4);lockSurvivalBuildPressure(zero,0);lockSurvivalBuildPressure(zero,174);
assert.equal(zero.pressureBuildLevel,0,'zero is a valid entrance build');assert.equal(survivalScaling(zero).hp,1);
// A new field surviving an old client's act advance is not a valid anchor.
zero.time=200;zero.legStartedAt=200;zero.act=1;
assert.equal(survivalScaling(zero).hp,survivalScaling({act:1,buildLevel:174}).hp);
lockSurvivalBuildPressure(zero,174);assert.equal(zero.pressureLegStartedAt,200);assert.equal(zero.pressureBuildLevel,174);

const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=createSurvivalSaveStore(storage,'pressure-test');
const snapshot={id:'growth-run',revision:0,session:captureSurvivalSession(zero),progress:{hp:80,kills:40,score:900,elapsed:200,choicesTaken:7,choiceKills:3,bankedUpgrades:0,levels:{frost:174},forms:{},inventory:{tonic:1}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,1]},enemies:[],hostiles:[],pending:null};
assert(store.write(snapshot,{fresh:true}).ok);const resumed=store.read(),resumedScale=survivalScaling(resumed.session);
lockSurvivalBuildPressure(resumed.session,175);assert.equal(resumed.session.pressureBuildLevel,174);assert.deepEqual(survivalScaling(resumed.session),resumedScale);
assert(store.write(resumed).ok);assert.equal(createSurvivalSaveStore(storage,'other-account').read(),null);
for(const edit of [s=>s.session.pressureBuildLevel=-1,s=>s.session.pressureBuildLevel=1.5,s=>s.session.pressureBuildLevel=1000001,s=>delete s.session.pressureLegStartedAt,s=>s.session.pressureLegStartedAt=Infinity,s=>s.session.pressureLegStartedAt=201]){
 const corrupt=structuredClone(store.read());edit(corrupt);assert.equal(validSurvivalSave(corrupt),false);
}
const legacy=store.read();delete legacy.session.pressureBuildLevel;delete legacy.session.pressureLegStartedAt;
assert(validSurvivalSave(legacy));lockSurvivalBuildPressure(legacy.session,175);assert.equal(legacy.session.pressureBuildLevel,175,'old checkpoint anchors restored build once');
console.log('Survival growth pressure: capped utility benefit, fixed entrance/boss scale, next-act and old-client stamp, real checkpoint round-trip/isolation/legacy validation PASS (CPU only)');
