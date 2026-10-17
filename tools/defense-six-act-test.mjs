import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CIRCUIT_ACTS} from '../src/act-expansion.js';
import {createDefense,plantDefense,startDefenseWave,stepDefense,defenseHurt,defenseWaveInfo,defensePath,checkpointDefense,restoreDefense,migrateDefenseToFiveActs,DEFENSE_FORMS} from '../src/seed-defense-rules.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';
import {DEFENSE_CROSSWIND_PATH} from '../src/seed-defense-expansion.js';
import {tickDefenseArborBoss,tickDefenseArborField,defenseArborFieldCue,DEFENSE_ARBOR_LIMITS} from '../src/defense-arbor.js';
import {createDefenseArborInspection} from '../src/defense-arbor-inspection.js';
import {defensePreparationKey,readDefensePreparation,canWriteDefensePreparation} from '../src/defense-save-route.js';
import {defenseAccountKey,createDefenseAccountStore,validDefenseAccountRecord} from '../src/defense-account-save.js';
import {createDefenseAccountSync} from '../src/defense-account-sync.js';
import {defenseRankEntry,defenseExpansionRankProgress} from '../src/defense-ranking.js';
import {CRYSTAL_DEFENSE_OBJECTIVE,defenseObjectiveGather} from '../src/defense-objective.js';
import {harvestDefenseSiege} from '../src/defense-crystal-siege.js';

const acts=Object.fromEntries(Object.entries(CIRCUIT_ACTS).map(([id,a])=>[id,{...a,released:true}]));
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const checkpoint=s=>{const raw=checkpointDefense(s);assert(raw);const next=restoreDefense(raw);assert(next,`checkpoint wave ${s.wave} / version ${raw.version}`);assert.deepEqual(checkpointDefense(next),raw);return next;};
let s=createDefense(613,{actCount:6}),roundtrips=0,frames=0;
assert.equal(s.version,8);assert.equal(s.actCount,6);assert(plantDefense(s,0,'pierce'));
const bossWaves=[];
// Orchestration, not a balance/win-rate claim: feed actual damage to every
// spawned actor, so leaked / skipped bosses cannot enter the receipt queue.
while(s.wave<216||s.phase==='wave'){
 assert(frames++<250000);
 if(s.phase==='build'){s=checkpoint(s);roundtrips++;assert(startDefenseWave(s));if(defenseWaveInfo(s.wave,s).final)bossWaves.push([s.wave,defenseWaveInfo(s.wave,s).bossId]);}
 stepDefense(s,.1,{update(){for(const e of s.enemies)if(e.hp>0)defenseHurt(s,e,e.hp,true);}});
 assert(s.enemies.length<=120&&s.shots.length<=180&&s.effects.length<=100);
}
assert.equal(s.wave,216);assert.equal(s.phase,'build');assert.equal(s.pendingBosses.length,18);
assert.deepEqual(s.bossWins,{austin:3,alwaysbeginner:3,tempestcarrier:3,crosswindKeeper:3,crystalGardener:3,arbor:3});
assert.deepEqual(bossWaves.filter(([,id])=>id==='arbor').map(([w])=>w),[72,144,216]);
assert.equal(defenseWaveInfo(73,s).act,0);assert.equal(defenseWaveInfo(73,s).lap,1);
assert(defenseWaveInfo(73,s).hp>defenseWaveInfo(1,s).hp);assert(defenseWaveInfo(145,s).hp>defenseWaveInfo(73,s).hp);
assert.equal(defenseWaveInfo(217,s).lap,3);s=checkpoint(s);
for(const wave of [37,109,181])assert.equal(defensePath({...s,wave}),DEFENSE_CROSSWIND_PATH);
for(const mutate of [r=>r.version=6,r=>r.actCount=5,r=>r.bossWins.arbor=4,r=>r.pendingBosses.at(-1).wave=215,r=>r.migratedWaves=1,r=>r.migratedWaves=24,r=>r.pendingBosses.at(-1).ordinal=2,r=>r.pendingBosses.push({...r.pendingBosses[0]})]){const r=checkpointDefense(s);mutate(r);assert.equal(restoreDefense(r),null);}
assert.equal(migrateDefenseToFiveActs(s),null,'six-act run must never be collapsed into a legacy circuit');
console.log(`PASS six acts: 216 actual spawned waves / 18 real damage receipts / ${roundtrips} preparation roundtrips / 72→1 stronger loops`);

