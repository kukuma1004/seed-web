import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDuel,stepDuel,DUEL_INSPECTION_CHARACTERS,DUEL_ARENA,DUEL_RULES} from '../src/seed-duel-rules.js';
import {batch52MovementRatio,DUEL_BATCH52_SHOTS,DUEL_BATCH52_KINDS} from '../src/seed-duel-batch52.js';
import {DUEL_INSPECTION_STORY_STAGES,completeStoryMatch,completeInspectionStoryMatch} from '../src/seed-duel-story.js';
const L='twin-lensinghole',F='twin-frostmirror',ids=[L,F];
// Real exported shared host, real input/strike/swept world collision. Positions,
// high target HP, shield/interceptor/source corruption are explicit fixtures.
// This is neither browser play nor a device, balance, art or player-save audit.
function host(id,seat=0,hz=25){const s=createDuel({inspection:true,player:seat?'pierce':id,enemy:seat?id:'pierce',seed:850});s.phase='fight';const f=s.fighters[seat],o=s.fighters[1-seat];Object.assign(f,{x:3.2,y:10,fx:-1,fy:0});Object.assign(o,{x:4.2,y:10,hp:1000,maxHp:1000,fx:-1,fy:0});return{s,f,o,seat,hz};}
const tick=(a,input={},other={})=>stepDuel(a.s,1/a.hz,a.seat?other:input,a.seat?input:other);
const run=(a,t,input={},other={})=>{for(let n=0;n<Math.ceil(t*a.hz);n++)tick(a,input,other);};
const until=(a,p,input={},other={})=>{for(let n=0;n<a.hz*6&&!p();n++)tick(a,input,other);assert(p(),`boundary ${a.f.char}/${a.seat}/${a.hz}`);};
const each=fn=>{for(const id of ids)for(const seat of [0,1])for(const hz of [25,80])fn(host(id,seat,hz));};
function action(a,i,other={}){tick(a,{[i?'skill2':'skill1']:true,aimX:a.f.fx,aimY:a.f.fy},other);const h=a.s.hazards.find(h=>h.kind===(i?(a.f.char===L?'twinNucleusTell52':'twinBreathTell52'):'twinMirrorTell52')&&!h.triggered);assert(h,'actual paid preparation');return h;}
function mirror(a){const h=action(a,0);until(a,()=>h.data.physical);return {h,q:h.data.physical};}
function pair(a){const first=action(a,0);until(a,()=>a.f.state==='idle');a.f.fx=1;const second=action(a,1);until(a,()=>a.s.hazards.some(h=>h.kind===(a.f.char===L?'twinLensTell52':'twinFrostTell52')));return{first,second,h:a.s.hazards.find(h=>h.kind===(a.f.char===L?'twinLensTell52':'twinFrostTell52'))};}
function cold(a){a.f.fx=1;action(a,1);until(a,()=>a.o.twin52Cold);return a.o.twin52Cold;}
function incoming(a){a.o.char='final-thunderlance-chain';a.o.final39Cast=1;const dx=a.f.fx||1;a.s.shots.push({kind:'veinLead39',owner:a.o.team,originalOwner:a.o.team,cast:1,x:a.f.x+dx*.6,y:a.f.y,dx:-dx,dy:0,speed:12,life:.5,damage:7,returnDamage:7,remainingOut:5,travelled:0,legTravelled:0,leg:0,mode:'out',launch:{x:a.o.x,y:a.o.y},born:-1,data:{hits:0,receipts:new Set(),targets:new Set(),links:0,earned:0,paid:false,edge:0,edgeSpent:false,nativeLost:false,ult:false,deadline:a.s.time+1}});}
const familyAlive=a=>a.s.shots.some(q=>q.life>0&&DUEL_BATCH52_SHOTS.includes(q.kind))||a.s.hazards.some(h=>h.t>0&&DUEL_BATCH52_KINDS.includes(h.kind));

test('independent source hash pins frozen combat except audited mixed-shot null guard',()=>{const bytes=readFileSync(new URL('../src/seed-duel-batch52.js',import.meta.url));assert(bytes.includes(Buffer.from('q.data?.caster===p.caster')));const frozen=Buffer.from(bytes.toString().replace('q.data?.caster===p.caster','q.data.caster===p.caster'));assert.equal(createHash('sha256').update(frozen).digest('hex').toUpperCase(),'8F4BCF022FC7E580208D49945F9F966E3F8E688C262E0486DDD9F2444185403F');});

