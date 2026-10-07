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
console.log(`expedition auto-battle PASS: ${cases} legal paid choices, front/level/ownership boundaries; no rule bypass`);
