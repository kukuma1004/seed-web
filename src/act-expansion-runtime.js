import {EXPANSION_ACTS,crosswindFormation,createCrystalWalls,restoreCrystalWalls,hitCrystalWall} from './act-expansion.js';

// Renderless adapter contract, shared by journey/survival/defense. World axes are
// x/z, matching g.position and the existing ctx.bolt(position,dir,spec) API.
// The caller owns damage, Three.js objects, disposal, rewards and room completion.
// Outputs are reused until the next step: consume/copy them before stepping again.
export const EXPANSION_RUNTIME_VERSION=1;
export const EXPANSION_RUNTIME_LIMITS=Object.freeze({enemies:24,projectiles:48,walls:20,spawnsPerStep:2,boltsPerStep:8,terrainPerStep:3,maxStep:.1});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const dtOf=dt=>clamp(finite(dt),0,EXPANSION_RUNTIME_LIMITS.maxStep);
const point=p=>({x:finite(p?.x),z:finite(p?.z)});
const acts=Object.keys(EXPANSION_ACTS);
function actId(value){if(!acts.includes(value))throw new Error(`Unknown expansion act: ${value}`);return value;}
function random(s){let a=s.seed|0;a^=a<<13;a^=a>>>17;a^=a<<5;s.seed=a>>>0;return s.seed/4294967296;}
function direction(from,to){const x=to.x-from.x,z=to.z-from.z,length=Math.hypot(x,z);return length>1e-8?{x:x/length,z:z/length}:{x:-1,z:0};}
const rotate=(d,angle)=>({x:d.x*Math.cos(angle)-d.z*Math.sin(angle),z:d.x*Math.sin(angle)+d.z*Math.cos(angle)});
const output=()=>({spawns:[],telegraphs:[],bolts:[],terrain:[],events:[],camera:{x:0,z:0},move:{x:0,z:0},contacts:[],coreOpen:false});
function resetOutput(out){for(const key of ['spawns','telegraphs','bolts','terrain','events','contacts'])out[key].length=0;out.move.x=out.move.z=0;out.coreOpen=false;return out;}
export function createExpansionCrystalWalls(room=0,saved){
 const walls=saved?restoreCrystalWalls(room,saved):createCrystalWalls(room);
 // Pair columns leave a 4.8-unit central lane and side routes. Unlike adjacent
 // old draft columns, each AABB is separated, so one visible crystal is one hit.
 for(let i=0;i<walls.length;i++){const pair=Math.floor(i/2),column=Math.floor(pair/6);walls[i].x=(i%2?1:-1)*(3+column*2.2);walls[i].z=-5+(pair%6)*2;}
 return walls;
}

export function createExpansionCourse(id,{room=0,seed=1,origin={x:0,z:0}}={}){
 const act=actId(id),stage=clamp(room|0,0,4),start=point(origin);
 const walls=act==='crystalGorge'?createExpansionCrystalWalls(stage):[];for(const w of walls){w.x+=start.x;w.z+=start.z;}
 return {version:EXPANSION_RUNTIME_VERSION,act,room:stage,seed:(seed>>>0)||1,origin:start,time:0,distance:0,spawnClock:.9,spawnIndex:0,finishAnnounced:false,walls,out:output()};
}

