import assert from 'node:assert/strict';
import {MIRROR_TRIAL_LIMITS,MIRROR_TRIAL_PROTOTYPE,mirrorBuildSnapshot,mirrorPatternPlan} from '../src/mirror-trial.js';

const snapshot=mirrorBuildSnapshot({
 levels:new Map([['recall',3],['burst',1],['nope',99]]),
 forms:new Map([['returnflare',5],['missing',7]])
});
assert.deepEqual(snapshot.laws.map(x=>x.id),['recall','burst']);
assert.deepEqual(snapshot.forms.map(x=>x.id),['returnflare']);

for(const quality of ['low','normal']){
 const plan=mirrorPatternPlan(snapshot,{round:12,quality});
 assert.ok(plan.attacks.length>=1&&plan.attacks.length<=MIRROR_TRIAL_LIMITS.patterns,'한 번에 읽을 패턴은 두 개 이하');
 assert.equal(plan.attacks[0].law,'recall','진화의 대표 성질을 우선한다');
 assert.equal(plan.copied.healing,false);assert.equal(plan.copied.revive,false);assert.equal(plan.copied.relic,false);
 assert.ok(plan.budget.hostileProjectiles<60,'모바일 적 탄환 예산을 넘지 않는다');
 assert.ok(plan.stats.hitDamageMaxHp<=.13,'한 발 최대 피해 상한');
}

const blank=mirrorPatternPlan(mirrorBuildSnapshot(),{round:1,quality:'low'});
assert.equal(blank.attacks[0].law,'pierce','기본 씨앗은 읽기 쉬운 직선 공격부터 시작');
assert.equal(MIRROR_TRIAL_PROTOTYPE.placement,'separate-challenge');
assert.equal(MIRROR_TRIAL_PROTOTYPE.released,false,'검증 전에는 본편 메뉴에 공개하지 않는다');

console.log('거울의 시련: 빌드 스냅샷·대표 패턴 2개·피해/탄환 예산·별도 콘텐츠 기준 통과');
