import {launchJourneyCard} from '../src/journey-entry-ui.js';
import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {carryTotal} from '../src/shop.js';
import {itemArt} from '../src/item-art.js';
import {expansionJourneyResult,expansionRankView} from '../src/expansion-journey-result.js';
import {EXPANSION_ACTS,expansionCircuitReleased} from '../src/act-expansion.js';
import {EXPANSION_CIRCUIT_KILLS,CROSSWIND_CIRCUIT_KILLS} from '../src/act-expansion-runtime.js';
import {ACT,JOURNEY_EXPANSION_KILL_BUDGET} from '../src/online-ranking.js';
import {readAccountProfile,writeAccountProfile,recordBestScore} from '../src/account-profile.js';
import {accountRole,rankingDecision,classifySubmitError} from '../src/ranking-eligibility.js';
import {fixture,released,source} from './expansion-public-host-test.mjs';
const both=released.EXPANSION_ACTS;
const input={act:'crosswind',owner:'owner-A',currentOwner:'owner-A',ended:true,done:true,name:'테스터',score:20520,cycle:2,stage:4,kills:126,time:680,acts:both};
for(const act of ['crosswind','crystalGorge']){
 const e=expansionJourneyResult({...input,act});assert(e);assert.equal(e.act,act==='crosswind'?4:5);assert.equal(Object.isFrozen(e),true);assert.equal(e.done,true);
 const maximum=JOURNEY_EXPANSION_KILL_BUDGET[act==='crosswind'?4:5]*3;
 for(const patch of [{acts:closedExpansionActs},{currentOwner:'owner-B'},{inspection:true},{practice:true},{ended:false},{cycle:3},{stage:0},{kills:maximum+1},{time:1},{act:'garden'}])assert.equal(expansionJourneyResult({...input,act,...patch}),null);
 assert(expansionJourneyResult({...input,act,kills:(act==='crosswind'?CROSSWIND_CIRCUIT_KILLS:EXPANSION_CIRCUIT_KILLS)*3}),'the earlier guardian-free three-circuit maximum remains eligible');
 assert(expansionJourneyResult({...input,act,kills:maximum}),'five actual guardian deaths per lap fit the new exact physical maximum');
 assert.equal(expansionJourneyResult({...input,act,done:false,cycle:0,stage:0,kills:10,score:200,time:10}).done,false);
}
assert.equal(expansionRankView('crosswind'),'crosswind');assert.equal(expansionRankView('crystalGorge'),'crystal');assert.equal(expansionRankView('austin'),null);
const tick=()=>new Promise(r=>setImmediate(r));
// Real result-screen body must snapshot the finished run before retry mutates
// combat globals, record the correct account best and never rank a lab result.
for(const act of ['crosswind','crystalGorge']){
 const f=fixture();assert(await f.c.startPublicExpansionJourney(act));await f.c.syncPublicExpansion();
 Object.assign(f.c,{readAccountProfile,writeAccountProfile,recordBestScore,accountRole,rankingDecision,classifySubmitError,adminMode:true,betaTesterMode:false,paceGame:680,paceReal:680,paceTrusted:()=>true,setText:(n,v)=>{if(n)n.textContent=v;},logRankingFailure(){},score:20520,cycle:2,stage:4,kills:126,elapsed:680});
 let release;const submitted=[];f.c.online={flush:()=>new Promise(r=>release=r),submit:async e=>{submitted.push(e);return {rank:7};}};
 f.c.showExpansionResult(true,true);assert.match(f.$('#overlay').innerHTML,/완주/);assert(!f.$('#overlay').innerHTML.includes('보스 검토 종료'));const profile=readAccountProfile(f.storage);assert.equal(profile.bestScores['act'+(act==='crosswind'?4:5)],20520);assert.equal(profile.bestScores.act1,0);
 f.c.score=999999;f.c.kills=999999;release();await tick();await tick();assert.equal(submitted.length,1);assert.equal(submitted[0].score,20520);assert.equal(submitted[0].kills,126);assert.equal(submitted[0].act,act==='crosswind'?4:5);assert.match(f.$('#expansion-rank-status').textContent,/7位|7위/);
 await f.c.releaseExpansionSaveLease();
}
{const f=fixture();assert(await f.c.startPublicExpansionJourney('crosswind'));Object.assign(f.c,{readAccountProfile,writeAccountProfile,recordBestScore,accountRole,rankingDecision,classifySubmitError,adminMode:true,betaTesterMode:false,paceTrusted:()=>true,paceGame:20,paceReal:20,setText:(n,v)=>{if(n)n.textContent=v;},logRankingFailure(){},score:200,cycle:0,stage:0,kills:10,elapsed:10});let go,posts=0;f.c.online={flush:()=>new Promise(r=>go=r),submit:()=>{posts++;}};f.c.showExpansionResult(false,true);f.setOwner('owner-B');go();await tick();await tick();assert.equal(posts,0);assert.match(f.$('#expansion-rank-status').textContent,/계정이 바뀌/);f.setOwner('owner-A');await f.c.releaseExpansionSaveLease();}
// Execute gated ranking tabs/filter parameters; selectors are DOM mocks only.
const rankingSource=source.slice(source.indexOf('function showRanking('),source.indexOf('// Falling ends the run:',source.indexOf('function showRanking(')));
for(const open of [false,true])for(const view of ['crosswind','crystal']){
 const nodes=new Map(),$=k=>{if(!nodes.has(k))nodes.set(k,{textContent:'',innerHTML:'',classList:{remove(){},add(){}}});return nodes.get(k);};let requested;
 const c=vm.createContext({$,rankSerial:0,ACT,SEASON:{name:'시즌 1'},expansionCircuitReleased:()=>open,gameplayPaused:()=>true,readRanking:()=>[],act3Storage:s=>s,actStorage:s=>s,runStorage:{},playerName:'테스터',act2Available:()=>false,act3Available:()=>false,showSeasonPause(){},document:{querySelectorAll:()=>[]},rankingBoard:()=>'',setText:(n,v)=>{if(n)n.textContent=v;},bindRankSafety(){},online:{flush:()=>Promise.resolve(),top:(_a,_b,_c,act)=>{requested=act;return Promise.resolve([]);},uid:()=>'',personalRank:()=>Promise.resolve({entry:null,rank:0})}});
 vm.runInContext(rankingSource,c);c.showRanking(view);await tick();assert.equal(requested,open?(view==='crosswind'?4:5):null);assert.equal(c.$('#overlay').innerHTML.includes('data-board="crosswind"'),open);assert.equal(c.$('#overlay').innerHTML.includes('data-board="crystal"'),open);
}
// Use the actual menu template and handler. New cards cannot appear under a
// single gate, ordinary inspection, or anonymous accounts. Explicit local art
// review launches inspection only and cannot touch account saves. Assets exist.
const menu=source.slice(source.indexOf('function showJourneys(){'),source.indexOf('// Every visible ranking line')).replaceAll('import.meta.env.BASE_URL',"'/'");
for(const variant of ['closed','one','open','inspection','anonymous','art-preview','anonymous-art-preview']){
 const nodes=new Map(),$=k=>{if(!nodes.has(k))nodes.set(k,{disabled:false,dataset:{},isConnected:true,setAttribute(k,v){this[k]=v;},querySelectorAll:()=>[],innerHTML:'',classList:{remove(){},add(){}}});return nodes.get(k);};let launch;
 const acts=variant==='closed'?closedExpansionActs:variant==='one'?{...both,crystalGorge:{...both.crystalGorge,released:false}}:both;
 const c=vm.createContext({launchJourneyCard,$,mode:'ready',touch:{reset(){}},keys:new Set(),readCheckpoint:()=>null,actStorage:s=>s,act3Storage:s=>s,runStorage:{},rawStorage:{},profile:{},act2Available:()=>true,act3Available:()=>true,act2Unlocked:()=>true,act3Unlocked:()=>true,location:{search:variant.includes('art-preview')?'?journeyArtLab=1':''},URLSearchParams,localInspection:variant==='inspection'||variant==='art-preview',EXPANSION_ACTS:acts,expansionCircuitReleased:()=>expansionCircuitReleased(acts),expansionOwner:()=> 'owner-A',account:{user:()=>({uid:'owner-A',isAnonymous:variant==='anonymous'||variant==='anonymous-art-preview'})},createExpansionAccountSaveStore:()=>{assert(variant==='open','art inspection must not access account saves');return {read:()=>null};},MIRROR_TRIAL_PROTOTYPE:{released:false},austinKnown:()=>false,readMirrorRecord:()=>({}),readMirrorCheckpoint:()=>null,readCheckpointBackups:()=>({}),readShop:()=>({coins:200,carry:{}}),carryTotal,itemArt,itemCounts:()=>'',escapeHtml:s=>s,AUSTIN:{name:'オ'},requireName:()=>true,startPublicExpansionJourney:(...args)=>{launch=['public',...args];},startExpansionJourney:(...args)=>{launch=['inspection',...args];},showIntro(){},showShop(){},showDungeon(){}});
 c.rawStorage={getItem:()=>null};c.arborOwner=()=> 'owner-A';c.startArborJourney=options=>{launch=['arbor',options];};
 vm.runInContext(menu,c);c.showJourneys();assert.equal(c.$('#overlay').innerHTML.includes('id="start-crosswind"'),variant==='open'||variant==='art-preview');assert.equal(c.$('#overlay').innerHTML.includes('id="start-crystalGorge"'),variant==='open'||variant==='art-preview');
 assert(c.$('#overlay').innerHTML.includes('id="start-arbor"'),'the independently saved sixth Journey remains visible');assert(fs.existsSync('public/assets/arbor/arbor-courtyard-v1.webp'));c.$('#start-arbor').onclick();assert.deepEqual(JSON.parse(JSON.stringify(launch)),['arbor',{resume:null}]);
 if(variant==='art-preview'){c.$('#start-crystalGorge').onclick();assert.deepEqual(JSON.parse(JSON.stringify(launch)),['inspection',0,'crystalGorge',{siegePreview:true}]);}
 if(variant==='open'){c.$('#start-crosswind').onclick();assert.deepEqual(JSON.parse(JSON.stringify(launch)),['public','crosswind',{resume:null}]);for(const path of [...c.$('#overlay').innerHTML.matchAll(/assets\/(menu\/journey-act[1-5]-v3\.webp)/g)].map(m=>m[1]))assert(fs.existsSync('public/assets/'+path),path);assert.equal([...c.$('#overlay').innerHTML.matchAll(/class="journey-picture journey-art"/g)].length,6);}
}
{const f=fixture({inspection:true});f.c.expansionJourney={act:'crystalGorge',siege:{}};f.c.expansionChannel='inspection';f.c.showExpansionResult(true,true);assert(f.$('#overlay').innerHTML.includes('보스 검토 종료'));assert(!f.$('#overlay').innerHTML.includes('완주'));assert.equal(readAccountProfile(f.storage).bestScores.act5,0);}
console.log('Actual public result/menu/ranking functions: immutable finished score, owner switch cancellation, account act4/5 best, release/inspection/auth gates, exact boss filters and shipped art references passed. DOM/REST mocks, no visual or production claim.');
