import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as rules from '../src/arbor-journey.js';
import * as boss from '../src/arbor-boss.js';
import * as save from '../src/arbor-run-save.js';
import {createArborAccountRecords,arborAccountEligible,arborAccountKey,validArborEnded} from '../src/arbor-account-records.js';
import {createArborAccountSync} from '../src/arbor-account-sync.js';
import {createArborVictoryRecords} from '../src/arbor-victory-records.js';
import {acquireExpansionSaveLease} from '../src/expansion-save-lease.js';

// Actual shipped host function bodies, real codecs/record/sync/lease adapters.
// Rendering/restart/audio/DOM are bounded stubs; this is not a browser playtest.
const source=fs.readFileSync('src/main.js','utf8').replaceAll('\r\n','\n'),noop=()=>{},clone=v=>JSON.parse(JSON.stringify(v));
function actual(name){const token=source.includes(`async function ${name}(`)?`async function ${name}(`:`function ${name}(`,start=source.indexOf(token);assert(start>=0,name);let end=source.indexOf('\n',start);for(let tries=0;tries<20;tries++){const text=source.slice(start,end);try{new vm.Script(text);return text;}catch{}const next=source.indexOf('\n}',end);assert(next>end,name+' closing body');end=next+2;}throw Error('Unclosed actual host '+name);}
function node(){return {textContent:'',innerHTML:'',hidden:false,disabled:false,onclick:null,style:{},classList:{add:noop,remove:noop,toggle:noop},focus:noop};}
function manager(){const held=new Set();return {request:async(key,_,fn)=>{if(held.has(key))return fn(null);held.add(key);try{return await fn({name:key});}finally{held.delete(key);}}};}
function transport(){
 const data=new Map(),tags=new Map(),history=[];const t={data,tags,history,holdPut:null};
 t.fetch=async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.origin,'https://example.invalid');assert.equal(parsed.searchParams.get('auth'),'token');assert.equal(options.cache,'no-store');const path=parsed.pathname.slice(1,-5);
  if(options.method==='PUT'){
   if(t.holdPut){const wait=t.holdPut;t.holdPut=null;await wait(path,JSON.parse(options.body));}
   if(options.headers['if-match']!==String(tags.get(path)||0))return {ok:false,status:412};const value=JSON.parse(options.body);data.set(path,value);tags.set(path,(tags.get(path)||0)+1);history.push({path,value:clone(value)});return {ok:true,status:200};
  }
  let value=data.get(path)||null;if(path==='seedArborVictories/a'){value={};for(const [key,v] of data)if(key.startsWith(path+'/'))value[key.slice(path.length+1)]=v;if(!Object.keys(value).length)value=null;}
  const snapshot=clone(value),etag=String(tags.get(path)||0);return {ok:true,status:200,json:async()=>snapshot,headers:{get:key=>key==='ETag'?etag:null}};
 };
 return t;
}
const initialRun={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,kills:0,elapsed:0,rules:[],mutated:[],forms:{},inventory:{potion:3,tonic:2,wind:1,shell:0,sprout:0},score:0,choicesTaken:0,choiceKills:0,wardens:0,austins:0};
function fixture(net=transport()){
 const data=new Map([['profile-sentinel','untouched'],['ranking-sentinel','untouched'],['legacy-boss-v2-sentinel','untouched']]),dom=new Map(),locks=manager(),title={first:false,clear:false,veteran:false};let failKey=null,uid='a';
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(failKey===k)throw Error('storage refused');data.set(k,v);},removeItem:k=>data.delete(k)};
 const $=id=>{if(!dom.has(id))dom.set(id,node());return dom.get(id);};
 const view={hide:noop,setActive:noop,clearBossArt:noop};
 const c=vm.createContext({console,Math,Date,URLSearchParams,Set,Map,Object,Promise,setTimeout,clearTimeout,location:{search:''},document:{querySelectorAll:()=>[]},$,__errors:[],__rules:rules,__boss:boss,__save:save,__view:{createArborJourneyView:()=>view},
  account:{user:()=>({uid,isAnonymous:false}),tokenSession:async()=>({uid,idToken:'token'}),native:false},rawStorage:storage,runStorage:storage,FIREBASE_APP:{databaseURL:'https://example.invalid'},
  arborJourney:null,arborApi:null,arborBossApi:null,arborSaveApi:null,arborView:null,arborEntry:null,arborStore:null,arborLease:null,arborBoss:null,arborLaunch:0,arborRecords:null,arborSync:null,arborBeginPending:null,arborEndPending:null,arborEndingFlight:null,
  arborCueText:'',arborCueTime:0,localInspection:false,developerRun:false,maintenanceOn:false,mobileDevice:false,qualityLevel:1,mode:'ready',paused:false,saveOK:false,
  bossRecordReady:()=>true,gameplayPaused:()=>false,protectJourneyBossReceipts:()=>true,bossPresentationReady:true,seedTitle:{setArborUnlocked:v=>title.first=v,setArborClearUnlocked:v=>title.clear=v,setArborVeteranUnlocked:v=>title.veteran=v},
  createArborAccountRecords,arborAccountEligible,validArborEnded,
  acquireExpansionSaveLease:(act,owner)=>acquireExpansionSaveLease(act,owner,{locks}),
  createArborAccountSync:options=>createArborAccountSync({...options,fetchImpl:net.fetch,acquireLease:(act,owner)=>acquireExpansionSaveLease(act,owner,{locks})}),
  createArborVictoryRecords:options=>createArborVictoryRecords({...options,fetchImpl:net.fetch}),
  scene:{},camera:{},player:{position:{x:0,z:5},visible:true,userData:{}},gate:{position:{set:noop},visible:false},arena:rules.ARBOR_ARENA,
  mirrorSession:null,survivalSession:null,trainingSession:null,expansionJourney:null,expansionChannel:'inspection',expansionPublicEntry:null,expansionPendingBossCheckpoint:null,journeyCompletionPending:false,
  hp:100,region:'garden',inventory:clone(initialRun.inventory),kills:0,elapsed:0,score:0,cycle:0,stage:0,wardensDefeated:0,austinsDefeated:0,choicesTaken:0,choiceKills:0,runDashes:0,runDamageTaken:0,turretPotionDry:0,bankedUpgrades:0,
  levels:new Map(),heldForms:new Map(),chosen:new Set(),mutated:new Set(),mutations:new Map(),guideTarget:null,runBonuses:{},relics:{equipped:null},dashState:{id:null},activeGauge:{value:0,cooldown:0},
  runStorage:storage,keys:new Set(),touch:{reset:noop},pauseBuild:{show:noop,hide:noop,setSaveStatus:s=>{c.status=s;}},audio:{setScene:noop,setPaused:noop,play:noop},combatAnalysis:{begin:noop},
  levelPressure:()=>1,labSafe:false,invuln:0,shellTime:0,playerSlow:0,shootCD:0,dashLock:0,keyboardDash:false,cameraShake:0,enemyShots:[],shots:[],enemies:[],dashRewardPending:false,crowdLeft:0,roomCleared:false,exitOpen:false,
  clearForms:noop,release:noop,cancelActive:noop,activeVfx:{clear:noop},perfFinish:noop,webTelemetry:{playPause:noop},burst:noop,vfx:{pulse:noop,burst:noop},finishRoomAnalysis:()=>null,tryRevive:()=>null,difficulty:()=>({damage:1}),
  mutationsToSave:()=>({}),levelsToSave:m=>Object.fromEntries(m),normalizeRelics:v=>v,ITEMS:{sprout:{name:'다시싹'}},
  offerDashEvolution:()=>false,setText:(n,v)=>{if(n)n.textContent=v;},formatScore:n=>String(n),formatTime:n=>String(n),playerName:'normal',lastName:()=>'',ACT:{ARBOR:6},
  accountRole:()=>({isAdmin:false,isTester:false}),adminMode:false,betaTesterMode:false,rankingDecision:()=>({eligible:false}),paceTrusted:()=>true,paceGame:0,paceReal:0,buildRecord:()=>[],rankSerial:0,
  online:{flush:async()=>{},submit:async()=>{}},showRanking:noop,showJourneys:noop,showIntro:()=>{c.mode='ready';},saveExitBusy:false,exitWithoutSaveArmed:false,saveExitLabel:()=>'',leavePausedRun:()=>{c.left=true;c.mode='ready';},
  withDepartureSupplies:(_s,callback)=>{c.departures++;return {ok:callback({})===true};},addItem:(items,id,n)=>{items[id]=(items[id]||0)+n;},departures:0,
 });
 c.arborOwner=()=>`${c.localInspection?'inspection:':''}${uid}`;
 c.restart=saved=>{Object.assign(c,{mode:'playing',hp:saved?.hp??100,elapsed:saved?.elapsed??0,kills:saved?.kills??0,score:saved?.score??0,inventory:clone(saved?.inventory||initialRun.inventory),paused:false,roomCleared:false,exitOpen:false});return true;};
 c.expansionRunSnapshot=()=>({...clone(initialRun),hp:c.hp,kills:c.kills,elapsed:c.elapsed,score:c.score,inventory:clone(c.inventory),rules:[...c.levels.keys()],levels:Object.fromEntries(c.levels),forms:Object.fromEntries(c.heldForms),wardens:c.arborJourney.wardens,austins:c.arborJourney.bossWins});
 for(const name of ['refreshArborTitles','arborCue','captureArborPublic','finishArborRun','canSaveArbor','arborSnapshot','captureArborBoundary','saveArborLeave','arborEncounterText','waveArborJourney','openArborExit','showArborResult','togglePause','hitPlayer','showArborSaveConflict'])vm.runInContext(actual(name),c,{filename:'actual-main-'+name});
 const facts=source.split('\n').find(line=>line.startsWith('const arborAccountFacts='));assert(facts);vm.runInContext(facts.replace('const arborAccountFacts=','globalThis.arborAccountFacts='),c);
 const victories=source.split('\n').find(line=>line.startsWith('const arborVictories='));assert(victories);vm.runInContext(victories.replace('const arborVictories=','globalThis.arborVictories='),c);
 c.__records={createArborAccountRecords};c.__network={createArborAccountSync:c.createArborAccountSync};
 const launcher=actual('startArborJourney').replace("import('./arbor-journey.js')",'Promise.resolve(__rules)').replace("import('./arbor-boss.js')",'Promise.resolve(__boss)').replace("import('./arbor-run-save.js')",'Promise.resolve(__save)').replace("import('./arbor-journey-view.js')",'Promise.resolve(__view)').replace("import('./arbor-account-records.js')",'Promise.resolve(__records)').replace("import('./arbor-account-sync.js')",'Promise.resolve(__network)').replace('}catch(error){','}catch(error){__errors.push(error);');vm.runInContext(launcher,c);
 c.wave=()=>c.waveArborJourney();
 const introStart=source.indexOf('function showIntro(){'),introEnd=source.indexOf('survivalEntry.cancel();',introStart);assert(introEnd>introStart);vm.runInContext(source.slice(introStart,introEnd).replace('function showIntro(){','function __introArborCleanup(){')+'}',c);
 const handlerStart=source.indexOf("$('#save-exit').onclick=async()=>{");assert(handlerStart>=0);const handlerEnd=source.indexOf('\n};',handlerStart);vm.runInContext(source.slice(handlerStart,handlerEnd+3),c);
 return {c,storage,data,net,title,$,fail:k=>{failKey=k;},owner:v=>{uid=v;},async settle(){await c.arborSync?.flush();await c.arborVictories.sync();},async cleanup(){await c.arborEndingFlight;if(c.arborLease)await c.arborLease.release();},untouched(){for(const key of ['profile-sentinel','ranking-sentinel','legacy-boss-v2-sentinel'])assert.equal(data.get(key),'untouched');}};
}
const tests=[];const test=(name,body)=>tests.push({name,body});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function firstBoss(world){for(let i=0;i<25000&&world.bossWins<1;i++){rules.stepArborJourney(world,.1,{player:{x:0,z:5},alive:world.pending.length});for(const a of [...world.pending])assert(rules.creditArborKill(world,a.id,a.role));if(world.phase==='cleared'&&world.bossWins<1)assert(rules.advanceArborJourney(world));}assert.equal(world.bossWins,1);}

