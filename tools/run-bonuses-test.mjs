import assert from 'node:assert/strict';
import {RUN_BONUSES,RUN_BONUS_MAX,RUN_BONUS_CHANCE,BOSS_PET_RARE_BONUS,rareRunBonusChance,emptyRunBonuses,normalizeRunBonuses,validRunBonuses,runBonusOffers,rareRunBonusOffers,applyRunBonus,moveScale,cadenceScale,cadenceInterval,shotScale,powerScale,runBonusSummary} from '../src/run-bonuses.js';

assert.deepEqual(emptyRunBonuses(),{move:0,shot:0,power:0});
assert.deepEqual(normalizeRunBonuses({move:99,shot:-2,power:2}),{move:RUN_BONUS_MAX,shot:0,power:2});
assert.equal(validRunBonuses({move:1,shot:2,power:3}),true);
assert.equal(validRunBonuses({move:6,shot:0,power:0}),false);
assert.equal(validRunBonuses({move:0,shot:0,power:0,unknown:1}),false);

assert.deepEqual(runBonusOffers(emptyRunBonuses(),{hp:55,choicesTaken:0}),['heal','move']);
assert.deepEqual(runBonusOffers(emptyRunBonuses(),{hp:100,choicesTaken:1}),['shot','power']);
assert.equal(RUN_BONUS_CHANCE,.02);
assert.equal(BOSS_PET_RARE_BONUS,.02);
assert.equal(rareRunBonusChance(false),.02);
assert.equal(rareRunBonusChance(true),.04);
assert.deepEqual(Object.values(RUN_BONUSES).map(x=>x.name),['생명력 즉시 +20','이동 속도 +3%','공격 빈도 +4%','공격력 +3%'],'rare cards state their effect without a poetic-name lookup');
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.019}),['heal','move']);
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.02}),[],'two percent is an exclusive rare roll');
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.039,chance:rareRunBonusChance(true)}),['heal','move'],'equipped boss pet raises the rare roll to four percent');
assert.deepEqual(rareRunBonusOffers(emptyRunBonuses(),{hp:55,random:()=>.04,chance:rareRunBonusChance(true)}),[],'four percent is an exclusive rare roll');
const healed=applyRunBonus(emptyRunBonuses(),'heal',{hp:87});assert.equal(healed.hp,100);assert.equal(healed.healed,13);
assert.equal(applyRunBonus(emptyRunBonuses(),'heal',{hp:100}).ok,false,'full health cannot waste a choice');
let state=emptyRunBonuses();for(let i=0;i<RUN_BONUS_MAX;i++)state=applyRunBonus(state,'power').state;
assert.equal(applyRunBonus(state,'power').ok,false,'small growth has a hard cap');
assert.equal(moveScale({move:5}),1.15);assert.equal(cadenceScale({shot:5}),1.2);assert.equal(shotScale({shot:5}),1.2,'old import remains compatible');assert.equal(powerScale({power:5}),1.15);
assert.equal(cadenceInterval(.24,{shot:5}),.2,'five cadence picks fire 20% more often');
assert.deepEqual(runBonusSummary({move:2,shot:3,power:3}),['이동 +6%','공격 빈도 +12%','공격 +9%']);
console.log('작은 성장: 2% 희귀 선택, 회복·이동·공격 빈도·공격, 최대치와 한 판 한정 수치 통과');
