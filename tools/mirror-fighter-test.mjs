import assert from 'node:assert/strict';
import {MIRROR_ARENA,mirrorSteering,mirrorVolley} from '../src/mirror-fighter.js';

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

console.log('거울 분신: 넓은 원형 전장, 거리 조절, 외곽 차단, 경량 탄막 통과');
