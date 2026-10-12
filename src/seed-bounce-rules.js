import {LAWS} from './laws.js';
import {FORMS} from './forms.js';

// A self-contained aim/volley adapter. No account, inventory or old combat state.
export const BOUNCE_LAWS=Object.freeze(Object.entries(LAWS).map(([id,law])=>Object.freeze({id,...law})));
export const BOUNCE_CONFIG=Object.freeze({width:10,height:8,ballCap:32,effectCap:48,maxTurns:14,speed:14,heartLine:7.05});
const R=.11,LINE=7.4,STEP=1/240;
const descriptions={burst:'적중 지점 주변에 작은 폭발',chain:'근처 두 적에게 번개가 이어짐',pierce:'한 씨앗이 세 적을 관통',reflect:'벽을 튕긴 씨앗의 피해 증가',gravity:'가까운 적 쪽으로 씨앗이 살짝 휘어짐',frost:'다섯 번 맞힌 적의 서리가 깨짐',split:'첫 적중 때 두 작은 씨앗으로 분열',recall:'돌아오는 씨앗이 한 번 더 적을 관통',orbit:'적중 자리에 짧은 꽃잎 고리가 남음'};
function rand(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function fx(s,type,x,y,r=.5,x2,y2){const e=s.effects.find(e=>!e.active);if(e)Object.assign(e,{active:true,type,x,y,r,x2,y2,ttl:.32,maxTtl:.32});}
function spawn(s,x,y,hp,type='sprout'){const e=s.enemies.find(e=>!e.active);if(!e)return;Object.assign(e,{active:true,alive:true,id:++s.nextId,x,y,w:type==='boss'?2.5:.92,h:type==='boss'?1.3:.92,r:.43,hp,maxHp:hp,type,frost:0,flash:0,slow:false,orbitAt:-100});}
function row(s){const n=s.turn>=6?4:3,skip=Math.floor(rand(s)*6);for(let i=0,placed=0;i<6&&placed<n;i++){if(i===skip)continue;if(rand(s)<.24&&i<4)continue;spawn(s,.9+i*1.62,1.05,Math.round(7+s.turn*2.1),rand(s)<.28?'shield':'sprout');placed++;}}
export function createBounce(seed=1){
 const s={phase:'aim',rng:(Number(seed)>>>0)||1,seed:(Number(seed)>>>0)||1,time:0,turn:1,stage:1,score:0,combo:0,bestCombo:0,kills:0,cleared:0,nextId:0,player:{x:5,y:LINE},laws:[],offers:[],fusion:null,boss:false,bossDefeated:false,damage:2,volleySize:12,launched:0,spawnClock:0,volleyTime:0,aimX:0,aimY:-1,events:[],balls:Array.from({length:32},()=>({active:false})),enemies:Array.from({length:32},()=>({active:false,alive:false})),effects:Array.from({length:48},()=>({active:false}))};
 row(s);for(const e of s.enemies)if(e.active)e.y=2.15;row(s);return s;
}
function normalized(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||y>=0)return null;const d=Math.hypot(x,y);if(d<.001||-y/d<.18)return null;return{x:x/d,y:y/d};}
export function launchBounce(s,aimX,aimY){if(s.phase!=='aim')return false;const a=normalized(aimX,aimY);if(!a)return false;s.phase='flying';s.aimX=a.x;s.aimY=a.y;s.combo=0;s.launched=0;s.spawnClock=0;s.volleyTime=0;s.events.length=0;s.events.push({type:'launch'});return true;}
function ball(s,vx,vy,x=s.player.x,y=LINE,child=false){const b=s.balls.find(b=>!b.active);if(!b)return;Object.assign(b,{active:true,x,y,vx,vy,r:child?R*.8:R,banks:0,returning:false,child,age:0,pierced:0,split:false,lastHit:0,cooldown:0,recallUsed:false,recallOutbound:false});}
function hurt(s,e,amount){if(!e.active)return;e.hp-=amount;e.flash=.09;s.score+=Math.round(amount*10);if(e.hp<=0){e.active=false;e.alive=false;s.kills++;s.score+=e.type==='boss'?1000:100;if(e.type==='boss')s.bossDefeated=true;fx(s,'bloom',e.x,e.y,.7);}}
function direct(s,b,e){const dmg=s.damage*(b.child?.65:1)*(s.laws.includes('reflect')?1+Math.min(b.banks,4)*.18:1)*(s.fusion?1.12:1);hurt(s,e,dmg);s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);fx(s,'hit',b.x,b.y,.25);if(s.combo%8===0&&s.events.length<24)s.events.push({type:'combo',combo:s.combo});
 if(s.laws.includes('frost')&&e.active&&++e.frost>=5){e.frost=0;e.slow=true;hurt(s,e,s.damage*(e.type==='boss'?4:3));fx(s,'shatter',e.x,e.y,.6);}
 if(s.laws.includes('burst')){fx(s,'burst',e.x,e.y,1.28);for(const other of s.enemies)if(other.active&&other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<1.28)hurt(s,other,dmg*.6);}
 if(s.laws.includes('chain')){let a=null,c=null,da=2.4,dc=2.4;for(const q of s.enemies){if(!q.active||q===e)continue;const d=Math.hypot(q.x-e.x,q.y-e.y);if(d<da){c=a;dc=da;a=q;da=d;}else if(d<dc){c=q;dc=d;}}for(const q of[a,c])if(q){hurt(s,q,dmg*.55);fx(s,'chain',e.x,e.y,.1,q.x,q.y);}}
 if(s.laws.includes('orbit')&&s.time-e.orbitAt>.45){e.orbitAt=s.time;fx(s,'orbit',e.x,e.y,1.05);for(const q of s.enemies)if(q.active&&Math.hypot(q.x-e.x,q.y-e.y)<1.05)hurt(s,q,dmg*.45);}
 if(s.laws.includes('split')&&!b.child&&!b.split){b.split=true;const theta=Math.atan2(b.vy,b.vx);for(const offset of[-.3,.3])ball(s,Math.cos(theta+offset)*14,Math.sin(theta+offset)*14,b.x,b.y,true);}
}
// Circle contact or expanded axis-aligned rectangle; tiny fixed substeps avoid tunnelling.
function contact(b,e){if(e.type==='sprout'){const dx=b.x-e.x,dy=b.y-e.y,d=Math.hypot(dx,dy),r=e.r+b.r;return d<r?{nx:d>.00001?dx/d:0,ny:d>.00001?dy/d:-1,push:r-d}:null;}
 const hx=e.w/2,hy=e.h/2,dx=b.x-e.x,dy=b.y-e.y;
 const qx=Math.max(-hx,Math.min(hx,dx)),qy=Math.max(-hy,Math.min(hy,dy)),cx=dx-qx,cy=dy-qy,d=Math.hypot(cx,cy);
 if(d>=b.r)return null;if(d>.000001)return{nx:cx/d,ny:cy/d,push:b.r-d};
 const px=hx-Math.abs(dx),py=hy-Math.abs(dy);return px<py?{nx:dx<0?-1:1,ny:0,push:px+b.r}:{nx:0,ny:dy<0?-1:1,push:py+b.r};}