test('SHARED both seats25/80 directional guard-chip never earns either course or cold',()=>{
 each(a=>{const guard={block:true,aimX:-1,aimY:0};action(a,0,guard);until(a,()=>a.f.state==='idle',{},guard);assert(!a.f.twin52Marks[0]);a.f.fx=1;action(a,1,guard);run(a,2,{},guard);assert(a.o.hp<1000);assert(!a.s.events.includes('twinPair52'));assert(a.f.twin52Marks.every(m=>!m));assert(!a.o.twin52Cold);assert(Math.abs(a.o.hp-(1000-(a.f.char===L?18:16)*DUEL_RULES.blockDamage))<1e-6);});
});

test('SHARED both seats25/80 shield conversion and real mirror interceptors retire foreign delivery without native pair',()=>{
 for(const defence of ['shield','mirrorguard','mirrorhall'])each(a=>{Object.assign(a.f,{x:18,fx:1});a.o.x=21;if(defence==='shield')a.o.shield=3;const {h,q}=mirror(a);if(defence!=='shield'){const r=defence==='mirrorguard'?1.9:1.3;Object.assign(a.o,{char:defence,x:q.x+r+.05,y:q.y});a.s.hazards.push(defence==='mirrorguard'?{kind:'guardOrbit',owner:a.o.team,x:a.o.x,y:a.o.y,r,angle:Math.PI-1.8/a.hz,arm:0,t:.1,cast:a.o.fusion12Cast,ordinary:1,bossBlocks:1,rammed:true}:{kind:'hallOpen',owner:a.o.team,x:a.o.x,y:a.o.y,r,angle:Math.PI-1.6/a.hz,age:0,count:1,arm:0,t:.1,cast:a.o.finalCast,budget:{ordinary:1,boss:1},returned:0});}until(a,()=>q.foreign||q.guardReturned||q.hallReturned);assert.equal(q.owner,a.o.team);assert(q.life<=.5+1e-8);const x=q.x;run(a,.16);assert(q.x!==x||q.life<=0,'persistent conversion flags cannot stall a shot');run(a,.6);assert(q.life<=0&&q.data.nativeLost);assert(!h.data.receipt);assert(a.f.twin52Marks.every(m=>!m));assert(!a.s.events.includes('twinPair52'));assert.equal(a.o.hp,1000);});
});

test('SHARED both seats25/80 behind-countershield is a real unguarded HP receipt',()=>{
 each(a=>{Object.assign(a.f,{x:18,fx:1});Object.assign(a.o,{x:21,fx:1,counterShield:2,shieldHits:2});const h=action(a,0,{aimX:1,aimY:0});until(a,()=>h.data.receipt,{}, {aimX:1,aimY:0});assert.equal(a.o.hp,992);assert.equal(a.o.shieldHits,2);assert.equal(h.data.receipt.actor,a.o);});
});

test('SHARED both seats25/80 cloned physical including forged returned flags is rejected before native or foreign HP',()=>{
 for(const returned of [false,true])each(a=>{Object.assign(a.f,{x:18,fx:1});a.o.x=21;const {h,q}=mirror(a),clone={...q};if(returned)Object.assign(clone,{foreign:true,guardReturned:true,owner:a.o.team,dx:-1,x:a.f.x+.42});else clone.x=a.o.x-.42;a.s.shots=[clone];const hp=a.f.hp;tick(a);assert.equal(clone.life,0);assert.equal(a.o.hp,1000);assert.equal(a.f.hp,hp);assert(!h.data.receipt);assert(a.f.twin52Marks.every(m=>!m));});
});

test('SHARED both seats25/80 exact actor caster law serial death and round reject stale live sources',()=>{
 for(const cause of ['actor','caster','law','serial','casterDeath','targetDeath','reset'])each(a=>{Object.assign(a.f,{x:18,fx:1});a.o.x=25;const {h}=mirror(a);if(cause==='actor')a.s.fighters[a.o.team]={...a.o};if(cause==='caster')a.s.fighters[a.f.team]={...a.f};if(cause==='law')a.f.char='pierce';if(cause==='serial')a.f.twin52Serial[0]++;if(cause==='casterDeath')a.f.hp=0;if(cause==='targetDeath')a.o.hp=0;if(cause==='reset'){a.s.phase='roundEnd';a.s.ready=0;}tick(a);assert(!familyAlive(a),cause);assert(!h.data.receipt,cause);if(cause==='reset'){assert(!a.s.shots.length&&!a.s.hazards.length);assert(a.f.twin52Serial.every(n=>n===0));}});
});

