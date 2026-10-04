import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {titleState,codexNews} from '../src/titles.js';
import {recordModeBossVictory,MODE_BOSSES} from '../src/mode-boss-titles.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {readDiscoveries,recordDiscovery,normalizeDiscoveries,DISCOVERIES_KEY} from '../src/discoveries.js';
import {EXPANSION_ACTS} from '../src/act-expansion.js';
import {queueSurvivalTitle,settleSurvivalTitles,survivalTitleEvents,captureSurvivalSession} from '../src/survival-save.js';
import {ALL_FORMS} from '../src/forms.js';
import {MASTERY,MASTERY_STEP} from '../src/garden.js';

// Real account/discovery helpers and real main/title DOM callbacks in VM mocks.
// No authenticated cloud, physical device or visual validation is claimed.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const titleSource=readFileSync(new URL('../src/seed-title.js',import.meta.url),'utf8');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function memory(){const data=new Map();return {data,fail:'',getItem:k=>data.get(k)||null,setItem(k,v){if(this.fail===k)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};}
function functionSlice(name,next){const start=source.indexOf(`function ${name}(`),end=source.indexOf(`function ${next}(`,start);assert(start>=0&&end>start);return source.slice(start,end);}
function titleView(options={}){
 const node={hidden:true,textContent:'',style:{},remove(){this.removed=true;}};
 const context=vm.createContext({THREE,titleState,document:{createElement:()=>node,body:{append(){}}}});
 vm.runInContext(titleSource.slice(titleSource.indexOf('export function createSeedTitle')).replace('export function','function'),context);
 return context.createSeedTitle({position:new THREE.Vector3()},options);
}
const rows=[
 {boss:'crosswindKeeper',first:'crosswind',clear:'crosswindClear',veteran:'crosswindVeteran',name:'횡풍을 탄 자',tenName:'열 번의 바람길',clearName:'횡풍을 가른 자',stat:'criticalBonus'},
 {boss:'crystalGardener',first:'crystal',clear:'crystalClear',veteran:'crystalVeteran',name:'수정의 길을 연 자',tenName:'열 번의 개화',clearName:'협곡을 피운 자',stat:'powerBonus'}
];
for(const row of rows){
 const spec=MODE_BOSSES[row.boss],s=memory();
 assert.equal(spec.act,row.boss==='crosswindKeeper'?4:5);
 close(titleState({[row.first]:true})[row.stat],.01);
 close(titleState({[row.veteran]:true})[row.stat],.02);
 const combined=titleState({[row.first]:true,[row.veteran]:true,[row.clear]:true,equipped:row.boss});
 close(combined[row.stat],.03);close(combined.clearStatBonus,.01);
 assert.equal(combined.shown,row.name);assert(combined.titles.some(t=>t.name===row.tenName));assert(combined.titles.some(t=>t.name===row.clearName));
 if(row.stat==='criticalBonus')assert.match(combined.titles.find(t=>t.id===row.boss).perk,/\+1%p/);
 const event={mode:'survival',runId:'eligible-fixture',boss:row.boss,ordinal:1,now:100};
 let result=recordModeBossVictory(s,event);assert.equal(result.wins,1);assert.deepEqual(result.awards,[row.boss]);
 assert.equal(recordModeBossVictory(s,event).counted,false);
 for(let ordinal=2;ordinal<=10;ordinal++)result=recordModeBossVictory(s,{...event,ordinal});
 assert.equal(result.wins,10);assert.deepEqual(result.awards,[row.boss,spec.veteran,spec.clear]);
 const account=readAccountProfile(s);assert.equal(account.bossRuns['survival:eligible-fixture'][row.boss],10);
 assert.equal(account[spec.counter],10);
 let discoveries=readDiscoveries(s);for(const id of result.awards){const write=recordDiscovery(s,discoveries,'bosses',id);assert(write.saved);discoveries=write.profile;}
 assert.deepEqual(readDiscoveries(s).bosses,result.awards);assert.deepEqual(normalizeDiscoveries(discoveries).bosses,result.awards);
 const before=JSON.stringify([...s.data]);assert.equal(recordModeBossVictory(s,{...event,runId:'practice',practice:true}).saved,false);assert.equal(JSON.stringify([...s.data]),before);
 const other=memory();assert.equal(recordModeBossVictory(other,event).wins,1);assert.equal(readAccountProfile(s)[spec.counter],10,'UID-isolated storage cannot change the first account');
 // The same run text is separate in each mode, while duplicate callbacks
 // inside that mode are one receipt. This includes the adventure adapter.
 for(const mode of ['defense','adventure']){assert.equal(recordModeBossVictory(other,{...event,mode}).counted,true);assert.equal(recordModeBossVictory(other,{...event,mode}).counted,false);}
 assert.equal(readAccountProfile(other)[spec.counter],3);
 const failed=memory();failed.fail=ACCOUNT_PROFILE_KEY;assert.equal(recordModeBossVictory(failed,event).saved,false);assert.equal(readAccountProfile(failed)[spec.counter],0);
 failed.fail='';assert.equal(recordModeBossVictory(failed,event).wins,1);assert.equal(recordModeBossVictory(failed,event).counted,false);
}
const earned={crosswind:true,crosswindVeteran:true,crosswindClear:true,crystal:true,crystalVeteran:true,crystalClear:true};
close(titleState(earned).clearStatBonus,.02);
close(titleState({...earned,austinClear:true,alwaysClear:true,johanClear:true}).clearStatBonus,.05);
const dom=titleView(earned);assert.equal(dom.state().titles.length,6);
dom.setEquipped('crystalGardener');assert.equal(dom.root.textContent,'수정의 길을 연 자');close(dom.state().criticalBonus,.03);close(dom.state().powerBonus,.03);
for(const name of ['Crosswind','CrosswindClear','CrosswindVeteran','Crystal','CrystalClear','CrystalVeteran']){
 assert.equal(dom[`is${name}Unlocked`](),true);dom[`set${name}Unlocked`](false);assert.equal(dom[`is${name}Unlocked`](),false);dom[`set${name}Unlocked`](true);
}
dom.dispose();assert(dom.root.removed);

