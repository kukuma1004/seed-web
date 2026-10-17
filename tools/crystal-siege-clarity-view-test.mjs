import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCrystalSiegeView} from '../src/crystal-siege-view.js';
import {createCrystalSiege,checkpointCrystalSiege,CRYSTAL_SIEGE_PACKETS,harvestCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege} from '../src/crystal-siege-rules.js';
import {createJourneySignature,stepJourneySignature,journeySignatureHint} from '../src/journey-act-signatures.js';

class Element{
 constructor(){this.hidden=false;this.datasetWrites=0;this.dataset=new Proxy({},{set:(target,key,value)=>{this.datasetWrites++;target[key]=value;return true;}});this.children=[];this.style={};this.attributes={};this.nodes=new Map();this.writes=0;this._html='';this.textContent='';this.disabled=false;}
 set innerHTML(value){this._html=value;this.writes++;}
 get innerHTML(){return this._html;}
 append(...children){this.children.push(...children);}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){this.removed=true;}
 blur(){}
 querySelector(q){if(!this.nodes.has(q)){const el=new Element();if(q==='[data-choices]')el.hidden=true;this.nodes.set(q,el);}return this.nodes.get(q);}
 querySelectorAll(){return this.buttons??=['turret','snare','wall'].map(kind=>{const el=new Element();el.dataset.kind=kind;return el;});}
}

