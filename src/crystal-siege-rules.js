// Renderless Act 5 prototype. Existing combat owns actor HP, rewards and score.
// Each room is one round; only the caller advances rooms or creates the boss.
export const CRYSTAL_SIEGE_VERSION=1;
export const CRYSTAL_SIEGE_PACKETS=Object.freeze([18,20,22,24,26]);
export const CRYSTAL_SIEGE_MOBS=165;
export const CRYSTAL_SIEGE_LIMITS=Object.freeze({live:24,spawnsPerStep:2,maxStep:.1,prep:20,defense:25,minX:-7.5,maxX:7.5,minZ:-6.5,maxZ:6.5});
const PADS=Object.freeze([[-3,-2.5],[3,-2.5],[-3,2.5],[3,2.5]].map(([x,z],i)=>Object.freeze({id:`pad-${i}`,x,z})));
const NODE_POINTS=Object.freeze([[-5,-4.5],[0,-4.5],[5,-4.5],[-5,4.5],[0,4.5],[5,4.5]]);
const SPEC=Object.freeze({turret:{cost:3,hp:45,range:4.2,period:.65,damage:9},snare:{cost:2,hp:40,range:3,period:1.1},wall:{cost:2,hp:75}});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const time=dt=>Number.isFinite(dt)?clamp(dt,0,.1):0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const keys=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
const rng=s=>{let n=s.seed|0;n^=n<<13;n^=n>>>17;n^=n<<5;s.seed=n>>>0;return s.seed/4294967296;};
const out=()=>({spawns:[],hits:[],snares:[],events:[],phase:'prep',clear:false,bossReady:false});
const fail=()=>{throw new Error('Invalid or unsupported crystal siege checkpoint');};
const maxHp=(kind,level)=>SPEC[kind].hp+(level-1)*(kind==='wall'?35:15);
export function clampCrystalSiegePoint(p){if(!point(p))throw new Error('Invalid crystal siege point');return{x:clamp(p.x,-7.5,7.5),z:clamp(p.z,-6.5,6.5)};}

