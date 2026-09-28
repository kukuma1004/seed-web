import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS,DUEL_ORDER,DUEL_RULES} from '../src/seed-duel-rules.js';

const idle={};
const fight=(p='pierce',e='burst')=>{const s=createDuel({player:p,enemy:e,seed:7});s.phase='fight';const [a,b]=s.fighters;a.x=10;a.y=8;b.x=11.6;b.y=8;a.fx=1;b.fx=-1;return s;};
const run=(s,sec,pin={},ein={})=>{for(let t=0;t<sec;t+=1/60)stepDuel(s,1/60,typeof pin==='function'?pin(t):pin,typeof ein==='function'?ein(t):ein);};
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
// 세 판 두 선승, AI끼리 끝까지 간다. 캐릭터마다 이기는 판이 있다(한 캐릭터가 모두 이기지 않는다).
{
 const wins=Object.fromEntries(DUEL_ORDER.map(c=>[c,0]));let games=0;
 for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e)continue;for(let seed=1;seed<=3;seed++){const s=createDuel({player:p,enemy:e,seed,difficulty:'normal'});let guard=0;while(s.phase!=='over'&&guard++<60*600)stepDuel(s,1/60,duelAi(s,0,1/60),null);assert.equal(s.phase,'over',`${p} vs ${e} ends`);wins[s.winner===0?p:e]++;games++;}}
 for(const c of DUEL_ORDER)assert.ok(wins[c]>=games*.12&&wins[c]<=games*.45,`${c} balance ${JSON.stringify(wins)}`);
 console.log('Duel AI balance',JSON.stringify(wins),'of',games);
}
// 평타만 연타하면 보통 AI를 이기지 못한다(3타 뒤 끊김·막히면 튕김·맞으면 AI가 더 막고 반격).
{let win=0,n=0;for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e)continue;for(let seed=1;seed<=3;seed++){const s=createDuel({player:p,enemy:e,seed,difficulty:'normal'});let f=0;while(s.phase!=='over'&&f++<60*600){const me=s.fighters[0],o=s.fighters[1],dx=o.x-me.x,dy=o.y-me.y,d=Math.hypot(dx,dy);stepDuel(s,1/60,{x:d>1.4?dx/d:0,y:d>1.4?dy/d:0,aimX:dx,aimY:dy,attack:f%6===0});}n++;if(s.winner===0)win++;}}
 assert.ok(win<=n*.3,`attack spam must not beat normal AI (${win}/${n})`);console.log('Attack spam vs normal AI',win,'of',n);}
assert.equal(Object.keys(DUEL_CHARACTERS).length,4);assert.equal(DUEL_RULES.roundsToWin,2);
console.log('Duel: light/heavy/block/parry/guard break, grab, reflect shield, dodge, best-of-3 AI matches and balance passed.');
