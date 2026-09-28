import assert from 'node:assert/strict';
import {createAdventure,startAdventure,stepAdventure,attackAdventure,dodgeAdventure,ultimateAdventure,adventureOffers,chooseAdventure,chooseAttackShape,cycleAdventureAttack,chooseAdventureDoor,adventureRoomInfo,ROOMS,ROOMS_PER_ACT,ADVENTURE,ADVENTURE_FORMS,ADVENTURE_ACTS,ADVENTURE_COMBO} from '../src/seed-adventure-rules.js';
import {composeAdventureAttack} from '../src/seed-adventure-attacks.js';
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
 s.laws=['gravity','burst'];s.choiceKind='form';assert.ok(adventureOffers(s).forms.some(f=>f.id==='collapse'));assert.equal(chooseAdventure(s,'form','collapse'),true);assert.equal(s.phase,'doors','reward then door choice');assert.equal(s.room,0);assert.equal(s.form,'collapse');
 assert.ok(s.doors.length>=1);assert.equal(chooseAdventureDoor(s,0),true);assert.equal(s.room,1);assert.equal(s.phase,'playing');
}
{
 const s=begin();s.charge=99;assert.equal(ultimateAdventure(s),false);s.charge=100;assert.equal(ultimateAdventure(s),true);assert.equal(s.charge,0);assert.equal(ultimateAdventure(s),false);
}
{
 const s=begin('throw','split');s.laws=Object.keys(LAWS);s.enemies=[dummy(1,16,10,100000)];
 tick(s,45,{attack:true,aimX:1,aimY:0});assert.ok(s.shots.length<=ADVENTURE.maxShots);assert.ok(s.effects.length<=ADVENTURE.maxEffects);assert.ok(s.fields.length<=6);assert.ok(Number.isFinite(s.player.hp));
}
{
 const s=begin();s.room=ROOMS.length-1;s.roomReward='boss';s.enemies=[];tick(s,.1);assert.equal(s.phase,'choice');assert.equal(s.choiceKind,'boss');assert.equal(chooseAdventure(s,'grow'),true);assert.equal(s.phase,'won');
 const t=begin();t.player.hp=1;t.player.inv=0;t.enemies=[{...dummy(1,t.player.x,t.player.y),tell:.01,tx:t.player.x,ty:t.player.y}];tick(t,.1);assert.equal(t.phase,'lost');assert.equal(t.player.hp,0);
 const fresh=begin();assert.equal(fresh.player.hp,100);assert.equal(fresh.room,0);assert.equal(fresh.kills,0);
}
{
 const s=createAdventure(7);startAdventure(s);assert.equal(s.phase,'awakening');assert.deepEqual(s.shapes,[]);assert.deepEqual(s.laws,[]);
 assert.equal(chooseAttackShape(s,'mage'),false);assert.equal(chooseAttackShape(s,'slash'),true);assert.equal(s.phase,'playing');assert.equal(cycleAdventureAttack(s),false,'unearned throw is unavailable');
 s.enemies=[];s.wave=1;s.spawn=0;tick(s,1.2);assert.equal(s.phase,'playing');assert.equal(s.wave,2,'second wave follows without a choice');
 s.enemies=[];tick(s,.1);assert.equal(s.choiceKind,'law');assert.deepEqual(adventureOffers(s).laws,['recall','split','orbit']);
 assert.equal(chooseAdventure(s,'shape','throw'),false,'shape mixing is a later growth');
 assert.equal(chooseAdventure(s,'law','recall'),true);assert.equal(s.phase,'doors');
 s.doors=[{reward:'shape',elite:false}];assert.equal(chooseAdventureDoor(s,0),true);assert.equal(s.room,1);
 s.enemies=[];s.wave=2;tick(s,.1);assert.equal(s.choiceKind,'shape');assert.equal(chooseAttackShape(s,'throw'),true);assert.equal(s.weapon,'hybrid');assert.equal(s.phase,'doors');
 chooseAdventureDoor(s,0);assert.equal(cycleAdventureAttack(s),true);assert.equal(s.weapon,'slash');
}
{
 const s=begin('slash','recall');s.enemies=[dummy(1,13,10)];attackAdventure(s);assert.equal(s.shots.length,0,'recall slash is a returning cut, not a reskinned thrown projectile');assert.equal(s.pendingCuts.length,1);const first=s.enemies[0].hp;tick(s,.4);assert.ok(s.enemies[0].hp<first,'returning slash deals its second hit');
 const slash=composeAdventureAttack({weapon:'slash',laws:['split','recall']});assert.equal(slash.cuts.length,3);assert.equal(slash.returnCuts.length,3);assert.equal(slash.shots.length,0);
 const ranged=composeAdventureAttack({weapon:'throw',laws:['split','recall']});assert.equal(ranged.cuts.length,0);assert.equal(ranged.shots.length,3);assert.ok(ranged.shots.every(b=>b.recall));
 const mixed=composeAdventureAttack({weapon:'hybrid',laws:[]});assert.equal(mixed.cuts.length,1);assert.equal(mixed.shots.length,1);assert.ok(mixed.cooldown>slash.cooldown,'mixed attack has a commitment cost');
}
{
 const s=begin('slash','split');s.enemies=[dummy(1,13,10)];attackAdventure(s);assert.equal(s.enemies[0].hp,970,'overlapping split cuts hit an enemy once per swing');
 const o=begin('slash','orbit');o.enemies=[dummy(1,13,10)];tick(o,.8);assert.equal(o.enemies[0].hp,1000,'orbit offense requires a manual attack');attackAdventure(o);tick(o,.2);assert.ok(o.enemies[0].hp<970);
}
// ① 3단 콤보·타격감
{
 const s=begin();s.enemies=[dummy(1,13.2,10,100000)];const hp=()=>100000-s.enemies[0].hp;const dmg=[];
 for(let i=0;i<3;i++){s.player.attack=0;const before=hp();assert.equal(attackAdventure(s),true);dmg.push(hp()-before);}
 assert.equal(dmg[0],30);assert.ok(dmg[1]>dmg[0]&&dmg[2]>dmg[1]*1.4,'finisher hits hardest: '+dmg);
 assert.equal(s.player.combo,0,'finisher restarts the chain');assert.ok(s.hitstop>=ADVENTURE_COMBO[2].stop-1e-9,'finisher freezes briefly');
 assert.ok(Math.hypot(s.enemies[0].kx,s.enemies[0].ky)>5,'finisher knocks back');
 const t=s.time;stepAdventure(s,.05);assert.equal(s.time,t,'hit-stop freezes the world');
 // 콤보는 틈이 길면 처음부터.
 const c=begin();c.enemies=[dummy(1,13.2,10,100000)];attackAdventure(c);assert.equal(c.player.combo,1);tick(c,1.2);assert.equal(c.player.combo,0);
 // 누르고 있으면 버퍼로 이어져 세 번째가 막타.
 const h=begin();h.enemies=[dummy(1,13.2,10,100000)];const swings=[];for(let i=0;i<120;i++){stepAdventure(h,1/60,{attack:true,aimX:1,aimY:0});if(h.player.swing>=0&&swings.at(-1)!==h.player.swing)swings.push(h.player.swing);}
 assert.deepEqual(swings.slice(0,4),[0,1,2,0],'held attack chains 1-2-3');
 // 회피 직후 공격은 막타 세기의 회피 베기.
 const d=begin();d.enemies=[dummy(1,13.2,10,100000)];dodgeAdventure(d,0,1);attackAdventure(d);assert.equal(d.player.swing,2);assert.ok(d.events.includes('dashStrike'));
 // 막타는 일반 적의 공격 예고를 끊는다(보스는 아님).
 const k=begin();k.enemies=[{...dummy(1,13.2,10,100000),tell:.5,tx:12,ty:10}];k.player.combo=2;attackAdventure(k);assert.equal(k.enemies[0].tell,0);
}
// ② 방·문·보상, ③ 막마다 다른 수호자
{
 assert.equal(ROOMS.length,ADVENTURE_ACTS.length*ROOMS_PER_ACT);
 for(let a=0;a<3;a++){const info=adventureRoomInfo(a*4+3);assert.equal(info.boss,true);assert.equal(info.actInfo.id,ADVENTURE_ACTS[a].id);}
 const s=begin();s.room=2;s.enemies=[];s.wave=2;tick(s,.1);chooseAdventure(s,'grow');assert.equal(s.phase,'doors');assert.deepEqual(s.doors,[{reward:'boss',elite:false}],'only the boss door before a boss');
 chooseAdventureDoor(s,0);const boss=s.enemies.find(e=>e.type==='boss');assert.equal(boss.bossId,'austin');
 for(const [room,id] of [[7,'alwaysbeginner'],[11,'tempestcarrier']]){const b=begin();b.room=room-1;b.phase='doors';b.doors=[{reward:'boss',elite:false}];chooseAdventureDoor(b,0);assert.equal(b.enemies[0].bossId,id);assert.equal(b.enemies[0].act,Math.floor(room/4));}
 // 모든 보스 공격이 실제로 나간다(체력은 건드리지 않음).
 for(const room of [3,7,11]){const b=begin();b.room=room-1;b.phase='doors';b.doors=[{reward:'boss',elite:false}];chooseAdventureDoor(b,0);b.player.inv=1e9;const e=b.enemies[0];const seen=new Set();for(let i=0;i<60*30;i++){if(e.tellKind)seen.add(e.tellKind);stepAdventure(b,1/60,{});if(b.phase!=='playing')break;}assert.ok(seen.size>=3,e.bossId+' uses several patterns: '+[...seen]);}
 // 정예 문을 고르면 적이 세고, 깨면 성장 한 번이 덤.
 const e=begin();e.phase='doors';e.doors=[{reward:'law',elite:true}];chooseAdventureDoor(e,0);const strong=e.enemies[0].maxHp;const n=begin();n.phase='doors';n.doors=[{reward:'law',elite:false}];chooseAdventureDoor(n,0);assert.ok(strong>n.enemies[0].maxHp);
 e.enemies=[];e.wave=2;tick(e,.1);const lv=e.level;chooseAdventure(e,'law',adventureOffers(e).laws[0]);assert.equal(e.level,lv+1);
 // 두 번째 막 적은 그 막 그림.
 const m=begin();m.phase='doors';m.room=3;m.doors=[{reward:'law',elite:false}];chooseAdventureDoor(m,0);assert.ok(m.enemies.every(x=>['batter','pitcher','catcher','runner'].includes(x.art)));
}
console.log('Adventure: manual facing, one-swing hits, recall, finite piercing, dash, choices/fusion eligibility, ultimate, budgets, win/loss and fresh restart passed.');