// Act 4 is a horizontal course, never an enclosed arena. travel is positive
// scroll distance supplied by a mode, or measured from the player's world x.
// Camera and forward/back entries are in world space; moving the camera must not
// move already spawned projectiles. No catch-up wave is emitted after a pause.
export function stepExpansionCourse(s,dt,{player,travel,enemyCount=0,projectileCount=0}={}){
 const out=resetOutput(s.out),step=dtOf(dt);if(!step)return out;
 const p=point(player||s.origin),definition=EXPANSION_ACTS[s.act],room=definition.rooms[s.room];s.time+=step;
 if(s.act==='crosswind')s.distance=clamp(Math.max(s.distance,p.x-s.origin.x)+(Number.isFinite(travel)?Math.max(0,travel):0),0,room.length);
 out.camera.x=s.act==='crosswind'?s.origin.x+s.distance+2:s.origin.x;out.camera.z=s.origin.z;
 // The canyon is crossed from z+7 to z-7. Pressure stops after a deliberate
 // crossing AND its encounter window; standing still cannot clear a room.
 if(s.act==='crystalGorge')s.distance=clamp(Math.max(s.distance,s.origin.z+7-p.z),0,14);
 const pressureTime=22+s.room*2;
 out.progress=s.act==='crosswind'?s.distance/room.length:Math.min(s.distance/14,s.time/pressureTime,1);
 out.finish=s.finishAnnounced||(s.act==='crosswind'?s.distance>=room.length:s.time>=pressureTime&&p.z<=s.origin.z-7);
 if(out.finish&&!s.finishAnnounced){s.finishAnnounced=true;out.events.push({type:'course-end',bossId:definition.bossId,room:s.room});}
 if(out.finish)return out;
 s.spawnClock-=step;if(s.spawnClock>0)return out;
 // Re-arm even when saturated; capacity reopening cannot release queued waves.
 s.spawnClock=Math.max(.82,1.7-s.room*.14)+random(s)*.25;
 const free=EXPANSION_RUNTIME_LIMITS.enemies-Math.max(0,finite(enemyCount));
 if(free<1||projectileCount>=EXPANSION_RUNTIME_LIMITS.projectiles)return out;
 const index=s.spawnIndex++,formation=s.act==='crosswind'?crosswindFormation(index,s.room):{side:'front',lane:[-4.8,0,4.8][index%3],type:index%5===4?'charger':'shooter',shots:1,windup:.85};
 const count=Math.min(free,s.room>=2&&index%4===3?2:1,EXPANSION_RUNTIME_LIMITS.spawnsPerStep);
 for(let i=0;i<count;i++){
  const side=formation.side,front=side==='front',cx=s.origin.x+s.distance;
  const position=s.act==='crosswind'?{x:cx+(front?12:-11),z:s.origin.z+clamp(formation.lane+(i?1.6:0),-6.4,6.4)}:{x:s.origin.x+clamp(formation.lane+(i?1.6:0),-6.4,6.4),z:s.origin.z-9};
  const threat={id:`${s.act}-${s.room}-${index}-${i}`,type:formation.type,position,side,shots:formation.shots,windup:formation.windup,
   hp:formation.type==='charger'?42+s.room*8:86+s.room*18,speed:formation.type==='charger'?4.1:2.1,cooldown:formation.type==='lobber'?2.1:1.7,bulletSpeed:5.2+s.room*.2,damage:12+s.room};
  out.spawns.push(threat);out.telegraphs.push({kind:'entry',id:threat.id,position:{...position},duration:formation.windup,side});
 }
 return out;
}

export function checkpointExpansionCourse(s){return {version:EXPANSION_RUNTIME_VERSION,act:s.act,room:s.room,seed:s.seed,origin:{...s.origin},time:s.time,distance:s.distance,spawnClock:s.spawnClock,spawnIndex:s.spawnIndex,finishAnnounced:s.finishAnnounced,walls:s.walls.map(w=>({id:w.id,hp:w.hp}))};}
export function restoreExpansionCourse(saved,fallback={act:'crosswind',room:0}){
 const valid=saved?.version===EXPANSION_RUNTIME_VERSION&&acts.includes(saved.act),s=createExpansionCourse(valid?saved.act:actId(fallback.act),valid?saved:fallback);if(!valid)return s;
 s.time=clamp(finite(saved.time),0,1e6);s.distance=clamp(finite(saved.distance),0,s.act==='crystalGorge'?14:EXPANSION_ACTS[s.act].rooms[s.room].length);
 s.spawnClock=clamp(finite(saved.spawnClock,.9),0,3);s.spawnIndex=clamp(Math.floor(finite(saved.spawnIndex)),0,1e7);s.finishAnnounced=Boolean(saved.finishAnnounced);
 if(s.act==='crystalGorge'){s.walls=createExpansionCrystalWalls(s.room,saved.walls);for(const w of s.walls){w.x+=s.origin.x;w.z+=s.origin.z;}}return s;
}

