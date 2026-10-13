import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDuel,stepDuel,startDuelRound,DUEL_RELEASE_CHARACTERS} from '../src/seed-duel-rules.js';
import {duelContact,duelContactSound,applyDuelIdentityContacts} from '../src/duel-contacts.js';
import {createDuelFeel,applyDuelFeelEvent} from '../src/duel-feel.js';
import {AUDIO_EVENTS,createAudioLimiter} from '../src/audio.js';
import {duelStyleLessonSucceeded} from '../src/duel-learning-guide.js';

// Only entry positions/phase are arranged; resources and contacts are earned
// by the real rules. No normal-account, native-input or listening claim.
function scenario(char,{distance=1.9,action='attack',block=false,away=false,escape=false,reverse=false,repeat=false,linked=false,seconds=2}={}){
 const s=createDuel({player:char,enemy:'pierce',practice:true,released:true,seed:73});startDuelRound(s);
 const [p,e]=s.fighters;p.x=15;p.y=10.8;e.x=p.x+distance;e.y=p.y;
 const frames=[];
 for(let n=0;n<seconds*60;n++){
  const a={aimX:away?-1:1,aimY:0},b={aimX:escape?1:-1,aimY:0,block};
  if(reverse){b.attack=n===18;a.block=n>=24;}
  else{a[action]=repeat?n>=18:n===18;if(linked)a.heavy=n===26;if(repeat)a.x=Math.hypot(p.x-e.x,p.y-e.y)>1.9?1:0;if(escape){b.dodge=n===18;b.x=n>=18?1:0;}}
  stepDuel(s,1/60,a,b);
  if(s.events.length)frames.push(structuredClone(s));s.events.length=0;
 }
 return {s,frames,damage:e.maxHp-e.hp};
}
const tip=scenario('pierce',{distance:2.7}),near=scenario('pierce',{distance:1.3}),miss=scenario('pierce',{distance:3.8}),away=scenario('pierce',{distance:2.7,away:true});
const tipFrame=tip.frames.find(s=>duelContact(s,'hit',0)?.contactSignal==='pierceTip');assert(tipFrame);assert.equal(tip.damage,11);
assert.equal(duelContact(tipFrame,'hit',1),null);assert.equal(duelContactSound(duelContact(tipFrame,'hit',0))[0],'pierceHit');
assert(near.frames.some(s=>duelContact(s,'hit',0)?.contactSignal==='hit'));assert.equal(miss.damage,0);assert.equal(away.damage,0);
for(const example of [near,miss,away])assert(!example.frames.some(s=>duelContact(s,'hit',0)?.contactSignal==='pierceTip'));

const leap=scenario('burst',{distance:4,action:'skill2'}),leapMiss=scenario('burst',{distance:4,action:'skill2',escape:true});
assert.equal(leap.damage,18);assert.equal(leapMiss.damage,0);
const heavyFrame=leap.frames.find(s=>duelContact(s,'hit',0)?.contactSignal==='heavyHit');assert(heavyFrame);assert(heavyFrame.events.includes('detonate'));assert(!heavyFrame.events.includes('heavyHit'),'landing is not a normal heavy contact event');
assert(leapMiss.frames.some(s=>s.events.includes('detonate')));assert(!leapMiss.frames.some(s=>duelContact(s,'heavyHit',0)));
const mine=scenario('burst',{distance:1.5,action:'skill1'}),mineMiss=scenario('burst',{distance:6,action:'skill1'}),mineBlock=scenario('burst',{distance:1.5,action:'skill1',block:true});
assert.equal(mine.damage,20);assert.equal(mineMiss.damage,0);assert.equal(mineBlock.damage,4);
assert(mine.frames.some(s=>duelContact(s,'hit',0)?.contactSignal==='heavyHit'));assert(!mineBlock.frames.some(s=>duelContact(s,'heavyHit',0)));
assert(mineMiss.frames.some(s=>s.events.includes('detonate')));

const pull=scenario('gravity',{distance:4,action:'skill1',block:true}),pullMiss=scenario('gravity',{distance:5.6,action:'skill1',block:true}),pullAway=scenario('gravity',{distance:4,action:'skill1',block:true,away:true});
assert.equal(pull.damage,8);assert.equal(pullMiss.damage,0);assert.equal(pullAway.damage,0);
const pullFrame=pull.frames.find(s=>duelContact(s,'hit',0)?.contactSignal==='gravityPull');assert(pullFrame);assert.equal(duelContactSound(duelContact(pullFrame,'hit',0))[0],'gravityHit');

for(const [frame,label] of [[tipFrame,'창끝 적중'],[heavyFrame,'강타!'],[pullFrame,'끌어오기!']]){
 const before=JSON.stringify(frame),feel=createDuelFeel();applyDuelIdentityContacts(feel,frame,applyDuelFeelEvent);assert.equal(feel.label,label);assert.equal(feel.stopLeft,0,'labels cannot duplicate core freeze or add stop to light/grab');assert.equal(JSON.stringify(frame),before);
 const reduced=createDuelFeel({reducedMotion:true});applyDuelIdentityContacts(reduced,frame,applyDuelFeelEvent);assert.equal(reduced.label,label);assert.equal(reduced.stopLeft,0);
}
for(const frame of [...leapMiss.frames,...mineMiss.frames,...pullMiss.frames,...pullAway.frames]){const feel=createDuelFeel();applyDuelIdentityContacts(feel,frame,applyDuelFeelEvent);assert.equal(feel.label,'');}
const stale=structuredClone(tipFrame);for(const e of stale.effects)e.life-=.01;assert.equal(duelContact(stale,'hit',0),null);
const legacy={effects:[{type:'heavy',x:2,y:3,life:.2,max:.2}]};assert(duelContact(legacy,'heavyHit'));assert.equal(duelContact(legacy,'heavyHit',0),null,'legacy presentation cannot award player-owned practice success');

