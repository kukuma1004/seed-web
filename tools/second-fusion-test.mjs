import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FORMS,SECOND_FORMS,SECOND_BATCHES,ALL_FORMS,CURATED_FORMS,secondFormOf,formStats,formUpgradeLine,isSecondHeldBack} from '../src/forms.js';
import {secondFusionOptions,secondFusionLevel,fuseSecond,slotsUsed,effectiveLevels} from '../src/progression.js';
import {createFormCombat} from '../src/form-combat.js';
import {validCheckpoint} from '../src/run-save.js';
import {secondFusionOf,FIRST_FUSIONS} from '../src/combo-catalog.js';
import {averageDps,bossDps} from './balance-sim.mjs';

// 2026-09-22 손제작 재융합. 주 공격 = 부모 한쪽의 공격 그대로, 후속 = 다른 부모의 대표 효과가 조건을 채울 때.
// 1묶음(20260922-r1) 공명형 5: 두 부모가 법칙 하나를 공유. 2묶음(20260922-r2) 교차형 5: 네 법칙이 모두 다르다.
// 3묶음(20260923-r3)·4묶음(20260923-r4) 공명 1 · 교차 4.
const entries=Object.values(SECOND_FORMS);
assert.equal(entries.length,20,'네 묶음 스무 개');
const batchOf=id=>Object.entries(SECOND_BATCHES).find(([,b])=>b.ids.includes(id))?.[0];
assert.deepEqual(Object.keys(SECOND_BATCHES),['20260922-r1','20260922-r2','20260923-r3','20260923-r4']);
assert.ok(Object.values(SECOND_BATCHES).every(b=>b.ids.length===5),'묶음마다 다섯 개');
assert.ok(entries.every(f=>batchOf(f.id)),'모든 재융합은 한 묶음에 속한다');
assert.ok(entries.every(f=>f.curated&&(batchOf(f.id)==='20260922-r1'?f.family==='resonance':batchOf(f.id)==='20260922-r2'?f.family==='convergence':true)),'1묶음은 공명형, 2묶음은 교차형');
for(const b of ['20260923-r3','20260923-r4'])assert.deepEqual(entries.filter(f=>batchOf(f.id)===b).map(f=>f.family).sort(),['convergence','convergence','convergence','convergence','resonance'],`${b}: 공명 1 · 교차 4`);
assert.equal(new Set(entries.map(f=>f.name)).size,20,'이름이 겹치지 않는다');
assert.ok(entries.every(f=>!f.name.includes('×')),'자동 생성식 "A × B" 이름이 아니다');
// 주 공격 무기: 한 묶음 안에서는 겹치지 않고, 전체 묶음 통틀어 한 무기는 최대 두 번(공개 1차 융합이 20개뿐이라).
for(const id of Object.keys(SECOND_BATCHES))assert.equal(new Set(SECOND_BATCHES[id].ids.map(sid=>SECOND_FORMS[sid].main)).size,5,`${id}: 묶음 안 주 공격 무기 중복 없음`);
{const uses=new Map();for(const f of entries)uses.set(f.main,(uses.get(f.main)||0)+1);assert.ok([...uses.values()].every(n=>n<=2),'한 무기가 주 공격으로 세 번 이상 쓰이지 않는다');}
for(const form of entries){
  assert.equal(form.parts.length,2,form.id);
  assert.ok(form.parts.every(id=>Object.hasOwn(FORMS,id)),`${form.id}: 두 부모는 공개 1차 융합`);
  assert.equal(form.main,form.parts[0]);assert.equal(form.followParent,form.parts[1]);
  const [a,b]=form.parts.map(id=>CURATED_FORMS[id].requires);
  if(form.family==='resonance')assert.ok(a.some(law=>b.includes(law)),`${form.id}: 공명형은 두 부모가 법칙 하나를 공유`);
  else{assert.ok(!a.some(law=>b.includes(law)),`${form.id}: 교차형은 두 부모의 법칙이 겹치지 않음`);assert.equal(new Set([...a,...b]).size,4);}
  assert.ok(form.desc&&form.strength&&form.weakness,`${form.id}: 정체성·강점·약점`);
  const stats=formStats(form.id,4),main=formStats(form.main,4);
  assert.equal(stats.damage,main.damage,`${form.id}: 주 공격 피해는 부모 그대로(곱하지 않음)`);
  assert.ok(['blast','arc','nova'].includes(stats.follow.effect)&&['nth','kill','return'].includes(stats.follow.trigger));
  assert.ok(formStats(form.id,5).follow.damage>stats.follow.damage,'후속 효과도 레벨마다 강해진다');
  assert.ok(formUpgradeLine(form.id,4).startsWith('재융합 Lv.4 → 5'));
  const surged=formStats(form.id,4,{surge:true});
  assert.ok(surged.follow.every<=stats.follow.every&&surged.follow.cooldown<=stats.follow.cooldown,'궁극기 동안 후속이 더 자주');
}
// 고정 ID는 조합 목록의 재융합 ID 그대로(저장 호환).
{
  const pair=laws=>[...laws].sort().join('+'),firstByPair=new Map(FIRST_FUSIONS.map(f=>[pair(f.laws),f.id]));
  for(const form of entries){
    const [a,b]=form.parts.map(id=>firstByPair.get(pair(CURATED_FORMS[id].requires)));
    assert.equal(secondFusionOf(a,b).id,form.id,`${form.name}: 조합 목록의 재융합 ID`);
  }
}
// 보류 묶음은 선택지에 안 나온다(live:false). 도감·저장(ALL_FORMS)에는 있다.
assert.ok(Object.values(SECOND_BATCHES).every(b=>b.live===false),'두 묶음 모두 그림·승인 전까지 보류');
for(const form of entries){
  assert.ok(isSecondHeldBack(form.id));
  assert.equal(secondFormOf(...form.parts),null,'보류 중에는 선택지에 없음');
  assert.ok(Object.hasOwn(ALL_FORMS,form.id));
}
assert.equal(secondFusionOptions(new Map([['thunderlance',4],['blastlance',4]])).length,0);

