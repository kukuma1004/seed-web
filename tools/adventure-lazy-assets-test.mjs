import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,statSync} from 'node:fs';
import {defenseBodyParts} from '../src/seed-defense-art.js';
import {ITEM_ATLAS} from '../src/item-art.js';
import {DEFENSE_FORMS} from '../src/seed-defense-catalog.js';

// Execute the shipping view's loading/render entry points with controlled
// Image completion. This is lifecycle/load evidence, not browser pixel QA.
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const line=prefix=>source.split('\n').find(l=>l.trimStart().startsWith(prefix));
const span=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const requestLog=[],images=[],draws=[],root={dataset:{}},assets={},state={formId:null};
class ControlledImage{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 set src(value){this.url=value;if(value)requestLog.push(value);}
 get src(){return this.url;}
 decode(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=768;this.onload?.();}
}
const noop=()=>{},ctx=new Proxy({drawImage:(...a)=>draws.push(a),measureText:text=>({width:text.length*12}),fillText:(...a)=>draws.push(['label',...a])},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const context=vm.createContext({Image:ControlledImage,location:{hostname:'127.0.0.1',search:'?inspect=1'},URLSearchParams,document:{hidden:false,body:{classList:{remove:noop}}},BASE:'/seed/',root,assets,ITEM_ATLAS,closed:false,draw:()=>draws.push('ready'),s:state,defenseBodyParts,ctx,point:(x,y)=>({x,y}),width:640,height:360,scale:30,combat:null,formBuffer:[],circle:noop,INK:{},motion:{},seedMotionFrame:()=>-1,paintEvolvedBody:()=>false,paintSeedMotion:()=>false,glow:noop,leaf:noop,moving:false,vfx:{ready:()=>false},resetBossAccount:noop,gardenPainter:{dispose:noop},stop:noop,resetInput:noop,listeners:[],audio:{setPaused:noop},onClose:noop});root.remove=noop;
vm.runInContext(line('const OPTIONAL_ART=')+'\n'+span(' const assetPaths=',' load(\'arena\'')+'\n'+span(' load(\'arena\'',' // ③')+'\n'+line("load('garden'")+'\n'+span(' if(pet?.file)',' // 2026-09-28 사용자: 이미 있는').replace('if(pet?.file)load(\'pet\',pet.file);','')+'\n'+line("load('projectile'")+'\n'+"let evolvedParts=null,evolvedFor='';\n"+line('function ensureEvolvedAssets()')+'\n'+span(' function paintEvolvedBody(',' function paintSeedMotion(')+'\n'+line('function paintFormVisuals()')+'\n'+line('function label(')+'\n'+line('function close()')+'\n'+"globalThis.probe={load,ensureAsset,ensureEvolvedAssets,paintEvolvedBody,paintFormVisuals,label,releaseImage,close,stats(){return {requests:assetRequests,optionalBytes,owned:ownedImages.size};},optional:OPTIONAL_ART};",context);
const p=context.probe;
assert.equal(requestLog.length,12,'new seed requests only the 12 essential owned images');
assert.equal(p.stats().optionalBytes,0);assert.equal(root.dataset.assetDeferredBytes,'1661086');
for(const [key,[path,bytes]] of Object.entries(p.optional)){
 assert.equal(statSync(new URL('../public/assets/'+path,import.meta.url)).size,bytes,'optional budget reflects actual unchanged file: '+key);
 assert.ok(!requestLog.some(url=>url.endsWith(path)),key+' is absent from initial request group');
}
assert.equal(p.ensureEvolvedAssets(),false);assert.equal(p.paintEvolvedBody({},0),false,'no form keeps the original seed');
state.formId='rewind';assert.equal(p.ensureEvolvedAssets(),false);assert.ok(assets.solo);assert.equal(p.paintEvolvedBody({},0),false,'in-flight evolution falls back to visible basic seed');
for(let i=0;i<100;i++)p.ensureEvolvedAssets();assert.equal(p.stats().requests,13,'repeated HUD/draw probes deduplicate request');
assets.solo.naturalWidth=1024;assert.equal(p.ensureEvolvedAssets(),false,'dimensions alone do not prove decode completion');assets.solo.decode();assert.equal(p.ensureEvolvedAssets(),true);
state.formId='returnblade';assert.equal(p.ensureEvolvedAssets(),false);assets.fusion.decode();assert.equal(p.ensureEvolvedAssets(),true);
state.formId='returningbloom';assert.equal(p.ensureEvolvedAssets(),true,'twin uses already loaded solo body parts');
state.formId='mirrorhall';assert.equal(p.ensureEvolvedAssets(),false);assets.awaken.decode();assert.equal(p.ensureEvolvedAssets(),true);
const composite=Object.values(DEFENSE_FORMS).find(f=>f.kind==='final'&&new Set(defenseBodyParts({formId:f.id}).map(part=>part.atlas)).size===2);assert.ok(composite);state.formId=composite.id;assets.solo.complete=false;assert.equal(p.ensureEvolvedAssets(),false,'a two-atlas body waits for every part');assets.solo.decode();assert.equal(p.ensureEvolvedAssets(),true);
context.combat={visuals:()=>[{spriteKey:'orbit',x:1,y:2,size:1,cell:0,angle:0,orbit:true}]};p.paintFormVisuals();assert.ok(assets.orbit);assert.ok(!assets.orbitAdvanced&&!assets.comet&&!assets.combo,'an orbit does not preload other effect sheets');
for(let i=0;i<30;i++)p.paintFormVisuals();assert.equal(p.stats().requests,16);assets.orbit.decode();p.paintFormVisuals();assert.ok(draws.some(d=>Array.isArray(d)&&d[0]===assets.orbit),'ready live orbit draws the original sheet');
for(const [spriteKey,key] of [['advancedOrbit','orbitAdvanced'],['comet','comet'],['combo','combo']]){context.combat={visuals:()=>[{spriteKey,x:1,y:2,size:1,cell:0,angle:0}]};p.paintFormVisuals();assert.ok(assets[key]);}
assert.equal(p.stats().optionalBytes,1661086);assert.equal(root.dataset.assetDeferredBytes,'0');
const old=p.load('gardenDecor','garden/objects-greenhouse-v1.webp'),late=old.onload,newDecor=p.load('gardenDecor','garden/objects-moon-v1.webp');assert.equal(old.onload,null);const before=draws.length;late();assert.equal(draws.length,before,'stale replaced load cannot redraw current art');
context.document.hidden=true;newDecor.decode();assert.equal(draws.length,before,'hidden image completion does not render a frame');context.document.hidden=false;newDecor.decode();assert.equal(draws.length,before+1);
draws.length=0;p.label(638,80,'출구 · 수호 무리를 물리치면 열려요');const label=draws.find(d=>d[0]==='label');assert.ok(label[2]<638&&label[2]>0);assert.equal(label[4],624,'caption width is bounded to viewport');const count=draws.length;p.label(700,80,'offscreen');p.label(80,-1,'offscreen');assert.equal(draws.length,count,'offscreen anchor labels are culled');
const closing=newDecor.onload;context.combat=null;p.close();assert.equal(p.stats().owned,0);for(const im of images){assert.equal(im.onload,null);assert.equal(im.src,'');}const done=draws.length;closing();assert.equal(draws.length,done,'late closed load never redraws');assert.equal(p.load('solo','cute/seed-solo-v1.webp'),null,'closed view cannot start new downloads');
const publicRoot={dataset:{}},publicContext=vm.createContext({Image:ControlledImage,location:{hostname:'kukuma1004.github.io',search:'?inspect=1'},URLSearchParams,document:{hidden:false},BASE:'/seed/',root:publicRoot,assets:{},closed:false,draw:noop});vm.runInContext(line('const OPTIONAL_ART=')+'\n'+span(' const assetPaths=',' load(\'arena\'')+"\nload('seed','cute/seed-body-v1.webp');",publicContext);assert.deepEqual(publicRoot.dataset,{},'public origin cannot enable private byte diagnostics through query alone');
assert.ok(source.includes("objective.kind==='exit'||!s.enemies.some"),'HUD still computes an open-exit route under optional nearby enemies');
assert.ok(source.includes("if(objective.kind!=='exit'&&s.enemies.some"),'drawing keeps that open-exit route visible');
console.log('PASS Adventure shipping lazy Image lifecycle: 12 initial requests, 1661086 B deferred, canonical body readiness/fallback, exact VFX demand, deduplication, hide/replace/close guards and viewport labels. Not browser/device battery evidence.');
