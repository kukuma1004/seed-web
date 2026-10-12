import assert from 'node:assert/strict';
import {adventureProjectileSight as sight} from '../src/adventure-projectile-sight.js';
import {makeAdventureGardenLayout} from '../src/adventure-garden-layout.js';
import {adventureWalkable,createAdventure,startAdventure} from '../src/seed-adventure-rules.js';

const lawn=(obstacles=[])=>({nodes:[{x:0,y:0,r:20}],paths:[],obstacles});
assert.equal(sight(null,0,0,100,100),true,'arena without region preserves assisted aim');
assert.equal(sight(lawn(),-10,0,10,0),true);
assert.equal(sight(lawn([{x:0,y:0,r:1}]),-10,0,10,0),false,'rock blocks a straight target');
assert.equal(sight(lawn([{x:0,y:1,r:1}]),-10,0,10,0),true,'strict obstacle tangent stays clear');
assert.equal(sight(lawn([{x:0,y:.99999,r:1}]),-10,0,10,0),false);
assert.equal(sight(lawn([{x:.12345,y:0,r:.00001}]),-10,0,10,0),false,'thin obstacle cannot fall between samples');
assert.equal(sight(lawn([{x:15,y:0,r:1}]),-10,0,10,0),true,'obstacle beyond target is irrelevant');
assert.equal(sight(lawn([{x:0,y:0,r:1}]),0,0,0,0),false);
assert.equal(sight(lawn(),0,0,0,0),true);
assert.equal(sight({nodes:[],paths:[],obstacles:[]},0,0,0,0),false);
assert.equal(sight(lawn(),NaN,0,1,0),false);

const islands={nodes:[{x:0,y:0,r:1.2},{x:4,y:0,r:1.2}],paths:[],obstacles:[]};
assert.equal(sight(islands,0,0,4,0),true,'closed disk tangent bridges ground continuously');
islands.nodes[1].x=4.00001;
assert.equal(sight(islands,0,0,4.00001,0),false,'tiny real ground gap is not padded over');
const path={nodes:[],paths:[{ax:0,ay:0,bx:10,by:0}],obstacles:[],pathWidth:.2};
assert.equal(sight(path,-1,0,11,0),true,'rounded caps are part of the ground');
assert.equal(sight(path,0,1,10,1),true,'narrow path tangent is ground');
assert.equal(sight(path,0,1.00001,10,1.00001),false);
assert.equal(sight(path,-1,1,11,1),false,'outside corner does not become a rectangular cap');
const bent={...path,paths:[{ax:0,ay:0,bx:10,by:0},{ax:10,ay:0,bx:10,by:10}]};
assert.equal(sight(bent,0,0,10,10),false,'connected winding corridor does not imply straight sight');
assert.equal(sight(bent,8,0,10,2),true,'overlapping capsules can cover one segment together');
const degenerate={...path,paths:[{ax:2,ay:2,bx:2,by:2}]};
assert.equal(sight(degenerate,1,2,3,2),true);
assert.equal(sight(degenerate,1,3,3,3),false);
const diagonal={...path,paths:[{ax:0,ay:0,bx:10,by:10}]};
assert.equal(sight(diagonal,0,0,10,10),true);
assert.equal(sight(diagonal,0,2,10,12),false);
const many={nodes:Array.from({length:80},(_,i)=>({x:i,y:0,r:.2})),paths:[],obstacles:[]};
assert.equal(sight(many,0,0,79,0),true,'scratch capacity grows once for a larger geometry');
assert.equal(sight(path,0,1.00001,10,1.00001),false,'stale scratch cannot cover the next call');

function sampledClear(region,x0,y0,x1,y1,steps=2048){
 const state={region};
 for(let i=0;i<=steps;i++){const t=i/steps,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
  if(!adventureWalkable(state,x,y,-.8)||region.obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<o.r))return false;
 }
 return true;
}
let compared=0,clear=0,blocked=0;
for(let act=0;act<3;act++)for(let seed=1;seed<=8;seed++){
 let n=seed;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const layout=makeAdventureGardenLayout(act,random);
 const region={...layout,obstacles:[],paths:layout.edges.map(([a,b])=>({ax:layout.nodes[a].x,ay:layout.nodes[a].y,bx:layout.nodes[b].x,by:layout.nodes[b].y}))};
 for(let pair=0;pair<24;pair++){
  // Node centers exercise both connected straight lanes and tempting shortcuts
  // across voids; the oracle calls the real walkability function, not a copy.
  const a=region.nodes[Math.floor(random()*region.nodes.length)],b=region.nodes[Math.floor(random()*region.nodes.length)];
  const answer=sight(region,a.x,a.y,b.x,b.y);
  assert.equal(answer,sampledClear(region,a.x,a.y,b.x,b.y),`act${act}seed${seed}pair${pair}`);
  compared++;answer?clear++:blocked++;
 }
}
for(let seed=1;seed<=8;seed++){
 const state=createAdventure(seed);startAdventure(state,'throw','recall');
 for(const node of state.region.nodes){
  const p=state.player,answer=sight(state.region,p.x,p.y,node.x,node.y);
  assert.equal(answer,sampledClear(state.region,p.x,p.y,node.x,node.y),'actual generated rocks/paths agree with real point collision geometry');
  compared++;answer?clear++:blocked++;
 }
}
assert.ok(clear>150&&blocked>100,'canonical cases cover clear lanes and obstructed shortcuts');
const benchmark=createAdventure(10);startAdventure(benchmark,'throw','recall');
const start=performance.now();let accepted=0;
for(let i=0;i<20000;i++){const target=benchmark.region.nodes[i%benchmark.region.nodes.length];if(sight(benchmark.region,benchmark.player.x,benchmark.player.y,target.x,target.y))accepted++;}
console.log(`PASS projectile sight: exact thin obstacle/gap, tangent, rounded/degenerate/bent paths, scratch reuse; ${compared} canonical comparisons (${clear}clear/${blocked}blocked). 20,000 desktop Node checks ${(performance.now()-start).toFixed(1)}ms, ${accepted}clear. This is geometry/CPU evidence, not mobile frame or gameplay evidence.`);
