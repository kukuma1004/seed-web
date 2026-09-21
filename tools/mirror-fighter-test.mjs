import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {MIRROR_ARENA,MIRROR_PANELS,MIRROR_PROJECTILE_BASE_SPEED,mirrorAttackSequence,mirrorProjectileSpeed,mirrorSteering,mirrorVolley,reflectMirrorPanels,tickMirrorFighter} from '../src/mirror-fighter.js';
import {mirrorPatternPlan} from '../src/mirror-trial.js';

assert.equal(MIRROR_ARENA.shape,'circle');
assert.equal(MIRROR_ARENA.radius,13,'기존 7.6 원형방보다 넓은 도주 공간');
assert.ok(Math.hypot(MIRROR_ARENA.start.x,MIRROR_ARENA.start.z)>6,'전투 시작부터 생각할 거리 확보');

const open=mirrorSteering({mirrorX:0,mirrorZ:-5,playerX:0,playerZ:5,strafeSign:1});
assert.ok(open.z>0,'멀리 있는 씨앗에게 접근');
assert.ok(Math.abs(open.x)>.1,'직선 추격만 하지 않고 횡이동');

const edge=mirrorSteering({mirrorX:0,mirrorZ:0,playerX:11.3,playerZ:0,strafeSign:1});
assert.ok(edge.edgeCut>.5,'외곽 도주를 감지');
assert.ok(edge.x>.8,'외곽에서는 도주선 쪽으로 길을 자름');

assert.equal(mirrorVolley('pierce',1).length,1);
assert.equal(mirrorVolley('split',3).length,3);
assert.ok(mirrorVolley('orbit',20).length<=8,'원형 탄막도 모바일 상한 유지');
assert.equal(mirrorVolley('reflect',4)[0].bounces,2);
assert.equal(mirrorVolley('recall',4)[0].recall,true);
assert.equal(mirrorVolley('burst',4)[0].burst,true,'폭발 조합은 빗나가도 폭발을 남긴다');
assert.equal(mirrorVolley('gravity',4)[0].gravity,true,'중력 조합은 플레이어를 끌어당기는 우물을 남긴다');
assert.ok(MIRROR_PROJECTILE_BASE_SPEED>=10&&mirrorProjectileSpeed(10)>mirrorProjectileSpeed(1),'거울 탄환은 첫 층부터 빠르고 층에 따라 조금 더 빨라진다');

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),mirrorBoltSource=main.slice(main.indexOf('function mirrorBolt'),main.indexOf('function mirrorPerfectDodge'));
assert.doesNotMatch(mirrorBoltSource,/enemyBolt\(/,'거울 분신은 공통 보스 구체를 쓰지 않는다');
assert.match(mirrorBoltSource,/projectileGeometry\(projectileGeos,law\)[\s\S]*mats\['shot-'\+law\][\s\S]*applyProjectileTheme/,'거울 분신은 플레이어와 같은 탄환 형상·재질·테마를 쓴다');

for(const panel of MIRROR_PANELS)assert.ok(Math.hypot(panel.x,panel.z)+Math.max(panel.w,panel.d)/2<MIRROR_ARENA.radius,'반사판은 넓은 전장 안쪽에 둔다');
const previous={x:-7,z:0},next={x:-4,z:0},direction={x:1,z:0};
assert.equal(reflectMirrorPanels(previous,next,direction),true,'빠른 탄환도 얇은 반사판을 건너뛰지 않는다');
assert.ok(direction.x<0&&next.x<-5.4,'반사판 법선으로 남은 이동 거리를 되돌린다');

const attacks=[{law:'reflect',name:'거울 반사'},{law:'frost',name:'서리 부채'},{law:'gravity',name:'중력 우물'}];
assert.equal(mirrorAttackSequence({attacks,concurrentAttackFamilies:1},0).length,1,'초반은 한 공격만 읽게 한다');
const linked=mirrorAttackSequence({attacks,concurrentAttackFamilies:2},0);
assert.deepEqual(linked.map(x=>x.attack.law),['reflect','frost'],'연계는 서로 다른 두 공격군을 순서대로 쓴다');
assert.ok(linked[1].delay>=.25&&linked[1].damageScale<1,'두 번째 공격은 짧게 늦추고 피해를 낮춘다');
const lateChain=mirrorAttackSequence({attacks,concurrentAttackFamilies:2,chainLength:3},0);
assert.equal(lateChain.length,3,'후반층은 동시 탄막을 늘리지 않고 세 번째 순차 연계를 붙인다');
assert.ok(lateChain[2].delay>lateChain[1].delay&&lateChain[2].damageScale<lateChain[1].damageScale);

const simulationPlan=mirrorPatternPlan({
  laws:[{id:'reflect',level:2},{id:'frost',level:2},{id:'gravity',level:2}],
  forms:[{id:'gravitymirror',level:1,laws:['reflect','gravity']},{id:'frostkaleidoscope',level:1,laws:['frost','reflect']}],
},{floor:10});
const simulated={
  g:new THREE.Group(),floor:10,plan:simulationPlan,hit:0,turnTimer:0,strafeSign:1,dir:new THREE.Vector3(),faceDir:new THREE.Vector3(),feintDir:new THREE.Vector3(),dashDir:new THREE.Vector3(),dashTime:0,
  broken:0,state:'stalk',timer:0,attackCD:.1,shotIndex:0,attackIndex:0,queuedAttacks:[],readyRing:{material:new THREE.MeshBasicMaterial(),scale:new THREE.Vector3(1,1,1)},moveName:'',motion:{update(){}},
};
let simulatedShots=0;
for(let frame=0;frame<10_000;frame++){
  tickMirrorFighter(simulated,1/60,frame/60,{player:{x:Math.sin(frame/180)*7,z:Math.cos(frame/220)*7},camera:null,constrain(position){const length=Math.hypot(position.x,position.z);if(length>12.4){position.x*=12.4/length;position.z*=12.4/length;}},fire(){simulatedShots+=1;}});
  assert.ok(Number.isFinite(simulated.g.position.x)&&Number.isFinite(simulated.g.position.z),'장시간 전투에서도 분신 위치가 유효하다');
}
assert.ok(simulatedShots>20,'10층 분신이 장시간 멈추지 않고 연계 공격한다');
assert.ok(simulated.queuedAttacks.length<=2,'지연 공격 큐가 무한히 쌓이지 않는다');

console.log('거울 분신: 넓은 원형 전장, 통과형 반사판, 거리 조절, 외곽 차단, 단계 연계와 경량 탄막 통과');
