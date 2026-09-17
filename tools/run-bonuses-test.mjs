import assert from 'node:assert/strict';
import {RUN_BONUS_MAX,RUN_BONUS_CHANCE,emptyRunBonuses,normalizeRunBonuses,validRunBonuses,runBonusOffers,rareRunBonusOffers,applyRunBonus,moveScale,shotScale,powerScale,runBonusSummary} from '../src/run-bonuses.js';

assert.deepEqual(emptyRunBonuses(),{move:0,shot:0,power:0});
assert.deepEqual(normalizeRunBonuses({move:99,shot:-2,power:2}),{move:RUN_BONUS_MAX,shot:0,power:2});
assert.equal(validRunBonuses({move:1,shot:2,power:3}),true);
assert.equal(validRunBonuses({move:6,shot:0,power:0}),false);
assert.equal(validRunBonuses({move:0,shot:0,power:0,unknown:1}),false);

assert.deepEqual(runBonusOffers(emptyRunBonuses(),{hp:55,choicesTaken:0}),['heal','move']);
assert.deepEqual(runBonusOffers(emptyRunBonuses(),{hp:100,choicesTaken:1}),['shot','power']);
assert.equal(RUN_BONUS_CHANCE,.05);
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.049}),['heal','move']);
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.05}),[],'five percent is an exclusive rare roll');
const healed=applyRunBonus(emptyRunBonuses(),'heal',{hp:87});assert.equal(healed.hp,100);assert.equal(healed.healed,13);
assert.equal(applyRunBonus(emptyRunBonuses(),'heal',{hp:100}).ok,false,'full health cannot waste a choice');
let state=emptyRunBonuses();for(let i=0;i<RUN_BONUS_MAX;i++)state=applyRunBonus(state,'power').state;
assert.equal(applyRunBonus(state,'power').ok,false,'small growth has a hard cap');
assert.equal(moveScale({move:5}),1.15);assert.equal(shotScale({shot:5}),1.2);assert.equal(powerScale({power:5}),1.15);
assert.deepEqual(runBonusSummary({move:2,shot:0,power:3}),['이동 +6%','공격 +9%']);
console.log('작은 성장: 5% 추가 축복, 회복·이동·탄속·공격, 최대치와 한 판 한정 수치 통과');
