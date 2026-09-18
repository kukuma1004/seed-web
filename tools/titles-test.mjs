import assert from 'node:assert/strict';
import {titleState,codexNews,codexSteps,CODEX,AUSTIN_SHOT_SPEED,FIRST_GARDEN_TITLE} from '../src/titles.js';
import {ALL_FORMS} from '../src/forms.js';
import {FIRST_GARDEN_BADGE} from '../src/account-profile.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// No titles: plain speed, the next goal is the codex title at 20.
{const s=titleState({discovered:7});assert.deepEqual(s.titles,[]);assert.equal(s.shown,null);close(s.shotSpeed,1);assert.equal(s.next.need,13);assert.match(s.next.reward,/칭호/);}
// Austin: +2%.
{const s=titleState({austin:true,discovered:3});assert.equal(s.titles.length,1);close(s.shotSpeed,1+AUSTIN_SHOT_SPEED);assert.equal(s.shown,s.titles[0].name);}
// Codex: the title at 20 without speed, then +0.5% at 30, 40, 50.
for(const [n,steps] of [[19,0],[20,0],[29,0],[30,1],[39,1],[40,2],[55,3]]){assert.equal(codexSteps(n),steps,`${n}`);close(titleState({discovered:n}).shotSpeed,1+steps*CODEX.shotSpeedPerStep);}
assert.equal(titleState({discovered:20}).titles[0].id,'codex');assert.equal(titleState({discovered:34}).next.need,6);
// Both titles add up, Austin is the one shown above the seed.
{const s=titleState({austin:true,discovered:41});assert.equal(s.titles.length,2);assert.equal(s.shown,s.titles[0].name);close(s.shotSpeed,1+AUSTIN_SHOT_SPEED+2*CODEX.shotSpeedPerStep);}
// Equipping changes only the displayed name; every earned perk remains active.
{const base=titleState({austin:true,discovered:50,equipped:'codex'}),other=titleState({austin:true,discovered:50,equipped:'austin'});assert.equal(base.equipped,'codex');assert.equal(base.shown,'정원의 기록자');close(base.shotSpeed,other.shotSpeed);assert.equal(base.shotSpeedSources.length,2);}
// The old-board honor is shown first but never changes combat power.
{const s=titleState({austin:true,discovered:41,badges:[FIRST_GARDEN_BADGE]});assert.equal(s.shown,FIRST_GARDEN_TITLE);assert.equal(s.titles.length,3);close(s.shotSpeed,1+AUSTIN_SHOT_SPEED+2*CODEX.shotSpeedPerStep);}
// No goal past what the codex holds.
{const total=Object.keys(ALL_FORMS).length;assert.equal(titleState({discovered:total,total}).next,null);assert.ok(titleState({discovered:20,total}).next);}
// The codex merit stops at +3% (80 discoveries) even as the catalogue grows.
close(titleState({discovered:80}).shotSpeed,1+CODEX.maxShotSpeed);close(titleState({discovered:1090}).shotSpeed,1+CODEX.maxShotSpeed);assert.equal(titleState({discovered:80,total:1090}).next,null);
// News only when a threshold is crossed.
assert.match(codexNews(19,20),/칭호/);assert.match(codexNews(29,30),/0\.5%/);assert.equal(codexNews(20,21),null);assert.equal(codexNews(5,6),null);
assert.match(codexNews(79,80),/3%/);assert.equal(codexNews(89,90),null,'상한 뒤에는 더 오른다는 알림을 띄우지 않습니다.');
console.log('Titles: Austin +2%, codex title at 20 and +0.5% basic shot speed per 10 more, goals, both titles and news passed.');
