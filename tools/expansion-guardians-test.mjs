import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {EXPANSION_WARDENS_PER_BOSS,validExpansionGuardians,expansionGuardianId,expansionGuardianNeeded,expansionGuardianCourseReady,creditExpansionGuardian,expansionGuardiansAllowAdvance,expansionGuardianProgress} from '../src/expansion-guardians.js';
import {createExpansionJourney,advanceExpansionJourney,stepExpansionJourney,checkpointExpansionJourney,restoreExpansionJourney} from '../src/expansion-journey.js';
import {checkpointExpansionCourse,checkpointExpansionBoss,createExpansionBoss} from '../src/act-expansion-runtime.js';
import {checkpointCrystalSiege} from '../src/crystal-siege-rules.js';
import {createExpansionEntry,validExpansionEntry,createExpansionSaveStore} from '../src/expansion-run-save.js';

const copy=v=>JSON.parse(JSON.stringify(v));
const RUN={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:0,tonic:0,wind:0,shell:0,sprout:0},score:0,choicesTaken:0,choiceKills:0,wardens:0,austins:0};
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
const deathLine=source.split('\n').find(line=>line.includes('if(e.expansionWarden){')&&line.includes('creditExpansionGuardian('));assert(deathLine,'actual guardian settlement remains reachable');
let canonicalEntries=0,packets=0,frames=0,credits=0,oldSerializerRejections=0;

// Literal public 3aff90c checkpoint serializer contract, kept here as a frozen
// small fixture. That client canonically compares its serialized restore with
// stored bytes, so it must reject rather than silently erase a future marker.
// This is a serializer-boundary test, not a running old browser claim.
function frozenLegacyCheckpoint(s){return {version:1,act:s.act,room:s.room,seed:s.seed,phase:s.phase,course:checkpointExpansionCourse(s.course),boss:s.boss?checkpointExpansionBoss(s.boss):null,...(s.siege?{siege:checkpointCrystalSiege(s.siege)}:{}),...(s.objective?{objective:s.objective}:{})};}
function oldCanonicalAccepts(entry){const restored=restoreExpansionJourney(entry.journey);return Boolean(restored&&JSON.stringify(frozenLegacyCheckpoint(restored))===JSON.stringify(entry.journey));}
function canonical(s,run){
 const e=createExpansionEntry(s,run,[0,0,5],{id:`guardians-${s.act}`,revision:canonicalEntries});assert(e,'actual entrance serialization accepts the new marker');assert(validExpansionEntry(e));assert.deepEqual(checkpointExpansionJourney(restoreExpansionJourney(copy(e.journey))),e.journey);
 const storage=new Map(),store=createExpansionSaveStore({getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},s.act,'guardian-owner');assert(store.write(e,{fresh:true}).ok);assert.deepEqual(store.read().journey,e.journey);canonicalEntries++;
 assert(!oldCanonicalAccepts(e),'an old canonical serializer cannot downgrade the marker');oldSerializerRejections++;return e;
}
function finishCourse(s){
 // Actual finite packet engines, with the harness immediately removing each
 // spawned actor. No injected finish flag, receipt or skipped course packet.
 // This validates progress/serialization, not combat difficulty or AI kills.
 let done=false;
 for(let n=0;n<2000;n++){
  const o=stepExpansionJourney(s,.1,{player:{x:s.act==='crosswind'?200:0,z:s.siege?5:-8},enemyCount:0,projectileCount:0,enemies:[],fastPacing:true,laneHalfDepth:8.1});frames++;packets+=o.spawns.length;
  if(o.finish){done=true;break;}
 }
 assert(done,'finite real course reaches its guardian gate');assert(expansionGuardianCourseReady(s));
}
function deathHost(s){
 const toast={textContent:''},c=vm.createContext({expansionJourney:s,expansionGuardianActor:{},creditExpansionGuardian,expansionGuardianProgress,wardensDefeated:0,score:0,audio:{play:()=>{}},$:()=>toast,released:0,releaseEnemy:()=>c.released++});
 vm.runInContext(`function actualGuardianDeath(e){${deathLine}}`,c);return c;
}
assert.equal(EXPANSION_WARDENS_PER_BOSS,5);
for(const [act,siege]of [['crosswind',false],['crystalGorge',false],['crystalGorge',true]]){
 const s=createExpansionJourney(act,0,413,{wardens:true,siege,quickPrep:siege});
 for(let room=0;room<5;room++){
  const run={...RUN,stage:room,wardens:room};assert.equal(s.room,room);assert.equal(s.guardians.cleared,room);assert.equal(s.phase,'course');canonical(s,run);
  assert(expansionGuardianNeeded(s));assert(!expansionGuardianCourseReady(s));assert(!expansionGuardiansAllowAdvance(s));assert.equal(advanceExpansionJourney(s),false);const before=copy(checkpointExpansionJourney(s)),id=expansionGuardianId(s);
  assert.equal(creditExpansionGuardian(s,id),false,'matching ID cannot bypass its course');assert.deepEqual(checkpointExpansionJourney(s),before);
  finishCourse(s);assert.equal(advanceExpansionJourney(s),false,'clearing all ordinary mobs cannot replace the guardian');assert.equal(creditExpansionGuardian(s,id+'-another'),false);assert.equal(creditExpansionGuardian(s,id.replace(act,act==='crosswind'?'crystalGorge':'crosswind')),false,'another act cannot credit this gate');
  assert.equal(expansionGuardianId(s),id,'course RNG draws do not change the active gate ID');
  const checkpoint=copy(checkpointExpansionJourney(s)),restored=restoreExpansionJourney(checkpoint);assert(restored);assert.deepEqual(checkpointExpansionJourney(restored),checkpoint);assert.equal(expansionGuardianId(restored),id);
  const c=deathHost(s),living={expansionWarden:true,guardianId:id,dead:false,hp:0},positiveHp={expansionWarden:true,guardianId:id,dead:true,hp:1},notFinite={expansionWarden:true,guardianId:id,dead:true,hp:NaN};
  for(const e of [living,positiveHp,notFinite]){c.actualGuardianDeath(e);assert.equal(s.guardians.cleared,room,'only a genuine finite-HP death can credit a guardian');assert.equal(c.score,0);assert.equal(c.released,0);}
  const dead={expansionWarden:true,guardianId:id,dead:true,hp:-1};c.actualGuardianDeath(dead);assert.equal(s.guardians.cleared,room+1);assert.equal(c.wardensDefeated,1);assert.equal(c.score,1000);assert.equal(c.released,1);credits++;
  c.actualGuardianDeath(dead);assert.equal(c.score,1000);assert.equal(c.released,1);assert.equal(creditExpansionGuardian(s,id),false,'duplicate callback and direct duplicate ID both fail');assert(!expansionGuardianNeeded(s));assert(expansionGuardiansAllowAdvance(s));assert.equal(expansionGuardianProgress(s),`${room+1}/5 문지기 격파`);
  assert(restoreExpansionJourney(copy(checkpointExpansionJourney(s))),'credited, completed course state is canonical');assert.equal(createExpansionEntry(s,run,[0,0,5]),null,'mid-course gains are not promoted to a room entrance');
  assert(advanceExpansionJourney(s));assert.equal(s.phase,room===4?'boss':'course');if(room<4)assert.notEqual(expansionGuardianId(s),id,'the next gate has a distinct room identity');
 }
 assert.equal(s.guardians.cleared,5);assert.equal(s.room,4);assert.equal(s.boss.id,act==='crosswind'?'crosswindKeeper':'crystalGardener');canonical(s,{...RUN,stage:4,wardens:5});assert.equal(creditExpansionGuardian(s,expansionGuardianId(s)),false,'boss cannot award a sixth guardian');
 s.phase='finished';assert.equal(advanceExpansionJourney(s),false);assert(restoreExpansionJourney(copy(checkpointExpansionJourney(s))));
}

