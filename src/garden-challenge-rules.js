import {LAWS} from './laws.js';
import {lawStats} from './progression.js';
import {FORMS} from './forms.js';

// A bounded, isolated two-law adapter. Shared law definitions and recipes stay
// authoritative; this arena does not reproduce the full Journey form engine.
export const CHALLENGE=Object.freeze({width:24,height:14,duration:180,bossAt:125,enemies:96,shots:128,effects:64,hazards:24,pickups:12,choices:6});
const GROWTH_KILLS=Object.freeze([9,18,35,60,95,145]);
const LAW_IDS=Object.freeze(Object.keys(LAWS));
const PAIRS=Object.values(FORMS);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const length=(x,y)=>Math.hypot(x,y);
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function event(s,type,x,y,law,value){if(s.events.length<32)s.events.push({type,x,y,law,value});}
function pool(count,make){return Array.from({length:count},(_,id)=>make(id));}
function effect(s,kind,x,y,law,r=0,x2,y2){const e=s.effects.find(e=>!e.active);if(!e)return;e.active=true;e.x=x;e.y=y;e.ttl=e.max=kind==='chain'?.17:.3;e.kind=kind;e.law=law;e.r=r;e.x2=x2;e.y2=y2;}
function cache(s){s._stats=lawStats(new Map(Object.entries(s.levels)));s._laws=Object.keys(s.levels);s._power=(1+.12*s._laws.reduce((a,id)=>a+s.levels[id]-1,0))*(s.fusion?1.28:1);}
function offer(s){
 s.phase='choice';
 const laws=s._laws,available=laws.length<2?LAW_IDS: laws;
 s.offers=available.filter(id=>(s.levels[id]||0)<10).map(id=>({id,name:`${LAWS[id].name} ${s.levels[id]?`Lv.${s.levels[id]+1}`:''}`.trim(),description:LAWS[id].hint,law:id,recommended:(!laws.length&&['pierce','burst','frost'].includes(id))||(laws.length===1&&id!==laws[0]&&['burst','chain','recall'].includes(id))}));
 if(laws.length===2&&!s.fusion){const f=PAIRS.find(f=>f.requires.every(id=>laws.includes(id)));if(f)s.offers.unshift({id:`fusion:${f.id}`,name:f.name,description:`두 법칙을 한 발에 결합 · 공격 피해 +28% · ${f.requires.map(id=>LAWS[id].name).join(' + ')}`,recommended:true});}
 s.offers.push({id:'vigor',name:'단단한 새싹',description:'최대 생명력 +14 · 생명력 14 회복'});
 if(s._tempo<5)s.offers.push({id:'tempo',name:'빠른 꽃잎',description:'자동 공격 간격 -8% · 최대 5회'});
 event(s,'choice',s.player.x,s.player.y);
}
export function createGardenChallenge(seed=1,difficulty='normal'){
 const n=Number(seed),normalized=Number.isFinite(n)?Math.trunc(n)>>>0:1;
 const s={phase:'playing',time:0,difficulty:difficulty==='expert'?'expert':'normal',seed:normalized,rng:normalized,player:{x:0,y:0,r:.4,hp:100,maxHp:100,inv:0,dashCd:0,dashTime:0,dx:1,dy:0},score:0,kills:0,damageTaken:0,lastDamageSource:'',choices:0,levels:{},fusion:null,offers:[],
  enemies:pool(CHALLENGE.enemies,id=>({id,active:false,x:0,y:0,r:.4,hp:0,maxHp:0,type:'sprout',frost:0,flash:0,angle:0,attackTime:0,_frostHits:0,_frostAge:0,_orbitCd:0})),
  shots:pool(CHALLENGE.shots,()=>({active:false,x:0,y:0,vx:0,vy:0,r:.14,life:0,law:null,owner:'player',_hits:new Uint8Array(CHALLENGE.enemies),_bounces:0,_budget:1,_return:false,_age:0,_child:false,_damage:0})),
  effects:pool(CHALLENGE.effects,()=>({active:false,x:0,y:0,ttl:0,max:0,kind:'hit'})),
  hazards:pool(CHALLENGE.hazards,()=>({active:false,x:0,y:0,r:1,ttl:0,warning:0,kind:'danger',_fired:false,_damage:0})),
  pickups:pool(CHALLENGE.pickups,()=>({active:false,x:0,y:0,r:.6,ttl:0,kind:'supply'})),
  events:[],bossSpawned:false,bossDefeated:false,reason:'',supplyCount:0,suppliesCollected:0,peakEnemies:0,_fire:0,_spawn:.35,_growthKills:9,_tempo:0,_nextSupply:22,_hazardClock:8,_dashHeld:false,_shotSerial:0,_lastLaw:null,_chainScratch:new Uint8Array(CHALLENGE.enemies)};
 cache(s);return s;
}
export function chooseGardenChallenge(s,id){
 if(!s||s.phase!=='choice'||typeof id!=='string'||!s.offers.some(o=>o.id===id))return false;
 if(id.startsWith('fusion:')){const f=FORMS[id.slice(7)];if(!f||s.fusion||!f.requires.every(l=>s.levels[l]))return false;s.fusion={id:f.id,name:f.name,requires:[...f.requires]};}
 else if(id==='vigor'){s.player.maxHp+=14;s.player.hp=Math.min(s.player.maxHp,s.player.hp+14);}
 else if(id==='tempo'){if(s._tempo>=5)return false;s._tempo++;}
 else if(Object.hasOwn(LAWS,id)){if((s.levels[id]||0)>=10||!s.levels[id]&&s._laws.length>=2)return false;s.levels[id]=Math.min(10,(s.levels[id]||0)+1);}
 else return false;
 s.choices++;s._growthKills=GROWTH_KILLS[s.choices]??Infinity;s.offers=[];s.phase='playing';cache(s);s.events.length=0;event(s,'growth',s.player.x,s.player.y,id.startsWith('fusion:')?'fusion':Object.hasOwn(LAWS,id)?id:null,s.choices);return true;
}
function spawnEnemy(s,type,x,y){
 if(type!=='boss'&&s.enemies.reduce((n,e)=>n+(e.active?1:0),0)>=CHALLENGE.enemies-1)return null;
 const e=s.enemies.find(e=>!e.active);if(!e)return null;
 const expert=s.difficulty==='expert',progress=s.time/125;
 const base=type==='boss'?950:type==='shield'?37:type==='hound'?23:17;
 e.active=true;e.type=type;e.x=x;e.y=y;e.r=type==='boss'?.92:type==='shield'?.49:.4;
 e.hp=e.maxHp=base*(expert?1.2:1)*(type==='boss'?1:1+progress*.7);e.frost=0;e.flash=0;e.angle=0;e.attackTime=type==='boss'?1.3:1+random(s)*1.5;e._frostHits=0;e._frostAge=0;e._orbitCd=0;
 if(type==='boss')event(s,'boss',x,y);return e;
}
function boundarySpawn(s,type){const side=Math.floor(random(s)*4);let x=side<2?(side?11.55:-11.55):(random(s)*20-10),y=side<2?(random(s)*11-5.5):(side===2?-6.55:6.55);if(length(x-s.player.x,y-s.player.y)<4.5){x=-x;y=-y;}return spawnEnemy(s,type,x,y);}
function hazard(s,x,y,r,warning,damage,kind='danger'){
 const h=s.hazards.find(h=>!h.active);if(!h)return;
 h.active=true;h.x=clamp(x,-11.4,11.4);h.y=clamp(y,-6.4,6.4);h.r=r;h.warning=warning;h.ttl=kind==='gravity'?.95:warning+.24;h.kind=kind;h._damage=damage;h._fired=false;
}
function damagePlayer(s,amount,source='적의 접촉'){if(s.player.inv>0||s.phase!=='playing')return false;amount=Math.round(amount*(s.difficulty==='expert'?.72:.52));s.player.hp=Math.max(0,s.player.hp-amount);s.player.inv=.68;s.damageTaken+=amount;s.lastDamageSource=source;event(s,'hurt',s.player.x,s.player.y,null,amount);effect(s,'hurt',s.player.x,s.player.y,null,.8);if(s.player.hp<=0){s.phase='lost';s.reason=source+'에 맞아 생명력이 다했어요';event(s,'lost',s.player.x,s.player.y);}return true;}
function damageEnemy(s,e,amount,law){
 if(s.phase!=='playing'||!e.active)return;e.hp-=amount;e.flash=.09;effect(s,'hit',e.x,e.y,law,.25);
 if(e.hp>0)return;e.active=false;s.kills++;s.score+=e.type==='boss'?1500:e.type==='shield'?25:e.type==='hound'?18:12;event(s,'kill',e.x,e.y,law,e.type==='boss'?1500:12);effect(s,'bloom',e.x,e.y,law,e.r);
 if(e.type==='boss'){s.bossDefeated=true;s.phase='won';s.reason='정원의 수호자를 쓰러뜨렸어요';s.score+=Math.max(0,Math.round((180-s.time)*10));event(s,'won',e.x,e.y);}
}
function fire(s,x,y,vx,vy,law,damage,child=false,owner='player'){
 const b=s.shots.find(b=>!b.active);if(!b)return null;
 b.active=true;b.x=x;b.y=y;b.vx=vx;b.vy=vy;b.r=owner==='enemy'?.18:law==='pierce'?.13:.17;b.life=owner==='enemy'?5:3.2;b.law=law;b.owner=owner;b._damage=damage;b._child=child;b._bounces=child?0:s._stats.reflectBounces;b._budget=child?1:s._stats.pierceHits;b._return=false;b._age=0;b._hits.fill(0);return b;
}
function nearest(s,x,y,max=40,exclude=null){let target=null,best=max*max;for(const e of s.enemies){if(!e.active||e===exclude)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<best){best=d;target=e;}}return target;}
function area(s,x,y,r,damage,law,exclude=null){for(const e of s.enemies)if(e.active&&e!==exclude&&length(e.x-x,e.y-y)<r+e.r)damageEnemy(s,e,damage,law);}
function lawHit(s,b,e){
 const st=s._stats,laws=s._laws;
 let amount=b._damage;
 if(e.type==='shield'&&!laws.includes('pierce')&&Math.cos(Math.atan2(-b.vy,-b.vx)-e.angle)>.45)amount*=.58;
 damageEnemy(s,e,amount,b.law);event(s,'hit',e.x,e.y,b.law,amount);if(s.phase!=='playing')return;
 // Secondary fragments have no descendants/area/chain: one bounded generation.
 if(b._child)return;
 if(laws.includes('frost')){e._frostHits++;e._frostAge=2;e.frost=Math.max(e.frost,st.frostTime);if(e._frostHits>=5){e._frostHits=0;damageEnemy(s,e,amount*(e.type==='boss'?3:1.5),'frost');effect(s,'shatter',e.x,e.y,'frost',1);event(s,'shatter',e.x,e.y,'frost');}}
 if(laws.includes('burst')){area(s,e.x,e.y,st.burstRadius,amount*.65,'burst',e);effect(s,'burst',e.x,e.y,'burst',st.burstRadius);}
 if(laws.includes('chain')){let from=e;const marked=s._chainScratch;marked.fill(0);marked[e.id]=1;for(let i=0;i<st.chainTargets;i++){let next=null,d=3.1**2;for(const n of s.enemies){if(!n.active||marked[n.id])continue;const nd=(n.x-from.x)**2+(n.y-from.y)**2;if(nd<d){d=nd;next=n;}}if(!next)break;marked[next.id]=1;effect(s,'chain',from.x,from.y,'chain',0,next.x,next.y);damageEnemy(s,next,amount*.55,'chain');from=next;}}
 if(laws.includes('gravity'))hazard(s,e.x,e.y,st.gravityRadius,0,0,'gravity');
 if(laws.includes('split')){const angle=Math.atan2(b.vy,b.vx);for(let i=0;i<Math.min(5,st.splitCount);i++){const a=angle+(i-(Math.min(5,st.splitCount)-1)/2)*.42;const child=fire(s,e.x+Math.cos(a)*.3,e.y+Math.sin(a)*.3,Math.cos(a)*8,Math.sin(a)*8,'split',amount*.45,true);if(child)child._hits[e.id]=1;}}
}
function updateShots(s,dt){
 for(const b of s.shots){if(s.phase!=='playing')return;if(!b.active)continue;b.life-=dt;b._age+=dt;if(b.life<=0){b.active=false;continue;}
  if(b.owner==='player'&&!b._child&&s.levels.recall&&b._age>.82){if(!b._return){b._return=true;b._hits.fill(0);b._budget=s._stats.pierceHits;b._damage*=s._stats.recallReturn;effect(s,'recall',b.x,b.y,'recall',.35);}const d=length(s.player.x-b.x,s.player.y-b.y);if(d<.45){b.active=false;continue;}b.vx=(s.player.x-b.x)/d*10;b.vy=(s.player.y-b.y)/d*10;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(Math.abs(b.x)>11.8||Math.abs(b.y)>6.8){if(b.owner==='player'&&b._bounces>0){if(Math.abs(b.x)>11.8){b.vx*=-1;b.x=clamp(b.x,-11.8,11.8);}if(Math.abs(b.y)>6.8){b.vy*=-1;b.y=clamp(b.y,-6.8,6.8);}b._bounces--;effect(s,'reflect',b.x,b.y,'reflect',.4);event(s,'reflect',b.x,b.y,'reflect');}else{b.active=false;continue;}}
  if(b.owner==='enemy'){if(s.levels.orbit&&length(b.x-s.player.x,b.y-s.player.y)<s._stats.orbitRadius&&b.law!=='boss'){b.active=false;effect(s,'block',b.x,b.y,'orbit',.4);}else if(length(b.x-s.player.x,b.y-s.player.y)<b.r+s.player.r){damagePlayer(s,b._damage,b.law==='boss'?'수호자의 탄환':'가시 탄환');b.active=false;}continue;}
  for(const e of s.enemies){if(!e.active||b._hits[e.id]||length(e.x-b.x,e.y-b.y)>e.r+b.r)continue;b._hits[e.id]=1;lawHit(s,b,e);b._budget--;if(b._budget<=0){if(s.levels.recall&&!b._child&&!b._return){b._age=.83;b._budget=0;/* Return begins next step. */}else b.active=false;break;}}
 }
}
function updateHazards(s,dt){
 for(const h of s.hazards){if(s.phase!=='playing')return;if(!h.active)continue;h.ttl-=dt;if(h.kind==='gravity'){// Finite-lived fields never spawn attacks recursively.
   for(const e of s.enemies){if(!e.active||e.type==='boss')continue;const d=length(h.x-e.x,h.y-e.y);if(d>0.05&&d<h.r){e.x+=(h.x-e.x)/d*2.8*dt;e.y+=(h.y-e.y)/d*2.8*dt;}}if(h.ttl<=0)h.active=false;continue;
  }h.warning-=dt;if(h.warning<=0&&!h._fired){h._fired=true;effect(s,'danger',h.x,h.y,null,h.r);if(length(h.x-s.player.x,h.y-s.player.y)<h.r+s.player.r)damagePlayer(s,h._damage,h.kind==='boss'?'수호자의 예고 공격':'붉은 예고 공격');}if(h.ttl<=0)h.active=false;
 }
}
function updateEnemies(s,dt){
 const expert=s.difficulty==='expert';
 for(const e of s.enemies){if(s.phase!=='playing')return;if(!e.active)continue;e.flash=Math.max(0,e.flash-dt);e.frost=Math.max(0,e.frost-dt);e._frostAge-=dt;if(e._frostAge<=0)e._frostHits=0;e._orbitCd=Math.max(0,e._orbitCd-dt);
  const dx=s.player.x-e.x,dy=s.player.y-e.y,d=length(dx,dy);e.angle=Math.atan2(dy,dx);
  const speed=(e.type==='boss'?1.25:e.type==='hound'?2.65:e.type==='shield'?1.2:1.65)*(expert?1.08:1)*(e.frost>0&&e.type!=='boss'?s._stats.frostFactor:1);
  if(d>.2){e.x=clamp(e.x+dx/d*speed*dt,-11.5,11.5);e.y=clamp(e.y+dy/d*speed*dt,-6.5,6.5);}
  if(d<e.r+s.player.r)damagePlayer(s,e.type==='boss'?23:e.type==='hound'?13:10,e.type==='boss'?'수호자의 접촉':e.type==='hound'?'빠른 적의 접촉':'적의 접촉');
  if(s.phase!=='playing')return;
  e.attackTime-=dt;
  if(e.type==='boss'&&e.attackTime<=0){e.attackTime=expert?2.8:3.3;hazard(s,s.player.x,s.player.y,1.7,.85,24,'boss');hazard(s,s.player.x+s.player.dx*2,s.player.y+s.player.dy*2,1.5,1.1,22,'boss');for(let i=0;i<8;i++){const a=i*Math.PI/4+s.time*.3;fire(s,e.x,e.y,Math.cos(a)*3.25,Math.sin(a)*3.25,'boss',14,false,'enemy');}}
  else if(e.type==='hound'&&e.attackTime<=0){e.attackTime=4.5+random(s);if(d<6)hazard(s,s.player.x,s.player.y,.85,.9,14,'pounce');}
  else if(e.type==='shield'&&e.attackTime<=0){e.attackTime=4+random(s);if(d>1&&d<8)fire(s,e.x,e.y,dx/d*3.3,dy/d*3.3,'thorn',9,false,'enemy');}
  if(s.levels.orbit&&d<s._stats.orbitRadius+e.r&&e._orbitCd<=0){e._orbitCd=.45;damageEnemy(s,e,s._stats.orbitDamage*.48*s._power,'orbit');if(s.levels.frost){e.frost=Math.max(e.frost,s._stats.frostTime);e._frostHits++;e._frostAge=2;if(e._frostHits>=5){e._frostHits=0;damageEnemy(s,e,s._stats.orbitDamage*s._power*(e.type==='boss'?2.5:1.5),'frost');effect(s,'shatter',e.x,e.y,'frost',1);event(s,'shatter',e.x,e.y,'frost');}}effect(s,'orbit',e.x,e.y,'orbit',.35);}
 }
}
function supplies(s,dt){
 if(s.time>=s._nextSupply&&s.supplyCount<5){s._nextSupply+=29;s.supplyCount++;const p=s.pickups.find(p=>!p.active);if(p){p.active=true;p.x=(s.player.x>0?-1:1)*(4+random(s)*4);p.y=(random(s)*8-4);p.ttl=24;event(s,'supply',p.x,p.y);}}
 for(const p of s.pickups){if(!p.active)continue;p.ttl-=dt;if(p.ttl<=0){p.active=false;continue;}if(length(p.x-s.player.x,p.y-s.player.y)<p.r+s.player.r){p.active=false;const restored=Math.min(24,s.player.maxHp-s.player.hp);s.player.hp+=restored;s.suppliesCollected++;s.score+=30;event(s,'heal',p.x,p.y,null,restored);effect(s,'heal',p.x,p.y,null,1);}}
}
export function stepGardenChallenge(s,dt,input={}){
 if(!s||s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return s;
 dt=Math.min(dt,1/30);s.events.length=0;s.time=Math.min(CHALLENGE.duration,s.time+dt);
 const p=s.player;
 let x=Number.isFinite(input?.x)?clamp(input.x,-1,1):0,y=Number.isFinite(input?.y)?clamp(input.y,-1,1):0,n=length(x,y);if(n>1){x/=n;y/=n;}if(n>.05){p.dx=x/(length(x,y)||1);p.dy=y/(length(x,y)||1);}
 p.inv=Math.max(0,p.inv-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.dashTime=Math.max(0,p.dashTime-dt);
 const dash=input?.dash===true;if(dash&&!s._dashHeld&&p.dashCd<=0){p.dashCd=2.8;p.dashTime=.18;p.inv=Math.max(p.inv,.25);event(s,'dash',p.x,p.y);effect(s,'dash',p.x,p.y,null,.55);}s._dashHeld=dash;
 p.x=clamp(p.x+(p.dashTime>0?p.dx*14:x*4.4)*dt,-11.45,11.45);p.y=clamp(p.y+(p.dashTime>0?p.dy*14:y*4.4)*dt,-6.45,6.45);
 for(const e of s.effects)if(e.active){e.ttl-=dt;if(e.ttl<=0)e.active=false;}
 if(!s.bossSpawned&&s.time>=CHALLENGE.bossAt){const boss=spawnEnemy(s,'boss',p.x>0?-8:8,p.y>0?-4:4);s.bossSpawned=Boolean(boss);if(boss){for(const e of s.enemies)if(e!==boss)e.active=false;for(const b of s.shots)b.active=false;for(const h of s.hazards)h.active=false;const heal=Math.min(p.maxHp-p.hp,s.difficulty==='expert'?10:22);p.hp+=heal;p.inv=Math.max(p.inv,1);event(s,'bossBreather',p.x,p.y,null,heal);}}
 s._spawn-=dt;
 if(s._spawn<=0){s._spawn+=(s.bossSpawned?1.6:.95-s.time*.0032)*(s.difficulty==='expert'?.86:1);const count=s.bossSpawned?1:s.time>(s.difficulty==='expert'?85:100)?2:1;for(let i=0;i<count;i++){const r=random(s);boundarySpawn(s,s.time>14&&r<.22?'hound':s.time>30&&r<.39?'shield':'sprout');}}
 s._hazardClock-=dt;if(s._hazardClock<=0){s._hazardClock=s.bossSpawned?4:s.time<30?8:5;hazard(s,p.x,p.y,s.time<30?1.3:1.55,s.time<30?1.05:.85,s.difficulty==='expert'?21:17);event(s,'warning',p.x,p.y);}
 s._fire-=dt;
 if(s._fire<=0){const target=(s.bossSpawned?s.enemies.find(e=>e.active&&e.type==='boss'&&length(e.x-p.x,e.y-p.y)<13):null)||nearest(s,p.x,p.y,13);if(target){const d=length(target.x-p.x,target.y-p.y)||1;const law=s._laws.length?s._laws[s._shotSerial++%s._laws.length]:null;s._lastLaw=law;fire(s,p.x,p.y,(target.x-p.x)/d*9,(target.y-p.y)/d*9,law,15*s._power);s._fire=(s.fusion?.31:.39)*Math.pow(.92,s._tempo);event(s,'shot',p.x,p.y,law);}else s._fire=.06;}
 updateShots(s,dt);updateHazards(s,dt);if(s.phase==='playing')updateEnemies(s,dt);if(s.phase==='playing')supplies(s,dt);
 s.peakEnemies=Math.max(s.peakEnemies,s.enemies.reduce((a,e)=>a+(e.active?1:0),0));
 if(s.phase==='playing'&&s.time>=CHALLENGE.duration){s.phase='lost';s.reason='시간 안에 수호자를 쓰러뜨리지 못했어요';event(s,'lost',p.x,p.y);}
 if(s.phase==='playing'&&s.kills>=s._growthKills&&s.choices<CHALLENGE.choices&&!s.bossSpawned)offer(s);
 return s;
}
export function gardenChallengeSummary(s){return {version:1,seed:s.seed,difficulty:s.difficulty,won:s.phase==='won',phase:s.phase,time:Math.round(s.time*10)/10,score:Math.round(s.score),kills:s.kills,damageTaken:s.damageTaken,choices:s.choices,levels:{...s.levels},supportGrowth:{tempo:s._tempo,vigor:Math.round((s.player.maxHp-100)/14)},fusion:s.fusion?{...s.fusion,requires:[...s.fusion.requires]}:null,bossDefeated:s.bossDefeated,reason:s.reason};}
