import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createAdventure,startAdventure,attackAdventure,dodgeAdventure,stepAdventure} from '../src/seed-adventure-rules.js';

// Execute the shipping motion/render functions against real rule attacks.
// This verifies timing and state isolation, not pixels or physical touch input.
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const span=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const noop=()=>{};
function harness(s){
 const blades=[],scales=[];
 const ctx=new Proxy({scale:(...args)=>scales.push(args)},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
 const c=vm.createContext({s,ctx,point:(x,y)=>({x,y}),scale:20,ox:0,oy:0,assets:{combat:{naturalWidth:1024,naturalHeight:512}},INK:{},moving:false,ready:false,
  ensureEvolvedAssets:()=>c.ready,evolvedParts2:noop,glow:noop,leaf:(x,y,angle)=>blades.push(angle),vfx:{ready:()=>false},audio:{play:noop}});
 vm.runInContext(span(' const SOUND=',' function loop(')+span(' const motion=',' // 2026-09-28 사용자: "강해진다는 느낌')+span(' function paintEvolvedBody(',' function draw(')+"\nglobalThis.probe={sound,beginSeedSwing,seedMotionFrame,seedFacing,paintSeedMotion,motion};",c);
 return {c,p:c.probe,blades,scales};
}
function begin(){const s=createAdventure(18);startAdventure(s,'slash','recall');s.enemies=[];s.props=[];s.effects=[];s.events=[];s.player.attack=0;return s;}
for(let step=0;step<3;step++){
 const s=begin(),p=s.player;p.combo=step;p.aimX=1;p.aimY=0;
 s.enemies=[{id:987,type:'melee',role:'melee',x:p.x+1,y:p.y,hp:1000,maxHp:1000,r:.4}];
 const h=harness(s);assert.equal(attackAdventure(s),true);assert.ok(s.enemies[0].hp<1000,'contact damage happens immediately');
 const angle=s.effects.find(e=>e.type==='slash').angle;h.p.sound();
 assert.equal(h.p.seedMotionFrame(p),[1,2,4][step],'contact frame is visible at time zero, including hitstop');
 p.aimX=-1;p.aimY=0;assert.equal(h.p.seedFacing(p),angle,'current swing does not rotate when next aim changes');
 const before=JSON.stringify(s);h.c.ready=true;h.p.paintSeedMotion(p,0);
 assert.equal(h.blades[0],angle,'evolved blade is on actual attack direction at contact');
 assert.equal(JSON.stringify(s),before,'rendering does not change damage/input/return cuts/state');
 s.time+=.05;h.p.paintSeedMotion(p,0);assert.equal(h.p.motion.swingStart,0,'repeated draw cannot restart the swing');
 assert.equal(s.pendingCuts[0].angle,angle,'return cut retains authoritative original direction');
}
{
 const s=begin(),h=harness(s),p=s.player;p.aimX=0;p.aimY=-1;
 assert.equal(h.p.seedFacing(p),-Math.PI/2,'vertical aim must not replace zero X with one');
 attackAdventure(s);h.p.sound();let observations=0;const original=h.c.seedMotionFrame;h.c.seedMotionFrame=p=>{observations++;return original(p);};
 h.c.ready=false;h.p.paintSeedMotion(p,0);h.c.ready=true;h.p.paintSeedMotion(p,0);
 assert.equal(observations,2,'one motion observation per draw across image decode/fallback');assert.equal(h.p.motion.swingStart,0);
 s.time=.2;p.attack=0;assert.equal(h.p.seedFacing(p),-Math.PI/2,'released swing follows current input');
 h.p.paintSeedMotion(p,0);assert.equal(h.p.motion.frame,0,'ready evolved idle body suppresses the external fallback leaf');
 s.time=3;p.combo=0;p.aimX=-1;p.aimY=0;attackAdventure(s);h.p.sound();
 assert.equal(h.p.motion.swingStart,3,'new/restarted attack overrides prior visual state');assert.equal(h.p.seedFacing(p),Math.PI);
 h.p.motion.hurtAt=s.time;assert.equal(h.p.seedMotionFrame(p),7,'hurt pose overrides a strike');
 p.dashing=.1;assert.equal(h.p.seedMotionFrame(p),5,'dodge overrides hurt and strike');
}
{
 const s=begin(),p=s.player,h=harness(s);dodgeAdventure(s,1,0);h.p.seedMotionFrame(p);
 p.dashing=0;s.time=.21;attackAdventure(s);h.p.sound();
 assert.equal(h.p.seedMotionFrame(p),4,'dash follow-up contact is not hidden behind dodge recovery');
 assert.ok(s.events.length===0);const hp=p.hp,damage=s.effects.find(e=>e.type==='slash').angle;
 stepAdventure(s,1/60,{aimX:-1,aimY:0});assert.equal(p.hp,hp);assert.equal(h.p.seedFacing(p),damage,'rules remain free to aim the next attack');
}
{
 const s=createAdventure(18);startAdventure(s,'slash','recall');const h=harness(s);
 assert.equal(h.p.seedMotionFrame(s.player),-1,'entry attack cooldown is a control lock, not a phantom swing');
 s.player.attack=0;attackAdventure(s);h.p.sound();h.p.motion.hurtAt=8;
 s.room++;s.player.attack=.4;assert.equal(h.p.seedMotionFrame(s.player),-1,'next room does not replay the previous attack');
 const fresh=begin();h.c.s=fresh;assert.equal(h.p.seedMotionFrame(fresh.player),-1,'retry clears prior hurt/dash/swing ages');
}
console.log('PASS Adventure actual-rule contact motion: immediate 3-hit poses, frozen presentation direction, vertical aim, dash follow-up/hurt priorities, decode transition and no simulation mutation. Not browser/device evidence.');
