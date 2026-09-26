import assert from 'node:assert/strict';
import {titleState,codexNews,codexSteps,codexBonus,CODEX,CLEAR_ALL_STATS,AUSTIN_MOVE_SPEED,AUSTIN_VETERAN_MOVE_SPEED,AUSTIN_VETERAN_TITLE,ALWAYS_BEGINNER_MAX_HP,ALWAYS_VETERAN_MAX_HP,JOHAN_COOLDOWN,JOHAN_VETERAN_COOLDOWN,ALWAYS_BEGINNER_TITLE,FIRST_GARDEN_TITLE} from '../src/titles.js';
import {ALL_FORMS} from '../src/forms.js';
import {FIRST_GARDEN_BADGE} from '../src/account-profile.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// 칭호가 없으면 그대로. 다음 목표는 도감 10개에서 받는 칭호.
{const s=titleState({discovered:7});assert.deepEqual(s.titles,[]);assert.equal(s.shown,null);close(s.codexBonus,0);close(s.moveSpeed,1);assert.equal(s.maxHp,100);assert.equal(s.next.need,3);assert.match(s.next.reward,/칭호/);}
// First Austin title keeps +5% movement; cumulative ten adds another +5%.
{const s=titleState({austin:true,discovered:3});assert.equal(s.titles.length,1);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.shotSpeed,1);assert.equal(s.shown,s.titles[0].name);}
{const s=titleState({austinVeteran:true,equipped:'austinveteran'});assert.equal(s.shown,AUSTIN_VETERAN_TITLE);close(s.moveSpeed,1+AUSTIN_VETERAN_MOVE_SPEED);close(s.shotSpeed,1);assert.match(s.titles[0].perk,/누적 10회/);}
// Always Beginner: a flat +10 max HP that does not scale with garden percentages.
{const s=titleState({alwaysBeginner:true,discovered:3});assert.equal(s.titles.length,1);assert.equal(s.titles[0].name,ALWAYS_BEGINNER_TITLE);assert.equal(s.maxHpBonus,ALWAYS_BEGINNER_MAX_HP);assert.equal(s.maxHp,110);}
// 도감 칭호: 10종마다 +0.5%, 30종마다 추가 +0.5%. 150/153종에서 +10%.
for(const [n,steps] of [[9,0],[10,1],[19,1],[20,2],[55,5]])assert.equal(codexSteps(n),steps,`${n}`);
for(const [n,bonus] of [[9,0],[10,.005],[20,.01],[29,.01],[30,.02],[55,.03],[60,.04],[90,.06],[120,.08],[149,.09],[150,.1],[153,.1],[200,.1],[500,.1]])close(titleState({discovered:n}).codexBonus,bonus);
assert.equal(titleState({discovered:10}).titles[0].id,'codex');assert.equal(titleState({discovered:34}).next.need,6);
assert.match(titleState({discovered:29,total:153}).next.reward,/\+1%/);
assert.match(titleState({discovered:119,total:153}).next.reward,/\+1%/);
assert.deepEqual(titleState({discovered:150,total:153}).next,{at:153,need:3,reward:"칭호 '정원의 완성자'"});
assert.equal(titleState({discovered:153,total:153}).next,null);
assert.ok(titleState({discovered:153,total:153}).titles.some(title=>title.id==='codexcomplete'&&title.shotSpeed===0&&title.moveSpeed===0&&title.maxHp===0));
// Both titles add up, Austin is the one shown above the seed.
{const s=titleState({austin:true,discovered:41});assert.equal(s.titles.length,2);assert.equal(s.shown,s.titles[0].name);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.codexBonus,.025);}
// Equipping changes only the displayed name; every earned perk remains active.
{const base=titleState({austin:true,discovered:50,equipped:'codex'}),other=titleState({austin:true,discovered:50,equipped:'austin'});assert.equal(base.equipped,'codex');assert.equal(base.shown,'정원의 기록자');close(base.codexBonus,other.codexBonus);close(base.moveSpeed,other.moveSpeed);assert.equal(base.shotSpeedSources.length,0,'도감 칭호는 더 이상 탄속을 올리지 않는다');}
{const base=titleState({austin:true,alwaysBeginner:true,discovered:50,equipped:'austin'}),other=titleState({austin:true,alwaysBeginner:true,discovered:50,equipped:'alwaysbeginner'});assert.equal(other.shown,ALWAYS_BEGINNER_TITLE);assert.equal(base.maxHp,other.maxHp);assert.equal(other.maxHp,110);}
// The old-board honor is shown first but never changes combat power.
{const s=titleState({austin:true,discovered:41,badges:[FIRST_GARDEN_BADGE]});assert.equal(s.shown,FIRST_GARDEN_TITLE);assert.equal(s.titles.length,3);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.codexBonus,.025);}
// No goal past what the codex holds.
{const total=Object.keys(ALL_FORMS).length;assert.equal(titleState({discovered:total,total}).next,null);assert.ok(titleState({discovered:20,total}).next);}
// 도감 칭호 효과는 +10%(도감 150개)에서 멈춘다. 도감이 더 늘어도 그대로다.
close(titleState({discovered:150}).codexBonus,CODEX.maxStat);close(titleState({discovered:1090}).codexBonus,CODEX.maxStat);assert.equal(titleState({discovered:153,total:153}).next,null);
// News only when a threshold is crossed.
assert.match(codexNews(9,10),/칭호/);assert.match(codexNews(19,20),/1%/);assert.equal(codexNews(10,11),null);assert.equal(codexNews(5,6),null);
assert.equal(codexNews(200,220),null,'상한 뒤에는 새 소식이 없다');
assert.match(codexNews(29,30),/2%/);assert.match(codexNews(79,80),/5%/);assert.match(codexNews(149,150),/10%/);assert.match(codexNews(150,153),/정원의 완성자/);assert.doesNotMatch(codexNews(150,153),/능력/);
// Three victories in one run give +1% to five stats; ten cumulative victories give +5% move.
{
 const clearOnly=titleState({austinClear:true}),both=titleState({austin:true,austinClear:true}),austinOnly=titleState({austin:true});
 close(clearOnly.clearStatBonus,CLEAR_ALL_STATS);
 close(both.clearStatBonus,CLEAR_ALL_STATS);
 close(both.moveSpeedBonus,AUSTIN_MOVE_SPEED);
 close(austinOnly.moveSpeedBonus,AUSTIN_MOVE_SPEED);
 assert.equal(both.titles[0].id,'austinclear','완주 칭호가 먼저 보인다');
 assert.match(both.titles.find(t=>t.id==='austinclear').perk,/모든 능력 \+1%/);
 assert.equal(titleState({austin:true,austinClear:true,equipped:'austin'}).shown,'정시를 깨운 자','고른 칭호가 우선');
 close(titleState({austin:true,austinClear:true,austinVeteran:true}).moveSpeedBonus,AUSTIN_MOVE_SPEED+AUSTIN_VETERAN_MOVE_SPEED);
}
// 2막 완주도 +1% 모든 능력; 첫 격파 생명력 +10은 별도로 유지한다.
{
 const both=titleState({alwaysBeginner:true,alwaysClear:true}),only=titleState({alwaysClear:true}),old=titleState({alwaysBeginner:true});
 assert.equal(both.maxHpBonus,10);assert.equal(only.maxHpBonus,0);assert.equal(old.maxHpBonus,10);
 close(both.clearStatBonus,CLEAR_ALL_STATS);
 assert.ok(both.titles.findIndex(t=>t.id==='alwaysclear')<both.titles.findIndex(t=>t.id==='alwaysbeginner'),'완주 칭호가 먼저');
 const all=titleState({austin:true,austinClear:true,alwaysBeginner:true,alwaysClear:true});
 close(all.clearStatBonus,2*CLEAR_ALL_STATS);assert.equal(all.maxHpBonus,10);
}
{
 const first=titleState({johan:true}),veteran=titleState({johanVeteran:true}),clear=titleState({johanClear:true}),all=titleState({austinClear:true,alwaysBeginner:true,alwaysVeteran:true,alwaysClear:true,johan:true,johanClear:true,johanVeteran:true});
 close(first.cooldownBonus,JOHAN_COOLDOWN);close(veteran.cooldownBonus,JOHAN_VETERAN_COOLDOWN);close(all.cooldownBonus,JOHAN_COOLDOWN+JOHAN_VETERAN_COOLDOWN);close(clear.clearStatBonus,CLEAR_ALL_STATS);
 close(all.clearStatBonus,3*CLEAR_ALL_STATS);assert.equal(all.maxHpBonus,ALWAYS_BEGINNER_MAX_HP+ALWAYS_VETERAN_MAX_HP);
 assert.equal(titleState({johan:true,equipped:'tempestcarrier'}).shown,'폭풍을 마주한 자');
 assert.ok(all.titles.some(t=>t.id==='alwaysveteran'));assert.ok(all.titles.some(t=>t.id==='johanveteran'));
}
console.log('칭호: 막별 완주·누적 보상, 요한 순환 +2%와 +3% 누적, 도감 보상·장착 통과');
