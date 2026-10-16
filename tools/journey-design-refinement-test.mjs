import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createJourneyPresentation} from '../src/journey-presentation.js';
import {createJourneyPresentationView} from '../src/journey-presentation-view.js';
import {createExpansionJourneyView} from '../src/expansion-journey-view.js';
import {createCrystalSiegeView} from '../src/crystal-siege-view.js';
import {createCrystalSiege} from '../src/crystal-siege-rules.js';
import {createJourneySignatureView} from '../src/journey-act-signature-view.js';
import {createJourneySignature} from '../src/journey-act-signatures.js';

class Element{
 constructor(){this.hidden=false;this.dataset={};this.children=[];this.style={};this.attributes={};this.nodes=new Map();this.textContent='';this.disabled=false;}
 append(...children){for(const child of children){this.children.push(child);child.parent=this;}}
 setAttribute(k,v){this.attributes[k]=v;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 blur(){}querySelector(q){if(!this.nodes.has(q)){const e=new Element();if(q==='[data-choices]')e.hidden=true;this.nodes.set(q,e);}return this.nodes.get(q);}
 querySelectorAll(){return this.buttons??=['turret','snare','wall'].map(kind=>{const e=new Element();e.dataset.kind=kind;return e;});}
}
const previousDocument=globalThis.document;globalThis.document={body:new Element(),createElement:()=>new Element()};
try{
 // The weak-device setting retains functional direction using the existing
 // batch, even when a celebration previously left six unrelated transforms.
 const routeScene=new THREE.Scene(),route=createJourneyPresentation(),routeView=createJourneyPresentationView(routeScene),player={x:0,z:0};
 const routeRoot=routeScene.children[0],leaves=routeRoot.children[2],routeIds=routeRoot.children.map(o=>o.uuid);
 route.law('성장','이전 연출',player);routeView.update(route.state(),player,true);route.step(2);route.reset();route.trackExit({x:8,z:0,radius:1.7});
 routeView.update(route.state(),player,true,true,true);assert(leaves.visible);assert.equal(leaves.count,2);
 const matrix=new THREE.Matrix4();for(let i=0;i<2;i++){leaves.getMatrixAt(i,matrix);assert(new THREE.Vector3().setFromMatrixPosition(matrix).x>0);}
 const lowVersion=leaves.instanceMatrix.version;for(let i=0;i<2000;i++)routeView.update(route.state(),player,true,true,true);assert.equal(leaves.instanceMatrix.version,lowVersion);
 routeView.update(route.state(),player,true,true,false);assert.equal(leaves.count,6);assert.equal(leaves.instanceMatrix.version,lowVersion+1,'quality transition refreshes all six transforms');
 assert.deepEqual(routeRoot.children.map(o=>o.uuid),routeIds);routeView.dispose();

 // Actual stadium objects, with image loading replaced only at the IO edge.
 // Absolute-time flags freeze on pause, settle once in reduced motion, and
 // update at most 30Hz on mobile without changing the assisted-slide rule.
 const originalLoad=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
 try{
  const source=fs.readFileSync(new URL('../src/stadium.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env.BASE_URL',"'/'");
  const context={THREE,mergeGeometries};vm.createContext(context);vm.runInContext(source+'\nthis.factory=createStadium;',context);
  const stadium=context.factory(new THREE.Scene(),{mobile:true});stadium.setActive(true,{id:'diamond'});
  const flags=stadium.group.children.find(o=>o.isInstancedMesh);stadium.update(1,true,false);const activeVersion=flags.instanceMatrix.version;
  for(let i=0;i<2000;i++)stadium.update(2+i/60,false,false);assert.equal(flags.instanceMatrix.version,activeVersion,'pause performs no decorative buffer upload');
  stadium.update(2,true,true);const reducedVersion=flags.instanceMatrix.version;for(let i=0;i<2000;i++)stadium.update(3+i/60,true,true);assert.equal(flags.instanceMatrix.version,reducedVersion);
  stadium.update(10,true,false);const cappedVersion=flags.instanceMatrix.version;for(let i=1;i<30;i++)stadium.update(10+i/1000,true,false);assert.equal(flags.instanceMatrix.version,cappedVersion);
  stadium.update(10.04,true,false);assert.equal(flags.instanceMatrix.version,cappedVersion+1);assert(stadium.tryBaseSlide({x:0,z:4.2}));
 }finally{THREE.TextureLoader.prototype.load=originalLoad;}

 const sandScene=new THREE.Scene(),sandView=createExpansionJourneyView(sandScene,new THREE.Texture()),sand=sandView.root.children.filter(o=>o.name.startsWith('crosswind-undertow-'));
 sandView.setCrosswindSandTexture(new THREE.Texture());const fields=[{x:6,z:1.8,radius:2.65,phase:'warning',progress:.4}];sandView.syncUndertow(fields);
 assert(sand[0].visible&&sand[1].visible&&!sand[2].visible);assert.equal(sand[2].count,0);
 sand[1].getMatrixAt(0,matrix);assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x-2.65)<1e-6);
 const vertices=sand[1].geometry.getAttribute('position');let radius=0;for(let i=0;i<vertices.count;i++)radius=Math.max(radius,Math.hypot(vertices.getX(i),vertices.getZ(i)));assert(Math.abs(radius-1)<1e-6);
 assert.equal(sand[1].geometry.getIndex().count,192,'eight sparse arcs use half the full contour');
 const sandVersions=sand.map(o=>[o.instanceMatrix.version,o.instanceColor?.version??0]);for(let i=0;i<2000;i++)sandView.syncUndertow(fields);
 assert.deepEqual(sand.map(o=>[o.instanceMatrix.version,o.instanceColor?.version??0]),sandVersions,'identical field state performs no buffer upload');
 fields[0].phase='pull';fields[0].progress=.5;sandView.syncUndertow(fields);const strong=new THREE.Color();sand[1].getColorAt(0,strong);
 fields[0].progress=.99;sandView.syncUndertow(fields);const fading=new THREE.Color();sand[1].getColorAt(0,fading);assert(fading.r<strong.r,'contour fades with actual sinusoidal pull strength');
 assert.equal(sand[2].instanceMatrix.version,0,'hidden atlas leaf overlay is never uploaded');
 fields[0].phase='off';sandView.syncUndertow(fields);assert(sand.every(o=>!o.visible));sandView.dispose();

