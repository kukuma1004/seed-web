import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DUEL_BASE_CHARACTERS} from '../src/duel-base-characters.js';
import {BREAKTHROUGH_ROSTER,createBreakthrough,stepBreakthrough,breakthroughObjective,skillBreakthrough,ultimateBreakthrough,dodgeBreakthrough} from '../src/seed-breakthrough-rules.js';
// Frozen original nine profiles, independent of checkout depth and private work commits.
const previous=JSON.parse(readFileSync(new URL('./duel-base-characters-baseline.json',import.meta.url),'utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(DUEL_BASE_CHARACTERS)),JSON.parse(JSON.stringify(previous)),'shared Duel base catalog remains byte-value equivalent');
const results=[];
for(const char of BREAKTHROUGH_ROSTER){
 const s=createBreakthrough(char,73);assert.equal(s.player.char,char);let peak=0;for(let n=0;n<60*240&&s.phase==='playing';n++){
  const p=s.player,g=breakthroughObjective(s),near=s.units.filter(u=>u.active&&Math.hypot(u.x-p.x,u.y-p.y)<7).sort((a,b)=>Number(b.leader)-Number(a.leader)||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const goal=near?.leader?near:g,dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy),ax=near?near.x-p.x:dx,ay=near?near.y-p.y:dy;
  if(near&&Math.hypot(ax,ay)<5){skillBreakthrough(s);ultimateBreakthrough(s);}if(s.units.some(u=>u.active&&u.tell>0&&u.leader&&Math.hypot(p.x-u.tx,p.y-u.ty)<3))dodgeBreakthrough(s,-ay,ax);
  stepBreakthrough(s,1/60,{x:d>1.4?dx:0,y:d>1.4?dy:0,aimX:ax,aimY:ay,attack:true});s.events.length=0;peak=Math.max(peak,s.units.filter(u=>u.active).length);assert.ok(s.effects.length<=40&&s.units.length===96);
 }
 results.push({char,phase:s.phase,seconds:Math.round(s.time),kills:s.kills,camps:s.camps.map(c=>c.captured),hp:Math.round(s.player.hp),peak});
 assert.ok(s.camps.some(c=>c.captured),'legal bot must capture at least one camp');
 const idle=createBreakthrough(char,73);for(let n=0;n<60*240&&idle.phase==='playing';n++){stepBreakthrough(idle,1/60);idle.events.length=0;}assert.equal(idle.phase,'lost','standing still cannot beat the army');
 const fresh=createBreakthrough(char,73);assert.deepEqual(fresh.camps.map(c=>c.captured),[false,false]);assert.equal(fresh.player.hp,DUEL_BASE_CHARACTERS[char].hp);
}
assert.throws(()=>createBreakthrough('not-a-character'));
const capped=createBreakthrough('burst',73);for(const u of capped.units)u.active=false;const target=capped.units[0];Object.assign(target,{active:true,x:capped.player.x+2,y:capped.player.y,hp:100,maxHp:100,leader:false,boss:false,camp:0,slow:0,stun:0,flash:0,cd:10,tell:0,id:1});
capped.effects=Array.from({length:40},()=>({kind:'slash',x:1,y:1,r:1,life:10,max:10}));assert.ok(skillBreakthrough(capped));assert.equal(capped.pending.length,1);for(let i=0;i<50;i++)stepBreakthrough(capped,1/60);assert.ok(target.hp<100,'delayed skill damage survives a full visual budget');assert.equal(capped.pending.length,0);
const vertical=createBreakthrough('pierce');vertical.player.aimX=0;vertical.player.aimY=-1;skillBreakthrough(vertical);assert.equal(vertical.effects[0].ax,0,'vertical skill keeps zero horizontal aim');
const contact=createBreakthrough('pierce');contact.units.forEach(u=>u.active=false);Object.assign(contact.units[0],{active:true,id:1,x:contact.player.x,y:contact.player.y,hp:100,cd:10,tell:0,slow:0,stun:0,flash:0});for(let i=0;i<3;i++)stepBreakthrough(contact,.05,{attack:true});assert.ok(contact.units[0].hp<100,'overlapping bodies remain hittable after attack contact');
const stopped=createBreakthrough();stopped.phase='lost';const before=JSON.stringify(stopped);stepBreakthrough(stopped,.05,{attack:true,x:1});assert.equal(JSON.stringify(stopped),before,'terminal combat cannot advance');
const assisted=createBreakthrough('burst');assisted.units.forEach(u=>u.active=false);Object.assign(assisted.units[0],{active:true,x:assisted.player.x-2,y:assisted.player.y,hp:100,maxHp:100,leader:false,boss:false,cd:10,tell:0,slow:0,stun:0,flash:0});for(let i=0;i<3;i++)stepBreakthrough(assisted,.05,{attack:true});assert.ok(assisted.player.aimX<0&&assisted.units[0].hp<100,'stationary manual attack faces nearby target without a second aim stick');
const directed=createBreakthrough('pierce');stepBreakthrough(directed,.05,{attack:true,x:1,y:0});assert.equal(directed.player.aimX,1,'movement retains manual attack direction');
console.log(JSON.stringify({note:'Normal start and input-only CPU bot; no HP/clear/state cheats. Not human/device evidence.',results},null,2));
