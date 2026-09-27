import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from 'three';
import {MIRROR_ARENA,MIRROR_BURST,MIRROR_PANELS,MIRROR_PROJECTILE_BASE_SPEED,mirrorAttackSequence,mirrorCoverWaypoint,mirrorFloorObstacles,mirrorFormVolley,mirrorProjectileSpeed,mirrorSteering,mirrorVolley,reflectMirrorPanels,tickMirrorFighter} from '../src/mirror-fighter.js';
import {MIRROR_GUARD,MIRROR_DUEL,mirrorBuildSnapshot,mirrorDamageAllowed,mirrorFloorRules,mirrorPatternPlan,refillMirrorGuard} from '../src/mirror-trial.js';

assert.equal(MIRROR_ARENA.shape,'circle');
assert.equal(MIRROR_ARENA.radius,13,'기존 7.6 원형방보다 넓은 도주 공간');
assert.ok(Math.hypot(MIRROR_ARENA.start.x,MIRROR_ARENA.start.z)>6,'전투 시작부터 생각할 거리 확보');
assert.equal(mirrorFloorObstacles(2).length,0);
assert.equal(mirrorFloorObstacles(3).length,2,'초반 결투를 읽은 뒤 엄폐 전술을 배운다');
assert.equal(mirrorFloorObstacles(11).length,2);
assert.equal(mirrorFloorObstacles(31).length,3);
assert.equal(mirrorFloorObstacles(61).length,4);

const open=mirrorSteering({mirrorX:0,mirrorZ:-5,playerX:0,playerZ:5,strafeSign:1});
assert.ok(open.z>0,'멀리 있는 씨앗에게 접근');
assert.ok(Math.abs(open.x)>.1,'직선 추격만 하지 않고 횡이동');

const edge=mirrorSteering({mirrorX:0,mirrorZ:0,playerX:11.3,playerZ:0,strafeSign:1});
assert.ok(edge.edgeCut>.5,'외곽 도주를 감지');
assert.ok(edge.x>.8,'외곽에서는 도주선 쪽으로 길을 자름');

