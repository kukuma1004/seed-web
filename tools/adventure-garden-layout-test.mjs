import assert from 'node:assert/strict';
import {makeAdventureGardenLayout} from '../src/adventure-garden-layout.js';

function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function distanceToSegment(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
function inside(g,x,y,pad=.5){return g.nodes.some(n=>Math.hypot(x-n.x,y-n.y)<=n.r-pad)||g.edges.some(([a,b])=>distanceToSegment(x,y,g.nodes[a],g.nodes[b])<=g.pathWidth-pad);}
function field(g){
 const walk=new Uint8Array(g.w*g.h),seen=new Uint8Array(walk.length),queue=[];
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)walk[y*g.w+x]=Number(inside(g,x+.5,y+.5));
 const start=Math.floor(g.start.y)*g.w+Math.floor(g.start.x);seen[start]=1;queue.push(start);
 for(let i=0;i<queue.length;i++){
  const at=queue[i],x=at%g.w,y=Math.floor(at/g.w);
  for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&ny>=0&&nx<g.w&&ny<g.h){const next=ny*g.w+nx;if(walk[next]&&!seen[next]){seen[next]=1;queue.push(next);}}
 }
 return{walk,seen,count:queue.length};
}
let minCoverage=1,maxCoverage=0;
for(let act=0;act<3;act++)for(let seed=1;seed<=80;seed++){
 const g=makeAdventureGardenLayout(act,seeded(seed)),repeat=makeAdventureGardenLayout(act,seeded(seed));
 assert.deepEqual(g,repeat,'same seeded expedition must have the same garden');
 assert(g.w*g.h<=2100,'flow fields stay below the compact mobile cell budget');
 assert(g.nodes.length>=7&&g.nodes.length<=9);
 assert(g.pathWidth>=3.2,'two-way fighting and a dodge must fit between lawns');
 assert(g.edges.length>=g.nodes.length+2,'several tactical escape loops are required');
 assert(g.edges.length<=14,'keep path scans bounded');
 assert(g.landmarks.length<=4);
 for(const n of g.nodes){
  assert(Number.isFinite(n.x+n.y+n.r));
  assert(n.x-n.r>=1.3&&n.y-n.r>=1.3&&n.x+n.r<=g.w-1.3&&n.y+n.r<=g.h-1.3,'lawns remain inside the playable arena');
  assert(g.edges.filter(e=>e.some(i=>g.nodes[i]===n)).length>=2,'an encounter cannot be a mandatory dead-end');
 }
 for(const role of ['start','gate','raid','altar','hoard'])assert.equal(g.nodes.filter(n=>n.role===role).length,1,`${role} stays identifiable`);
 assert(inside(g,g.gateNode.x+1.8,g.gateNode.y,1.6),'exit gate fits inside its guardian lawn');
 assert(Math.hypot(g.start.x-g.gateNode.x,g.start.y-g.gateNode.y)>30,'gate guards cannot overlap the safe arrival');
 const f=field(g),coverage=f.count/f.walk.length;minCoverage=Math.min(minCoverage,coverage);maxCoverage=Math.max(maxCoverage,coverage);
 assert(coverage>.5&&coverage<.83,'garden has broad lawns plus meaningful planted margins, not tunnel chains or a blank rectangle');
 assert.equal(f.count,f.walk.reduce((sum,v)=>sum+v,0),'all walkable cells belong to one connected garden');
 for(const n of g.nodes){
  assert(f.seen[Math.floor(n.y)*g.w+Math.floor(n.x)],'every encounter is reachable on the actual navigation cell grid');
  for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]])assert(inside(g,n.x+dx,n.y+dy,.5),'encounters allow escapes in every direction');
 }
 // A fresh region cannot borrow/mutate another room's graph or landmark data.
 g.edges[0][0]=99;g.landmarks[0].kind='changed';
 assert.deepEqual(makeAdventureGardenLayout(act,seeded(seed)),repeat);
}
const first=makeAdventureGardenLayout(0,seeded(1)),second=makeAdventureGardenLayout(1,seeded(1)),third=makeAdventureGardenLayout(2,seeded(1));
assert.equal(new Set([first.theme,second.theme,third.theme]).size,3);
assert.notDeepEqual(first.edges,second.edges);assert.notDeepEqual(second.edges,third.edges);
const pond=second.landmarks.find(l=>l.kind==='pond');assert(!inside(second,pond.x,pond.y,0),'pond occupies the planted negative space, not a disguised walkable combat center');
console.log(`Garden layout: 240 seeded navigation grids passed; coverage ${(minCoverage*100).toFixed(1)}–${(maxCoverage*100).toFixed(1)}%, bounded 2052 cells, broad routes and reachable events.`);
