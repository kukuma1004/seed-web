import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validCheckpoint,readCheckpoint,writeCheckpoint,clearCheckpoint,difficulty,replaceLaw,restoredScore,restoredWardens,restoredAustins} from '../src/run-save.js';
import {createShield,blocksShield,tickShield} from '../src/shield.js';
import {rewardOptions} from '../src/journey.js';
let value=null;const storage={getItem:()=>value,setItem:(k,v)=>value=v,removeItem:()=>value=null};
const s={version:1,cycle:2,stage:3,mode:'entry',region:'ruins',hp:70,rules:['reflect','split'],mutated:['split'],kills:200,elapsed:160};
assert.ok(writeCheckpoint(storage,s));assert.deepEqual(readCheckpoint(storage),s);
assert.equal(validCheckpoint({...s,hp:0}),false);assert.equal(validCheckpoint({...s,stage:8}),false);
assert.equal(validCheckpoint({...s,rules:['bad']}),false);assert.equal(validCheckpoint({...s,mutated:['frost']}),false);
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