// Exercise shipping practice success dispatch with real contact frames.
const view=readFileSync('src/seed-duel-view.js','utf8'),from=view.indexOf(' function drillEvents('),to=view.indexOf('\n function ',from+20);assert(from>0&&to>from);
function drill(frame,on,before={skillCd:0,meter:0}){
 let successes=0;const context=vm.createContext({s:frame,DRILLS:[{on}],CORE_DRILLS:[],drill:{on:true,idx:0,linkAt:frame.time-.3,skillAt:frame.time-.3,advanceAt:0},styleBefore:before,characters:DUEL_RELEASE_CHARACTERS,duelContact,duelStyleLessonSucceeded,drillSuccess(){successes++;},performance:{now:()=>0}});
 vm.runInContext(view.slice(from,to),context);context.drillEvents(frame.events);return successes;
}
const breaks=scenario('burst',{action:'heavy',block:true,repeat:true,seconds:3});
const breakFrame=breaks.frames.find(s=>duelContact(s,'guardBreak',0));assert(breakFrame);assert.equal(drill(breakFrame,'guardBreak'),1);
const wrongBreak=structuredClone(breakFrame);for(const e of wrongBreak.effects)if(e.contactSignal==='guardBreak')e.actorTeam=1;assert.equal(drill(wrongBreak,'guardBreak'),0);
const parried=scenario('pierce',{reverse:true}),parryFrame=parried.frames.find(s=>duelContact(s,'parry',0));assert(parryFrame);assert.equal(drill(parryFrame,'parry'),1);
const wrongParry=structuredClone(parryFrame);for(const e of wrongParry.effects)if(e.contactSignal==='parry')e.actorTeam=1;assert.equal(drill(wrongParry,'parry'),0);
const link=scenario('burst',{linked:true}),linkFrame=link.frames.find(s=>duelContact(s,'heavyHit',0)?.linked);assert(linkFrame);assert.equal(drill(linkFrame,'linkHit'),1);
const falseLanding=structuredClone(leapMiss.frames.find(s=>s.events.includes('detonate')));falseLanding.events=['heavyHit'];assert.equal(drill(falseLanding,'linkHit'),0);
console.log('PASS actual tip/near/miss, leap/mine hit/miss/block, pull/block/range/aim, actor-owned guard/parry/link, stale/legacy contacts, label/engine-freeze/reduced-motion and immutable combat. Arranged CPU/controller, not human/device/listening.');

// Execute the actual shipping event/audio/feel block. Material cues must
// survive the existing impact-family limiter; explosions stay audible on miss.
const audioImports={};
for(const match of view.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
 const names=match[1].split(',').map(s=>s.trim()).filter(s=>s.includes('_AUDIO'));
 if(!names.length)continue;const module=await import(new URL('../src/'+match[2].replace('./',''),import.meta.url));
 for(const name of names){const [source,target]=name.split(/\s+as\s+/);audioImports[target||source]=module[source];}
}
const soundStart=view.indexOf('const SOUND='),soundEnd=view.indexOf('\n',soundStart),frameStart=view.indexOf('for(const ev of s.events){const contact=duelContact'),frameEnd=view.indexOf('s.events.length=0;',frameStart);
assert(soundStart>0&&soundEnd>soundStart&&frameStart>0&&frameEnd>frameStart);
function feedback(frame){
 const accepted=[],feel=createDuelFeel(),limiter=createAudioLimiter({now:()=>frame.time*1000});
 const context=vm.createContext({...audioImports,s:structuredClone(frame),feel,duelContact,duelContactSound,applyDuelIdentityContacts,applyDuelFeelEvent,audio:{play(id,options){const token=limiter.begin(id,AUDIO_EVENTS[id]);if(token!==null){accepted.push({id,options});limiter.end(token);}}}});
 vm.runInContext(view.slice(soundStart,soundEnd)+'\n'+view.slice(frameStart,frameEnd),context);
 return {accepted,feel};
}
assert.equal(feedback(tipFrame).accepted[0].id,'pierceHit');assert(feedback(pullFrame).accepted.some(s=>s.id==='gravityHit'),'casting and deep contact use separate bounded audio families');
const burstSound=feedback(heavyFrame);assert.equal(burstSound.accepted[0].id,'hit');assert.equal(burstSound.accepted[0].options.pitch,.75);assert.equal(burstSound.feel.label,'강타!');assert.equal(burstSound.feel.stopLeft,0);
const missSound=feedback(leapMiss.frames.find(s=>s.events.includes('detonate')));assert.equal(missSound.accepted[0].id,'burstHit');assert.equal(missSound.feel.label,'');
for(const descriptor of [duelContactSound(duelContact(tipFrame,'hit',0)),duelContactSound(duelContact(pullFrame,'hit',0)),duelContactSound(duelContact(heavyFrame,'hit',0))])assert(AUDIO_EVENTS[descriptor[0]]);
console.log('PASS shipping frame: sharp/deep/body impacts, miss explosion audibility, existing material cues/voice-family limiter and no stacked engine freeze. Audio dispatch proof, not listening.');
