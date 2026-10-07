import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AWAKEN_FORMS} from '../src/forms.js';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS,DUEL_ORDER,DUEL_INSPECTION_CHARACTERS,availableDuelCharacters,duelCharacterKind} from '../src/seed-duel-rules.js';
import {DUEL_BATCH08,DUEL_BATCH08_AUDIO,batch08Ai,batch08DangerAi,hallPanels} from '../src/seed-duel-batch08.js';
import {DUEL_STORY_STAGES,DUEL_INSPECTION_STORY_STAGES,completeStoryMatch,completeInspectionStoryMatch,inspectionStoryUnlocked} from '../src/seed-duel-story.js';
import {DUEL_STORY_STAGE_COUNT,normalizeDuelStory} from '../src/seed-duel-story-progress.js';
const dt=1/60;
const scene=(id,d=4,seat=0)=>{const s=createDuel({inspection:true,player:seat?'pierce':id,enemy:seat?id:'pierce',seed:51});s.phase='fight';Object.assign(s.fighters[seat],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1-seat],{x:15+d,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const cast=(s,input={skill1:true},seat=0)=>stepDuel(s,dt,seat?{}:input,seat?input:{});
const run=(s,t,p={},e={})=>{for(let n=0;n<t;n+=dt)stepDuel(s,dt,p,e);};
const lock=(s,t,seat=1)=>{const o=s.fighters[seat],position={x:o.x,y:o.y};for(let n=0;n<t;n+=dt){Object.assign(o,{...position,kx:0,ky:0});s.freeze=0;stepDuel(s,dt,{},{});}};
const shot=(s,p,extra={})=>{const q={kind:'crystal',owner:1,x:p.x+.15,y:p.y,dx:-1,dy:0,speed:9,life:2,damage:20,hit:new Set(),pierce:0,bounces:0,...extra};s.shots.push(q);return q;};

// Legacy36 constructor identities stay isolated from the opt-in released175
// campaign. The persistent account accepts175 permanent stages; inspection
// stage IDs still cannot enter account progress.
assert.equal(DUEL_ORDER.length,36);assert.equal(Object.keys(DUEL_CHARACTERS).length,36);
assert.equal(DUEL_STORY_STAGES.length,36);assert.equal(DUEL_STORY_STAGE_COUNT,175);
for(const id of ['bigcrunch','mirrorhall']){
 const c=DUEL_INSPECTION_CHARACTERS[id];assert.equal(c.comboId,AWAKEN_FORMS[id].id);assert(AWAKEN_FORMS[id].awakened);
 assert.equal(c.final,true);assert.equal(c.inspectionOnly,true);assert.equal(c.artReady,false);assert.equal(duelCharacterKind(id),'final');
 assert(!DUEL_ORDER.includes(id));assert(!availableDuelCharacters().includes(id));assert(availableDuelCharacters(null,{inspection:true}).includes(id));
 assert.throws(()=>createDuel({player:id}),RangeError);assert.throws(()=>createDuel({enemy:id}),RangeError);
 assert.equal(createDuel({player:id,inspection:true}).inspection,true);
}assert.throws(()=>createDuel({player:'missing',inspection:true}),RangeError);

// Two fixed wells, no early damage, central corridor, one damage per well, both
// seats. Walking away after the tell leaves their coordinates unchanged.
for(const seat of [0,1]){
 const s=scene('bigcrunch',4,seat);cast(s,undefined,seat);const tells=s.hazards.filter(h=>h.kind==='crunchPlant');assert.equal(tells.length,2);
 assert.deepEqual(tells.map(h=>[h.x,h.y]),[[19,8.35],[19,11.65]]);run(s,.5);assert.equal(s.fighters[1-seat].hp,1000);
 lock(s,2.5,1-seat);assert.equal(s.fighters[1-seat].hp,1000,'the gap between wells remains safe');
}
{
 const s=scene('bigcrunch');cast(s);const tells=s.hazards.filter(h=>h.kind==='crunchPlant'),o=s.fighters[1];o.x=tells[0].x;o.y=tells[0].y;
 lock(s,2.5);assert.equal(1000-o.hp,13);lock(s,1);assert.equal(1000-o.hp,13,'well never ticks repeated damage');
}
{
 const s=scene('bigcrunch');cast(s);const before=s.hazards.map(h=>[h.x,h.y]);s.fighters[1].x=22;run(s,.7);assert.deepEqual(s.hazards.filter(h=>h.kind==='crunchWell').map(h=>[h.x,h.y]),before);
}

// Slow seed has a fixed line, impact is followed by a second warning. A target
// that leaves that impact warning takes no delayed damage.
for(const seat of [0,1]){
 const s=scene('bigcrunch',4,seat);cast(s,{skill2:true},seat);run(s,.3);assert.equal(s.shots.length,0);
 run(s,.25);const q=s.shots.find(q=>q.kind==='crunchSeed');assert(q);assert.equal(q.speed,5.5);assert.equal(s.fighters[1-seat].hp,1000);
 for(let n=0;n<80&&!s.hazards.some(h=>h.kind==='crunchBurst');n++)stepDuel(s,dt,{},{});
 assert(s.hazards.some(h=>h.kind==='crunchBurst'));assert.equal(s.fighters[1-seat].hp,1000);
 s.fighters[1-seat].y+=2;run(s,.6);assert.equal(s.fighters[1-seat].hp,1000);
}
{
 const s=scene('bigcrunch');cast(s,{skill2:true});lock(s,2);assert.equal(1000-s.fighters[1].hp,16);
}

// Final arming-frame interruption cancels pending placement/shot/fold. Released
// wells survive a later hit, without granting immunity to their owner.
for(const [id,input,kind] of [['bigcrunch',{skill1:true},'crunchWell'],['bigcrunch',{skill2:true},'crunchSeed'],['mirrorhall',{skill1:true},'hallOpen'],['mirrorhall',{skill2:true},'hallFold']]){
 const s=scene(id);cast(s,input);const h=s.hazards[0];h.arm=.001;Object.assign(s.fighters[0],{state:'hit',stun:.2,t:.2});run(s,.1);
 assert(!s.shots.some(q=>q.kind===kind));assert(!s.hazards.some(h=>h.kind===kind&&h.t>0));assert.equal(s.fighters[0].inv,0);
}
{
 const s=scene('bigcrunch');cast(s);run(s,.7);assert(s.hazards.some(h=>h.kind==='crunchWell'));
 Object.assign(s.fighters[0],{state:'hit',stun:.3,t:.3});run(s,.05);assert(s.hazards.some(h=>h.kind==='crunchWell'));
}

// Guard, dodge and cover work against the actual attack; no skip of shared guard
// handling. Weak pull never teleports or holds the target in a forced state.
{
 const s=scene('bigcrunch');cast(s,{skill2:true});const o=s.fighters[1];for(let n=0;n<180;n++){Object.assign(o,{x:19,y:10,kx:0,ky:0});s.freeze=0;stepDuel(s,dt,{}, {block:true});}
 assert(Math.abs(1000-o.hp-3.2)<1e-8);assert.equal(o.state,'block');assert.equal(s.fighters[0].stun,0);
}
{
 const s=scene('bigcrunch');cast(s);run(s,.7);const well=s.hazards.find(h=>h.kind==='crunchWell'),o=s.fighters[1];o.x=well.x+.6;o.y=well.y;
 const x=o.x;run(s,.05);assert(x-o.x<.1);assert.equal(o.stun,0);assert.equal(o.heldBy,0);
}
{
 const s=scene('bigcrunch');cast(s);run(s,.7);const well=s.hazards.find(h=>h.kind==='crunchWell'),o=s.fighters[1];well.age=1.44;o.x=well.x;o.y=well.y;
 stepDuel(s,dt,{}, {dodge:true,x:1});assert.equal(o.hp,1000);assert.equal(o.state,'dodge');assert(o.inv>0);assert(o.dodgeCd>0);
}
{
 const s=scene('bigcrunch',7);Object.assign(s.fighters[0],{x:7,y:6.2});Object.assign(s.fighters[1],{x:14,y:6.2});cast(s,{skill2:true});lock(s,2.5);assert.equal(s.fighters[1].hp,1000,'pillar clips the actual slow seed and blocks its collapse');
}
{
 const s=createDuel({inspection:true,player:'bigcrunch',enemy:'heart',boss:true});s.phase='fight';Object.assign(s.fighters[0],{x:15,y:10});Object.assign(s.fighters[1],{x:19,y:10});cast(s);run(s,.7);
 const well=s.hazards.find(h=>h.kind==='crunchWell'),o=s.fighters[1];o.x=well.x+.5;o.y=well.y;const x=o.x;run(s,.05);assert.equal(o.x,x,'boss is not pulled');
}

// Exact rotating panel contact, independent finite budgets and no return ping
// pong. A body-centre shot and a melee hit bypass the projectile-only field.
{
 const s=scene('mirrorhall');cast(s);run(s,.7);const f=s.fighters[0],h=s.hazards.find(h=>h.kind==='hallOpen');assert(h);assert.equal(h.count,3);
 for(let n=0;n<4;n++){const p=hallPanels(h,f)[0],q=shot(s,p);stepDuel(s,dt,{},{});if(n<3){assert.equal(q.owner,0);assert.equal(q.kind,'hallReturn');assert.equal(q.damage,12);assert.equal(q.hallReturned,true);}else assert.equal(q.owner,1);}
 assert.equal(h.budget.ordinary,0);assert.equal(h.budget.boss,1);assert.equal(f.hallStored,2);
 const p=hallPanels(h,f)[0],boss=shot(s,p,{boss:true});stepDuel(s,dt,{},{});assert.equal(boss.life,0);assert.equal(boss.owner,1);assert.equal(h.budget.boss,0);
 const next=shot(s,hallPanels(h,f)[0],{boss:true});stepDuel(s,dt,{},{});assert.equal(next.owner,1);assert(next.life>0);
 assert(s.events.includes('hallReturn')&&s.events.includes('hallBlock'));
}
{
 const s=scene('mirrorhall');cast(s);run(s,.7);const f=s.fighters[0];f.hp=1000;shot(s,{x:f.x+.1,y:f.y});stepDuel(s,dt,{},{});assert(f.hp<1000,'no full-body shield');assert.equal(f.shield,0);
}
{
 const s=scene('mirrorhall',1.5);cast(s);run(s,.7);const f=s.fighters[0];f.hp=1000;const hp=f.hp;run(s,.3,{}, {attack:true});assert(f.hp<hp,'melee enters below the panels');
}
{
 const s=scene('mirrorhall');cast(s);run(s,.7);const h=s.hazards.find(h=>h.kind==='hallOpen'),p=hallPanels(h,s.fighters[0])[0],q=shot(s,p,{hallReturned:true});stepDuel(s,dt,{},{});assert.equal(q.owner,1);assert.equal(h.budget.ordinary,3);
}

// Ultimates spend meter once; no global immunity; bounded charges and effects.
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id);s.fighters[0].meter=100;cast(s,{ult:true});assert.equal(s.fighters[0].meter,0);assert.equal(s.fighters[0].inv,0);
 if(id==='bigcrunch'){assert.equal(s.hazards.filter(h=>h.kind==='crunchPlant').length,2);assert.equal(s.hazards.find(h=>h.kind==='crunchSend').budget.max,3);}else{const h=s.hazards[0];assert.equal(h.count,5);assert.deepEqual(h.budget,{ordinary:6,boss:3});}
 run(s,6);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);
}

