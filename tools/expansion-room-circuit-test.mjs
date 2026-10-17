import assert from 'node:assert/strict';
import {createExpansionJourney,advanceExpansionJourney,stepExpansionJourney,checkpointExpansionJourney,restoreExpansionJourney,expansionRoomCircuit,expansionGateIndex,expansionRoomCircuitKillBudget,createExpansionThreat} from '../src/expansion-journey.js';
import {expansionGuardianId,expansionGuardianNeeded,expansionGuardianCourseReady,creditExpansionGuardian,expansionGuardiansAllowAdvance} from '../src/expansion-guardians.js';
import {createCrystalSiege,checkpointCrystalSiege,restoreCrystalSiege,harvestCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense,stepCrystalSiegePaidFacilities,stepCrystalSiegeBossFacilities,crystalSiegeFacilityMaxHp,stepCrystalSiegeThreat} from '../src/crystal-siege-rules.js';
import {crystalBossGuardSpawns} from '../src/journey-purpose.js';
import {createExpansionEntry,validExpansionEntry,expansionExitCheckpoint} from '../src/expansion-run-save.js';
import {createExpansionPublicCampaign,completeExpansionPublicBoss,ackExpansionPublicTitle,advanceExpansionPublicCampaign} from '../src/expansion-public-campaign.js';

const copy=v=>JSON.parse(JSON.stringify(v));
const RUN={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:0,tonic:0,wind:0,shell:0,sprout:0},score:0,choicesTaken:0,choiceKills:0,wardens:0,austins:0};
let entries=0,frames=0,normalActors=0,wardenCredits=0,bossEntries=0,resourcePeak=0,regrowthGuardsAdvanced=0;
const roundtrip=s=>{const raw=copy(checkpointExpansionJourney(s)),restored=restoreExpansionJourney(raw);assert(restored,`${s.act} gate${expansionGateIndex(s)} room${s.room} ${s.phase} restores`);assert.deepEqual(checkpointExpansionJourney(restored),raw);return restored;};
function entry(s,lap){
 const value=createExpansionEntry(s,{...RUN,cycle:lap,stage:s.room,wardens:lap*5+s.guardians.cleared},[0,0,5],{id:'room-circuit-test',revision:entries});assert(value);assert(validExpansionEntry(copy(value)));entries++;
 assert(JSON.stringify(value).length<100000);return value;
}
function finishCourse(s){
 assert.equal(expansionGuardianNeeded(s),false,'ordinary rooms never spawn a warden');
 const before=checkpointExpansionJourney(s);assert.equal(advanceExpansionJourney(s),false,'an unfinished normal room cannot advance');assert.equal(creditExpansionGuardian(s,expansionGuardianId(s)),false);assert.deepEqual(checkpointExpansionJourney(s),before);
 let count=0,finished=false;const ids=new Set();
 // The harness removes emitted actors immediately. This is progression and
 // receipt verification using the real finite engines, not a combat win rate.
 for(let i=0;i<3000;i++){
  const out=stepExpansionJourney(s,.1,{player:{x:s.act==='crosswind'?200:0,z:s.siege?5:-8},enemies:[],enemyCount:0,projectileCount:0,fastPacing:true,laneHalfDepth:8.1});frames++;
  assert(out.spawns.length<=2);for(const spec of out.spawns){assert(!ids.has(spec.id));ids.add(spec.id);count++;}
  if(out.finish){finished=true;break;}
 }
 assert(finished);assert(expansionGuardianCourseReady(s));assert(expansionGuardiansAllowAdvance(s));roundtrip(s);normalActors+=count;return count;
}
function harvestAndBuild(s,gate,room){
 const siege=s.siege;if(!siege)return;
 for(const node of siege.nodes){assert(node.id.startsWith(`node-${gate}-${room}-`));assert(harvestCrystalSiege(siege,node.id,node).ok);assert.equal(harvestCrystalSiege(siege,node.id,node).ok,false);}
 if(gate===0&&room===0){for(const [i,kind]of ['turret','snare','wall','turret'].entries())assert(buildCrystalSiege(siege,siege.pads[i].id,kind,siege.pads[i]).ok);}
 for(const pad of siege.pads)if(pad.kind)while(buildCrystalSiege(siege,pad.id,pad.kind,pad).ok){}
 for(const pad of siege.pads)assert(pad.hp<=crystalSiegeFacilityMaxHp(pad));if(gate===0&&room===0){siege.pads[0].hp-=11;siege.pads[1].hp=0;}resourcePeak=Math.max(resourcePeak,siege.resources);
}

