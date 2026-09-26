import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSurvivalArt} from '../src/survival-art.js';

const originalLoad=THREE.TextureLoader.prototype.load,loaded=[];
THREE.TextureLoader.prototype.load=function(url){const t=new THREE.Texture();t.userData.url=url;loaded.push(t);return t;};
try{
 const scene=new THREE.Scene(),existing=new THREE.Group();scene.add(existing);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,22,15.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const art=createSurvivalArt(scene,camera,{baseUrl:'/seed/',capacity:3,mobile:true});
 const root=scene.getObjectByName('survival-garden-art');
 assert.equal(root.visible,false);assert.equal(art.update([],0),0);
 assert.equal(loaded.length,4);assert(loaded.every(t=>t.userData.url.startsWith('/seed/assets/mobile/')));
 const make=(kind,x,facing=0)=>{const g=new THREE.Group();g.position.set(x,0,0);g.rotation.y=facing;return {survivalKind:kind,g,hit:0,phase:1,radius:.3};};
 const enemies=[make('swarm',0),make('runner',1,Math.PI/2),make('brute',2,Math.PI)];
 art.setActive(true);assert.equal(art.update(enemies,1),3);assert.equal(art.state().bodyBatches,3);
 const bodies=root.children.filter(o=>o.name.startsWith('survival-swarm-')||o.name.startsWith('survival-runner-')||o.name.startsWith('survival-brute-'));
 assert.equal(bodies.length,12);assert(bodies.every(b=>b.instanceMatrix.count===3+24));
 const shadow=root.getObjectByName('survival-enemy-contact-shadows');assert.equal(shadow.count,3);
 const buffer=bodies[0].instanceMatrix.array,identity=bodies.map(b=>[b.geometry,b.material]);
 for(let i=0;i<100;i++)art.update(enemies,i/60);
 assert.equal(bodies[0].instanceMatrix.array,buffer);assert(bodies.every((b,i)=>b.geometry===identity[i][0]&&b.material===identity[i][1]));
 enemies[0].hit=.14;art.update(enemies,2);const hitColor=new THREE.Color();bodies[0].getColorAt(0,hitColor);assert(hitColor.g<1);
 assert.equal(art.update([...enemies,make('swarm',3),make('runner',4)],3),3);assert.equal(art.state().overflow,2);
 enemies[0].dead=true;enemies[1].g.visible=false;
 assert.equal(art.update([...enemies,make('boss',4)],4),1);assert.equal(shadow.count,1);
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();shadow.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert.equal(position.x,2);assert(Math.abs(position.y-.025)<1e-6);
 art.update(enemies,4);
 for(let i=0;i<200;i++)art.defeat(enemies[2],{x:0,z:0});
 art.update(enemies,4.1);assert.equal(art.state().defeatPetals,96,'burst storm uses fixed particle pool');
 assert(bodies.every(b=>b.count<=27),'living + collapsing bodies fit the existing batches');
 art.update(enemies,4.5);assert.equal(art.state().defeatPetals,0,'kill feedback expires');
 assert.equal(loaded.length,4,'no added texture for groundcover or kill feedback');
 art.setActive(false);assert.equal(root.visible,false);assert.equal(shadow.count,0);assert.equal(art.state().rendered,0);
 art.setActive(true);assert.equal(art.update([],5),0);assert(bodies.every(b=>b.count===0));
 // Cycle all themes twice; texture/material/geometry counts must plateau.
 art.setActive(true);art.setAct(1);art.update(enemies,5);art.setAct(2);art.update(enemies,5);
 const texturePeak=loaded.length,geometryPeak=new Set(root.children.map(o=>o.geometry)).size,materialPeak=new Set(root.children.map(o=>o.material)).size;
 for(let i=0;i<15;i++){art.setAct(i%3);art.update(enemies,6+i);}
 assert.equal(loaded.length,texturePeak,'texture cache bounded across acts and laps');
 assert.equal(new Set(root.children.map(o=>o.geometry)).size,geometryPeak);assert.equal(new Set(root.children.map(o=>o.material)).size,materialPeak);
 assert.equal(art.state().maxBodyBatches,12);assert.equal(art.state().capacity,3);
 art.setAct(0);art.setActive(false);
 const resources=new Set();root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});for(const t of loaded)resources.add(t);
 const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
 art.dispose();art.dispose();assert.deepEqual(scene.children,[existing]);assert.equal(art.state().disposed,true);
 for(const resource of resources)assert.equal(disposed.get(resource),1,'Each unique owned geometry, material and texture is released once.');
 assert.equal(art.update(enemies,6),0);art.setActive(true);assert.equal(art.state().active,false);
 // The live floor borrows the already resident texture; it must survive disposal.
 const shared=new THREE.Texture();let sharedDisposals=0;shared.addEventListener('dispose',()=>sharedDisposals++);
 const n=loaded.length,borrowed=createSurvivalArt(scene,camera,{groundTexture:shared});
 assert.equal(loaded.length-n,3);assert.equal(borrowed.state().sharedGround,true);
 borrowed.dispose();assert.equal(sharedDisposals,0);shared.dispose();
 console.log('Survival garden: fixed 12 body batches, bounded population, pooled transforms, hit tint, lifecycle and resource disposal passed.');
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
