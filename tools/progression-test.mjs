import assert from 'node:assert/strict';
import {LAWS} from '../src/laws.js';
import {SLOT_CAP,killsForChoice,levelOf,damageScale,lawStats,offerChoices,chooseLaw,levelsFromSave,levelsToSave,totalLevel,upgradeLine,baseShotLevels,fuse,canFuse,consumedUpgrades,FUSION_BONUS_KEEP} from '../src/progression.js';
import {FORMS} from '../src/forms.js';
import {validCheckpoint} from '../src/run-save.js';

// Choices get further apart, never closer.
for(let i=0;i<20;i++)assert.ok(killsForChoice(i+1)>killsForChoice(i));
assert.ok(killsForChoice(0)>=10,'The first law is not handed out in the first few seconds');

// Offers: distinct, at most three, fresh laws while slots remain, only upgrades once full.
let seed=7;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let run=0;run<300;run++){
 const levels=new Map();
 for(let pick=0;pick<25;pick++){
  const offer=offerChoices(levels,{random});
  assert.ok(offer.length>=1&&offer.length<=3);assert.equal(new Set(offer).size,offer.length);
  assert.ok(offer.every(id=>Object.hasOwn(LAWS,id)));
  if(levels.size<SLOT_CAP)assert.ok(offer.some(id=>!levels.has(id)),'A fresh law is always offered while a slot is free');
  else assert.ok(offer.every(id=>levels.has(id)),'Full slots offer only upgrades, never a swap');
  assert.equal(chooseLaw(levels,offer[Math.floor(random()*offer.length)]),true);
  assert.ok(levels.size<=SLOT_CAP);
 }
}
const guided=offerChoices(new Map([['gravity',1]]),{random:()=>0,guide:'burst'});
assert.ok(guided.includes('burst'),'A form guide places its missing ingredient');

// Levels stack without a ceiling, and a law past the last slot is refused.
const levels=new Map();for(const id of ['reflect','split','chain','orbit','pierce','burst','recall','gravity'].slice(0,SLOT_CAP))chooseLaw(levels,id);
assert.equal(chooseLaw(levels,'frost'),false);
for(let i=0;i<60;i++)assert.equal(chooseLaw(levels,'split'),true);
assert.equal(levelOf(levels,'split'),61);assert.equal(totalLevel(levels),60+SLOT_CAP);
assert.ok(damageScale(levels)>6,'Damage keeps growing past every count cap');

// Stats never shrink with level and respect their caps.
const keys=Object.keys(lawStats(new Map()));
for(const id of Object.keys(LAWS)){
 let previous=lawStats(new Map([[id,1]]));
 for(let lv=2;lv<40;lv++){
  const next=lawStats(new Map([[id,lv]]));
  for(const key of keys){
   if(key==='frostFactor')assert.ok(next[key]<=previous[key]);else assert.ok(next[key]>=previous[key],`${id} ${key} shrank at level ${lv}`);
  }
  previous=next;
 }
 assert.ok(upgradeLine(new Map([[id,1]]),id).length>0);
}
const capped=lawStats(new Map([['split',50],['orbit',50],['chain',50],['reflect',50]]));
assert.ok(capped.splitCount<=9&&capped.orbitPetals<=7&&capped.chainTargets<=6&&capped.reflectBounces<=8);
assert.match(upgradeLine(new Map([['split',50]]),'split'),/최대치/);
assert.match(upgradeLine(new Map([['reflect',1]]),'reflect'),/2 → 3/);
// Orbit was reported as useless: it now starts with more petals and real damage.
const orbit=lawStats(new Map([['orbit',1]]));assert.ok(orbit.orbitPetals>=3&&orbit.orbitDamage>=14);
const pierce1=lawStats(new Map([['pierce',1]])),pierce9=lawStats(new Map([['pierce',9]]));
assert.equal(pierce1.critChance,.03);assert.ok(pierce9.critChance>pierce1.critChance&&pierce9.critChance<=.15);assert.equal(pierce1.critDamage,1.5);
assert.match(upgradeLine(new Map([['pierce',1]]),'pierce'),/치명타/);