function tick(s,dt){s.time+=dt;s.volleyTime+=dt;s.spawnClock-=dt;for(const e of s.effects)if(e.active&&(e.ttl-=dt)<=0)e.active=false;for(const e of s.enemies)if(e.active)e.flash=Math.max(0,e.flash-dt);
 if(s.launched<s.volleySize&&s.spawnClock<=0){ball(s,s.aimX*14,s.aimY*14);s.launched++;s.spawnClock=.055;}
 for(const b of s.balls){if(!b.active)continue;b.age+=dt;b.cooldown=Math.max(0,b.cooldown-dt);
  if(s.laws.includes('gravity')&&!b.returning){let near=null,dist=1.35;for(const e of s.enemies){if(!e.active)continue;const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<dist){dist=d;near=e;}}if(near&&dist>.01){b.vx+=(near.x-b.x)/dist*dt*8;b.vy+=(near.y-b.y)/dist*dt*8;const v=Math.hypot(b.vx,b.vy);b.vx=b.vx/v*14;b.vy=b.vy/v*14;}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<R){b.x=R+(R-b.x);b.vx=Math.abs(b.vx);b.banks++;}else if(b.x>10-R){b.x=10-R-(b.x-(10-R));b.vx=-Math.abs(b.vx);b.banks++;}
  if(b.y<R){b.y=R+(R-b.y);b.vy=Math.abs(b.vy);b.banks++;b.returning=true;}
  if(s.laws.includes('recall')&&!b.child&&!b.returning&&b.age>1.4){b.returning=true;const dx=s.player.x-b.x,dy=LINE-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*14;b.vy=dy/d*14;}
  if(b.y>=LINE&&b.vy>0||b.age>7){b.active=false;continue;}
  for(const e of s.enemies){if(!e.active)continue;const c=contact(b,e);if(!c||b.lastHit===e.id&&b.cooldown>0)continue;
   // A separating overlap must never register another impact.
   if(b.vx*c.nx+b.vy*c.ny>=0&&!(s.laws.includes('pierce')&&b.pierced<2))continue;
   direct(s,b,e);b.lastHit=e.id;b.cooldown=.10;
   const recallPass=s.laws.includes('recall')&&(b.returning?!b.recallUsed:!b.recallOutbound);
   const pass=s.laws.includes('pierce')&&b.pierced++<2||recallPass;
   if(pass){if(recallPass){if(b.returning)b.recallUsed=true;else b.recallOutbound=true;}continue;}
   b.x+=c.nx*(c.push+.002);b.y+=c.ny*(c.push+.002);const d=b.vx*c.nx+b.vy*c.ny;b.vx-=2*d*c.nx;b.vy-=2*d*c.ny;if(b.vy>0)b.returning=true;break;
  }
 }
 if(s.launched>=s.volleySize&&!s.balls.some(b=>b.active)||s.volleyTime>=8){for(const b of s.balls)b.active=false;endVolley(s);}
}
function offers(s){const held=s.laws,available=BOUNCE_LAWS.filter(x=>!held.includes(x.id));const selected=[];if(held.length<2){const idx=Math.floor(rand(s)*available.length),law=available[idx];selected.push({id:'law:'+law.id,name:law.name,description:descriptions[law.id],law:law.id});}selected.push({id:'power',name:'단단한 씨앗',description:'모든 씨앗 피해 +1'});selected.push({id:'more',name:'풍성한 씨앗',description:'한 번에 날리는 씨앗 +3 (최대 24)'});return selected;}
function advance(s){s.turn++;s.stage=s.turn;for(const e of s.enemies)if(e.active){e.y+=e.slow?.42:.67;e.slow=false;if(e.y+e.h/2>=BOUNCE_CONFIG.heartLine){s.phase='lost';return;}}
 if(s.turn===7){s.boss=true;spawn(s,5,1.05,180,'boss');s.events.push({type:'boss'});}if(s.turn<=9)row(s);s.phase='aim';}