for(const act of ['crosswind','crystalGorge']){
 let campaign=createExpansionPublicCampaign(act,{receiptRunId:`circuit-${act}`}),campaignActors=0;
 for(let lap=0;lap<3;lap++){
  const s=createExpansionJourney(act,0,413+lap,{roomCircuit:true,siege:act==='crystalGorge',quickPrep:true});assert(expansionRoomCircuit(s));let lapActors=0;
  for(let gate=0;gate<5;gate++){
   assert.equal(expansionGateIndex(s),gate);assert.equal(s.guardians.cleared,gate);assert.equal(s.guardians.receipts.length,gate);
   for(let room=0;room<4;room++){
    assert.equal(s.room,room);const entrance=entry(s,lap);roundtrip(s);harvestAndBuild(s,gate,room);
    // All unfinished gains disappear on save/exit; damage and spending remain.
    if(s.siege){const saved=expansionExitCheckpoint(entrance,{hp:80,inventory:RUN.inventory,siege:checkpointCrystalSiege(s.siege)});assert(saved);assert(saved.journey.siege.resources<=entrance.journey.siege.resources);assert.deepEqual(saved.journey.siege.nodes,entrance.journey.siege.nodes);}
    const paid=s.siege?.pads.map(p=>({...p}));lapActors+=finishCourse(s);assert(advanceExpansionJourney(s));assert.equal(s.room,room+1);
    if(paid)for(let i=0;i<4;i++){assert.equal(s.siege.pads[i].kind,paid[i].kind);assert.equal(s.siege.pads[i].level,paid[i].level);assert.equal(s.siege.pads[i].hp,paid[i].hp);}
   }
   assert.equal(s.room,4);entry(s,lap);roundtrip(s);assert(expansionGuardianNeeded(s));assert(expansionGuardianCourseReady(s));assert(!advanceExpansionJourney(s),'fifth room cannot advance before its actual warden receipt');
   const id=expansionGuardianId(s),before=copy(checkpointExpansionJourney(s));assert.equal(id,`gate:${act}:${gate}:4:${s.seed}`);
   let hitBuffer,snareBuffer;
   for(let i=0;i<60;i++){const out=stepExpansionJourney(s,100,{player:{x:200,z:-8},enemies:[],enemyCount:0});assert(out.finish);assert.equal(out.spawns.length,0);assert(Array.isArray(out.hits));assert(Array.isArray(out.snares));assert.equal(out.hits.length,0);assert.equal(out.snares.length,0);assert.equal(out.phase,s.siege?'prep':'course');for(const unused of out.hits)assert.fail('warden output cannot fire paid facilities twice');for(const unused of out.snares)assert.fail('warden output cannot snare twice');if(i){assert.equal(out.hits,hitBuffer);assert.equal(out.snares,snareBuffer);}hitBuffer=out.hits;snareBuffer=out.snares;}
   assert.deepEqual(checkpointExpansionJourney(s),before,'warden room never fabricates normal-course completion or mobs');
   assert.equal(creditExpansionGuardian(s,id+'-forged'),false);assert.equal(creditExpansionGuardian(s,id.replace(`:${gate}:4:`,`:5:4:`)),false);
   if(s.siege){
    const siege=s.siege,pad=siege.pads[0],enemy={id:'actual-warden',x:pad.x,z:pad.z,hp:1000};assert.equal(harvestCrystalSiege(siege,siege.nodes[0].id,siege.nodes[0]).ok,false);assert.equal(buildCrystalSiege(siege,pad.id,'turret',pad).ok,false);assert.equal(startCrystalSiegeDefense(siege).ok,false);
    const hits=stepCrystalSiegePaidFacilities(siege,.1,[enemy],{boss:true});assert(hits.hits.some(hit=>hit.facilityId===pad.id&&hit.id===enemy.id&&hit.damage>0),'real paid turret supports standalone warden');assert(!hits.spawns.length);
    assert.equal(stepCrystalSiegeBossFacilities(siege,.1,[enemy]).hits.length,0,'boss-only hook needs the fifth receipt');
   }
   assert(creditExpansionGuardian(s,id));wardenCredits++;assert.equal(s.guardians.cleared,gate+1);assert.equal(s.guardians.receipts.at(-1),id);assert.equal(creditExpansionGuardian(s,id),false,'duplicate warden gives nothing');assert(!expansionGuardianNeeded(s));roundtrip(s);
   for(const mutate of [v=>v.guardians.receipts.pop(),v=>v.guardians.receipts.push(id),v=>v.guardians.receipts[v.guardians.receipts.length-1]=id+'-forged',v=>v.guardians.receipts[v.guardians.receipts.length-1]=id.replace(`:${gate}:4:`,`:5:4:`)]){const bad=copy(checkpointExpansionJourney(s));mutate(bad);assert.equal(restoreExpansionJourney(bad),null,'missing, duplicated, forged or skipped warden receipt never restores');}
   const paid=s.siege?.pads.map(p=>({...p})),funds=s.siege?.resources;
   assert(advanceExpansionJourney(s));if(gate<4){assert.equal(s.room,0);assert.equal(s.phase,'course');if(paid){assert.equal(s.siege.resources,funds);for(let i=0;i<4;i++){assert.equal(s.siege.pads[i].level,paid[i].level);assert.equal(s.siege.pads[i].hp,paid[i].hp);}assert(s.siege.nodes.every(n=>!n.harvested));}}
   else{
    assert.equal(s.phase,'boss');assert.equal(s.room,4);bossEntries++;entry(s,lap);roundtrip(s);assert.equal(advanceExpansionJourney(s),false,'boss cannot accidentally advance a sixth gate');
    if(s.siege){
     let events;for(let n=0;n<200;n++){const out=stepExpansionJourney(s,.1,{position:{x:5,z:0},player:{x:0,z:5},walls:s.course.walls,activeProjectiles:0,hpRatio:1});if(out.events.some(e=>e.type==='crystal-regrowth')){events=copy(out.events);break;}}
     assert(events,'new final boss actually reaches authored regrowth attack');
     const guards=crystalBossGuardSpawns({expansionMotion:{id:'crystalGardener',phase:0},dead:false,hp:100},events,0);assert.equal(guards.length,2);
     const model=createExpansionThreat(guards[0]),start={...model.position};let coreHit=0,warned=false;
     for(let n=0;n<400&&!coreHit;n++){const out=stepCrystalSiegeThreat(model,.1,s.siege,{player:{x:0,z:5},bossGuard:true});warned||=out.tell?.kind==='siege-strike';coreHit+=out.coreHit;}
     assert(model.position.x!==start.x||model.position.z!==start.z,'real native regrowth guard moves in marked prep ledger');assert(warned,'guard retains warned core strike');assert.equal(coreHit,7);regrowthGuardsAdvanced++;roundtrip(s);
    }
   }
  }
  assert.equal(lapActors+6,expansionRoomCircuitKillBudget(act));campaignActors+=lapActors;
  campaign=completeExpansionPublicBoss(campaign,act);assert(campaign);assert.equal(completeExpansionPublicBoss(campaign,act),null);campaign=ackExpansionPublicTitle(campaign,act);
  if(lap<2){campaign=advanceExpansionPublicCampaign(campaign,act);assert.equal(campaign.lap,lap+1);}else{assert.equal(advanceExpansionPublicCampaign(campaign,act),null,'third boss still finishes the existing campaign');}
 }
 assert.equal(campaignActors,(expansionRoomCircuitKillBudget(act)-6)*3);
}

