import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validCheckpoint,readCheckpoint,writeCheckpoint,clearCheckpoint,roomExitCheckpoint,difficulty,replaceLaw,restoredScore,restoredWardens,restoredAustins,withoutHidden,SAVE_KEY} from '../src/run-save.js';
import {createShield,blocksShield,tickShield} from '../src/shield.js';
import {rewardOptions} from '../src/journey.js';
let value=null;const storage={getItem:()=>value,setItem:(k,v)=>value=v,removeItem:()=>value=null};
const s={version:1,cycle:2,stage:3,mode:'entry',region:'ruins',hp:70,rules:['reflect','split'],mutated:['split'],kills:200,elapsed:160};
assert.ok(writeCheckpoint(storage,s,1234));{const {savedAt,...rest}=readCheckpoint(storage);assert.deepEqual(rest,s);assert.equal(savedAt,1234,'저장 시각이 붙는다');}
// 판이 끝나 지우면 '지운 시각'만 남고, 게임은 저장 없음으로 읽는다.
clearCheckpoint(storage,2000);assert.equal(readCheckpoint(storage),null);assert.equal(JSON.parse(value).cleared,true);assert.equal(JSON.parse(value).savedAt,2000);
assert.ok(writeCheckpoint(storage,s));
{
 const entry={...s,hp:80,kills:200,score:3000,choicesTaken:4,choiceKills:7,levels:{reflect:2,split:1},forms:{},inventory:{potion:1,tonic:2,wind:0,shell:1,sprout:0}};
 const safe=roomExitCheckpoint(entry,{hp:46,inventory:{potion:2,tonic:1,wind:1,shell:0,sprout:0}});
 assert.equal(safe.hp,46,'damage taken in the unfinished room survives');
 assert.deepEqual(safe.inventory,{potion:1,tonic:1,wind:0,shell:0,sprout:0},'drops are discarded and consumed items stay consumed');
 assert.equal(safe.kills,200);assert.equal(safe.score,3000);assert.equal(safe.choicesTaken,4);assert.equal(safe.choiceKills,7);
 assert.deepEqual(safe.levels,entry.levels);assert.deepEqual(safe.forms,entry.forms);
 assert.equal(roomExitCheckpoint({...entry,hp:40},{hp:90,inventory:entry.inventory}).hp,40,'healing above the room-entry value cannot be banked by reloading');
 assert.equal(roomExitCheckpoint(null,{hp:50,inventory:{}}),null);
}
assert.equal(validCheckpoint({...s,hp:0}),false);assert.equal(validCheckpoint({...s,stage:8}),false);
// 2026-09-22 신고: 칭호·정원 생명력 강화로 최대 생명력이 110을 넘으면 방 입구 저장이 무효가 되어 '저장하고 나가기'가 멈췄다.
// 저장 상한은 실제로 오를 수 있는 최대 생명력(정원 +5%, 칭호 +20)보다 커야 한다.
{
  const {MAX_SAVED_HP}=await import('../src/run-save.js'),{MASTERY_STEP,MASTERY_STAT_CAP}=await import('../src/garden.js'),{ALWAYS_BEGINNER_MAX_HP,ALWAYS_CLEAR_MAX_HP}=await import('../src/titles.js');
  const reachable=100*(1+MASTERY_STEP*MASTERY_STAT_CAP)+Math.max(ALWAYS_BEGINNER_MAX_HP,ALWAYS_CLEAR_MAX_HP);
  assert.ok(MAX_SAVED_HP>=reachable,`저장 상한 ${MAX_SAVED_HP}이 실제 최대 생명력 ${reachable}보다 작다`);
  for(const hp of [110.1,111,120,reachable])assert.equal(validCheckpoint({...s,hp}),true,`생명력 ${hp} 저장`);
  assert.equal(validCheckpoint({...s,hp:MAX_SAVED_HP+1}),false,'말이 안 되는 생명력은 여전히 거절');
  const safe=roomExitCheckpoint({...s,hp:120},{hp:118,inventory:s.inventory||{}});assert.ok(safe&&safe.hp<=120,'칭호 생명력으로도 저장하고 나가기가 된다');
}
assert.equal(validCheckpoint({...s,rules:['bad']}),false);assert.equal(validCheckpoint({...s,mutated:['frost']}),false);
assert.equal(validCheckpoint({...s,playDashes:24,playDamage:53}),true);
assert.equal(validCheckpoint({...s,playDashes:-1}),false);assert.equal(validCheckpoint({...s,playDamage:1.5}),false);
assert.equal(writeCheckpoint({setItem(){throw Error('quota');}},s),false);
value='{broken';assert.equal(readCheckpoint(storage),null);assert.ok(clearCheckpoint(storage));assert.equal(readCheckpoint(storage),null);
assert.deepEqual(replaceLaw(['reflect','split'],['reflect'],'reflect','frost'),{rules:['frost','split'],mutated:[]});
const full=['reflect','split','chain','orbit','pierce'];const choices=rewardOptions(3,full,full);
assert.equal(choices.length,3);assert.ok(choices.every(id=>!full.includes(id)));
assert.ok(difficulty(3,'ruins').speed>difficulty(0,'garden').speed);
const shield=createShield(new THREE.Scene());
assert.ok(blocksShield(shield,new THREE.Vector3(0,0,-1)));
assert.equal(blocksShield(shield,new THREE.Vector3(0,0,1)),false);
assert.equal(blocksShield(shield,new THREE.Vector3(1,0,0)),false);
shield.state='recover';assert.equal(blocksShield(shield,new THREE.Vector3(0,0,-1)),false);
shield.state='stalk';shield.g.rotation.y=Math.PI/2;
assert.ok(blocksShield(shield,new THREE.Vector3(-1,0,0)));
let seen=new Set();for(let i=0;i<350;i++){tickShield(shield,.02,new THREE.Vector3(2,0,0),{collide(){},hit(){}});seen.add(shield.state);}
assert.ok(seen.has('tell')&&seen.has('commit')&&seen.has('recover'));
console.log('Checkpoint validation/resume/failure, replacement rewards and directional shield counterplay passed.');

