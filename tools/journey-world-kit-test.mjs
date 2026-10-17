import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createJourneyWorldKit} from '../src/journey-world-kit.js';
import {journeyRoomLayout} from '../src/journey-room-layouts.js';

function fixture(lowQuality=false){
 const parent=new THREE.Group(),loads=[];
 const loader={load(url,ready,_p,fail){const texture=new THREE.Texture();loads.push({url,ready,fail,texture});return texture;}};
 const view=createJourneyWorldKit(parent,{loader,lowQuality,base:'/seed-web/'});
 return {parent,loads,view,mesh:parent.getObjectByName('journey-flower-masonry-and-landmarks')};
}
const f=fixture();assert.equal(f.loads.length,0,'inactive modes do not request new art');
f.view.setLayout(journeyRoomLayout(3));assert.equal(f.loads.length,0);assert.equal(f.view.diagnostics().drawCalls,0);
f.view.setActive(true);assert.equal(f.loads.length,1);assert.equal(f.view.diagnostics().drawCalls,0,'loading cannot expose an untextured rectangle');
f.loads[0].ready(f.loads[0].texture);assert.equal(f.view.diagnostics().drawCalls,1);assert.equal(f.mesh.material.depthWrite,false);assert.equal(f.mesh.material.forceSinglePass,true);
assert.equal(f.loads[0].texture.generateMipmaps,false);assert.equal(f.loads[0].texture.colorSpace,THREE.SRGBColorSpace);
const shader={vertexShader:THREE.ShaderLib.basic.vertexShader};f.mesh.material.onBeforeCompile(shader);assert.match(shader.vertexShader,/attribute vec4 kitRegion/);assert.match(shader.vertexShader,/vMapUv=kitRegion.xy\+vMapUv\*kitRegion.zw/);
const matrix=f.mesh.instanceMatrix,uv=f.mesh.geometry.getAttribute('kitRegion'),m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
let max=0,coverChecks=0;
for(let act=3;act<=5;act++)for(let room=0;room<5;room++)for(let round=0;round<5;round++){
 const layout=journeyRoomLayout(act,room,round),before=JSON.stringify(layout),offset=act===4?{x:11,z:-1}:{x:0,z:0};
 f.view.setLayout(layout,offset);assert.equal(JSON.stringify(layout),before);const d=f.view.diagnostics();max=Math.max(max,d.instances);
 assert(d.instances<=96&&d.triangles<=192&&d.drawCalls===1&&d.lights===0&&d.raf===0&&!d.collisionOwned);assert.equal(f.mesh.instanceMatrix,matrix);
 for(let i=0;i<f.mesh.count;i++){
  f.mesh.getMatrixAt(i,m);assert(m.elements.every(Number.isFinite));m.decompose(p,q,s);assert(Math.abs(s.y-s.z)<1e-5,'card tilt retains its source angle');
  const x0=uv.getX(i),x1=x0+uv.getZ(i),y0=uv.getY(i),y1=y0+uv.getW(i);assert(Math.min(x0,x1)>=0&&Math.max(x0,x1)<=1&&y0>=0&&y1<=1);
 }
 for(let i=0;i<layout.cover.length;i++){
  f.mesh.getMatrixAt(f.mesh.count-layout.cover.length+i,m);m.decompose(p,q,s);const c=layout.cover[i];assert(Math.abs(p.x-c.x-offset.x)<1e-5&&Math.abs(p.z-c.z-offset.z-.12)<1e-5);assert(s.x<=c.w&&s.y<=1.05+1e-6);coverChecks++;
 }
 const versions=[matrix.version,uv.version,f.mesh.instanceColor.version],writes=d.matrixWrites;
 for(let frame=0;frame<500;frame++){f.view.setLayout(layout,offset);f.view.setActive(true);}
 assert.deepEqual([matrix.version,uv.version,f.mesh.instanceColor.version],versions);assert.equal(f.view.diagnostics().matrixWrites,writes);assert.equal(f.loads.length,1);
}
f.view.setActive(false);assert.equal(f.view.diagnostics().drawCalls,0);f.view.setLayout(null,{sector:1});assert.equal(f.view.diagnostics().drawCalls,0,'layout changes do not wake a hidden mode');
f.view.setActive(true);for(let sector=0;sector<5;sector++){f.view.setLayout(null,{sector});assert(f.view.diagnostics().instances<=20);}
f.view.setLayout({act:'skyway',room:99,round:0,cover:[null,{x:NaN,z:0,w:1,d:1}]});assert.equal(f.view.diagnostics().instances,6,'invalid covers leave only the valid outer islands');
let disposed=0;for(const r of [f.mesh.geometry,f.mesh.material,f.loads[0].texture])r.addEventListener('dispose',()=>disposed++);f.view.dispose();f.view.dispose();assert.equal(disposed,3);assert.equal(f.parent.children.length,0);
const delayed=fixture(true);delayed.view.setLayout(journeyRoomLayout(4));delayed.view.setActive(true);assert(delayed.loads[0].url.endsWith('-mobile.webp'));delayed.loads[0].fail();assert.equal(delayed.view.diagnostics().drawCalls,0);let late=0;delayed.loads[0].texture.addEventListener('dispose',()=>late++);delayed.view.dispose();delayed.loads[0].ready(delayed.loads[0].texture);assert.equal(late,1,'late callback cannot resurrect or double-dispose the same texture');assert.equal(delayed.view.diagnostics().drawCalls,0);
for(const suffix of ['','-mobile']){const b=fs.readFileSync(new URL('../public/assets/journey/journey-world-kit-v1'+suffix+'.webp',import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert(b.length<(suffix?180_000:600_000));}
console.log(JSON.stringify({test:'Journey world kit',layouts:75,coverChecks,staticCalls:37500,maxCards:max,drawCalls:1,lights:0,raf:0,loading:'lazy/failed/late/hidden/dispose once',claim:'CPU/Three scene contracts; native visual and physical-device QA separate'}));
