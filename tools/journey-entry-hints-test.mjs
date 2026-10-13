import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {roomFor} from '../src/journey.js';
import {isAct2} from '../src/act2.js';
import {isAct3,ACT3_ROOM_HINTS} from '../src/act3.js';
import {MIRROR_BREAK} from '../src/mirror-trial.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=main.indexOf(' combatAnalysis.begin(elapsed,{stage:mirrorSession?'),end=main.indexOf('\n}\nfunction openExit(',start);
assert(start>0&&end>start);
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true});return nodes.get(id);};
const ctx=vm.createContext({$ ,roomFor,isAct2,isAct3,ACT3_ROOM_HINTS,MIRROR_BREAK,stage:0,cycle:0,region:'garden',mirrorSession:null,elapsed:0,REGION_NAMES:{garden:'정원',stadium:'야구장',skyway:'항로'},AUSTIN:{name:'오스틴'},ALWAYS_BEGINNER:{name:'항상초심'},TEMPEST_CARRIER:{name:'요한'},combatAnalysis:{begin(){}},document:{querySelectorAll:()=>[]},boss:false,inAustinRoom:()=>ctx.boss});
for(const region of ['garden','stadium'])for(let cycle=0;cycle<4;cycle++)for(let stage=0;stage<5;stage++){
 Object.assign(ctx,{region,cycle,stage});$('#toast').textContent='';vm.runInContext(main.slice(start,end),ctx);
 assert.equal($('#toast').textContent,roomFor(stage,cycle,region).hint);
}
Object.assign(ctx,{region:'stadium',stage:1});$('#toast').textContent='';vm.runInContext(main.slice(start,end),ctx);assert.match($('#toast').textContent,/흰 베이스.*다음 베이스.*무적 없음/);
Object.assign(ctx,{region:'stadium',stage:4});$('#toast').textContent='';vm.runInContext(main.slice(start,end),ctx);assert.match($('#toast').textContent,/도착하면.*다시 밟/);
Object.assign(ctx,{region:'skyway',stage:0});$('#toast').textContent='';vm.runInContext(main.slice(start,end),ctx);assert.equal($('#toast').textContent,ACT3_ROOM_HINTS[0]);
for(const region of ['garden','stadium','skyway']){
 Object.assign(ctx,{region,stage:1});const failure='보스 칭호 저장을 다시 시도하고 있어요';$('#toast').textContent=failure;
 vm.runInContext(main.slice(start,end),ctx);assert.equal($('#toast').textContent,failure,'storage/receipt warning outranks tactical hints');
}
for(const special of [{boss:true,mirrorSession:null},{boss:false,mirrorSession:{floor:1}}]){
 Object.assign(ctx,{region:'garden',stage:0,...special});$('#toast').textContent='';vm.runInContext(main.slice(start,end),ctx);assert.equal($('#toast').textContent,'');
}
// Run shipping new-run departure code: a present tactical hint wins over the
// inventory sentence; modes without a room hint keep their original fallback.
const departureStart=main.indexOf('  itemBarKey=\'\';\n  const departure=itemCounts(inventory);',main.indexOf('function restart('));
const departureEnd=main.indexOf('\n }}',departureStart);assert(departureStart>0&&departureEnd>departureStart);
Object.assign(ctx,{itemCounts:()=> '물약 2개',inventory:{tonic:2},mirrorSession:null});
$('#toast').textContent=roomFor(0,0,'garden').hint;vm.runInContext('{'+main.slice(departureStart,departureEnd)+'}',ctx);assert.equal($('#toast').textContent,roomFor(0,0,'garden').hint);
$('#toast').textContent='';vm.runInContext('{'+main.slice(departureStart,departureEnd)+'}',ctx);assert.match($('#toast').textContent,/물약 2개.*Q/);
console.log('Journey shipping entry UI: 40 authored Act1/2 hints, actual base guidance, Act3/boss/mirror isolation and departure priority PASS (CPU DOM adapter, not live input/layout)');

// Execute the shipping pause handler, rather than a copied hint helper.
const pauseStart=main.indexOf('function togglePause(){'),pauseEnd=main.indexOf('\nwindow.addEventListener',pauseStart);
assert(pauseStart>0&&pauseEnd>pauseStart);
let pauses=0,resumes=0,focuses=0;
$('#pause').focus=options=>{assert.equal(options.preventScroll,true);focuses++;};
Object.assign(ctx,{journeyCompletionPending:false,saveExitBusy:false,mode:'playing',paused:false,roomCleared:false,exitOpen:false,survivalSession:null,expansionJourney:null,mirrorSession:null,boss:false,
 touch:{reset(){}},keys:new Set(),keyboardDash:false,player:{visible:false},audio:{setPaused(){}},webTelemetry:{playPause(){pauses++;}},saveExitLabel:()=> '저장하고 돌아가기',pauseBuild:{show(){},hide(){resumes++;}},levels:new Map(),heldForms:new Map(),SURVIVAL:{killChargeScale:.18}});
vm.runInContext(main.slice(pauseStart,pauseEnd),ctx);
for(const region of ['garden','stadium'])for(let cycle=0;cycle<4;cycle++)for(let stage=0;stage<5;stage++){
 Object.assign(ctx,{region,cycle,stage,paused:true});$('#toast').textContent='';ctx.togglePause();
 assert.equal(ctx.paused,false);assert.equal($('#toast').textContent,roomFor(stage,cycle,region).hint,'resume restores current room, including changed routes');
}
for(const warning of ['보스 칭호 저장을 다시 시도하고 있어요','계정이 바뀌어 보스 기록을 보관 중이에요','방을 정리했다 · 빛나는 출구로 이동하세요']){
 Object.assign(ctx,{region:'garden',stage:1,paused:false});$('#toast').textContent=warning;
 ctx.togglePause();assert.equal(ctx.paused,true);assert.equal($('#toast').textContent,warning,'pause preserves visible warning/status');
 ctx.togglePause();assert.equal(ctx.paused,false);assert.equal($('#toast').textContent,warning,'resume never overwrites warning/status');
}
const defaults={region:'garden',stage:0,cycle:0,roomCleared:false,exitOpen:false,mirrorSession:null,survivalSession:null,expansionJourney:null,boss:false};
for(const excluded of [{region:'skyway'},{region:'crosswind'},{region:'crystalGorge'},{boss:true},{mirrorSession:{floor:1}},{survivalSession:{time:0}},{expansionJourney:{act:'crosswind'}},{roomCleared:true},{exitOpen:true}]){
 Object.assign(ctx,defaults,excluded,{paused:true});$('#toast').textContent='';ctx.togglePause();
 assert.equal($('#toast').textContent,'','special modes and cleared rooms must retain their own objective lifecycle');
}
Object.assign(ctx,defaults,{paused:false});$('#toast').textContent='';ctx.togglePause();assert.equal($('#toast').textContent,'','entering pause does not create a battle hint behind the menu');ctx.togglePause();assert.equal($('#toast').textContent,roomFor(0,0,'garden').hint);
assert.equal(pauses,4);assert.equal(resumes,focuses);
console.log('Journey shipping pause UI: 40 current-room resumes, visible warning/status priority, special-mode/cleared-room isolation PASS (CPU DOM adapter, not live input)');