export function createCrystalSiege(room=0,seed=1,carry=null){
 if(!integer(room,0,4)||!integer(seed,0,4294967295))throw new Error('Invalid crystal siege room or seed');
 const s={version:1,room,seed:seed||1,phase:'prep',elapsed:0,spawnClock:.35,spawnIndex:0,spawned:0,core:{x:0,z:0,hp:100},resources:3,nodes:NODE_POINTS.map(([x,z],i)=>({id:`node-${room}-${i}`,x,z,harvested:false})),pads:PADS.map(p=>({...p,kind:null,level:0,hp:0,cooldown:0})),out:out()};
 if(carry){const previous=restoreCrystalSiege(carry);if(previous.room!==room-1||previous.phase!=='clear'||previous.core.hp<=0)fail();s.core.hp=Math.min(100,previous.core.hp+15);s.resources=previous.resources;s.pads=previous.pads.map(p=>({...p,cooldown:0}));}
 return s;
}
const denied=reason=>({ok:false,reason});
export function harvestCrystalSiege(s,nodeId,player){
 if(s.phase!=='prep')return denied('phase');
 const node=s.nodes.find(n=>n.id===nodeId);if(!node)return denied('node');if(node.harvested)return denied('harvested');
 if(!point(player)||distance(node,player)>1.3)return denied('distance');
 node.harvested=true;s.resources+=2;return{ok:true,nodeId,resources:2};
}
export function buildCrystalSiege(s,padId,kind,player){
 if(s.phase!=='prep')return denied('phase');if(!Object.hasOwn(SPEC,kind))return denied('kind');
 const pad=s.pads.find(p=>p.id===padId);if(!pad)return denied('pad');if(!point(player)||distance(pad,player)>1.7)return denied('distance');
 const old=pad.kind?pad:null;if(old&&old.kind!==kind)return denied('occupied');
 if(old&&old.hp>0&&old.level===2)return denied('max-level');
 const cost=SPEC[kind].cost;if(s.resources<cost)return denied('resources');
 s.resources-=cost;
 // A destroyed facility may be rebuilt at its existing level, paying again.
 // It cannot reset a level-2 facility into unlimited fresh upgrades.
 const level=old?old.hp>0?old.level+1:old.level:1;
 const rebuilt=!!old&&old.hp<=0;Object.assign(pad,{kind,level,hp:maxHp(kind,level),cooldown:0});
 return{ok:true,padId,kind,level,cost,rebuilt};
}
export function startCrystalSiegeDefense(s){if(s.phase!=='prep'||s.core.hp<=0)return denied('phase');s.phase='defense';s.elapsed=0;return{ok:true};}
function reset(s){for(const k of ['spawns','hits','snares','events'])s.out[k].length=0;s.out.phase=s.phase;s.out.clear=s.phase==='clear';s.out.bossReady=s.phase==='clear'&&s.room===4;return s.out;}
function facilities(s,delta,live,o,{boss=false}={}){
 for(const pad of s.pads){const f=pad;if(!f.kind||f.hp<=0||f.kind==='wall'||boss&&f.kind==='snare')continue;f.cooldown=Math.max(0,f.cooldown-delta);if(f.cooldown>0)continue;
  const spec=SPEC[f.kind],range=spec.range+(f.level-1)*.5;let target=null,nearest=Infinity;for(const e of live){const d=distance(pad,e);if(d<=range&&d<nearest){nearest=d;target=e;}}
  if(!target)continue;f.cooldown=spec.period-(f.level-1)*.15;
  if(f.kind==='turret')o.hits.push({id:target.id,facilityId:pad.id,damage:spec.damage+(f.level-1)*4});
  else o.snares.push({id:target.id,facilityId:pad.id,factor:f.level===2?.45:.6,duration:.8});
 }
}
export function stepCrystalSiegeBossFacilities(s,dt,enemies=[]){
 const o=reset(s),delta=time(dt);
 // Only the honestly cleared fifth night can retain its paid turrets. This
 // hook never advances a wave, harvests resources, or slows a boss.
 if(!delta||s.phase!=='clear'||s.room!==4||s.core.hp<=0)return o;
 const live=[],seen=new Set();for(const e of enemies){if(!e||typeof e.id!=='string'||!point(e)||!Number.isFinite(e.hp)||e.hp<=0||seen.has(e.id))continue;seen.add(e.id);live.push(e);}
 facilities(s,delta,live,o,{boss:true});return o;
}
// Facility combat is shared; a mode owns its own preparation and wave ledger.
// The Journey boss entry above retains its cleared-fifth-night requirement.
export function stepCrystalSiegePaidFacilities(s,dt,enemies=[],{boss=false}={}){
 const o=reset(s),delta=time(dt);
 if(!delta||s.core.hp<=0||(boss?!['clear','boss'].includes(s.phase):s.phase!=='defense'))return o;
 const live=[],seen=new Set();for(const e of enemies){if(!e||typeof e.id!=='string'||!point(e)||!Number.isFinite(e.hp)||e.hp<=0||seen.has(e.id))continue;seen.add(e.id);live.push(e);}
 facilities(s,delta,live,o,{boss});return o;
}
export function stepCrystalSiege(s,dt,{player,enemies=[]}={}){
 const o=reset(s),delta=time(dt);if(!delta||['failed','clear','boss'].includes(s.phase))return o;
 if(s.core.hp<=0){s.phase='failed';o.phase='failed';o.events.push({type:'core-failed'});return o;}
 const live=[],seen=new Set();for(const e of enemies){if(!e||typeof e.id!=='string'||!point(e)||!Number.isFinite(e.hp)||e.hp<=0||seen.has(e.id))continue;seen.add(e.id);live.push(e);}
 s.elapsed+=delta;
 if(s.phase==='prep'){if(s.elapsed>=20){s.phase='defense';s.elapsed=0;o.events.push({type:'defense-start',room:s.room});}o.phase=s.phase;return o;}
 facilities(s,delta,live,o);
 if(s.spawnIndex<CRYSTAL_SIEGE_PACKETS[s.room])s.spawnClock-=delta;
 if(s.spawnIndex<CRYSTAL_SIEGE_PACKETS[s.room]&&s.spawnClock<=0){
  // One packet only, including after pause/cap. Never partially consume a pair.
  s.spawnClock=.6;const count=s.spawnIndex%2?2:1;
  if(live.length+count<=24){const index=s.spawnIndex++,side=Math.floor(rng(s)*4),offset=-4+rng(s)*8;
   for(let i=0;i<count;i++){const p=clampCrystalSiegePoint(side===0?{x:-7.3,z:offset+i*.7}:side===1?{x:7.3,z:offset+i*.7}:side===2?{x:offset+i*.7,z:-6.3}:{x:offset+i*.7,z:6.3});
    o.spawns.push({id:`siege-${s.room}-${index}-${i}`,position:p,hp:48+s.room*12,type:index%5===4?'charger':'shooter',speed:1.7+s.room*.12,damage:5+s.room,shots:1,windup:.75,cooldown:1,bulletSpeed:5,side:'front'});s.spawned++;
   }
  }
 }
 if(s.elapsed>=25&&s.spawnIndex===CRYSTAL_SIEGE_PACKETS[s.room]&&!live.length&&!o.spawns.length){s.phase='clear';o.clear=true;o.bossReady=s.room===4;o.events.push({type:'round-clear',room:s.room});}
 o.phase=s.phase;return o;
}