// 2026-09-22: 씨앗과 분신 모두 기관총처럼 7발 연사 → 장전(공전은 둘레 7~8발을 차례로).
for(const law of ['pierce','split','chain','burst','reflect','recall','frost','gravity'])assert.equal(mirrorVolley(law,3).length,7,`${law} 7발`);
assert.ok(mirrorVolley('pierce',3).every(spec=>Math.abs(spec.angle)<=.06),'연사는 부채꼴이 아니라 조준선 근처로 모인다');
assert.equal(MIRROR_BURST.shots,7);assert.ok(MIRROR_BURST.interval>=.05&&MIRROR_BURST.interval<=.1&&MIRROR_BURST.followDamage<.3);
assert.ok(mirrorVolley('orbit',1).length>=7&&mirrorVolley('orbit',20).length<=8,'원형 탄막 7~8발, 모바일 상한 유지');
assert.equal(mirrorVolley('reflect',4)[0].bounces,1,'반사 연사는 한 번만 튕겨 다음 공격과 겹치지 않는다');
assert.equal(mirrorVolley('recall',4)[0].recall,true);
assert.equal(mirrorVolley('burst',4)[0].burst,true,'폭발 조합은 빗나가도 폭발을 남긴다');
assert.equal(mirrorVolley('gravity',4)[0].gravity,true,'중력 조합은 플레이어를 끌어당기는 우물을 남긴다');
{const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/if\(mirrorSession\)mirrorBurst=\{left:MIRROR_BURST\.shots/,'씨앗도 거울의 탑에서 7발 연사');
 assert.match(main,/shootCD=mirrorSession\?mirrorAttackCooldown\(\)\+MIRROR_BURST\.shots\*MIRROR_BURST\.interval/,'연사가 끝난 뒤 장전 시간이 따로 있다');
 assert.match(main,/if\(follow\)damageEnemy\(e,shotDamage\*MIRROR_BURST\.followDamage/,'같은 연사의 이어지는 명중은 약하게');
 assert.match(main,/!p\.fragment&&!follow&&shots\.length<MAX_SHOTS/,'이어지는 명중은 분열 조각을 만들지 않는다');
 assert.match(main,/mirrorSession\?Math\.max\(viewLayout\.followZ,MIRROR_VIEW\.followZ\)/,'거울의 탑 카메라는 씨앗을 더 따라간다');}
// 2026-09-22: 어떤 판이든 일시정지에서 나갈 수 있다(거울의 탑은 버튼이 숨겨져 있었고, 실험실은 저장 기록이 없어 멈춰 있었다).
{const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(main,/\$\('#save-exit'\),Boolean\(mirrorSession\)/,'거울의 탑에서도 나가기 버튼이 보인다');
 assert.match(main,/if\(developerRun\|\|mirrorSession\)\{leavePausedRun\(\);return;\}/,'저장하지 않는 판은 바로 나간다');
 assert.match(main,/!readCheckpoint\(actStore\(\)\)&&!exitWithoutSaveArmed/,'저장 기록이 없어도 두 번째에는 나간다');}
assert.ok(MIRROR_PROJECTILE_BASE_SPEED>=10&&mirrorProjectileSpeed(10)>mirrorProjectileSpeed(1),'거울 탄환은 첫 층부터 빠르고 층에 따라 조금 더 빨라진다');

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),mirrorBoltSource=main.slice(main.indexOf('function mirrorBolt'),main.indexOf('function mirrorPerfectDodge'));
assert.doesNotMatch(mirrorBoltSource,/enemyBolt\(/,'거울 분신은 공통 보스 구체를 쓰지 않는다');
assert.match(mirrorBoltSource,/law=Object\.hasOwn\(LAWS,spec\.law\)[\s\S]*applyProjectileTheme\(ob,law,combatTheme/,'거울 분신은 플레이어 법칙과 테마를 복제한다');
{
 const enemyShots=[],context={THREE,mirrorSession:{floor:10},qualityLevel:0,enemyShots,mirrorFloorRules,LAWS:{reflect:{},pierce:{},frost:{}},maxPlayerHp:()=>100,applyProjectileTheme(){},combatTheme:'seed',enemyBounces:n=>Math.max(0,Number(n)||0),mirrorProjectileSpeed};
 const emit=runInNewContext(`${mirrorBoltSource}\nmirrorBolt;`,context),pos=new THREE.Vector3(),dir=new THREE.Vector3(0,0,1);
 emit(pos,dir,{law:'pierce',bounces:1});
 assert.equal(enemyShots[0].law,'pierce','관통 외형을 가진 반사 진화도 주 법칙은 보존한다');
 assert.equal(enemyShots[0].mirrorReflecting,true);assert.equal(enemyShots[0].life,3.2,'반사 진화의 수명도 짧게 제한한다');
 enemyShots[0].bounces=0;
 for(let i=0;i<23;i++)emit(pos,dir,{law:i%2?'reflect':'pierce',bounces:1});
 assert.equal(enemyShots.length,24,'반사를 다 쓴 진화탄도 살아 있는 동안 같은 표시 예산을 차지한다');
 emit(pos,dir,{law:'pierce',bounces:1});emit(pos,dir,{law:'reflect',bounces:0});
 assert.equal(enemyShots.length,24,'주 법칙과 상관없이 반사군은 24발을 넘기지 않는다');
 emit(pos,dir,{law:'frost'});assert.equal(enemyShots.length,25,'비반사 법칙은 남은 공통 예산을 쓸 수 있다');assert.equal(enemyShots.at(-1).life,5);assert.equal(enemyShots.at(-1).mirrorReflecting,false);
 enemyShots[0].life=0;emit(pos,dir,{law:'pierce',bounces:1});assert.equal(enemyShots.length,26,'수명이 끝난 반사탄은 반사 예산에서 제외한다');
 const limit=mirrorFloorRules(10,{quality:'low'}).budget.hostileProjectiles;
 while(enemyShots.length<limit)emit(pos,dir,{law:'frost'});
 emit(pos,dir,{law:'frost'});assert.equal(enemyShots.length,limit,'반사 이외의 탄도 전체 저품질 예산을 넘지 않는다');
 context.mirrorSession=null;enemyShots.length=0;emit(pos,dir,{law:'pierce'});assert.equal(enemyShots.length,0,'거울 전투 바깥에서는 분신 탄을 만들지 않는다');
}
assert.match(main,/projectileSprites\.sync\(projectileBodyList,enemyShots\)/,'거울 분신 탄도 같은 2D 탄환 렌더러를 사용한다');

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
const evolved=mirrorBuildSnapshot({levels:new Map([['pierce',2],['gravity',1]]),forms:new Map([['gravitystake',1]])});
assert.ok(evolved.forms[0].laws.includes('gravity'),'진화에 사용한 모든 법칙을 복사한다');
const evolvedPlan=mirrorPatternPlan(evolved,{floor:1});
assert.equal(evolvedPlan.attacks[0].formId,'gravitystake','분신은 플레이어 진화를 첫 공격으로 사용한다');
const copiedStake=mirrorFormVolley(evolvedPlan.attacks[0],1,0);
assert.ok(copiedStake.some(shot=>shot.gravity)&&copiedStake.length<=5,'중력 말뚝의 좁은 창선과 끌림을 제한된 탄수로 함께 쓴다');
const copiedMirror=mirrorFormVolley({law:'reflect',laws:['reflect','gravity'],formId:'gravitymirror'},1,0);
assert.ok(copiedMirror.some(shot=>shot.gravity)&&copiedMirror.every(shot=>shot.bounces>=1),'중력 거울은 반사와 중력을 함께 쓴다');
const guard={maxHp:500,broken:0,damageAllowance:500*MIRROR_GUARD.burst};
assert.equal(mirrorDamageAllowed(guard,500),60,'중력 말뚝 한 방으로 분신을 지울 수 없다');
assert.equal(mirrorDamageAllowed(guard,500),0,'한 프레임 추가 피해도 허용량을 넘지 않는다');
refillMirrorGuard(guard,1);assert.equal(Math.round(mirrorDamageAllowed(guard,500)),60,'공격 가능량은 시간에 따라 다시 찬다');
guard.broken=1;guard.damageAllowance=guard.maxHp*MIRROR_GUARD.breakBurst;
assert.equal(mirrorDamageAllowed(guard,500),120,'정확한 회피로 거울을 깨면 큰 피해 창이 열린다');

// 분신 연사: 공격 하나가 한 번에 7발이 아니라 interval마다 한 발씩 나간다.
{
  const plan=mirrorPatternPlan({laws:[{id:'pierce',level:2}],forms:[]},{floor:1});
  const clone={g:new THREE.Group(),floor:1,plan,hit:0,turnTimer:1,strafeSign:1,dir:new THREE.Vector3(),faceDir:new THREE.Vector3(),feintDir:new THREE.Vector3(),dashDir:new THREE.Vector3(),dashTime:0,
    broken:0,state:'tell',timer:0,attackCD:5,shotIndex:0,attackIndex:0,queuedAttacks:[{attack:plan.attacks[0],delay:0,damageScale:1}],bursts:[],readyRing:{material:new THREE.MeshBasicMaterial(),scale:new THREE.Vector3(1,1,1)},moveName:'',motion:{update(){}}};
  let fired=0;const hooks={player:{x:0,z:8},camera:null,constrain(){},fire(){fired++;},hit(){}};
  tickMirrorFighter(clone,1/60,0,hooks);assert.equal(fired,1,'연사 첫 발만 바로 나간다');
  for(let i=0;i<6;i++)tickMirrorFighter(clone,MIRROR_BURST.interval,i,hooks);
  assert.equal(fired,MIRROR_BURST.shots,'interval마다 한 발씩, 모두 7발');
  clone.bursts.push({clock:0,law:'pierce',specs:[{angle:0},{angle:0}]});clone.broken=1;tickMirrorFighter(clone,1/60,9,hooks);
  assert.equal(clone.bursts.length,0,'거울이 깨지면 남은 연사는 멈춘다');
}
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
assert.ok(simulated.queuedAttacks.length<=3,'지연 공격 큐는 후반 3연계 안에서 멈춘다');

function duelFixture(floor=1){
 const plan=mirrorPatternPlan({laws:[{id:'reflect',level:2},{id:'pierce',level:2},{id:'frost',level:2}],forms:[]},{floor});
 return {g:new THREE.Group(),floor,plan,maxHp:500,hp:500,damageAllowance:60,hit:0,turnTimer:1,strafeSign:1,dir:new THREE.Vector3(0,0,1),faceDir:new THREE.Vector3(),feintDir:new THREE.Vector3(),dashDir:new THREE.Vector3(),dashTime:0,broken:0,state:'stalk',timer:0,attackCD:.2,shotIndex:0,attackIndex:0,queuedAttacks:[],bursts:[],readyRing:{material:new THREE.MeshBasicMaterial(),scale:new THREE.Vector3(1,1,1)},motion:{update(){}}};
}
{
 const retreat=mirrorSteering({mirrorX:0,mirrorZ:0,playerX:0,playerZ:5,reloading:true});
 assert.ok(retreat.z<0,'장전 중에는 공격 사거리 안에서 물러나 다음 진입을 준비한다');
 const inward=mirrorSteering({mirrorX:12,mirrorZ:0,playerX:10,playerZ:0});assert.ok(inward.x<0,'벽에 붙으면 안쪽으로 복귀한다');
 const cover=[{x:0,z:0,w:1.25,d:1.65}];
 const waypoint=mirrorCoverWaypoint({x:-3,z:0},{x:3,z:0},cover,1);
 assert.ok(waypoint&&Math.abs(waypoint.z)>cover[0].d/2+.7,'몸통이 걸리지 않는 모서리 우회점을 고른다');
 assert.equal(mirrorCoverWaypoint({x:-3,z:3},{x:3,z:3},cover),null,'열린 이동 경로에는 우회가 없다');
 const reverseNext={x:4,z:0},reverseDir={x:-1,z:0};
 assert.ok(reflectMirrorPanels({x:7,z:0},reverseNext,reverseDir));assert.ok(reverseDir.x>0&&reverseNext.x>5.4,'반대 방향에서도 반사판 바깥으로 튕긴다');
}
{
 const e=duelFixture(100);e.state='tell';e.timer=.18;e.queuedAttacks=[{attack:e.plan.attacks[0],delay:0,damageScale:1}];
 let bullets=0;const hooks={player:{x:8,z:0},constrain(){},fire(){bullets++;}};
 tickMirrorFighter(e,.08,0,hooks);assert.ok(Math.abs(e.dir.x)<1e-8,'확정 조준 구간에는 씨앗이 움직여도 방향을 바꾸지 않는다');
 tickMirrorFighter(e,.12,.12,hooks);assert.equal(bullets,1,'첫 탄은 예고 방향으로 발사된다');
 const before=e.dir.clone();tickMirrorFighter(e,1/60,.14,hooks);
 assert.ok(before.angleTo(e.dir)<=e.plan.tower.movement.aimRate/60+.0001,'연사 추적은 순간 회피를 따라 순간회전하지 않는다');
 const observedX=e.observedPlayer.x;hooks.player.x=-8;tickMirrorFighter(e,.01,.15,hooks);assert.equal(e.observedPlayer.x,observedX,'다음 반응 주기 전에는 새 이동을 읽지 않는다');
 const beforeStall=bullets;tickMirrorFighter(e,.4,.55,hooks);assert.equal(bullets-beforeStall,1,'긴 프레임 뒤에도 한 프레임 한 발 상한');
 e.broken=1;tickMirrorFighter(e,1/60,.57,hooks);assert.equal(e.queuedAttacks.length,0);assert.equal(e.bursts.length,0);assert.equal(e.dashTime,0,'깨짐은 연계와 돌진 모두 취소한다');
}
{
 const e=duelFixture(100);let shots=0,peakQueue=0,reloads=0,reloadShots=0,lastShotTime=-1;
 const dt=1/60;
 for(let frame=0;frame<3600;frame++){
  const time=frame*dt,wasReload=e.state==='stalk'&&e.attackCD>dt,old=e.g.position.clone(),dash=e.dashTime>0;
  tickMirrorFighter(e,dt,time,{player:{x:Math.sin(time)*8,z:Math.cos(time*.7)*8},constrain(p){const len=Math.hypot(p.x,p.z);if(len>12.3){p.x*=12.3/len;p.z*=12.3/len;}},fire(){shots++;if(wasReload)reloadShots++;assert.notEqual(time,lastShotTime,'한 프레임에 연사가 겹치지 않는다');lastShotTime=time;}});
  peakQueue=Math.max(peakQueue,e.bursts.length);if(wasReload)reloads++;
  if(!dash)assert.ok(old.distanceTo(e.g.position)<=MIRROR_DUEL.maximumMoveSpeed*dt+.0001,'100층에서도 보행 속도가 무제한 증가하지 않는다');
 }
 assert.ok(shots>200&&reloads>200,'긴 전투에서 압박과 장전 기회가 모두 계속 생긴다');assert.equal(reloadShots,0,'장전 표시 중에는 연사 큐에서 몰래 탄이 나오지 않는다');assert.ok(peakQueue<=1);
 console.log(`Mirror floor 100 / 60 s: ${shots} shots, peak burst queue ${peakQueue}, ${(reloads*dt).toFixed(2)} s visible reload, ${reloadShots} reload shots.`);
}

// The actual collision hook must be called along a dash, not just at its end.
{
 const e=duelFixture(3);e.g.position.set(-1.7,0,0);e.dashTime=.3;e.dashDir.set(1,0,0);let collisions=0;
 tickMirrorFighter(e,.25,0,{player:{x:8,z:0},obstacles:[{x:0,z:0,w:1,d:3}],constrain(p){collisions++;if(p.x>-.85&&p.x<.85&&Math.abs(p.z)<1.85)p.x=-.85;},fire(){}});
 assert.ok(collisions>1&&e.g.position.x<=-.85,'돌진이 얇은 엄폐물을 건너뛰지 않는다');
}

console.log('거울 분신: 넓은 원형 전장, 통과형 반사판, 거리 조절, 외곽 차단, 단계 연계와 경량 탄막 통과');