// 두 칸 → 한 칸 압축과 저장(재융합이 공개되면 쓰는 경로). 보류 상태에서는 fuseSecond가 거절한다.
{
  const form=entries[0],held=new Map([[form.parts[0],4],[form.parts[1],7]]);
  assert.equal(secondFusionLevel(held,{id:form.id,from:form.parts}),9,'레벨 = 높은 쪽 + 낮은 쪽/3 올림');
  assert.equal(fuseSecond(held,{id:form.id,from:form.parts}),false,'보류 묶음은 합칠 수 없다');
  for(const law of form.requires)assert.ok(effectiveLevels(new Map(),new Map([[form.id,9]])).has(law),`${law} 법칙은 재융합 안에서도 살아 있다`);
  assert.equal(slotsUsed(new Map(),new Map([[form.id,9]])),1);
  const save={version:1,cycle:0,stage:1,mode:'entry',region:'garden',hp:90,rules:[],mutated:[],kills:20,elapsed:60,forms:{[form.id]:9},wardens:0,austins:0};
  assert.ok(validCheckpoint(save),'재융합은 방 입구 저장에 남는다');
}

// 전투: 주 공격 부모로 싸우고, 후속 효과는 조건을 채울 때만. 후속 적중은 다시 세지 않는다.
const V=THREE.Vector3;
function arena(form,positions,{hp=1e9}={}){
  const foes=positions.map(([x,z],i)=>({type:'swarm',hp,maxHp:hp,dead:false,g:{position:new V(x,0,z)},i,slow:0}));const calls=[];
  const scene=new THREE.Scene(),combat=createFormCombat(scene,{player:{position:new V()},enemies:()=>foes.filter(e=>!e.dead),
    hit:(e,damage,meta)=>{calls.push({damage,...meta});e.hp-=damage;if(e.hp<=0)e.dead=true;return true;},blocked:()=>false,boundary:()=>false,constrain:()=>{},vfx:null});
  combat.set(form.id,4);return {combat,foes,calls,scene};
}
const step=(combat,seconds)=>{for(let t=0;t<seconds;t+=.02)combat.update(.02);};
const byName=name=>entries.find(f=>f.name===name);
for(const name of ['해일 폭창','서리 붕괴','불씨 칼날','서리 씨앗비']){
 const form=byName(name),{combat,scene}=arena(form,[[0,-3]]);
 combat.fire(new V(),new V(0,0,-1));
 const visible=[];scene.traverse(object=>{if(object.userData.curatedSecond===form.id)visible.push(object);});
 assert.ok(visible.length,`${name}: 주 공격이 부모 전용 탄을 그대로 쓰지 않고 재융합 탄을 보인다`);
 assert.ok(visible.every(object=>object.geometry.name===`seed-combo-projectile-${form.id}`));
 combat.clear();
}
{
  // 천둥 폭창: 한 줄 여덟 적을 한 번에 꿰뚫어도 폭발은 한 번(대기시간), 폭발 적중은 폭발 창 이름으로.
  const form=byName('천둥 폭창'),{combat,calls}=arena(form,Array.from({length:8},(_,i)=>[0,-1.5-i*.8]));
  assert.equal(combat.state().active,'thunderlance');assert.equal(combat.state().evolution,form.id);
  combat.fire(new V(),new V(0,0,-1));step(combat,.1);
  assert.equal(combat.state().secondPhase,1,'한 번 던질 때 폭발 한 번');
  assert.ok(calls.some(c=>c.follow&&c.kind==='blastlance'&&c.indirect),'폭발 적중은 다른 부모 이름·간접 피해');
  step(combat,.8);combat.fire(new V(),new V(0,0,-1));step(combat,.1);
  assert.equal(combat.state().secondPhase,2,'다음 창에서 다시 한 번');
  combat.dispose();
}
{
  // 번개 씨앗비: 쓰러뜨렸을 때만 번개. 안 죽는 적에게는 튀지 않는다.
  const form=byName('번개 씨앗비');
  const tough=arena(form,[[0,-1.2],[.6,-1.6],[-.6,-1.6]]);
  for(let i=0;i<4;i++){tough.combat.fire(new V(),new V(0,0,-1));step(tough.combat,.5);}
  assert.equal(tough.combat.state().secondPhase,0,'보스처럼 안 죽는 적에게는 번개가 없다');tough.combat.dispose();
  const weak=arena(form,[[0,-1.2],[.6,-1.8],[-.6,-1.8],[0,-2.6]],{hp:20});
  weak.combat.fire(new V(),new V(0,0,-1));step(weak.combat,.6);
  assert.ok(weak.combat.state().secondPhase>=1,'쓰러뜨린 자리에서 번개가 튄다');
  assert.ok(weak.calls.some(c=>c.follow&&c.kind==='lightningpetal'));weak.combat.dispose();
}
{
  // 불씨 칼날: 나가는 길에는 불씨가 없고, 돌아오는 길의 적중에서만.
  const form=byName('불씨 칼날'),{combat,calls}=arena(form,[[0,-2.5],[.4,-3.2],[-.4,-3.6]]);
  combat.fire(new V(),new V(0,0,-1));step(combat,.4);
  assert.ok(calls.some(c=>c.kind==='returnblade'&&c.phase==='out'));assert.equal(combat.state().secondPhase,0,'나가는 길에는 불씨 없음');
  step(combat,1.6);
  assert.ok(calls.some(c=>c.kind==='returnblade'&&c.phase==='return'),'돌아오는 길 적중');
  assert.ok(combat.state().secondPhase>=1,'돌아오는 길에 불씨');combat.dispose();
}
{
  // 서리꽃 만화경: 냉기가 주변 적을 얼린다(보스·문지기는 제외 규칙은 immovable이 처리).
  const form=byName('서리꽃 만화경'),{combat,foes}=arena(form,Array.from({length:6},(_,i)=>[Math.cos(i)*1.2,-3+Math.sin(i)*1.2]));
  for(let i=0;i<6&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.6);}
  assert.ok(combat.state().secondPhase>=1);assert.ok(foes.some(e=>e.slow>0),'서리꽃이 적을 얼린다');combat.dispose();
}
{
  // 해일 뇌우: 번개가 이어지면 가운데에서 한 번 터진다.
  const form=byName('해일 뇌우'),{combat,calls}=arena(form,Array.from({length:8},(_,i)=>[Math.cos(i*.8)*1.4,-4+Math.sin(i*.8)*1.4]));
  for(let i=0;i<4;i++){combat.fire(new V(),new V(0,0,-1));step(combat,1.3);}
  assert.ok(combat.state().secondPhase>=1);assert.ok(calls.some(c=>c.follow&&c.kind==='stormanchor'));combat.dispose();
}