// Execute the shipped initialization expression and refresh callbacks, not
// a separately constructed adapter that could hide a missing field in main.
const storage=memory();writeAccountProfile(storage,{crosswindWins:10,crystalWins:10});
storage.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:[],bosses:['crosswindKeeper','crosswindclear','crystalGardener','crystalclear'],records:{}}));
let initial;
const init=vm.createContext({runStorage:storage,readDiscoveries,readAccountProfile,discoveredCount:p=>p.forms.length,DISCOVERY_FORMS:ALL_FORMS,player:{},createSeedTitle:(_p,o)=>{initial=o;return titleView(o);}});
vm.runInContext(source.slice(source.indexOf('let saveOK=false,profile='),source.indexOf('\nconst bossPet=',source.indexOf('let saveOK=false,profile=')))+'\nglobalThis.seedTitleResult=seedTitle;',init);
for(const key of Object.keys(earned))assert.equal(initial[key],true,key);
close(init.seedTitleResult.state().powerBonus,.03);close(init.seedTitleResult.state().criticalBonus,.03);

// Buffs join garden/codex/clear exactly once. Chance is additive percentage
// points, uses the existing 25% cap and is neutral in the mirror duel.
const stats=vm.createContext({mirrorSession:null,gardenStats:()=>({points:{power:2,critical:3}}),MASTERY_STEP,LS:{critChance:.05},titleState});
const statBlock=source.slice(source.indexOf('const codexRate='),source.indexOf('// 정원 장면은',source.indexOf('const codexRate=')));
vm.runInContext(statBlock+'\nseedTitle={state:()=>globalThis.titleInfo};globalThis.power=gardenPower;globalThis.crit=totalCritChance;globalThis.rate=masteryRate;',stats);
stats.titleInfo=titleState({...earned,discovered:30});
close(stats.power(),1+2*MASTERY_STEP+.02+.02+.03);
close(stats.crit(),.05+3*MASTERY_STEP+.02+.02+.03);
stats.LS.critChance=.24;close(stats.crit(),.25);
stats.mirrorSession={};close(stats.power(),1);close(stats.rate('critical'),0);
assert.match(source,/critChance=piercing\?totalCritChance\(\):0/,'the pre-existing form crit eligibility is retained');

