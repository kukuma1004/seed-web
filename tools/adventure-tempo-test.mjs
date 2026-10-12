import assert from 'node:assert/strict';
import {makeAdventureGardenLayout} from '../src/adventure-garden-layout.js';
import {createAdventure,startAdventure,adventureWalkable,adventureRoute} from '../src/seed-adventure-rules.js';
function graphDistance(g,edges){const d=g.nodes.map(()=>Infinity);d[0]=0;const visited=new Set();while(visited.size<d.length){let next=-1;for(let i=0;i<d.length;i++)if(!visited.has(i)&&(next<0||d[i]<d[next]))next=i;visited.add(next);for(const [a,b] of edges){const other=a===next?b:b===next?a:-1;if(other<0)continue;const p=g.nodes[next],q=g.nodes[other];d[other]=Math.min(d[other],d[next]+Math.hypot(p.x-q.x,p.y-q.y));}}return d[1];}
let shortest=Infinity,longest=0;
for(let seed=1;seed<=80;seed++){
 let n=seed;const rng=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const g=makeAdventureGardenLayout(0,rng),old=g.edges.filter(([a,b])=>!(a===0&&b===4)),before=graphDistance(g,old),after=graphDistance(g,g.edges);
 assert.ok(after<before*.9,'first-act main route removes at least a tenth of mandatory walking while retaining optional loops');shortest=Math.min(shortest,after/before);longest=Math.max(longest,after/before);
 const s=createAdventure(seed);startAdventure(s,'slash','recall');const R=s.region;
 for(let x=R.start.x;x<R.nodes.find(q=>q.role==='raid').x;x+=.5)assert.ok(adventureWalkable(s,x,R.start.y,.45),'direct lawn route fits the player body');
 const near=s.enemies.filter(e=>e.pack===1);assert.ok(near.every(e=>Math.hypot(e.x-R.start.x,e.y-R.start.y)<13));
 assert.ok(near.length>=3&&near.length<=4,'opening encounter is nearby and bounded');assert.ok(near.every(e=>!e.guard),'exit guardians remain a separate encounter');
 assert.ok(s.enemies.filter(e=>e.guard).length===5&&s.enemies.length<=64,'no increased first-room guardian/object budget');
 adventureRoute(s,R.start,R.gate);assert.ok(R.flows.size<=11);
}
console.log(`PASS80 first gardens: body-safe direct route, nearby3–4mob lesson, fixed5guard budget; required graph walking ${(shortest*100).toFixed(1)}–${(longest*100).toFixed(1)}% of old route. Geometry/model evidence only.`);
