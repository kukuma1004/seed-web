import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {journeyRouteCue} from '../src/journey-purpose.js';
import {createJourneyPresentation,journeyPresentationContext} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {createGameAudio,MUSIC_SCENES} from '../src/audio.js';
import {createExpansionJourney,advanceExpansionJourney} from '../src/expansion-journey.js';

const main=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const hostSource=main.slice(main.indexOf('function presentJourneyTransition(){'),main.indexOf('\nfunction ring(',main.indexOf('function presentJourneyTransition(){')));
assert(hostSource.startsWith('function presentJourneyTransition(){')&&hostSource.trimEnd().endsWith('}'));
assert(main.includes('presentFrame(now*.001);presentJourneyTransition();journeyPresentationView.update('),'shipping RAF owns the transition observer');

for(const region of ['garden','stadium','skyway'])for(let stage=0;stage<5;stage++){
 const input={region,stage,cycle:1,bossName:'실제 보스',bossAhead:stage===4,bossWins:1},before=JSON.stringify(input),out=journeyRouteCue(input);
 assert(out.title&&out.detail);assert.equal(out.automatic,region==='skyway');assert.equal(JSON.stringify(input),before);
 if(stage<4)assert(out.detail.includes(String(stage+2)));
 else assert.equal(out.title,'실제 보스에게');
}
assert.equal(journeyRouteCue({region:'garden',stage:4,cycle:1,bossWins:2}).detail,'여정 3 · 2/3 결전 승리');
for(const input of [{region:'survival',stage:0},{region:'garden',stage:-1},{region:'garden',stage:5},{region:'garden',stage:NaN}])assert.equal(journeyRouteCue(input),null);
for(const act of ['crosswind','crystalGorge']){
 for(let room=0;room<5;room++){
  const expansion=createExpansionJourney(act,room,413),before=JSON.stringify(expansion),cue=journeyRouteCue({expansion});
  assert(cue.title&&cue.detail);assert(!cue.automatic);assert.equal(JSON.stringify(expansion),before);
  if(room===4)assert(cue.title.includes(act==='crosswind'?'횡풍의 수호자':'수정의 정원사'));
 }
 const expansion=createExpansionJourney(act,4,413);advanceExpansionJourney(expansion);
 const key=act==='crosswind'?'crosswindKeeper':'crystalGardener';
 for(let wins=1;wins<=3;wins++){
  const campaign={bossWins:{[key]:wins}},before=JSON.stringify(campaign),cue=journeyRouteCue({expansion,campaign,publicExpansion:true});
  assert.equal(cue.title,wins===3?'완주 정산으로':'다음 순환으로');assert(cue.detail.includes(wins+'/3'));
  assert(!cue.detail.includes('저장 완료'));assert.equal(JSON.stringify(campaign),before);
 }
 assert.equal(journeyRouteCue({expansion}).detail,'로컬 검토 · 계정 기록과 보상 제외');
 expansion.phase='finished';assert.equal(journeyRouteCue({expansion}),null);
}

// The cue waits for a real open exit and never interrupts a genuine boss death.
const e=createJourneyPresentation(),s=e.state(),next=journeyRouteCue({region:'garden',stage:0});
const boss={type:'austin',dead:true,hp:0,g:{position:{x:0,z:0}}};
e.defeat(boss,'오스틴',1);assert(!e.canGuideExit());assert(!e.guideExit(next));
for(let i=0;i<22;i++)e.step(.1);assert(e.canGuideExit());assert(e.guideExit(next));assert.equal(s.kind,'route');
const once=s.serial;for(let i=0;i<20000;i++){e.step(.02);assert(!e.guideExit(next));}assert.equal(s.serial,once);
e.cover();assert(!s.active);assert(!e.canGuideExit(),'reward overlays cannot replay an old route cue');
e.reset();assert(e.canGuideExit());e.guideExit(journeyRouteCue({region:'skyway',stage:2}));assert.equal(s.duration,.85);
e.step(.1,false);assert.equal(s.age,0,'pause cannot expire the route');