// Swept slab collision also catches fast spears crossing a thin crystal entirely.
// No solid collision/render object is ever returned for a broken wall.
function intersectWall(from,to,w,radius=0){
 if(w.broken)return null;let enter=0,exit=1,normal={x:0,z:0};
 for(const axis of ['x','z']){
  const half=(axis==='x'?w.w:w.d)/2+radius,delta=to[axis]-from[axis],lo=w[axis]-half,hi=w[axis]+half;
  if(Math.abs(delta)<1e-9){if(from[axis]<lo||from[axis]>hi)return null;continue;}
  const a=(lo-from[axis])/delta,b=(hi-from[axis])/delta,near=Math.min(a,b),far=Math.max(a,b);
  if(near>enter){enter=near;normal={x:0,z:0};normal[axis]=delta>0?-1:1;}
  exit=Math.min(exit,far);if(enter>exit)return null;
 }
 if(exit<0||enter>1)return null;
 if(!normal.x&&!normal.z){const d=direction(from,to);normal=Math.abs(d.x)>Math.abs(d.z)?{x:-Math.sign(d.x),z:0}:{x:0,z:-Math.sign(d.z)};}
 return {wall:w,t:clamp(enter,0,1),normal};
}
export function solidCrystalCover(walls){return walls.filter(w=>!w.broken).map(w=>({id:w.id,x:w.x,z:w.z,w:w.w,d:w.d,h:1.8}));}
export function sweepCrystalTerrain(walls,from,to,{damage=0,law, laws=[],radius=.1,bounces=0,maxBounces=3,skipDamageIds=null}={}){
 const start=point(from),end=point(to),dir=direction(start,end),contacts=[];for(const wall of walls.slice(0,EXPANSION_RUNTIME_LIMITS.walls)){const contact=intersectWall(start,end,wall,radius);if(contact)contacts.push(contact);}contacts.sort((a,b)=>a.t-b.t);
 const active=new Set([law,...laws]),hitLaw=active.has('burst')?'burst':law,result={point:end,dir,hits:[],blocked:false,reflected:false};
 for(const contact of contacts){const response=hitCrystalWall(contact.wall,skipDamageIds?.has(contact.wall.id)?0:damage,hitLaw);result.hits.push({id:contact.wall.id,...response});if(contact.wall.broken||active.has('pierce'))continue;
  const fraction=Math.max(0,contact.t-1e-4);result.point={x:start.x+(end.x-start.x)*fraction,z:start.z+(end.z-start.z)*fraction};
  result.blocked=true;if(active.has('reflect')&&bounces<Math.max(0,maxBounces)){const dot=dir.x*contact.normal.x+dir.z*contact.normal.z;result.dir={x:dir.x-2*dot*contact.normal.x,z:dir.z-2*dot*contact.normal.z};result.reflected=true;}break;
 }
 return result;
}
export function damageCrystalTerrain(walls,position,radius,damage,law){const p=point(position),hits=[];for(const w of walls.slice(0,EXPANSION_RUNTIME_LIMITS.walls)){if(w.broken)continue;const dx=Math.max(0,Math.abs(p.x-w.x)-w.w/2),dz=Math.max(0,Math.abs(p.z-w.z)-w.d/2);if(dx*dx+dz*dz<=radius*radius)hits.push({id:w.id,...hitCrystalWall(w,damage,law)});}return hits;}
export function constrainCrystalActor(position,radius,walls,previous=position){
 const start=point(previous),end=point(position),live=walls.slice(0,EXPANSION_RUNTIME_LIMITS.walls).filter(w=>!w.broken);
 const hits=live.map(w=>intersectWall(start,end,w,radius)).filter(Boolean).sort((a,b)=>a.t-b.t);
 if(hits.length){const h=hits[0],t=Math.max(0,h.t-1e-4);end.x=start.x+(end.x-start.x)*t;end.z=start.z+(end.z-start.z)*t;
  const slide={x:h.normal.x?end.x:position.x,z:h.normal.z?end.z:position.z};if(!live.some(w=>intersectWall(end,slide,w,radius)))Object.assign(end,slide);
 }
 // Resolve an already overlapping saved/teleported actor deterministically.
 for(let pass=0;pass<2;pass++)for(const w of live){const wx=w.w/2+radius,wz=w.d/2+radius,dx=end.x-w.x,dz=end.z-w.z;if(Math.abs(dx)<wx&&Math.abs(dz)<wz){if(wx-Math.abs(dx)<=wz-Math.abs(dz))end.x=w.x+Math.sign(dx||1)*(wx+.001);else end.z=w.z+Math.sign(dz||1)*(wz+.001);}}
 position.x=end.x;position.z=end.z;return position;
}