function endVolley(s){if(s.bossDefeated&&!s.enemies.some(e=>e.active)){s.phase='won';s.cleared=1;s.score+=(15-s.turn)*250;return;}if(s.turn>=14){s.phase='lost';return;}if(s.turn%2===0&&s.turn<=10){s.phase='choice';s.offers=offers(s);}else advance(s);}
export function chooseBounce(s,id){if(s.phase!=='choice')return false;const o=s.offers.find(o=>o.id===id);if(!o)return false;if(o.law&&s.laws.length<2){s.laws.push(o.law);if(s.laws.length===2){const f=Object.values(FORMS).find(f=>f.requires.length===2&&f.requires.every(k=>s.laws.includes(k)));if(f)s.fusion={id:f.id,name:f.name,desc:f.desc,requires:[...f.requires]};}}else if(id==='power')s.damage++;else if(id==='more')s.volleySize=Math.min(24,s.volleySize+3);s.offers=[];advance(s);return true;}
// Aim/choice are event-driven and never need a background clock or idle penalty.
export function stepBounce(s,dt){if(!Number.isFinite(dt)||dt<=0||s.phase!=='flying')return;let remaining=Math.min(dt,.25);while(remaining>0&&s.phase==='flying'){const d=Math.min(remaining,STEP);tick(s,d);remaining-=d;}}
export function bounceAimPath(s,aimX,aimY){const a=normalized(aimX,aimY);if(!a)return[];const p=[{x:s.player.x,y:LINE}],b={x:s.player.x,y:LINE,vx:a.x*14,vy:a.y*14,r:R};let banks=0;for(let i=0;i<240;i++){b.x+=b.vx/120;b.y+=b.vy/120;if(b.x<R||b.x>10-R){b.x=Math.max(R,Math.min(10-R,b.x));b.vx=-b.vx;p.push({x:b.x,y:b.y});if(++banks>=2)break;}if(b.y<R){b.y=R;p.push({x:b.x,y:b.y});break;}if(s.enemies.some(e=>e.active&&contact(b,e))){p.push({x:b.x,y:b.y});break;}}if(p.length===1)p.push({x:b.x,y:b.y});return p;}
