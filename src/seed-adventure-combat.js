import {Group,Vector3} from 'three';
import {createFormCombat} from './form-combat.js';
import {DISCOVERY_FORMS,TWIN_FORMS,formStats} from './forms.js';
import {createTwinInteractionEngine} from './twin-interactions.js';
import {adventureFormHit,adventureEffect} from './seed-adventure-rules.js';

// 2026-09-28 사용자: "조합은?? 162개 가능해?? 알피지인데"
// 수호전과 같은 방식으로 본편의 실제 조합 공격 엔진(form-combat)을 그림 없이 돌린다. 모험의 방은 본편 방과
// 거의 같은 크기라 좌표를 그대로 쓴다(x→x, y→z). 잎 칼 콤보는 손으로, 씨앗의 형태 공격은 바라보는 쪽으로 저절로 나간다.
export const ADVENTURE_COMBAT={damage:.5,maxBolts:24,maxVisuals:160};
const V=Vector3;
const INK={burst:'#ffaa65',frost:'#b2f1ff',chain:'#ffe391',pierce:'#dbf6b1',split:'#ffa88f',reflect:'#91e4ff',recall:'#a0ebc9',gravity:'#d2a0ff',orbit:'#f4db9e'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vector=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.z);

export function createAdventureCombat(s,{sound=()=>{}}={}){
 const scene=new Group(),wrappers=new WeakMap(),shotWrappers=new WeakMap(),list=[],hostiles=[],bodies=[],direction=new V(),target=new V();
 let entry=null,signature='',lastSound=-1,step=1/60,resonances=0;
 function nearby(pos,r,out){out.length=0;for(const w of list)if(!w.dead&&(w.g.position.x-pos.x)**2+(w.g.position.z-pos.z)**2<=r*r)out.push(w);return out;}
 function sync(){
  list.length=0;hostiles.length=0;
  for(const e of s.enemies){if(e.hp<=0||e.dormant&&Math.abs(e.x-s.player.x)+Math.abs(e.y-s.player.y)>18)continue;let w=wrappers.get(e);if(!w){w={source:e,g:{position:new V()},slow:0,type:e.type==='boss'?'warden':e.role==='tank'?'shield':'hound'};Object.defineProperties(w,{dead:{get:()=>e.hp<=0},hp:{get:()=>e.hp},maxHp:{get:()=>e.maxHp}});wrappers.set(e,w);}
   w.g.position.set(e.x,0,e.y);w.sx=e.x;w.sy=e.y;w.slow=Math.max(0,w.slow-step);list.push(w);}
  for(const b of s.shots){if(!b.hostile||b.life<=0)continue;let w=shotWrappers.get(b);if(!w){w={ob:{position:new V()},boss:Boolean(b.boss),dir:new V(),struck:false};Object.defineProperty(w,'life',{get:()=>b.life,set:v=>{b.life=v;}});shotWrappers.set(b,w);}w.ob.position.set(b.x,0,b.y);w.dir.set(b.dx,0,b.dy).normalize();hostiles.push(w);}
 }
 // 엔진이 끌어당기거나 밀어낸 적의 자리·둔화를 모험 쪽으로 돌려준다.
 // 방마다 크기가 다르다(넓은 지역·작은 방).
 const arena=()=>s.arena;
 function writeBack(){const A=arena();for(const w of list){const e=w.source;if(e.hp<=0)continue;const dx=w.g.position.x-w.sx,dy=w.g.position.z-w.sy;if(e.type!=='boss'&&(Math.abs(dx)>1e-5||Math.abs(dy)>1e-5)){e.x=clamp(e.x+dx,A.minX,A.maxX);e.y=clamp(e.y+dy,A.minY,A.maxY);}if(w.slow>0)e.slow=Math.max(e.slow,Math.min(2,w.slow));}}
 function boundary(a,b,d){const A=arena();let hit=false;if(b.x<A.minX||b.x>A.maxX){b.x=clamp(b.x,A.minX,A.maxX);d.x*=-1;hit=true;}if(b.z<A.minY||b.z>A.maxY){b.z=clamp(b.z,A.minY,A.maxY);d.z*=-1;hit=true;}return hit;}
 function constrain(pos){const A=arena();pos.x=clamp(pos.x,A.minX,A.maxX);pos.z=clamp(pos.z,A.minY,A.maxY);}
 function emit(kind,args){
  if(!entry)return;const a=args.find(vector);if(!a)return;
  const line=['arc','trail','lance','rewindTrace','frostWeb'].includes(kind),b=line?args.slice(args.indexOf(a)+1).find(vector):null;
  const law=args.find(x=>typeof x==='string'&&INK[x])||entry.form.requires[0];
  const interval=kind==='trail'?.16:kind==='muzzle'?.09:.035;if(s.time-(entry.fxAt[kind]??-99)<interval)return;entry.fxAt[kind]=s.time;
  let radius=1.1;if(['pulse','explosion','gardenVortex','sunburst'].includes(kind)){const n=args.slice(args.indexOf(a)+1).find(x=>typeof x==='number');if(Number.isFinite(n))radius=clamp(n,.5,4);}
  const life=line?.28:kind==='explosion'||kind==='sunburst'?.55:.38;
  adventureEffect(s,'form',a.x,a.z,{kind:line?'line':law==='gravity'?'well':kind,tx:b?.x??a.x,ty:b?.z??a.z,radius,ink:INK[law]||'#e2e9b5',life,max:life});
 }
 function build(){
  entry?.parts.forEach(p=>p.dispose());entry=null;signature=s.formId?s.formId+':'+s.level:'';
  const form=s.formId&&DISCOVERY_FORMS[s.formId];if(!form)return;
  const player={position:new V(s.player.x,0,s.player.y)},twin=TWIN_FORMS[s.formId],ids=twin?twin.parts:[s.formId];
  entry={form,player,parts:[],timers:[],fxAt:{},marks:new WeakMap(),twins:createTwinInteractionEngine(),range:0};
  const fx=Object.fromEntries(['muzzle','pulse','burst','flame','explosion','trail','lance','frostWeb','rewindTrace','mirrorArc','gardenVortex','sunburst','arc','reflect','split','portal'].map(kind=>[kind,(...args)=>emit(kind,args)]));
  const scale=()=>ADVENTURE_COMBAT.damage*(s.buffs?.power>0?1.3:1);
  function hit(w,amount,meta={}){
   if(w.dead||!Number.isFinite(amount)||amount<0)return false;adventureFormHit(s,w.source,amount*scale());
   if(twin){const last=entry.marks.get(w);if(last&&last.kind!==meta.kind&&s.time-last.time<=twin.synergy.window){entry.marks.delete(w);const bonus=amount*twin.synergy.bonus*scale();adventureFormHit(s,w.source,bonus);if(entry.twins.apply({id:twin.id,target:w,enemies:list,player:player.position,now:s.time,bonus,damage:(other,d)=>adventureFormHit(s,other.source,d),fx,isBoss:e=>e.type==='warden',collide:constrain}))resonances++;}else entry.marks.set(w,{kind:meta.kind,time:s.time});}
   return true;
  }
  for(let i=0;i<ids.length;i++){
   const combat=createFormCombat(scene,{player,enemies:()=>list,nearby,hit,blocked:()=>false,boundary,constrain,vfx:fx,enemyShots:()=>hostiles,renderless:true,maxBolts:ADVENTURE_COMBAT.maxBolts,
    motionSpeed:()=>s.player.moving?4.3:0,sound:id=>{if(s.time-lastSound>.09){lastSound=s.time;sound(id);}}});
   combat.set(ids[i],s.level,{twin:Boolean(twin),twinId:twin?.id,openingDelay:.6+i*.8});entry.parts.push(combat);entry.timers.push(.4+i*.3);
   const sheet=formStats(ids[i],s.level),passive=DISCOVERY_FORMS[ids[i]]?.passive;entry.range=Math.max(entry.range,clamp(passive?Math.max(sheet.outer||0,sheet.radius||0,sheet.range||0,3):(sheet.length||sheet.reach||sheet.range||7),3,11));
  }
 }
 // 바라보는 쪽 부채꼴 안의 가장 가까운 적, 없으면 사거리 안 가장 가까운 적.
 function aimTarget(){
  const p=s.player;let best=null,bestD=Infinity,fallback=null,fallbackD=Infinity;
  for(const w of list){if(w.dead)continue;const dx=w.g.position.x-p.x,dy=w.g.position.z-p.y,d=Math.hypot(dx,dy);if(d>entry.range)continue;if((dx*p.aimX+dy*p.aimY)/(d||1)>.5&&d<bestD){best=w;bestD=d;}if(d<fallbackD){fallback=w;fallbackD=d;}}
  return best||fallback;
 }
 function update(dt){
  step=dt;const want=s.formId?s.formId+':'+s.level:'';if(want!==signature)build();if(!entry||s.phase!=='playing')return;
  sync();entry.player.position.set(s.player.x,0,s.player.y);
  const aim=aimTarget();
  for(let i=0;i<entry.parts.length;i++){entry.timers[i]=Math.max(0,entry.timers[i]-dt);
   if(aim&&entry.timers[i]<=0){direction.set(aim.g.position.x-s.player.x,0,aim.g.position.z-s.player.y).normalize();target.copy(aim.g.position);const cadence=entry.parts[i].fire(entry.player.position,direction,target);entry.timers[i]=Number.isFinite(cadence)?Math.max(.12,cadence):.15;}
   entry.parts[i].update(dt);}
  writeBack();
 }
 function surge(){if(!entry)return false;sync();const aim=new V(s.player.aimX,0,s.player.aimY);entry.parts.forEach(p=>p.surge(3,{aim}));writeBack();return true;}
 function visuals(out=[]){out.length=0;bodies.length=0;if(!entry)return out;entry.parts.forEach(p=>p.projectileBodies(bodies));for(const b of bodies){if(out.length>=ADVENTURE_COMBAT.maxVisuals)break;if(!b.ob?.position)continue;const v=b.adventureVisual||(b.adventureVisual={}),p=b.ob.position;Object.assign(v,{x:p.x,y:p.z,angle:b.dir?Math.atan2(b.dir.z,b.dir.x):0,cell:b.kind==='orbit'?b.orbitSpriteCell??0:b.spriteCell??b.ob.userData?.spriteCell??0,size:clamp((b.visualScale||1)*.62,.35,1.4),law:entry.form.requires[0],spriteKey:b.kind==='orbit'?(b.orbitAtlas==='advanced-orbit'?'advancedOrbit':b.orbitAtlas):b.spriteKey,orbit:b.kind==='orbit'});out.push(v);}return out;}
 function reset(){entry?.parts.forEach(p=>p.dispose());entry=null;signature='';list.length=0;hostiles.length=0;}
 function diagnostics(){return {form:entry?.form.id||null,engines:entry?.parts.length||0,range:entry?.range||0,resonances,bolts:entry?entry.parts.reduce((n,p)=>n+p.state().bolts,0):0};}
 return {update,surge,visuals,reset,diagnostics,dispose:reset};
}
