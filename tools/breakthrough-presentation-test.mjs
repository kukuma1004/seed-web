import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {BREAKTHROUGH_CAMERA as C,createBreakthroughPresentation,resetBreakthroughPresentation,advanceBreakthroughPresentation,observeBreakthroughContacts,frameBreakthroughCamera,projectBreakthroughPoint} from '../src/breakthrough-presentation.js';
import {createBreakthrough,stepBreakthrough} from '../src/seed-breakthrough-rules.js';

for(const [width,height] of [[1280,720],[844,390],[640,360]]){
 const view=createBreakthroughPresentation(),run=createBreakthrough('pierce',7);resetBreakthroughPresentation(view,run);
 const c=frameBreakthroughCamera(view,width,height,run.player),p=projectBreakthroughPoint(c,run.player.x,run.player.y);
 assert.ok(Math.abs(p.x-width*.5)<1e-8&&Math.abs(p.y-height*.66)<1e-8,'hero anchored above bottom controls');
 const oldPixels=2.85*Math.max(width/31,height/20),newPixels=C.hero*c.scale;
 assert.ok(newPixels/oldPixels>1.7&&newPixels/oldPixels<1.9,'larger upright body without crushing viewport');
 assert.ok(p.y-newPixels*.86>80&&p.y+newPixels*.14<height-70,'hero fits combat space at target landscape sizes');
 const x=projectBreakthroughPoint(c,run.player.x+3.2,run.player.y),y=projectBreakthroughPoint(c,run.player.x,run.player.y+3.2);
 assert.ok(Math.abs((y.y-p.y)/(x.x-p.x)-C.depth)<1e-8,'ground circles and collision points use same projection');
}
const run=createBreakthrough('burst',7),view=createBreakthroughPresentation();resetBreakthroughPresentation(view,run);
const before=JSON.stringify(run);observeBreakthroughContacts(view,run,run.comboHits);frameBreakthroughCamera(view,1280,720,run.player);advanceBreakthroughPresentation(view,.016);
assert.equal(JSON.stringify(run),before,'presentation does not change damage, position, RNG or account state');
assert.equal(view.feel.stopLeft,0,'empty swing/unchanged hit counter does not freeze gameplay');
run.player.step=2;run.comboHits++;observeBreakthroughContacts(view,run,run.comboHits-1);
assert.ok(advanceBreakthroughPresentation(view,.016)<.016,'confirmed heavy contact has short hitstop');
for(let i=0;i<10;i++)advanceBreakthroughPresentation(view,.016);assert.equal(view.feel.stopLeft,0);assert.equal(view.kick,0,'camera kick decays in real time');
const reduced=createBreakthroughPresentation(true);resetBreakthroughPresentation(reduced,run);observeBreakthroughContacts(reduced,run,run.comboHits-1);
assert.equal(advanceBreakthroughPresentation(reduced,.016),.016);assert.equal(reduced.kick,0,'reduced motion disables shake and hitstop');
for(const u of run.units){u.active=false;u.hp=0;}observeBreakthroughContacts(view,run,run.comboHits);
assert.equal(view.echoes.filter(e=>e.life>0).length,C.echoes,'kill echoes bounded under crowd wipes');
for(let i=0;i<3;i++)advanceBreakthroughPresentation(view,.1);assert.equal(view.echoes.filter(e=>e.life>0).length,0,'dead sprites fade without retaining targets');
resetBreakthroughPresentation(view,createBreakthrough());assert.ok(view.echoes.every(e=>e.life===0));assert.equal(view.camera.ready,false,'retry resets camera and old effects');
// Full presentation observer and rules remain compatible under normal input.
const plain=createBreakthrough('pierce',9),observed=createBreakthrough('pierce',9),fx=createBreakthroughPresentation();resetBreakthroughPresentation(fx,observed);
for(let i=0;i<500;i++){const input={x:i<120?1:0,y:0,attack:true};stepBreakthrough(plain,1/60,input);const hits=observed.comboHits;stepBreakthrough(observed,1/60,input);observeBreakthroughContacts(fx,observed,hits);advanceBreakthroughPresentation(fx,1/60);}
assert.equal(JSON.stringify(observed),JSON.stringify(plain),'render observer preserves normal rules at identical simulation time');
// Skills/ults can finish combat from an input callback, before the next RAF.
const source=readFileSync(new URL('../src/seed-breakthrough-view.js',import.meta.url),'utf8'),loop=source.slice(source.indexOf('function loop(now)'),source.indexOf('function resize()'));
for(const phase of ['won','lost']){
 let finishes=0,huds=0,draws=0;
 const context=vm.createContext({raf:10,closed:false,paused:false,document:{hidden:false},run:{phase},hud(){huds++;},draw(){draws++;},finish(){finishes++;},requestAnimationFrame(){throw Error('terminal loop must not keep scheduling');}});
 vm.runInContext(loop+';loop(1000);',context);assert.equal(finishes,1,'input-callback terminal state opens result');assert.equal(huds,1);assert.equal(draws,1);assert.equal(context.raf,0);
}
const resize=source.slice(source.indexOf('function resize()'),source.indexOf(" $('.bt-pause').onclick"));let stops=0,pauses=0;
const zero=vm.createContext({root:{getBoundingClientRect:()=>({width:0,height:0})},run:{phase:'playing'},paused:false,pause(){pauses++;},stop(){stops++;},width:1280,height:720});
vm.runInContext(resize+';resize();',zero);assert.equal(pauses,1);assert.equal(stops,1);assert.equal(zero.width,1280);assert.equal(zero.height,720,'zero-sized/minimized surface cannot destroy the last camera frame');
console.log('PASS Breakthrough oblique framing/size, warning projection, real-time contact feedback, reduced motion, bounded death echoes, reset and combat independence. No device proof.');
