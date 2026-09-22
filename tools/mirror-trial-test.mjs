import assert from 'node:assert/strict';
import {mirrorDifficultyFloor,MIRROR_ATTACK_CADENCE,MIRROR_BREAK,MIRROR_COPY_RULES,MIRROR_TOWER,MIRROR_TRIAL_LIMITS,MIRROR_TRIAL_PROTOTYPE,clearMirrorCheckpoint,mirrorAttackCooldown,mirrorBuildSnapshot,mirrorCloneLoadout,mirrorFloorRules,mirrorPatternPlan,readMirrorCheckpoint,refundMirrorAttackCooldown,normalizeMirrorRecord,recordMirrorResult,writeMirrorCheckpoint} from '../src/mirror-trial.js';

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
assert.ok(MIRROR_COPY_RULES.copied.includes('projectileArt'),'분신은 플레이어와 같은 법칙 탄환 외형을 복사한다');
assert.ok(!MIRROR_COPY_RULES.copied.includes('relic'));assert.ok(MIRROR_COPY_RULES.excluded.includes('potions'));

for(const quality of ['low','normal']){
 const plan=mirrorPatternPlan(snapshot,{floor:12,quality});
 assert.ok(plan.attacks.length>=2,'고른 성질을 대표 두 개로 잘라내지 않는다');
 assert.ok(plan.concurrentAttackFamilies<=MIRROR_TRIAL_LIMITS.concurrentAttackFamilies,'동시에 시작하는 공격군만 두 개 이하');
 assert.equal(plan.attacks[0].law,'recall','진화의 대표 성질을 우선한다');
 assert.equal(plan.loadout.exactCopy,true);
 assert.equal(plan.copied.healing,false);assert.equal(plan.copied.revive,false);assert.equal(plan.copied.relic,false);
 assert.ok(plan.budget.hostileProjectiles<=84,'모바일 적 탄환 예산을 넘지 않는다(7발 부채꼴 기준, 묶음 그리기)');
 assert.ok(plan.stats.hitDamageMaxHp<=.15,'한 발 최대 피해 상한');
 assert.equal(plan.tower.arena.shrinks,false,'난이도가 올라가도 이동 공간을 억지로 줄이지 않는다');
}

