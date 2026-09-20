import assert from 'node:assert/strict';
import {titleState,codexNews,codexSteps,codexBonus,CODEX,AUSTIN_MOVE_SPEED,ALWAYS_BEGINNER_MAX_HP,ALWAYS_BEGINNER_TITLE,FIRST_GARDEN_TITLE} from '../src/titles.js';
import {ALL_FORMS} from '../src/forms.js';
import {FIRST_GARDEN_BADGE} from '../src/account-profile.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// 칭호가 없으면 그대로. 다음 목표는 도감 10개에서 받는 칭호.
{const s=titleState({discovered:7});assert.deepEqual(s.titles,[]);assert.equal(s.shown,null);close(s.codexBonus,0);close(s.moveSpeed,1);assert.equal(s.maxHp,100);assert.equal(s.next.need,3);assert.match(s.next.reward,/칭호/);}
// Austin: +5% movement, without adding projectile speed.
{const s=titleState({austin:true,discovered:3});assert.equal(s.titles.length,1);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.shotSpeed,1);assert.equal(s.shown,s.titles[0].name);}
// Always Beginner: a flat +10 max HP that does not scale with garden percentages.
{const s=titleState({alwaysBeginner:true,discovered:3});assert.equal(s.titles.length,1);assert.equal(s.titles[0].name,ALWAYS_BEGINNER_TITLE);assert.equal(s.maxHpBonus,ALWAYS_BEGINNER_MAX_HP);assert.equal(s.maxHp,110);}
// 도감 칭호: 10개에서 받고, 10개마다 다섯 능력이 모두 +0.5%씩(최대 10%).
for(const [n,steps] of [[9,0],[10,1],[19,1],[20,2],[55,5]]){assert.equal(codexSteps(n),steps,`${n}`);close(titleState({discovered:n}).codexBonus,Math.min(CODEX.maxStat,steps*CODEX.statPerStep));}
close(codexBonus(9),0);close(codexBonus(10),.005);close(codexBonus(200),.1);close(codexBonus(500),.1,'상한 10%');
assert.equal(titleState({discovered:10}).titles[0].id,'codex');assert.equal(titleState({discovered:34}).next.need,6);
// Both titles add up, Austin is the one shown above the seed.
{const s=titleState({austin:true,discovered:41});assert.equal(s.titles.length,2);assert.equal(s.shown,s.titles[0].name);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.codexBonus,4*CODEX.statPerStep);}
// Equipping changes only the displayed name; every earned perk remains active.
{const base=titleState({austin:true,discovered:50,equipped:'codex'}),other=titleState({austin:true,discovered:50,equipped:'austin'});assert.equal(base.equipped,'codex');assert.equal(base.shown,'정원의 기록자');close(base.codexBonus,other.codexBonus);close(base.moveSpeed,other.moveSpeed);assert.equal(base.shotSpeedSources.length,0,'도감 칭호는 더 이상 탄속을 올리지 않는다');}
{const base=titleState({austin:true,alwaysBeginner:true,discovered:50,equipped:'austin'}),other=titleState({austin:true,alwaysBeginner:true,discovered:50,equipped:'alwaysbeginner'});assert.equal(other.shown,ALWAYS_BEGINNER_TITLE);assert.equal(base.maxHp,other.maxHp);assert.equal(other.maxHp,110);}
// The old-board honor is shown first but never changes combat power.
{const s=titleState({austin:true,discovered:41,badges:[FIRST_GARDEN_BADGE]});assert.equal(s.shown,FIRST_GARDEN_TITLE);assert.equal(s.titles.length,3);close(s.moveSpeed,1+AUSTIN_MOVE_SPEED);close(s.codexBonus,4*CODEX.statPerStep);}
// No goal past what the codex holds.
{const total=Object.keys(ALL_FORMS).length;assert.equal(titleState({discovered:total,total}).next,null);assert.ok(titleState({discovered:20,total}).next);}
// 도감 칭호 효과는 +10%(도감 200개)에서 멈춘다. 도감이 더 늘어도 그대로다.
close(titleState({discovered:200}).codexBonus,CODEX.maxStat);close(titleState({discovered:1090}).codexBonus,CODEX.maxStat);assert.equal(titleState({discovered:200,total:1090}).next,null);
// News only when a threshold is crossed.
assert.match(codexNews(9,10),/칭호/);assert.match(codexNews(19,20),/1%/);assert.equal(codexNews(10,11),null);assert.equal(codexNews(5,6),null);
assert.equal(codexNews(200,220),null,'상한 뒤에는 새 소식이 없다');
assert.match(codexNews(79,80),/4%/);assert.equal(codexNews(209,210),null,'상한 뒤에는 더 오른다는 알림을 띄우지 않습니다.');
console.log('칭호: 오스틴 이속 +5%, 도감 10개에서 칭호와 10개마다 모든 능력 +0.5%(최대 10%), 목표·겹침·새 소식 통과');