// Distinct 3-hit geometries and earned resources. Guarded third hits do not
// create free charges, and fold consumes the return resource exactly once.
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id,1.6),f=s.fighters[0];f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.13);
 assert(id==='bigcrunch'?f.crunchWeight>0:f.hallFacet>0);
 const b=scene(id,1.6),g=b.fighters[0];g.combo=2;g.comboTime=1;stepDuel(b,dt,{attack:true},{block:true});run(b,.13,{}, {block:true});assert.equal(id==='bigcrunch'?g.crunchWeight:g.hallFacet,0);
}
{
 const s=scene('mirrorhall',2),f=s.fighters[0];f.hallStored=2;f.hallStoredTime=4;cast(s,{skill2:true});assert.equal(f.hallStored,0);lock(s,1);assert.equal(1000-s.fighters[1].hp,20);
}

// Delayed AI reacts only to visible current tells/shots. It uses the same
// actions/charges as player input and never invents an instant defensive field.
{
 const s=scene('bigcrunch',4.6),f=s.fighters[0],o=s.fighters[1];const a={};assert.equal(batch08Ai(s,f,o,a,.1),false);const b={};assert.equal(batch08Ai(s,f,o,b,.15),true);assert.equal(b.skill1,true);
 cast(s);const input={};assert.equal(batch08DangerAi(s,o,input,.1),false);o.y=8.35;assert.equal(batch08DangerAi(s,o,input,.25),true);assert(Math.hypot(input.x,input.y)>0);
}
{
 const s=scene('mirrorhall'),f=s.fighters[0],o=s.fighters[1];shot(s,{x:18,y:10});const a={};assert.equal(batch08Ai(s,f,o,a,.1),false);const b={};assert.equal(batch08Ai(s,f,o,b,.15),true);assert.equal(b.skill1,true);assert.equal(f.shield,0);
}
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id,8);for(let n=0;n<2400;n++){if(n%90===0){s.fighters[0].cd=[0,0];cast(s,{skill1:true});}if(n%120===0){s.fighters[0].cd=[0,0];cast(s,{skill2:true});}stepDuel(s,dt,{},{});assert(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert(s.shots.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));assert(s.fighters.every(f=>Number.isFinite(f.hp)&&Number.isFinite(f.x)));}run(s,6);assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);
}
for(const id of ['bigcrunch','mirrorhall']){
 const s=scene(id),f=s.fighters[0];cast(s);run(s,.7);f.crunchWeight=2;f.crunchWeightTime=5;f.hallStored=2;f.hallStoredTime=4;f.hallFacet=1;f.hallFacetTime=4;
 s.phase='roundEnd';s.ready=0;stepDuel(s,dt,{},{});assert.equal(s.phase,'ready');assert.equal(s.shots.length,0);assert.equal(s.hazards.length,0);for(const key of ['finalCast','crunchWeight','crunchWeightTime','hallStored','hallStoredTime','hallFacet','hallFacetTime'])assert.equal(f[key],0);
}

