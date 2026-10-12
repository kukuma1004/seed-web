import assert from 'node:assert/strict';
import {DUEL_BASE_CHARACTERS} from '../src/duel-base-characters.js';
import {BREAKTHROUGH_ROSTER,createBreakthrough,stepBreakthrough,breakthroughObjective,chooseBreakthrough,skillBreakthrough,ultimateBreakthrough,dodgeBreakthrough} from '../src/seed-breakthrough-rules.js';

// Contract fixtures below isolate capture/choice boundaries. They are not a
// claim of human/device play. The separate bot at the end uses only real input.
function captureFixture(s,camp){
 s.units.forEach(u=>u.active=false);Object.assign(s.camps[camp],{leaderDead:true,progress:2.99});
 s.player.x=s.camps[camp].x;s.player.y=s.camps[camp].y;stepBreakthrough(s,.02);
 assert.equal(s.phase,'choice');assert.equal(s.offers.length,3);assert.equal(s.choiceCamp,camp);
}
function secondFixture(char,first='wide-leaf'){
 const s=createBreakthrough(char,44);captureFixture(s,0);assert.ok(chooseBreakthrough(s,first));captureFixture(s,1);return s;
}
function isolateTarget(s,distance=2,hp=1000){
 s.units.forEach(u=>u.active=false);const p=s.player;p.aimX=1;p.aimY=0;p.inv=10;
 const u=s.units[0];Object.assign(u,{active:true,id:1,x:p.x+distance,y:p.y,hp,maxHp:hp,leader:false,boss:false,camp:0,slow:0,stun:0,flash:0,cd:10,tell:0});return u;
}
const fresh=createBreakthrough();const freshText=JSON.stringify(fresh);
assert.equal(chooseBreakthrough(fresh,'sharp-heart'),false);
assert.equal(JSON.stringify(fresh),freshText,'unearned choice cannot affect a fresh run');
assert.equal(fresh.growth.length,0);assert.equal(fresh.offers.length,0);
const contested=createBreakthrough();contested.player.x=contested.camps[0].x;contested.player.y=contested.camps[0].y;
stepBreakthrough(contested,.05);assert.equal(contested.phase,'playing','live captain prevents reward');
contested.camps[0].leaderDead=true;stepBreakthrough(contested,.05);assert.equal(contested.phase,'playing','contested flag prevents reward');

const frozen=createBreakthrough();frozen.player.hp=80;captureFixture(frozen,0);
assert.equal(frozen.player.hp,115,'capture recovery occurs once at the earned milestone');
const snapshot=JSON.stringify(frozen);
for(let i=0;i<100;i++)stepBreakthrough(frozen,.05,{x:1,attack:true});
assert.equal(skillBreakthrough(frozen),false);assert.equal(dodgeBreakthrough(frozen),false);assert.equal(ultimateBreakthrough(frozen),false);
assert.equal(chooseBreakthrough(frozen,'missing'),false);assert.equal(JSON.stringify(frozen),snapshot,'modal input/time/invalid choice is entirely frozen');
assert.equal(frozen.bossAppeared,false);assert.ok(breakthroughObjective(frozen).label.includes('선택'));
assert.ok(chooseBreakthrough(frozen,'deep-roots'));assert.equal(frozen.player.hp,115,'extra maximum HP does not heal');
assert.equal(frozen.player.maxHp,182*1.2);assert.equal(frozen.upgrades.speed,.92);assert.equal(frozen.offers.length,0);
const chosenSnapshot=JSON.stringify(frozen);assert.equal(chooseBreakthrough(frozen,'deep-roots'),false);
assert.equal(JSON.stringify(frozen),chosenSnapshot,'button replay gives neither an extra upgrade nor recovery');

