// Development-only exporter. Runtime Journey metadata has no Duel imports.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {LAWS} from '../src/laws.js';
import {DISCOVERY_FORMS} from '../src/forms.js';
import {DUEL_RELEASE_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {DUEL_NATIVE_MOTION,nativeMotionKey,nativeMotionReady,nativeMotionFrame,nativeActionFrame} from '../src/duel-native-motion.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reportArg=process.argv.find(a=>a.startsWith('--report='));
const reportOnly=process.argv.includes('--report-only');
const check=process.argv.includes('--check');
const source=readFileSync(resolve(root,'src/seed-duel-view.js'),'utf8');
const constants=source.slice(source.indexOf('const FIRST_GUESTS='),source.indexOf('export function mountSeedDuel'));
const body=source.slice(source.indexOf(' function body(f,x,y,'),source.indexOf(' function fighterDraw(f)'));
assert.ok(constants.startsWith('const FIRST_GUESTS='));
assert.ok(body.startsWith(' function body('));
const bindings={DUEL_ORDER,DUEL_NATIVE_MOTION,nativeMotionKey,nativeMotionReady,nativeMotionFrame,nativeActionFrame,
  characters:DUEL_RELEASE_CHARACTERS,inspection:false,released:true,s:null};
for(let i=8;i<=30;i++){
  const n=String(i).padStart(2,'0'),module=await import(pathToFileURL(resolve(root,`src/seed-duel-batch${n}.js`)));
  bindings[`DUEL_BATCH${n}`]=module[`DUEL_BATCH${n}`];
}
let draws=[];
bindings.ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(image,...args){draws.push({image,args});}};
bindings.spritePaint={draw(ctx,image,...args){draws.push({image,args});}};
bindings.assets={};
const context=vm.createContext(bindings);
vm.runInContext(`${constants}\n${body}\nglobalThis.journeySource={motionFile,body,MOTION};`,context,{timeout:1000});