const oldDocument=globalThis.document,doc={body:new Element(),createElement:()=>new Element()},passed=[];
globalThis.document=doc;
try{
 const scene=new THREE.Scene(),callbacks=[];
 const view=createCrystalSiegeView(scene,{load:()=>new THREE.Texture()},'/',{onBuild:(id,kind)=>callbacks.push([id,kind]),onStart:()=>callbacks.push('start')});
 const [hud,menu]=doc.body.children,world=scene.children[0],heart=world.getObjectByName('crystal-siege-heart'),facility=world.getObjectByName('crystal-siege-facility-0');
 assert(heart.material.depthWrite&&facility.material.depthWrite,'opaque facility pixels expose the occluded player ghost');assert(heart.material.alphaTest>0);
 const rings=world.children.filter(o=>o.name.startsWith('crystal-garden-build-ring-')),objects=world.children.length;
 assert.equal(view.notice('아직 진입 전'),false,'hidden scenes cannot queue a visible notice');
 let s=createCrystalSiege(0,413);
 const show=(opts={})=>view.update(s,{x:-3,z:-2.5},{visible:true,interactive:true,dt:.1,...opts});
 show();const original=checkpointCrystalSiege(s);
 assert(hud.innerHTML.includes('낮 · 채집과 준비')&&!hud.innerHTML.includes('남은 습격'));
 assert(!view.recordSupport(24,'pad-0'),'unpaid/preparation support denied');
 menu.querySelector('[data-context]').onclick();show({dt:0});assert(view.preparationHeld());assert(hud.innerHTML.includes('준비 시간 멈춤'));
 menu.buttons[0].onclick();assert.deepEqual(callbacks[0],['pad-0','turret']);assert(!view.preparationHeld());
 menu.querySelector('[data-start]').onclick();assert.equal(callbacks[1],'start');
 assert.deepEqual(checkpointCrystalSiege(s),original,'presentation and callbacks never mutate canonical state');
 passed.push('Existing contextual build/start and preparation hold survive');

 s.phase='defense';show({liveEnemies:0});assert(hud.innerHTML.includes('남은 습격 18 · 남은 적 0'));assert(!hud.innerHTML.includes('마지막 적')&&!hud.innerHTML.includes('습격을 막았습니다'));
 const writes=hud.writes;show({dt:0,liveEnemies:0});assert.equal(hud.writes,writes,'identical HUD is not rewritten');
 s.spawnIndex=17;show({liveEnemies:2});assert(hud.innerHTML.includes('남은 습격 1 · 남은 적 2'));
 s.spawnIndex=18;show({liveEnemies:1});assert(hud.innerHTML.includes('남은 습격 0 · 남은 적 1')&&hud.innerHTML.includes('마지막 적을 처치'));
 show({liveEnemies:0});assert(hud.innerHTML.includes('습격 정산 중')&&!hud.innerHTML.includes('습격을 막았습니다'));
 show({liveEnemies:null});assert(hud.innerHTML.includes('남은 적을 확인')&&!hud.innerHTML.includes('남은 적 0'));
 s.phase='clear';show({liveEnemies:0});assert(hud.innerHTML.includes('습격을 막았습니다'));
 passed.push('Finite actual packet/live ledgers distinguish incoming, cleanup and canonical clear');

 s.phase='defense';show({roundCount:3,liveEnemies:4});assert(!hud.innerHTML.includes('남은 습격')&&hud.innerHTML.includes('남은 적 4'));
 show({boss:true,coreDefense:true,liveEnemies:2});assert(hud.innerHTML.includes('재생 습격대')&&!hud.innerHTML.includes('남은 습격')&&menu.hidden);
 show({boss:true,bossCleared:true});assert(hud.innerHTML.includes('결전 승리 · 출구로 이동')&&!hud.innerHTML.includes('보스 결전'));
 passed.push('Survival ledger and boss/exit wording do not inherit Journey packet assumptions');

 Object.assign(s.pads[0],{kind:'turret',level:1,hp:45});show();assert.equal(facility.material.color.getHex(),0xffffff);
 s.core.hp=92;s.pads[0].hp=38;const lossState=checkpointCrystalSiege(s);show({liveEnemies:2});
 assert.equal(heart.material.color.getHex(),0xff8777);assert.equal(facility.material.color.getHex(),0xff8777);assert.equal(rings[0].material.color.getHex(),0xff8777);assert(hud.innerHTML.includes('심장이 공격받고'));
 show({dt:0,liveEnemies:2});assert.equal(heart.material.color.getHex(),0xff8777,'paused cues do not tick');
 for(let i=0;i<15;i++)show({liveEnemies:2});assert.equal(heart.material.color.getHex(),0xffffff);assert.equal(facility.material.color.getHex(),0xffffff);assert(!hud.innerHTML.includes('심장이 공격받고'));
 assert.deepEqual(checkpointCrystalSiege(s),lossState,'loss feedback leaves HP/ledgers untouched');
 passed.push('Actual HP losses tint existing heart/pad/ring only and expire without mutating state');

 for(const value of [0,-1,NaN,Infinity,1e7])assert(!view.recordSupport(value,'pad-0'));
 assert(!view.recordSupport(24,'missing'));Object.assign(s.pads[1],{kind:'wall',hp:75,level:1});assert(!view.recordSupport(24,'pad-1'));
 assert(view.recordSupport(7.25,'pad-0',{x:s.pads[0].x+4,z:s.pads[0].z}));show({dt:0,liveEnemies:2});assert(hud.innerHTML.includes('포탑 적중 · 피해 7.3'));assert.equal(facility.material.color.getHex(),0xb5ffd7);
 show({dt:.06,liveEnemies:2});assert(facility.position.x<s.pads[0].x,'actual target to the right produces a short leftward recoil');assert.equal(facility.position.z,s.pads[0].z);assert(facility.position.distanceTo(new THREE.Vector3(s.pads[0].x,.04,s.pads[0].z))<=.12);const pausedRecoil=facility.position.clone();for(let i=0;i<20;i++)show({dt:0,liveEnemies:2});assert(facility.position.equals(pausedRecoil),'paused feedback holds without an external timer');assert.equal(world.children.length,objects,'target recoil reuses the existing facility sprite');
 assert(view.recordSupport(2,'pad-0'));show({dt:0,liveEnemies:2});assert(hud.innerHTML.includes('피해 2')&&!hud.innerHTML.includes('7.3'),'one latest real receipt, not an invented total');
 for(let i=0;i<15;i++)show({liveEnemies:2});assert(!hud.innerHTML.includes('포탑 적중'));assert.equal(facility.material.color.getHex(),0xffffff);assert.equal(facility.position.x,s.pads[0].x);assert.equal(facility.position.z,s.pads[0].z);
 s.core.hp-=1;show({liveEnemies:2});assert(hud.innerHTML.includes('심장이 공격받고'));assert(view.recordSupport(5,'pad-0',{x:s.pads[0].x,z:s.pads[0].z-4}));show({dt:0,liveEnemies:2});assert(hud.innerHTML.includes('심장이 공격받고')&&!hud.innerHTML.includes('포탑 적중'),'a real turret hit must not replace the urgent core warning');for(let i=0;i<15;i++)show({liveEnemies:2});
 s.pads[0].hp=0;assert(!view.recordSupport(3,'pad-0'));show();assert(!facility.visible);assert.equal(rings[0].material.color.getHex(),0xff8777,'destroyed facility retains only existing ring cue');
 passed.push('Positive actual paid turret support has one bounded receipt and no fabricated totals');

 s=createCrystalSiege(1,8);Object.assign(s.pads[0],{kind:'turret',level:1,hp:45});show({dt:0});assert.equal(heart.material.color.getHex(),0xffffff);assert.equal(facility.material.color.getHex(),0xffffff);assert(!hud.innerHTML.includes('포탑 적중'));
 assert(menu.querySelector('[data-context]').textContent.includes('강화 · 심장 우선'));
 s.pads[0].level=2;show({dt:0});assert(menu.querySelector('[data-context]').textContent.includes('심장 우선 공격')&&menu.querySelector('[data-context]').disabled);
 s.phase='defense';show();assert(view.recordSupport(11,'pad-0'));view.hide();assert(!view.recordSupport(11,'pad-0'));show({dt:0});assert(!hud.innerHTML.includes('포탑 적중'));assert.equal(heart.material.color.getHex(),0xffffff);
 assert.equal(world.children.length,objects,'feedback never creates new render objects');
 passed.push('Changed room/hide reset feedback; true level2 priority copy; fixed render budget');

 s=createCrystalSiege(0,91);show({dt:0});assert.deepEqual({...hud.dataset},{phase:'prep',alert:'none',command:'none',cleanup:'false'});
 const noticeState=JSON.stringify(s),noticeCheckpoint=checkpointCrystalSiege(s),bodyNodes=doc.body.children.length;
 assert.equal(view.notice(null),false);assert.equal(view.notice('수정 채집 +2',.4),true);show({dt:0});assert(hud.innerHTML.includes('수정 채집 +2'));assert.equal(hud.dataset.alert,'feedback');
 const stableWrites=hud.writes,stableDatasetWrites=hud.datasetWrites;
 for(let i=0;i<6000;i++)show({dt:0});
 assert.equal(hud.writes,stableWrites,'identical paused HUD does not replace its children');assert.equal(hud.datasetWrites,stableDatasetWrites,'identical dataset attributes are not written every frame');assert.equal(doc.body.children.length,bodyNodes,'no per-update DOM nodes');
 assert.equal(JSON.stringify(s),noticeState);assert.deepEqual(checkpointCrystalSiege(s),noticeCheckpoint,'notices neither pay nor gather resources or advance combat');
 for(let i=0;i<5;i++)show();assert(!hud.innerHTML.includes('수정 채집 +2'));assert.equal(hud.dataset.alert,'none','notice expires through supplied visual dt');
 assert(view.notice('<img>&'+ 'x'.repeat(130),100));show({dt:0});assert(hud.innerHTML.includes('img'+'x'.repeat(97)));assert(!hud.innerHTML.includes('<img>'));assert(!hud.innerHTML.includes('x'.repeat(98)),'notice text is bounded and cannot inject markup');
 for(let i=0;i<31;i++)show();assert(!hud.innerHTML.includes('x'.repeat(97)),'oversized lifetime clamps to three seconds');
 s.core.hp-=1;show({dt:0});assert.equal(hud.dataset.alert,'danger');assert(!view.notice('낮은 우선순위 영수증'),'notice cannot displace a live core-hit warning');show({dt:0});assert(hud.innerHTML.includes('심장이 공격받고')&&!hud.innerHTML.includes('낮은 우선순위'));
 for(let i=0;i<15;i++)show();assert.equal(hud.dataset.alert,'none');assert(!hud.innerHTML.includes('심장이 공격받고'));
 s.phase='defense';show({liveEnemies:2});assert.equal(hud.dataset.phase,'defense');assert.equal(hud.dataset.cleanup,'false');
 s.spawnIndex=CRYSTAL_SIEGE_PACKETS[s.room];show({liveEnemies:1});assert.equal(hud.dataset.cleanup,'true');assert(hud.innerHTML.includes('마지막 적을 처치'));show({liveEnemies:0});assert(hud.innerHTML.includes('습격 정산 중'));
 show({boss:true,bossCleared:false});assert.equal(hud.dataset.phase,'boss');assert(menu.hidden);show({boss:true,bossCleared:true});assert(hud.innerHTML.includes('출구로 다음 진행'));
 assert(view.notice('방 전환에 남으면 안 됨'));view.hide();assert(!view.notice('숨긴 화면'));s=createCrystalSiege(0,92);show({dt:0});assert(!hud.innerHTML.includes('방 전환'));assert.equal(hud.dataset.alert,'none');
 passed.push('Bounded notice sanitization/expiry, core-hit priority, phase/alert/cleanup state and6000 static DOM updates');

 // Use the real command/repair rules. Rendering must report those earned
 // states without secretly charging, repairing, harvesting or advancing them.
 s=createCrystalSiege(0,119);assert(harvestCrystalSiege(s,s.nodes[0].id,s.nodes[0]).ok);assert(buildCrystalSiege(s,'pad-0','turret',s.pads[0]).ok);assert(startCrystalSiegeDefense(s).ok);
 const signature=createJourneySignature('crystalGorge');stepJourneySignature(signature,.1,{player:s.pads[0],siege:s});
 let ruleBefore=JSON.stringify(s),signatureBefore=JSON.stringify(signature);show({signature,dt:0,liveEnemies:2});assert.equal(hud.dataset.command,'active');assert(hud.innerHTML.includes(journeySignatureHint(signature,s)));assert(hud.innerHTML.includes('포탑 지원 중'));
 assert.equal(JSON.stringify(s),ruleBefore);assert.equal(JSON.stringify(signature),signatureBefore);
 s.pads[0].hp-=10;stepJourneySignature(signature,.1,{player:s.pads[0],siege:s});assert.equal(signature.repairPad,'pad-0');
 ruleBefore=JSON.stringify(s);signatureBefore=JSON.stringify(signature);const repairResources=s.resources,repairHp=s.pads[0].hp;
 show({signature,dt:0,liveEnemies:2});assert.equal(hud.dataset.command,'active');assert(hud.innerHTML.includes('시설 수리 중'));
 for(let i=0;i<100;i++)show({signature,dt:.1,liveEnemies:2});assert.equal(JSON.stringify(s),ruleBefore);assert.equal(JSON.stringify(signature),signatureBefore,'visual dt cannot complete repair charge');
 assert(view.notice('실제 채집 알림',.2));show({signature,dt:0,liveEnemies:2});assert(hud.innerHTML.includes('실제 채집 알림')&&!hud.innerHTML.includes('시설 수리 중'));assert.equal(hud.dataset.command,'active');for(let i=0;i<3;i++)show({signature,liveEnemies:2});assert(hud.innerHTML.includes('시설 수리 중'),'one HUD returns to its pending repair hint after notice');
 for(let i=0;i<15;i++)stepJourneySignature(signature,.1,{player:s.pads[0],siege:s});assert.equal(s.pads[0].hp,repairHp+10);assert.equal(s.resources,repairResources-1,'only canonical repair rules spend one crystal');show({signature,dt:0,liveEnemies:2});assert(hud.innerHTML.includes('포탑 지원 중'));
 show({signature:{...signature,act:'crosswind'},dt:0,liveEnemies:2});assert.equal(hud.dataset.command,'none','other acts cannot invent siege commands');
 passed.push('Canonical rally/repair hints share one HUD; visual updates cannot grant repair or spend resources');

 const reference=structuredClone(s),targets=[{id:'actual-near',x:-3,z:-1,hp:1000},{id:'actual-core-side',x:0,z:-1,hp:1000}],targetState=JSON.stringify(targets);let actualReceipts=0;
 for(let i=0;i<150;i++){
  const dt=i%19===0?0:i%17===0?.4:.1,a=stepCrystalSiege(s,dt,{player:s.pads[0],enemies:targets}),b=stepCrystalSiege(reference,dt,{player:reference.pads[0],enemies:targets});
  assert.deepEqual(a,b,'rendered/reference canonical facility and wave outputs');actualReceipts+=a.hits.length;
  const before=JSON.stringify(s);show({signature,dt,liveEnemies:targets.length});assert.equal(JSON.stringify(s),before,'presentation never changes canonical hit/packet/resource state');assert.deepEqual(checkpointCrystalSiege(s),checkpointCrystalSiege(reference));
 }
 assert(actualReceipts>0,'comparison exercised real paid turret attack output');assert.equal(JSON.stringify(targets),targetState,'view and intent rules do not fabricate applied enemy damage');assert.equal(world.children.length,objects);
 passed.push('150 paired real-rule steps preserve paid turret targets/damage, packet ledger, resources and checkpoint parity');

 assert(CRYSTAL_SIEGE_PACKETS.length===5);view.dispose();assert.equal(scene.children.length,0);assert(hud.removed&&menu.removed);assert(!view.recordSupport(1,'pad-0'));
 assert(!view.notice('폐기 뒤 알림'));passed.push('Dispose removes owned world/DOM and rejects stale support/notice');
}finally{globalThis.document=oldDocument;}

