import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSeedCanvasPaint,paintSeedRaisedPath,paintSeedBoardDepth,SEED_CANVAS_LIGHT_CACHE_LIMIT,SEED_CANVAS_LIGHT_TILE_LIMIT,SEED_CANVAS_LIGHT_BAKES_PER_WINDOW,SEED_CANVAS_LIGHT_BAKE_WINDOW_MS} from '../src/seed-canvas-presentation.js';
import {seedVisualReviewEnabled,SEED_VISUAL_LANGUAGE} from '../src/seed-visual-language.js';
import {PATH,defensePath,createDefense,checkpointDefense} from '../src/seed-defense-rules.js';

class Context{
 constructor(){this.calls=[];this.stack=[];this.globalAlpha=.43;}
 save(){this.stack.push(this.globalAlpha);}restore(){this.globalAlpha=this.stack.pop();}
 translate(...a){this.calls.push(['translate',...a]);}scale(...a){this.calls.push(['scale',...a]);}rotate(...a){this.calls.push(['rotate',...a]);}
 moveTo(...a){this.calls.push(['moveTo',...a]);}lineTo(...a){this.calls.push(['lineTo',...a]);}roundRect(...a){this.calls.push(['roundRect',...a]);}
 drawImage(...a){this.calls.push(['draw',...a]);}createLinearGradient(...a){this.calls.push(['gradient',...a]);return {addColorStop(){}};}
 clearRect(...a){this.calls.push(['clear',...a]);}
 fillRect(...a){this.calls.push(['rect',...a]);}beginPath(){}closePath(){}clip(){}ellipse(...a){this.calls.push(['ellipse',...a]);}fill(){}stroke(){this.calls.push(['stroke',this.strokeStyle,this.lineWidth]);}
}
const canvases=[],canvas=()=>{const context=new Context(),tile={width:0,height:0,getContext:()=>context,context};canvases.push(tile);return tile;},image={naturalWidth:2048,naturalHeight:1024},ctx=new Context();
for(const hostname of ['kukuma1004.github.io','example.com','192.168.0.2'])assert.equal(seedVisualReviewEnabled({hostname,search:'?inspect=1&visual25d=1'}),false);
for(const hostname of ['localhost','127.0.0.1','[::1]','::1']){
 assert(seedVisualReviewEnabled({hostname,search:'?inspect=1&visual25d=1'}));
 for(const search of ['','?visual25d=1','?inspect=1','?inspect=0&visual25d=1','?inspect=1&visual25d=0'])assert.equal(seedVisualReviewEnabled({hostname,search}),false);
}
const original=[image,512,0,512,512,1,2,70,70],normal=createSeedCanvasPaint({review:false,canvas});normal.draw(ctx,...original);assert.deepEqual(ctx.calls[0],['draw',...original]);assert.equal(canvases.length,0);assert.equal(normal.contact(ctx,1,2,70),false);assert.equal(normal.impact(ctx,1,2,70,.3),false);normal.dispose();
let bakeClock=0;
const updates=[];ctx.calls=[];const paint=createSeedCanvasPaint({review:true,canvas,now:()=>bakeClock,onCacheChange:m=>updates.push(m)});paint.draw(ctx,...original);assert.equal(canvases.length,1);assert.equal(canvases[0].width,256);assert.equal(canvases[0].height,256);assert.equal(canvases[0].context.calls[1][0],'draw');assert.deepEqual(canvases[0].context.calls[1].slice(1,6),original.slice(0,5),'authored exact atlas crop');assert.deepEqual(ctx.calls[0].slice(-4),original.slice(-4),'original placement/size');
for(let i=0;i<1000;i++)paint.draw(ctx,...original);assert.equal(canvases.length,1,'one bake after warmup, no per-frame allocations');assert.equal(updates.length,2,'initial + bake metrics only; no per-frame JSON/DOM');
for(let i=0;i<60;i++){bakeClock+=SEED_CANVAS_LIGHT_BAKE_WINDOW_MS;paint.draw(ctx,image,i*24,0,512,512,0,0,50,50);}
assert.equal(paint.stats().tiles,SEED_CANVAS_LIGHT_CACHE_LIMIT);assert.equal(paint.stats().bytes,SEED_CANVAS_LIGHT_CACHE_LIMIT*SEED_CANVAS_LIGHT_TILE_LIMIT**2*4);assert.equal(canvases.length,SEED_CANVAS_LIGHT_CACHE_LIMIT,'evictions reuse bounded backing stores');assert.equal(image.naturalWidth,2048,'original asset untouched');
ctx.calls=[];assert(paint.contact(ctx,10,20,60,{lift:.4}));assert.equal(ctx.calls.filter(c=>c[0]==='ellipse').length,2);assert.equal(ctx.globalAlpha,.43);assert.equal(ctx.stack.length,0);
ctx.calls=[];assert(paint.impact(ctx,10,20,60,.25));assert.equal(ctx.calls.filter(c=>c[0]==='ellipse').length,5);assert.equal(ctx.stack.length,0);assert.equal(ctx.globalAlpha,.43);ctx.calls=[];assert.equal(paint.impact(ctx,1,2,60,1),false);assert.equal(ctx.calls.length,0);
const reduced=createSeedCanvasPaint({review:true,reducedMotion:true,canvas});ctx.calls=[];reduced.impact(ctx,1,2,60,.2);const initial=ctx.calls.filter(c=>c[0]==='ellipse');ctx.calls=[];reduced.impact(ctx,1,2,60,.8);assert.deepEqual(ctx.calls.filter(c=>c[0]==='ellipse'),initial,'reduced motion keeps geometry static while fading');
assert.equal(paint.law('frost','#111'),SEED_VISUAL_LANGUAGE.laws.frost);assert.equal(paint.law('enemy','#ef927e'),'#ef927e','enemy danger identity remains explicit');paint.dispose();const closedUpdates=updates.length;paint.dispose();assert.equal(updates.length,closedUpdates,'idempotent teardown metrics');assert.equal(updates.at(-1).bytes,0);assert.equal(paint.stats().bytes,0);assert.equal(paint.stats().disposed,true);reduced.dispose();
assert(canvases.every(c=>c.width===0&&c.height===0),'all retained/recycled backing stores released on close');

