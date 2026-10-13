import assert from 'node:assert/strict';
import {createCanvasVfx,VFX_TINT_LIMIT} from '../src/canvas-vfx.js';

// Exercise the shipping painter through an instrumented Canvas2D boundary.
// This verifies commands/state/resource bounds, not browser pixels or taste.
class Shape{
 constructor(){this.commands=[];}
 moveTo(...a){this.commands.push(['moveTo',...a]);}lineTo(...a){this.commands.push(['lineTo',...a]);}quadraticCurveTo(...a){this.commands.push(['quadraticCurveTo',...a]);}bezierCurveTo(...a){this.commands.push(['bezierCurveTo',...a]);}ellipse(...a){this.commands.push(['ellipse',...a]);}closePath(){this.commands.push(['closePath']);}
}
class Context extends Shape{
 constructor(){super();this.calls=[];this.stack=[];this.globalCompositeOperation='source-over';this.globalAlpha=.37;this.fillStyle='#123456';this.strokeStyle='#456789';this.lineWidth=2;this.lineJoin='bevel';}
 save(){this.stack.push({globalCompositeOperation:this.globalCompositeOperation,globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,lineJoin:this.lineJoin});}
 restore(){Object.assign(this,this.stack.pop());}
 translate(...a){this.calls.push(['translate',...a]);}rotate(...a){this.calls.push(['rotate',...a]);}scale(...a){this.calls.push(['scale',...a]);}
 drawImage(...a){this.calls.push(['image',this.globalCompositeOperation,this.globalAlpha,...a]);}
 fillRect(...a){this.calls.push(['rect',...a]);}
 beginPath(){this.commands=[];}
 fill(path,rule){this.calls.push(['fill',this.globalCompositeOperation,this.globalAlpha,this.fillStyle,path?.commands||this.commands,rule||path]);}
 stroke(path){this.calls.push(['stroke',this.globalCompositeOperation,this.globalAlpha,this.strokeStyle,path?.commands||this.commands,this.lineWidth]);}
}
const previous={Image:globalThis.Image,document:globalThis.document,Path2D:globalThis.Path2D},images=[],canvases=[];
class Image{constructor(){this.complete=true;this.naturalWidth=512;this.naturalHeight=512;images.push(this);}set src(v){this.url=v;}}
globalThis.Image=Image;globalThis.Path2D=Shape;globalThis.document={createElement(tag){assert.equal(tag,'canvas');const c={width:0,height:0,getContext(){return new Context();}};canvases.push(c);return c;}};
try{
 let ready=0;const vfx=createCanvasVfx({onReady:()=>ready++}),ctx=new Context(),laws=['seed','burst','orbit','reflect','pierce','gravity','chain','frost','split','recall'],shapeSignatures=[];
 assert(vfx.ready());assert.equal(images.length,2);
 for(const law of laws){
  ctx.calls=[];vfx.projectile(ctx,law,7,11,Math.PI/3,2,'#f1d48a',1200);
  const stamps=ctx.calls.filter(c=>c[0]==='image'),fill=ctx.calls.find(c=>c[0]==='fill'),stroke=ctx.calls.find(c=>c[0]==='stroke');
  assert.equal(stamps.length,2,'two existing stamps, no extra glow layers');assert(stamps.every(c=>c[1]==='lighter'&&c[2]<=.42));
  assert.equal(fill[1],'source-over');assert.equal(fill[2],.94);assert.equal(fill[3],'#f1d48a');assert.equal(fill[5],'evenodd');assert.equal(stroke[3],'#18302c');assert(stroke[5]<.08,'outline stays smaller than projectile');
  assert(ctx.calls.some(c=>c[0]==='translate'&&c[1]===7&&c[2]===11));assert(ctx.calls.some(c=>c[0]==='rotate'&&c[1]===Math.PI/3),'core follows actual travel direction');
  shapeSignatures.push(JSON.stringify(fill[4]));assert.equal(ctx.stack.length,0);assert.equal(ctx.globalAlpha,.37);assert.equal(ctx.fillStyle,'#123456');assert.equal(ctx.lineWidth,2);
 }
 assert.equal(new Set(shapeSignatures).size,10,'all nine laws and ordinary seed have distinct compact silhouettes');
 const warmed=canvases.length;for(let i=0;i<1000;i++)vfx.projectile(ctx,laws[i%10],7,11,0,2,'#f1d48a',1200);assert.equal(canvases.length,warmed,'normal palette is cached after warmup');
 for(let i=0;i<90;i++)vfx.effect(ctx,{kind:'hit',x:2,y:3,law:'pierce'},.15,`#${(0x225500+i).toString(16)}`,1);
 assert.equal(canvases.filter(c=>c.width>0&&c.height>0).length,VFX_TINT_LIMIT,'changing colours cannot accumulate retained tiles');assert(canvases.filter(c=>c.width===0).length>0,'evicted backing stores released');
 assert(canvases.filter(c=>c.width>0).every(c=>c.width===128&&c.height===128),'only requested atlas cells are tinted');
 assert.equal(vfx.stats().bytes,8*1024*1024,'worst case bounded to eight RGBA atlas equivalents instead of24');
 ctx.calls=[];vfx.effect(ctx,{kind:'explosion',x:2,y:3,radius:2},.2,'#ffaa65',1);assert(ctx.calls.some(c=>c[0]==='fill'&&c[1]==='source-over'),'burst has compact flame contact core');assert.equal(ctx.calls.filter(c=>c[0]==='image').length,4,'same finite effect layer count');assert.equal(ctx.stack.length,0);
 ctx.calls=[];vfx.effect(ctx,{kind:'hit',x:2,y:3,law:'frost'},1,'#aeefff',1);assert.equal(ctx.calls.length,0,'expired impact emits no draw');
 ctx.calls=[];vfx.effect(ctx,{kind:'explosion',x:2,y:3,radius:20},.2,'#ffaa65',1.6);assert(ctx.calls.filter(c=>c[0]==='image').every(c=>c[2]<=.4),'large overlapping area highlights stay quiet');assert(ctx.calls.filter(c=>c[0]==='scale').every(c=>c[1]<=1.92),'contact glyph is not inflated to the full damage radius');
 ctx.calls=[];vfx.field(ctx,{kind:'well',x:1,y:2,radius:9},1,1200,'#ba94ee');assert(ctx.calls.filter(c=>c[0]==='image').every(c=>c[2]<=.33),'persistent fields cannot form a white wash');
 for(const size of [0,-1,NaN,Infinity]){ctx.calls=[];vfx.projectile(ctx,'pierce',0,0,0,size,'#ffffff');assert.equal(ctx.calls.length,0);}
 const beforeReady=ready;images[1].onload();assert.equal(ready,beforeReady+1);assert.equal(canvases.filter(c=>c.width>0).length,0,'atlas reload clears all owned tinted stores');
 // Older embedded browser fallback still uses the same path, not a glow-only
 // replacement. Exercise it with a standard Canvas2D command interface.
 delete globalThis.Path2D;const fallback=createCanvasVfx(),fallbackCtx=new Context();fallback.projectile(fallbackCtx,'recall',1,2,0,1,'#88ddaa');assert(fallbackCtx.calls.find(c=>c[0]==='fill')[4].some(c=>c[0]==='quadraticCurveTo'));assert.equal(fallbackCtx.stack.length,0);
 vfx.dispose();vfx.dispose();assert.equal(vfx.stats().bytes,0);assert.equal(vfx.stats().disposed,true);assert.equal(vfx.ready(),false);assert(images.slice(0,2).every(i=>i.onload===null),'late image callbacks disconnected on close');
 console.log('Canvas VFX PASS: preserved silhouettes/blending, warm reuse,128 small tile cap (8MiB vs24MiB), zero backing stores after idempotent teardown, atlas refresh and Path2D fallback. CPU instrumentation; live pixels/device acceptance separate.');
}finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
