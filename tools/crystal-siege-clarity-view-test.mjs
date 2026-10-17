import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCrystalSiegeView} from '../src/crystal-siege-view.js';
import {createCrystalSiege,checkpointCrystalSiege,CRYSTAL_SIEGE_PACKETS} from '../src/crystal-siege-rules.js';

class Element{
 constructor(){this.hidden=false;this.dataset={};this.children=[];this.style={};this.attributes={};this.nodes=new Map();this.writes=0;this._html='';this.textContent='';this.disabled=false;}
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
 const rings=world.children.filter(o=>o.name.startsWith('crystal-garden-build-ring-')),objects=world.children.length;
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
 assert(CRYSTAL_SIEGE_PACKETS.length===5);view.dispose();assert.equal(scene.children.length,0);assert(hud.removed&&menu.removed);assert(!view.recordSupport(1,'pad-0'));
 passed.push('Changed room/hide/dispose reset feedback; true level2 priority copy; fixed render budget');
}finally{globalThis.document=oldDocument;}
console.log('Crystal siege clarity view PASS',passed.length,JSON.stringify(passed));
console.log('Actual imported Three view with fake DOM and supplied canonical rule states; not native browser/device or human fun proof.');
