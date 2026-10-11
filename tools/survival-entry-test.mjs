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
const preflight=vm.createContext({Promise,survivalEntry:{valid:()=>true},bossRecordReady:()=>true,localInspection:false,survivalOwner:()=> 'owner-A',account:{user:()=>({isAnonymous:false})},survivalStore:()=>({readRecord:()=>null}),freshExpansionObjective:()=> 'crystal-defense-v1',CRYSTAL_DEFENSE_OBJECTIVE:'crystal-defense-v1',expansionObjectiveReleased:()=>true,survivalSiegeApi:null,expansionSiegeView:null,expansionJourneyView:null,prepareExpansionAssets:async act=>{assert.equal(act,undefined,'first act never waits for cover');preflight.expansionJourneyView={};},prepareCrystalSiegeView:async()=>{preflight.expansionSiegeView={};},prepareExpansionEnvironment:()=>{plate++;return never;},prepareExpansionCover:()=>{cover++;return never;},mount:()=>{mounted++;}});
vm.runInContext(prefix+' mount();\n}',preflight);await preflight.startSurvival();assert.equal(mounted,1);assert.equal(cover,1);assert.equal(plate,1);
console.log('Survival entry: duplicate start, failure/retry, timeout, late callback, back and account boundary PASS');
