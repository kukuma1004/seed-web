import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSurvivalEntry} from '../src/survival-entry.js';
let owner='a',jobs=[],calls=0,errors=[],busy=[],clock;
const entry=createSurvivalEntry({owner:()=>owner,start:(...args)=>{calls++;const token=args.pop();return new Promise((resolve,reject)=>jobs.push({args,token,resolve,reject}));},onBusy:v=>busy.push(v),onError:e=>errors.push(e.message),setTimer:fn=>(clock=fn,1),clearTimer:()=>{}});
const saved={id:'preserve',progress:{forms:{ice:12}}};
const first=entry.run(null,saved);assert.equal(entry.run(null,saved),first);await Promise.resolve();assert.equal(calls,1);assert.equal(jobs[0].args[1],saved);jobs[0].reject(Error('chunk failed'));await first;assert.deepEqual(errors,['chunk failed']);assert.deepEqual(busy,[true,false]);assert.equal(saved.progress.forms.ice,12);
const second=entry.run();await Promise.resolve();const late=jobs[1];clock();await second;assert(!entry.valid(late.token));assert.equal(errors.at(-1),'survival-entry-timeout');
const third=entry.run();await Promise.resolve();assert(entry.valid(jobs[2].token));late.resolve(true);await Promise.resolve();assert(entry.valid(jobs[2].token),'late completion cannot clear a retry');entry.cancel();await third;assert(!entry.valid(jobs[2].token));
const fourth=entry.run();await Promise.resolve();owner='b';assert(!entry.valid(jobs[3].token));jobs[3].resolve(true);await fourth;
// Execute the shipping host entry: a stale asynchronous callback is rejected
// before account gates, world reset or any save mutation.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');const start=source.indexOf('function startSurvival('),end=source.indexOf('\nfunction ',start+10);assert(start>=0&&end>start);
const host=vm.createContext({survivalEntry:entry,bossRecordReady:()=>{throw Error('stale launch touched world');}});vm.runInContext(source.slice(start,end),host);host.startSurvival(null,saved,null,late.token);
assert(source.includes('void survivalEntry.run(null,saved)'));assert(source.includes('return startSurvival(lab,saved,siegeRecord,entry)'));
// The actual signed-in preflight must not wait for optional image decoding.
// Substitute only the dynamic module boundary and final world mount. Art stays
// deliberately pending while the shipping control flow starts the first act.
let mounted=0,cover=0,plate=0;const never=new Promise(()=>{});
const prefix=source.slice(start,source.indexOf(' ++expansionLaunch;',start)).replace("import('./survival-crystal-siege.js')","Promise.resolve({})");
const preflight=vm.createContext({Promise,survivalEntry:{valid:()=>true},bossRecordReady:()=>true,localInspection:false,survivalOwner:()=> 'owner-A',account:{user:()=>({isAnonymous:false})},survivalStore:()=>({read:()=>null,readRecord:()=>null}),freshExpansionObjective:()=> 'crystal-defense-v1',CRYSTAL_DEFENSE_OBJECTIVE:'crystal-defense-v1',expansionObjectiveReleased:()=>true,survivalSiegeApi:null,expansionSiegeView:null,expansionJourneyView:null,prepareExpansionAssets:async act=>{assert.equal(act,undefined,'first act never waits for cover');preflight.expansionJourneyView={};},prepareCrystalSiegeView:async()=>{preflight.expansionSiegeView={};},prepareExpansionEnvironment:()=>{plate++;return never;},prepareExpansionCover:()=>{cover++;return never;},mount:()=>{mounted++;}});
vm.runInContext(prefix+' mount();\n}',preflight);await preflight.startSurvival();assert.equal(mounted,1);assert.equal(cover,1);assert.equal(plate,1);

// Execute the public-account guards that the inspection path skips. A blocked
// account must keep its record and display the reason inside the visible menu.
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',dataset:{},disabled:false,children:[],setAttribute(k,v){this[k]=v;},replaceChildren(){this.children=[];},append(v){this.children.push(v);}});return elements.get(id);};
const guard=vm.createContext({survivalEntry:{valid:()=>true},survivalSaveMessage:'',localInspection:false,$:element,bossRecordReady:()=>{element('#toast').textContent='보스 기록 확인 실패';return false;}});
const blockedStart=source.indexOf('function survivalStartBlocked('),blockedEnd=source.indexOf('\nconst survivalEntry=',blockedStart);
vm.runInContext(source.slice(blockedStart,blockedEnd)+source.slice(start,end),guard);
assert.equal(guard.startSurvival(),undefined);assert.equal(element('#survival-start-status').textContent,'보스 기록 확인 실패');assert.equal(element('#survival-start-status').role,'alert');
// A cloud check disables input deliberately. Expose that wait on the button,
// then restore its real label on conflict/offline without enabling conflicts.
let finishSync;
const syncHost=vm.createContext({$:id=>elements.get(id)||null,mode:'ready',survivalSaveMessage:'',survivalCloud:{sync:()=>new Promise(resolve=>{finishSync=resolve;})},survivalSyncLabel:r=>r.kind,survivalStartBlocked:guard.survivalStartBlocked,survivalRecordSummary:()=> 'saved',document:{createElement:()=>({})}});
for(const [id,label] of [['#start-survival','생존전 시작'],['#resume-survival','이어하기'],['#survival-cloud-retry','계정 저장 다시 확인'],['#survival-cloud-status',''],['#survival-cloud-conflict','']])element(id).textContent=label;
const syncStart=source.indexOf('async function refreshSurvivalAccount('),syncEnd=source.indexOf('\nconst modeRankingAuth',syncStart);
vm.runInContext(source.slice(syncStart,syncEnd),syncHost);
const wait=syncHost.refreshSurvivalAccount();assert(element('#start-survival').disabled);assert.equal(element('#start-survival').textContent,'계정 저장 확인 중…');
finishSync({kind:'conflict',local:{id:'device'},remote:{id:'cloud'},expected:{}});await wait;
assert(element('#start-survival').disabled);assert.equal(element('#start-survival').textContent,'생존전 시작');assert.match(element('#survival-start-status').textContent,/이어갈 기록/);assert.equal(element('#survival-cloud-conflict').children.length,3,'existing choices remain the only conflict resolution');
const retry=syncHost.refreshSurvivalAccount();finishSync({kind:'offline'});await retry;
assert(!element('#start-survival').disabled);assert.equal(element('#resume-survival').textContent,'이어하기');
assert.equal(element('#survival-start-status').textContent,'','a resolved conflict must not leave a stale blocking warning');
console.log('Shipping public-account menu: visible boss guard, labelled cloud wait, strict conflict choices and offline retry PASS; no live account or device claim.');

console.log('Survival entry: duplicate start, failure/retry, timeout, late callback, back and account boundary PASS');