test('SHARED both seats25/80 real zero-flinch incoming HP interrupts both tells before emission',()=>{
 for(const index of [0,1])each(a=>{a.f.fx=1;const h=action(a,index),hp=a.f.hp;incoming(a);until(a,()=>a.f.hp<hp);assert.equal(a.f.hp,hp-7);assert.equal(a.f.stun,0);assert(!h.triggered&&!h.data.physical);tick(a);assert(h.cancelled&&!h.t&&!h.triggered);assert(!h.data.physical);assert(a.f.twin52Marks.every(m=>!m));});
});

test('SHARED both seats25/80 actual pillar cover clips nucleus and prevents breath receipt',()=>{
 each(a=>{Object.assign(a.f,{x:8,y:6.2,fx:1});Object.assign(a.o,{x:13,y:6.2});const h=action(a,1);if(a.f.char===L){assert(Math.abs(h.data.landing.x-9.65)<1e-7);assert.equal(h.data.captured.x,13);}run(a,2);assert.equal(a.o.hp,1000);assert(!h.data.receipt&&!a.o.twin52Cold);assert(!a.s.events.includes('twinPair52'));});
});

test('SHARED both seats25/80 mathematical body-world tie and final fractional TTL obey actual surface priority',()=>{
 each(a=>{Object.assign(a.f,{x:8,y:6.2,fx:1});Object.assign(a.o,{x:13,y:6.2});const {h,q}=mirror(a);
 // Intentionally illegal body centre inside a pillar makes a mathematical
 // equal entry time. This is a boundary fixture, not a legal player position.
 Object.assign(q,{x:9.61,y:6.2,dx:1,dy:0,life:.01,remaining:12});Object.assign(a.o,{x:10.05,y:6.2});tick(a);assert.equal(a.o.hp,1000);assert(!h.data.receipt);assert.equal(q.bounces,1);assert(Math.abs(q.trace[0].x-9.65)<1e-6);
 const b=host(a.f.char,a.seat,a.hz);Object.assign(b.f,{x:18,fx:1});b.o.x=25;const p=action(b,0);until(b,()=>p.data.physical?.x>20);const shot=p.data.physical;shot.life=.007;b.o.x=shot.x+.42;tick(b);assert.equal(b.o.hp,992);assert(shot.life<=0&&p.data.receipt);});
});

test('SHARED Lens both seats25/80 well attraction has total budget, no recurring HP, and releases actual input',()=>{
 for(const seat of [0,1])for(const hz of [25,80]){const a=host(L,seat,hz);Object.assign(a.f,{x:18,fx:1});a.o.x=21;const h=action(a,1);until(a,()=>a.s.hazards.some(h=>h.kind==='twinLensWell52'));const well=a.s.hazards.find(h=>h.kind==='twinLensWell52');assert.equal(a.o.hp,990);a.o.y=well.y+.8;const start=a.o.y;run(a,1.1);assert(well.data.pullSpent<=.45+1e-8);assert(Math.abs(start-a.o.y-.45)<.025);assert.equal(a.o.hp,990);assert.equal(a.o.stun,0);assert.equal(a.o.slow,0);tick(a,{}, {attack:true,aimX:-1,aimY:0});assert.equal(a.o.state,'attack');assert.equal(h.data.receipt.actor,a.o);}
});

test('SHARED Frost both seats25/80 owned cold enables movement only and never locks attack or dodge',()=>{
 for(const actionName of ['attack','dodge'])for(const seat of [0,1])for(const hz of [25,80]){const a=host(F,seat,hz);cold(a);Object.assign(a.o,{state:'idle',stun:0,dodgeCd:0});assert.equal(batch52MovementRatio(a.s,a.o),.72);tick(a,{}, {[actionName]:true,aimX:-1,aimY:0});assert.equal(a.o.state,actionName);}
});

test('SHARED Frost both seats25/80 forged stale cold ownership is denied by actual movement before cleanup',()=>{
 for(const cause of ['host','actor','caster','law','round','expired','bare'])for(const seat of [0,1])for(const hz of [25,80]){const a=host(F,seat,hz),p=cold(a);a.s.shots=[];a.s.hazards=[];Object.assign(a.o,{state:'idle',stun:0,slow:0});if(cause==='host')p.host={...a.s};if(cause==='actor')p.actor={...a.o};if(cause==='caster')p.caster={...a.f};if(cause==='law')a.f.char='pierce';if(cause==='round')p.round=a.s.round+1;if(cause==='expired')a.o.twin52ColdUntil=a.s.time;if(cause==='bare')a.o.twin52Cold=null;assert.equal(batch52MovementRatio(a.s,a.o),1,cause);const y=a.o.y;tick(a,{}, {y:1,aimX:-1,aimY:0});assert(Math.abs(a.o.y-y-DUEL_INSPECTION_CHARACTERS.pierce.speed/hz)<1e-6,cause);if(cause!=='bare')assert(!a.o.twin52Cold&&a.o.twin52ColdUntil===0,cause);}
});

