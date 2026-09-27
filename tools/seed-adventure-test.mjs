import assert from 'node:assert/strict';
import {createAdventure,startAdventure,stepAdventure,attackAdventure,dodgeAdventure,ultimateAdventure,adventureOffers,chooseAdventure,ADVENTURE,ADVENTURE_FORMS} from '../src/seed-adventure-rules.js';
import {LAWS} from '../src/laws.js';
import {CURATED_FORMS} from '../src/forms.js';

const begin=(weapon='slash',law='recall')=>{const s=createAdventure(42);startAdventure(s,weapon,law);s.player.attack=0;s.player.inv=1000;return s;};
const dummy=(id,x,y,hp=1000)=>({id,type:'hound',x,y,hp,maxHp:hp,r:.42,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0});
const tick=(s,seconds,input={})=>{for(let t=0;t<seconds;t+=1/60)stepAdventure(s,1/60,input);};

assert.equal(Object.keys(LAWS).length,9);
for(const [id,f] of Object.entries(ADVENTURE_FORMS))assert.equal(f,CURATED_FORMS[id]);
{
 const s=begin();s.enemies=[dummy(1,13,10),dummy(2,11,10)];
 tick(s,1);assert.equal(s.enemies[0].hp,1000,'no held attack: no automatic melee');
 assert.equal(attackAdventure(s),true);assert.equal(s.enemies[0].hp,970,'front melee damage');assert.equal(s.enemies[1].hp,1000,'back enemy outside slash');
 assert.equal(attackAdventure(s),false,'one swing cannot repeat before cooldown');
}
{
 const s=begin('throw','recall');s.enemies=[dummy(1,15,10)];
 attackAdventure(s);tick(s,.4);const outward=1000-s.enemies[0].hp;assert.ok(outward>0);
 tick(s,.7);assert.ok(1000-s.enemies[0].hp>outward,'recall must hit on return even after outbound hit budget was exhausted');
}
{
 const s=begin('throw','pierce');s.enemies=[dummy(1,14,10),dummy(2,16,10),dummy(3,18,10),dummy(4,20,10)];
 attackAdventure(s);tick(s,.8);assert.ok(s.enemies.slice(0,3).every(e=>e.hp<1000));assert.equal(s.enemies[3].hp,1000,'piercing has a finite hit budget');
}
{
 const s=begin();assert.equal(dodgeAdventure(s,0,-1),true);assert.equal(dodgeAdventure(s,0,-1),false);tick(s,.1);assert.ok(s.player.y<10);assert.ok(s.player.inv>0);
 s.phase='choice';const time=s.time;tick(s,1,{attack:true,x:1});assert.equal(s.time,time,'selection freezes combat');
 assert.equal(chooseAdventure(s,'form','collapse'),false,'cannot choose an unearned fusion');
 s.laws=['gravity','burst'];assert.ok(adventureOffers(s).forms.some(f=>f.id==='collapse'));assert.equal(chooseAdventure(s,'form','collapse'),true);assert.equal(s.room,1);assert.equal(s.form,'collapse');
}
{
 const s=begin();s.charge=99;assert.equal(ultimateAdventure(s),false);s.charge=100;assert.equal(ultimateAdventure(s),true);assert.equal(s.charge,0);assert.equal(ultimateAdventure(s),false);
}
{
 const s=begin('throw','split');s.laws=Object.keys(LAWS);s.enemies=[dummy(1,16,10,100000)];
 tick(s,45,{attack:true,aimX:1,aimY:0});assert.ok(s.shots.length<=ADVENTURE.maxShots);assert.ok(s.effects.length<=ADVENTURE.maxEffects);assert.ok(s.fields.length<=6);assert.ok(Number.isFinite(s.player.hp));
}
{
 const s=begin();s.room=4;s.enemies=[];tick(s,.1);assert.equal(s.phase,'won');
 const t=begin();t.player.hp=1;t.player.inv=0;t.enemies=[{...dummy(1,t.player.x,t.player.y),tell:.01,tx:t.player.x,ty:t.player.y}];tick(t,.1);assert.equal(t.phase,'lost');assert.equal(t.player.hp,0);
 const fresh=begin();assert.equal(fresh.player.hp,100);assert.equal(fresh.room,0);assert.equal(fresh.kills,0);
}
console.log('Adventure: manual facing, one-swing hits, recall, finite piercing, dash, choices/fusion eligibility, ultimate, budgets, win/loss and fresh restart passed.');
