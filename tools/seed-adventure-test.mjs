import assert from 'node:assert/strict';
import {createAdventure,startAdventure,stepAdventure,attackAdventure,dodgeAdventure,ultimateAdventure,adventureOffers,chooseAdventure,chooseAttackShape,cycleAdventureAttack,chooseAdventureDoor,adventureRoomInfo,adventureEvolutions,buyAdventure,leaveAdventureShop,usePotionAdventure,ROOMS,ROOMS_PER_ACT,ADVENTURE,ADVENTURE_ARENA,REGION,ADVENTURE_FORMS,ADVENTURE_ACTS,ADVENTURE_COMBO} from '../src/seed-adventure-rules.js';
import {composeAdventureAttack} from '../src/seed-adventure-attacks.js';
import {createAdventureCombat} from '../src/seed-adventure-combat.js';
import {LAWS} from '../src/laws.js';
import {DEFENSE_CATALOG_COUNTS} from '../src/seed-defense-catalog.js';

// 규칙 단위 시험은 한 화면짜리 작은 방에서(넓은 지역은 아래 따로 시험).
const small=s=>{s.region=null;s.arena={...ADVENTURE_ARENA};s.enemies=[];s.props.length=0;s.player.x=12;s.player.y=10;return s;};
const begin=(weapon='slash',law='recall')=>{const s=createAdventure(42);startAdventure(s,weapon,law);small(s);s.wave=0;s.spawn=0;s.player.attack=0;s.player.inv=1000;return s;};
const dummy=(id,x,y,hp=1000)=>({id,type:'hound',x,y,hp,maxHp:hp,r:.42,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0});
const tick=(s,seconds,input={},combat=null)=>{for(let t=0;t<seconds;t+=1/60)stepAdventure(s,1/60,input,combat);};
const clearRoom=s=>{s.enemies=[];if(s.region){s.player.x=s.region.gate.x;s.player.y=s.region.gate.y;tick(s,.1);}else{s.wave=2;tick(s,1.3);}};

