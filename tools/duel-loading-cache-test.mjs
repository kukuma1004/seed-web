import assert from 'node:assert/strict';
import {createSeedCanvasPaint} from '../src/seed-canvas-presentation.js';
import {JOURNEY_DUEL_ART} from '../src/journey-duel-art.js';

// HTMLImageElement may publish natural dimensions before its full image is
// drawable. Model the transparent copy made during that loading window, then
// finish the SAME image object: a blank shade tile must not survive onload.
for(const character of [false,true]){
 let time=0;
 const stores=[],draws=[],outer={drawImage(image,...args){draws.push({image,args,visible:image.complete!==false&&image.visible!==false});}};
 const canvas=()=>{
  const tile={width:0,height:0,visible:false};
  const context={clearRect(){tile.visible=false;},drawImage(image){tile.visible=image.complete!==false;},createLinearGradient(){return {addColorStop(){}};},fillRect(){}};
  tile.getContext=()=>context;stores.push(tile);return tile;
 };
 const paint=createSeedCanvasPaint({review:true,characterLighting:true,canvas,now:()=>time});paint.character=character;
 const sheets=['bigcrunch','mirrorhall'].map(id=>{
  const art=JOURNEY_DUEL_ART[id],[naturalWidth,naturalHeight]=art.dimensions[0];
  return {complete:false,naturalWidth,naturalHeight,frame:art.frames[0]};
 });
 for(const image of sheets){
  const {src,dst}=image.frame;
  paint.draw(outer,image,...src,...dst);
  assert.equal(draws.at(-1).image,image,'loading source uses the exact unshaded fallback');
  assert.deepEqual(draws.at(-1).args,[...src,...dst]);
 }
 assert.equal(paint.stats().tiles,0,'incomplete images never create permanently transparent cache entries');
 assert.equal(paint.stats().bakes,0,'loading copies do not consume the ready-image bake budget');
 assert.equal(stores.length,0);
 for(const image of sheets){
  image.complete=true;
  paint.draw(outer,image,...image.frame.src,...image.frame.dst);
  assert.equal(draws.at(-1).visible,true,'completed sheet produces a visible tile on its next draw');
  assert.notEqual(draws.at(-1).image,image);
 }
 assert.equal(paint.stats().tiles,2);
 for(let n=0;n<120;n++){time+=16;for(const image of sheets)paint.draw(outer,image,...image.frame.src,...image.frame.dst);}
 assert.equal(paint.stats().bakes,2,'ready poses remain cached through subsequent practice draws');
 assert(draws.slice(2).every(draw=>draw.visible));
 // Canvas/ImageBitmap-like inputs have no .complete and retain the same path.
 time+=16;paint.draw(outer,{},0,0,32,32,0,0,1,1);assert.equal(paint.stats().tiles,3);
 paint.dispose();assert(stores.every(tile=>tile.width===0&&tile.height===0));
}
console.log('Duel loading-cache PASS: BigCrunch/MirrorHall metadata-ready but incomplete sheets never cache blank pixels; same-image completion, both lighting variants, warm cache and canvas inputs preserved. CPU loading model, not browser pixel approval.');