const firstChecks=[];
for(const id of ['wide-leaf','sharp-heart','deep-roots']){
 const s=createBreakthrough('pierce',44);captureFixture(s,0);const offered=s.offers.map(o=>o.id);assert.equal(new Set(offered).size,3);
 assert.ok(s.offers.every(o=>o.name&&o.description.includes('·')));chooseBreakthrough(s,id);
 const target=isolateTarget(s,id==='wide-leaf'?5.8:2),before=target.hp;
 for(let n=0;n<3;n++)stepBreakthrough(s,.05,{attack:true,aimX:1,aimY:0});
 if(id==='wide-leaf')assert.ok(target.hp<before,'wider attack connects beyond original 5.1 total radius');
 if(id==='sharp-heart'){assert.equal(s.player.maxHp,182*.85);assert.ok(Math.abs(before-target.hp-11*2.1*1.22)<1e-7,'damage gain reaches actual contact');}
 if(id==='deep-roots'){const x=s.player.x;stepBreakthrough(s,.05,{x:1});assert.ok(Math.abs(s.player.x-x-4.5*1.5*.92*.05)<1e-7,'movement downside reaches actual integration');}
 firstChecks.push({id,damage:before-target.hp,maxHp:s.player.maxHp,reach:s.upgrades.reach,speed:s.upgrades.speed});
}
const secondChecks=[];
for(const char of BREAKTHROUGH_ROSTER){
 const initial=secondFixture(char);assert.equal(initial.bossAppeared,false,'second capture does not spawn a boss behind its modal');
 const ids=initial.offers.map(o=>o.id);assert.equal(new Set(ids).size,3);
 for(const id of ids){
  const s=secondFixture(char),offer=s.offers.find(o=>o.id===id),hp=s.player.hp,meter=s.player.meter;
  assert.ok(chooseBreakthrough(s,id));assert.equal(s.growth.length,2);assert.ok(s.bossAppeared&&s.boss?.active);assert.equal(s.player.hp,hp);assert.equal(s.player.meter,meter,'choosing does not refill resources');
  assert.ok(s.growth.every(g=>g.id&&g.name&&g.description));assert.equal(s.offers.length,0);
  const target=isolateTarget(s,id==='long-lance'?8:2);const before=target.hp;
  assert.ok(skillBreakthrough(s));assert.equal(s.player.skill,DUEL_BASE_CHARACTERS[char].skills[0].cooldown*s.upgrades.skillCd);
  if(id==='long-lance')assert.ok(target.hp<before,'long lance actually reaches its extended corridor');
  if(char==='burst'){
   const pending=s.pending[0];assert.equal(pending.r,3.8*s.upgrades.skillRange);assert.equal(pending.delay,.7*s.upgrades.skillDelay);assert.equal(pending.damage,54*s.upgrades.skillDamage);
   for(let n=0;n<40;n++)stepBreakthrough(s,.05);assert.ok(target.hp<before,'delayed flower upgrade keeps real damage');
  }
  if(id==='lasting-winter'){assert.ok(Math.abs(target.slow-4.2)<1e-7);assert.ok(Math.abs(before-target.hp-14*.85*.9)<1e-7);}
  assert.ok(dodgeBreakthrough(s,1,0));assert.equal(s.player.dash,.8*s.upgrades.dashCd);
  if(id==='charged-lance'||id==='charged-winter'){
   s.player.attack=0;s.player.contact=0;s.player.hitDone=true;s.player.combo=0;s.player.meter=0;s.player.dashing=0;target.x=s.player.x+2;target.y=s.player.y;
   for(let n=0;n<3;n++)stepBreakthrough(s,.05,{attack:true,aimX:1,aimY:0});
   assert.ok(s.player.meter>=1.5*s.upgrades.meter,'charged growth changes actual hit meter');
   assert.ok(s.upgrades.cadence>1,'meter has an attack cadence cost');
  }
  assert.ok(s.effects.length<=40&&s.units.length===96);
  const stable=JSON.stringify(s);assert.equal(chooseBreakthrough(s,id),false);assert.equal(JSON.stringify(s),stable);
  secondChecks.push({char,id,name:offer.name,skillCd:s.upgrades.skillCd,skillRange:s.upgrades.skillRange,skillDamage:s.upgrades.skillDamage});
 }
}
const forward=createBreakthrough('burst',22),reverse=createBreakthrough('burst',22);
captureFixture(forward,0);captureFixture(reverse,1);assert.deepEqual(forward.offers,reverse.offers,'offers depend on earned stage, not order of camps');
chooseBreakthrough(forward,'wide-leaf');chooseBreakthrough(reverse,'wide-leaf');captureFixture(forward,1);captureFixture(reverse,0);assert.deepEqual(forward.offers,reverse.offers);
const terminals=createBreakthrough();terminals.phase='lost';const deadSnapshot=JSON.stringify(terminals);assert.equal(chooseBreakthrough(terminals,'wide-leaf'),false);assert.equal(JSON.stringify(terminals),deadSnapshot);
const lethal=createBreakthrough();lethal.units.forEach(u=>u.active=false);
Object.assign(lethal.camps[0],{leaderDead:true,progress:2.99});Object.assign(lethal.player,{x:18,y:11,hp:1,inv:0});
Object.assign(lethal.units[0],{active:true,id:1,camp:1,leader:false,boss:false,x:18,y:11,hp:100,cd:0,tell:.01,slow:0,stun:0,flash:0});
stepBreakthrough(lethal,.02);assert.equal(lethal.phase,'lost','fatal damage cannot become a healing capture/choice on the same tick');assert.equal(lethal.offers.length,0);assert.equal(lethal.camps[0].captured,false);
const retry=createBreakthrough('frost',44);assert.equal(retry.growth.length,0);assert.equal(retry.upgrades.damage,1);assert.equal(retry.upgrades.skillSlow,1);assert.equal(retry.player.maxHp,DUEL_BASE_CHARACTERS.frost.hp,'retry has no inherited run growth');

