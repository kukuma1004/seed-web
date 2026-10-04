import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDuel,stepDuel,DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {batch05Ai,batch05DangerAi} from '../src/seed-duel-batch05.js';
import {ALL_FORMS} from '../src/forms.js';
import {DUEL_STORY_STAGES,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,nextStoryStage} from '../src/seed-duel-story-progress.js';
const dt=1/60,fixture=(id,ox=18.5,oy=10)=>{const s=createDuel({player:id,enemy:'pierce',seed:29});s.phase='fight';Object.assign(s.fighters[0],{x:15,y:10,fx:1,fy:0});Object.assign(s.fighters[1],{x:ox,y:oy,fx:-1,fy:0,hp:1000,maxHp:1000});return s;};
const run=(s,t,p={},e={})=>{for(let a=0;a<t;a+=dt)stepDuel(s,dt,p,e);};
const cast=(s,p={skill1:true})=>stepDuel(s,dt,p,{});
assert.deepEqual(ALL_FORMS.frostbloom.requires,['burst','frost']);assert.deepEqual(ALL_FORMS.stormcrown.requires,['orbit','chain']);
for(const id of ['frostbloom','stormcrown']){assert.equal(DUEL_CHARACTERS[id].comboId,id);assert.ok(DUEL_ORDER.includes(id));}
// Genuine fixed landing, exposure-earned cold, one short stagger and delayed
// break. Leaving the planted circle or facing guard prevents cold accumulation.
{const s=fixture('frostbloom');cast(s);const h=s.hazards[0],p=[h.x,h.y];run(s,.25);assert.equal(s.fighters[1].hp,1000);assert.equal(s.hazards[0].kind,'bloomPlant');run(s,.6);const bud=s.hazards.find(h=>h.kind==='bloomBud');assert.ok(bud.cold>0&&bud.shatterIn>.35);assert.deepEqual([bud.x,bud.y],p);run(s,1.5);assert.equal(1000-s.fighters[1].hp,25);assert.equal(s.hazards.length,0);assert.equal(s.fighters[1].slow,0);assert.equal(s.fighters[1].stun,0);}
{const s=fixture('frostbloom');cast(s);run(s,.55);s.fighters[1].y=14;run(s,2);assert.equal(s.fighters[1].hp,1000);assert.equal(s.fighters[1].bloomChillCd,0);}
{const s=fixture('frostbloom');run(s,.3,{}, {block:true});cast(s);run(s,2.5,{}, {block:true});assert.ok(Math.abs(1000-s.fighters[1].hp-2.8)<1e-6);assert.equal(s.fighters[1].bloomChillCd,0);assert.equal(s.fighters[1].slow,0);}
// A final arming-frame real melee hit cancels setup, while a landed bud remains
// independent. Neither kit turns invulnerable while preparing an ability.
for(const id of ['frostbloom','stormcrown']){const s=fixture(id,16.5);cast(s);s.hazards[0].arm=.005;const f=s.fighters[0],o=s.fighters[1];Object.assign(o,{state:'attack',step:0,t:.11,total:.36,hitAt:.095,hitDone:false});stepDuel(s,dt,{},{});assert.ok(f.stun>0&&f.hp<f.maxHp);assert.equal(s.hazards.some(h=>h.t>0),false);assert.equal(f.inv,0);}
{const s=fixture('frostbloom');cast(s);run(s,.55);s.fighters[0].stun=1;s.fighters[0].state='hit';run(s,2);assert.equal(1000-s.fighters[1].hp,25);}
// Early break consumes no fresh placement and always leaves0.35s to exit.
{const s=fixture('frostbloom');cast(s);run(s,.8);const bud=s.hazards.find(h=>h.kind==='bloomBud'),cd=s.fighters[0].cd[0];cast(s,{skill2:true});assert.ok(bud.shatterIn>.3&&bud.shatterIn<=.35);assert.ok(s.fighters[0].cd[0]<cd);assert.ok(s.fighters[0].cd[1]>0);assert.equal(s.fighters[0].inv,0);s.fighters[1].y=14;run(s,1);assert.equal(s.fighters[1].hp,1000);}
{const s=fixture('frostbloom',16.6);cast(s,{skill2:true});assert.equal(s.hazards[0].kind,'bloomFan');run(s,1);assert.equal(1000-s.fighters[1].hp,8);assert.equal(s.fighters[0].inv,0);}
// Unguarded finishers earn a single next-bud petal or finite crown charge;
// guarded/parried strikes cannot award either resource and both timers expire.
for(const [id,key] of [['frostbloom','bloomPetal'],['stormcrown','crownCharge']]){const s=fixture(id,16.5),f=s.fighters[0];f.combo=2;f.comboTime=1;cast(s,{attack:true});run(s,.4);assert.equal(f[key],1);run(s,7);assert.equal(f[key],0);
 const g=fixture(id,16.5);run(g,.3,{}, {block:true});g.fighters[0].combo=2;g.fighters[0].comboTime=1;cast(g,{attack:true});run(g,.45,{}, {block:true});assert.equal(g.fighters[0][key],0);}
