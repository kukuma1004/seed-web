import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {ROOT_BLOOM,makeAdventureGimmicks,stepAdventureGimmicks,paintAdventureGimmicks} from '../src/adventure-garden-gimmicks.js';
import {createAdventure,startAdventure,stepAdventure,adventureWalkable} from '../src/seed-adventure-rules.js';
for(let act=0;act<3;act++)for(let seed=1;seed<=100;seed++){
 const s=createAdventure(seed);s.room=act*4;startAdventure(s,'slash','recall');const R=s.region,serial=s.serial,rng=s.seed;
 assert.equal(R.gimmicks.length,2);assert.deepEqual(makeAdventureGimmicks(R),R.gimmicks);assert.equal(s.seed,rng);assert.equal(s.serial,serial);
 for(const g of R.gimmicks){assert.ok(adventureWalkable(s,g.x,g.y,.4));assert.ok(R.obstacles.every(o=>Math.hypot(g.x-o.x,g.y-o.y)>o.r+.4),'trigger not buried in cover');assert.ok(Math.hypot(s.player.x-g.x,s.player.y-g.y)>ROOT_BLOOM.trigger,'no automatic entry activation');}
}
const s=createAdventure(13);s.room=4;startAdventure(s,'slash','recall');const g=s.region.gimmicks[0];s.enemies.length=0;s.player.x=g.x;s.player.y=g.y;
const enemy=(id,x,extra={})=>({id,x,y:g.y,r:.4,hp:300,type:'hound',role:'fast',cd:.4,tell:.4,dashing:.2,stun:0,slow:0,dormant:false,kx:0,ky:0,power:1,speed:1,...extra});
const targets=[enemy(1,g.x+1),enemy(2,g.x+4),enemy(3,g.x+1,{type:'boss'}),enemy(4,g.x+1,{dormant:true}),enemy(5,g.x+1,{hp:0})];s.enemies=targets;
let bursts=0;stepAdventureGimmicks(s,.01,()=>bursts++);assert.equal(g.phase,'primed');assert.equal(targets[0].stun,0,'a warning precedes any effect');
s.player.x=g.x+4;for(let i=0;i<40;i++)stepAdventureGimmicks(s,1/60,()=>bursts++);
assert.equal(g.phase,'spent');assert.equal(bursts,1);assert.equal(g.hits,1);assert.equal(targets[0].stun,ROOT_BLOOM.root);assert.equal(targets[0].slow,ROOT_BLOOM.slow);assert.equal(targets[0].tell,0);assert.equal(targets[0].dashing,0);
for(const e of targets){assert.equal(e.hp,e.id===5?0:300);if(e.id!==1)assert.equal(e.stun,0,'outside/boss/sleeping/dead enemies stay unchanged');}
assert.equal(s.pickups.length,0);assert.equal(s.kills,0);
s.player.x=g.x;for(let i=0;i<600;i++)stepAdventureGimmicks(s,1/60,()=>bursts++);
// The departure during the first warning rearmed one repeat; remaining still
// afterward cannot farm an unlimited series of roots.
assert.equal(bursts,2);for(let i=0;i<600;i++)stepAdventureGimmicks(s,1/60,()=>bursts++);assert.equal(bursts,2);
s.player.x=g.x+4;stepAdventureGimmicks(s,.01);s.player.x=g.x;stepAdventureGimmicks(s,.01);assert.equal(g.phase,'primed','leaving and stepping back rearms');
const before=JSON.stringify(s);s.phase='choice';stepAdventureGimmicks(s,.05);assert.equal(JSON.stringify(s),before.replace('"phase":"playing"','"phase":"choice"'),'menus cannot advance tell or cooldown');s.phase='playing';
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true}),labels=[],images=[];const renderBefore=JSON.stringify(s);
paintAdventureGimmicks(s,ctx,(x,y)=>({x,y}),()=>{},(...args)=>images.push(args),(...args)=>labels.push(args),20);assert.equal(JSON.stringify(s),renderBefore);assert.equal(images[0][0],'sprout');assert.ok(labels.some(a=>a[2].includes('적을 유인')));
// Actual host step cancels the imminent fast dash; player resources do not
// change, and a legacy region without this optional field still steps.
const live=createAdventure(9);live.room=4;startAdventure(live,'slash','recall');const root=live.region.gimmicks[0];live.player.x=root.x;live.player.y=root.y;live.player.inv=2;live.enemies=[enemy(8,root.x+1,{y:root.y,tell:.01})];
stepAdventure(live,.01);root.tell=.01;live.enemies[0].tell=.01;const hp=live.player.hp,coins=live.coins;
stepAdventure(live,.02);assert.ok(live.enemies[0].stun>0);assert.equal(live.enemies[0].tell,0);assert.equal(live.enemies[0].dashing,0);assert.equal(live.player.hp,hp);assert.equal(live.coins,coins);
delete live.region.gimmicks;stepAdventure(live,.01);live.region=null;stepAdventure(live,.01);
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8'),begin=source.indexOf(' function paintEvolveCue(){'),end=source.indexOf('\n',begin),rects=[],text=[];
assert.ok(begin>=0&&end>begin);const c=vm.createContext({s:{phase:'playing'},evolveCue:{name:'천둥 창쌍둥이 각성',kind:'twin',at:0},performance:{now:()=>500},width:640,height:360,ctx:new Proxy({fillRect:(...a)=>rects.push(a),fillText:(...a)=>text.push(a),strokeText:()=>{}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})});
vm.runInContext(source.slice(begin,end),c);c.paintEvolveCue();assert.ok(rects[0][1]>280&&rects[0][2]<=220&&rects[0][3]===46,'small evolution badge leaves the central combat warning area clear');assert.ok(text.at(-1)[3]<=204,'long names fit within the badge');
rects.length=0;c.width=1280;c.height=720;c.paintEvolveCue();assert.equal(rects[0][2],1280);assert.equal(rects[0][3],78,'large-screen evolution presentation preserved');
console.log('PASS300 gardens/600 body-safe sites, warning/lure/root/cooldown/re-entry, awake ordinary-only, no damage/loot, real dash interruption, legacy/menu and read-only rendering. CPU/Canvas evidence, not device proof.');