const BOSS_IDS=Object.freeze({crosswindKeeper:'crosswind',crystalGardener:'crystalGorge'});
const BOSS_MOVES=Object.freeze({
 crosswindKeeper:Object.freeze([
  {id:'locked-sweep',name:'고정된 바람길',hint:'처음 조준한 사선의 옆으로 이동하세요',tell:.8,attack:1.05,recovery:1.15},
  {id:'rear-salvo',name:'뒤따르는 잎배',hint:'뒤쪽 두 잎배의 틈으로 이동하세요',tell:1.05,attack:1.05,recovery:1.25},
  {id:'crossing-flight',name:'가로지르는 날개',hint:'잠긴 비행선에서 비켜 회복 중인 날개를 공격하세요',tell:.85,attack:.65,recovery:1.4}
 ]),
 crystalGardener:Object.freeze([
  {id:'prism-fan',name:'빛의 가지',hint:'수정과 부채꼴 사이의 빈 줄을 읽으세요',tell:.95,attack:.95,recovery:1.2},
  {id:'crystal-regrowth',name:'다시 자라는 정원',hint:'빛나는 세 조각이 자라기 전에 자리를 옮기세요',tell:1.15,attack:.45,recovery:1.4},
  {id:'open-core',name:'열린 꽃심',hint:'빈 줄을 옮겨 다니고 열린 꽃심을 공격하세요',tell:1,attack:1.35,recovery:1.75}
 ])
});
export function createExpansionBoss(id,{seed=1,phase=0}={}){
 if(!BOSS_IDS[id])throw new Error(`Unknown expansion boss: ${id}`);
 return {version:EXPANSION_RUNTIME_VERSION,id,seed:(seed>>>0)||1,phase:clamp(phase|0,0,2),state:'recover',timer:1.2,elapsed:0,pattern:-1,sequence:0,shotIndex:0,shotClock:0,aim:{x:-1,z:0},anchor:{x:0,z:0},target:{x:0,z:0},regrow:[],safeLane:0,out:output()};
}
export function expansionBossMove(s){return BOSS_MOVES[s.id][Math.max(0,s.pattern)]||BOSS_MOVES[s.id][0];}
function beginPattern(s,boss,p,walls,out){
 s.pattern=s.sequence++%3;s.state='tell';s.timer=expansionBossMove(s).tell;s.elapsed=0;s.shotIndex=0;s.shotClock=0;s.anchor=point(boss);s.target=point(p);s.aim=direction(s.anchor,s.target);s.safeLane=p.z<=boss.z?-3.4:3.4;s.regrow=[];
 if(s.id==='crystalGardener'&&s.pattern===1){
  // Regrow optional side cover only, never close the broad central route or
  // spawn solid terrain beneath an actor. The adapter applies actions at commit.
  const eligible=walls.filter(w=>w.broken&&Math.abs(w.x)>=2.5&&Math.hypot(w.x-p.x,w.z-p.z)>2.5).slice(0,EXPANSION_RUNTIME_LIMITS.walls);
  while(eligible.length&&s.regrow.length<3){const index=Math.floor(random(s)*eligible.length);s.regrow.push(eligible.splice(index,1)[0].id);}
 }
 out.events.push({type:'boss-tell',pattern:expansionBossMove(s).id,name:expansionBossMove(s).name,hint:expansionBossMove(s).hint,duration:s.timer});
}
function telegraph(s,boss,out,walls){
 const duration=Math.max(0,s.timer),move=expansionBossMove(s);
 if(s.id==='crosswindKeeper'&&s.pattern===1){for(const z of [-3.8,3.8])out.telegraphs.push({kind:'rear-origin',position:{x:s.target.x-8,z:s.target.z+z},radius:.85,duration,pattern:move.id});}
 else if(s.id==='crystalGardener'&&s.pattern===1){for(const id of s.regrow){const w=walls.find(w=>w.id===id);if(w)out.telegraphs.push({kind:'regrowth',id,position:{x:w.x,z:w.z},radius:1.2,duration,pattern:move.id});}}
 else out.telegraphs.push({kind:s.pattern===2&&s.id==='crosswindKeeper'?'rush':'aim',position:{...s.anchor},dir:{...s.aim},length:s.id==='crosswindKeeper'?14:12,width:s.pattern===2?1.1:.3,duration,pattern:move.id,...(s.id==='crystalGardener'&&s.pattern===2?{safeLane:s.anchor.z+s.safeLane}: {})});
}
function emit(s,out,position,dir,spec,active){if(active+out.bolts.length>=EXPANSION_RUNTIME_LIMITS.projectiles||out.bolts.length>=EXPANSION_RUNTIME_LIMITS.boltsPerStep)return false;out.bolts.push({position:point(position),dir:{...dir},spec:{boss:true,pierce:false,life:4.2,speed:6.2,damage:16,...spec},pattern:expansionBossMove(s).id});return true;}
function attack(s,step,boss,p,walls,out,active){
 s.shotClock=Math.max(0,s.shotClock-step);const move=expansionBossMove(s),speedScale=1+s.phase*.08;
 if(s.id==='crosswindKeeper'){
  if(s.pattern===0&&s.shotClock<=0&&s.shotIndex<6){const i=s.shotIndex++;s.shotClock=.17;emit(s,out,{x:s.anchor.x,z:s.anchor.z+(i-2.5)*.6},s.aim,{speed:(6.2+i*.12)*speedScale},active);}
  else if(s.pattern===1&&s.shotClock<=0&&s.shotIndex<3){s.shotIndex++;s.shotClock=.31;for(const z of [-3.8,3.8]){const origin={x:s.target.x-8,z:s.target.z+z};emit(s,out,origin,direction(origin,s.target),{speed:5.6*speedScale,life:3.6},active);}}
  else if(s.pattern===2){
   out.move.x=s.aim.x*14*step;out.move.z=s.aim.z*14*step;
   out.contacts.push({from:point(boss),to:{x:boss.x+out.move.x,z:boss.z+out.move.z},radius:1.05,damage:24,hitId:`${s.id}-${s.sequence}`});
   if(s.shotClock<=0&&s.shotIndex<4){s.shotIndex++;s.shotClock=.16;for(const sign of [-1,1])emit(s,out,boss,rotate(s.aim,sign*Math.PI/2),{speed:5*speedScale,life:2.4},active);}
  }
 }else if(s.pattern===0&&s.shotClock<=0&&s.shotIndex<2){
  const row=s.shotIndex++;s.shotClock=.43;
  // Two offset fans, never a solid ring. Spacing leaves visible traversable gaps.
  for(let i=-3;i<=3;i++)emit(s,out,boss,rotate(s.aim,i*.29+(row? .08:0)),{speed:(5.1+row*.55)*speedScale,damage:15},active);
 }else if(s.pattern===1&&!s.shotIndex){
  s.shotIndex=1;for(const id of s.regrow){const w=walls.find(w=>w.id===id);if(w&&Math.hypot(w.x-p.x,w.z-p.z)>2.5&&w.broken)out.terrain.push({type:'regrow',id,hp:w.maxHp*.45});}out.events.push({type:'crystal-regrowth',count:out.terrain.length});
 }else if(s.pattern===2){
  out.coreOpen=true;
  if(s.shotClock<=0&&s.shotIndex<3){const row=s.shotIndex++;s.shotClock=.42;for(const z of [-6,-3,0,3,6]){if(Math.abs(z-s.safeLane)<1.65)continue;emit(s,out,{x:boss.x,z:boss.z+z},{x:s.aim.x>=0?1:-1,z:0},{speed:(4.6+row*.6)*speedScale,life:3.4,damage:14},active);}if(row===0)out.events.push({type:'core-open',duration:move.attack+move.recovery,damageMultiplier:1.3});}
 }
}

