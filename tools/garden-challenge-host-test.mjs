import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const begin=source.indexOf('let gardenChallengeScreen=null,gardenChallengeLoadSerial=0;'),end=source.indexOf('let defenseLoadSerial=0;',begin);
assert(begin>=0&&end>begin);
let resolveImport,rejectImport,entryCurrent=true,mounted=0,closed=0;
const screen={close:()=>closed++},els=new Map(),lookup=id=>{if(!els.has(id))els.set(id,{});return els.get(id);};
const context={console:{error:()=>{}},survivalEntry:{cancel:()=>{}},touch:{reset:()=>{}},keys:new Set(),mode:'ready',audio:{},rawStorage:{marker:'local-only'},performance:{now:()=>100},Date,
 stopAnimation:()=>{},startAnimation:()=>{},showSurvivalSetup:()=>{context.mode='ready';},$:lookup,
 showModeLoading:()=>({finish:()=>entryCurrent,current:()=>entryCurrent,dispose:()=>{}}),
 load:()=>new Promise((resolve,reject)=>{resolveImport=resolve;rejectImport=reject;})};
vm.createContext(context);
vm.runInContext(source.slice(begin,end).replace("import('./garden-challenge-view.js')",'load()')+'\nthis.openChallenge=showSeedGardenChallenge;this.child=()=>gardenChallengeScreen;',context);
const module={mountGardenChallenge:args=>{mounted++;assert.equal(args.storage,context.rawStorage);assert.deepEqual(Object.keys(args).sort(),['audio','onClose','storage']);screen.onClose=args.onClose;return screen;}};
let opening=context.openChallenge();assert.equal(context.mode,'garden-challenge');assert.equal(lookup('#overlay').hidden,true);resolveImport(module);await opening;assert.equal(mounted,1);assert.equal(context.child(),screen);
screen.onClose();assert.equal(context.child(),null);assert.equal(context.mode,'ready');
entryCurrent=false;opening=context.openChallenge();resolveImport(module);await opening;assert.equal(mounted,1,'cancelled async import never mounts');assert.equal(context.mode,'ready','owner cancellation leaves a usable parent menu');
entryCurrent=true;opening=context.openChallenge();rejectImport(new Error('offline'));await opening;assert.match(lookup('#toast').textContent,/불러오지/);assert.equal(context.mode,'ready');
const rafBegin=source.indexOf('function mainOwnsFrames(){'),rafEnd=source.indexOf('const coveredMenu=menuArtCovers();',rafBegin),queue=new Map();let serial=0;
const raf={document:{hidden:false},requestAnimationFrame:f=>{queue.set(++serial,f);return serial;},cancelAnimationFrame:id=>queue.delete(id)};
vm.createContext(raf);vm.runInContext(`let mode='garden-challenge',animationHandle=0;${source.slice(rafBegin,rafEnd)}}this.start=startAnimation;this.stale=animate;`,raf);raf.start();raf.stale(100);assert.equal(queue.size,0,'parent renderer stays dormant while child owns frames');
assert.equal((source.match(/mode==='expedition'\|\|mode==='garden-challenge'\)return;/g)||[]).length,3,'parent keyboard, visibility and pageshow leave challenge to its owner');
assert(source.includes("if(mode==='garden-challenge')gardenChallengeScreen?.close();"));
assert(source.includes("window.addEventListener('pageshow',()=>{if(mode==='adventure'||mode==='expedition'||mode==='garden-challenge')return;"),'parent cannot resume child audio from bfcache');
const leaveBegin=source.indexOf('function saveLeaveState(){');assert(source.slice(leaveBegin,leaveBegin+90).includes("if(mode==='garden-challenge')return false;"),'pagehide cannot persist old journey/survival while in short challenge');
assert(source.includes("$('#open-garden-challenge').onclick=()=>void showSeedGardenChallenge();"));
assert(source.includes("$('#overlay').hidden=true;\n  $('#overlay').innerHTML='';\n  gardenChallengeScreen=mountGardenChallenge"),'loading controls are removed even if a parent theme overrides hidden display');
console.log('Garden Challenge shipping entry: lazy mount/cancel/failure/return, raw device store isolation and parent RAF/input ownership PASS. VM proof, not real browser input.');