// 2묶음(교차형): 첫 조합이 만든 자리·궤적에서 둘째 조합의 효과가 터진다.
{
  // 혜성 닻: 닻이 네 번 맞힐 때마다 모인 자리에 혜성(폭발). 폭발 적중은 혜성 화관 이름·간접 피해.
  const form=byName('혜성 닻'),{combat,calls}=arena(form,Array.from({length:6},(_,i)=>[Math.cos(i)*1,-3.5+Math.sin(i)*1]));
  assert.equal(combat.state().active,'stormanchor');
  for(let i=0;i<8&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.7);}
  assert.ok(combat.state().secondPhase>=1,'모인 자리에 혜성');assert.ok(calls.some(c=>c.follow&&c.kind==='comethalo'&&c.indirect));combat.dispose();
}
{
  // 번개 불씨: 나가는 길에는 번개가 없고, 돌아오는 불씨의 적중에서만 튄다.
  const form=byName('번개 불씨'),{combat,calls}=arena(form,[[0,-2.4],[.5,-3],[-.5,-3.3],[0,-3.8]]);
  combat.fire(new V(),new V(0,0,-1));step(combat,.25);
  assert.equal(combat.state().secondPhase,0,'나가는 길에는 번개 없음');
  step(combat,2.2);
  assert.ok(calls.some(c=>c.kind==='returnflare'&&c.phase==='return'),'돌아오는 불씨 적중');
  assert.ok(combat.state().secondPhase>=1&&calls.some(c=>c.follow&&c.kind==='stormcrown'),'돌아오는 길에 번개');combat.dispose();
}
{
  // 서리 붕괴·눈꽃 창: 냉기가 둘레를 얼린다.
  for(const name of ['서리 붕괴','눈꽃 창']){
    const form=byName(name),{combat,foes,calls}=arena(form,Array.from({length:6},(_,i)=>[Math.cos(i)*1.1,-3.2+Math.sin(i)*1.1]));
    for(let i=0;i<10&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.7);}
    assert.ok(combat.state().secondPhase>=1,`${name}: 서리가 터진다`);assert.ok(foes.some(e=>e.slow>0),`${name}: 얼린다`);
    assert.ok(calls.some(c=>c.follow&&c.kind===form.followParent),`${name}: 서리 적중은 다른 부모 이름`);combat.dispose();
  }
}
{
  // 서리 번개꽃: 꽃봉오리가 세 번 맞힐 때마다 번개 꽃잎이 흩어진 적에게 튄다.
  const form=byName('서리 번개꽃'),{combat,calls}=arena(form,Array.from({length:8},(_,i)=>[Math.cos(i*.8)*1.6,-3.6+Math.sin(i*.8)*1.6]));
  for(let i=0;i<10&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.8);}
  assert.ok(combat.state().secondPhase>=1,'번개 꽃잎');assert.ok(calls.some(c=>c.follow&&c.kind==='lightningpetal'));combat.dispose();
}