const blank=mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1,quality:'low'});
assert.equal(blank.attacks[0].law,'pierce','기본 씨앗은 읽기 쉬운 직선 공격부터 시작');
assert.equal(blank.attacks.length,1,'첫 두 층은 대표 패턴 하나만 쓴다');
const reflectStack=mirrorPatternPlan(mirrorBuildSnapshot({forms:new Map([['prism',5],['mirrormaze',5],['gravitymirror',5],['frostkaleidoscope',5],['mirrorguard',5]])}),{floor:10,quality:'low'});
assert.equal(reflectStack.attacks.filter(x=>x.law==='reflect').length,1,'반사 진화를 여러 개 가져도 분신의 반사 공격군은 하나로 합친다');
assert.ok(reflectStack.attacks.length>1,'반사 이외의 진화 성질은 잃지 않는다');
// 2026-09-22: 모든 층을 두 층 위 난이도로(1층 = 예전 3층).
assert.equal(mirrorDifficultyFloor(1),3);assert.equal(mirrorDifficultyFloor(10),12);
assert.equal(mirrorPatternPlan(snapshot,{floor:1}).concurrentAttackFamilies,2,'1층부터 두 공격군을 같은 전투에 운용한다(예전 3층)');
{const first=mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1}).stats,top=mirrorPatternPlan(mirrorBuildSnapshot(),{floor:10}).stats;assert.equal(first.hpScale,2.67,'1층 분신 체력 = 예전 3층');assert.ok(top.moveSpeedScale<=1.18&&top.attackSpeedScale<=1.38&&top.hitDamageMaxHp<=.13,'위층은 기존 상한 안');}
assert.ok(mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1}).stats.moveSpeedScale>=.88,'첫 층부터 빠릿한 이동 속도를 가진다');
assert.ok(mirrorPatternPlan(mirrorBuildSnapshot(),{floor:1}).stats.attackSpeedScale>=1,'첫 층부터 공격 준비가 늘어지지 않는다');
assert.equal(mirrorFloorRules(4).movement.feint,false);assert.equal(mirrorFloorRules(5).movement.feint,true,'5층부터 방향 속임수를 쓴다(예전 7층)');
assert.equal(mirrorFloorRules(5).chainLength,2);assert.equal(mirrorFloorRules(6).chainLength,3,'6층부터 세 번째 약한 연계까지 쓴다(예전 8층)');
assert.equal(mirrorFloorRules(20).chainLength,3,'후반은 탄 수 대신 패턴 연결이 늘어난다');
assert.equal(mirrorFloorRules(21).endless,false);
assert.equal(mirrorFloorRules(100).milestone,true);
assert.equal(mirrorFloorRules(11).arena.solidObstacles,2);
assert.equal(mirrorFloorRules(61).arena.solidObstacles,4);
assert.ok(mirrorPatternPlan(snapshot,{floor:100}).stats.hpScale>mirrorPatternPlan(snapshot,{floor:10}).stats.hpScale,'십 층마다 분신이 완만하게 강해진다');
assert.ok(mirrorPatternPlan(snapshot,{floor:100}).stats.hitDamageMaxHp<=.15,'100층도 한 발 피해는 최대 생명력 15% 아래');
assert.equal(MIRROR_BREAK.crackGoal,3);assert.ok(MIRROR_BREAK.breakDuration>=2);assert.ok(MIRROR_BREAK.damageMultiplier>1);
assert.equal(MIRROR_ATTACK_CADENCE.autoFire,true);assert.equal(MIRROR_ATTACK_CADENCE.manualAttackButton,false);assert.equal(MIRROR_ATTACK_CADENCE.visibleReadyRing,true);
assert.equal(mirrorAttackCooldown(1),.9);assert.equal(mirrorAttackCooldown(.1),MIRROR_ATTACK_CADENCE.minimumCooldown,'아무리 빨라도 최소 발사 간격 유지');
assert.ok(refundMirrorAttackCooldown(.9,1)<.9,'완벽 회피가 다음 자동공격을 앞당긴다');
assert.equal(refundMirrorAttackCooldown(.2,3),0,'여러 번 잘 피하면 즉시 발사 준비');
assert.equal(MIRROR_TRIAL_PROTOTYPE.placement,'separate-challenge');
assert.equal(MIRROR_TRIAL_PROTOTYPE.localSliceFloors,100);
assert.equal(MIRROR_TRIAL_PROTOTYPE.released,true,'거울의 탑은 본편 메뉴에 공개한다');
const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
assert.deepEqual(normalizeMirrorRecord({bestFloor:999,clears:-2,perfectDodges:4}),{version:1,bestFloor:100,clears:0,perfectDodges:4});
assert.equal(recordMirrorResult(storage,{floor:6,perfectDodges:9}).bestFloor,6);
assert.equal(recordMirrorResult(storage,{floor:4,won:true,perfectDodges:3}).clears,1,'낮은 재도전도 최고층은 낮추지 않고 완주만 더한다');
const saveStore={...storage,removeItem:key=>memory.delete(key)};
const checkpoint={floor:11,hp:62,levels:{reflect:3},forms:{},rules:['reflect'],mutated:['reflect'],choicesTaken:10,choiceKills:0,kills:80,elapsed:200,perfectDodges:8};
assert.equal(writeMirrorCheckpoint(saveStore,checkpoint),true);
assert.equal(readMirrorCheckpoint(saveStore).floor,11);
assert.equal(writeMirrorCheckpoint(saveStore,{...checkpoint,floor:12}),false,'열 층을 넘긴 입구에만 저장');
assert.equal(clearMirrorCheckpoint(saveStore),true);
assert.equal(readMirrorCheckpoint(saveStore),null);

console.log('거울의 탑: 완전 복제·자동공격 쿨타임·회피 환급·자유 이동·층별 행동·탄환 예산 통과');
