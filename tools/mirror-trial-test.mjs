import assert from 'node:assert/strict';
import {MIRROR_ATTACK_CADENCE,MIRROR_BREAK,MIRROR_COPY_RULES,MIRROR_TOWER,MIRROR_TRIAL_LIMITS,MIRROR_TRIAL_PROTOTYPE,mirrorAttackCooldown,mirrorBuildSnapshot,mirrorCloneLoadout,mirrorFloorRules,mirrorPatternPlan,refundMirrorAttackCooldown} from '../src/mirror-trial.js';

const snapshot=mirrorBuildSnapshot({
 levels:new Map([['recall',3],['burst',1],['nope',99]]),
 forms:new Map([['returnflare',5],['missing',7]]),
 dashEvolution:'twin'
});
assert.deepEqual(snapshot.laws.map(x=>x.id),['recall','burst']);
assert.deepEqual(snapshot.forms.map(x=>x.id),['returnflare']);
const clone=mirrorCloneLoadout(snapshot);
assert.deepEqual(clone.laws,snapshot.laws);assert.deepEqual(clone.forms,snapshot.forms);
assert.equal(clone.dashEvolution,'twin');assert.equal(clone.ultimate,'same-build');assert.equal(clone.exactCopy,true);
assert.equal(MIRROR_COPY_RULES.mode,'exact-tower-build');
assert.ok(!MIRROR_COPY_RULES.copied.includes('relic'));assert.ok(MIRROR_COPY_RULES.excluded.includes('potions'));

for(const quality of ['low','normal']){
 const plan=mirrorPatternPlan(snapshot,{floor:12,quality});
 assert.ok(plan.attacks.length>=2,'고른 성질을 대표 두 개로 잘라내지 않는다');
 assert.ok(plan.concurrentAttackFamilies<=MIRROR_TRIAL_LIMITS.concurrentAttackFamilies,'동시에 시작하는 공격군만 두 개 이하');
 assert.equal(plan.attacks[0].law,'recall','진화의 대표 성질을 우선한다');
 assert.equal(plan.loadout.exactCopy,true);
 assert.equal(plan.copied.healing,false);assert.equal(plan.copied.revive,false);assert.equal(plan.copied.relic,false);
 assert.ok(plan.budget.hostileProjectiles<60,'모바일 적 탄환 예산을 넘지 않는다');
 assert.ok(plan.stats.hitDamageMaxHp<=.13,'한 발 최대 피해 상한');
 assert.equal(plan.tower.arena.shrinks,false,'난이도가 올라가도 이동 공간을 억지로 줄이지 않는다');
}

const blank=mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1,quality:'low'});
assert.equal(blank.attacks[0].law,'pierce','기본 씨앗은 읽기 쉬운 직선 공격부터 시작');
assert.equal(blank.attacks.length,1,'첫 두 층은 대표 패턴 하나만 쓴다');
const reflectStack=mirrorPatternPlan(mirrorBuildSnapshot({forms:new Map([['prism',5],['mirrormaze',5],['gravitymirror',5],['frostkaleidoscope',5],['mirrorguard',5]])}),{floor:10,quality:'low'});
assert.equal(reflectStack.attacks.filter(x=>x.law==='reflect').length,1,'반사 진화를 여러 개 가져도 분신의 반사 공격군은 하나로 합친다');
assert.ok(reflectStack.attacks.length>1,'반사 이외의 진화 성질은 잃지 않는다');
assert.equal(mirrorPatternPlan(snapshot,{floor:3}).concurrentAttackFamilies,2,'3층부터 두 공격군을 같은 전투에 운용한다');
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
assert.equal(MIRROR_BREAK.crackGoal,3);assert.ok(MIRROR_BREAK.breakDuration>=2);assert.ok(MIRROR_BREAK.damageMultiplier>1);
assert.equal(MIRROR_ATTACK_CADENCE.autoFire,true);assert.equal(MIRROR_ATTACK_CADENCE.manualAttackButton,false);assert.equal(MIRROR_ATTACK_CADENCE.visibleReadyRing,true);
assert.equal(mirrorAttackCooldown(1),.9);assert.equal(mirrorAttackCooldown(.1),MIRROR_ATTACK_CADENCE.minimumCooldown,'아무리 빨라도 최소 발사 간격 유지');
assert.ok(refundMirrorAttackCooldown(.9,1)<.9,'완벽 회피가 다음 자동공격을 앞당긴다');
assert.equal(refundMirrorAttackCooldown(.2,3),0,'여러 번 잘 피하면 즉시 발사 준비');
assert.equal(MIRROR_TRIAL_PROTOTYPE.placement,'separate-challenge');
assert.equal(MIRROR_TRIAL_PROTOTYPE.localSliceFloors,10);
assert.equal(MIRROR_TRIAL_PROTOTYPE.released,false,'검증 전에는 본편 메뉴에 공개하지 않는다');

console.log('거울의 탑: 완전 복제·자동공격 쿨타임·회피 환급·자유 이동·층별 행동·탄환 예산 통과');