// Sustained overflow is a different workload from drawing one warm pose 1000
// times. Keep 49/64 crops active for 400 synthetic 16ms frames, with no RAF,
// timers, game-state injection or physical-device performance claims.
const overflow=[];
for(const cropCount of [49,64]){
 let time=0,allocations=0,gradients=0,notifications=0;
 const stores=[],outer=new Context(),make=()=>{allocations++;const g=new Context(),gradient=g.createLinearGradient.bind(g);g.createLinearGradient=(...args)=>{gradients++;return gradient(...args);};const tile={width:0,height:0,getContext:()=>g,context:g};stores.push(tile);return tile;};
 const busy=createSeedCanvasPaint({review:true,canvas:make,now:()=>time,onCacheChange:()=>notifications++});
 for(let frame=0;frame<400;frame++){
  time=frame*SEED_CANVAS_LIGHT_BAKE_WINDOW_MS;
  const before=busy.stats().bakes;
  for(let crop=0;crop<cropCount;crop++)busy.draw(outer,image,crop*24,0,512,512,11,12,61,62);
  assert(busy.stats().bakes-before<=SEED_CANVAS_LIGHT_BAKES_PER_WINDOW,'bounded missing-pose work per 16ms window');
  assert(busy.stats().bytes<=12*1024*1024);
 }
 const snapshot=busy.stats();assert.equal(allocations,48);assert.equal(gradients,48,'same-size recycled tiles reuse their gradient');assert.equal(notifications,49,'initial + capacity growth only, no stable-size JSON churn');assert(snapshot.deferred>0,'overflow falls back to the original crop');
 const fallback=outer.calls.filter(c=>c[0]==='draw'&&c[1]===image);assert(fallback.length>0);assert(fallback.every(c=>JSON.stringify(c.slice(-4))===JSON.stringify([11,12,61,62])),'fallback keeps exact placement and size');
 for(const store of stores){const calls=store.context.calls;for(let i=0;i<calls.length;i++)if(calls[i][0]==='draw')assert.equal(calls[i-1][0],'clear','transparent old poses cleared before every copy');}
 overflow.push({cropCount,frames:400,draws:400*cropCount,...snapshot,allocations,gradients,notifications});busy.dispose();assert(stores.every(c=>!c.width&&!c.height));assert.equal(busy.stats().bytes,0);
}
// A frequent idle/attack cell survives a stream of one-off poses. FIFO used to
// evict it merely because its original insertion happened before the others.
{
 let time=0;const stores=[],make=()=>{const tile={width:0,height:0,getContext:()=>new Context()};stores.push(tile);return tile;};
 const active=createSeedCanvasPaint({review:true,canvas:make,now:()=>time}),out=new Context(),hot={};
 active.draw(out,hot,0,0,512,512,0,0,40,40);const bakedHot=out.calls.at(-1)[1];
 for(let crop=0;crop<100;crop++){time+=16;active.draw(out,image,crop*24,0,512,512,0,0,40,40);active.draw(out,hot,0,0,512,512,0,0,40,40);assert.equal(out.calls.at(-1)[1],bakedHot);}
 assert.equal(stores.length,48);active.dispose();
}
console.log('Canvas sustained overflow CPU instrumentation:',JSON.stringify(overflow));

