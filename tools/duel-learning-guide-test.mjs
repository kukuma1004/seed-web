import assert from 'node:assert/strict';
import {createDuel,startDuelRound,stepDuel,DUEL_RELEASE_ORDER,DUEL_RELEASE_CHARACTERS} from '../src/seed-duel-rules.js';
import {DUEL_INTRO_STYLES,duelLearningGuide,duelStyleLesson,captureDuelStyleFrame,duelStyleLessonSucceeded} from '../src/duel-learning-guide.js';

for(const id of DUEL_RELEASE_ORDER){
 const c=DUEL_RELEASE_CHARACTERS[id],before=JSON.stringify(c),guide=duelLearningGuide(c);
 assert.equal(guide.role,c.role);assert.equal(guide.skills,c.skills);assert.equal(guide.ultimate,c.ult);assert(guide.approach);assert.equal(JSON.stringify(c),before);
}
assert.equal(duelLearningGuide(null),null);assert.equal(duelStyleLesson('private-candidate'),null);
assert.deepEqual(DUEL_INTRO_STYLES,['pierce','burst','gravity']);

// Arrange only starting positions and dummy policy. Every contact, guard,
// cooldown, hit receipt and pull is produced by the shipping stepDuel engine.
function attempt(id,{action,block=false,distance=duelStyleLesson(id).distance,away=false,repeat=false,moving=false,practice=true}={}){
 const s=createDuel({player:id,enemy:'pierce',practice,released:true,seed:73});startDuelRound(s);s.phase='fight';
 const [p,e]=s.fighters;p.x=15;p.y=10.8;e.x=p.x+distance;e.y=p.y;
 const snapshot={},c=DUEL_RELEASE_CHARACTERS[id];let success=false;
 for(let n=0;n<300;n++){
  const input={aimX:away?-1:1,aimY:0,x:moving&&Math.hypot(p.x-e.x,p.y-e.y)>1.9?1:0};if(n===18||repeat&&n>=18)input[action]=true;
  assert.equal(captureDuelStyleFrame(s,snapshot),snapshot);
  stepDuel(s,1/60,input,{block,aimX:-1,aimY:0});
  const before=JSON.stringify(s),passed=duelStyleLessonSucceeded(s,snapshot,c);assert.equal(JSON.stringify(s),before,'proof lookup never changes battle state');
  if(passed){success=true;break;}s.events.length=0;
 }
 return success;
}
assert(attempt('pierce',{action:'attack'}));assert(!attempt('pierce',{action:'attack',distance:1.1}),'a close jab is not the long-distance lesson');
assert(!attempt('pierce',{action:'attack',distance:5}));assert(!attempt('pierce',{action:'attack',block:true}));
assert(attempt('burst',{action:'heavy',block:true,repeat:true,moving:true}));assert(!attempt('burst',{action:'heavy',block:true,distance:6}));
assert(attempt('gravity',{action:'skill1',block:true}));assert(!attempt('gravity',{action:'skill1',block:true,distance:5.6}));
assert(!attempt('gravity',{action:'skill1',block:true,away:true}));assert(!attempt('gravity',{action:'skill2',block:true}));assert(!attempt('gravity',{action:'skill1',block:false}));
for(const id of DUEL_INTRO_STYLES)assert(!attempt(id,{action:'attack',practice:false}),'normal combat cannot complete practice lessons');
const s=createDuel({player:'burst',enemy:'pierce',practice:true,released:true});s.phase='fight';s.events.push('heavyHit');
const before=captureDuelStyleFrame(s,{});assert(!duelStyleLessonSucceeded(s,before,DUEL_RELEASE_CHARACTERS.burst),'empty leap/hit event is not a guard break');
console.log('Duel learning:175 real profiles,3 different shipping-engine lesson successes,11 miss/close/blocked/wrong-technique/normal-mode controls,read-only reusable proof PASS (arranged CPU, not human play)');
