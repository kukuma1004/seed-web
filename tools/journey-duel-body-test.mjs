import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JOURNEY_DUEL_ART,JOURNEY_DUEL_ORDER} from '../src/journey-duel-art.js';
import {DISCOVERY_FORMS,TWIN_FORMS,SECOND_FORMS} from '../src/forms.js';
import {LAWS} from '../src/laws.js';
import {createFormCombat} from '../src/form-combat.js';
import * as THREE from 'three';
import {dominantJourneyBodyForm} from '../src/seed-body.js';
import {damageAustin} from '../src/austin.js';
import {createJourneyDuelBody,createJourneyDuelMotion,journeyDuelCrop,journeyDuelContext,journeyDuelIdentity,JOURNEY_DUEL_BODY_BUDGET} from '../src/journey-duel-body.js';

const dominant=forms=>journeyDuelIdentity(dominantJourneyBodyForm(forms));
assert.equal(dominant(new Map([['collapse',6],['winterbreath',7]])).fighterId,'winterbreath');
assert.equal(dominant(new Map([['gravitymirror',20],['collapse',6]])).fighterId,'gravitymirror');
assert.equal(dominant(new Map([['collapse',7],['frostbloom',7]])).fighterId,'collapse');
assert.equal(dominant(new Map([['frostbloom',7],['collapse',7]])).fighterId,'frostbloom');
for(const id of ['bigcrunch','pulsegravity','icegarden','tempestcrown','gravityspear'])assert.equal(dominant(new Map([[id,9]])).bodyId,id);
for(const id of Object.keys(SECOND_FORMS))assert.equal(dominant(new Map([[id,20],['collapse',8]])),null,'Legacy second fusion keeps its fallback');
assert.equal(dominantJourneyBodyForm(new Map(),new Map([['burst',3],['frost',3]])),'burst');
assert.equal(dominantJourneyBodyForm(new Map([['collapse',1]]),new Map([['frost',50]])),'collapse');
assert.equal(dominantJourneyBodyForm(new Map(),new Map([['portal',50]])),null);
for(const mode of ['ready','dead','duel','defense','garden','adventure','expedition'])assert.equal(journeyDuelContext(mode),false);
for(const mode of ['playing','cards','forms','evolving','dash-evolution']){
 assert(journeyDuelContext(mode));
 for(const exclusions of [[true,false,false],[false,true,false],[false,false,true]])assert(!journeyDuelContext(mode,...exclusions));
}