for(const act of ['crosswind','crystalGorge']){
 const s=createExpansionJourney(act,0,7,{roomCircuit:true,siege:act==='crystalGorge'}),raw=checkpointExpansionJourney(s);
 for(const mutate of [v=>v.guardians.cleared=1,v=>v.guardians.gateCleared=true,v=>v.guardians.receipts=['gate:crosswind:1:4:7'],v=>v.guardians.version=3,v=>v.guardians.unknown=true,v=>v.course.encounterVersion=1,v=>v.course.spawnIndex=999,v=>v.course.finishAnnounced=true,v=>v.seed=0,v=>v.phase='boss',v=>v.future=true]){const bad=copy(raw);mutate(bad);assert.equal(restoreExpansionJourney(bad),null);}
 assert.throws(()=>createExpansionJourney(act,2,7,{roomCircuit:true}));
 if(s.siege){for(const mutate of [v=>v.siege.journeyCircuit.gate=1,v=>v.siege.journeyCircuit.wardenCleared=true,v=>delete v.siege.journeyCircuit,v=>v.siege.resources=16,v=>v.siege.nodes[0].id='node-0-0']){const bad=copy(raw);mutate(bad);assert.equal(restoreExpansionJourney(bad),null);}}
 for(const options of [{},{wardens:true},{wardens:false},...(act==='crystalGorge'?[{siege:true,quickPrep:true,wardens:true}]:[])]){
  const legacy=createExpansionJourney(act,0,413,options),checkpoint=copy(checkpointExpansionJourney(legacy));assert(!expansionRoomCircuit(legacy));assert(!legacy.siege?.journeyCircuit);if(legacy.guardians)assert.deepEqual(legacy.guardians,{version:1,cleared:0});assert.deepEqual(checkpointExpansionJourney(restoreExpansionJourney(checkpoint)),checkpoint);
 }
}
// Shared modes keep old schema/caps and cannot carry into the new route.
const shared=createCrystalSiege(),rawShared=checkpointCrystalSiege(shared);assert(!Object.hasOwn(rawShared,'journeyCircuit'));assert.throws(()=>restoreCrystalSiege({...rawShared,resources:16}));assert.throws(()=>createCrystalSiege(1,7,rawShared,null,3,{version:1,gate:0,wardenCleared:false}));
const malformed=createCrystalSiege(4,7,null,10,3,{version:1,gate:0,wardenCleared:false});for(const mutate of [s=>s.elapsed=1,s=>s.spawnIndex=1,s=>s.nodes[0].harvested=true,s=>s.phase='clear']){const bad=copy(checkpointCrystalSiege(malformed));mutate(bad);assert.throws(()=>restoreCrystalSiege(bad));}
for(let gate=0;gate<5;gate++)for(let room=0;room<5;room++){
 const raw=checkpointCrystalSiege(createCrystalSiege(room,7,null,10,3,{version:1,gate,wardenCleared:false})),cap=3+12*(gate*4+Math.min(room+1,4));raw.resources=cap;assert.equal(restoreCrystalSiege(raw).resources,cap);assert.throws(()=>restoreCrystalSiege({...raw,resources:cap+1}));
}
for(const siege of [createCrystalSiege(4),createCrystalSiege(4,7,null,10,3,{version:1,gate:4,wardenCleared:false}),createCrystalSiege(4,7,null,10,3,{version:1,gate:0,wardenCleared:true})]){
 const model=createExpansionThreat({id:'wrong-phase-guard',type:'charger',position:{x:.85,z:0},hp:50,speed:2,damage:7,shots:1,windup:.75,side:'front',cooldown:1,bulletSpeed:5}),before=copy(model);for(let n=0;n<30;n++)assert.equal(stepCrystalSiegeThreat(model,.1,siege,{bossGuard:true}).coreHit,0);assert.deepEqual(model,before,'default prep/unreceipted/nonfinal guardian phases stay inactive');assert.equal(siege.core.hp,100);
}
assert.equal(expansionRoomCircuitKillBudget('crosswind'),846);assert.equal(expansionRoomCircuitKillBudget('crystalGorge'),636);
assert.equal(wardenCredits,30);assert.equal(bossEntries,6);assert.equal(entries,156);assert(resourcePeak>63&&resourcePeak<=243,'paid facilities retain later accumulated resources within20-room cap');
assert.equal(regrowthGuardsAdvanced,3);
console.log(JSON.stringify({test:'Act4/5 opt-in room circuits',routes:6,normalRooms:120,standaloneWardenRooms:30,bossEntries,canonicalEntries:entries,normalActors,wardenCredits,frames,resourcePeak,regrowthGuardsAdvanced,perLapKills:{crosswind:846,crystalGorge:636},claim:'Actual finite engines and receipt/save helpers; harness removes spawned mobs. No browser/device/account completion claim.'}));
