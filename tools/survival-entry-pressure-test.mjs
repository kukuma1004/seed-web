import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {SURVIVAL,createSurvivalSession,lockSurvivalBuildPressure,survivalScaling,survivalEnemySpec,advanceSurvivalAct,tickSurvival} from '../src/survival-rules.js';
import {captureSurvivalSession,createSurvivalSaveStore,validSurvivalSave} from '../src/survival-save.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const oldBuildHp=level=>Math.min(24,Math.pow(1+Math.max(0,level-30)/60,1.5));
const legacyHp=(act,lap,level)=>Math.min(60,(1+act*.18)*Math.pow(1.9,Math.min(lap,10)))*oldBuildHp(level);
const snapshot=session=>({id:'entry-pressure',revision:0,session:captureSurvivalSession(session),progress:{hp:80,kills:40,score:900,elapsed:session.time,choicesTaken:7,choiceKills:3,bankedUpgrades:0,levels:{frost:214},forms:{},inventory:{tonic:1}},player:{position:[0,0,0],baseSlideTarget:[0,0,0],baseSlideDir:[0,0,0],lastMove:[0,0,1]},enemies:[],hostiles:[],pending:null});
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};

let transitions=0;
for(const actCount of [3,5])for(let oldAct=0;oldAct<actCount;oldAct++)for(const lap of [0,1,2,10])for(const [from,to] of [[0,40],[30,70],[174,214],[300,340],[500,540],[174,174],[174,150]]){
 const s={...createSurvivalSession(13,{actCount}),act:oldAct,lap,time:720,legStartedAt:540,won:true};
 lockSurvivalBuildPressure(s,from);const previous=s.pressureBuildLevel;
 assert(advanceSurvivalAct(s));assert.equal(advanceSurvivalAct(s),false,'cannot restart entry easing without another boss');
 lockSurvivalBuildPressure(s,to,previous);
 assert.equal(s.pressureBuildLevel,to);assert.equal(s.pressureLegStartedAt,s.legStartedAt);
 const baseline=survivalScaling({...s,pressureFromBuildLevel:undefined});
 const eased=oldBuildHp(from)<oldBuildHp(to)&&from<to;
 assert.equal(s.pressureFromBuildLevel,eased?from:undefined);assert.equal(s.pressureFromLegStartedAt,eased?s.legStartedAt:undefined);
 let last=0;
 for(let sec=0;sec<=30;sec++){
  s.time=s.legStartedAt+sec;const scale=survivalScaling(s);
  assert.ok(scale.hp>=last-1e-8&&scale.hp<=baseline.hp+1e-8);last=scale.hp;
  for(const key of ['bossHp','speed','damage','tempo','projectile'])assert.equal(scale[key],baseline[key],'only ordinary build health may ease');
  if(sec===0)near(scale.hp,legacyHp(s.act,s.lap,eased?from:to));
  if(sec===15&&eased)near(scale.hp,(legacyHp(s.act,s.lap,from)+baseline.hp)/2);
  if(sec===30)near(scale.hp,baseline.hp);
 }
 const fixed=survivalScaling(s);lockSurvivalBuildPressure(s,to+80,0);assert.equal(s.pressureBuildLevel,to);assert.deepEqual(survivalScaling(s),fixed,'earned upgrades cannot move either pressure anchor');
 transitions++;
}