// Saves: old mutated lists become level two, new level maps round-trip.
assert.deepEqual([...levelsFromSave({rules:['reflect','split'],mutated:['split']})],[['reflect',1],['split',2]]);
const saved={rules:['reflect','split'],mutated:['split'],levels:{reflect:4,split:9}};
assert.deepEqual(levelsToSave(levelsFromSave(saved)),{reflect:4,split:9});
const base={version:1,cycle:0,stage:1,mode:'entry',region:'garden',hp:80,rules:['reflect','split'],mutated:['split'],kills:30,elapsed:40};
assert.equal(validCheckpoint(base),true);
assert.equal(validCheckpoint({...base,levels:{reflect:4,split:9},choicesTaken:3,choiceKills:5}),true);
assert.equal(validCheckpoint({...base,levels:{frost:2}}),false,'A level for a law that is not held');
assert.equal(validCheckpoint({...base,levels:{reflect:1.5}}),false);
assert.equal(validCheckpoint({...base,levels:[1,2]}),false);
assert.equal(validCheckpoint({...base,choicesTaken:-1}),false);
assert.equal(validCheckpoint({...base,hp:103}),true,'garden max-health growth remains resumable');
// 2026-09-22 사용자 결정: 관통을 조합·진화에 넣어도 기본 탄 관통과 치명타 확률은 남는다(다른 법칙은 진화로 넘어감).
{
 const pierceFusion=Object.entries(FORMS).find(([,f])=>f.requires?.length===2&&f.requires.includes('pierce')&&!f.twin);
 assert.ok(pierceFusion,'관통이 든 1차 융합이 있다');
 const [fid,form]=pierceFusion,other=form.requires.find(id=>id!=='pierce');
 const levels=new Map([['pierce',3],[other,4]]),forms=new Map();
 assert.ok(canFuse(levels,fid)&&fuse(levels,forms,fid),`${form.name} 융합`);
 assert.equal(levels.has('pierce'),false,'슬롯에서는 관통이 빠진다');
 const shot=baseShotLevels(levels,forms);
 assert.equal(shot.get('pierce'),forms.get(fid),'기본 탄 관통은 진화 레벨로 남는다');
 assert.equal(shot.has(other),false,'다른 법칙은 기본 탄에서 빠진다(진화로 넘어감)');
 assert.ok(lawStats(shot).critChance>=lawStats(new Map([['pierce',3]])).critChance,'치명타 확률이 사라지지 않고 유지되거나 오른다');
 assert.equal(baseShotLevels(new Map([['pierce',2]]),forms).get('pierce'),2,'관통을 슬롯에도 들고 있으면 그 레벨 그대로');
 assert.equal(baseShotLevels(new Map([['split',2]]),new Map()).has('pierce'),false,'관통이 없으면 생기지 않는다');
 // 9/22 버그로 기본 탄용 관통이 rules에 섞여 저장된 판: 레벨 기록이 없는 관통은 되살리지 않는다.
 assert.deepEqual([...levelsFromSave({rules:['frost','pierce','chain'],levels:{frost:2,chain:1},mutated:['frost','pierce']})],[['frost',2],['chain',1]]);
 assert.deepEqual([...levelsFromSave({rules:['pierce'],mutated:['pierce']})],[['pierce',2]],'레벨 기록이 없던 아주 옛 저장은 예전처럼');
}
// 2026-09-23 사용자 "조금은 딜이 나와야": 조합·진화로 빠지는 재료 법칙의 '모든 탄 피해' 강화는 절반이 남는다.
{
 assert.equal(FUSION_BONUS_KEEP,.5);
 const before=new Map([['frost',2],['pierce',3],['chain',3]]);
 assert.equal(damageScale(before),1.5,'빙결 2·관통 3·연쇄 3 = +50%');
 const gain=consumedUpgrades(before,['pierce','chain']);assert.equal(gain,4);
 const after=new Map([['frost',2]]);
 assert.ok(Math.abs(damageScale(after)-1.1)<1e-9,'저금이 없으면 +10%로 떨어진다(예전)');
 assert.ok(Math.abs(damageScale(after,gain)-1.3)<1e-9,'합친 두 법칙의 +40% 중 절반(+20%)이 남아 +30%');
 assert.ok(damageScale(after,gain)<damageScale(before),'합쳐도 합치기 전보다 세지지는 않는다(진화 무기 자체가 따로 강해짐)');
 assert.equal(consumedUpgrades(new Map([['split',1]]),['split','burst']),0,'Lv.1 법칙은 저금할 강화가 없다');
 assert.equal(damageScale(new Map(),-5),1,'음수 저금은 무시');
}
console.log('Progression: widening choice gauge, stacked uncapped levels, full-slot upgrades, capped counts, save migration passed.');