const mixed=rewardOptions(3,full,[],{mutation:false,random:()=>.4});
assert.equal(mixed.length,3);assert.equal(new Set(mixed).size,3);
assert.ok(mixed.some(id=>!full.includes(id)),'A full build offers a replacement during mid-room awakening');
assert.ok(rewardOptions(3,full,[],{mutation:true}).every(id=>full.includes(id)),'End-room mutation remains an upgrade choice');

// 옛 저장(점수·문지기 수가 없던 판)을 이어할 때: 0으로 두면 처치 수만 남아 기록이 앞뒤가 안 맞는다.
{
 const saved={version:1,cycle:5,stage:2,mode:'entry',region:'garden',hp:60,rules:['frost'],mutated:[],kills:714,elapsed:677};
 const score=restoredScore(saved);
 assert.ok(score>10000,'지나온 다섯 여정만큼은 점수가 채워진다');
 assert.ok(score/saved.kills>=10,'처치 한 마리당 최소 점수는 넘는다');
 assert.ok(score/saved.kills<=40*3.5,'가장 비싼 잡몹으로도 낼 수 없는 점수는 만들지 않는다');
 assert.equal(restoredWardens(saved),5,'여정을 다섯 넘었으면 문지기 다섯');
 assert.equal(restoredAustins(saved),1,'문지기 다섯마다 오스틴 하나');
 // 새 저장은 적힌 값을 그대로 쓴다.
 assert.equal(restoredScore({...saved,score:1234}),1234);
 assert.equal(restoredWardens({...saved,wardens:0}),0);
 assert.equal(restoredAustins({...saved,wardens:9,austins:0}),0);
 assert.equal(restoredScore({cycle:0,kills:0}),0);
}
console.log('옛 저장 이어하기: 빠진 점수·문지기 수 채우기 통과');

// 숨긴 차원 법칙·자동 조합이 든 저장: 버리지 않고 그 부분만 빼서 이어한다.
{
 const saved={version:1,cycle:1,stage:2,mode:'entry',region:'garden',hp:70,rules:['split','portal','orbit'],mutated:['portal'],
  levels:{split:2,portal:3,orbit:1},forms:{'f28-orbit-gravity':3,collapse:2,'portal-ring':1},guideTarget:'f28-orbit-gravity',kills:120,elapsed:200,score:9000,wardens:1};
 const d=new Map([[SAVE_KEY,JSON.stringify(saved)]]),storage={getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k)};
 assert.equal(validCheckpoint(saved),false,'숨긴 것이 든 채로는 저장 형식에 맞지 않는다');
 const read=readCheckpoint(storage);
 assert.ok(read,'판을 버리지 않는다');
 assert.deepEqual(read.rules,['split','orbit']);assert.deepEqual(read.mutated,[]);
 assert.deepEqual(read.levels,{split:2,orbit:1});assert.deepEqual(read.forms,{collapse:2});
 assert.equal(read.guideTarget,null);assert.equal(read.score,9000,'점수·처치 등은 그대로');
 assert.equal(withoutHidden(null),null);
}
console.log('숨긴 법칙·조합이 든 옛 저장: 그 부분만 빼고 이어하기 통과');

// 1.0.8까지의 가방은 일부 물약을 5개보다 많이 저장할 수 있었다. 새 상한 때문에
// 이어하기 자체가 사라지지 않도록 읽을 때 5개로 옮긴다.
{
 const oldBag={...s,inventory:{potion:9,tonic:10,wind:3,shell:3,sprout:1}};
 const d=new Map([[SAVE_KEY,JSON.stringify(oldBag)]]),legacy={getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k)};
 assert.deepEqual(readCheckpoint(legacy).inventory,{potion:5,tonic:5,wind:3,shell:3,sprout:1});
}
console.log('옛 물약 가방: 종류별 5개 상한으로 안전하게 옮기기 통과');
