// Damage simulation shared by the balance test: every evolution fights the same three crowds for a fixed time.
// Enemies do not die (huge health) and walk slowly toward the seed, so the numbers compare attack shapes, not kill luck.
import * as THREE from 'three';
import {createFormCombat} from '../src/form-combat.js';
import {TWIN_FORMS} from '../src/forms.js';
import {arenaFor,constrainToArena,reflectArenaBoundary} from '../src/arena.js';
const V=THREE.Vector3;

export const SCENES=Object.freeze({
 cluster:()=>Array.from({length:10},(_,i)=>{const a=i*2.39996,r=.5+1.3*Math.sqrt(i/10);return [Math.cos(a)*r,-5+Math.sin(a)*r];}),
 line:()=>Array.from({length:8},(_,i)=>[0,-2.5-i*.9]),
 scattered:()=>Array.from({length:10},(_,i)=>{const a=i*Math.PI*2/10+.3,r=3.5+(i%3)*2;return [Math.cos(a)*r,Math.sin(a)*r];})
});

export function simulate(id,level,{scene='cluster',seconds=10,dt=1/50,surgeAt=null,surgeSeconds=0,shots=false,positions=null,enemyType='swarm'}={}){
 const arena=arenaFor(0);
 const enemies=(positions||SCENES[scene]()).map(([x,z],i)=>({type:enemyType,hp:1e9,maxHp:1e9,g:{position:new V(x,0,z)},slow:0,i}));
 const parts=TWIN_FORMS[id]?TWIN_FORMS[id].parts:[id],movingHalo=parts.includes('comethalo');
 const player={position:new V(movingHalo?1.2:0,0,0)};
 let damage=0;const shotList=[];
 // A twin awakening fights with two combats, like the game (one per attack, openings staggered by five seconds).
 const combats=parts.map((part,i)=>{const c=createFormCombat(new THREE.Scene(),{player,enemies:()=>enemies,
  hit:(e,amount)=>{damage+=amount;return true;},blocked:()=>false,
  boundary:(a,b,dir)=>reflectArenaBoundary(a,b,dir,arena),constrain:(p,r)=>constrainToArena(p,r,arena),vfx:null,enemyShots:()=>shotList});
  c.set(part,level,TWIN_FORMS[id]?{twin:true,openingDelay:2+i*5}:{});c.cooldown=0;return c;});
 let t=0,surged=false;
 const steps=Math.round(seconds/dt);
 for(let step=0;step<steps;step++,t+=dt){
  // 혜성 화관은 이동을 공격 자원으로 쓰는 숙련 조합이다. 비교표에서는
  // 작은 원을 계속 도는 의도 플레이를 재고, 별도 테스트에서 정지 약점을 확인한다.
  if(movingHalo)player.position.set(Math.cos(t*2.2)*1.2,0,Math.sin(t*2.2)*1.2);
  // Enemy shots fly in from 6 units away, three at a time, twice a second.
  if(shots&&step%25===0)for(let k=0;k<3;k++){const a=k*2.1+step*.01;shotList.push({life:1.5,boss:enemyType==='austin',dir:new V(-Math.cos(a),0,-Math.sin(a)),ob:{position:new V(Math.cos(a)*6,.7,Math.sin(a)*6)}});}
  for(const q of shotList){q.life-=dt;if(q.life>0)q.ob.position.addScaledVector(q.dir,dt*4.5);}
  for(let i=shotList.length-1;i>=0;i--)if(shotList[i].life<=0)shotList.splice(i,1);
  if(surgeAt!==null&&!surged&&t>=surgeAt){
   const target=nearest(enemies,player.position);
   for(const combat of combats)combat.surge(surgeSeconds,{aim:target?target.g.position.clone().sub(player.position).setY(0).normalize():null});surged=true;
  }
  for(const e of enemies){
   e.slow=Math.max(0,e.slow-dt);
   const toward=player.position.clone().sub(e.g.position).setY(0);
   if(toward.length()>1.2)e.g.position.addScaledVector(toward.normalize(),dt*.6*(e.slow>0?.5:1));
  }
  const target=nearest(enemies,player.position);
  for(const combat of combats){
   combat.cooldown-=dt;
   if(combat.cooldown<=0&&target){const aim=target.g.position.clone().sub(player.position).setY(0).normalize();combat.cooldown=combat.fire(player.position,aim,target.g.position);}
   combat.update(dt);
  }
 }
 const state=combats[0].state();for(const combat of combats)combat.dispose();
 return {damage,dps:damage/seconds,state};
}
const nearest=(enemies,p)=>enemies.slice().sort((a,b)=>a.g.position.distanceToSquared(p)-b.g.position.distanceToSquared(p))[0];

// Average damage per second over the three crowds.
export function averageDps(id,level,options={}){
 const names=Object.keys(SCENES);
 return names.reduce((sum,scene)=>sum+simulate(id,level,{...options,scene}).dps,0)/names.length;
}

// One durable boss walking in from mid range. This exposes attacks that score
// huge crowd numbers but do little to the target that ends a journey.
export function bossDps(id,level,options={}){
 return simulate(id,level,{...options,positions:[[0,-5]],enemyType:'austin'}).dps;
}