function host(){
 const controller=createJourneyPresentation(),levels=[];
 const c={region:'garden',stage:0,cycle:0,austinsDefeated:0,expansionJourney:null,expansionPublicEntry:null,expansionChannel:'inspection',roomCleared:false,exitOpen:false,mode:'playing',paused:false,survivalSession:null,mirrorSession:null,trainingSession:null,
  journeyPresentation:controller,journeyPresentationContext,journeyRouteCue,finalBossName:()=> '실제 보스',finalBossAhead:()=>false,audio:{setMusicIntensity:n=>levels.push(n)}};
 vm.createContext(c);vm.runInContext(hostSource,c);return {c,controller,levels};
}
for(const region of ['garden','stadium','skyway']){
 const {c,controller,levels}=host();c.region=region;c.presentJourneyTransition();assert(!controller.state().active);assert.equal(levels.at(-1),1);
 c.roomCleared=true;c.presentJourneyTransition();assert(!controller.state().active,'cleared without open exit is not a route');assert.equal(levels.at(-1),.65);
 c.mode='cards';c.exitOpen=true;c.presentJourneyTransition();assert(!controller.state().active,'rewards are finished before route guidance');
 c.mode='playing';c.presentJourneyTransition();assert.equal(controller.state().kind,'route');
 const serial=controller.state().serial;for(let i=0;i<100;i++)c.presentJourneyTransition();assert.equal(controller.state().serial,serial);
 c.mode='dead';c.presentJourneyTransition();assert.equal(levels.at(-1),.45);
}
for(const flag of ['survivalSession','mirrorSession','trainingSession','paused']){
 const {c,controller,levels}=host();c[flag]=true;c.roomCleared=c.exitOpen=true;c.presentJourneyTransition();assert.equal(levels.length,0);assert(!controller.state().active);
}
for(const mode of ['ready','duel','defense','adventure','garden']){
 const {c,controller,levels}=host();c.mode=mode;c.roomCleared=c.exitOpen=true;c.presentJourneyTransition();assert.equal(levels.length,0);assert(!controller.state().active);
}
const prep=host();prep.c.expansionJourney=createExpansionJourney('crystalGorge',0,413,{siege:true});prep.c.presentJourneyTransition();assert.equal(prep.levels.at(-1),.7);
prep.c.expansionJourney.siege.phase='defense';prep.c.presentJourneyTransition();assert.equal(prep.levels.at(-1),1);
prep.c.mode='ready';prep.c.presentJourneyTransition();assert.equal(prep.levels.at(-1),.45);
// Execute the real public boss exit gate before the real presentation host.
for(const saved of [false,true]){
 const {c,controller}=host();c.expansionJourney=createExpansionJourney('crosswind',4,413);advanceExpansionJourney(c.expansionJourney);c.expansionChannel='public';c.expansionPublicEntry={campaign:{bossCleared:saved,bossWins:{crosswindKeeper:3}}};
 c.roomCleared=true;c.arena={};c.player={position:{x:1,z:2}};c.gate={visible:false,position:new THREE.Vector3()};const nodes=new Map();c.$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true});return nodes.get(id);};c.expansionApi={EXPANSION_ACTS:{crosswind:{bossName:'횡풍의 수호자'}}};
 vm.runInContext(main.slice(main.indexOf('function openExit(){'),main.indexOf('\nfunction useExit(',main.indexOf('function openExit(){'))),c);
 c.openExit();c.presentJourneyTransition();assert.equal(c.exitOpen,saved);assert.equal(controller.state().active,saved);
 if(saved)assert.equal(controller.state().title,'완주 정산으로');else assert(c.$('#toast').textContent.includes('저장에 실패'));
}

// Real Three view, fake DOM: remove only duplicated transition text, retaining
// save failures and reward receipts; keep the same fixed three meshes.
const toast={textContent:''},node=()=>({dataset:{},style:{},hidden:true,textContent:'',setAttribute(){},append(){},remove(){}}),doc={body:{append(){}},createElement:node,getElementById:id=>id==='toast'?toast:null};
const scene=new THREE.Scene(),view=createJourneyPresentationView(scene,{document:doc}),root=scene.children[0],geometry=root.children.map(m=>m.geometry.id),uiController=createJourneyPresentation();
for(const text of ['오스틴 등장 · 기존 보스 안내','저장하지 못했어요','물약을 받았어요']){
 const controller=uiController;controller.reset();toast.textContent=text;controller.observeBoss({type:'austin',hp:10,g:{position:{x:0,z:0}}},'오스틴');controller.step(.2);view.update(controller.state(),{x:0,z:0},true,false,false,.2);
 assert.equal(toast.textContent,text.startsWith('오스틴 등장 · ')?'':text);
}
for(const text of ['방을 정리했다 · 빛나는 출구로 이동하세요','항로가 이어집니다 · 다음 편대 접근','전장 돌파 · 출구를 눌러 다음 방으로 이동','저장에 실패했어요','오스틴 격파 · 시간의 물약 +1']){
 const controller=uiController;controller.reset();toast.textContent=text;controller.guideExit(next);controller.step(.2);view.update(controller.state(),{x:0,z:0},true,true,true,.2);
 assert.equal(toast.textContent,/^(방을 정리했다|항로가 이어집니다|전장 돌파)/.test(text)?'':text);
 assert(!root.visible);assert.deepEqual(root.children.map(m=>m.geometry.id),geometry);
}
view.dispose();assert.equal(scene.children.length,0);

