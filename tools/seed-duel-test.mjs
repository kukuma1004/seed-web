import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS,DUEL_ORDER,DUEL_RULES,availableDuelCharacters} from '../src/seed-duel-rules.js';
import './duel-blastlance-test.mjs';
import './duel-frostnet-test.mjs';
import './duel-fusion-02-test.mjs';
import './duel-fusion-02-art-test.mjs';

const idle={};
const fight=(p='pierce',e='burst')=>{const s=createDuel({player:p,enemy:e,seed:7});s.phase='fight';const [a,b]=s.fighters;a.x=10;a.y=8;b.x=11.6;b.y=8;a.fx=1;b.fx=-1;return s;};
const run=(s,sec,pin={},ein={})=>{for(let t=0;t<sec;t+=1/60)stepDuel(s,1/60,typeof pin==='function'?pin(t):pin,typeof ein==='function'?ein(t):ein);};
// Orbit is an active visible danger too: react after the normal delay and exit
// the ring instead of standing inside it until the entire health bar is gone.
{const s=fight('orbit','shard'),[a,b]=s.fighters;s.hazards.push({kind:'ring',owner:0,x:a.x,y:a.y,r:2.8,t:3.5});let intent;
 for(let i=0;i<14;i++)intent=duelAi(s,1,1/60);
 assert.ok(intent.x>0,'AI moves away from the orbit owner after reacting');assert.equal(intent.dodge,true,'AI can dodge out of the active ring');}
{const s=fight('orbit','shard');s.hazards.push({kind:'ring',owner:0,x:10,y:8,r:2.8,t:3.5,tick:.4});duelAi(s,1,1/60);assert.equal(s.ai[1].areaSeen,0,'ring recovery does not force continuous retreat');}
// 공격은 맞는다.
{const s=fight();const b=s.fighters[1],hp=b.hp;run(s,.01,{attack:true},idle);run(s,.4,idle,idle);assert.ok(b.hp<hp,'light attack lands');}
// 정면 막기: 조금만 깎이고 막기 게이지가 준다.
{const s=fight();const b=s.fighters[1];run(s,.3,idle,{block:true});const hp=b.hp,guard=b.guard;run(s,.01,{attack:true},{block:true});run(s,.4,idle,{block:true});assert.ok(hp-b.hp<3&&hp-b.hp>0,'blocked hit only chips');assert.ok(b.guard<guard);}
// 반격 막기: 막기를 누른 직후 맞으면 공격한 쪽이 흔들린다.
{const s=fight();const [a,b]=s.fighters;run(s,.01,{attack:true},idle);run(s,.05,idle,{block:true});run(s,.2,idle,{block:true});assert.equal(a.state,'stagger','parry staggers the attacker');assert.equal(b.hp,b.maxHp);}
// 강공격은 막기를 부순다(몇 번이면 무방비).
{const s=fight('burst','pierce');const b=s.fighters[1];run(s,.3,idle,{block:true});for(let i=0;i<3&&b.state!=='broken';i++){run(s,.01,{heavy:true},{block:true});run(s,.7,idle,{block:true});}assert.equal(b.state,'broken','heavy breaks guard');}
// 중력 끌어당기기는 막기를 무시한다.
{const s=fight('gravity','pierce');const b=s.fighters[1];b.x=14;run(s,.3,idle,{block:true});const hp=b.hp;run(s,.01,{skill1:true},{block:true});assert.ok(b.hp<=hp-8,'grab ignores block');}
// 거울 방패는 탄을 되돌린다.
{const s=fight('reflect','pierce');const [a,b]=s.fighters;b.x=16;run(s,.01,{skill1:true},{skill2:true});run(s,1.1,idle,idle);assert.ok(b.hp<b.maxHp,'reflected lance hits the thrower');assert.equal(a.hp,a.maxHp);}
// 회피는 잠깐 무적.
{const s=fight();const [a,b]=s.fighters;run(s,.01,{attack:true},{dodge:true,x:0,y:1});run(s,.3,idle,idle);assert.equal(b.hp,b.maxHp,'dodge avoids');}
// 연타는 1→2→3타로 이어지고, 공격 뒤 강공격은 준비가 짧은 연계 강공격이 된다(누른 입력은 잠깐 기억).
{const s=fight();const [a,b]=s.fighters;b.hp=b.maxHp=999;run(s,.01,{attack:true},idle);run(s,.12,idle,idle);run(s,.01,{attack:true},idle);let steps=new Set();for(let i=0;i<40;i++){run(s,.01,i%12===0?{attack:true}:idle,idle);if(a.state==='attack')steps.add(a.step);}assert.ok(steps.has(1)&&steps.has(2),'combo reaches the third hit');
 const t=fight();const [c,d]=t.fighters;d.hp=d.maxHp=999;run(t,.01,{attack:true},idle);run(t,.08,idle,idle);run(t,.01,{heavy:true},idle);for(let i=0;i<30&&c.state!=='heavy';i++)run(t,.01,idle,idle);assert.equal(c.state,'heavy');assert.equal(c.linked,true,'attack then heavy links');assert.ok(c.total<.4,'linked heavy starts faster');
 const u=fight();const [e]=u.fighters;run(u,.01,{heavy:true},idle);assert.equal(e.linked,false,'a plain heavy is not linked');}