 const siegeScene=new THREE.Scene(),siegeView=createCrystalSiegeView(siegeScene,{load:()=>new THREE.Texture()},'/'),state=createCrystalSiege(0,413),pad=state.pads[0];Object.assign(pad,{kind:'turret',level:1,hp:20});
 const position={x:pad.x,z:pad.z};siegeView.update(state,position,{visible:true,interactive:true,dt:.1});
 const siegeRoot=siegeScene.children[0],contact=siegeRoot.getObjectByName('crystal-garden-ground-contacts'),back=siegeRoot.getObjectByName('crystal-garden-facility-hp-background'),fill=siegeRoot.getObjectByName('crystal-garden-facility-hp-fill');
 const resources=siegeRoot.children.map(o=>o.uuid),versions=[contact.instanceMatrix.version,back.instanceMatrix.version,fill.instanceMatrix.version,fill.instanceColor.version];
 for(let i=0;i<2000;i++)siegeView.update(state,position,{visible:true,interactive:false,dt:0});
 assert.deepEqual([contact.instanceMatrix.version,back.instanceMatrix.version,fill.instanceMatrix.version,fill.instanceColor.version],versions,'paused contacts and HP bars have no repeated uploads');
 pad.hp=10;siegeView.update(state,position,{visible:true,interactive:true,dt:.1});assert.equal(fill.instanceMatrix.version,versions[2]+1);assert.equal(contact.instanceMatrix.version,versions[0],'HP alone does not rebuild static contacts');
 state.phase='defense';siegeView.update(state,position,{visible:true});assert.equal(contact.count,2);pad.hp=0;siegeView.update(state,position,{visible:true});assert.equal(contact.count,1);assert.equal(fill.count,0);
 pad.hp=45;siegeView.update(state,position,{visible:true});assert.equal(contact.count,2);assert.deepEqual(siegeRoot.children.map(o=>o.uuid),resources);siegeView.dispose();

 const signatureScene=new THREE.Scene(),signatureView=createJourneySignatureView(signatureScene),signature=createJourneySignature('crystalGorge'),siege=createCrystalSiege(0,1),p=siege.pads[0];Object.assign(p,{kind:'turret',level:1,hp:20});siege.phase='defense';siege.resources=1;
 Object.assign(signature,{rallyPad:p.id,repairPad:p.id,repairCharge:.6,repairAway:false,repairGrace:.65});signatureView.update(signature,position,{siege,visible:true});const signatureRoot=signatureScene.children[0],ring=signatureRoot.children[4],bar=signatureRoot.children[3];assert(ring.visible&&bar.visible);
 signature.rallyPad=null;signature.repairAway=true;signatureView.update(signature,position,{siege,visible:true});assert(!ring.visible&&bar.visible);assert.equal(bar.material.opacity,.25);
 p.hp=0;signatureView.update(signature,position,{siege,visible:true});assert(!ring.visible&&!bar.visible,'destroyed facility cannot retain a repair effect');
 p.hp=20;siege.resources=0;signatureView.update(signature,position,{siege,visible:true});assert(!bar.visible);siege.resources=1;signature.repairPad=null;signature.repairAway=false;signatureView.update(signature,position,{siege,visible:true});assert(!bar.visible);signatureView.dispose();
}finally{globalThis.document=previousDocument;}
console.log('Journey design refinement PASS: real Three low-quality exit direction, pause/reduced/mobile flag cadence, exact sparse active sand contour, unchanged-state buffer upload caches, and retained repair progress without an outside support ring. No browser, GPU FPS, physical device or account-play claim.');