const five=checkpointDefense(createDefense(52,{actCount:5})),three=checkpointDefense(createDefense(53));
assert.deepEqual(checkpointDefense(restoreDefense(five)),five);assert.deepEqual(checkpointDefense(restoreDefense(three)),three);
const storage=memory(),owner='six-owner',key6=defensePreparationKey(owner,6,{acts});
const old3=defensePreparationKey(owner,3,{acts}),old5=defensePreparationKey(owner,5,{acts});
storage.setItem(old3,JSON.stringify(three));storage.setItem(old5,JSON.stringify(five));
assert.notEqual(key6,old3);assert.notEqual(key6,old5);assert.equal(readDefensePreparation(storage,key6,{owner,actCount:6}),null);
const before3=storage.getItem(old3),before5=storage.getItem(old5);
storage.setItem(key6,JSON.stringify(checkpointDefense(s)));assert.equal(readDefensePreparation(storage,key6,{owner,actCount:6}).wave,216);
for(const bad of ['{broken',JSON.stringify(five),JSON.stringify({...checkpointDefense(s),version:999})]){storage.setItem(key6,bad);assert.equal(readDefensePreparation(storage,key6,{owner,actCount:6}),null);assert.equal(canWriteDefensePreparation(storage,key6,{actCount:6}),false);assert.equal(storage.getItem(key6),bad);}
assert.equal(storage.getItem(old3),before3);assert.equal(storage.getItem(old5),before5);
assert.notEqual(defensePreparationKey(owner,6,{acts:{...acts,arbor:{...acts.arbor,released:false}}}),key6);
console.log('PASS six-act preparation: distinct public / inspection keys, no implicit 3/5 promotion, unknown bytes protected');

const active=createDefenseArborInspection({enabled:true});assert(active?.inspectionPreview);assert.equal(checkpointDefense(active),null);
assert.equal(createDefenseArborInspection(),null);assert.equal(defenseRankEntry({...active,phase:'lost'},{uid:owner,name:'씨앗',acts,inspection:true}),null);
const tree=active.enemies.find(e=>e.bossId==='arbor');assert(tree);tree.x=76;tree.y=30;tree.hp=tree.maxHp;
const kinds=new Set(),shots=[],roots=[];
for(let i=0;i<900;i++){
 tickDefenseArborBoss(active,tree,.1,q=>{shots.push(q);kinds.add(q.pattern);},(_s,kind,x,y,_ink,o)=>roots.push({kind,x,y,...o}));
 if(tree.arborBoss.coreOpen)kinds.add('open-core');
 if(tree.arborRootCue)kinds.add('root-warning');
}
assert(shots.length>0);assert(kinds.has('arbor-branch-fan')&&kinds.has('open-core')&&kinds.has('root-warning'));
assert(roots.length>=3);assert(active.towers.some(t=>t.rootBind===DEFENSE_ARBOR_LIMITS.rootBind));assert.equal(active.coreHp,20,'roots bind seeds rather than unavoidable core damage');
for(const q of shots){assert(Number.isFinite(q.position.x)&&Number.isFinite(q.position.z));assert(q.spec.life>0&&q.coreStrike.includes(':arbor:'));}
const capped={...active,shots:Array.from({length:48},()=>({law:'hostile'}))};tree.arborBoss.phase='windup';tree.arborBoss.pattern=0;tree.arborBoss.timer=.01;const blocked=[];tickDefenseArborBoss(capped,tree,.1,q=>blocked.push(q),()=>{});assert.equal(blocked.length,0);
console.log('PASS shared Arbo: actual warned fan / three roots / exposed core, tower binding, finite bullets and no unavoidable root core damage');

const field=createDefense(92,{actCount:6});assert(plantDefense(field,0));field.wave=61;field.phase='wave';field.waveTime=4;
const fieldInfo=defenseWaveInfo(field.wave,field);tickDefenseArborField(field,fieldInfo,.1,()=>{});const cue=defenseArborFieldCue(field);assert(cue?.remaining>=1);
const stationary={...field.towers[0],id:2};field.towers.push(stationary);field.towers[0].x+=20;
for(let i=0;i<12;i++)tickDefenseArborField(field,fieldInfo,.1,()=>{});
assert.equal(field.towers[0].rootBind,undefined,'moved seed evades the locked warning');assert.equal(stationary.rootBind,.9);
console.log('PASS 6th-act field roots: readable lock, movable evasion and bounded bind');

for(const form of [null,'collapse']){
 const bound=createDefense(91,{actCount:6});plantDefense(bound,0,'pierce');bound.wave=61;bound.phase='wave';bound.spawned=defenseWaveInfo(61,bound).count;bound.spawnTimer=99;
 const tower=bound.towers[0];tower.rootBind=.9;
 if(form){const f=DEFENSE_FORMS[form];Object.assign(tower,{formId:form,laws:[...f.requires],lawRanks:Object.fromEntries(f.requires.map(id=>[id,1])),tier:2,line:f.requires[0]});}
 bound.enemies=[{id:99,x:14,y:12,progress:18,hp:1e9,maxHp:1e9,kind:'normal',speed:0,slow:1,slowTime:0,leakDamage:1,attackTime:99}];
 const combat=form?createDefenseCombat(bound):null;
 try{for(let i=0;i<5;i++)stepDefense(bound,.1,combat);assert.equal(bound.stats.shots,0,`${form||'base'} bound attack must pause`);for(let i=0;i<20;i++)stepDefense(bound,.1,combat);assert(bound.stats.shots>0,`${form||'base'} resumes real attacks after release`);}finally{combat?.dispose();}
}
console.log('PASS actual base and shared evolution combat both pause new attacks while rooted and resume after release');

