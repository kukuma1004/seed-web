import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRunReflection,reflectRun,runReflectionHTML} from '../src/run-reflection.js';
import {createSeedHurtPresentation} from '../src/seed-visual-language.js';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const a=source.indexOf('function hitPlayer('),b=source.indexOf('\nlet cameraShake=',a);
assert(a>0&&b>a);const hitSource=source.slice(a,b);
function host(){
 const events=[],evidence=createRunReflection();
 const ctx={hp:100,labSafe:false,invuln:0,shellTime:0,mode:'playing',cycle:0,region:'garden',elapsed:12,runDamageTaken:0,runReflection:evidence,
  difficulty:()=>({damage:2}),player:{position:{},userData:{pulseHurt:n=>events.push(['hurt',n])}},burst(){},cameraShake:0,audio:{play(){}},
  survivalSession:null,mirrorSession:null,expansionJourney:null,arborJourney:null,inventory:{},tryRevive:()=>null,finishRoomAnalysis:()=>null,
  developerRun:false,protectJourneyBossReceipts:()=>true,clearCheckpoint:()=>events.push(['end-save']),actStore:()=>({}),showEnd:()=>events.push(['end'])};
 vm.createContext(ctx);vm.runInContext(hitSource+'\nglobalThis.hit=hitPlayer;',ctx);return {ctx,events,evidence};
}
for(const gate of ['invuln','shellTime','labSafe','mode']){
 const {ctx,evidence,events}=host();ctx[gate]=gate==='mode'?'cards':gate==='labSafe'?true:1;
 ctx.hit(20,'trap');assert.equal(ctx.hp,100);assert.equal(evidence.summary().hits,0);assert.equal(events.length,0);
}
{
 const {ctx,evidence,events}=host();ctx.hit(10,'trap');assert.equal(ctx.hp,80);assert.equal(ctx.runDamageTaken,20);assert.equal(evidence.summary().damage,20);
 ctx.hit(10,'shot');assert.equal(evidence.summary().hits,1,'ignored invulnerable contact never becomes a cause');
 ctx.invuln=0;ctx.hp=5;ctx.hit(10,'boss-contact','정시파이터 오스틴');
 assert.equal(ctx.hp,0);assert.equal(ctx.runDamageTaken,25,'actual remaining HP, not unbounded incoming damage');
 assert.deepEqual(events.at(-1),['end']);
 const r=reflectRun({evidence:evidence.summary(),heals:2,boss:{name:'오스틴',hp:.1,maxHp:100},dashes:0});
 assert.match(r.reason,/오스틴/);assert.match(r.next,/물약 2개/);assert(r.facts.some(x=>x.includes('1%')),'positive fractional boss HP is not a fake clear');
 assert(r.facts.includes('회피 사용 0회'));
 const old=evidence.summary();old.last.name='변조';assert.equal(evidence.summary().last.name,'정시파이터 오스틴','external UI cannot change evidence');
 evidence.reset({continued:true});assert.equal(evidence.summary().hits,0);assert.equal(evidence.summary().resumed,true);
}
{
 const {ctx,evidence,events}=host();ctx.hp=10;ctx.tryRevive=()=>({hp:50,guard:2});ctx.enemyShots=[];ctx.release=()=>{};ctx.itemBarKey='';ctx.vfx={pulse(){},burst(){}};ctx.ITEMS={sprout:{name:'다시 싹'}};ctx.$=()=>({textContent:''});
 ctx.hit(10,'charge');assert.equal(ctx.hp,50);assert(!events.some(e=>e[0]==='end'));assert.equal(evidence.summary().last.fatal,true,'the lethal contact is recorded without triggering a false terminal');
}
for(const bad of [{before:10,after:10},{before:10,after:11},{before:NaN,after:0},{before:0,after:0}])assert.equal(createRunReflection().hit(bad),false);
{
 const e=createRunReflection();for(let i=0;i<20000;i++)e.hit({before:100,after:99,time:i,kind:i%2?'shot':'crowd'});
 const r=e.summary();assert.equal(r.hits,20000);assert.equal(r.damage,20000);assert.equal(Object.keys(r).length,6);assert(!JSON.stringify(r).includes('events'),'retained contact evidence stays constant size');
 e.reset();assert.equal(e.summary().last,null);
}
const fatal=createRunReflection();fatal.hit({before:20,after:0,kind:'seal',name:'<img src=x onerror=bad>'});
assert.match(reflectRun({evidence:fatal.summary(),heals:5}).next,/걸어/,'seal teaches walking even if healing is unused');
assert(!runReflectionHTML(reflectRun({evidence:fatal.summary()})).includes('<img'),'actor labels are escaped');
const core=reflectRun({evidence:fatal.summary(),coreLost:true,heals:5});assert.match(core.reason,/보호 목표/);assert(!core.next.includes('물약'));
const left=reflectRun({evidence:fatal.summary(),left:true,boss:{hp:50,maxHp:100}});assert.match(left.reason,/직접 나가기/);assert(!left.facts.some(x=>x.includes('생명력')));
assert.match(reflectRun({won:true}).reason,/목표를 마쳤/);
assert.match(reflectRun().reason,/확인하지 못했/,'no historic/unknown hit is fabricated');
// Execute the shipping snapshot adapter: a past completed lap is not a win
// for the current death/core collapse, and no saved totals imply unseen hits.
const ra=source.indexOf('function runResultReflection('),rb=source.indexOf('\nfunction finishSurvival(',ra);
assert(ra>0&&rb>ra);
const rh={enemies:[],isBoss:e=>e.type==='austin',AUSTIN:{name:'오스틴'},ALWAYS_BEGINNER:{name:'항상초심'},TEMPEST_CARRIER:{name:'요한'},expansionJourney:null,survivalSession:{bossSpawned:false},survivalAct:()=>({boss:'오스틴'}),hp:100,inventory:{potion:2,tonic:1},runDashes:0,mirrorSession:null,runReflection:fatal,reflectRun,runReflectionHTML};
vm.createContext(rh);vm.runInContext(source.slice(ra,rb)+'\nglobalThis.result=runResultReflection;',rh);
assert.match(rh.result({won:true,coreLost:true}),/심장이 무너졌/);
rh.hp=0;assert.match(rh.result({won:true}),/마지막으로 맞은/);assert(!rh.result({won:true}).includes('목표를 마쳤'));
assert.match(source,/if\(!left&&coreLost\)outcome.title=/,'actual core ending reaches the headline');
assert.match(source,/restoreSurvivalWorld[\s\S]*?runReflection.reset\(\{continued:true\}\)/);
assert.match(source,/runReflection.reset\(\{continued:Boolean\(restore\)\}\)/);
assert.match(source,/onGarden:\(\)=>showGarden\(showDungeon\)/,'garden return never calls showEnd again to award another harvest');
// Drive the actual restart prefix up to its first combat/build reset. A
// rejected tombstone must leave the run identity and previous result intact.
const restartAt=source.indexOf('function restart('),resetAt=source.indexOf('heldForms.clear();',restartAt);
assert(restartAt>0&&resetAt>restartAt);
for(const {ok,developer=false,survival=false,saved=null} of [{ok:false},{ok:true},{ok:false,developer:true},{ok:false,survival:true},{ok:false,saved:{version:1,region:'garden',pendingBossTitles:[]}}]){
 let clearCalls=0,newIds=0,resetReached=0;const labels={textContent:''};
 const state={bossRecordReady:()=>true,protectJourneyBossReceipts:()=>true,developerRun:developer,survivalSession:survival?{}:null,arborJourney:null,
  account:{user:()=>({uid:'same-owner'})},$ :()=>labels,expansionLaunch:0,releaseExpansionSaveLease:()=>Promise.resolve(),expansionChannel:'inspection',expansionPublicEntry:null,expansionPublicSync:null,expansionFreshExpected:null,expansionPendingBossCheckpoint:null,expansionJourney:null,expansionTerrain:null,expansionJourneyView:{setActive(){}},gameplayPaused:()=>false,showSeasonPause(){},maintenanceOn:false,showMaintenance(){},playableAct3Region:r=>r,playableRegion:r=>r,location:{},region:'stadium',startRegion:'garden',
  clearCheckpoint:store=>{clearCalls++;assert.equal(store.region,'garden','clear only the intended fresh act');return ok;},actStore:()=>({region:state.region}),journeyCompletionPending:false,currentJourneyOwner:'same-owner',currentJourneyRunId:'existing-run',journeyRunId:()=>{newIds++;return 'new-run';},pendingJourneyBossTitles:[],runReflection:createRunReflection(),touch:{enabled:false},appShell:{enterFullscreen(){}},perfBegin(){},resetReached:()=>resetReached++};
 vm.createContext(state);vm.runInContext(source.slice(restartAt,resetAt)+'resetReached();return;}\nglobalThis.retry=restart;',state);
 state.retry(saved);
 const skipped=developer||survival||Boolean(saved);
 assert.equal(clearCalls,skipped?0:1);
 if(!ok&&!skipped){assert.equal(resetReached,0);assert.equal(newIds,0);assert.equal(state.currentJourneyRunId,'existing-run');assert.equal(state.region,'stadium');assert.match(labels.textContent,/기존 기록을 유지/);}
 else {assert.equal(resetReached,1);assert.equal(newIds,1);}
}
for(const hz of [20,60,120]){const hurt=createSeedHurtPresentation({enabled:true});hurt.pulse();for(let t=0;t<.1-1e-9;t+=1/hz)hurt.step(1/hz);assert(Math.abs(hurt.value()-(1-.1/.18))<1e-9);hurt.step(1);assert.equal(hurt.value(),0);hurt.pulse();hurt.reset();assert.equal(hurt.value(),0);}
const quiet=createSeedHurtPresentation({enabled:true,reducedMotion:true});quiet.pulse();assert.equal(quiet.value(),.3);quiet.step(NaN);assert.equal(quiet.value(),.3);
const disabled=createSeedHurtPresentation();disabled.pulse();assert.equal(disabled.value(),0);
console.log('PASS shipping accepted-hit/ignored-defense/revive/terminal paths, exact observed damage, bounded 20000 contacts, resumed scope, core/exit/milestone distinction, escaped labels, no re-harvest and frame-independent visual contact. CPU contracts; no human fun/device claim.');