// Run main's reward bridge with actual receipts, discoveries and setters.
function host(s=memory()){
 const tree=[],nodes=new Map(),ctx=vm.createContext({runStorage:s,recordModeBossVictory,MODE_BOSSES,readDiscoveries,recordDiscovery,developerRun:false,localInspection:false,survivalSession:null,expansionJourney:null,canSaveExpansion:()=>false,
  profile:readDiscoveries(s),seedTitle:titleView(),discoveredCount:p=>p.forms.length,codexNews,setTimeout:()=>{},$:id=>{if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id);},
  treeReward:e=>tree.push(e),treeWater:()=>{},cloud:{flush:()=>Promise.resolve()},dominantLaw:()=>null,effectiveLevels:()=>[],levels:new Map(),heldForms:new Map()});
 vm.runInContext(functionSlice('awardModeBoss','syncLaws'),ctx);
 return {ctx,tree,s};
}
const h=host();
for(const row of rows){assert(h.ctx.awardModeBoss('defense','host-fixture',row.boss,1));assert.equal(h.tree.at(-1).act,MODE_BOSSES[row.boss].act);assert.equal(h.ctx.seedTitle.state().titles.some(t=>t.id===row.boss),true);}
for(const row of rows){assert(h.ctx.awardModeBoss('adventure','host-adventure',row.boss,1));assert.equal(h.tree.at(-1).act,MODE_BOSSES[row.boss].act);}
const awarded=JSON.stringify([...h.s.data]);
for(const flag of ['localInspection','developerRun']){h.ctx[flag]=true;assert(h.ctx.awardModeBoss('defense','rejected-'+flag,'crosswindKeeper',1));assert.equal(JSON.stringify([...h.s.data]),awarded);h.ctx[flag]=false;}
assert(h.ctx.awardModeBoss('defense','rejected-practice','crystalGardener',1,true));assert.equal(JSON.stringify([...h.s.data]),awarded);
assert.equal(h.tree.length,4,'practice cannot water or reward the garden');
// Partial discovery failure may replay title unlocks, but never increments the
// account again. Two new bosses also survive exact FIFO serialization/retry.
h.s.fail=DISCOVERIES_KEY;assert.equal(h.ctx.awardModeBoss('survival','partial-fixture','crosswindKeeper',1),false);
const counter=readAccountProfile(h.s).crosswindWins;h.s.fail='';assert(h.ctx.awardModeBoss('survival','partial-fixture','crosswindKeeper',1));assert.equal(readAccountProfile(h.s).crosswindWins,counter);
const pending={};queueSurvivalTitle(pending,'crosswindKeeper',1);queueSurvivalTitle(pending,'crystalGardener',1);
const restored=JSON.parse(JSON.stringify(captureSurvivalSession(pending)));assert.equal(survivalTitleEvents(restored).length,2);
let failFirst=true;settleSurvivalTitles(restored,e=>failFirst?false:h.ctx.awardModeBoss('survival','fifo-fixture',e.boss,e.ordinal));assert.equal(survivalTitleEvents(restored).length,2);
failFirst=false;settleSurvivalTitles(restored,e=>h.ctx.awardModeBoss('survival','fifo-fixture',e.boss,e.ordinal));assert.equal(survivalTitleEvents(restored).length,0);

// Journey's shared future garden bridge resolves canonical act/counter data,
// instead of silently giving act-1 rarity and Austin's win count to act 4/5.
const gardenEvents=[],gardenContext=vm.createContext({garden:{},rng:()=>0,runStorage:memory(),MODE_BOSSES,readAccountProfile,
 grantBossMastery:g=>({garden:g}),writeGarden:()=>{},refreshGardenEffects:()=>{},treeReward:e=>{gardenEvents.push(e);return '';},masteryLine:()=>'',
 runDamageTaken:0,bossFightDamage0:0,dominantLaw:()=>null,effectiveLevels:()=>[],levels:new Map(),heldForms:new Map()});
writeAccountProfile(gardenContext.runStorage,{crosswindWins:7,crystalWins:8});
vm.runInContext(functionSlice('grantFinalBossGardenMemory','grantGoldenFruitPotion'),gardenContext);
gardenContext.grantFinalBossGardenMemory('crosswindKeeper');gardenContext.grantFinalBossGardenMemory('crystalGardener');
assert.deepEqual(gardenEvents.map(e=>[e.act,e.wins]),[[4,7],[5,8]]);

// The profile shows earned effects, never advertises locked candidate rewards.
const profileContext=vm.createContext({MASTERY,MASTERY_STEP,gardenStats:()=>({points:{}}),escapeHtml:s=>String(s),readAccountProfile,runStorage:memory()});
vm.runInContext(functionSlice('permanentStatsProfile','backfillPersonalBests'),profileContext);
const hidden=profileContext.permanentStatsProfile(titleState());assert.doesNotMatch(hidden,/횡풍의 수호자|수정의 정원사|칭호 공격력|칭호 치명타/);
writeAccountProfile(profileContext.runStorage,{crosswindWins:10,crystalWins:10});
const shown=profileContext.permanentStatsProfile(titleState(earned));assert.match(shown,/칭호 공격력 3%/);assert.match(shown,/칭호 치명타 3%p/);assert.match(shown,/횡풍의 수호자 10\/10/);assert.match(shown,/수정의 정원사 10\/10/);
assert.equal(EXPANSION_ACTS.crosswind.released,false);assert.equal(EXPANSION_ACTS.crystalGorge.released,false);
assert.match(source,/실험 기록은 계정·칭호·랭킹에 반영하지 않습니다/);
assert.match(source,/e\.expansionBoss&&expansionChannel==='public'&&!saveExpansionBossVictory\(\)/,'public boss requires durable campaign credit; actual retry path is covered by public-campaign test');
assert.match(source,/localInspection&&actCount===5\?true:awardModeBoss/,'five-act defense prototype remains practice');
console.log('4/5 candidate titles: actual receipt/discovery/DOM/main bridge, additive buffs/cap, failure/FIFO/account separation and unreleased gates passed (VM/helper validation only)');