const objective=createDefense(93,{actCount:6,objective:CRYSTAL_DEFENSE_OBJECTIVE});objective.wave=48;objective.currency=200;
assert(harvestDefenseSiege(objective,0));assert.equal(defenseObjectiveGather(objective).mask,1);assert.equal(checkpoint(objective).objectiveGather.mask,1);
objective.wave=60;objective.crystalRoom=3;objective.crystalWalls=[];assert.equal(defenseObjectiveGather(objective),null);
console.log('PASS existing crystal gather objective uses the correct 6-act coordinate and keeps claimed nodes on restore');

let remote=null,revision=0,puts=0;
const account={user:()=>({uid:owner,isAnonymous:false}),tokenSession:async()=>({uid:owner,idToken:'local-fixture'})};
const fetchImpl=async(url,o)=>{assert.match(url,/seedDefenseSaves\/six-owner\/6\.json/);if(o.method==='PUT'){assert.equal(o.headers['if-match'],String(revision));remote=JSON.parse(o.body);revision++;puts++;return {ok:true,status:200};}return {ok:true,status:200,json:async()=>structuredClone(remote),headers:{get:()=>String(revision)}};};
const makeDevice=()=>{const st=memory(),lease={ok:true,key:defenseAccountKey(owner,6),active:()=>true},sync=createDefenseAccountSync({storage:st,account,owner,circuit:6,lease,acts,databaseURL:'https://fixture.invalid',fetchImpl});return {st,sync};};
const pc=makeDevice(),phone=makeDevice();const write=pc.sync.store.write(null,s);assert(write.ok);assert(validDefenseAccountRecord(write.value,owner,6));assert.equal((await pc.sync.flush()).kind,'synced');assert.equal((await phone.sync.sync({allowPull:true})).kind,'synced');assert.equal(phone.sync.store.read().wave,216);
const stale=pc.sync.store.readRecord(),changed=pc.sync.store.read();changed.currency+=1;assert(pc.sync.store.write(stale,changed).ok);assert.equal(pc.sync.store.write(stale,changed).reason,'conflict');await pc.sync.flush();await phone.sync.sync({allowPull:true});assert.equal(phone.sync.store.read().currency,changed.currency);
assert(puts>=2);const closedDevice=makeDevice();closedDevice.sync=createDefenseAccountSync({storage:closedDevice.st,account,owner,circuit:6,lease:{ok:true,key:defenseAccountKey(owner,6),active:()=>true},acts:{...acts,arbor:{...acts.arbor,released:false}},databaseURL:'https://fixture.invalid',fetchImpl});assert.equal((await closedDevice.sync.sync()).kind,'ineligible');
const rank=defenseRankEntry({...s,phase:'lost'},{uid:owner,name:'씨앗',acts});assert(rank&&rank.cleared===215);const progress=defenseExpansionRankProgress({...s,phase:'lost'},{acts});assert.equal(progress.act,5);assert.equal(progress.lap,2);assert(progress.eligible);
console.log('PASS six-act account CAS/pull, gated namespace, unchanged ranking score shape; mock network, not actual Google device proof');

const source=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8');
const flushCode=source.slice(source.indexOf(' function flushBossReceipts('),source.indexOf(' function clearSave(){'));
const receiptState=()=>({...checkpointDefense(s),pendingBosses:s.pendingBosses.filter(e=>e.boss==='arbor').map(e=>({...e})),phase:'build'});
let calls=0,writes=0,writeOk=false,callbackOk=true;
const context=vm.createContext({state:receiptState(),paused:false,isolated:()=>false,bossRetryAt:0,
 save:()=>{writes++;return writeOk;},onBossDefeated:(event,live)=>{assert.equal(live,context.state);assert.equal(event.runId,live.runId);calls++;return callbackOk;}});
vm.runInContext(flushCode,context);context.flushBossReceipts(1,'wave');assert.equal(calls,0);assert.equal(context.state.pendingBosses.length,3,'failed preparation save cannot ACK actual Arbor receipts');
writeOk=true;callbackOk=false;context.flushBossReceipts(2002,'build');assert.equal(calls,3);assert.equal(context.state.pendingBosses.length,3,'failed durable award remains retryable');
callbackOk=true;context.flushBossReceipts(4003,'build');assert.equal(context.state.pendingBosses.length,0);assert.equal(writes,3);
context.state=receiptState();context.state.phase='wave';context.bossRetryAt=0;const before=calls;context.flushBossReceipts(1,'wave');assert.equal(calls,before,'active wave waits for preparation');
context.state.phase='lost';context.flushBossReceipts(2,'wave');assert.equal(calls,before+3,'simultaneous boss kill/core loss is delivered before terminal record closes');assert.equal(context.state.pendingBosses.length,0);
console.log('PASS actual view receipt seam: preparation save before award, save-failure retention, journal retry, active-wave defer, terminal real-kill preservation');
