import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {adventureActorOpacity} from '../src/adventure-readability.js';
import {adventureProjectileSight} from '../src/adventure-projectile-sight.js';

const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const span=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const seed={x:0,y:0},enemy={x:0,y:.5,type:'melee',role:'melee',hp:100,maxHp:100};
for(const e of [{...enemy,y:-.1},{...enemy,x:4},{...enemy,y:3},{...enemy,hp:0},{...enemy,type:'seed'},{...enemy,type:'pet'}])assert.equal(adventureActorOpacity(seed,e),1);
assert.equal(adventureActorOpacity(seed,enemy),.3);assert.equal(adventureActorOpacity(seed,{...enemy,type:'boss'}),.64);
assert.equal(adventureActorOpacity(seed,{x:0,y:1,type:'obstacle',r:1}),.32);
const baseline=JSON.stringify([seed,enemy]);for(let i=0;i<1000;i++)adventureActorOpacity(seed,enemy);assert.equal(JSON.stringify([seed,enemy]),baseline);

// Run shipping target selection, using the real geometry predicate.
const blocked={id:1,x:4,y:0,hp:1},clear={id:2,x:3,y:3,hp:1};
const s={player:seed,weapon:'throw',enemies:[blocked,clear],region:{nodes:[{x:0,y:0,r:20}],paths:[],obstacles:[{x:2,y:0,r:.5}]}};
const target=vm.createContext({s,aim:{x:1,y:0},adventureProjectileSight});vm.runInContext(span(' function assistTarget(',' function setText('),target);
assert.equal(target.assistTarget(false),clear,'throw skips nearer blocked enemy');
assert.equal(target.assistTarget(true),clear,'forward cone remains in force');
target.aim.x=-1;assert.equal(target.assistTarget(true),null,'moving backwards does not redirect across the old cone');
target.aim.x=1;s.weapon='slash';assert.equal(target.assistTarget(false),blocked,'melee assistance is unchanged');
s.weapon='hybrid';assert.equal(target.assistTarget(false),blocked,'mixed close-range attack is unchanged');
s.weapon='throw';s.region=null;assert.equal(target.assistTarget(false),blocked,'boss arena without region retains nearest target');
s.region={nodes:[{x:0,y:0,r:1},{x:4,y:0,r:1}],paths:[],obstacles:[]};s.enemies=[blocked];assert.equal(target.assistTarget(false),null,'ground gap is not treated as a clear throw');
const aimFlow=span(' const explicit=',' stepAdventure(s,dt,');assert.ok(aimFlow.includes('if(!explicit&&'),'manual drag/mouse aim bypasses assistance');

// Shipping draw pass under a stateful Canvas stub verifies order, restoration,
// and finite marker cost, including flashes which must inherit opacity.
const calls=[],stack=[];let alpha=1;
const noop=()=>{};
const ctx=new Proxy({save(){stack.push(alpha);},restore(){alpha=stack.pop();},drawImage(){calls.push(['art',alpha]);},stroke(){calls.push(['stroke',alpha]);},fillRect(){calls.push(['health',alpha]);}},{get(o,k){if(k==='globalAlpha')return alpha;return o[k]??noop;},set(o,k,v){if(k==='globalAlpha')alpha=v;else o[k]=v;return true;}});
const state={phase:'playing',time:2,room:0,player:{...seed,aimX:1,aimY:0,dashing:0,attack:0},enemies:[{...enemy,tell:.2,flash:.1}],region:null,fields:[],effects:[],shots:[],laws:[]};
const context=vm.createContext({visual25d:null,depthScale:1,ctx,s:state,closed:false,width:640,height:360,scale:20,ox:0,oy:0,assets:{melee:{complete:true,naturalWidth:256,naturalHeight:256}},INK:{},pet:null,petPos:{ready:false},moving:false,motion:{frame:0},point:(x,y)=>({x:x*20,y:y*20}),adventureActorOpacity,
 paintFloor:noop,paintGuide:noop,paintRegionMarks:noop,paintPickups:noop,paintEvents:noop,paintProps:noop,paintObstacle:()=>calls.push(['obstacle',alpha]),paintPet:noop,glow:noop,paintSeedMotion:()=>{calls.push(['seed',alpha]);return true;},actorArt:()=>['melee',null],paintGuardian:()=>false,paintFormVisuals:noop,leaf:noop,circle:noop,paintTell:()=>calls.push(['danger',alpha]),paintEvolveCue:noop});
vm.runInContext(source.split('\n').find(l=>l.trimStart().startsWith('function sprite('))+'\n'+span(' function draw(){',' function paintEvolveCue('),context);
const before=JSON.stringify(state);context.draw();assert.equal(JSON.stringify(state),before);assert.equal(alpha,1);assert.equal(stack.length,0);
assert.equal(calls.find(c=>c[0]==='seed')[1],1);assert.deepEqual(calls.filter(c=>c[0]==='art').map(c=>c[1]),[.3,.3*.55],'body and impact flash both inherit fade');
assert.equal(calls.filter(c=>c[0]==='seed').length,1,'crowded seed draws once');assert.ok(calls.findIndex(c=>c[0]==='seed')>calls.findLastIndex(c=>c[0]==='art'),'crowded seed body is drawn in front of overlapping enemies');
assert.ok(calls.some(c=>c[0]==='stroke'&&c[1]===1),'crowded player receives an opaque marker');assert.equal(calls.at(-1)[0],'danger','danger remains above the marker');
state.enemies[0].y=-1;calls.length=0;context.draw();assert.equal(calls.filter(c=>c[0]==='stroke').length,1,'uncrowded player has only the existing aim stroke');
state.enemies[0].y=.5;state.enemies[0].hp=60;calls.length=0;context.draw();assert.equal(calls.filter(c=>c[0]==='health').at(-1)[1],1,'enemy HP stays readable');
console.log('PASS shipping Adventure aim/renderer: rock/gap-aware throw, unchanged manual/melee/hybrid aim, foreground-only fade, inherited impact flash, opaque HP and bounded marker below danger; no state mutation. Controlled VM, not live pixels/device evidence.');
