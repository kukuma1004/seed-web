import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {showModeEntryLoading} from '../src/mode-entry-ui.js';

function fixture(){
 let timer,backs=0,reloads=0,current=true;
 const elements=new Map(['status','reload','back'].map(key=>[key,{hidden:key==='reload',textContent:''}]));
 const overlay={hidden:true,innerHTML:'',querySelector:s=>elements.get(s.match(/entry-(\w+)/)[1]),contains:e=>[...elements.values()].includes(e)};
 const options={overlay,title:'검토',isCurrent:()=>current,onBack:()=>backs++,onReload:()=>reloads++,setTimer:f=>(timer=f,1),clearTimer:()=>{timer=null;}};
 return {overlay,elements,options,get timer(){return timer;},get backs(){return backs;},get reloads(){return reloads;},invalidate(){current=false;}};
}
{
 const f=fixture(),entry=showModeEntryLoading(f.options);assert.equal(f.overlay.hidden,false);assert.match(f.overlay.innerHTML,/role="status"/);
 f.timer();assert.equal(f.elements.get('reload').hidden,false);f.elements.get('reload').onclick();assert.equal(f.reloads,1);
 f.elements.get('back').onclick();assert.equal(f.backs,1);assert.equal(entry.finish(),false);assert.equal(f.overlay.hidden,false);assert.equal(f.timer,null);
}
{
 const f=fixture(),entry=showModeEntryLoading(f.options);assert.equal(entry.finish(),true);entry.dispose();assert.equal(entry.current(),true,'successful account controller must remain enabled');assert.equal(f.overlay.hidden,true);assert.equal(f.timer,null);
}
{
 const f=fixture(),entry=showModeEntryLoading(f.options);f.invalidate();assert.equal(entry.finish(),false);f.elements.get('back').onclick();assert.equal(f.backs,1,'account change must not trap the visible back button');
}
// Run the actual launchers with deferred imports: cancellation cannot mount a late screen.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
for(const name of ['showSeedExpedition','showSeedAdventure','showSeedDuel','showSeedPuzzle']){
 const start=source.indexOf(`async function ${name}(`),end=source.indexOf('\n}',start)+2;
 const body=source.slice(start,end).replaceAll('await import(','await load(');
 const f=fixture();let resolve,mounts=0,backs=0;
 const ctx=vm.createContext({mode:'ready',expeditionLoadSerial:0,expeditionScreen:null,adventureScreen:null,duelScreen:null,puzzleScreen:null,localInspection:true,developerRun:false,EXPEDITION_ACCOUNT_RELEASED:true,bossRecordReady:()=>true,account:{user:()=>null},touch:{reset(){}},keys:new Set(),stopAnimation(){},$:id=>id==='#overlay'?f.overlay:{textContent:''},showModeLoading:(title,onBack)=>showModeEntryLoading({...f.options,title,onBack:()=>{onBack();}}),showDungeon(){ctx.mode='ready';backs++;},performance:{now:()=>0},Date,startAnimation(){},last:0,realLast:0,console,load:()=>new Promise(done=>{resolve=done;})});
 vm.runInContext(body,ctx);const pending=vm.runInContext(`${name}()`,ctx);
 f.elements.get('back').onclick();
 const mounted=()=>{mounts++;return {};};resolve({mountExpedition:mounted,mountSeedAdventure:mounted,mountSeedDuel:mounted,mountSeedPuzzle:mounted});await pending;
 assert.equal(mounts,0,`${name}: cancelled late import cannot mount`);assert.equal(backs,1,`${name}: return once`);assert.equal(ctx.mode,'ready');
}
// The actual pause exit handler must let inspection-only survival leave without
// writing a public checkpoint, while the dedicated siege review keeps its save.
{
 const start=source.indexOf("$('#save-exit').onclick=async()=>{"),end=source.indexOf('\n};',start)+3;
 let exit,leaves=0,setups=0,saves=0,ends=0;
 const ctx=vm.createContext({$:()=>({set onclick(fn){exit=fn;}}),saveExitBusy:false,expansionJourney:null,survivalSession:{lab:null},localInspection:true,leavePausedRun:()=>leaves++,showSurvivalSetup:()=>setups++,saveSurvival:()=>{saves++;return false;},finishSurvival:()=>ends++,pauseBuild:{setSaveStatus(){}},developerRun:false,mirrorSession:null});
 vm.runInContext(source.slice(start,end),ctx);await exit();
 assert.deepEqual([leaves,setups,saves,ends],[1,1,0,0],'inspection exits without public save or result credit');
 ctx.survivalSaveMessage='';ctx.survivalSession={siegeReview:true};await exit();assert.equal(saves,1,'dedicated siege review still checks its own checkpoint');assert.equal(leaves,1,'failed siege checkpoint stays active');
 ctx.survivalSession={lab:null};ctx.localInspection=false;await exit();assert.equal(saves,2,'normal run still checks storage');assert.equal(leaves,1,'normal save failure protects the active run');
 const saveStart=source.indexOf('function saveSurvival(){'),saveEnd=source.indexOf('\n}',saveStart)+2;
 ctx.localInspection=true;ctx.survivalSaveMessage='';vm.runInContext(source.slice(saveStart,saveEnd),ctx);assert.equal(ctx.saveSurvival(),false);assert.match(ctx.survivalSaveMessage,/개발용 플레이/);
}
console.log('PASS loading, retry, owner-change exit, controller lifetime, 4 late-import cancellations and inspection/public pause exit boundaries. DOM/import fixtures, not device QA.');
