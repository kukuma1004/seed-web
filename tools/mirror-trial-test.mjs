import assert from 'node:assert/strict';
import {MIRROR_TOWER,MIRROR_TRIAL_LIMITS,MIRROR_TRIAL_PROTOTYPE,mirrorBuildSnapshot,mirrorFloorRules,mirrorPatternPlan} from '../src/mirror-trial.js';

const snapshot=mirrorBuildSnapshot({
 levels:new Map([['recall',3],['burst',1],['nope',99]]),
 forms:new Map([['returnflare',5],['missing',7]])
});
assert.deepEqual(snapshot.laws.map(x=>x.id),['recall','burst']);
assert.deepEqual(snapshot.forms.map(x=>x.id),['returnflare']);

for(const quality of ['low','normal']){
 const plan=mirrorPatternPlan(snapshot,{floor:12,quality});
 assert.ok(plan.attacks.length>=1&&plan.attacks.length<=MIRROR_TRIAL_LIMITS.patterns,'한 번에 읽을 패턴은 두 개 이하');
 assert.equal(plan.attacks[0].law,'recall','진화의 대표 성질을 우선한다');
 assert.equal(plan.copied.healing,false);assert.equal(plan.copied.revive,false);assert.equal(plan.copied.relic,false);
 assert.ok(plan.budget.hostileProjectiles<60,'모바일 적 탄환 예산을 넘지 않는다');
 assert.ok(plan.stats.hitDamageMaxHp<=.13,'한 발 최대 피해 상한');
 assert.equal(plan.tower.arena.shrinks,false,'난이도가 올라가도 이동 공간을 억지로 줄이지 않는다');
}

const blank=mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1,quality:'low'});
assert.equal(blank.attacks[0].law,'pierce','기본 씨앗은 읽기 쉬운 직선 공격부터 시작');
assert.equal(blank.attacks.length,1,'첫 두 층은 대표 패턴 하나만 쓴다');
assert.equal(mirrorPatternPlan(snapshot,{floor:3}).attacks.length,2,'3층부터 두 성질을 조합한다');
for(const floor of MIRROR_TOWER.milestoneFloors){
 const rules=mirrorFloorRules(floor,{quality:'low'});
 assert.equal(rules.checkpoint,true);assert.equal(rules.healAfter,MIRROR_TOWER.milestoneHeal);
 assert.ok(rules.budget.hostileProjectiles<=MIRROR_TRIAL_LIMITS.hostileProjectilesLow);
}
assert.equal(mirrorFloorRules(1).movement.dash,false);
assert.equal(mirrorFloorRules(5).movement.dash,true,'5층부터 분신이 예고 후 회피 이동을 쓴다');
assert.equal(mirrorFloorRules(10).movement.feint,true,'10층부터 방향 속임수를 쓴다');
assert.equal(mirrorFloorRules(20).chainLength,3,'후반은 탄 수 대신 패턴 연결이 늘어난다');
assert.equal(mirrorFloorRules(21).endless,true);
assert.equal(MIRROR_TRIAL_PROTOTYPE.placement,'separate-challenge');
assert.equal(MIRROR_TRIAL_PROTOTYPE.localSliceFloors,10);
assert.equal(MIRROR_TRIAL_PROTOTYPE.released,false,'검증 전에는 본편 메뉴에 공개하지 않는다');

console.log('거울의 탑: 자유 이동·층별 행동·5층 체크포인트·대표 패턴 2개·피해/탄환 예산 통과');
