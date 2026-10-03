import {hitCrystalWall} from './act-expansion.js';
import {EXPANSION_RUNTIME_LIMITS,sweepCrystalTerrain,damageCrystalTerrain,constrainCrystalActor,applyCrystalTerrainActions} from './act-expansion-runtime.js';

// The wall array remains the sole save/collision authority. Target proxies let
// the existing authored hit/area/chain engine damage terrain without inventing
// another set of 162 attacks. They must NOT go through enemyDown, charge, score,
// kill thresholds or drops. The host keeps them separate from living enemies.
export function createCrystalCombatBridge(walls,{position=(x,z)=>({x,y:0,z})}={}){
 if(!Array.isArray(walls)||walls.length>EXPANSION_RUNTIME_LIMITS.walls)throw new Error('Crystal terrain exceeds its wall budget');
 const seen=new Set(),byTarget=new WeakMap();
 const targets=walls.map(w=>{
  if(!w||typeof w.id!=='string'||seen.has(w.id)||![w.x,w.z,w.w,w.d,w.hp,w.maxHp].every(Number.isFinite)||w.w<=0||w.d<=0||w.maxHp<=0)throw new Error('Invalid crystal terrain');
  seen.add(w.id);
  const target={type:'crystal-wall',terrain:true,immovable:true,id:w.id,g:{position:position(w.x,w.z),rotation:{y:0}},hp:w.hp,maxHp:w.maxHp,dead:w.broken,slow:0};
  byTarget.set(target,w);return target;
 });
 function sync(){
  for(const target of targets){const w=byTarget.get(target);target.hp=w.hp;target.maxHp=w.maxHp;target.dead=w.broken;target.g.position.x=w.x;target.g.position.z=w.z;target.slow=0;}
  return targets;
 }
 function damage(target,amount,{law}={}){
  const w=byTarget.get(target);if(!w)return false;
  const response=hitCrystalWall(w,amount,law);target.hp=w.hp;target.dead=w.broken;return response.damage>0;
 }
 function query(center,radius,out=[]){
  out.length=0;const reach=Math.max(0,Number.isFinite(radius)?radius:0);
  for(const target of targets){if(target.dead)continue;const w=byTarget.get(target),dx=Math.max(0,Math.abs(center.x-w.x)-w.w/2),dz=Math.max(0,Math.abs(center.z-w.z)-w.d/2);if(dx*dx+dz*dz<=reach*reach)out.push(target);}
  return out;
 }
 function sweep(from,to,options){const result=sweepCrystalTerrain(walls,from,to,options);sync();return result;}
 function area(center,radius,amount,law){const result=damageCrystalTerrain(walls,center,radius,amount,law);sync();return result;}
 // Regrowth must not trap either a player or an enemy already occupying cover.
 // Defer that one crystal; do not teleport the actor or grow a replacement ID.
 function apply(actions,actors=[]){
  const safe=actions.slice(0,EXPANSION_RUNTIME_LIMITS.terrainPerStep).filter(action=>{
   if(action.type!=='regrow')return true;const w=walls.find(w=>w.id===action.id);if(!w)return false;
   return !actors.some(actor=>{
    const p=actor.position||actor.g?.position;if(!p||actor.dead)return false;
    const radius=Math.max(0,Number.isFinite(actor.radius)?actor.radius:.65),dx=Math.max(0,Math.abs(p.x-w.x)-w.w/2),dz=Math.max(0,Math.abs(p.z-w.z)-w.d/2);
    return dx*dx+dz*dz<=radius*radius;
   });
  });
  const count=applyCrystalTerrainActions(walls,safe);sync();return count;
 }
 return {targets,owns:target=>byTarget.has(target),sync,damage,query,sweep,area,apply,constrain:(p,r,previous)=>constrainCrystalActor(p,r,walls,previous)};
}

// A piercing bolt crossing the same AABB over several frames deals one contact
// per leg. Consume this result instead of a second enemy-style wall hit.
export function traceCrystalProjectile(terrain,shot,previous,next,{damage,laws=[],maxBounces=3,bounces=shot.bounces||0}={}){
 shot.crystalHits??=new Set();
 const result=terrain.sweep(previous,next,{damage,laws,bounces,maxBounces,skipDamageIds:shot.crystalHits});
 for(const hit of result.hits)if(hit.damage>0)shot.crystalHits.add(hit.id);
 next.x=result.point.x;next.z=result.point.z;
 if(result.reflected){shot.dir.x=result.dir.x;shot.dir.z=result.dir.z;}
 return result;
}