// 회피·돌진이 끝나면 멈춘다(예전에는 상태가 남아 계속 미끄러졌다).
{const s=fight();const [a]=s.fighters;a.x=16;a.y=10;run(s,.01,{dodge:true,x:0,y:1},idle);run(s,.4,idle,idle);const y=a.y;run(s,.6,idle,idle);assert.ok(Math.abs(a.y-y)<.05,'dodge stops');assert.notEqual(a.state,'dodge');
 const t=fight('pierce','burst');const [p,q]=t.fighters;p.x=8;p.y=5;q.x=20;q.y=16;run(t,.01,{skill1:true},idle);run(t,.5,idle,idle);const px=p.x;run(t,.5,idle,idle);assert.ok(Math.abs(p.x-px)<.05,'dash stops');}
// 새 캐릭터 기술: 분열 꽃잎·연쇄 번개(기절)·귀환 칼날(갔다 돌아오며 두 번)·공전 고리(계속)·빙결 숨결(느려짐).
{const one=(p,e='burst',far=1.6)=>{const s=fight(p,e);s.fighters[1].x=s.fighters[0].x+far;s.fighters[1].hp=s.fighters[1].maxHp=999;return s;};
 {const s=one('split');run(s,.01,{skill1:true},idle);run(s,.6,idle,idle);assert.ok(s.fighters[1].hp<999,'petals hit');}
 {const s=one('chain','burst',4);run(s,.01,{skill1:true},idle);assert.ok(s.fighters[1].hp<999&&s.fighters[1].stun>.3,'lightning stuns at range');}
 {const s=one('recall','burst',3);const e=s.fighters[1];let hits=0,last=999;for(let i=0;i<120;i++){run(s,.01,i===0?{skill1:true}:idle,idle);if(e.hp<last){hits++;last=e.hp;}}assert.ok(hits>=2,'returning blade hits twice');assert.equal(s.shots.length,0,'blade is caught');}
 {const s=one('orbit','burst',1.2);run(s,.01,{skill1:true},idle);run(s,1.5,idle,idle);assert.ok(999-s.fighters[1].hp>=9,'ring keeps hitting');}
 {const s=one('frost','burst',2.5);run(s,.01,{skill1:true},idle);assert.ok(s.fighters[1].slow>1,'breath slows');}
 for(const c of ['split','chain','recall','orbit','frost']){const s=one(c,'burst',2.5);s.fighters[0].meter=100;const before=s.fighters[1].hp;run(s,.01,{ult:true},idle);run(s,3,idle,idle);assert.ok(s.fighters[1].hp<before,`${c} ultimate hits`);}}
