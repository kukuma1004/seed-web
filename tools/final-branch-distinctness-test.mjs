import assert from 'node:assert/strict';
import * as THREE from 'three';
import matrix from '../docs/COMBO_162_FINAL_BRANCH_MATRIX.json' with {type:'json'};
import {FINAL_BRANCH_PATTERNS} from '../src/final-branch-patterns.js';
import {createFinalBranchCombat} from '../src/final-branch-combat.js';

const V=THREE.Vector3;
function trace(id){
 const events=[];
 const player={position:new V(0,0,0)};
 const enemies=[[-3,-3],[-1,-4],[1,-4],[3,-3],[1,0]].map(([x,z])=>({type:'chaser',dead:false,slow:0,g:{position:new V(x,0,z)}}));
 const fx=Object.fromEntries(['pulse','burst','explosion','lance','trail','arc','reflect','split'].map(name=>[name,(p)=>{if(events.length<180)events.push(`${name}:${Math.round((p?.x||0)*2)}:${Math.round((p?.z||0)*2)}`);} ]));
 const layer=createFinalBranchCombat({player,enemies:()=>enemies,deal:(_e,n)=>{events.push(`hit:${Math.round(n)}`);return true;},boundary:()=>false,reflector:()=>false,blocked:()=>false,constrain:p=>p,fx});
 layer.set(id,100,5,FINAL_BRANCH_PATTERNS[id].motion==='satellite','collapse');
 for(let frame=0;frame<80;frame++){
  if(frame%18===0){layer.onFire(player.position,new V(0,0,-1),enemies[1].g.position);layer.onHit(enemies[1]);}
  if(frame===25)layer.onOpening(player.position,new V(0,0,-1));
  layer.update(.05);
 }
 return events.join('|');
}
let checked=0;
for(const pair of matrix.pairs){
 const [a,b]=pair.branches.map(x=>x.id);
 if(!FINAL_BRANCH_PATTERNS[a]||!FINAL_BRANCH_PATTERNS[b])continue;
 const left=trace(a),right=trace(b);
 assert.notEqual(left,right,`${a} and ${b} have indistinguishable event traces`);
 checked++;
}
assert.ok(checked>=20);
console.log(`Final branch distinction: ${checked} paired branches show different combat traces under identical inputs.`);
