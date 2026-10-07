import assert from 'node:assert/strict';
import {EXPEDITION_SPECIES,getExpeditionSpecies,expeditionStats} from '../src/expedition/species.js';
import {createExpeditionCombat,performExpeditionCombatAction,expeditionCombatTurn} from '../src/expedition/combat.js';
import {expeditionAutoBattleIntent} from '../src/expedition/auto-battle.js';

let cases=0;
for(const species of Object.values(EXPEDITION_SPECIES).filter(s=>s.kind!=='twin'))for(const level of [1,5,8]){
 const normalized=createExpeditionCombat({battleId:'auto-choice',allies:[{id:'a',speciesId:species.id,slot:0,level,...expeditionStats(species.id,level),maxHp:expeditionStats(species.id,level).hp,speed:100}],enemies:[0,1,2].map(slot=>({id:'e'+slot,speciesId:'fixture',slot,hp:200,maxHp:200,power:5,speed:1})),getSpecies:id=>getExpeditionSpecies(id)||{}});
 const before=JSON.stringify(normalized),intent=expeditionAutoBattleIntent(normalized,{targetId:'e2'});
 assert.equal(JSON.stringify(normalized),before,'choosing cannot mutate HP/actions/history');
 assert.equal(intent.type,'action');assert.notEqual(intent.targetId,'e2','front row remains enforced');
 if(level<5)assert.notEqual(intent.kind,'skill2');if(level<8)assert.notEqual(intent.kind,'awaken');
 const result=performExpeditionCombatAction(normalized,{id:'auto-1',unitId:'a',kind:intent.kind,targetId:intent.targetId});
 assert.equal(result.ok,true,`${species.id}/Lv${level}: ${result.reason}`);
 assert.equal(normalized.actionCount,1);cases++;
}
const danger=createExpeditionCombat({allies:[{id:'a',speciesId:'pierce',slot:0,hp:10,maxHp:100,speed:99}],enemies:[{id:'e',speciesId:'fixture',slot:0,hp:100,speed:1}]});
danger.warnings=[{targetId:'a',readyRound:1}];assert.deepEqual(expeditionAutoBattleIntent(danger),{type:'action',kind:'guard'});
danger.order=['e','a'];assert.equal(expeditionAutoBattleIntent(danger),null,'enemy turn is not an ally command');
danger.phase='victory';assert.equal(expeditionAutoBattleIntent(danger),null);
const damage=ratio=>({type:'damage',target:'single',ratio});
const fixture=(actions,extra={})=>createExpeditionCombat({
 allies:[{id:'a',speciesId:'fixture',slot:0,hp:100,maxHp:100,power:20,defense:0,speed:100,actions,...extra}],
 enemies:[{id:'e',speciesId:'fixture',slot:0,hp:200,maxHp:200,power:5,defense:0,speed:1}]
});
let priorities=0;
function chooseExpected(battle,kind,label){
 const frozen=JSON.stringify(battle),intent=expeditionAutoBattleIntent(battle);
 assert.equal(intent.kind,kind,label);assert.equal(JSON.stringify(battle),frozen,'preview must leave checkpoint untouched');
 assert.ok(performExpeditionCombatAction(battle,{id:'real-priority-'+priorities,unitId:'a',kind:intent.kind,targetId:intent.targetId}).ok,label);
 priorities++;
}
const marked=fixture({attack:[damage(.5)],skill1:[{type:'vulnerable',target:'single',amount:3}]});
marked.units[1].status.vulnerable=3;
chooseExpected(marked,'attack','already-saturated mark must not outrank real damage');
const shielded=fixture({attack:[damage(.5)],skill1:[{type:'protection',target:'ally',ratio:3}]});
shielded.units[0].status.protection=100;shielded.units[1].status.protection=100;
chooseExpected(shielded,'attack','depleting enemy protection advances a fight while full own protection does not');
const guarded=fixture({attack:[damage(.1)],skill1:[{type:'protection',target:'self',ratio:.7}, {...damage(1),when:'protected'}]});
chooseExpected(guarded,'skill1','a shield created earlier in this action enables the following conditional strike');
const missedCondition=fixture({attack:[damage(.5)],skill1:[{...damage(3),when:'hit'}]});
chooseExpected(missedCondition,'attack','a hit-only follow-up without its trigger cannot earn imaginary damage');
const pendingFull=fixture({attack:[damage(.5)],skill1:[{type:'return',target:'single',ratio:3,rounds:1}]});
pendingFull.pending=Array.from({length:32},(_,op)=>({ownerId:'a',targetId:'e',ratio:.01,dueRound:2,kind:'skill1',op:op%8}));
chooseExpected(pendingFull,'attack','full finite return queue must use a legal fallback, not stop auto on pending-cap');
// A second body needs protection, but this paid command actually protects
// only the first ally. It must not score every ally as a fictitious recipient.
const twoAllies=createExpeditionCombat({allies:[{id:'a',speciesId:'fixture',slot:0,hp:100,maxHp:100,power:20,speed:100,actions:{attack:[damage(.5)],skill1:[{type:'protection',target:'ally',ratio:3}]}},{id:'b',speciesId:'fixture',slot:1,hp:100,maxHp:100,power:10,speed:1}],enemies:[{id:'e',speciesId:'fixture',slot:0,hp:200,maxHp:200,speed:1}]});
twoAllies.units[0].status.protection=100;
chooseExpected(twoAllies,'attack','shield score uses the real recipient, not all damaged allies');
console.log(`expedition auto-battle PASS: ${cases} legal paid choices, front/level/ownership boundaries; no rule bypass`);
console.log(`auto-battle priorities PASS: ${priorities} actual paid-action regressions; real condition/target/cap previews, immutable input`);
