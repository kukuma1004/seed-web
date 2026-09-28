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
// 세 판 두 선승, AI끼리 끝까지 간다. 2026-09-28 사용자: "45~55%는 되어야 황밸" — 아홉 명 모두 자기 판 승률 45~55%(2880판).
{
 const wins=Object.fromEntries(DUEL_ORDER.map(c=>[c,0])),played=Object.fromEntries(DUEL_ORDER.map(c=>[c,0]));let games=0;
 for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e)continue;for(let seed=1;seed<=40;seed++){const s=createDuel({player:p,enemy:e,seed,difficulty:'normal'});let guard=0;while(s.phase!=='over'&&guard++<60*600)stepDuel(s,1/60,duelAi(s,0,1/60),null);assert.equal(s.phase,'over',`${p} vs ${e} ends`);wins[s.winner===0?p:e]++;played[p]++;played[e]++;games++;}}
 const rate=Object.fromEntries(DUEL_ORDER.map(c=>[c,Math.round(wins[c]/played[c]*100)]));
 for(const c of DUEL_ORDER)assert.ok(rate[c]>=45&&rate[c]<=55,`${c} win rate ${JSON.stringify(rate)}`);
 console.log('Duel AI win rate %',JSON.stringify(rate),'of',games,'games');
}
// 평타만 연타하면 보통 AI를 이기지 못한다(3타 뒤 끊김·막히면 튕김·맞으면 AI가 더 막고 반격).
{let win=0,n=0;for(const p of DUEL_ORDER)for(const e of DUEL_ORDER){if(p===e)continue;const s=createDuel({player:p,enemy:e,seed:1,difficulty:'normal'});let f=0;while(s.phase!=='over'&&f++<60*600){const me=s.fighters[0],o=s.fighters[1],dx=o.x-me.x,dy=o.y-me.y,d=Math.hypot(dx,dy);stepDuel(s,1/60,{x:d>1.4?dx/d:0,y:d>1.4?dy/d:0,aimX:dx,aimY:dy,attack:f%6===0});}n++;if(s.winner===0)win++;}
 assert.ok(win<=n*.3,`attack spam must not beat normal AI (${win}/${n})`);console.log('Attack spam vs normal AI',win,'of',n);}
assert.equal(Object.keys(DUEL_CHARACTERS).length,9);assert.equal(DUEL_RULES.roundsToWin,2);
console.log('Duel: light/heavy/block/parry/guard break, grab, reflect shield, dodge, best-of-3 AI matches and balance passed.');
