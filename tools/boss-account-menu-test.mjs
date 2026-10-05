import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {normalizeAccountProfile,readAccountProfile as readStoredAccountProfile,ACCOUNT_PROFILE_KEY} from '../src/account-profile.js';
import {bossVictoryAccountKey,installBossVictoryAccount} from '../src/boss-victory-account.js';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossVictoryLedger,addBossVictoryEvent} from '../src/boss-victory-events.js';
import {readDiscoveries,DISCOVERIES_KEY} from '../src/discoveries.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const rows=new Map([['seed-cloud-owner-v1','menu-owner'],[ACCOUNT_PROFILE_KEY,JSON.stringify({version:1,austinWins:99})],[bossVictoryAccountKey('menu-owner'),'{"version":99,"preserve":true}']]);
const storage={getItem:k=>rows.get(k)??null},toast={textContent:''};
const ctx=vm.createContext({readStoredAccountProfile,normalizeAccountProfile,runStorage:storage,localInspection:false,developerRun:false,$:()=>toast});
const menu=source.slice(source.indexOf('let bossAccountBlocked=false;'),source.indexOf('const webTelemetry='));
vm.runInContext(menu,ctx);
assert.equal(ctx.readAccountProfile(storage).austinWins,0,'menus do not invent a fallback count from corrupt V2 bytes');
assert.equal(ctx.bossRecordReady(),false);assert.match(toast.textContent,/보관/);assert.equal(rows.get(bossVictoryAccountKey('menu-owner')),'{"version":99,"preserve":true}');
ctx.localInspection=true;assert.equal(ctx.bossRecordReady(),true,'isolated experiments remain available');ctx.localInspection=false;
rows.delete(bossVictoryAccountKey('menu-owner'));assert.equal(ctx.bossRecordReady(),true);assert.equal(ctx.readAccountProfile(storage).austinWins,99,'unmigrated legacy data remains valid');
let queries=0;ctx.readBossVictoryAccount=()=>({context:{epoch:'verified-02'}});ctx.account={user:()=>({uid:'menu-owner',isAnonymous:false})};ctx.online={historicalBossWins:()=>{queries++;return 100;}};
vm.runInContext(source.slice(source.indexOf('async function backfillBossVeterans(){'),source.indexOf('function showAccount(')),ctx);await ctx.backfillBossVeterans();assert.equal(queries,0,'migrated titles never use ranking inference');
for(const name of ['function restart(','function startSurvival(','async function showSeedAdventure(','async function showSeedDefense(','async function startExpansionJourney('])assert(source.slice(source.indexOf(name),source.indexOf(name)+260).includes('bossRecordReady()'));
assert(source.includes('mountSeedAdventure({bossEpoch:currentBossEpoch,'),'adventure reads the current epoch at death');
// Execute the actual onSynced callback, including an intentionally synchronous
// callback during construction before the later main bindings are initialized.
{
 const data=new Map(),m={get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const uid='sync-owner',epoch='sync-epoch';m.setItem('seed-cloud-owner-v1',uid);m.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify({version:1,austinWins:8,badges:['remote-badge'],equippedTitle:'austinveteran'}));
 const seal=createBossMigrationSeal(uid,epoch,{version:1,account:{version:1,austinWins:8},discoveries:{bosses:[]}},1);
 let ledger=createBossVictoryLedger(uid,epoch,seal.baseline);
 for(let i=0;i<2;i++)ledger=addBossVictoryEvent(ledger,{mode:'journey',runId:'server-'+i,boss:'austin',ordinal:1},{ownerUid:uid,epoch}).ledger;
 installBossVictoryAccount(m,{ownerUid:uid,seal,ledger});m.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:[],bosses:['crosswindclear'],records:{}}));
 let user=uid,callback,removals=0,writes=0;const earned=new Set(['setCrystalVeteranUnlocked']);
 const fakeTitle={state:()=>({titles:[{id:'earned-badge'}]}),setDiscovered(n){this.discovered=n;},setBadges(v){this.badges=v;},setEquipped(v){this.equipped=v;}};
 for(const method of ['setUnlocked','setAustinClearUnlocked','setAustinVeteranUnlocked','setAlwaysBeginnerUnlocked','setAlwaysClearUnlocked','setAlwaysVeteranUnlocked','setJohanUnlocked','setJohanClearUnlocked','setJohanVeteranUnlocked','setCrosswindUnlocked','setCrosswindClearUnlocked','setCrosswindVeteranUnlocked','setCrystalUnlocked','setCrystalClearUnlocked','setCrystalVeteranUnlocked'])fakeTitle[method]=v=>{assert.equal(v,true,'sync never revokes an earned flag');earned.add(method);};
 const c=vm.createContext({account:{user:()=>({uid:user})},rawStorage:m,createCloudSync:options=>{options.onSynced();assert.equal(removals,0,'startup callback returns before later TDZ bindings');callback=options.onSynced;return {storage:m};},document:{querySelector:()=>({remove(){removals++;}})},readStoredAccountProfile,readDiscoveries,CLOUD_OWNER_KEY:'seed-cloud-owner-v1',discoveredCount:p=>p.forms.length,BADGES:{'earned-badge':{},'remote-badge':{}},fakeTitle});
 const refresh=source.slice(source.indexOf('function refreshSyncedBossPresentation(){'),source.indexOf('const bossPet='));
 const callbackSource=source.slice(source.indexOf('let bossPresentationReady=false;'),source.indexOf('let bossAccountBlocked=false;'));
 vm.runInContext(refresh+'\n'+callbackSource+'\nlet cloudSaveFailed=true;let bossAccountBlocked=false;let profile={forms:["retained-form"],bosses:["crystalveteran"],records:{}};let seedTitle=fakeTitle;bossPresentationReady=true;',c);
 m.setItem=()=>{writes++;throw Error('presentation must not persist discoveries');};callback();
 assert(earned.has('setAustinVeteranUnlocked'),'new confirmed projection unlocks ten-win title without reload');assert(earned.has('setUnlocked'));assert(earned.has('setCrosswindClearUnlocked'));assert(earned.has('setCrystalVeteranUnlocked'),'existing earned title survives a smaller snapshot');
 assert.equal(fakeTitle.discovered,1);assert.deepEqual(Array.from(fakeTitle.badges),['earned-badge','remote-badge']);assert.equal(fakeTitle.equipped,'austinveteran');assert.equal(writes,0);assert.equal(removals,1);
 assert.equal(vm.runInContext('cloudSaveFailed',c),false);assert.equal(vm.runInContext('bossAccountBlocked',c),false);assert(vm.runInContext('profile.bosses.includes("crosswindclear")&&profile.bosses.includes("crystalveteran")',c));
 const before=vm.runInContext('JSON.stringify(profile)',c);user='other-owner';assert.equal(c.refreshSyncedBossPresentation(),false);assert.equal(vm.runInContext('JSON.stringify(profile)',c),before,'foreign current owner cannot update the live profile');
 user=uid;data.set(bossVictoryAccountKey(uid),'{unknown');assert.equal(c.refreshSyncedBossPresentation(),false);assert.equal(vm.runInContext('bossAccountBlocked',c),true);assert.equal(vm.runInContext('JSON.stringify(profile)',c),before,'malformed cache leaves live earned flags intact');
}
console.log('Boss account recovery/presentation passed: preserved corrupt bytes, combat gating, no ranking inference, actual sync callback startup TDZ guard, confirmed ten-win/clear live refresh without writes/reload, earned flags preserved and owner isolation (VM).');
