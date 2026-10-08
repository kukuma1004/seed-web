import assert from 'node:assert/strict';
import {expansionPurposeText,expansionPurposeHint,expansionExitText,crystalBossGuardSpawns} from '../src/journey-purpose.js';
import {createExpansionPublicCampaign,completeExpansionPublicBoss,ackExpansionPublicTitle,advanceExpansionPublicCampaign} from '../src/expansion-public-campaign.js';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';
const j=createExpansionJourney('crystalGorge');
assert.match(expansionPurposeHint(j,'수정을 깨세요'),/이전 협곡/);
const siege=createExpansionJourney('crystalGorge',0,413,{siege:true});
assert.match(expansionPurposeHint(siege,'수정을 깨세요'),/채집.*시설.*최종 보스/);
assert(!expansionPurposeHint(siege,'수정을 깨세요').includes('수정을 깨세요'));
assert.match(expansionPurposeText(siege,createExpansionPublicCampaign('crystalGorge')),/심장 방어 1\/5.*보스 0\/3/);
j.room=4;assert.match(expansionExitText(j),/최종 보스에게/);advanceExpansionJourney(j);
let campaign=createExpansionPublicCampaign('crystalGorge');
assert.match(expansionExitText(j),/로컬 보스 검토/);
for(let win=1;win<=3;win++){
 assert.match(expansionPurposeText(j,campaign),new RegExp(`최종 보스 ${win-1}/3`));
 campaign=completeExpansionPublicBoss(campaign,'crystalGorge');
 assert.match(expansionExitText(j,campaign),win===3?/완주 정산/:/다음 순환/);
 campaign=ackExpansionPublicTitle(campaign,'crystalGorge');
 if(win<3)campaign=advanceExpansionPublicCampaign(campaign,'crystalGorge');
}
const actor={expansionMotion:{id:'crystalGardener',phase:0},hp:2400};
assert.equal(crystalBossGuardSpawns(actor,[{type:'boss-tell'}]).length,0);
for(let phase=0;phase<3;phase++){
 actor.expansionMotion.phase=phase;const guards=crystalBossGuardSpawns(actor,[{type:'crystal-regrowth'}]);
 assert.equal(guards.length,2);assert(guards.every(g=>g.siegeGuard&&g.damage>0&&g.hp>0));
 assert.equal(crystalBossGuardSpawns(actor,[{type:'crystal-regrowth'}]).length,0);
}
assert.equal(crystalBossGuardSpawns({...actor,siegeGuardMask:0},[{type:'crystal-regrowth'}],4).length,0);
assert.equal(crystalBossGuardSpawns({...actor,siegeGuardMask:0,dead:true},[{type:'crystal-regrowth'}]).length,0);
console.log('Journey purpose: legacy/new5 hints, true boss3 labels, bounded HP-phase core guards PASS (pure rules).');
