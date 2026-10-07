import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionAllyArt,expeditionGardenAssetBatch} from '../src/expedition/art.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {expeditionNativeMotion,expeditionNativeFrame,expeditionNativeSequence,expeditionNativeSpriteMarkup} from '../src/expedition/native-motion.js';
import {expeditionSpriteSequence} from '../src/expedition/sprite-motion.js';
import {nativeMotionFrame,nativeMotionKey,nativeMotionReady} from '../src/duel-native-motion.js';

function webpSize(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 for(let p=12;p+8<bytes.length;){
  const type=bytes.toString('ascii',p,p+4),n=bytes.readUInt32LE(p+4),at=p+8;
  if(type==='VP8X')return [bytes.readUIntLE(at+4,3)+1,bytes.readUIntLE(at+7,3)+1];
  if(type==='VP8L'){const bits=bytes.readUInt32LE(at+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  if(type==='VP8 ')return [bytes.readUInt16LE(at+6)&0x3fff,bytes.readUInt16LE(at+8)&0x3fff];
  p=at+n+(n%2);
 }
 throw Error('missing native WebP dimensions');
}
let connected=0,individuals=0,twins=0,poses=0,mixedFiles=0;
const nativeIds=[],enemy={id:'enemy',speciesId:'meadow-normal-0',side:'enemy',hp:40};
for(const species of Object.values(EXPEDITION_SPECIES)){
 const art=expeditionAllyArt(species.id),entry=expeditionNativeMotion(species.id);
 if(!art.nativeMotionId)continue;
 nativeIds.push(species.id);connected++;species.kind==='twin'?twins++:individuals++;
 assert(entry);assert.equal(art.ready,false);assert.equal(entry.motion.artReady,false);
 assert.equal(species.representation,species.kind==='twin'?'pair':'individual');
 const assets={},m=entry.motion;
 for(const [i,path] of m.files.entries()){
  const size=webpSize(readFileSync(new URL(`../public/assets/${path}`,import.meta.url)));
  assert.deepEqual(size,m.dimensions?.[i]||[m.width,m.height],`${species.id} file${i} native dimensions`);
  assets[nativeMotionKey(entry.id,i)]={naturalWidth:size[0],naturalHeight:size[1]};
  if(m.dimensions?.[i])mixedFiles++;
 }
 assert(nativeMotionReady(entry.id,assets,true));assert(!nativeMotionReady(entry.id,assets,false),'reuse must not promote duel readiness');
 for(let pose=0;pose<8;pose++){
  const frame=expeditionNativeFrame(species.id,pose),duel=nativeMotionFrame(entry.id,pose,assets,true);assert(frame&&duel);
  assert.deepEqual(frame.source,duel.src,'same unmodified native source region as the existing duel renderer');
  assert(Math.abs(frame.width/100-duel.dst[2]/3)<1e-12);
  assert(Math.abs(frame.height/100-duel.dst[3]/3)<1e-12,'preserve source aspect ratio');
  assert(Math.abs(frame.left+frame.width*frame.anchor[0]/frame.source[2]-50)<1e-10,'measured sole horizontal anchor');
  assert(Math.abs(frame.top+frame.height*frame.anchor[1]/frame.source[3]-88)<1e-10,'every pose shares the same ground plane');
  assert.equal(frame.ready,false);poses++;
 }
 const actor={id:'ally',speciesId:species.id,side:'ally',hp:40},units=[actor,enemy],before=JSON.stringify(units);
 for(const kind of ['attack','skill1','skill2','awaken','guard']){
  const events=[{type:'action',unitId:'ally',kind,seq:2}],seq=expeditionSpriteSequence(actor,units,events),native=expeditionNativeSequence(actor,units,events,seq);
  assert(native);assert.equal(native.duration,720);assert.equal(native.rest.pose,0);
  const markup=expeditionNativeSpriteMarkup(species.id,native,path=>`./assets/${path}`,-210);
  assert.equal((markup.match(/<i /g)||[]).length,3);assert(markup.includes('data-native-phase="impact"'));
  assert(markup.includes('--feedback-delay:-210ms'));assert(!markup.includes('class="exv-motion'),'native frames use explicit clipped regions, including sheets whose measured regions happen to form a grid');
 }
 const hitEvents=[{type:'damage',unitId:'enemy',targetId:'ally',amount:12}];
 const hit=expeditionNativeSequence(actor,units,hitEvents,expeditionSpriteSequence(actor,units,hitEvents));assert.equal(hit.impact.pose,7);
 const dead={...actor,dead:true,hp:0},death=expeditionNativeSequence(dead,[dead,enemy],[],expeditionSpriteSequence(dead,[dead,enemy],[]));
 assert.equal(death.animate,false);assert.equal(death.rest.pose,7);
 assert.equal((expeditionNativeSpriteMarkup(species.id,death,path=>path).match(/<i /g)||[]).length,1,'idle/dead only request the current sheet');
 assert.equal(JSON.stringify(units),before,'motion never mutates HP, resources or pair identity');
}
assert.deepEqual({connected,individuals,twins,poses},{connected:95,individuals:59,twins:36,poses:760});assert(mixedFiles>0);
for(const pose of [-1,8,1.5,NaN])assert.equal(expeditionNativeFrame(nativeIds[0],pose),null);
assert.equal(expeditionNativeFrame('unknown',0),null);
assert.equal(expeditionNativeFrame('pierce',0),null,'canonical sheets keep their existing renderer');
const defender={id:'ally',speciesId:'final-refractlance-reflect',side:'ally',hp:40},defenseEvents=[{type:'action',unitId:'ally',kind:'skill1',seq:2}];
const defenseBeat=expeditionNativeSequence(defender,[defender,enemy],defenseEvents,expeditionSpriteSequence(defender,[defender,enemy],defenseEvents));
assert.equal(defenseBeat.impact.pose,6,'pure protection/counter preparation must show the authored shield, not invent a damaging heavy swing');
const party=nativeIds.filter(id=>EXPEDITION_SPECIES[id].kind!=='twin').slice(0,8),urls=expeditionGardenAssetBatch('snow',{partySpeciesIds:party,includeEncounter:true,base:'/seed-web/'});
assert(urls.length<=26,'maximum eight two-file current allies + three field layers + seven enemy thumbs');
const allowed=new Set(party.flatMap(id=>expeditionAllyArt(id).nativeFiles));
for(const url of urls.filter(url=>url.includes('/duel/')))assert(allowed.has(url.slice('/seed-web/assets/'.length)),'never preload another character');
assert(!urls.some(url=>/fields\/(?!snow-)/.test(url)),'never preload another garden');
const css=readFileSync(new URL('../src/expedition/view.css',import.meta.url),'utf8'),view=readFileSync(new URL('../src/expedition/view.js',import.meta.url),'utf8');
assert.match(css,/exv-native-impact\{0%,23\.999%\{visibility:hidden\}24%,61\.999%\{visibility:visible\}/);
assert.match(css,/prefers-reduced-motion:reduce.*exv-native-sequence/s);
assert.match(view,/native\.classList\.remove\('exv-native-sequence'\)/,'hide/close cancels a pending native beat');
assert.match(view,/if\(art\?\.nativeMotionId\)/);assert.match(view,/exv-codex-native/);
console.log(`PASS ${individuals} individual native actors + ${twins} pair codex illustrations/${poses} unmodified source poses; native dimensions/scale/anchors, finite CSS phases, lazy party assets, no readiness/state promotion. Physical-device and human art acceptance pending.`);