assert.equal(Object.keys(LAWS).length,9);
assert.equal(Object.keys(ADVENTURE_FORMS).length+9,DEFENSE_CATALOG_COUNTS.total,'모험도 162가지(기본 9 + 형태 153)');
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
}
{
 const s=begin();s.charge=99;assert.equal(ultimateAdventure(s),false);s.charge=100;assert.equal(ultimateAdventure(s),true);assert.equal(s.charge,0);assert.equal(ultimateAdventure(s),false);
}
{
 const s=begin('throw','split');s.laws=['split','chain'];s.ranks={split:3,chain:3};s.enemies=[dummy(1,16,10,100000)];
 tick(s,45,{attack:true,aimX:1,aimY:0});assert.ok(s.shots.length<=ADVENTURE.maxShots);assert.ok(s.effects.length<=ADVENTURE.maxEffects);assert.ok(s.fields.length<=6);assert.ok(Number.isFinite(s.player.hp));
}
{
 const s=begin();s.room=ROOMS.length-1;s.roomType='boss';s.roomReward='boss';s.enemies=[];tick(s,1.3);assert.equal(s.phase,'choice');assert.equal(s.choiceKind,'boss');assert.equal(chooseAdventure(s,'grow'),true);assert.equal(s.phase,'won');
 const t=begin();t.player.hp=1;t.player.inv=0;t.enemies=[{...dummy(1,t.player.x,t.player.y),tell:.01,tx:t.player.x,ty:t.player.y}];tick(t,.1);assert.equal(t.phase,'lost');assert.equal(t.player.hp,0);
 const fresh=begin();assert.equal(fresh.player.hp,100);assert.equal(fresh.room,0);assert.equal(fresh.kills,0);
}
{
 const s=createAdventure(7);startAdventure(s);assert.equal(s.phase,'awakening');assert.deepEqual(s.shapes,[]);assert.deepEqual(s.laws,[]);
 assert.equal(chooseAttackShape(s,'mage'),false);assert.equal(chooseAttackShape(s,'slash'),true);assert.equal(s.phase,'playing');assert.equal(cycleAdventureAttack(s),false,'unearned throw is unavailable');
 assert.ok(s.region,'first room is a wide region');assert.equal(s.region.gate.open,false,'exit starts closed');tick(s,.2);assert.equal(s.phase,'playing','no reward before reaching the exit');
 clearRoom(s);assert.equal(s.choiceKind,'law');assert.deepEqual(adventureOffers(s).laws,['recall','split','orbit']);
 assert.equal(chooseAdventure(s,'shape','throw'),false,'shape mixing is a later growth');
 assert.equal(chooseAdventure(s,'law','recall'),true);assert.equal(s.phase,'doors');
 s.doors=[{room:'combat',reward:'shape'}];assert.equal(chooseAdventureDoor(s,0),true);assert.equal(s.room,1);
 clearRoom(s);assert.equal(s.choiceKind,'shape');assert.equal(chooseAttackShape(s,'throw'),true);assert.equal(s.weapon,'hybrid');assert.equal(s.phase,'doors');
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
 const c=begin();c.enemies=[dummy(1,13.2,10,100000)];attackAdventure(c);assert.equal(c.player.combo,1);tick(c,1.2);assert.equal(c.player.combo,0);
 const h=begin();h.enemies=[dummy(1,13.2,10,100000)];const swings=[];for(let i=0;i<120;i++){stepAdventure(h,1/60,{attack:true,aimX:1,aimY:0});if(h.player.swing>=0&&swings.at(-1)!==h.player.swing)swings.push(h.player.swing);}
 assert.deepEqual(swings.slice(0,4),[0,1,2,0],'held attack chains 1-2-3');
 const d=begin();d.enemies=[dummy(1,13.2,10,100000)];dodgeAdventure(d,0,1);attackAdventure(d);assert.equal(d.player.swing,2);assert.ok(d.events.includes('dashStrike'));
 const k=begin();k.enemies=[{...dummy(1,13.2,10,100000),tell:.5,tx:12,ty:10}];k.player.combo=2;attackAdventure(k);assert.equal(k.enemies[0].tell,0);
}
// 162 조합: 법칙 둘·단계 셋으로 단독·융합·완성·쌍둥이
{
 const s=begin('slash','burst');s.phase='choice';s.choiceKind='law';s.offerLaws=['frost'];
 assert.ok(adventureOffers(s).upgrades.includes('burst'),'held law can be ranked up');
 assert.equal(chooseAdventure(s,'upgrade','burst'),true);assert.equal(s.ranks.burst,2);
 s.phase='choice';s.choiceKind='law';chooseAdventure(s,'upgrade','burst');assert.equal(s.ranks.burst,3);
 s.phase='choice';s.choiceKind='grow';const solo=adventureEvolutions(s);assert.equal(solo.length,1);assert.equal(solo[0].kind,'solo');
 s.phase='choice';s.choiceKind='law';s.offerLaws=['frost'];chooseAdventure(s,'law','frost');assert.ok(s.formId&&ADVENTURE_FORMS[s.formId].kind==='fusion','two laws fuse');
 s.phase='choice';s.choiceKind='grow';const finals=adventureEvolutions(s);assert.ok(finals.some(f=>f.kind==='final'),'fusion + a rank-3 law offers a final evolution');
 assert.equal(chooseAdventure(s,'evolve',finals[0].id),true);assert.equal(ADVENTURE_FORMS[s.formId].kind,'final');
 const tw=begin('slash','pierce');tw.laws=['pierce','orbit'];tw.ranks={pierce:3,orbit:3};tw.formId=null;tw.phase='choice';tw.choiceKind='grow';assert.ok(adventureEvolutions(tw).some(f=>f.kind==='twin'),'both at rank 3 offers a twin');
 assert.equal(adventureOffers({...s,phase:'choice',choiceKind:'law',offerLaws:[]}).laws.length,0,'no third law');
}
// 본편 조합 엔진이 모험 적을 실제로 때린다(단독·융합·완성·쌍둥이 한 가지씩).
{
 const kinds=['solo','fusion','final','twin'];
 for(const kind of kinds){
  const f=Object.values(ADVENTURE_FORMS).find(f=>f.kind===kind&&!f.passive)||Object.values(ADVENTURE_FORMS).find(f=>f.kind===kind);
  const s=begin('slash',f.requires[0]);s.laws=[...f.requires];s.ranks=Object.fromEntries(f.requires.map(l=>[l,3]));s.formId=f.id;s.enemies=[dummy(1,14,10,100000),dummy(2,15.5,10.6,100000)];
  const combat=createAdventureCombat(s);try{tick(s,4,{aimX:1,aimY:0},combat);}finally{combat.dispose();}
  assert.ok(s.enemies.some(e=>e.hp<100000),`${kind} ${f.id} deals damage through the authored engine`);
 }
}
// ② 방·문·보상, ③ 막마다 다른 수호자
{
 assert.equal(ROOMS.length,ADVENTURE_ACTS.length*ROOMS_PER_ACT);assert.equal(ROOMS.length,12);
 for(let a=0;a<3;a++){const info=adventureRoomInfo(a*ROOMS_PER_ACT+ROOMS_PER_ACT-1);assert.equal(info.boss,true);assert.equal(info.actInfo.id,ADVENTURE_ACTS[a].id);}
 const s=begin();s.room=ROOMS_PER_ACT-2;clearRoom(s);chooseAdventure(s,'grow');assert.equal(s.phase,'doors');assert.deepEqual(s.doors,[{room:'boss',reward:'boss'}],'only the boss door before a boss');
 chooseAdventureDoor(s,0);const boss=s.enemies.find(e=>e.type==='boss');assert.equal(boss.bossId,'austin');
 for(const [room,id] of [[7,'alwaysbeginner'],[11,'tempestcarrier']]){const b=begin();b.room=room-1;b.phase='doors';b.doors=[{room:'boss',reward:'boss'}];chooseAdventureDoor(b,0);assert.equal(b.enemies[0].bossId,id);assert.equal(b.enemies[0].act,Math.floor(room/ROOMS_PER_ACT));}
 for(const room of [3,7,11]){const b=begin();b.room=room-1;b.phase='doors';b.doors=[{room:'boss',reward:'boss'}];chooseAdventureDoor(b,0);b.player.inv=1e9;const e=b.enemies[0];const seen=new Set();for(let i=0;i<60*30;i++){if(e.tellKind)seen.add(e.tellKind);stepAdventure(b,1/60,{});if(b.phase!=='playing')break;}assert.ok(seen.size>=3,e.bossId+' uses several patterns: '+[...seen]);}
 const e=begin();e.phase='doors';e.doors=[{room:'elite',reward:'law'}];chooseAdventureDoor(e,0);const strong=e.enemies[0].maxHp;const n=begin();n.phase='doors';n.doors=[{room:'combat',reward:'law'}];chooseAdventureDoor(n,0);assert.ok(strong>n.enemies[0].maxHp);
 clearRoom(e);const lv=e.level;chooseAdventure(e,'law',adventureOffers(e).laws[0]);assert.equal(e.level,lv+1,'elite bonus growth');
 const m=begin();m.phase='doors';m.room=ROOMS_PER_ACT-1;m.doors=[{room:'combat',reward:'law'}];chooseAdventureDoor(m,0);assert.ok(m.enemies.every(x=>['batter','pitcher','catcher','runner'].includes(x.art)));
 // 문 목록은 여러 판에서 보물·상점·샘물·정예가 모두 나온다.
 const seenRooms=new Set();for(let seed=1;seed<80;seed++){const r=createAdventure(seed);startAdventure(r,'slash','burst');for(let room=0;room<4;room++){r.room=room;r.player.hp=r.player.maxHp*(seed%2?.5:1);r.phase='choice';r.choiceKind='grow';chooseAdventure(r,'grow');r.doors.forEach(d=>seenRooms.add(d.room));r.room=room;}}
 for(const room of ['combat','elite','treasure','shop','fountain'])assert.ok(seenRooms.has(room),'door kind '+room);
}
// 부서지는 물건·보물 상자·물약·버프·상점·샘물
{
 const s=begin();s.props=[{id:900,kind:'pot',x:13.2,y:10,hp:1,maxHp:1,flash:0}];s.enemies=[dummy(1,20,14,100000)];attackAdventure(s);assert.equal(s.props.length,1,'pot marked');tick(s,.05);assert.equal(s.props.length,0,'a slash breaks a pot');
 const c=begin();c.coins=0;c.pickups=[];c.props=[{id:901,kind:'crate',x:13.2,y:10,hp:2,maxHp:2,flash:0}];c.enemies=[dummy(1,20,14,100000)];for(let i=0;i<2;i++){c.player.attack=0;attackAdventure(c);tick(c,.05);}assert.equal(c.props.length,0,'a crate takes two hits');tick(c,2);assert.ok(c.coins>0,'coins fly to the seed');
 const t=begin();t.phase='doors';t.doors=[{room:'treasure',reward:'law'}];chooseAdventureDoor(t,0);assert.equal(t.enemies.length,0);const chest=t.props.find(p=>p.kind==='chest');assert.ok(chest);
 t.player.y=chest.y+1.6;t.player.x=chest.x;t.player.aimX=0;t.player.aimY=-1;const potions=t.potions;for(let i=0;i<3;i++){t.player.attack=0;attackAdventure(t);tick(t,.05);}assert.ok(!t.props.some(p=>p.kind==='chest'),'chest opens');tick(t,3);assert.equal(t.phase,'choice','treasure room ends with a reward');assert.ok(t.potions>potions,'chest gives a potion');
 const p=begin();p.player.hp=40;p.potions=1;p.player.inv=0;assert.equal(usePotionAdventure(p),true);assert.equal(p.player.hp,75);assert.equal(usePotionAdventure(p),false);
 const b=begin();b.buffs.guard=1;b.player.inv=0;b.enemies=[{...dummy(1,b.player.x,b.player.y),tell:.01,tx:b.player.x,ty:b.player.y}];tick(b,.05);assert.equal(b.player.hp,100,'guard blocks one hit');assert.equal(b.buffs.guard,0);
 const w=begin();w.buffs.power=10;w.enemies=[dummy(1,13.2,10)];attackAdventure(w);assert.equal(w.enemies[0].hp,1000-39,'power buff +30%');
 const shop=begin();shop.coins=200;shop.phase='doors';shop.doors=[{room:'shop',reward:null}];chooseAdventureDoor(shop,0);assert.equal(shop.phase,'shop');assert.equal(shop.shop.length,4);
 const before=shop.coins;const idx=shop.shop.findIndex(w=>w.id!=='upgrade');assert.equal(buyAdventure(shop,idx),true);assert.ok(shop.coins<before);assert.equal(buyAdventure(shop,idx),false,'sold once');
 assert.equal(leaveAdventureShop(shop),true);assert.equal(shop.phase,'doors');
 const f=begin();f.player.hp=30;f.phase='doors';f.doors=[{room:'fountain',reward:null}];chooseAdventureDoor(f,0);assert.equal(f.phase,'fountain');assert.equal(chooseAdventure(f,'heal'),true);assert.ok(f.player.hp>60);assert.equal(f.phase,'doors');
}
// 넓은 지역(B안): 자는 무리·출구 수호 무리·장애물·습격지·수호 제단
{
 const fresh=()=>{const s=createAdventure(11);startAdventure(s,'slash','burst');s.player.inv=1e9;return s;};
 const s=fresh(),R=s.region;assert.ok(R);assert.equal(s.arena.maxX,REGION.w-1.4);
 assert.ok(R.obstacles.length>=12,'obstacles');assert.ok(s.enemies.length>=20,'several packs');assert.ok(s.enemies.every(e=>e.dormant),'packs sleep until approached');
 assert.ok(s.enemies.some(e=>e.guard),'exit guard pack');assert.ok(s.props.some(o=>o.kind==='cache'),'small chests');assert.deepEqual(R.events.map(e=>e.type).sort(),['guard','raid']);
 assert.deepEqual(JSON.stringify(fresh().region.obstacles),JSON.stringify(R.obstacles),'same seed, same region');
 // 멀리 있는 무리는 움직이지 않고, 가까이 가면 무리 전체가 깨어난다.
 const e=s.enemies.find(e=>!e.guard),before={x:e.x,y:e.y};tick(s,1);assert.deepEqual({x:e.x,y:e.y},before);
 s.player.x=e.x-4;s.player.y=e.y;tick(s,.05);assert.ok(s.enemies.filter(n=>n.pack===e.pack).every(n=>!n.dormant),'whole pack wakes');
 // 장애물은 씨앗과 탄을 막는다.
 const o=R.obstacles[0];s.player.x=o.x;s.player.y=o.y+.01;tick(s,.02);assert.ok(Math.hypot(s.player.x-o.x,s.player.y-o.y)>=o.r+.39,'seed pushed out of rocks');
 // 출구: 수호 무리를 모두 물리치면 열리고, 닿으면 보상.
 const g=fresh();g.player.x=g.region.gate.x;g.player.y=g.region.gate.y;tick(g,.1);assert.equal(g.phase,'playing','closed exit');
 for(const n of g.enemies)if(n.guard)n.hp=0;tick(g,.05);assert.equal(g.region.gate.open,true);g.player.x=g.region.gate.x;g.player.y=g.region.gate.y;tick(g,.05);assert.equal(g.phase,'choice');
 // 습격지: 원 안에서 버티면 보물 상자.
 const r=fresh(),raid=r.region.events.find(e=>e.type==='raid');for(const n of r.enemies)n.hp=0;r.enemies=[];r.player.x=raid.x;r.player.y=raid.y;
 const caches=r.props.filter(o=>o.kind==='cache').length;for(let t=0;t<raid.duration+3&&raid.state!=='done';t+=.05){r.player.x=raid.x;r.player.y=raid.y;stepAdventure(r,.05,{});}
 assert.equal(raid.state,'done');assert.ok(r.props.filter(o=>o.kind==='cache').length>caches,'raid reward chest');
 // 수호 제단: 줄지어 온 적이 제단에 닿으면 깎인다. 막으면 보물 상자.
 const d=fresh(),guard=d.region.events.find(e=>e.type==='guard');for(const n of d.enemies)n.hp=0;d.enemies=[];d.player.x=guard.x+3;d.player.y=guard.y;
 for(let t=0;t<16;t+=.05)stepAdventure(d,.05,{});assert.ok(['active','failed'].includes(guard.state));assert.ok(d.enemies.some(e=>e.march),'marchers walk to the altar');assert.ok(guard.hp<guard.maxHp,'unguarded altar takes damage');
 const k=fresh(),kg=k.region.events.find(e=>e.type==='guard');for(const n of k.enemies)n.hp=0;k.enemies=[];k.player.x=kg.x+3;k.player.y=kg.y;
 for(let t=0;t<60&&kg.state==='active'||t<1;t+=.05){for(const e of k.enemies)if(e.march&&Math.hypot(e.x-kg.portal.x,e.y-kg.portal.y)>1.5)e.hp=0;stepAdventure(k,.05,{});}
 assert.equal(kg.state,'done');assert.equal(kg.hp,kg.maxHp);assert.ok(k.props.some(o=>o.kind==='cache'&&o.big),'defended altar gives a big chest');
}
console.log('Adventure: combo & hit-stop, 162 forms through the authored engine, 12 rooms (wide regions with sleeping packs, exit guards, obstacles, raid and altar events), treasure/shop/fountain/elite, breakables, pickups, potions, buffs, bosses and win/loss passed.');
