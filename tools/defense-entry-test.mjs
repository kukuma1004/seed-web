import assert from 'node:assert/strict';
import {closedExpansionActs,openExpansionActs} from './expansion-gate-fixtures.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {EXPANSION_ACTS,publicCircuitActCount} from '../src/act-expansion.js';
import {freshExpansionObjective} from '../src/expansion-objective.js';
import {titleState} from '../src/titles.js';
const main=fs.readFileSync('src/main.js','utf8');
const fn=main.slice(main.indexOf('async function showSeedDefense('),main.indexOf('\nfunction showDungeon(){')).replace("import('./seed-defense-view.js')",'load()').replace("import('./defense-account-entry.js')",'loadAccount()');
function harness(){const els=new Map();const el=k=>{if(!els.has(k))els.set(k,{hidden:false,textContent:'',replaceChildren(){},classList:{remove(){}}});return els.get(k)};let resolve,reject;let mounts=0,backs=0,reloads=0,options;let timeout;
 const ctx={freshExpansionObjective,bossRecordReady:()=>true,defenseLoadSerial:0,mode:'ready',touch:{reset(){}},keys:new Set(),stopAnimation(){},$:el,setTimeout:f=>(timeout=f,1),clearTimeout(){timeout=null},load:()=>new Promise((a,b)=>{resolve=a;reject=b}),location:{reload(){reloads++}},performance:{now:()=>1},Date,startAnimation(){},showDungeon(){backs++},console:{error(){}},document:{querySelector:()=>null,body:{classList:{remove(){}}}},account:{user:()=>null},localInspection:false,developerRun:false,rawStorage:{},audio:{},defenseScreen:null};
 ctx.currentBossEpoch=()=>null;ctx.publicCircuitActCount=()=>publicCircuitActCount(closedExpansionActs);ctx.seedTitle={state:()=>titleState()};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 return {ctx,el,start:o=>ctx.showSeedDefense(o),success:()=>resolve({mountSeedDefense:o=>{mounts++;options=o;return {}}}),fail:()=>reject(Error('missing old chunk')),slow:()=>timeout(),get mounts(){return mounts},get backs(){return backs},get reloads(){return reloads},get options(){return options}};
}
let h=harness(),p=h.start();assert.equal(h.el('#overlay').hidden,false);assert.match(h.el('#overlay').innerHTML,/정원을 준비/);h.slow();assert.equal(h.el('#defense-load-reload').hidden,false);h.success();await p;assert.equal(h.mounts,1);assert.equal(h.el('#overlay').hidden,true);
h=harness();p=h.start();h.el('#defense-load-back').onclick();h.success();await p;assert.equal(h.mounts,0);assert.equal(h.backs,1);
h=harness();p=h.start();h.fail();await p;assert.equal(h.el('#overlay').hidden,false);assert.match(h.el('#defense-load-status').textContent,/저장 기록은 지우지/);h.el('#defense-load-reload').onclick();assert.equal(h.reloads,1);
console.log('Defense entry: loading, delay, success, cancel race, rejected import and reload passed.');
h=harness();p=h.start({actCount:5});h.success();await p;assert.equal(h.options.actCount,3,'ordinary entry cannot opt into unreleased worlds');
h=harness();h.ctx.localInspection=true;p=h.start({actCount:5});h.success();await p;assert.equal(h.options.actCount,5);assert.equal(h.options.onBossDefeated({boss:'crystalGardener'}),true,'local boss events settle without calling account titles');
h=harness();const released=openExpansionActs;h.ctx.publicCircuitActCount=()=>publicCircuitActCount(released);p=h.start();h.success();await p;assert.equal(h.options.actCount,5,'ordinary mode follows the shared completed release unit');assert.equal(h.options.currentOwner(),'guest');assert.equal(h.options.practice(),false);assert.deepEqual(h.options.titleStats(),titleState());
h.ctx.developerRun=true;assert.equal(h.options.practice(),true,'live practice state cannot inherit account bonuses or saves');

// Execute the authenticated route through the actual main controller. The
// preflight must finish before mounting, and an async exit cannot steal ranking.
h=harness();let entryResolve,closed=0,rankViews=0,releasedAccount=0;
h.ctx.account={user:()=>({uid:'owner-A',isAnonymous:false})};h.ctx.FIREBASE_APP={databaseURL:'https://example.invalid'};
h.ctx.loadAccount=async()=>({prepareDefenseAccount:()=>new Promise(resolve=>{entryResolve=resolve;})});
h.ctx.showDefenseRanking=()=>rankViews++;h.ctx.$('#toast');
p=h.start();h.success();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.mounts,0);
const preparation={read:()=>null};const accountEntry={preparation,activate(){},async close(){closed++;return {kind:'synced'};},async release(){releasedAccount++;}};
entryResolve(accountEntry);await p;assert.equal(h.mounts,1);assert.equal(h.options.preparation,preparation);assert.equal(h.options.objective,freshExpansionObjective('crystalGorge'));
h.ctx.defenseScreen={close:()=>h.options.onClose()};h.options.onRanking();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(closed,1);assert.equal(rankViews,1);assert.equal(h.backs,0,'flushing must preserve requested ranking destination');
h=harness();h.ctx.account={user:()=>({uid:'owner-A',isAnonymous:false})};h.ctx.FIREBASE_APP={databaseURL:'https://example.invalid'};
h.ctx.loadAccount=async()=>({prepareDefenseAccount:()=>new Promise(resolve=>{entryResolve=resolve;})});
p=h.start();h.success();await new Promise(resolve=>setTimeout(resolve,0));h.el('#defense-load-back').onclick();entryResolve(accountEntry);await p;assert.equal(h.mounts,0);assert.equal(releasedAccount,1,'cancelled entry releases its local slot');
console.log('Defense authenticated host: preflight before mount, exact preparation seam, cancelled acquire cleanup and async save/exit ranking destination passed (source VM).');