function legalBot(char,seed){
 const s=createBreakthrough(char,seed);let peak=0,choices=0;
 for(let n=0;n<60*240&&(s.phase==='playing'||s.phase==='choice');n++){
  if(s.phase==='choice'){
   assert.equal(s.offers.length,3);assert.equal(s.bossAppeared,false);
   const priorTime=s.time;stepBreakthrough(s,.05,{attack:true,x:1});assert.equal(s.time,priorTime);
   const id=s.growth.length? s.offers[0].id:'sharp-heart';assert.ok(chooseBreakthrough(s,id));choices++;continue;
  }
  const p=s.player,g=breakthroughObjective(s),near=s.units.filter(u=>u.active&&Math.hypot(u.x-p.x,u.y-p.y)<7).sort((a,b)=>Number(b.leader)-Number(a.leader)||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const goal=near?.leader?near:g,dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy),ax=near?near.x-p.x:dx,ay=near?near.y-p.y:dy;
  if(near&&Math.hypot(ax,ay)<5){skillBreakthrough(s);ultimateBreakthrough(s);}
  if(s.units.some(u=>u.active&&u.tell>0&&u.leader&&Math.hypot(p.x-u.tx,p.y-u.ty)<3))dodgeBreakthrough(s,-ay,ax);
  stepBreakthrough(s,1/60,{x:d>1.4?dx:0,y:d>1.4?dy:0,aimX:ax,aimY:ay,attack:true});s.events.length=0;
  peak=Math.max(peak,s.units.filter(u=>u.active).length);assert.ok(s.effects.length<=40&&s.units.length===96);
 }
 assert.ok(choices>=1,'ordinary input bot earns a camp upgrade');
 assert.equal(choices,s.growth.length);assert.ok(s.phase==='won'||s.phase==='lost');
 return {char,seed,phase:s.phase,seconds:+s.time.toFixed(2),kills:s.kills,choices,growth:s.growth.map(g=>g.id),peak};
}
const results=BREAKTHROUGH_ROSTER.map(char=>legalBot(char,73));assert.ok(results.some(r=>r.phase==='won'&&r.choices===2),'full legal-input win reaches two earned choices and boss');
assert.deepEqual(legalBot('pierce',73),results[0],'growth and battlefield simulation remain seed deterministic');
console.log(JSON.stringify({note:'Contract fixtures plus normal-start input-only CPU runs; not human/browser/device verification.',firstChecks,secondChecks,results},null,2));