export function createCrystalSiegeThreat(packet){if(!packet||typeof packet.id!=='string'||!point(packet.position)||!finite(packet.hp,1,1e6)||!finite(packet.speed,.1,8)||!finite(packet.damage,0,30))throw new Error('Invalid crystal siege threat');return{id:packet.id,position:clampCrystalSiegePoint(packet.position),hp:packet.hp,speed:packet.speed,damage:packet.damage,phase:'entry',timer:.75,target:null,aim:{x:0,z:0},slowFor:0,slowFactor:1};}
export function applyCrystalSiegeSnare(model,effect){
 if(!model||!/^pad-[0-3]$/.test(effect?.facilityId)||!finite(effect.factor,.1,1)||!finite(effect.duration,0,4))return false;
 const effects=model.siegeSnares??=[];let item=effects.find(x=>x.id===effect.facilityId);
 if(!item){if(effects.length>=4)return false;item={id:effect.facilityId,factor:effect.factor,remaining:effect.duration};effects.push(item);}
 else{item.factor=effect.factor;item.remaining=Math.max(item.remaining,effect.duration);}
 let factor=1,remaining=0;for(const item of effects){factor=Math.min(factor,item.factor);remaining=Math.max(remaining,item.remaining);}model.slowFactor=factor;model.slowFor=remaining;return true;
}
export function stepCrystalSiegeThreat(model,dt,s,{player}={}){
 if(!point(model?.position))throw new Error('Invalid crystal siege threat position');Object.assign(model.position,clampCrystalSiegePoint(model.position));
 const o={position:{...model.position},tell:null,coreHit:0,wallHit:null},delta=time(dt);if(!delta||s.phase!=='defense'||s.core.hp<=0||model.hp<=0)return o;
 const p=model.position;
 if(model.siegeSnares){const effects=model.siegeSnares;let factor=1,remaining=0;for(let i=effects.length-1;i>=0;i--){const item=effects[i];item.remaining=Math.max(0,item.remaining-delta);if(!item.remaining)effects.splice(i,1);else{factor=Math.min(factor,item.factor);remaining=Math.max(remaining,item.remaining);}}model.slowFactor=factor;model.slowFor=remaining;}
 else{model.slowFor=Math.max(0,(model.slowFor||0)-delta);if(!model.slowFor)model.slowFactor=1;}
 if(model.phase==='entry'||model.phase==='recover'){if(model.phase==='entry')o.tell={kind:'entry',position:{...p},remaining:model.timer};model.timer=Math.max(0,model.timer-delta);if(!model.timer)model.phase='approach';return o;}
 if(model.phase==='windup'){
  const t=model.target;o.tell={kind:'siege-strike',position:{x:t.x,z:t.z},duration:.55,remaining:model.timer,target:t.id||'core'};model.timer=Math.max(0,model.timer-delta);
  if(!model.timer){if(!t.id){if(distance(p,t)<=.95){o.coreHit=Math.min(s.core.hp,model.damage);s.core.hp-=o.coreHit;}}
   else{const pad=s.pads.find(p=>p.id===t.id);if(pad&&pad.kind==='wall'&&pad.hp>0&&distance(p,t)<=.95){const damage=Math.min(pad.hp,model.damage);pad.hp-=damage;o.wallHit={id:pad.id,damage};}}
   model.phase='recover';model.timer=1;model.target=null;if(s.core.hp<=0)s.phase='failed';
  }return o;
 }
 let target=s.core;for(const pad of s.pads){if(pad.kind==='wall'&&pad.hp>0&&distance(p,pad)<=1.25){target=pad;break;}}
 const d=distance(p,target);
 if(d<=.85+1e-9){model.phase='windup';model.timer=.55;model.target={x:target.x,z:target.z,...(target.id?{id:target.id}:{})};model.aim=d>1e-9?{x:(target.x-p.x)/d,z:(target.z-p.z)/d}:{x:1,z:0};o.tell={kind:'siege-strike',position:{x:target.x,z:target.z},duration:.55,remaining:.55,target:target.id||'core'};return o;}
 const length=Math.min(d-.85,model.speed*delta*clamp(model.slowFactor||1,.1,1)),next=clampCrystalSiegePoint({x:p.x+(target.x-p.x)/d*length,z:p.z+(target.z-p.z)/d*length});Object.assign(p,next);o.position=next;return o;
}
export function checkpointCrystalSiege(s){return{version:1,room:s.room,seed:s.seed,phase:s.phase,elapsed:s.elapsed,spawnClock:s.spawnClock,spawnIndex:s.spawnIndex,spawned:s.spawned,core:{...s.core},resources:s.resources,nodes:s.nodes.map(n=>({...n})),pads:s.pads.map(p=>({...p}))};}
export function restoreCrystalSiege(saved){
 if(!keys(saved,['version','room','seed','phase','elapsed','spawnClock','spawnIndex','spawned','core','resources','nodes','pads'])||saved.version!==1||!integer(saved.room,0,4)||!integer(saved.seed,1,4294967295)||!['prep','defense','clear','failed','boss'].includes(saved.phase)||!finite(saved.elapsed,0,1e6)||!finite(saved.spawnClock,-.1,.6)||!integer(saved.spawnIndex,0,CRYSTAL_SIEGE_PACKETS[saved.room])||saved.spawned!==saved.spawnIndex+Math.floor(saved.spawnIndex/2)||!integer(saved.resources,0,3+12*(saved.room+1))||!keys(saved.core,['x','z','hp'])||saved.core.x!==0||saved.core.z!==0||!finite(saved.core.hp,0,100)||!Array.isArray(saved.nodes)||saved.nodes.length!==6||!Array.isArray(saved.pads)||saved.pads.length!==4)fail();
 if(saved.phase==='prep'&&(saved.elapsed>=20||saved.spawnIndex!==0)||['clear','boss'].includes(saved.phase)&&(saved.elapsed<25||saved.spawnIndex!==CRYSTAL_SIEGE_PACKETS[saved.room])||saved.phase==='boss'&&saved.room!==4||saved.core.hp===0&&saved.phase!=='failed'||saved.phase==='failed'&&saved.core.hp>0)fail();
 const s=createCrystalSiege(saved.room,saved.seed);for(let i=0;i<6;i++){const n=saved.nodes[i],expected=s.nodes[i];if(!keys(n,['id','x','z','harvested'])||n.id!==expected.id||n.x!==expected.x||n.z!==expected.z||typeof n.harvested!=='boolean')fail();expected.harvested=n.harvested;}
 for(let i=0;i<4;i++){const p=saved.pads[i],expected=s.pads[i];if(!keys(p,['id','x','z','kind','level','hp','cooldown'])||p.id!==expected.id||p.x!==expected.x||p.z!==expected.z)fail();if(p.kind===null){if(p.level!==0||p.hp!==0||p.cooldown!==0)fail();}else if(!Object.hasOwn(SPEC,p.kind)||!integer(p.level,1,2)||!finite(p.hp,0,maxHp(p.kind,p.level))||!finite(p.cooldown,0,1.1))fail();Object.assign(expected,p);}
 Object.assign(s,{phase:saved.phase,elapsed:saved.elapsed,spawnClock:saved.spawnClock,spawnIndex:saved.spawnIndex,spawned:saved.spawned,core:{...saved.core},resources:saved.resources});return s;
}