for(const act of ['crosswind','crystalGorge']){
 const fresh=createExpansionJourney(act,0,413,{wardens:true}),raw=checkpointExpansionJourney(fresh);
 for(const guardians of [null,{},[],{version:2,cleared:0},{version:1,cleared:-1},{version:1,cleared:.5},{version:1,cleared:5},{version:1,cleared:0,extra:true}])assert.equal(restoreExpansionJourney({...copy(raw),guardians}),null,'unknown/future/corrupt gate state never silently restores');
 const early={...copy(raw),guardians:{version:1,cleared:1}};assert.equal(restoreExpansionJourney(early),null,'a receipt cannot precede course completion');
 const boss=checkpointExpansionBoss(createExpansionBoss(fresh.bossId,{seed:413}));
 for(const phase of ['boss','finished'])assert.equal(restoreExpansionJourney({...copy(raw),phase,boss,guardians:{version:1,cleared:5}}),null,'room zero cannot become a final boss or finished route');
 assert.equal(validExpansionGuardians({version:1,cleared:5},0,'boss'),false);
 // Legacy records remain unmarked, and default shared-mode construction keeps
 // its original advance contract. Migration happens only on a new Journey.
 const legacy=createExpansionJourney(act,0,413),oldEntry=createExpansionEntry(legacy,RUN,[0,0,5]);assert(oldEntry);assert(oldCanonicalAccepts(oldEntry));const resumed=restoreExpansionJourney(copy(oldEntry.journey));assert(resumed);assert.equal(Object.hasOwn(resumed,'guardians'),false);assert.equal(expansionGuardianProgress(resumed),null);assert.equal(expansionGuardianNeeded(resumed),false);assert(advanceExpansionJourney(resumed));assert.equal(Object.hasOwn(checkpointExpansionJourney(resumed),'guardians'),false);
 const explicit=createExpansionJourney(act,0,413,{wardens:false});assert.deepEqual(checkpointExpansionJourney(explicit),frozenLegacyCheckpoint(legacy));
}
// Actual dispatcher deliberately lets the existing Warden AI handle tagged
// gate actors. Its placeholder expansionThreat is not a generic minion spec.
assert(source.includes('if(e.expansionActor&&!e.expansionWarden){tickExpansionActor(e,edt);continue;}'));
assert(source.includes("if(e.type==='warden')"));assert(source.includes('wardens:true'),'native fresh Journey opts in; existing restore remains unmodified');
console.log(JSON.stringify({test:'Expansion five-guardian progression and canonical saves',routes:3,guardianDeaths:credits,canonicalEntries,oldSerializerRejections,frames,spawnedActors:packets,host:'actual tagged death branch in VM',claim:'renderless ledger and host guards; combat play/browser/cloud proof separate'}));