test('actual host normal start creates public marker and a second normal run follows its real terminal',async()=>{
 const f=fixture();assert.equal(await f.c.startArborJourney(),true,f.c.__errors.map(e=>e.stack).join('\n'));assert.equal(f.c.arborRecords.read().entry.id,f.c.arborEntry.id);const previous=f.c.arborEntry.id;await f.settle();
 assert(f.c.finishArborRun());f.c.showArborResult(false);await f.c.arborEndingFlight;assert.equal(await f.c.startArborJourney(),true,f.c.__errors.map(e=>e.stack).join('\n'));const record=f.c.arborRecords.read();assert.notEqual(record.entry.id,previous);assert.equal(record.previousRun.id,previous);f.untouched();await f.cleanup();
});
test('actual host first marker write failure remains paused at revision1 and recovers without duplicate departure',async()=>{
 const f=fixture();f.fail(arborAccountKey('a'));assert.equal(await f.c.startArborJourney(),true);assert.equal(f.c.paused,true);assert.equal(f.c.arborEntry.revision,1);assert.equal(f.c.arborRecords.read(),null);assert.equal(f.c.departures,1);assert.equal(f.c.captureArborBoundary(),false);assert.equal(f.c.arborEntry.revision,1);
 f.fail(null);assert(f.c.captureArborBoundary());assert.equal(f.c.arborRecords.read().entry.id,f.c.arborEntry.id);assert.equal(f.c.departures,1);f.untouched();await f.cleanup();
});
test('actual save-exit retries pending public begin before incrementing revision or leaving',async()=>{
 const f=fixture();f.fail(arborAccountKey('a'));assert(await f.c.startArborJourney());const first=f.data.get(save.arborSaveKey('a'));await f.$('#save-exit').onclick();assert.equal(f.c.left,undefined);assert.equal(f.data.get(save.arborSaveKey('a')),first);assert.equal(f.c.arborEntry.revision,1);assert.equal(f.c.paused,true);
 f.fail(null);await f.$('#save-exit').onclick();assert.equal(f.c.left,true);assert.equal(f.c.arborRecords.read().entry.id,f.c.arborEntry.id);assert.equal(f.c.departures,1);f.untouched();await f.cleanup();
});
test('actual host fresh device pulls account checkpoint before restart and preserves actual build/potions',async()=>{
 const net=transport(),pc=fixture(net);assert(await pc.c.startArborJourney());pc.c.hp=48;pc.c.inventory.tonic=1;assert(pc.c.saveArborLeave());await pc.settle();await pc.cleanup();
 const phone=fixture(net);assert.equal(await phone.c.startArborJourney(),true,phone.c.__errors.map(e=>e.stack).join('\n'));assert.equal(phone.c.hp,48);assert.equal(phone.c.inventory.tonic,1);assert.equal(phone.c.arborEntry.id,pc.c.arborEntry.id);assert.equal(phone.c.departures,0);phone.untouched();await phone.cleanup();
});
test('actual host inspection and already-published local saves never gain public provenance or wins',async()=>{
 const lab=fixture();lab.c.localInspection=true;assert(await lab.c.startArborJourney());assert.equal(lab.c.arborRecords,null);assert.equal(lab.net.history.length,0);assert.equal(lab.c.arborVictories.read().wins,0);await lab.cleanup();
 const old=fixture(),lease=await old.c.acquireExpansionSaveLease('arbor','a'),store=save.createArborSaveStore(old.storage,'a',{currentOwner:()=> 'a',lease});assert(store.write(save.createArborEntry(rules.createArborJourney(),initialRun,'a',{id:'old-untagged'}),{fresh:true}).ok);await lease.release();
 assert(await old.c.startArborJourney());assert.equal(old.c.arborRecords.read(),null);old.c.hp=50;assert(old.c.saveArborLeave());await old.settle();assert.equal(old.c.arborRecords.read(),null);assert.equal(old.c.arborVictories.read().wins,0);assert.equal(old.net.history.length,0);old.untouched();await old.cleanup();
});
test('actual host durable boss boundary rebuilds 1→N receipts and title refresh; legacy stays excluded',async()=>{
 const f=fixture();assert(await f.c.startArborJourney());firstBoss(f.c.arborJourney);f.c.kills=f.c.arborJourney.kills;f.c.elapsed=f.c.arborJourney.time;f.c.score=f.c.kills*25;assert(f.c.captureArborBoundary());assert.equal(f.c.arborVictories.read().wins,1);assert.equal(f.title.first,true);await f.settle();assert.equal(f.net.data.get('seedArborVictories/a/'+f.c.arborEntry.id).ordinal,1);f.untouched();await f.cleanup();
});
test('actual death raw-write failure cannot resume, heal by save-exit or replace the current entry',async()=>{
 const f=fixture();assert(await f.c.startArborJourney());await f.settle();f.fail(save.arborSaveKey('a'));f.c.hitPlayer(1000,'host-test');assert.equal(f.c.hp,0);assert.equal(f.c.paused,true);assert(f.c.arborEndPending);const bytes=f.data.get(save.arborSaveKey('a'));assert.equal(f.c.saveArborLeave(),false);f.c.togglePause();assert.equal(f.c.paused,true);assert.equal(f.data.get(save.arborSaveKey('a')),bytes);
 f.fail(null);await f.$('#save-exit').onclick();assert.equal(f.c.mode,'ready');assert.equal(f.c.arborStore.read(),null);f.untouched();await f.cleanup();
});
test('actual death partial terminal (raw ended / public live) retries terminal only, retaining UI until success',async()=>{
 const f=fixture();assert(await f.c.startArborJourney());await f.settle();f.fail(arborAccountKey('a'));f.c.hitPlayer(1000,'host-test');assert.equal(f.c.paused,true);assert(f.c.arborEndPending);const raw=JSON.parse(f.data.get(save.arborSaveKey('a')));assert.equal(raw.kind,'arbor-ended');assert.equal(f.c.arborRecords.read().entry.kind,'arbor-room-entry');assert.equal(f.c.saveArborLeave(),false);
 f.fail(null);await f.$('#save-exit').onclick();assert.equal(f.c.mode,'ready');assert.equal(f.c.arborRecords.read().entry.kind,'arbor-ended');f.untouched();await f.cleanup();
});
test('actual result holds lease through terminal flush and retry awaits that flight before new start',async()=>{
 const f=fixture();assert(await f.c.startArborJourney());await f.settle();let releasePut,entered;const inPut=new Promise(r=>{entered=r;});f.net.holdPut=async(path)=>{if(path.startsWith('seedArborSaves/')){entered();await new Promise(r=>{releasePut=r;});}};
 assert(f.c.finishArborRun());await inPut;const lease=f.c.arborLease;f.c.showArborResult(false);assert(lease.active());let completed=false;const retry=f.c.startArborJourney().then(v=>{completed=true;return v;});await turn();assert.equal(completed,false);releasePut();assert.equal(await retry,true,f.c.__errors.map(e=>e.stack).join('\n'));assert(f.net.history.some(v=>v.path==='seedArborSaves/a'&&JSON.parse(v.value.checkpoint).entry.kind==='arbor-ended'));f.untouched();await f.cleanup();
});
test('actual result back-to-menu cleanup leaves retiring lease to the terminal flush owner',async()=>{
 const f=fixture();assert(await f.c.startArborJourney());await f.settle();let releasePut,entered;const inPut=new Promise(r=>{entered=r;});f.net.holdPut=async path=>{if(path.startsWith('seedArborSaves/')){entered();await new Promise(r=>{releasePut=r;});}};
 assert(f.c.finishArborRun());await inPut;const lease=f.c.arborLease;f.c.showArborResult(false);f.c.__introArborCleanup();assert(lease.active(),'returning to menu must not release a lease borrowed by terminal PUT');releasePut();await f.c.arborEndingFlight;assert.equal(lease.active(),false);assert(f.net.history.some(v=>v.path==='seedArborSaves/a'&&JSON.parse(v.value.checkpoint).entry.kind==='arbor-ended'));f.untouched();await f.cleanup();
});

for(const {name,body} of tests){await body();console.log('PASS '+name);}console.log(`Arbor account actual host: ${tests.length} checks passed (real extracted host / codecs / mock transport; not browser/device evidence).`);