// Execute shipping sprite helpers independently: original pose/flip/foot position
// survive the new treatment. Physics, AP clocks and server state are absent.
for(const [file,start,end,locals,call] of [
 ['seed-bounce-view.js',' function sprite(',' function draw()', {images:{seed:image},point:(x,y)=>({x,y}),g:ctx},"sprite('seed',10,20,70)"],
 ['garden-challenge-view.js',' function sprite(',' function supply(',{images:{seed:image},px:x=>x,py:y=>y,ctx},"sprite('seed',10,20,70,3,-1,.8)"],
 ['seed-breakthrough-view.js',' function sprite(',' function hero(',{images:{pierce:image},point:(x,y)=>({x,y}),scale:10,ctx,BREAKTHROUGH_CAMERA:{depth:.76}},"sprite('pierce',10,20,3,7,-1,0,.8)"],
 ['seed-defense-view.js',' function sprite(',' let expansionVisualWave=',{assets:{seed:{...image,complete:true,width:2048,height:1024}},ctx},"sprite('seed',10,20,70,3,4,2,.82)"]
]){
 const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);const active=createSeedCanvasPaint({review:true,canvas});ctx.calls=[];const scope={...locals,spritePaint:active};vm.runInNewContext(source.slice(a,b)+'\n'+call,scope);assert(ctx.calls.some(c=>c[0]==='draw'),file+' draws authored sheet');assert.equal(ctx.stack.length,0,file+' balances Canvas state');active.dispose();
}
{
 const state=createDefense(49,{actCount:5}),before=JSON.stringify(checkpointDefense(state)),path=defensePath(state),pathBefore=JSON.stringify(path);ctx.calls=[];paintSeedRaisedPath(ctx,path);assert.equal(JSON.stringify(path),pathBefore);assert.equal(JSON.stringify(checkpointDefense(state)),before);assert(ctx.calls.filter(c=>c[0]==='lineTo').length>path.length*20,'finite individual polygon faces instead of continuous pipes');assert(ctx.calls.filter(c=>c[0]==='stroke').every(c=>c[2]<.1),'only fine material joints, no thick pipe stroke');assert.equal(ctx.stack.length,0);
 const flags={...image,width:2048,height:1024};ctx.calls=[];paintSeedRaisedPath(ctx,path,{flagstones:flags});const faces=ctx.calls.filter(c=>c[0]==='draw');assert(faces.length>40&&faces.length<80,'bounded existing tile faces in cached floor');assert(faces.every(c=>c[1]===flags),'existing paving texture only');assert(faces.every(c=>Math.min(c[8],c[9])<1),'shallow stone fascia, not a second top slab');assert.equal(ctx.stack.length,0);
 const source=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8'),a=source.indexOf(' function ground(){'),b=source.indexOf(' function sprite(',a),top=[];const scope={bg:ctx,width:1280,height:720,assets:{},ox:0,oy:0,scale:10,state,defensePath,paintDefenseGround:()=>top.push('authored-top'),paintSeedRaisedPath,spritePaint:{review:true},dirty:true};vm.runInNewContext(source.slice(a,b)+'\nground();',scope);assert.deepEqual(top,['authored-top']);assert.equal(scope.dirty,false,'ledge is only baked with floor');assert.equal(JSON.stringify(checkpointDefense(state)),before,'actual cached ground cannot change path/pads/RNG/save');
 ctx.calls=[];paintSeedBoardDepth(ctx,50,80,400,300,14,8);const bevel=ctx.calls.filter(c=>c[0]==='roundRect');assert.equal(bevel.length,2);assert(bevel.every(c=>c[2]>80&&c[4]>300),'bezel faces extend below unchanged board top');assert.equal(ctx.stack.length,0);assert.equal(JSON.stringify(PATH),pathBefore,'canonical route unchanged');
}
console.log('Canvas visual review PASS: strict local gate; exact disabled draw; authored crops/positions; 1000 warm draws without allocations; sustained 49/64-pose overflow bounded to4 bakes/16ms,48 recycled canvases/gradients and12MiB; hot-pose retention/transparent clear; two contacts/five finite impact shapes; reduced-motion geometry; dispose,4 real sprite helpers and cached real TD/path + raised bezel. CPU instrumentation, not native screenshot/device FPS approval.');
