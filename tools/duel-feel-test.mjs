import assert from 'node:assert/strict';
import {createDuelFeel,applyDuelFeelEvent,stepDuelFeel,resetDuelFeel,createDuelPointerHolds} from '../src/duel-feel.js';

// The same impact has equal time cost at mobile/desktop rates, including a
// slow frame crossing its end. Continued multi-hit contacts cannot pin a stop.
for(const hz of [20,60,120]){
 const f=createDuelFeel();applyDuelFeelEvent(f,'heavyHit',2,3);
 let elapsed=0,game=0;
 while(elapsed<.1-1e-8){const dt=Math.min(1/hz,.1-elapsed);game+=stepDuelFeel(f,dt);elapsed+=dt;}
 assert.ok(Math.abs(game-.064)<1e-8,`impact duration differs at ${hz}Hz`);
 assert.equal(f.stopLeft,0);
}
const burst=createDuelFeel();applyDuelFeelEvent(burst,'parry');
for(let i=0;i<6;i++){
 stepDuelFeel(burst,.01);
 for(let k=0;k<24;k++)applyDuelFeelEvent(burst,'parry');
}
assert.equal(burst.stopLeft,0,'multi-hit burst extended the stop');
assert.ok(burst.labelLeft<.5,'duplicate label kept restarting');
applyDuelFeelEvent(burst,'guardBreak',4,6);
assert.equal(burst.label,'막기 파괴!');
applyDuelFeelEvent(burst,'link',1,1);
assert.equal(burst.labelX,4,'minor feedback replaced a guard-break location');
stepDuelFeel(burst,1);
assert.equal(burst.label,'');

// Most attacks intentionally have no presentation slowdown. Empty explosion
// events and an engine-owned freeze must not produce another presentation stop.
for(const event of ['hit','block','skill','ultimate','swing0','unknown']){
 const f=createDuelFeel();assert.equal(applyDuelFeelEvent(f,event),false);
 assert.equal(stepDuelFeel(f,.02),.02);
}
const inherited=createDuelFeel();
applyDuelFeelEvent(inherited,'parry',2,3,{engineFreeze:.08});
assert.equal(inherited.label,'반격 막기!');
assert.equal(stepDuelFeel(inherited,.02),.02,'engine freeze was doubled');
const miss=createDuelFeel();
assert.equal(applyDuelFeelEvent(miss,'heavyHit',0,0,{contact:false}),false);
assert.equal(miss.label,'');assert.equal(miss.stopLeft,0);

// Motion preference can change live; labels remain available. Pause/menu never
// retain a transient slowdown for the first frame after returning.
const reduced=createDuelFeel({reducedMotion:true});applyDuelFeelEvent(reduced,'heavyHit');
assert.equal(stepDuelFeel(reduced,.02),.02);assert.equal(reduced.label,'강타!');
const live=createDuelFeel();applyDuelFeelEvent(live,'heavyHit');
assert.equal(stepDuelFeel(live,.01,{reducedMotion:true}),.01);
applyDuelFeelEvent(live,'guardBreak');stepDuelFeel(live,.01,{paused:true});
assert.equal(live.label,'');assert.equal(live.stopLeft,0);
assert.equal(stepDuelFeel(live,.02),.02);
for(const dt of [NaN,Infinity,-1,0])assert.equal(stepDuelFeel(live,dt),0);
resetDuelFeel(live);assert.equal(live.cooldown,0);

// Actual cancellation/lost-capture ordering often delivers duplicate end events
// while another finger is still guarding or moving.
const touch=createDuelPointerHolds();
assert.equal(touch.begin(0,'block'),true);
assert.equal(touch.begin(1,'block'),true);
assert.equal(touch.begin(2,'move'),true);
assert.equal(touch.end(0),'block');assert.equal(touch.held('block'),true);
assert.equal(touch.end(0),null);assert.equal(touch.end(99),null);
assert.equal(touch.held('move'),true);assert.equal(touch.held('block'),true);
assert.equal(touch.begin(1,'attack'),false,'active pointer ownership was stolen');
assert.equal(touch.end(1),'block');assert.equal(touch.held('block'),false);
assert.equal(touch.held('move'),true);
touch.clear();assert.equal(touch.size,0);assert.equal(touch.held('move'),false);
for(const id of [undefined,NaN,-1])assert.equal(touch.begin(id,'block'),false);
for(let id=0;id<16;id++)assert.equal(touch.begin(id,'block'),true);
assert.equal(touch.begin(16,'attack'),false,'unbounded stale pointer growth');
touch.clear();assert.equal(touch.begin(16,'attack'),true);
console.log('PASS duel feel: real-time duration, contact gating, engine freeze, reduced motion, lifecycle and multitouch ownership');