const orbit=s=>{cast(s);run(s,.4);return s.hazards.find(h=>h.kind==='crownOrbit');};
const shotAt=(s,h,extra={})=>{const a=h.angle+dt*4,q={owner:1,x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,dx:0,dy:0,speed:0,life:1,damage:12,pierce:0,bounces:0,hit:new Set(),kind:'petal',...extra};s.shots.push(q);return q;};
// Defense only exists at actual satellite points, shared two-shot budget; the
// same destroyed bullet can never award charge or trigger another contact.
{const s=fixture('stormcrown',22),h=orbit(s),f=s.fighters[0];assert.equal(h.budget.blocks,2);assert.equal(f.inv,0);const q=shotAt(s,h);stepDuel(s,dt,{},{});assert.ok(q.wardSpent);assert.equal(h.budget.blocks,1);assert.equal(f.crownCharge,1);shotAt(s,h);stepDuel(s,dt,{},{});assert.equal(h.budget.blocks,0);assert.equal(f.crownCharge,2);shotAt(s,h);stepDuel(s,dt,{},{});assert.equal(h.budget.blocks,0);assert.equal(f.crownCharge,2);run(s,7);assert.equal(f.crownCharge,0);assert.equal(s.hazards.length,0);}
{const s=fixture('stormcrown',22),h=orbit(s);const q=shotAt(s,h,{boss:true});stepDuel(s,dt,{},{});assert.equal(q.wardSpent,undefined);assert.equal(h.budget.blocks,2);assert.equal(s.fighters[0].crownCharge,0);}
{const s=fixture('stormcrown',22),h=orbit(s),f=s.fighters[0];s.shots.push({owner:1,x:f.x,y:f.y,dx:0,dy:0,speed:0,life:1,damage:12,pierce:0,bounces:0,hit:new Set(),kind:'petal'});stepDuel(s,dt,{},{});assert.equal(f.maxHp-f.hp,12);assert.equal(h.budget.blocks,2);}
// Each projectile host intercepts its ACTUAL swept segment before body damage.
// Both seats, opposite approaches and slow-frame/high-speed crossings remain
// point wards. A projectile already at the body still passes their orbit gap.
const crownFixture=(seat,enemy='pierce')=>{const s=createDuel({player:seat?enemy:'stormcrown',enemy:seat?'stormcrown':enemy,seed:29});s.phase='fight';const f=s.fighters[seat],o=s.fighters[1-seat];Object.assign(f,{x:15,y:10,fx:1,fy:0});Object.assign(o,{x:22,y:10,fx:-1,fy:0,hp:1000,maxHp:1000});const inputs=seat?[{},{skill1:true}]:[{skill1:true},{}];stepDuel(s,dt,...inputs);for(let n=0;n<24;n++)stepDuel(s,dt,{},{});return s;};
const aimCrown=(s,seat,step)=>{const stars=s.hazards.filter(h=>h.owner===seat&&h.kind==='crownOrbit');stars.forEach((h,k)=>h.angle=k*Math.PI-step*4);return stars[0];};
const incomingShot=(seat,kind,x,dir,speed=14)=>({kind,owner:1-seat,x,y:10,dx:dir,dy:0,speed,life:2,damage:12,pierce:8,bounces:0,hit:new Set(),budget:{out:new Set(),back:new Set()},age:0});
for(const seat of [0,1])for(const kind of ['petal','returnSpear','thunderSpear','collapseSeed'])for(const dir of [-1,1])for(const speed of [14,40]){
 const s=crownFixture(seat),f=s.fighters[seat],h=aimCrown(s,seat,.05);s.fighters[1-seat].x=15-dir*7;
 const q=incomingShot(seat,kind,15-dir*(speed===40?2:1.3),dir,speed);if(kind==='collapseSeed')Object.assign(q,{r:.3,burstR:2.2,budget:{spent:false},pull:.9});s.shots.push(q);
 stepDuel(s,.05,{},{});assert(q.wardSpent,`${kind} seat${seat} dir${dir} speed${speed}`);assert.equal(f.hp,f.maxHp);assert.equal(h.budget.blocks,1);assert.equal(f.crownCharge,1);assert(!s.hazards.some(h=>h.kind==='collapseBurst'||h.kind==='thunderArc'));
 stepDuel(s,.05,{},{});assert.equal(f.hp,f.maxHp);assert.equal(h.budget.blocks,1);
}
// Return steering changes this segment to the opposite direction. A new spear
// released on the last startup frame also participates in the same host hook.
for(const seat of [0,1]){
 const s=crownFixture(seat,'returnblade'),f=s.fighters[seat],h=aimCrown(s,seat,.05),q=incomingShot(seat,'returnSpear',13.7,-1);q.age=.57;s.shots.push(q);stepDuel(s,.05,{},{});assert(q.back&&q.dx>0&&q.wardSpent);assert.equal(f.hp,f.maxHp);assert.equal(h.budget.blocks,1);
 const expiry=crownFixture(seat),eh=aimCrown(expiry,seat,.05),last=incomingShot(seat,'returnSpear',17,-1,40);last.life=.03;expiry.shots.push(last);stepDuel(expiry,.05,{},{});assert(last.wardSpent);assert.equal(eh.budget.blocks,1);assert.equal(expiry.fighters[seat].hp,expiry.fighters[seat].maxHp);
 const a=crownFixture(seat,'returnblade'),star=aimCrown(a,seat,.05),caster=a.fighters[1-seat];Object.assign(caster,{x:17.6,fx:-1,fy:0});stepDuel(a,dt,...(seat?[{skill1:true},{}]:[{},{skill1:true}]));const send=a.hazards.find(h=>h.kind==='bladeSend');assert(send);send.arm=.005;aimCrown(a,seat,.05);stepDuel(a,.05,{},{});assert.equal(star.budget.blocks,1);assert.equal(a.fighters[seat].hp,a.fighters[seat].maxHp);assert(a.events.includes('crownBlock'));
}
// An ordinary blocked lance cannot spawn its on-expiry tip explosion behind
// the ward; boss-tagged special shots still bypass the finite group budget.
for(const seat of [0,1]){
 const s=crownFixture(seat),h=aimCrown(s,seat,.05),q=incomingShot(seat,'lance',16.3,-1);Object.assign(q,{bloomTip:true,bloomSpent:false,startX:16.3,startY:10,tipDamage:30});s.shots.push(q);stepDuel(s,.05,{},{});assert(q.wardSpent&&q.bloomSpent);assert.equal(s.fighters[seat].hp,s.fighters[seat].maxHp);assert.equal(h.budget.blocks,1);
 const b=crownFixture(seat),hb=aimCrown(b,seat,.05),boss=incomingShot(seat,'thunderSpear',16.3,-1);boss.boss=true;b.shots.push(boss);stepDuel(b,.05,{},{});assert(!boss.wardSpent);assert.equal(hb.budget.blocks,2);
}
// Execute the real warning painter with a Canvas contract recorder. Its round
// endpoint caps enclose the same .7-radius capsule as the actual drop collision.
{const source=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8'),body=source.slice(source.indexOf(' function batch05Hazard('),source.indexOf(' function frostThread(')),strokes=[];
 const ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(x,y){this.start=[x,y];},lineTo(x,y){this.end=[x,y];},stroke(){strokes.push({cap:this.lineCap,width:this.lineWidth,start:this.start,end:this.end});}};const scope=vm.createContext({ctx});vm.runInContext(body,scope);scope.batch05Hazard({kind:'crownDrop',owner:1,x:15,y:10,endX:17.65,endY:10,r:.35,arm:.35},'#fff');assert.equal(strokes[0].cap,'round');assert.equal(strokes[0].width,1.4);
 const s=fixture('stormcrown',18.25);cast(s,{skill2:true});run(s,1);assert.equal(1000-s.fighters[1].hp,7);
}
// Each satellite gets one actual contact -> one delayed fixed current. Short
// proximity, cover and post-contact sidestep remain valid counterplay.
{const s=fixture('stormcrown',16.5);cast(s);run(s,2.5);assert.equal(1000-s.fighters[1].hp,14);assert.equal(s.fighters[0].crownCharge,2);run(s,1);assert.equal(s.hazards.length,0);}
{const s=fixture('stormcrown',16.5);cast(s);run(s,.4);const link=s.hazards.find(h=>h.kind==='crownLink');assert.ok(link&&link.arm>0);const pos=[link.x,link.y,link.endX,link.endY];s.fighters[1].y=14;run(s,3);assert.deepEqual([link.x,link.y,link.endX,link.endY],pos);assert.equal(s.fighters[1].hp,1000);}
for(const [guard,exit] of [[false,false],[true,false],[false,true]]){const s=fixture('stormcrown',17),f=s.fighters[0];f.crownCharge=2;f.crownChargeTime=6;if(guard)run(s,.3,{}, {block:true});cast(s,{skill2:true});assert.equal(f.crownCharge,0);assert.equal(f.inv,0);if(exit)s.fighters[1].y=14;run(s,1,{},guard?{block:true}:{});assert.ok(Math.abs(1000-s.fighters[1].hp-(exit?0:guard?3.8:19))<1e-6);}
{const s=fixture('stormcrown',25.5,6.2);Object.assign(s.fighters[0],{x:23,y:6.2});s.fighters[0].crownCharge=2;s.fighters[0].crownChargeTime=6;cast(s,{skill2:true});run(s,1);assert.equal(s.fighters[1].hp,1000,'cover blocks discharge');}
// Ultimate has bounded total hits, one shared short-cold pulse and no recursive
// ward/reflection rewards. New round clears all resources and owned fields.
for(const [id,max] of [['frostbloom',40],['stormcrown',21]]){const s=fixture(id,id==='stormcrown'?16.5:18.5);s.fighters[0].meter=100;cast(s,{ult:true});assert.equal(s.fighters[0].inv,0);assert.equal(s.fighters[0].meter,0);run(s,5);assert.ok(1000-s.fighters[1].hp<=max);assert.ok(1000-s.fighters[1].hp>0);assert.equal(s.hazards.length,0);}
for(const id of ['frostbloom','stormcrown']){const s=fixture(id);Object.assign(s.fighters[0],{bloomCast:5,bloomPetal:1,bloomPetalTime:4,bloomChillCd:2,crownCast:3,crownCharge:2,crownChargeTime:6});s.phase='roundEnd';s.ready=.01;stepDuel(s,.02,{},{});for(const key of ['bloomCast','bloomPetal','bloomPetalTime','bloomChillCd','crownCast','crownCharge','crownChargeTime'])assert.equal(s.fighters[0][key],0);}
for(const id of ['frostbloom','stormcrown']){const s=fixture(id);for(let n=0;n<1800;n++){s.fighters[0].cd=[0,0];stepDuel(s,dt,{skill1:true},{});assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert.ok(s.fighters.every(f=>Number.isFinite(f.x+f.y+f.hp)));}run(s,6);assert.equal(s.hazards.length,0);}
// Own kit reads are finite observations. Crown setup must occur before jab
// range; it must not consume remaining contact stars for one premature charge.
{const s=fixture('stormcrown',17.7),f=s.fighters[0],o=s.fighters[1];let i={};for(let n=0;n<14;n++)batch05Ai(s,f,o,i,dt);assert.equal(i.skill1,true);cast(s,i);run(s,.55);o.x=17.5;f.crownCharge=1;f.crownChargeTime=6;i={};batch05Ai(s,f,o,i,dt);assert.equal(i.skill2,undefined);f.crownCharge=2;batch05Ai(s,f,o,i,dt);assert.equal(i.skill2,true);}
for(const miss of [true,false]){const s=fixture('stormcrown',22),f=s.fighters[0];s.shots.push({owner:1,x:8,y:miss?17:10,dx:1,dy:0,speed:8,life:2});let issue=false;for(let n=0;n<14;n++){const i={};batch05Ai(s,f,s.fighters[1],i,dt);issue ||= Boolean(i.skill1);}assert.equal(issue,!miss);}
{const s=fixture('pierce'),f=s.fighters[0];s.hazards.push({kind:'bloomBud',owner:1,x:f.x-1,y:f.y,r:1.45,t:1,arm:0,shatterIn:.5});for(let n=0;n<10;n++)assert.equal(batch05DangerAi(s,f,{},dt),false);let read=false;for(let n=0;n<5;n++)read=batch05DangerAi(s,f,{},dt)||read;assert.ok(read);f.y=17;assert.equal(batch05DangerAi(s,f,{},dt),false);}
{const s=fixture('pierce'),f=s.fighters[0];s.hazards.push({kind:'bloomBud',owner:1,x:f.x,y:f.y,r:1.45,t:1,arm:0,shatterIn:.5});const i={};for(let n=0;n<15;n++)batch05DangerAi(s,f,i,dt);assert.ok(Math.hypot(i.x,i.y)>.9,'exact center still has an actual exit direction');}
let legacy={hero:'thunderlance',updatedAt:20,cleared:Object.fromEntries(Array.from({length:30},(_,i)=>[`s${i+1}`,{losses:0,at:10}]))};assert.equal(nextStoryStage(legacy),31);let p=legacy;
for(const id of ['frostbloom','stormcrown']){const stage=DUEL_STORY_STAGES.find(v=>v.enemy===id),m=createDuel({player:id,enemy:id});Object.assign(m,{phase:'over',winner:0,wins:[2,1]});p=completeStoryMatch(p,stage,m,40+stage.number);assert.ok(p);}
assert.equal(Object.keys(mergeDuelStory(legacy,p).cleared).length,32);assert.equal(normalizeDuelStory(p).hero,'stormcrown');
console.log('Bundle05 canonical recipes, real fixed bloom/cold/short stagger/shatter/guard/exit/final interrupt, finite orbit-point-only ward and fixed earned discharge, ult/TTL/reset/counterplay, AI observations and30-to32 save/story passed.');
