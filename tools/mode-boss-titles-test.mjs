import assert from 'node:assert/strict';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {normalizeBossRuns,mergeBossRuns} from '../src/boss-title-ledger.js';
import {readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
writeAccountProfile(store,{austinWins:8});
const event={mode:'defense',runId:'same-run',boss:'austin',ordinal:1};
let r=recordModeBossVictory(store,event);assert.deepEqual(r.awards,['austin']);assert.equal(r.wins,9);
assert(!recordModeBossVictory(store,event).counted);assert.equal(readAccountProfile(store).austinWins,9);
r=recordModeBossVictory(store,{...event,mode:'survival'});assert.equal(r.wins,10);assert.deepEqual(r.awards,['austin','austinveteran']);
r=recordModeBossVictory(store,{...event,ordinal:2});assert(!r.awards.includes('austinclear'));
r=recordModeBossVictory(store,{...event,ordinal:3});assert(r.awards.includes('austinclear'));
for(const boss of ['alwaysbeginner','tempestcarrier']){for(let n=1;n<=10;n++)r=recordModeBossVictory(store,{...event,boss,ordinal:n});assert.equal(r.awards.length,3);assert.equal(r.wins,10);}
const before=JSON.stringify(readAccountProfile(store));for(const extra of [{practice:true},{mode:'journey'},{ordinal:0},{runId:'__proto__:no'},{boss:'warden'}])assert(!recordModeBossVictory(store,{...event,...extra}).saved);assert.equal(JSON.stringify(readAccountProfile(store)),before);
const merged=mergeBossRuns({'survival:run':{at:10,austin:3}},{'survival:run':{at:20,austin:1,alwaysbeginner:2}});assert.equal(merged['survival:run'].austin,3);assert.equal(merged['survival:run'].alwaysbeginner,2);
assert.equal(Object.keys(normalizeBossRuns(Object.fromEntries(Array.from({length:100},(_,i)=>['defense:r'+i,{at:i,austin:1}])))).length,64);
const broken={getItem:()=>null,setItem:()=>{throw Error('quota');}};assert(!recordModeBossVictory(broken,event).saved);
// Execute the real survival retry bridge: a failed write remains in its
// checkpoint's primitive fields; practice and switched accounts cannot grant.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const calls=[],ctx=vm.createContext({survivalSession:{titleBoss:'tempestcarrier',titleOrdinal:3},localInspection:false,developerRun:false,survivalSaveToken:{id:'saved-run',owner:'same'},survivalOwner:()=> 'same',awardModeBoss:(...args)=>{calls.push(args);return false;}});
vm.runInContext(main.slice(main.indexOf('function settleSurvivalTitle(){'),main.indexOf('function saveSurvival(){')),ctx);
ctx.settleSurvivalTitle();assert.equal(ctx.survivalSession.titleBoss,'tempestcarrier');assert.deepEqual(calls[0],['survival','saved-run','tempestcarrier',3,false]);
ctx.awardModeBoss=(...args)=>{calls.push(args);return true;};ctx.survivalSaveToken.owner='different';ctx.settleSurvivalTitle();assert.equal(calls.at(-1).at(-1),true);assert.equal(ctx.survivalSession.titleBoss,undefined);
console.log('Shared boss titles: first/10 cumulative/3 same-run, both modes, duplicate restore, cloud receipt merge, practice exclusion and failed storage passed.');