const run={...createSurvivalSession(13),act:2,lap:1,time:720,legStartedAt:540,won:true};
lockSurvivalBuildPressure(run,174);const old=run.pressureBuildLevel;advanceSurvivalAct(run);lockSurvivalBuildPressure(run,214,old);
const rows=[];
for(const sec of [0,5,15,25,30,60,180]){
 run.time=run.legStartedAt+sec;const before=survivalScaling(run),record=snapshot(run),store=createSurvivalSaveStore(storage,'entry-'+sec);
 assert(store.write(record,{fresh:true}).ok);const saved=store.read();assert(validSurvivalSave(saved));
 assert.deepEqual(survivalScaling(saved.session),before,'reloading cannot restart or finish easing');
 lockSurvivalBuildPressure(saved.session,999);assert.deepEqual(survivalScaling(saved.session),before,'restored build does not re-anchor');
 assert(createSurvivalSaveStore(storage,'other-'+sec).read()===null);
 rows.push({seconds:sec,bruteHP:survivalEnemySpec('brute',run).hp,bossScale:before.bossHp});
 const value=JSON.stringify(saved.session);for(const dt of [0,-1,NaN,Infinity])tickSurvival(saved.session,dt,0);assert.equal(JSON.stringify(saved.session),value,'non-playing/invalid ticks do not progress the clock');
}
const valid={...snapshot(run),version:1,revision:1};assert(validSurvivalSave(valid));
for(const value of [-1,1.5,1000001,215,NaN,Infinity,null,'174',true]){const bad=structuredClone(valid);bad.session.pressureFromBuildLevel=value;assert.equal(validSurvivalSave(bad),false);}
for(const field of ['pressureBuildLevel','pressureLegStartedAt','pressureFromBuildLevel','pressureFromLegStartedAt']){const bad=structuredClone(valid);delete bad.session[field];assert.equal(validSurvivalSave(bad),false);}
const stale=structuredClone(valid);stale.session.legStartedAt=stale.session.time;stale.session.act=1;
assert(validSurvivalSave(stale),'old-client stale triple stays readable');lockSurvivalBuildPressure(stale.session,214);assert.equal(stale.session.pressureFromBuildLevel,undefined);near(survivalScaling(stale.session).hp,legacyHp(1,2,214));
// The previous client updates its known anchor after advance but preserves
// new fields. The independent source stamp prevents replaying easing.
const mixed=structuredClone(valid);mixed.session.legStartedAt=mixed.session.time;mixed.session.pressureLegStartedAt=mixed.session.time;mixed.session.pressureBuildLevel=250;
assert(validSurvivalSave(mixed));near(survivalScaling(mixed.session).hp,legacyHp(mixed.session.act,mixed.session.lap,250));
lockSurvivalBuildPressure(mixed.session,260);assert.equal(mixed.session.pressureBuildLevel,250);assert.equal(mixed.session.pressureFromBuildLevel,undefined);assert.equal(mixed.session.pressureFromLegStartedAt,undefined);
const lower=structuredClone(valid);lower.session.pressureLegStartedAt=lower.session.time;lower.session.legStartedAt=lower.session.time;lower.session.pressureBuildLevel=150;
assert(validSurvivalSave(lower),'well-formed stale source above a reduced target stays readable');lockSurvivalBuildPressure(lower.session,150);assert.equal(lower.session.pressureFromBuildLevel,undefined);
for(const value of [-1,Infinity,NaN,901,null,'720']){const bad=structuredClone(valid);bad.session.pressureFromLegStartedAt=value;assert.equal(validSurvivalSave(bad),false);}
const legacy=structuredClone(valid);delete legacy.session.pressureFromBuildLevel;delete legacy.session.pressureFromLegStartedAt;assert(validSurvivalSave(legacy));near(survivalScaling(legacy.session).hp,legacyHp(legacy.session.act,legacy.session.lap,214));
for(const level of [0,1,30,31,174,500,1000000])for(let act=0;act<5;act++)near(survivalScaling({...createSurvivalSession(2,{actCount:5}),act,lap:2,buildLevel:level}).hp,legacyHp(act,2,level));

// Invoke the actual host transition anchor statements; no copied simulation
// and no injected gameplay progress presented as a human playthrough.
const main=readFileSync('src/main.js','utf8'),a=main.indexOf(' const previousPressure='),b=main.indexOf(' survivalSiege=',a);assert(a>0&&b>a);
const section=main.slice(a,b),world={...createSurvivalSession(3),time:200,legStartedAt:0,won:true};lockSurvivalBuildPressure(world,174);
const ctx=vm.createContext({survivalSession:world,advanceSurvivalAct,lockSurvivalBuildPressure,buildLevel:()=>214,levels:null,heldForms:null});
vm.runInContext('function next(){'+section+'}',ctx);ctx.next();assert.equal(world.pressureFromBuildLevel,174);assert.equal(world.pressureBuildLevel,214);
const bytes=JSON.stringify(world);ctx.next();assert.equal(JSON.stringify(world),bytes,'duplicate continue leaves anchors unchanged');
// A stale/missing history never receives invented easing from its last live
// diagnostic build. New host anchors before its next save/spawn as before.
world.time=400;world.legStartedAt=400;world.won=true;world.buildLevel=1;ctx.next();assert.equal(world.pressureFromBuildLevel,undefined);

console.log(`PASS ${transitions} real-rule transitions across both circuits/four laps/seven build changes; bounded monotonic30s easing, exact full target/boss parity, fixed in-act reward, seven checkpoint resumes, malformed/stale/legacy guards and actual host anchor dispatch. CPU/model, not human/device play.`);
console.log(JSON.stringify({example:'174→214, 3-act wrap into third circuit',rows}));