// dt is clamped after background/resume. Every attack is preceded by a fixed
// tell; aimed shots do not track after committing. Repeated contacts share hitId
// so the caller may hurt once per flight rather than once per frame.
export function stepExpansionBoss(s,dt,{position={x:0,z:0},player={x:0,z:0},walls=[],activeProjectiles=0,hpRatio=1}={}){
 const out=resetOutput(s.out),step=dtOf(dt);if(!step)return out;
 const boss=point(position),p=point(player);s.phase=hpRatio<=.25?2:hpRatio<=.55?1:s.phase;const before=s.timer;s.timer=Math.max(0,s.timer-step);s.elapsed+=step;
 if(s.state==='recover'){
  out.coreOpen=s.id==='crystalGardener'&&s.pattern===2;
  if(s.timer<=0){beginPattern(s,boss,p,walls,out);out.coreOpen=false;}
 }else if(s.state==='tell'){
  telegraph(s,boss,out,walls);
  if(s.timer<=0){s.state='attack';s.elapsed=0;s.timer=expansionBossMove(s).attack;out.events.push({type:'boss-attack',pattern:expansionBossMove(s).id});}
 }else if(s.state==='attack'){
  attack(s,Math.min(step,before),boss,p,walls,out,Math.max(0,finite(activeProjectiles)));
  if(s.timer<=0){s.state='recover';s.elapsed=0;s.timer=expansionBossMove(s).recovery;out.events.push({type:'boss-recovery',pattern:expansionBossMove(s).id,duration:s.timer});}
 }
 out.state=s.state;out.pattern=expansionBossMove(s).id;return out;
}
export function applyCrystalTerrainActions(walls,actions){let count=0;for(const action of actions.slice(0,EXPANSION_RUNTIME_LIMITS.terrainPerStep)){const w=walls.find(w=>w.id===action.id);if(!w)continue;if(action.type==='regrow'&&w.broken){w.hp=clamp(finite(action.hp),1,w.maxHp);w.broken=false;count++;}else if(action.type==='break'&&!w.broken){w.hp=0;w.broken=true;count++;}}return count;}
export function checkpointExpansionBoss(s){const {out,...saved}=s;return JSON.parse(JSON.stringify(saved));}
export function restoreExpansionBoss(saved,id){const s=createExpansionBoss(id,{seed:saved?.seed,phase:saved?.phase});if(saved?.version!==EXPANSION_RUNTIME_VERSION||saved.id!==id)return s;
 s.state=['recover','tell','attack'].includes(saved.state)?saved.state:'recover';s.timer=clamp(finite(saved.timer,1.2),0,2);s.elapsed=clamp(finite(saved.elapsed),0,5);s.pattern=clamp(Math.floor(finite(saved.pattern,-1)),-1,2);s.sequence=clamp(Math.floor(finite(saved.sequence)),0,1e7);s.shotIndex=clamp(Math.floor(finite(saved.shotIndex)),0,6);s.shotClock=clamp(finite(saved.shotClock),0,.5);
 const aim=point(saved.aim);s.aim=Math.abs(Math.hypot(aim.x,aim.z)-1)<1e-7?aim:direction({x:0,z:0},aim);s.anchor=point(saved.anchor);s.target=point(saved.target);s.safeLane=saved.safeLane===0?0:finite(saved.safeLane)<0?-3.4:3.4;s.regrow=(Array.isArray(saved.regrow)?saved.regrow:[]).filter(id=>typeof id==='string'&&id.startsWith('crystal-')).slice(0,3);return s;}
