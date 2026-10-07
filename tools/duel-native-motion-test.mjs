import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {DUEL_NATIVE_MOTION,nativeMotionKey,nativeMotionReady,nativeMotionFrame,nativeMotionPortrait,nativeActionFrame} from '../src/duel-native-motion.js';
import {DUEL_ORDER,DUEL_CHARACTERS,createDuel,stepDuel} from '../src/seed-duel-rules.js';
const id='final-refractlance-reflect',m=DUEL_NATIVE_MOTION[id],assets={},fixture=JSON.parse(readFileSync(new URL('./duel-native-motion-art-fixture.json',import.meta.url)));
assert.equal(fixture.length,2);assert.equal(m.artReady,false);assert.equal(m.previewOnly,true);
for(let i=0;i<2;i++){
 const f=fixture[i],bytes=readFileSync(new URL('../public/'+f.path,import.meta.url));
 assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert(bytes.length<200000);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes[20]&16);
 assert.equal(bytes.readUIntLE(24,3)+1,m.width);assert.equal(bytes.readUIntLE(27,3)+1,m.height);
 assert.equal(f.alphaExact,true);assert.equal(f.poses.length,4);assert(f.poses.every(p=>p.edge16===0));
 assert.equal('assets/'+m.files[i],f.path);assets[nativeMotionKey(id,i)]={naturalWidth:m.width,naturalHeight:m.height,key:i};
}
assert.equal(new Set(fixture.flatMap(f=>f.poses.map(p=>p.rgbaSha256))).size,8);
assert(nativeMotionReady(id,assets,true));assert(!nativeMotionReady(id,assets,false));assert(!nativeMotionFrame(id,0,assets,false));assert(!nativeMotionFrame(id,-1,assets,true));assert(!nativeMotionFrame(id,8,assets,true));
const half={[nativeMotionKey(id,0)]:assets[nativeMotionKey(id,0)]};assert(!nativeMotionReady(id,half,true));assert(!nativeMotionFrame(id,0,half,true));
for(let i=0;i<8;i++){
 const p=nativeMotionFrame(id,i,assets,true),[,x,y,w,h,ax,ay]=m.frames[i];assert.deepEqual(p.src,[x,y,w,h]);
 assert.equal(p.image,assets[nativeMotionKey(id,Math.floor(i/4))]);
 assert(Math.abs(p.dst[0]+ax*p.dst[2]/w)<1e-12);assert(Math.abs(p.dst[1]+ay*p.dst[3]/h)<1e-12);
 assert(Math.abs(p.dst[2]/p.dst[3]-w/h)<1e-12,'native aspect ratio must survive');
 assert.deepEqual(p.src,fixture[Math.floor(i/4)].poses[i%4].source);
}
assert.equal(m.frames[5][5],194,'heavy-hit mirror head must not become the foot pivot');assert.equal(m.frames[5][6],545);
assert(!nativeMotionPortrait(id,false));assert.equal(nativeMotionPortrait(id,true).file,m.files[0]);
// The actual renderer must dispatch all eight native regions, including its
// existing mirror transform and flash; unchanged public fighters must retain
// exactly their previous canvas operations.
const current=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
const baseline=JSON.parse(readFileSync(new URL('./duel-native-motion-public-baseline.json',import.meta.url),'utf8'));
const previous=baseline.body+'\n function fighterDraw(';
const body=source=>source.slice(source.indexOf(' function body('),source.indexOf(' function fighterDraw('));
const tables=current.split('\n').filter(l=>/^const (FINAL\d+_(HEIGHT|FEET)|SOLO\d+_FEET|FUSION\d+_(HEIGHT|FEET)|FUSION_POSES|FROST_POSES)=/.test(l)).join('\n');
const modules={};for(let i=8;i<=59;i++){const key='DUEL_BATCH'+String(i).padStart(2,'0');modules[key]=(await import('../src/seed-duel-batch'+String(i).padStart(2,'0')+'.js'))[key];}
function renderer(source,inspection,images,authoredTables=tables){const calls=[],ctx=new Proxy({}, {get:(_,name)=>(...args)=>calls.push([name,...args]),set:(_,name,value)=>(calls.push(['set',name,value]),true)}),scope={...modules,ctx,inspection,released:false,DUEL_NATIVE_MOTION,assets:images,s:{boss:false},characters:{...DUEL_CHARACTERS,[id]:modules.DUEL_BATCH31[id]},nativeMotionFrame,nativeMotionReady,nativeActionFrame};vm.createContext(scope);vm.runInContext(authoredTables+'\n'+body(source)+'\nthis.paint=body;',scope);return{scope,calls};}
const native=renderer(current,true,assets);
for(let i=0;i<8;i++)for(const fx of [-1,1]){native.calls.length=0;native.scope.paint({char:id,fx,team:0},10,12,{frame:i,flash:.4});assert.equal(native.calls.filter(c=>c[0]==='drawImage').length,2);assert(native.calls.some(c=>c[0]==='scale'&&c[1]===fx));assert(!native.calls.some(c=>c[0]==='ellipse'),'actual native body must replace placeholder');}
const combat=createDuel({player:id,enemy:'burst',inspection:true,practice:true});combat.phase='fight';Object.assign(combat.fighters[0],{x:15,y:10,fx:1,fy:0});Object.assign(combat.fighters[1],{x:16.4,y:10});
stepDuel(combat,1/60,{attack:true},{});assert.equal(nativeActionFrame(combat.fighters[0],1),1);
for(let i=0;i<8;i++)stepDuel(combat,1/60,{},{});
assert.equal(combat.fighters[0].state,'attack');assert(combat.fighters[0].hitDone);assert(combat.fighters[1].hp<combat.fighters[1].maxHp);assert.equal(nativeActionFrame(combat.fighters[0],1),5);
native.calls.length=0;native.scope.paint(combat.fighters[0],10,12,{frame:1});assert.equal(native.calls.find(c=>c[0]==='drawImage')[1],assets[nativeMotionKey(id,1)],'actual completed first contact shows forward release, not backswing');
const pierce='final-refractlance-pierce',pm=DUEL_NATIVE_MOTION[pierce],passets={},pfixture=JSON.parse(readFileSync(new URL('./duel-native-motion-pierce-art-fixture.json',import.meta.url)));
assert.equal(pm.previewOnly,true);assert.equal(pm.artReady,false);assert.equal(pfixture.length,2);
for(let i=0;i<2;i++){
 const f=pfixture[i],bytes=readFileSync(new URL('../public/'+f.path,import.meta.url));
 assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert(bytes.length<200000);assert(bytes[20]&16);
 assert.equal(bytes.readUIntLE(24,3)+1,pm.width);assert.equal(bytes.readUIntLE(27,3)+1,pm.height);assert(f.alphaExact);assert(f.poses.every(p=>p.edge16===0));
 assert.equal('assets/'+pm.files[i],f.path);passets[nativeMotionKey(pierce,i)]={naturalWidth:pm.width,naturalHeight:pm.height,key:'pierce'+i};
}
assert.equal(new Set(pfixture.flatMap(f=>f.poses.map(p=>p.rgbaSha256))).size,8);
assert(!nativeMotionReady(pierce,passets,false));assert(!nativeMotionReady(pierce,{[nativeMotionKey(pierce,0)]:passets[nativeMotionKey(pierce,0)]},true));
const pdraw=renderer(current,true,passets);pdraw.scope.characters[pierce]=modules.DUEL_BATCH31[pierce];
for(let i=0;i<8;i++)for(const fx of [-1,1]){
 const p=nativeMotionFrame(pierce,i,passets,true);assert.deepEqual(p.src,pfixture[Math.floor(i/4)].poses[i%4].source);assert(Math.abs(p.dst[2]/p.dst[3]-p.src[2]/p.src[3])<1e-12);
 pdraw.calls.length=0;pdraw.scope.paint({char:pierce,fx,team:0},10,12,{frame:i,flash:.4});assert.equal(pdraw.calls.filter(c=>c[0]==='drawImage').length,2);assert(!pdraw.calls.some(c=>c[0]==='ellipse'));
 assert.equal(nativeActionFrame({char:pierce,state:'attack',step:0,hitDone:true},i),i,'pierce forward jab must not use reflect backswing remapping');
}
assert.equal(nativeMotionPortrait(pierce,true).file,pm.files[0]);assert(!nativeMotionPortrait(pierce,false));
for(const char of DUEL_ORDER){const images={solo:{naturalWidth:1024,naturalHeight:768},['motion-'+char]:{naturalWidth:1774,naturalHeight:887}},a=renderer(previous,false,images,baseline.tables),b=renderer(current,false,images);for(let frame=0;frame<8;frame++)for(const fx of [-1,1]){a.calls.length=b.calls.length=0;const f={char,fx,team:0};a.scope.paint(f,2,3,{frame,flash:.2});b.scope.paint(f,2,3,{frame,flash:.2});assert.equal(JSON.stringify(b.calls),JSON.stringify(a.calls),'public renderer changed '+char+'/'+frame+'/'+fx);}}
console.log('Native two-sheet motion: both characters eight actual renderer frames/both facings, alpha/hash/uncut regions/foot pivots and 576 unchanged public draws PASS. Preview only; native warm fringe and human/device approval remain open.');