// 3묶음: 서리 칼날은 돌아오는 길에만, 나머지는 N번째 적중마다.
{
  const form=byName('서리 칼날'),{combat,calls,foes}=arena(form,[[0,-2.5],[.4,-3.2],[-.4,-3.6]]);
  combat.fire(new V(),new V(0,0,-1));step(combat,.4);
  assert.equal(combat.state().secondPhase,0,'나가는 길에는 서리 없음');
  step(combat,1.6);
  assert.ok(combat.state().secondPhase>=1&&calls.some(c=>c.follow&&c.kind==='frostguard'),'돌아오는 길에 서리');assert.ok(foes.some(e=>e.slow>0));combat.dispose();
}
for(const [name,follow] of [['꽃비 폭죽','chainburst'],['서리 연폭','frostbloom'],['꽃잎 폭뢰','blastlance'],['혜성 만화경','comethalo']]){
  const form=byName(name),{combat,calls}=arena(form,Array.from({length:7},(_,i)=>[Math.cos(i*.9)*1.1,-2.4+Math.sin(i*.9)*1.1]));
  for(let i=0;i<12&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.7);}
  assert.ok(combat.state().secondPhase>=1,`${name}: 후속이 터진다`);assert.ok(calls.some(c=>c.follow&&c.kind===follow&&c.indirect),`${name}: 후속 적중은 ${follow} 이름·간접 피해`);combat.dispose();
}