// Read encoded image headers only; do not resample, replace, or derive pixels.
function dimensions(data){
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  for(let offset=12;offset+8<=data.length;){
    const chunk=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4),p=offset+8;
    if(chunk==='VP8X')return [data.readUIntLE(p+4,3)+1,data.readUIntLE(p+7,3)+1];
    if(chunk==='VP8L'){assert.equal(data[p],47);const bits=data.readUInt32LE(p+1);return [(bits&16383)+1,((bits>>>14)&16383)+1];}
    if(chunk==='VP8 '){assert.equal(data.toString('hex',p+3,p+6),'9d012a');return [data.readUInt16LE(p+6)&16383,data.readUInt16LE(p+8)&16383];}
    offset=p+size+(size%2);
  }
  throw new Error('No WebP dimensions');
}
const images=new Map(),failures=[],entries=[];
function image(file){
  if(images.has(file))return images.get(file);
  const path=resolve(root,'public/assets',file);assert.ok(existsSync(path),`missing ${file}`);
  const bytes=readFileSync(path),[naturalWidth,naturalHeight]=dimensions(bytes);
  const record={file,naturalWidth,naturalHeight,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  images.set(file,record);return record;
}
const expected=[...Object.keys(LAWS),...Object.keys(DISCOVERY_FORMS)];
assert.equal(expected.length,162);assert.equal(new Set(expected).size,162);
const combos=new Map();
for(const [id,c] of Object.entries(DUEL_RELEASE_CHARACTERS)){
  const key=c.comboId??(Object.hasOwn(LAWS,id)?id:null);if(!key||!expected.includes(key))continue;
  assert.ok(!combos.has(key),`duplicate original identity ${key}`);combos.set(key,id);
}
assert.equal(combos.size,162);
for(const bodyId of expected){
  const fighterId=combos.get(bodyId),character=DUEL_RELEASE_CHARACTERS[fighterId],native=DUEL_NATIVE_MOTION[fighterId];
  try{
    const files=native?[...native.files]:[context.journeySource.motionFile(fighterId)];
    assert.ok(native||context.journeySource.MOTION.includes(fighterId),`no eight-pose renderer ${fighterId}`);
    const imgs=files.map(image);
    bindings.assets={};context.assets=bindings.assets;
    if(native)imgs.forEach((im,i)=>context.assets[nativeMotionKey(fighterId,i)]=im);
    else context.assets['motion-'+fighterId]=imgs[0];
    const frames=[];
    for(let frame=0;frame<8;frame++){
      draws=[];context.journeySource.body({char:fighterId,fx:1,state:'idle',step:0,hitDone:false},0,0,{frame});
      assert.equal(draws.length,1,`${fighterId} pose ${frame} draws`);
      const draw=draws[0],file=imgs.indexOf(draw.image),src=draw.args.slice(0,4),dst=draw.args.slice(4,8);
      assert.ok(file>=0);assert.equal(draw.args.length,8);
      assert.ok([...src,...dst].every(Number.isFinite));assert.ok(src[2]>0&&src[3]>0&&dst[2]>0&&dst[3]>0);
      assert.ok(src[0]>=0&&src[1]>=0&&src[0]+src[2]<=imgs[file].naturalWidth+.001&&src[1]+src[3]<=imgs[file].naturalHeight+.001,`${fighterId} pose ${frame} outside image`);
      const foot=[-dst[0]/dst[2]*src[2],-dst[1]/dst[3]*src[3]];
      frames.push({file,src,dst,foot});
    }
    const form=DISCOVERY_FORMS[bodyId];
    const kind=Object.hasOwn(LAWS,bodyId)?'base':character.twin?'twin':character.final?'final':character.solo?'solo':'fusion';
    entries.push({bodyId,fighterId,name:form?.name??LAWS[bodyId]?.name??character.name,kind,files,
      dimensions:imgs.map(im=>[im.naturalWidth,im.naturalHeight]),frames,native:Boolean(native)});
  }catch(error){failures.push({bodyId,fighterId,error:String(error.message??error)});}
}
const counts=Object.fromEntries(['base','solo','fusion','final','twin'].map(kind=>[kind,entries.filter(e=>e.kind===kind).length]));
const report={version:1,expected:162,extracted:entries.length,counts,excludedIndependent:Object.keys(DUEL_RELEASE_CHARACTERS).filter(id=>![...combos.values()].includes(id)),
  failures,native:entries.filter(e=>e.native).length,legacy:entries.filter(e=>!e.native).length,
  uniqueFiles:images.size,maxFilesPerIdentity:Math.max(...entries.map(e=>e.files.length)),
  maxDecodedIdentityBytes:Math.max(...entries.map(e=>e.dimensions.reduce((sum,[w,h])=>sum+w*h*4,0))),
  maxDimensions:[Math.max(...[...images.values()].map(i=>i.naturalWidth)),Math.max(...[...images.values()].map(i=>i.naturalHeight))],
  sourceSha256:createHash('sha256').update(source).digest('hex'),images:[...images.values()],entries};
if(reportArg)writeFileSync(reportArg.slice(9),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,images:undefined,entries:undefined},null,2));
assert.equal(failures.length,0);assert.equal(entries.length,162);
if(!reportOnly){
  const rows=entries.map(({bodyId,...entry})=>`  ${JSON.stringify(bodyId)}:${JSON.stringify(entry)}`).join(',\n');
  const output=`// Generated by tools/build-journey-duel-art.mjs from the shipping Duel renderer.\n// Exact 9 base + 153 original forms, excluding 13 independent guests.\n// These are eight authored action poses facing right, not walking/back views.\n// Destination and crop-foot metadata preserve character-specific source alignment.\nconst entries={\n${rows}\n};\nfor(const art of Object.values(entries)){\n art.files=Object.freeze(art.files);\n art.dimensions=Object.freeze(art.dimensions.map(Object.freeze));\n art.frames=Object.freeze(art.frames.map(frame=>Object.freeze({...frame,src:Object.freeze(frame.src),dst:Object.freeze(frame.dst),foot:Object.freeze(frame.foot)})));\n Object.freeze(art);\n}\nexport const JOURNEY_DUEL_ART=Object.freeze(entries);\nexport const JOURNEY_DUEL_ORDER=Object.freeze(Object.keys(entries));\nexport const JOURNEY_DUEL_ART_TOTAL=JOURNEY_DUEL_ORDER.length;\n`;
  const target=resolve(root,'src/journey-duel-art.js');
  if(check)assert.equal(readFileSync(target,'utf8').replaceAll('\r\n','\n'),output,'Journey metadata must match the shipping Duel renderer; run exporter to regenerate');
  else writeFileSync(target,output);
}
