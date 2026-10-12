import assert from 'node:assert/strict';
import {createBounce,launchBounce,stepBounce,chooseBounce,BOUNCE_CONFIG} from '../src/seed-bounce-rules.js';
import {createBounceFeedback,drawBounceEffect,BOUNCE_FEEDBACK_STYLES} from '../src/bounce-feedback.js';
import {AUDIO_EVENTS} from '../src/audio.js';
function fixture(law=''){
 const s=createBounce(17);for(const e of s.enemies)e.active=false;
 Object.assign(s.enemies[0],{active:true,alive:true,id:900,x:5,y:3,w:.92,h:.92,r:.43,type:'shield',hp:1000,maxHp:1000,frost:0,orbitAt:-100});
 s.laws=law?[law]:[];launchBounce(s,0,-1);return s;
}
function volley(s,collect=[]){for(let i=0;i<50&&s.phase==='flying';i++){stepBounce(s,.2);assert.ok(s.events.length<=24);collect.push(...s.events);s.events.length=0;}return collect;}
for(const [law,type]of[['','hit'],['frost','shatter'],['burst','burst'],['chain','chain']]){
 const s=fixture(law);if(law==='chain')Object.assign(s.enemies[1],{...s.enemies[0],id:901,x:6.02,active:true});
 const events=volley(s);assert.ok(events.some(e=>e.type===type),`actual contacts emit ${type}`);for(const e of events)assert.ok(Number.isFinite(e.time));
}
const bank=fixture('reflect');bank.phase='aim';launchBounce(bank,-10,-4.4);
assert.ok(volley(bank).some(e=>e.type==='bank'&&e.reflect),'real wall collision is a reflect cue');
const boss=createBounce();boss.turn=6;boss.enemies.forEach(e=>e.active=false);boss.phase='choice';boss.offers=[{id:'power'}];
boss.events=Array.from({length:24},()=>({type:'hit',priority:0}));chooseBounce(boss,'power');
assert.ok(boss.events.some(e=>e.type==='boss'&&e.state==='spawn'),'boss spawn survives saturated ordinary events');assert.equal(boss.events.length,24);
const defeat=fixture();defeat.enemies[0].type='boss';defeat.enemies[0].hp=1;
assert.ok(volley(defeat).some(e=>e.type==='boss'&&e.state==='defeat'),'boss death is an actual damage outcome');
const rules=s=>JSON.stringify({phase:s.phase,rng:s.rng,time:s.time,turn:s.turn,score:s.score,combo:s.combo,kills:s.kills,enemies:s.enemies,balls:s.balls,offers:s.offers,boss:s.boss,bossDefeated:s.bossDefeated});
const normal=fixture('frost'),full=fixture('frost');full.events=Array.from({length:24},()=>({type:'boss',priority:3}));for(const fx of full.effects)Object.assign(fx,{active:true,ttl:100});
for(let i=0;i<50&&normal.phase==='flying';i++){stepBounce(normal,.2);stepBounce(full,.2);normal.events.length=0;assert.ok(full.events.length<=24);}
assert.equal(rules(normal),rules(full),'saturated effects/events or draining cannot alter rules, damage or RNG');assert.equal(full.effects.length,48);assert.equal(BOUNCE_CONFIG.eventCap,24);

let clock=1000;const cues=[],scenes=[];const feedback=createBounceFeedback({play:id=>cues.push(id),setScene:id=>scenes.push(id)},{now:()=>clock});
const soundRun={laws:[],events:[{type:'hit'},{type:'chain'},{type:'shatter'},{type:'burst'},{type:'boss',state:'spawn'}]};
assert.equal(feedback.consume(soundRun),2);assert.deepEqual(cues,['bossWarning','chain']);assert.deepEqual(scenes,['boss']);assert.equal(soundRun.events.length,0);
const before=cues.length;for(let i=0;i<60;i++){soundRun.events=Array.from({length:24},()=>({type:'hit'}));feedback.consume(soundRun);clock+=1000/60;}
assert.ok(cues.length-before<=12,'60 fps / 24 contacts never produce frame-rate impact spam');
feedback.reset();soundRun.events=[{type:'bank',reflect:false},{type:'shatter'}];feedback.consume(soundRun);assert.equal(cues.at(-1),'frostHit');
clock+=1000;soundRun.events=[{type:'boss',state:'defeat'}];feedback.consume(soundRun);assert.equal(cues.at(-1),'bossDefeat');assert.equal(scenes.at(-1),'garden');
for(const law of ['burst','chain','frost','gravity','orbit','recall','split','pierce','reflect']){clock+=1000;soundRun.laws=[law];soundRun.events=[{type:'launch'}];feedback.consume(soundRun);}
for(const cue of cues)assert.ok(AUDIO_EVENTS[cue],`existing audio key ${cue}`);
const silent=createBounceFeedback();silent.consume({laws:[],events:[{type:'hit'}]});