// 4묶음: 붕괴 말뚝(중력 말뚝 강화)은 한 적에게 계속 박을수록 붕괴가 쌓인다. 해일 폭창은 돌아오는 길에만.
{
  const form=byName('붕괴 말뚝'),{combat,calls}=arena(form,[[0,-3]]);
  assert.equal(combat.state().active,'gravitystake');
  for(let i=0;i<8&&combat.state().secondPhase<2;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.8);}
  assert.ok(combat.state().secondPhase>=2,'한 적에게도 붕괴가 거듭 터진다');assert.ok(calls.some(c=>c.follow&&c.kind==='collapse'&&c.indirect));combat.dispose();
}
{
  const form=byName('해일 폭창'),{combat,calls}=arena(form,[[0,-2.4],[.5,-3],[-.5,-3.3]]);
  combat.fire(new V(),new V(0,0,-1));step(combat,.3);
  assert.equal(combat.state().secondPhase,0,'나가는 길에는 폭발 없음');
  step(combat,2.4);
  assert.ok(calls.some(c=>c.kind==='tidepull'&&c.phase==='return')&&combat.state().secondPhase>=1&&calls.some(c=>c.follow&&c.kind==='blastlance'),'돌아오는 길에 폭발');combat.dispose();
}
for(const [name,follow] of [['서리 닻','frostbloom'],['뇌운 붕괴','stormcrown']]){
  const form=byName(name),{combat,calls}=arena(form,Array.from({length:7},(_,i)=>[Math.cos(i*.9)*1.2,-3.2+Math.sin(i*.9)*1.2]));
  for(let i=0;i<12&&combat.state().secondPhase===0;i++){combat.fire(new V(),new V(0,0,-1));step(combat,.8);}
  assert.ok(combat.state().secondPhase>=1&&calls.some(c=>c.follow&&c.kind===follow),`${name}: 후속 발동`);combat.dispose();
}
{
  const form=byName('서리 씨앗비');
  const tough=arena(form,[[0,-1.2],[.6,-1.6]]);for(let i=0;i<4;i++){tough.combat.fire(new V(),new V(0,0,-1));step(tough.combat,.5);}
  assert.equal(tough.combat.state().secondPhase,0,'안 죽는 적에게는 서리 없음');tough.combat.dispose();
  const weak=arena(form,[[0,-1.2],[.6,-1.8],[-.6,-1.8],[0,-2.6]],{hp:20});weak.combat.fire(new V(),new V(0,0,-1));step(weak.combat,.6);
  assert.ok(weak.combat.state().secondPhase>=1&&weak.foes.some(e=>e.slow>0),'쓰러뜨린 자리 서리');weak.combat.dispose();
}

// 밸런스: 같은 시드·세 전장. 재융합은 두 부모를 곱하지 않고 주 공격보다 조금(1.05~1.4배) 세며,
// 기존 1차 융합 중앙값 대비 다수전 0.7~2.2배 안(1차 융합 상한 2.1배와 비슷한 선).
const median=l=>{const s=[...l].sort((a,b)=>a-b),m=s.length/2;return s.length%2?s[Math.floor(m)]:(s[m-1]+s[m])/2;};
const tactical=new Set(['gravitymirror','chainburst','blastlance','frostkaleidoscope','lightningpetal','returnflare','comethalo','stormanchor','returningpetals','gravitystake','icicle','halobloom','frostnet','rewindbolt','refractlance','thundermirror','sunmirror','pierceshower','ebbring','pullgarden','spearring','accretiondisk','rimeback','coldwell','rimepetal','echolane']);
for(const level of [4,9]){
  const middle=median(Object.keys(CURATED_FORMS).filter(id=>!tactical.has(id)).map(id=>averageDps(id,level,{shots:CURATED_FORMS[id].passive})));
  for(const form of entries){
    const dps=averageDps(form.id,level,{shots:form.passive}),main=averageDps(form.main,level,{shots:CURATED_FORMS[form.main].passive});
    const boss=bossDps(form.id,level),mainBoss=bossDps(form.main,level);
    assert.ok(boss<=mainBoss*1.35,`Lv${level} ${form.name}: 보스 피해가 너무 오름`);
    if(main<middle*.7){
      // 단일 대상형(주 공격의 광역 수치가 원래 재융합 하한 밑, 예: 중력 말뚝 — 2026-09-23 4묶음):
      // 광역 하한 대신 '주 공격보다 세고, 보스 피해가 5~35% 오른다'로 잰다. 광역은 하한(0.7배)까지만 올라도 된다.
      assert.ok(dps>=main*1.05&&dps<=Math.max(main*1.4,middle*.7),`Lv${level} ${form.name}: 단일 대상형 광역 ${(dps/main).toFixed(2)}배`);
      assert.ok(boss>=mainBoss*1.05,`Lv${level} ${form.name}: 단일 대상형인데 보스 피해가 ${(boss/mainBoss).toFixed(2)}배`);
      continue;
    }
    assert.ok(dps>=middle*.7&&dps<=middle*2.2,`Lv${level} ${form.name}: 다수전 ${(dps/middle).toFixed(2)}배가 재융합 범위 밖`);
    if(form.follow.trigger!=='kill')assert.ok(dps>=main*1.05&&dps<=main*1.4,`Lv${level} ${form.name}: 주 공격 대비 ${(dps/main).toFixed(2)}배`);
  }
}
console.log('재융합 1~4묶음: 공명형 5·교차형 5·섞음 10·단일 대상형 보스 기준·고정 ID·보류 게이트·두 칸 압축·저장, 주 공격+조건부 후속(한 번 던질 때 한 번·쓰러뜨릴 때·돌아오는 길·얼림·번개 잇기·모인 자리 폭발), 밸런스 범위 통과');