const css=readFileSync(new URL('../src/journey.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const cssRules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,declarations])=>({selector:selector.trim(),declarations}));
const rule=(selector,predicate)=>cssRules.some(r=>r.selector===selector&&predicate(r.declarations));
assert(rule('#crystal-siege-build button',d=>/min-height\s*:\s*44px/.test(d)&&/min-width\s*:\s*44px/.test(d)),'primary/context/close buttons retain44px base targets');
for(const r of cssRules.filter(r=>r.selector.includes('#crystal-siege-build')))for(const m of r.declarations.matchAll(/min-height\s*:\s*(\d+)px/g))assert(Number(m[1])>=44,'compact overrides cannot shrink button target height');
assert(rule('body:has(#crystal-siege-ui:not([hidden])) #help,body:has(#crystal-siege-ui:not([hidden])) #journey-signature',d=>/display\s*:\s*none/.test(d)),'duplicate help/signature regions hidden only when siege HUD is visible');
assert(rule('#crystal-siege-ui[data-phase="boss"] strong',d=>/display\s*:\s*none/.test(d)),'boss does not repeat the chapter headline');
assert(rule('#crystal-siege-ui[data-phase="defense"][data-alert="none"][data-command="none"][data-cleanup="false"] small',d=>/display\s*:\s*none/.test(d)),'ordinary defense omits repeated passive instructions');
assert(rule('#crystal-siege-ui:is([data-alert="danger"],[data-alert="feedback"],[data-command="active"],[data-cleanup="true"]) small',d=>/display\s*:\s*block/.test(d)),'compact CSS restores urgent/earned command/cleanup instructions');
assert(css.includes('safe-area-inset-bottom')&&css.includes('button:focus-visible'));passed.push('Scoped duplicate-HUD suppression, compact urgent hint restoration and44px focusable buttons');
console.log('Crystal siege clarity view PASS',passed.length,JSON.stringify(passed));
console.log('Actual imported Three view with fake DOM and supplied canonical rule states; not native browser/device or human fun proof.');