// Six added fighters: deterministic contact, counterplay and resource expiry.
{
const fixture=(p,e='pierce',gap=2.4)=>{const s=createDuel({player:p,enemy:e,seed:9});s.phase='fight';const [a,b]=s.fighters;a.x=15;a.y=10;b.x=15+gap;b.y=10;a.fx=1;b.fx=-1;b.hp=b.maxHp=999;return s;};
const run=(s,sec,p={},e={})=>{for(let t=0;t<sec;t+=1/60)stepDuel(s,1/60,p,e);};
// Traps have a visible arming window, one hit, finite slow and lifetime; block and dash remain real counterplay.
{const s=fixture('thorn');const b=s.fighters[1];run(s,.02,{skill1:true});assert.equal(b.hp,999);assert.ok(s.hazards[0].arm>0);run(s,.25);assert.equal(b.hp,999);run(s,.45);assert.ok(b.hp<999);assert.ok(b.slow>0);const hp=b.hp;run(s,1);assert.equal(b.hp,hp,'a triggered bramble never hits twice');run(s,4);assert.equal(s.hazards.length,0);}
{const s=fixture('thorn');run(s,.3,{}, {block:true});run(s,.02,{skill1:true},{block:true});run(s,.8,{}, {block:true});assert.ok(999-s.fighters[1].hp<=3,'bramble is blockable');}
{const s=fixture('thorn');run(s,.02,{skill1:true});run(s,.3);run(s,.8,{}, {dodge:true,x:0,y:1});assert.equal(s.fighters[1].hp,999,'leave a trap before it arms');}
// Side-step is mobile, but it does not silently grant a dodge or shield.
{const s=fixture('gale','pierce',5);const a=s.fighters[0];run(s,.02,{skill1:true});assert.equal(a.inv,0);assert.equal(a.state,'dash');const y=a.y;run(s,.5);assert.ok(a.y>y+1.3);const stop=a.y;run(s,.6);assert.ok(Math.abs(a.y-stop)<.1);assert.notEqual(a.state,'dash');}
// A frontal shield has exactly two contacts, then damage. Back and grabs bypass it, and two shields cannot recurse.
{const s=fixture('bastion','chain',2);const a=s.fighters[0],b=s.fighters[1];run(s,.02,{skill1:true});for(let i=0;i<3;i++){b.cd[0]=0;b.state='idle';b.stun=0;b.t=0;s.freeze=0;run(s,.02,{}, {skill1:true});}assert.equal(a.shieldHits,0);assert.ok(a.hp<a.maxHp);}
{const s=fixture('bastion','gravity',3);run(s,.02,{skill1:true});run(s,.02,{}, {skill1:true});assert.ok(s.fighters[0].hp<s.fighters[0].maxHp,'grab bypasses bastion shield');run(s,1.2);assert.equal(s.fighters[0].counterShield,0);}
{const s=fixture('reflect','reflect',1.5);s.fighters.forEach(f=>f.shield=1);run(s,.02,{attack:true});run(s,.2);assert.ok(s.events.length<=24,'both shielded melee does not recurse');}
// Comet damage follows a locked telegraph. Interrupt before launch and no hidden delayed charge appears.
{const s=fixture('comet','pierce',3.4);const b=s.fighters[1];run(s,.02,{skill1:true});assert.equal(b.hp,999);assert.equal(s.hazards[0].kind,'rushTell');run(s,.23);assert.equal(b.hp,999);run(s,.65);assert.ok(b.hp<999);assert.ok(s.fighters[0].dashHits<=2);run(s,.6);assert.notEqual(s.fighters[0].state,'dash');}
{const s=fixture('comet','chain',3);run(s,.02,{skill1:true});run(s,.02,{}, {skill1:true});run(s,.8);assert.equal(s.fighters[0].dashHits,undefined,'interrupted charge does not launch');assert.equal(s.hazards.length,0);}
// A remote cold flower must finish arming, can then detonate, and its zone is avoidable.
{const s=fixture('lotus');run(s,.02,{skill1:true});assert.equal(s.fighters[1].slow,0);run(s,.55);assert.ok(s.fighters[1].slow>0);assert.equal(s.fighters[1].hp,999);run(s,.02,{skill2:true});run(s,.1);assert.ok(s.fighters[1].hp<999);assert.equal(s.hazards.length,0);}
{const s=fixture('lotus');run(s,.02,{skill1:true});run(s,3,{}, {x:0,y:1});assert.equal(s.fighters[1].hp,999,'leave cold zone before burst');}
// Offset volleys visibly differ, but hit counts and bounces are finite.
{const s=fixture('prism','pierce',6);run(s,.02,{skill1:true});assert.equal(s.shots.length,2);assert.notEqual(s.shots[0].y,s.shots[1].y);assert.ok(s.shots[0].dy*s.shots[1].dy<0);run(s,2);assert.equal(s.shots.length,0);}
// Every new ultimate is a distinct, bounded action and all runtime resources expire after combat goes idle.
for(const id of DUEL_ORDER.slice(9)){const s=fixture(id);s.fighters[0].meter=100;run(s,.02,{ult:true});assert.equal(s.fighters[0].meter<100,true);assert.ok(s.effects.length>0);assert.ok(s.shots.length<=5);assert.ok(s.hazards.length<=3);run(s,6);assert.equal(s.shots.length,0,id+' shots expire');assert.equal(s.hazards.length,0,id+' zones expire');assert.equal(s.fighters[0].counterShield,0);}
// Even deliberately reset cooldowns cannot flood the runtime with new persistent fields or fork shots.
for(const id of ['thorn','lotus','prism']){const s=fixture(id,'pierce',12);s.fighters[1].inv=99;for(let i=0;i<300;i++){const f=s.fighters[0];f.state='idle';f.t=0;f.cd[0]=0;s.freeze=0;stepDuel(s,.001,{skill1:true},{});assert.ok(s.hazards.length<=3);assert.ok(s.shots.length<=64);assert.ok(s.effects.length<=120);}run(s,6);assert.equal(s.hazards.length,0);assert.equal(s.shots.length,0);}
assert.equal(DUEL_ORDER.length,26);for(const id of DUEL_ORDER.slice(9)){assert.equal(DUEL_CHARACTERS[id].skills.length,2);assert.ok(DUEL_CHARACTERS[id].law);}
console.log('Six duel characters: trap arming/block/dodge, lateral movement, finite counter shield/grab, recursion guard, rush interrupt, cold detonation, fork limits and expiry passed.');
}
// Six more identities: fixed tells, actual orbit contact, previous-position strikes, ring crossing, bounded frost.
{
 const fixture=(id,gap=4)=>{const s=createDuel({player:id,enemy:'pierce',seed:11});s.phase='fight';const [a,b]=s.fighters;a.x=15;a.y=10;b.x=15+gap;b.y=10;b.fx=-1;b.hp=b.maxHp=999;return s;};
 const cast=s=>run(s,.02,{skill1:true},{});
 for(const id of DUEL_ORDER.slice(15)){const s=fixture(id);cast(s);assert.ok(s.hazards.length>0,id+' creates its own tell');assert.ok(s.hazards.every(h=>h.total>0&&h.arm>0));run(s,6);assert.equal(s.hazards.length,0,id+' skill TTL');}
 // Reed locks aim and remains planted; a hit during windup cancels every pending thrust.
 {const s=fixture('reed');const [a,b]=s.fighters;cast(s);const h=s.hazards[0];run(s,.2,{aimX:0,aimY:1});assert.equal(h.dy,0);assert.equal(a.x,15);assert.equal(b.hp,999);run(s,.65);assert.ok(b.hp<999);assert.ok(999-b.hp<=24);}
 {const s=fixture('reed');cast(s);run(s,1,{}, {x:0,y:1});assert.equal(s.fighters[1].hp,999,'sidestep charged spear');}
 {const s=fixture('reed');s.fighters[1].char='chain';cast(s);run(s,.02,{}, {skill1:true});run(s,1);assert.equal(s.fighters[1].hp,999,'interrupt planted windup');}
 {const s=fixture('reed');run(s,.3,{}, {block:true});cast(s);run(s,1,{}, {block:true});assert.ok(Math.abs(999-s.fighters[1].hp-24*.2)<.001,'spear can be blocked');}
 // Cinder records only three own last positions. Each patch consumes a contact including an invulnerable dodge.
 {const s=fixture('cinder',1);const [a,b]=s.fighters;a.trail=[{x:16,y:10},{x:18,y:10},{x:20,y:10}];cast(s);assert.equal(s.hazards.length,3);assert.deepEqual(s.hazards.map(h=>h.x),[20,18,16]);run(s,.25);assert.equal(b.hp,999);run(s,.6);assert.ok(999-b.hp<=8&&b.hp<999);const hp=b.hp;run(s,1);assert.equal(b.hp,hp);}
 {const s=fixture('cinder',1);s.fighters[0].trail=[{x:16,y:10}];run(s,.3,{}, {block:true});cast(s);run(s,1,{}, {block:true});assert.ok(999-s.fighters[1].hp<=24*.2+.001);}
 {const s=fixture('cinder',1);s.fighters[0].trail=[{x:16,y:10}];cast(s);run(s,.25);run(s,.9,{}, {dodge:true,x:0,y:1});assert.equal(s.fighters[1].hp,999,'dodge out before fire arms');}
 // A stone is one point on an orbit, never an aura; even contact held by a fixture has a hard hit cap.
 for(const ult of [false,true]){const s=fixture('pebble',8);const [a,b]=s.fighters;if(ult){a.meter=100;run(s,.02,{ult:true});}else cast(s);const h=s.hazards[0];for(let k=0;k<260;k++){const angle=h.angle+(h.arm<=0?1/60*3.5:0);b.x=a.x+Math.cos(angle)*h.orbitR;b.y=a.y+Math.sin(angle)*h.orbitR;b.kx=b.ky=0;b.stun=0;b.state='idle';s.freeze=0;stepDuel(s,1/60,{},{});}assert.equal(h.hits,ult?2:1);assert.ok(999-b.hp<=(ult?34:18));assert.equal(s.hazards.length,0);}
 {const s=fixture('pebble',.9);cast(s);run(s,2.5);assert.equal(s.fighters[1].hp,999,'inside orbit avoids the rock');}
 {const s=fixture('pebble',1.9);run(s,.3,{}, {block:true});cast(s);run(s,2.5,{}, {block:true});assert.ok(s.events.includes('block'));assert.ok(999-s.fighters[1].hp<=18*.2+.001,'orbit rock is blockable');}
 // Echo uses the old target position and keeps its afterimage at the caster's original spot.
 {const s=fixture('echo');const [a,b]=s.fighters;b.trail=[{x:19,y:10},{x:21,y:11}];cast(s);const h=s.hazards[0];assert.equal(h.x,19);assert.equal(h.fromX,15);run(s,.25,{x:0,y:1});assert.equal(h.fromY,10);assert.equal(b.hp,999);run(s,.65);assert.ok(b.hp<999);const hp=b.hp;run(s,1);assert.equal(b.hp,hp);assert.equal(s.fighters.length,2);}
 {const s=fixture('echo');cast(s);run(s,1,{}, {x:0,y:1});assert.equal(s.fighters[1].hp,999,'leave the remembered position');}
 {const s=fixture('echo');run(s,.3,{}, {block:true});cast(s);run(s,1,{}, {block:true});assert.ok(Math.abs(999-s.fighters[1].hp-20*.2)<.001,'echo is blockable');}
 // Pulse crosses once and always pushes away. Crossing while invulnerable spends that wave's hit budget.
 {const s=fixture('pulse',2.5);const b=s.fighters[1];cast(s);run(s,.25);assert.equal(b.hp,999);run(s,.6);assert.ok(b.hp<999&&b.x>18,'repulse moves outward');const hp=b.hp;run(s,1);assert.equal(b.hp,hp);}
 {const s=fixture('pulse',2.5);const b=s.fighters[1];cast(s);run(s,.4);b.inv=1;run(s,.7);assert.equal(b.hp,999,'invulnerable ring crossing');assert.equal(s.hazards.length,0);}
 {const s=fixture('pulse',2.5);run(s,.3,{}, {block:true});cast(s);run(s,1.3,{}, {block:true});assert.ok(Math.abs(999-s.fighters[1].hp-18*.2)<.001,'wave is blockable');}
 {const s=fixture('pulse',2.5);cast(s);run(s,.45);run(s,.02,{}, {dodge:true,x:-1,y:0});run(s,.7);assert.equal(s.fighters[1].hp,999,'dodge inward through the ring');}
 // Three accurate hits trigger only a short slow. Blocking grants no stacks; a fivefold damage burst is absent.
 {const s=fixture('shard');const [a,b]=s.fighters;for(let k=0;k<3;k++){a.cd[0]=0;a.state='idle';a.t=0;b.x=19;b.y=10;b.kx=b.ky=0;s.freeze=0;cast(s);run(s,.4);assert.ok(b.shardStacks<=3);}assert.ok(b.slow>0);assert.ok(b.slow<=.85);assert.equal(999-b.hp,36);assert.ok(b.shardSlowCd>0);run(s,1.5);assert.equal(b.slow,0);}
 {const s=fixture('shard');run(s,.3,{}, {block:true});cast(s);run(s,.7,{}, {block:true});assert.equal(s.fighters[1].shardStacks,0);assert.ok(999-s.fighters[1].hp<=2.401);}
 {const s=fixture('shard');cast(s);run(s,.02,{}, {dodge:true,x:0,y:1});run(s,1);assert.equal(s.fighters[1].hp,999,'dodge precise shard');}
 for(const id of DUEL_ORDER.slice(15)){const s=fixture(id);s.fighters[0].meter=100;run(s,.02,{ult:true});assert.equal(s.fighters[0].meter,0);assert.ok(s.hazards.length>=1&&s.hazards.length<=3);run(s,6);assert.equal(s.hazards.length,0,id+' ult expires');}
 for(const id of ['cinder','pebble','echo','pulse','reed','shard']){const s=fixture(id,10);s.fighters[1].inv=99;for(let k=0;k<200;k++){const a=s.fighters[0];a.state='idle';a.t=0;a.cd[0]=0;stepDuel(s,.001,{skill1:true},{});assert.ok(s.hazards.length<=3,id+' resource cap');}run(s,6);assert.equal(s.hazards.length,0);}
 console.log('Second six duel fighters: locked/interruptible spear, finite fire trail, point orbit caps, fixed afterimage history, outward one-crossing rings, bounded frost, block/dodge and TTL passed.');
}
// Boss flag strengthens only the campaign opponent; unlock requires an actual valid final-stage record.
{
 assert.equal(availableDuelCharacters().length,DUEL_ORDER.length-1);for(const progress of [{},{cleared:{s21:{losses:0}}},{cleared:{s22:{losses:2}}},{cleared:{s22:{losses:'0'}}}])assert.equal(availableDuelCharacters(progress).includes('heart'),false);
 for(const losses of [0,1])assert.equal(availableDuelCharacters({cleared:{s22:{losses}}}).includes('heart'),true);
 const ordinary=createDuel({player:'heart',enemy:'heart'}),boss=createDuel({player:'heart',enemy:'heart',boss:true}),other=createDuel({player:'heart',enemy:'pierce',boss:true});assert.equal(ordinary.boss,false);assert.equal(ordinary.fighters[1].maxHp,190);assert.equal(boss.fighters[1].maxHp,330);assert.equal(boss.fighters[0].maxHp,190);assert.equal(other.boss,false);
 const fixture=()=>{const s=createDuel({player:'heart',enemy:'pierce'});s.phase='fight';const [a,b]=s.fighters;a.x=15;a.y=10;b.x=18;b.y=10;b.hp=b.maxHp=999;return s;};
 {const s=fixture();run(s,.02,{skill1:true});const h=s.hazards[0],b=s.fighters[1];assert.equal(h.kind,'heartWell');assert.ok(h.arm>=.7);assert.equal(h.follow,undefined);run(s,.5);assert.equal(b.hp,999);run(s,.5);assert.equal(999-b.hp,14);const hp=b.hp;run(s,2);assert.equal(b.hp,hp);assert.equal(s.hazards.length,0);assert.ok(s.fighters[0].cd[0]>0);}
 {const s=fixture();run(s,.3,{}, {block:true});run(s,.02,{skill1:true},{block:true});run(s,2.7,{}, {block:true});assert.ok(Math.abs(999-s.fighters[1].hp-14*.2)<.001,'heart well can be blocked');}
 {const s=fixture();run(s,.02,{skill1:true});const h=s.hazards[0];run(s,.55);run(s,.8,{}, {dodge:true,x:0,y:1});assert.equal(s.fighters[1].hp,999);assert.equal(h.x,18);assert.equal(h.y,10);}
 {const s=fixture();run(s,.02,{skill1:true});run(s,.65);s.fighters[1].inv=1;run(s,.5);const h=s.hazards[0];assert.equal(h.triggered,true);assert.equal(s.fighters[1].hp,999);run(s,2);assert.equal(s.fighters[1].hp,999,'invulnerability consumes a well contact');}
 {const s=fixture();run(s,.02,{skill2:true});assert.equal(s.hazards[0].kind,'pebbleOrbit');assert.equal(s.hazards[0].maxHits,2);assert.ok(s.fighters[0].cd[1]>0);run(s,4);assert.equal(s.hazards.length,0);}
 {const s=fixture();s.fighters[0].meter=100;run(s,.02,{ult:true});assert.deepEqual(s.hazards.map(h=>h.kind),['heartWell','pebbleOrbit']);assert.equal(s.fighters[0].meter,0);run(s,4);assert.equal(s.hazards.length,0);assert.equal(availableDuelCharacters({}).includes('heart'),false,'an ordinary win cannot create an unlock record');}
 // Three announced patterns rotate without overlapping fields and always leave a real idle interval.
 {const s=createDuel({player:'pierce',enemy:'heart',boss:true});s.phase='fight';s.fighters[0].hp=s.fighters[0].maxHp=999;const b=s.fighters[1],patterns=[];let previous='',recoverFrames=0;
  for(let k=0;k<1000;k++){stepDuel(s,1/60,{},null);if(b.bossPattern!==previous){previous=b.bossPattern;if(previous){patterns.push(previous);assert.ok(s.hazards.every(h=>h.owner!==1||h.arm>=.7));assert.ok(b.bossNextAt-b.bossActiveUntil>=.8);}}if(b.bossRecovery>0){recoverFrames++;assert.equal(['attack','heavy','block'].includes(b.state),false,'recovery contains no attack or guard');}assert.ok(s.hazards.filter(h=>h.owner===1).length<=1);}
  assert.deepEqual(patterns.slice(0,3),['well','orbit','ring']);assert.ok(recoverFrames>90);b.hp=100;run(s,4,{},null);assert.equal(b.bossPhase,2);assert.ok(b.bossNextAt-b.bossActiveUntil>=.8);
  s.roundTime=0;stepDuel(s,1/60,{},{});run(s,3);assert.equal(b.maxHp,330,'boss max HP survives round reset');assert.equal(b.hp,330);assert.equal(b.bossPatternIndex,0);
 }
 console.log('Garden heart: final-stage unlock predicate, isolated boss stats/reset, delayed fixed wells/block/dodge, finite orbit/ult, patterned recovery and second phase passed.');
}
if(process.argv.includes('--boss')){
 const summary={};let games=0,heroWins=0,rounds=0,seconds=0;
 for(const hero of DUEL_ORDER.filter(id=>id!=='heart')){let wins=0;for(let seed=1;seed<=8;seed++){const s=createDuel({player:hero,enemy:'heart',boss:true,seed,difficulty:'normal'});let frames=0;while(s.phase!=='over'&&frames++<60*300)stepDuel(s,1/60,duelAi(s,0,1/60),null);assert.equal(s.phase,'over',hero+' boss match ends');games++;rounds+=s.wins[0]+s.wins[1];seconds+=s.time;if(s.winner===0){wins++;heroWins++;}}summary[hero]=wins/8*100;}
 console.log('Heart boss AI hero win rates %',JSON.stringify(summary),'games',games,'overall',Math.round(heroWins/games*1000)/10,'mean round seconds',Math.round(seconds/rounds*10)/10);
}
if(process.argv.includes('--heart')){
 const rates={};let games=0,wins=0;for(const enemy of DUEL_ORDER.filter(id=>id!=='heart')){let pairWins=0;for(const seat of [0,1])for(let seed=1;seed<=8;seed++){const s=createDuel({player:seat===0?'heart':enemy,enemy:seat===0?enemy:'heart',seed,difficulty:'normal'});let frames=0;while(s.phase!=='over'&&frames++<60*300)stepDuel(s,1/60,duelAi(s,0,1/60),null);assert.equal(s.phase,'over','ordinary heart/'+enemy+' ends');assert.equal(s.boss,false);games++;if(s.winner===seat){pairWins++;wins++;}}rates[enemy]=pairWins/16*100;}console.log('Ordinary heart win rate vs 21 %',JSON.stringify(rates),'games',games,'overall',Math.round(wins/games*1000)/10);
}
// Both positions and 20+ seeded games per ordered matchup. AI results describe this bot, not human balance.
if(!process.argv.includes('--mechanics')&&!process.argv.includes('--boss')&&!process.argv.includes('--heart'))
{
 const wins=Object.fromEntries(DUEL_ORDER.map(c=>[c,0])),played=Object.fromEntries(DUEL_ORDER.map(c=>[c,0])),pairs={};let games=0;const seeds=Math.max(20,Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1])||20);
 for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e||process.argv.includes('--new-only')&&DUEL_ORDER.indexOf(p)<15&&DUEL_ORDER.indexOf(e)<15)continue;for(let seed=1;seed<=seeds;seed++){const s=createDuel({player:p,enemy:e,seed,difficulty:'normal'});let guard=0;while(s.phase!=='over'&&guard++<60*600)stepDuel(s,1/60,duelAi(s,0,1/60),null);assert.equal(s.phase,'over',`${p} vs ${e} ends`);wins[s.winner===0?p:e]++;played[p]++;played[e]++;games++;const ids=[p,e].sort(),key=ids.join('/');pairs[key]??={games:0,firstWins:0};pairs[key].games++;if((s.winner===0?p:e)===ids[0])pairs[key].firstWins++;}}
 const rate=Object.fromEntries(DUEL_ORDER.map(c=>[c,Math.round(wins[c]/played[c]*1000)/10]));
 for(const c of DUEL_ORDER)assert.ok(Number.isFinite(rate[c]),c+' has a complete matrix');
 console.log('Duel AI win rate %',JSON.stringify(rate),'of',games,'games');
 console.log('Highly skewed matchups (>=80% one side)',JSON.stringify(Object.fromEntries(Object.entries(pairs).map(([k,v])=>[k,Math.round(v.firstWins/v.games*1000)/10]).filter(([,r])=>r<=20||r>=80))));
}
// 평타만 연타하면 보통 AI를 이기지 못한다(3타 뒤 끊김·막히면 튕김·맞으면 AI가 더 막고 반격).
if(!process.argv.includes('--mechanics')&&!process.argv.includes('--boss')&&!process.argv.includes('--heart')){let win=0,n=0;for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e)continue;const s=createDuel({player:p,enemy:e,seed:1,difficulty:'normal'});let f=0;while(s.phase!=='over'&&f++<60*600){const me=s.fighters[0],o=s.fighters[1],dx=o.x-me.x,dy=o.y-me.y,d=Math.hypot(dx,dy);stepDuel(s,1/60,{x:d>1.4?dx/d:0,y:d>1.4?dy/d:0,aimX:dx,aimY:dy,attack:f%6===0});}n++;if(s.winner===0)win++;}
 assert.ok(win<=n*.3,`attack spam must not beat normal AI (${win}/${n})`);console.log('Attack spam vs normal AI',win,'of',n);}
assert.equal(Object.keys(DUEL_CHARACTERS).length,DUEL_ORDER.length);assert.equal(DUEL_RULES.roundsToWin,2);
assert.equal(new Set(DUEL_ORDER.map(id=>DUEL_CHARACTERS[id].law||id)).size,9,'all fighters reuse exactly nine laws');
console.log(process.argv.includes('--mechanics')||process.argv.includes('--boss')||process.argv.includes('--heart')?'Duel mechanics and finite-resource regressions passed.':'Duel mechanics, best-of-3 termination and attack-spam checks passed; seeded AI balance and pair outliers reported above.');