const audioState={supported:true,muted:false,unlocked:false,contextState:'uninitialized'},pendingCues=[],pendingScenes=[];
const pending=createBounceFeedback({state:()=>audioState,play:id=>pendingCues.push(id),setScene:id=>pendingScenes.push(id)},{now:()=>clock});
const startup={laws:[],events:[{type:'launch'}]};assert.equal(pending.consume(startup),0);assert.equal(startup.events.length,1,'pending first gesture does not discard launch');
audioState.contextState='suspended';pending.consume(startup);assert.equal(startup.events.length,1);
audioState.contextState='running';audioState.unlocked=true;assert.equal(pending.consume(startup),1);assert.deepEqual(pendingCues,['shotPierce']);assert.equal(startup.events.length,0);
audioState.muted=true;startup.events=[{type:'boss',state:'spawn'},{type:'launch'}];assert.equal(pending.consume(startup),0);assert.equal(startup.events.length,0,'muted queues drain without blocking play');assert.equal(pendingScenes.at(-1),'boss');
audioState.muted=false;audioState.contextState='suspended';audioState.unlocked=false;
const waiting=fixture('burst');for(let i=0;i<25&&waiting.phase==='flying';i++){stepBounce(waiting,.1);pending.consume(waiting);assert.ok(waiting.events.length<=24,'pending audio retains only the existing bounded event queue');}
audioState.supported=false;startup.events=[{type:'boss',state:'defeat'}];pending.consume(startup);assert.equal(startup.events.length,0);assert.equal(pendingScenes.at(-1),'garden','unsupported audio still follows boss scene state');
audioState.supported=true;audioState.contextState='running';audioState.unlocked=true;pending.reset();
startup.events=[{type:'boss',state:'spawn'}];pending.consume(startup);const bossCueCount=pendingCues.length;
startup.events=[{type:'boss',state:'defeat'}];pending.consume(startup);assert.equal(pendingScenes.at(-1),'garden');
startup.events=[{type:'boss',state:'spawn'}];pending.consume(startup);assert.equal(pendingCues.length,bossCueCount+1,'same-time boss warning respects cooldown');assert.equal(pendingScenes.at(-1),'boss','scene changes remain independent of cue cooldown');

const point=(x,y)=>({x:x*10,y:y*10}),paths={};
for(const reducedMotion of [false,true])for(const type of Object.keys(BOUNCE_FEEDBACK_STYLES)){
 const log=[];const g=new Proxy({save(){log.push('save');},restore(){log.push('restore');}}, {get(target,key){return target[key]??((...a)=>{for(const n of a)if(typeof n==='number')assert.ok(Number.isFinite(n));log.push(key);});},set(target,key,value){target[key]=value;return true;}});
 const fx={active:true,ttl:.2,maxTtl:.32,type,x:3,y:2,x2:type==='chain'?4:undefined,y2:type==='chain'?3:undefined,r:.6},before=JSON.stringify(fx);
 drawBounceEffect(g,fx,{point,scale:10,reducedMotion});assert.equal(log[0],'save');assert.equal(log.at(-1),'restore');assert.ok(log.length<=24,'each effect has bounded paths');assert.equal(JSON.stringify(fx),before,'draw never modifies pool state');paths[type]=log.join(',');
}
assert.notEqual(paths.shatter,paths.burst);assert.notEqual(paths.chain,paths.bank);assert.equal(BOUNCE_FEEDBACK_STYLES.shatter.shape,'shards');
console.log('PASS bounce-feedback: actual law/bank/boss events, priority24 cap, saturation-independent rules, bounded existing audio, reduced-motion distinct paths.');
