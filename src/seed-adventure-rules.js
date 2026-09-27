import {LAWS} from './laws.js';
import {CURATED_FORMS} from './forms.js';

// This deliberately small manual-combat adapter shares identities, not the
// automatic journey simulation. It never reads or writes an account/save.
export const ADVENTURE_LAWS=LAWS;
export const ADVENTURE_FORMS=Object.freeze(Object.fromEntries(['returnblade','thunderlance','collapse'].map(id=>[id,CURATED_FORMS[id]])));
export const ADVENTURE={width:24,height:16,maxShots:64,maxEffects:100,maxEnemies:20};
export const ROOMS=['이끼 낀 문턱','달빛 회랑','잊힌 화단','수호자의 뜰','정원의 심장'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const direction=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function createAdventure(seed=1){return {seed:seed>>>0,phase:'setup',time:0,room:0,kills:0,serial:0,weapon:'slash',laws:[],form:null,level:1,charge:35,events:[],enemies:[],shots:[],effects:[],fields:[],spawn:0,wave:0,player:{x:12,y:10,hp:100,maxHp:100,aimX:1,aimY:0,attack:0,dash:0,inv:0,dashing:0,dx:0,dy:0},message:'작은 씨앗, 나만의 전투'};}
function event(s,type){s.events.push(type);if(s.events.length>16)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=ADVENTURE.maxEffects)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
function shot(s,x,y,dx,dy,extra={}){if(s.shots.length>=ADVENTURE.maxShots)return;s.shots.push({x,y,px:x,py:y,dx,dy,speed:12,life:1.15,age:0,damage:17+s.level*2,hit:new Set(),bounces:0,remaining:s.laws.includes('pierce')?3:1,...extra});}
export function startAdventure(s,weapon='slash',law='recall'){s.weapon=weapon==='throw'?'throw':'slash';s.laws=Object.hasOwn(LAWS,law)?[law]:['recall'];s.phase='playing';spawnRoom(s);}
function spawnRoom(s){s.phase='playing';s.enemies.length=0;s.shots.length=0;s.fields.length=0;s.player.x=12;s.player.y=10;s.player.inv=1;s.player.attack=.4;s.wave=0;s.spawn=1.2;s.message=ROOMS[s.room];if(s.room===4){spawnEnemy(s,'boss',12,4);s.spawn=Infinity;}else spawnWave(s);}
function spawnEnemy(s,type,x,y){const boss=type==='boss',hp=boss?850:36+s.room*12+(type==='shield'?24:0);s.enemies.push({id:++s.serial,type,x,y,hp,maxHp:hp,r:boss?1.1:.42,speed:boss?1.05:type==='hound'?1.65:1.05,cd:1.3+random(s),tell:0,tx:0,ty:0,slow:0,frost:0,flash:0,pattern:0});}
function spawnWave(s){s.wave++;const count=3+s.room*2+s.wave;for(let i=0;i<count&&s.enemies.length<20;i++){const a=i/count*Math.PI*2+.5*s.wave;spawnEnemy(s,i%4===2?'caster':i%4===3?'shield':'hound',clamp(12+Math.cos(a)*8,2,22),clamp(8+Math.sin(a)*5,2,14));}s.spawn=0;}
export function adventureOffers(s){const newLaws=Object.keys(LAWS).filter(id=>!s.laws.includes(id));const forms=Object.values(ADVENTURE_FORMS).filter(f=>f.requires.every(l=>s.laws.includes(l))&&s.form!==f.id);return {laws:s.laws.length<4?newLaws:[],forms,canGrow:true};}
export function chooseAdventure(s,kind,id){if(s.phase!=='choice')return false;const offers=adventureOffers(s);if(kind==='law'&&offers.laws.includes(id))s.laws.push(id);else if(kind==='form'&&offers.forms.some(f=>f.id===id))s.form=id;else if(kind==='grow'){s.level++;s.player.maxHp+=10;}else return false;s.player.hp=Math.min(s.player.maxHp,s.player.hp+25);s.room++;spawnRoom(s);return true;}
function hit(s,e,damage,secondary=false){if(e.hp<=0)return;e.hp-=damage;e.flash=.13;fx(s,'number',e.x,e.y,{text:Math.round(damage),life:.6,max:.6});if(!secondary){s.charge=clamp(s.charge+2.8,0,100);event(s,'hit');if(s.laws.includes('frost')){e.slow=1.8;e.frost++;if(e.frost>=5){e.frost=0;e.hp-=32;fx(s,'frost',e.x,e.y,{radius:1.4});}}
 if(s.laws.includes('burst')){fx(s,'burst',e.x,e.y,{radius:1.5});for(const n of s.enemies)if(n!==e&&n.hp>0&&dist(n,e)<1.5)hit(s,n,damage*.4,true);}
 if(s.laws.includes('chain')){let prev=e;const seen=new Set([e.id]);for(let i=0;i<2;i++){const n=s.enemies.filter(n=>n.hp>0&&!seen.has(n.id)&&dist(n,prev)<3.7).sort((a,b)=>dist(a,prev)-dist(b,prev))[0];if(!n)break;fx(s,'chain',prev.x,prev.y,{tx:n.x,ty:n.y});hit(s,n,damage*.5,true);seen.add(n.id);prev=n;}}
 if(s.laws.includes('gravity')&&s.fields.length<6)s.fields.push({x:e.x,y:e.y,life:s.form==='collapse'?1.25:.65,r:2.5,collapse:s.form==='collapse'});
 }if(e.hp<=0){s.kills++;s.charge=clamp(s.charge+4,0,100);fx(s,'leaf',e.x,e.y,{life:.6,max:.6});}}
function hurt(s,n){const p=s.player;if(p.inv>0||s.phase!=='playing')return;p.hp=Math.max(0,p.hp-n);p.inv=.7;event(s,'hurt');fx(s,'hurt',p.x,p.y,{radius:1});if(p.hp<=0){s.phase='lost';s.message='회피로 붉은 예고를 벗어나 보세요';}}
export function attackAdventure(s){if(s.phase!=='playing'||s.player.attack>0)return false;const p=s.player;p.attack=s.weapon==='slash'?.43:.34;const angle=Math.atan2(p.aimY,p.aimX);event(s,s.weapon==='slash'?'shotReturn':'shot');if(s.weapon==='slash'){
 fx(s,'slash',p.x,p.y,{angle,radius:2.65,life:.25,max:.25});for(const e of s.enemies){const a=Math.atan2(e.y-p.y,e.x-p.x)-angle;if(e.hp>0&&dist(e,p)<2.65+e.r&&Math.cos(a)>.1)hit(s,e,27+s.level*3);}
 // A chosen law changes the cut itself: return/pierce projects a blade;
 // split creates three short cutting petals. No automatic aiming.
 if(s.laws.some(l=>['recall','pierce','reflect'].includes(l)))shot(s,p.x,p.y,p.aimX,p.aimY,{life:s.form==='returnblade'?.85:.55,speed:s.form==='thunderlance'?17:10,damage:14+s.level*2+(s.form?6:0),remaining:s.form==='returnblade'?6:s.laws.includes('pierce')?3:1,blade:true});
 if(s.laws.includes('split'))for(const da of [-.5,0,.5])shot(s,p.x,p.y,Math.cos(angle+da),Math.sin(angle+da),{life:.32,damage:9,fragment:true});
 }else{const spread=s.laws.includes('split')?[-.17,0,.17]:[0];for(const da of spread)shot(s,p.x,p.y,Math.cos(angle+da),Math.sin(angle+da),{blade:s.form==='returnblade',speed:s.form==='thunderlance'?17:12,remaining:s.form==='returnblade'?6:s.laws.includes('pierce')?3:1});}return true;}
export function dodgeAdventure(s,x=0,y=0){const p=s.player;if(s.phase!=='playing'||p.dash>0)return false;const d=direction(x||y?x:p.aimX,x||y?y:p.aimY);p.dx=d.x;p.dy=d.y;p.dashing=.2;p.inv=.28;p.dash=1.25;fx(s,'dash',p.x,p.y,{life:.35,max:.35});event(s,'dash');return true;}
export function ultimateAdventure(s){if(s.phase!=='playing'||s.charge<100)return false;s.charge=0;s.player.inv=1;event(s,'evolve');fx(s,'ultimate',s.player.x,s.player.y,{radius:7,life:.9,max:.9});for(const e of s.enemies)if(dist(e,s.player)<7)hit(s,e,95+s.level*12);s.shots=s.shots.filter(b=>!b.hostile);s.charge=0;return true;}
export function stepAdventure(s,dt,input={}){
 if(s.phase!=='playing')return;dt=clamp(dt,0,.05);s.time+=dt;const p=s.player;for(const k of ['attack','dash','inv','dashing'])p[k]=Math.max(0,p[k]-dt);
 if(Number.isFinite(input.aimX)&&Math.hypot(input.aimX,input.aimY)>.05){const d=direction(input.aimX,input.aimY);p.aimX=d.x;p.aimY=d.y;}
 const d=direction(input.x||0,input.y||0),moving=Boolean(input.x||input.y),speed=p.dashing>0?15:p.attack>.29?2.15:4.3;
 p.x=clamp(p.x+(p.dashing>0?p.dx:moving?d.x:0)*speed*dt,1.4,22.6);p.y=clamp(p.y+(p.dashing>0?p.dy:moving?d.y:0)*speed*dt,2,14.4);if(input.attack)attackAdventure(s);
 for(const f of s.fields){f.life-=dt;for(const e of s.enemies)if(e.type!=='boss'&&e.hp>0&&dist(e,f)<f.r){const v=direction(f.x-e.x,f.y-e.y);e.x+=v.x*dt*2.8;e.y+=v.y*dt*2.8;}if(f.life<=0&&f.collapse){fx(s,'burst',f.x,f.y,{radius:2.8});for(const e of s.enemies)if(e.hp>0&&dist(e,f)<2.8)hit(s,e,28,true);}}s.fields=s.fields.filter(f=>f.life>0);
 for(const e of s.enemies){if(e.hp<=0)continue;e.cd-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.type==='caster'){const v=direction(e.tx-e.x,e.ty-e.y);shot(s,e.x,e.y,v.x,v.y,{hostile:true,damage:12,speed:5.5,life:4});}else if(e.type==='boss'&&e.pattern%2===0){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;shot(s,e.x,e.y,Math.cos(a),Math.sin(a),{hostile:true,boss:true,damage:16,speed:4.2,life:4});}fx(s,'enemyRing',e.x,e.y,{radius:3});if(dist(p,e)<3)hurt(s,20);}else{fx(s,'enemyRing',e.tx,e.ty,{radius:e.type==='boss'?2.1:1});if(Math.hypot(p.x-e.tx,p.y-e.ty)<(e.type==='boss'?2.1:1))hurt(s,e.type==='boss'?22:12);if(e.type==='boss'){e.x=e.tx;e.y=e.ty;}}e.cd=e.type==='boss'?1.4:1.7;}continue;}
 const range=e.type==='caster'?7:e.type==='boss'?5:1.35;if(dist(e,p)>range){const v=direction(p.x-e.x,p.y-e.y);e.x+=v.x*e.speed*(e.slow>0?.5:1)*dt;e.y+=v.y*e.speed*(e.slow>0?.5:1)*dt;}else if(e.cd<=0){e.tell=e.type==='boss'?.95:.68;e.tx=p.x;e.ty=p.y;e.pattern++;}
 // Keep a readable ring around the seed instead of stacking sprites.
 for(const n of s.enemies)if(n.id<e.id&&n.hp>0){const gap=dist(e,n),r=e.r+n.r;if(gap<r&&gap>.001){e.x+=(e.x-n.x)/gap*dt;e.y+=(e.y-n.y)/gap*dt;}}
 }
 for(const b of s.shots){b.life-=dt;b.age+=dt;b.px=b.x;b.py=b.y;if(!b.hostile&&!b.fragment&&s.laws.includes('recall')&&b.age>.48){if(!b.returning){b.returning=true;b.hit.clear();b.remaining=s.form==='returnblade'?6:s.laws.includes('pierce')?3:1;b.spent=false;b.life=.9;}const v=direction(p.x-b.x,p.y-b.y);b.dx=v.x;b.dy=v.y;if(dist(b,p)<.45){b.life=0;continue;}}
 b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;if(b.x<1.3||b.x>22.7||b.y<1.8||b.y>14.7){if(!b.hostile&&s.laws.includes('reflect')&&b.bounces<2){if(b.x<1.3||b.x>22.7)b.dx*=-1;else b.dy*=-1;b.bounces++;b.x=clamp(b.x,1.3,22.7);b.y=clamp(b.y,1.8,14.7);fx(s,'frost',b.x,b.y,{radius:.7});}else b.life=0;}
 if(b.hostile){if(s.laws.includes('orbit')&&!b.boss&&dist(b,p)<1.6){b.life=0;fx(s,'frost',b.x,b.y,{radius:.5});}else if(dist(b,p)<.45){hurt(s,b.damage);b.life=0;}}else for(const e of s.enemies){if(e.hp<=0||b.spent||b.hit.has(e.id))continue;const vx=b.x-b.px,vy=b.y-b.py,len=vx*vx+vy*vy,t=clamp(((e.x-b.px)*vx+(e.y-b.py)*vy)/(len||1),0,1);if(Math.hypot(e.x-b.px-vx*t,e.y-b.py-vy*t)<e.r+.22){b.hit.add(e.id);hit(s,e,b.damage);if(--b.remaining<=0){if(s.laws.includes('recall')&&!b.fragment&&!b.returning)b.spent=true;else b.life=0;break;}}}}
 s.shots=s.shots.filter(b=>b.life>0);if(s.laws.includes('orbit')){for(const e of s.enemies)if(e.hp>0&&dist(e,p)<1.9){e.orbitTick=(e.orbitTick||0)-dt;if(e.orbitTick<=0){e.orbitTick=.5;hit(s,e,9,true);}}}
 for(const f of s.effects)f.life-=dt;s.effects=s.effects.filter(f=>f.life>0);s.enemies=s.enemies.filter(e=>e.hp>0);
 if(s.phase==='playing'&&!s.enemies.length){if(s.room===4){s.phase='won';s.message='정원에 다시 달빛이 스며듭니다';}else if(s.wave<2){s.spawn+=dt;if(s.spawn>1.4)spawnWave(s);}else{s.phase='choice';s.shots.length=0;s.message='다음 전투는 어떤 모습일까요?';event(s,'pickup');}}
}