// Actual gain automation. Intensity never starts a new voice or reloads a
// track; the original event duck, mute, pause, background and scene resume win.
let clock=0,context,created=0;const fetched=[];
const param=()=>({value:0,calls:[],setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){},setTargetAtTime(v,t,fade){this.value=v;this.calls.push({v,t,fade});}});
const audioNode=()=>({gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(n){return n;},disconnect(){},start(){},stop(){this.onended?.();}});
class Context{constructor(){context=this;this.state='running';this.currentTime=0;this.destination=audioNode();this.gains=[];}createGain(){const n=audioNode();this.gains.push(n);created++;return n;}createDynamicsCompressor(){return audioNode();}createOscillator(){created++;return audioNode();}createBufferSource(){created++;return audioNode();}async decodeAudioData(){const data=new Float32Array(22050);return {duration:2,length:data.length,numberOfChannels:1,sampleRate:11025,getChannelData:()=>data};}async suspend(){this.state='suspended';}async resume(){this.state='running';}}
const audio=createGameAudio({AudioContextCtor:Context,fetcher:async url=>{fetched.push(url);return {ok:!url.includes('/sfx/'),status:404,arrayBuffer:async()=>new ArrayBuffer(8)};},now:()=>clock});audio.setScene('boss3');audio.setMusicIntensity(.65);assert.equal(created,0,'no gesture means no AudioContext or sources');await audio.unlock();await new Promise(setImmediate);
const music=context.gains[2].gain,master=context.gains[0].gain;
assert.equal(music.value,MUSIC_SCENES.boss3.gain*.65,'first gesture respects already selected scene and resting mix');
assert.equal(audio.state().loadedMusic,'boss3');assert.equal(audio.state().musicSources,1);assert.equal(fetched.length,1);
const nodesBefore=created;for(let i=0;i<20000;i++)audio.setMusicIntensity(.65);assert.equal(created,nodesBefore);assert.equal(fetched.length,1);assert.equal(audio.state().musicSources,1);assert.equal(music.calls.length,0,'steady frame updates do not schedule gains or reload the decoded track');
audio.play('bossDefeat');assert.equal(music.value,MUSIC_SCENES.boss3.gain*.65*.56);
audio.setMusicIntensity(.45);assert.equal(music.value,MUSIC_SCENES.boss3.gain*.45*.56);
clock=2000;audio.tick(0);assert.equal(music.value,MUSIC_SCENES.boss3.gain*.45,'duck release cannot restore full-volume combat in a result screen');
await audio.setPaused(true);assert.equal(context.state,'suspended');assert.equal(audio.state().musicIntensity,.45);assert(!audio.play('shot'));
await audio.setPaused(false);assert.equal(context.state,'running');assert.equal(audio.state().musicIntensity,.45);
audio.setMuted(true);assert.equal(master.value,0);audio.setMusicIntensity(.65);assert.equal(master.value,0);audio.setMuted(false);assert.equal(master.value,.72);
globalThis.document={hidden:true};assert(!await audio.unlock());delete globalThis.document;
audio.setScene('boss3');assert.equal(audio.state().musicIntensity,1);assert.equal(music.value,MUSIC_SCENES.boss3.gain,'same-scene next wave restores combat strength');
audio.setMusicIntensity(NaN);assert.equal(audio.state().musicIntensity,1);audio.setMusicIntensity(-1);assert.equal(audio.state().musicIntensity,.25);audio.reset();assert.equal(audio.state().musicIntensity,1);audio.dispose();
const silent=createGameAudio({AudioContextCtor:null});silent.setMusicIntensity(.65);assert.equal(silent.state().musicIntensity,.65);assert(!await silent.unlock());
console.log('Journey transitions PASS: all five acts next objective, actual open-exit/save gate, once-only priority/cover/reset, pure state/no awards, shared-mode isolation, fixed visual pool, exact toast protection and real music gain/duck/mute/pause/unlock/reset with 20k steady calls. Node engine/VM/Three/audio adapters only; browser and listening not verified.');