// Candidate story progression has separate IDs and cannot become public account
// stages. View inspection forcibly suppresses account and ranking callbacks.
{
 const [first,second]=DUEL_INSPECTION_STORY_STAGES;assert(!inspectionStoryUnlocked([],second));let cleared=[];
 for(const stage of [first,second]){const m=createDuel({inspection:true,player:'bigcrunch',enemy:stage.enemy,boss:Boolean(stage.boss)});Object.assign(m,{phase:'over',wins:[2,1],winner:0});cleared=completeInspectionStoryMatch(cleared,stage,m);assert(cleared);assert.equal(completeStoryMatch({},stage,m),null);}
 assert.deepEqual(cleared,[first.id,second.id]);assert.deepEqual(normalizeDuelStory({hero:'bigcrunch',cleared:Object.fromEntries(cleared.map(id=>[id,{losses:0,at:1}]))}).cleared,{});
 const v=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');assert(v.includes("if(inspection){canSave=()=>false;onProgress=()=>{};onSaveAccount=null;onResult="));assert(v.includes('completeInspectionStoryMatch(inspectionCleared,storyStage,s)'));assert(v.includes("if(inspection){inspectionStoryMap();return;}"));
 for(const event of ['crunchPlant','crunchSend','crunchClose','hallOpen','hallReturn','hallBlock','hallFold'])assert(DUEL_BATCH08_AUDIO[event]);
}
console.log('Final08 inspection mechanics passed: canonical FINAL ids/public36 isolation, fixed wells/gap, slow seed/tells, cancellation, guard/pull/boss immunity, real-panel budgets/returns/melee holes, earned charges, AI reaction, caps and memory-only story. CPU only; art/browser/balance pending.');