test('SHARED Frost both seats25/80 genuine earned ray evaluates cold at contact and cannot refresh or restamp',()=>{
 for(const status of ['expired','forged','generic','owned'])for(const seat of [0,1])for(const hz of [25,80]){const a=host(F,seat,hz),p=pair(a);until(a,()=>p.h.data.physical);const q=p.h.data.physical,beforeUntil=a.o.twin52ColdUntil,hp=a.o.hp;assert.equal(hp,984,'two separate real breath pulses finish before ray birth');
 // Contact is the real earned ray. Expiry/provenance/independent generic slow
 // are injected at its emission boundary to exercise the conditional gate.
 if(status==='expired'||status==='generic')a.o.twin52ColdUntil=a.s.time;if(status==='forged')a.o.twin52Cold.host={...a.s};if(status==='generic')a.o.slow=.5;tick(a);assert.equal(a.o.hp,hp-(status==='generic'||status==='owned'?4:0),status);assert(q.life<=0&&q.data.spent);assert(a.o.twin52ColdUntil<=beforeUntil);assert(a.f.twin52Marks.every(m=>!m));assert.equal(a.s.events.filter(e=>e==='twinPair52').length,1);}
});

test('SHARED Frost both seats25/80 captured ray aim remains fixed while actual lateral input escapes',()=>{
 for(const seat of [0,1])for(const hz of [25,80]){const a=host(F,seat,hz),p=pair(a),aim={...p.h.data.aim},captured={...p.h.data.captured};until(a,()=>p.h.data.physical,{}, {y:1,aimX:-1,aimY:0});const q=p.h.data.physical,hp=a.o.hp;run(a,1,{}, {y:1,aimX:-1,aimY:0});assert.equal(a.o.hp,hp);assert.deepEqual(p.h.data.aim,aim);assert.deepEqual(p.h.data.captured,captured);assert(!q.data.spent);assert(q.life<=0);assert(!a.o.twin52Cold);}
});

test('SHARED earned pair cloning and source invalidation cancel without a second physical reward',()=>{
 for(const cause of ['tellClone','sourceSerial','sourceActor','law','death','round'])each(a=>{const p=pair(a),hp=a.o.hp;a.o.y=12; // Move out of the still-live second breath pulse; test pair cancellation only.
 if(cause==='tellClone'){a.s.hazards=a.s.hazards.map(h=>h===p.h?{...h}:h);}if(cause==='sourceSerial')a.f.twin52Serial[0]++;if(cause==='sourceActor')p.h.data.sources[0].actor={...a.o};if(cause==='law')a.f.char='pierce';if(cause==='death')a.f.hp=0;if(cause==='round'){a.s.phase='roundEnd';a.s.ready=0;}run(a,.4);assert(!p.h.data.physical,cause);if(cause!=='round')assert.equal(a.o.hp,hp,cause);assert(!a.s.shots.some(q=>['twinLensNeedle52','twinFrostRay52'].includes(q.kind)&&q.life>0));});
});

test('SHARED private story needs matching finished win and never becomes normal account progress',()=>{
 for(const id of ids){const a=host(id,1,80),stage=DUEL_INSPECTION_STORY_STAGES.find(x=>x.enemy===id);assert(stage);assert.equal(completeInspectionStoryMatch([],stage,a.s),null);Object.assign(a.s,{phase:'over',winner:0,wins:[2,0]});assert(completeInspectionStoryMatch([],stage,a.s));assert.equal(completeStoryMatch({},stage,a.s),null);for(const cause of ['actor','practice','preview','tie','loser','public']){const s={...a.s,fighters:a.s.fighters.map(f=>({...f})),wins:[2,0]},st=cause==='preview'?{...stage,preview:true}:stage;if(cause==='actor')s.fighters[1].char='pierce';if(cause==='practice')s.practice=true;if(cause==='tie')s.wins=[2,2];if(cause==='loser')s.winner=1;if(cause==='public')s.inspection=false;assert.equal(completeInspectionStoryMatch([],st,s),null,cause);}}
 const view=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');assert(view.includes('if(inspection){canSave=()=>false;onProgress=()=>{};onSaveAccount=null;'));assert(view.includes('onRanking=()=>{};'));
});
