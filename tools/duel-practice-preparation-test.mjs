import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDuel,stepDuel,DUEL_RELEASE_CHARACTERS} from '../src/seed-duel-rules.js';
import {DUEL_SECOND_SKILL_PLANS,secondSkillPracticeReady} from '../src/seed-duel-practice.js';
import {createDuelChordInput} from '../src/seed-duel-input.js';

const scene=id=>{const s=createDuel({released:true,practice:true,player:id,enemy:'pierce',seed:41});s.phase='fight';const [p,e]=s.fighters;Object.assign(p,{x:16.5,y:10.8,fx:1,fy:0});Object.assign(e,{x:18.4,y:10.8});return s;};
const tick=(s,input={})=>stepDuel(s,1/60,input,{});
assert.equal(Object.keys(DUEL_SECOND_SKILL_PLANS).length,31);
for(const [id,plan] of Object.entries(DUEL_SECOND_SKILL_PLANS)){
 assert(DUEL_RELEASE_CHARACTERS[id]);assert(plan.cue.length>20);assert(Object.isFrozen(plan));
 const s=scene(id),before=structuredClone(s);
 for(let k=0;k<10;k++)assert.equal(secondSkillPracticeReady(s),false,id+' empty-field denied');
 assert.deepEqual(s,before,id+' inspection cannot create prerequisites');
 for(let k=0;k<480;k++)tick(s,k%60===0?{skill2:true,aimX:1,aimY:0}:{});
 assert.equal(s.fighters[0].cd[1],0,id+' repeated empty second input stays unpaid');assert.equal(s.hazards.length+s.shots.length,0);
}
function prepare(id,aim,placement){
 const s=scene(id);if(placement)Object.assign(s.fighters[0],placement);
 tick(s,{skill1:true,...aim});let frame=0;
 for(;frame<180&&!secondSkillPracticeReady(s);frame++)tick(s);
 assert(secondSkillPracticeReady(s),id+' genuine first input eventually ready');
 const before=structuredClone(s);for(let k=0;k<10;k++)assert.equal(secondSkillPracticeReady(s),true);assert.deepEqual(s,before,'ready inspection has no side effects');
 return {s,frame};
}
for(const [id,aim,placement] of [
 ['final-frostkaleidoscope-reflect',{aimX:-1,aimY:0},{x:3.2,fx:-1}],
 ['final-frostkaleidoscope-frost',{aimX:1,aimY:0}],
 ['final-rewindbolt-recall',{aimX:0,aimY:-1}],
 ['final-rewindbolt-chain',{aimX:1,aimY:0}],
 ['final-rimeback-recall',{aimX:1,aimY:0}]
]){
 const {s}=prepare(id,aim,placement);tick(s,{skill2:true,...aim});assert(s.fighters[0].cd[1]>0,id+' actual paid second action accepted');
 assert(s.events.includes('skill'),id+' actual cast receipt');
}
const expiry=prepare('final-frostkaleidoscope-reflect',{aimX:-1,aimY:0},{x:3.2,fx:-1}).s;
for(let k=0;k<240;k++)tick(expiry);
assert.equal(secondSkillPracticeReady(expiry),false,'expired stamp is no longer ready');tick(expiry,{skill2:true});assert.equal(expiry.fighters[0].cd[1],0,'expired second cast denied');
const miss=scene('final-rewindbolt-recall');tick(miss,{skill1:true,aimX:1,aimY:0});for(let k=0;k<180;k++){tick(miss);assert.equal(secondSkillPracticeReady(miss),false,'already visited dummy cannot become a stepping stone');}
const normal=scene('pierce');assert.equal(secondSkillPracticeReady(normal),true);normal.practice=false;assert.equal(secondSkillPracticeReady(normal),false,'no practice feedback for normal matches');
// Model the real view path: directions supply aim; absent directions auto-aim
// at the dummy. The dummy caps cooldowns but supplies no prerequisite receipts.
function viewInputTrial(id,direction,expectReady,releasedBeforeFrame=false){
 const s=scene(id),p=s.fighters[0],e=s.fighters[1],wall=DUEL_SECOND_SKILL_PLANS[id].wall;
 p.x=wall?3.2:16.5;e.x=p.x+1.9;p.fx=wall?-1:1;
 let clock=0,block=false,movement={x:direction[0],y:direction[1]};const chord=createDuelChordInput({now:()=>clock,blockHeld:()=>block,aim:()=>movement});
 chord.press('attack');clock+=10;chord.press('dodge');
 if(releasedBeforeFrame){movement={x:0,y:0};clock+=50;}
 const input={...chord.read(),...movement};
 if(input.aimX===undefined&&Math.hypot(input.x,input.y)>.1){input.aimX=input.x;input.aimY=input.y;}
 if(releasedBeforeFrame){assert.equal(input.x,0);assert.equal(input.y,0,'released direction cannot move the character');}
 tick(s,input);let ready=false;
 for(let k=0;k<180;k++){
  p.cd[0]=Math.min(p.cd[0],1);p.cd[1]=Math.min(p.cd[1],1);
  tick(s,{});ready=secondSkillPracticeReady(s);if(ready)break;
 }
 assert.equal(ready,expectReady,id+' view-like direction and chord input');
 if(ready){block=true;chord.press('block');clock+=10;chord.press('dodge');tick(s,chord.read());assert(p.cd[1]>0,id+' second chord actually paid');}
}
viewInputTrial('final-frostkaleidoscope-reflect',[-1,0],true);
viewInputTrial('final-frostkaleidoscope-reflect',[0,0],false);
viewInputTrial('final-rewindbolt-recall',[0,-1],true);
viewInputTrial('final-rewindbolt-recall',[0,0],false);
viewInputTrial('final-frostkaleidoscope-reflect',[-1,0],true,true);
viewInputTrial('final-rewindbolt-recall',[0,-1],true,true);
viewInputTrial('final-rewindbolt-recall',[1,-1],true,true);
for(const id of ['final-frostkaleidoscope-reflect','final-echolane-reflect','final-rewindbolt-recall'])assert(DUEL_SECOND_SKILL_PLANS[id].cue.includes('누른 채'),'manual direction is explicit');
const source=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
assert(source.includes('plan?.wall?DUEL_ARENA.minX+1.7'));assert(source.includes("if(now-uiAt>90){uiAt=now;hud();drillFeedback();}"));
assert(source.includes("check:p=>p.cd[1]>0"),'success still needs a real paid action');
console.log('Practice preparation PASS:31 empty-field guards/read-only lookups,5 actual natural preparations and paid casts,7 view-like chord/direction cases including release before frame and diagonal miss,expiry,visited-target negative control,normal match isolation,bounded HUD refresh. Host tests, not physical-device QA.');
