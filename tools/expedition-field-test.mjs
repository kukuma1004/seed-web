import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {expeditionFieldPlacement} from '../src/expedition/field-presentation.js';
import {expeditionGardenArt,expeditionAssetUrl} from '../src/expedition/art.js';

let cases=0;
for(const [width,height] of [[1280,660],[844,342],[390,796],[320,520],[2560,1000],[1024,700]]){
 for(const progress of [-1,0,.1,.5,.9,1,2,NaN]){
  const p=expeditionFieldPlacement({width,height,progress});assert.ok(p&&Object.isFrozen(p));assert.ok(Math.abs(p.width/p.height-1.5)<1e-12,'preserve native plate aspect ratio');assert.equal(p.groundY,height*.76);assert.ok(Math.abs(p.top+p.height*.76-p.groundY)<1e-8,'same vertical stone contact at all aspects');assert.ok(p.top<=0&&p.top+p.height>=height-1e-8,'no exposed vertical edge');
  for(const offset of p.offsets){assert.ok(offset<=1e-8,'no exposed left edge');assert.ok(offset+p.width>=width-1e-8,'no exposed right edge');assert.ok(Number.isFinite(offset));}
  if(progress===1){assert.ok(Math.abs(p.offsets[0]+(p.width-width)/2)<Math.abs(p.offsets[1]+(p.width-width)/2));assert.ok(Math.abs(p.offsets[1]+(p.width-width)/2)<Math.abs(p.offsets[2]+(p.width-width)/2));}
  cases++;
  // Measured moon bounds on the authored native far plate. The landmark was
  // completely cropped out in short landscape under the legacy shared top.
  const moonArt=expeditionGardenArt('moon');
  const moon=expeditionFieldPlacement({width,height,progress,farAnchorY:moonArt.farFraming.anchorY,farFocalX:moonArt.farFraming.focalX});
  const scale=moon.width/1536;
  assert.ok(moon.offsets[0]+1150*scale>=0&&moon.offsets[0]+1330*scale<=width,'full moon remains within horizontal crop');
  assert.ok(moon.farTop+140*scale>=0&&moon.farTop+320*scale<=height,'full moon remains within vertical crop');
  assert.equal(moon.middleTop,p.middleTop,'distant focus never changes walking contact');
  assert.equal(moon.foregroundTop,p.foregroundTop,'distant focus never changes foreground crop');
  assert.deepEqual(moon.offsets.slice(1),p.offsets.slice(1));
  assert.ok(moon.farTop<=0&&moon.farTop+moon.height>=height,'no exposed far-plate edge');
  // Measured native alpha bounds; actual browser checks cover contact and
  // foreground occlusion independently of these crop/coverage invariants.
  for(const [garden,minVisibleY] of [['snow',908],['blossom',887],['autumn',885],['moon',896],['fire',889],['shadow',861],['dream',905]]){
   const field=expeditionFieldPlacement({width,height,progress,foregroundStart:expeditionGardenArt(garden).foregroundStart});
   const firstPixel=field.foregroundTop+field.height*minVisibleY/1024;
   assert.ok(firstPixel>=height*.8,`${garden} foreground stays below walking feet`);
   assert.ok(firstPixel<height,`${garden} foreground must remain visible in landscape`);
   assert.ok(field.foregroundTop+field.height>=height,'no foreground bottom gap');
   assert.equal(field.top,p.top,'midground walking contact is unchanged');
   assert.equal(field.height,p.height,'foreground retains the native scale');
   assert.deepEqual(field.offsets,p.offsets);
   const contact=expeditionGardenArt(garden).groundContact;
   const authored=expeditionFieldPlacement({width,height,progress,groundContact:contact});
   assert.ok(Math.abs(authored.middleTop+authored.height*(contact??.76)-height*.76)<1e-8,'authored contact maps to common walking baseline');
   assert.ok(authored.middleTop+authored.height>=height,'middle cross-section covers bottom');
   if(contact){
    // Measured rest-frame alpha235/256; leader and followers have different
    // boxes but both must land on the authored deck, not its vertical face.
    const mobile=width<=850,shortScreen=height+(mobile?51:60)<=450;
    for(const [spriteHeight,padding] of [[shortScreen?96:mobile?87:116,17],[width<=500?38:shortScreen?53:mobile?46:65,5]]){
     const nativeFoot=(height*.76+padding-spriteHeight*(1-235/256)-authored.middleTop)/authored.height*1024;
     const [min,max]=garden==='moon'?[745,790]:garden==='fire'?[760,805]:[725,760];
     assert.ok(nativeFoot>=min&&nativeFoot<=max,`${garden} rest foot remains on the top plane`);
    }
   }else assert.equal(authored.middleTop,p.top,'legacy deck crop is unchanged');
  }
 }
}
for(const input of [{width:0,height:100},{width:100,height:-1},{width:Infinity,height:100},{width:100,height:NaN},{}])assert.equal(expeditionFieldPlacement(input),null);
for(const foregroundStart of [null,NaN,Infinity,-1,.79,1]){
 const p=expeditionFieldPlacement({width:844,height:339,foregroundStart});assert.equal(p.foregroundTop,p.top,'missing/invalid crop metadata preserves original placement');
}
for(const groundContact of [null,NaN,Infinity,-1,.64,.81,1]){
 const p=expeditionFieldPlacement({width:844,height:339,groundContact});assert.equal(p.middleTop,p.top,'invalid ground metadata preserves original placement');
}
for(const value of [null,NaN,Infinity,-1,1.01]){
 const p=expeditionFieldPlacement({width:844,height:339,farAnchorY:value,farFocalX:value});
 const legacy=expeditionFieldPlacement({width:844,height:339});
 assert.equal(p.farTop,legacy.top);assert.deepEqual(p.offsets,legacy.offsets,'invalid distant focus keeps legacy placement');
}
const gardenBytes={};
for(const id of ['meadow','blossom','autumn','snow','moon','fire','shadow','dream']){
 const field=expeditionGardenArt(id);assert.equal(field.ready,false);let bytes=0;
 for(const path of Object.values(field.layers)){assert.ok(expeditionAssetUrl(path,'/seed-web/'));bytes+=statSync(new URL('../public/assets/'+path,import.meta.url)).size;}
 assert.ok(bytes<600000,`${id} current-garden field stays bounded`);gardenBytes[id]=bytes;
}
const css=readFileSync(new URL('../src/expedition/view.css',import.meta.url),'utf8').split('/* Native three-layer side field.')[1];assert.ok(!/animation:/.test(css),'no idle layer animation');assert.ok(css.includes('pointer-events:none'));assert.ok(css.includes('background-repeat:no-repeat'));
const view=readFileSync(new URL('../src/expedition/view.js',import.meta.url),'utf8');assert.ok(view.includes("if(next!=='explore'&&fieldTarget){fieldObserver?.disconnect()"));assert.ok(view.includes('closed=true;stop();fieldObserver?.disconnect()'));assert.ok(view.includes('if(fieldTarget!==view)'),'layout read must only happen on new field/ResizeObserver');
console.log(`Expedition finite field: ${cases} responsive/progress cases PASS, layer bytes ${JSON.stringify(gardenBytes)}, no idle animation; browser and physical contact/readability QA remain separate.`);