assert.equal(JOURNEY_DUEL_ORDER.length,162);assert.deepEqual(new Set(JOURNEY_DUEL_ORDER),new Set([...Object.keys(LAWS),...Object.keys(DISCOVERY_FORMS)]));
let maxDecoded=0;
for(const id of JOURNEY_DUEL_ORDER){
 const {art}=journeyDuelIdentity(id);assert.equal(art.frames.length,8);assert.equal(dominantJourneyBodyForm(art.kind==='base'?new Map():new Map([[id,9]]),new Map([[id,9]])),id);
 assert.equal(dominantJourneyBodyForm(art.kind==='base'?{}:{[id]:9},{[id]:9}),id,'Restored object derives exact identity without new save fields');
 maxDecoded=Math.max(maxDecoded,art.dimensions.reduce((sum,[w,h])=>sum+w*h*4,0));
 for(const file of art.files){const data=readFileSync(new URL('../public/assets/'+file,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');}
 for(let i=0;i<8;i++){
  const a=journeyDuelCrop(art,i),b=journeyDuelCrop(art,i,true),[x,y,w,h]=art.frames[i].src,[sw,sh]=art.dimensions[a.file];
  assert(x>=0&&x+w<=sw+.001&&y>=0&&y+h<=sh+.001);
  assert.equal(a.width,b.width);assert.equal(a.height,b.height);assert.equal(a.foot,b.foot);
  assert(Math.abs(a.centerX+b.centerX-1)<1e-12,'Mirrored pivot retains the same ground position');
  assert(Math.abs(a.offsetX+a.repeatX-b.offsetX)<1e-12);assert(Math.abs(a.offsetX-b.offsetX-b.repeatX)<1e-12);
  assert(Math.abs(a.height*(1-a.foot)+art.frames[i].dst[1]*.6)<1e-12);
 }
}
assert.equal(maxDecoded,JOURNEY_DUEL_BODY_BUDGET.decodedSheetBytes);
const motion=createJourneyDuelMotion();motion.set('collapse');assert.equal(motion.pose(),0);
assert(!motion.fire('frostbloom'));assert.equal(motion.pose(),0);assert(motion.fire('collapse'));assert.equal(motion.pose(),5);
motion.hurt();assert.equal(motion.pose(),7);motion.step(.19);assert.equal(motion.pose(),5);motion.step(.2);assert.equal(motion.pose(),0);
assert(!motion.active(['bigcrunch']));assert(motion.active(['collapse']));assert.equal(motion.pose(),4);motion.step(.1);assert.equal(motion.pose(),5);
motion.reset();motion.set('frostbloom');for(const frame of [1,2,3,1]){motion.fire('frostbloom');assert.equal(motion.pose(),frame);motion.step(.23);assert.equal(motion.pose(),0);}
motion.set('stormcrown');assert(!motion.hit('collapse',true));assert(motion.hit('stormcrown',true));assert.equal(motion.pose(),1);assert(!motion.hit('stormcrown',true),'Simultaneous orb hits must not restart the action for every victim');
motion.step(-1);motion.step(NaN);assert.equal(motion.pose(),1);motion.step(.23);assert.equal(motion.pose(),0);
motion.set('collapse');assert(!motion.hit('collapse'),'Remote delayed explosion cannot restart a new cast');
for(const yaw of [0,.6,-1.2]){assert.equal(motion.facing(yaw+Math.PI/2,yaw),false);assert.equal(motion.facing(yaw-Math.PI/2,yaw),true);assert.equal(motion.facing(yaw,yaw),true,'Forward/back ambiguity retains the last meaningful side');}

let disposedTextures=0,maxPending=0,changes=0;
const jobs=[];const loader={load(url,ok,_progress,fail){
 const texture=new THREE.Texture();texture.addEventListener('dispose',()=>disposedTextures++);
 const job={url,texture,ok,fail,done:false};jobs.push(job);maxPending=Math.max(maxPending,jobs.filter(j=>!j.done).length);return texture;
}};
const complete=job=>{job.done=true;job.ok(job.texture);};
const reject=job=>{job.done=true;job.fail();};
const root=new THREE.Group(),sharedSpriteGeometry=new THREE.Sprite().geometry;
const body=createJourneyDuelBody(root,{baseURL:'/seed-web/',loader,onChange:()=>changes++});
body.select('collapse');assert.equal(jobs.length,0,'Menus and Mirror rigs never request the Duel atlas');
body.setEnabled(true);assert.equal(jobs.length,1);assert(jobs[0].url.startsWith('/seed-web/assets/duel/'));
for(const id of ['frostbloom','stormcrown','collapse','frostbloom'])body.select(id);
assert.equal(jobs.length,1,'Only one pending request; changes queue the latest identity');
complete(jobs[0]);assert.equal(jobs.length,2);assert.equal(disposedTextures,1);assert(!body.ready());complete(jobs[1]);assert(body.ready());
assert(root.getObjectByName('journey-duel-body').visible,'A sheet loaded during frozen evolution is visible before the next gameplay/updateArt tick');
assert(root.getObjectByName('journey-duel-body').scale.y>0);
body.update(0,Math.PI/2,{phase:0,pace:0});assert.equal(body.state().frame,0);assert.equal(body.state().flipped,false);
const sprite=root.getObjectByName('journey-duel-body'),ghost=root.getObjectByName('journey-duel-body-occlusion');
assert.equal(sprite.geometry,sharedSpriteGeometry);assert.equal(sprite.material.map,ghost.material.map);
body.fire('frostbloom');body.update(0,-Math.PI/2,{phase:1,pace:1});assert.equal(body.state().frame,1);assert(sprite.material.map.repeat.x<0,'Sprite mirror uses UV, not negative scale');
assert.equal(root.scale.x,1);assert.equal(root.rotation.y,0);assert.equal(root.position.length(),0,'Art cannot move the collision root');
body.setOcclusion(false);assert(!ghost.visible);body.setEnabled(false);assert(!body.ready());assert(!sprite.visible);assert.equal(disposedTextures,2);
body.setEnabled(true);assert.equal(jobs.length,3);body.setEnabled(false);complete(jobs[2]);assert(!body.ready());assert.equal(disposedTextures,3,'Late load cannot resurrect art after mode exit');
body.setEnabled(true);body.select('stormcrown');complete(jobs[3]);assert.equal(jobs.length,5);reject(jobs[4]);assert(!body.ready());
for(let i=0;i<100;i++)body.setEnabled(true);assert.equal(jobs.length,5,'Failure falls back without a per-frame request loop');
body.select('collapse');assert.equal(jobs.length,6);body.dispose();complete(jobs[5]);assert(!body.ready());assert.equal(root.children.length,0);
assert.equal(disposedTextures,6);assert.equal(maxPending,1);assert.equal(JOURNEY_DUEL_BODY_BUDGET.mipmaps,false);assert.equal(jobs[0].texture.generateMipmaps,false);assert(changes>0);

// Execute the actual shipping form firing loop, rather than a mirrored helper.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const loop=main.slice(main.indexOf('perfMark(PS.collision);for(const [id,combat] of formCombats)'),main.indexOf('\nif(!roomCleared)for(const combat of formCombats.values())'));
assert(loop.length>100);let fires=0,pulses=0;
const cooldowns=new Map(),scope={perfMark(){},PS:{collision:0},formCombats:new Map([['icegarden',{fire(){fires++;return 3;},audioEvent(){return 'shot';}}]]),formCooldowns:cooldowns,formAttacks:new Map([['icegarden','frostbloom']]),dt:.016,autoTarget:{g:{position:{}}},roomCleared:false,FORMS:{frostbloom:{passive:false}},runCadenceInterval:x=>x,gardenCooldown:()=>1,runBonuses:{},titleState:{},player:{position:{},userData:{pulseJourneyForm(id){assert.equal(id,'frostbloom');pulses++;}}},aimdir:{},audio:{play(){}}};
vm.runInNewContext(loop,scope);assert.equal(fires,1);assert.equal(pulses,0);assert.equal(cooldowns.get('icegarden'),3);
vm.runInNewContext(loop,scope);assert.equal(pulses,0,'No new action during the true form cooldown');
scope.FORMS.frostbloom.passive=true;cooldowns.set('icegarden',0);vm.runInNewContext(loop,scope);assert.equal(pulses,0,'Passive action is signalled only by its actual contact');
const basicStart=main.indexOf('if(autoTarget&&shootCD<=0'),basic=main.slice(basicStart,main.indexOf('\n',basicStart));
assert(!basic.includes('pulseJourneyForm'),'Basic .22 second shot cannot impersonate slow-form punches');
const hitSource=main.slice(main.indexOf('function formHit('),main.indexOf('function formOptions('));
let hitPulses=0;
const hitScope={FORMS:{stormcrown:{requires:[]}},expansionTerrain:null,DIRECT_FORMS:new Set(),chosen:new Set(),LS:{},levels:new Map(),bankedUpgrades:0,relics:{},runBonuses:{},damageScale:()=>1,relicFormScale:()=>1,runPowerScale:()=>1,gardenPower:()=>1,twinResonance(){},combatAnalysis:{utility(){}},audio:{play(){}},player:{userData:{pulseJourneyHit(id,part){assert.equal(id,'tempestcrown');assert.equal(part,'stormcrown');hitPulses++;}}},damageEnemy(e,amount){damageAustin(e,amount);}};
vm.createContext(hitScope);vm.runInContext(hitSource+'this.accept=formHit;',hitScope);
const victim={type:'austin',hp:100,maxHp:100,phase:'normal',state:'phaseShift',damageAllowance:20};
hitScope.accept(victim,5,{kind:'stormcrown',evolution:'tempestcrown',indirect:true});assert.equal(victim.hp,100);assert.equal(hitPulses,0,'A real boss phase-shift rejects damage and the hit pose');
victim.state='stalk';victim.damageAllowance=0;hitScope.accept(victim,5,{kind:'stormcrown',evolution:'tempestcrown',indirect:true});assert.equal(victim.hp,100);assert.equal(hitPulses,0,'Exhausted real boss damage allowance cannot signal a successful contact');
victim.damageAllowance=20;hitScope.accept(victim,5,{kind:'stormcrown',evolution:'tempestcrown',indirect:true});assert.equal(victim.hp,95);assert.equal(hitPulses,1);
// Exercise every original body through the actual two-sheet rig, not just data.
const wholeRoot=new THREE.Group(),allJobs=[];let allDisposed=0;
const allLoader={load(url,ok,_progress,fail){const texture=new THREE.Texture();texture.addEventListener('dispose',()=>allDisposed++);allJobs.push({url,texture,ok,fail,done:false});return texture;}};
const whole=createJourneyDuelBody(wholeRoot,{baseURL:'/',loader:allLoader});whole.setEnabled(true);
for(const id of JOURNEY_DUEL_ORDER){
 whole.select(id);assert(!whole.ready());
 while(allJobs.some(j=>!j.done)){
  const pending=allJobs.filter(j=>!j.done);assert.equal(pending.length,1,'One real request at a time, even for native art');
  const j=pending[0];j.done=true;j.ok(j.texture);
 }
 assert(whole.ready());assert.equal(whole.state().selected,JOURNEY_DUEL_ART[id].fighterId);
 for(const facing of [Math.PI/2,-Math.PI/2]){
  whole.reset();whole.update(0,facing);whole.active([id]);whole.update(0,facing);whole.step(.1);whole.update(0,facing);
  assert.equal(whole.state().frame,5);assert.equal(whole.state().flipped,facing<0);
  const sp=wholeRoot.getObjectByName('journey-duel-body'),crop=journeyDuelCrop(JOURNEY_DUEL_ART[id],5,facing<0);
  assert.equal(sp.center.x,crop.centerX);assert.equal(sp.center.y,crop.foot);
  assert.equal(sp.scale.x,crop.width);assert.equal(sp.scale.y,crop.height);
  assert.equal(sp.material.map,allJobs.at(-JOURNEY_DUEL_ART[id].files.length+crop.file).texture);
 }
 assert.equal(whole.state().activeTextures,JOURNEY_DUEL_ART[id].files.length);
 assert.equal(whole.state().pendingTextures,0);assert.equal(wholeRoot.children.length,2);
}
whole.dispose();assert.equal(allDisposed,allJobs.length,'All previously selected sheets released, no roster texture cache');
assert.equal(wholeRoot.children.length,0);
// Failure/exit on SECOND native sheet cannot leave a partial or revived body.
const nativeId=JOURNEY_DUEL_ORDER.find(id=>JOURNEY_DUEL_ART[id].files.length===2),j0=allJobs.length;
const broken=createJourneyDuelBody(new THREE.Group(),{baseURL:'/',loader:allLoader});broken.select(nativeId);broken.setEnabled(true);
allJobs[j0].done=true;allJobs[j0].ok(allJobs[j0].texture);assert(!broken.ready());
allJobs[j0+1].done=true;allJobs[j0+1].fail();assert(!broken.ready());assert.equal(broken.state().pendingTextures,0);broken.dispose();
const j1=allJobs.length,late=createJourneyDuelBody(new THREE.Group(),{baseURL:'/',loader:allLoader});late.select(nativeId);late.setEnabled(true);
allJobs[j1].done=true;allJobs[j1].ok(allJobs[j1].texture);late.dispose();allJobs[j1+1].done=true;allJobs[j1+1].ok(allJobs[j1+1].texture);assert(!late.ready());
assert.equal(allDisposed,allJobs.length);

// The actual combat engine with/without an observer must produce identical
// cadence, damage, projectiles and state for all 153 evolutions and twin halves.
const vector=(x=0,z=0)=>new THREE.Vector3(x,0,z);
function combatFixture(onCast=null,empty=false,maxBolts=24){
 const scene=new THREE.Scene(),player={position:vector()},damage=[],effects=[];
 const foes=empty?[]:Array.from({length:6},(_,i)=>({type:'hound',g:{position:vector(.3+i*.3,1.2+i*.2)},hp:1e9,dead:false,slow:0}));
 const vfx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(k=>[k,()=>effects.push(k)]));
 const combat=createFormCombat(scene,{player,enemies:()=>foes,hit(e,n,meta){e.hp-=n;damage.push([n,meta.evolution,meta.kind]);return true;},blocked:()=>false,boundary:()=>false,constrain(){},vfx,renderless:true,maxBolts,onCast});
 return {combat,player,damage,effects};
}
let receipts=0;
for(const id of Object.keys(DISCOVERY_FORMS))for(const part of TWIN_FORMS[id]?.parts||[id]){
 const a=combatFixture(),b=combatFixture((owner,attack)=>{assert.equal(owner,id);assert.equal(attack,TWIN_FORMS[id]?part:DISCOVERY_FORMS[id].base||part);receipts++;});
 const options={twin:Boolean(TWIN_FORMS[id]),twinId:TWIN_FORMS[id]?id:null,openingDelay:2};
 a.combat.set(part,5,options);b.combat.set(part,5,options);
 assert.equal(a.combat.fire(vector(),vector(0,1),vector(.3,1.2)),b.combat.fire(vector(),vector(0,1),vector(.3,1.2)));
 for(let frame=0;frame<40;frame++){a.combat.update(.025);b.combat.update(.025);}
 assert.deepEqual(a.combat.state(),b.combat.state(),id+' observer cannot change combat state');
 assert.deepEqual(a.damage,b.damage);assert.deepEqual(a.effects,b.effects);
 a.combat.dispose();b.combat.dispose();
}
assert(receipts>100);
for(const id of ['frostnet','rewindbolt','thundermirror','thunderweb','chainburst','stormanchor']){
 let cast=0;const f=combatFixture(()=>cast++,true);f.combat.set(id,5);assert(Number.isFinite(f.combat.fire(vector(),vector(0,1))));assert.equal(cast,0,id+' empty/out-of-reach cast is not an action');f.combat.dispose();
}
let casts=0;const capped=combatFixture(()=>casts++,false,1);capped.combat.set('collapse',5);capped.combat.fire(vector(),vector(0,1));assert.equal(casts,1);capped.combat.fire(vector(),vector(0,1));assert.equal(casts,1,'Global projectile cap is not an actual cast');capped.combat.dispose();
const basicMotion=createJourneyDuelMotion();basicMotion.set('pierce');assert(basicMotion.basic());assert(!basicMotion.basic());basicMotion.step(.23);basicMotion.set('icegarden');assert(!basicMotion.basic());assert(!basicMotion.active(['frostbloom']));assert(basicMotion.active(['icegarden']));
console.log('Journey162: all 1296 source crops, 162 live rig selections, native two-sheet lifecycle, exact save/build derivation, all evolution combat observer parity and no-op firing PASS.');
