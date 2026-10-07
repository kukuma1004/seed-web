import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {expeditionEnemyArt,expeditionGardenAssetBatch} from '../src/expedition/art.js';
import {expeditionSpriteSequence} from '../src/expedition/sprite-motion.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {getExpeditionSpecies} from '../src/expedition/species.js';
import {expeditionEnemyProfile,expeditionEncounter} from '../src/expedition/world.js';
import {expeditionBossCommand} from '../src/expedition/boss-ai.js';

const ids=['fire-normal-0','fire-normal-1','fire-normal-2','fire-normal-3','fire-elite-0','fire-elite-1','fire-boss'];
const attacks={'fire-normal-0':[1,2,3],'fire-normal-1':[1,2,3],'fire-normal-2':[1,2,3],'fire-normal-3':[2],'fire-elite-0':[1,2,3],'fire-elite-1':[1,2],'fire-boss':[1,2,3]};
let actions=0,enemyActions=0,delayedActions=0;
for(const id of ids){
 const art=expeditionEnemyArt(id),path=new URL('../public/assets/'+art.motionPath,import.meta.url),native=readFileSync(path);
 assert.equal(art.ready,false);assert.equal(art.facing,'left');assert(art.motionDefects.length>0);assert(statSync(path).size<300000);
 assert.equal(native.toString('ascii',0,4),'RIFF');assert.equal(native.toString('ascii',8,12),'WEBP');
 const enemy={id:'e',side:'enemy',speciesId:id,hp:100};
 for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<6;seq++){
  const presented=expeditionSpriteSequence(enemy,[enemy],[{type:'action',unitId:'e',kind,seq}],art);
  assert.equal(presented.duration,720);assert.equal(presented.rest.pose,0);assert.equal(presented.preparation.pose,id==='fire-elite-1'?1:4);
  if(kind==='attack')assert(attacks[id].includes(presented.impact.pose));else assert.equal(presented.impact.pose,5);
 }
 assert.equal(expeditionSpriteSequence({...enemy,guarding:true},[enemy],[{type:'action',unitId:'e',kind:'guard'}],art).rest.pose,6);
 assert.equal(expeditionSpriteSequence(enemy,[enemy],[{type:'damage',targetId:'e',unitId:'a',amount:1}],art).impact.pose,7);
 if(id==='fire-boss')continue;
 for(const skill of ['attack','skill1','skill2']){
  const battle=createExpeditionCombat({battleId:id+'-'+skill,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:1000,maxHp:1000,power:40,defense:3,speed:10}],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:140,maxHp:140,power:25,defense:4,speed:12}],getSpecies:s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s)});
  while(battle.phase==='fight'){
   const actor=expeditionCombatTurn(battle),input={id:'fire-paid-'+(++actions),unitId:actor.id,kind:actor.side==='enemy'?skill:'attack',targetId:actor.side==='enemy'?'a':'e'};
   const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);
   if(actor.side==='enemy'){
    enemyActions++;
    if(skill!=='attack'&&['fire-normal-1','fire-normal-3','fire-elite-1'].includes(id)){
     assert(battle.pending.length>0,'fire delay remains a paid queued effect, not art damage');delayedActions++;
    }
   }
   const frozen=JSON.stringify(battle);expeditionSpriteSequence(battle.units.find(u=>u.id==='e'),battle.units,result.events,art);
   assert.equal(JSON.stringify(battle),frozen,'presentation cannot mutate damage/pending/turn/save');assert.deepEqual(restoreExpeditionCombat(battle),battle);
   assert.equal(performExpeditionCombatAction(battle,input).ok,false,'same paid command cannot double-hit after restore');assert.equal(JSON.stringify(battle),frozen);
   assert(actions<2000);
  }
 }
}
const battle=createExpeditionCombat({battleId:'fire-boss-motion',allies:Array.from({length:5},(_,slot)=>({id:'a'+slot,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:10})),enemies:expeditionEncounter('fire',{kind:'boss',battleId:'fire-boss-motion'}),getSpecies:s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s)});
const kinds=new Set();let bossCommands=0,sawPending=false;
while(battle.phase==='fight'&&battle.round<=8){
 const actor=expeditionCombatTurn(battle),id='fire-boss-paid-'+(++bossCommands),input=actor.boss?expeditionBossCommand(battle,id):{id,unitId:actor.id,kind:'guard'};
 const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);sawPending||=battle.pending.length>0;
 const frozen=JSON.stringify(battle),boss=battle.units.find(u=>u.boss),seq=expeditionSpriteSequence(boss,battle.units,result.events,expeditionEnemyArt('fire-boss'));
 if(actor.boss){kinds.add(input.kind);if(input.kind==='guard')assert.equal(seq.rest.pose,6);else assert([1,2,3,5].includes(seq.impact.pose));}
 assert.equal(JSON.stringify(battle),frozen);assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(bossCommands<150);
}
assert.deepEqual([...kinds].sort(),['attack','guard','skill1']);assert(sawPending);assert(enemyActions>20);assert(delayedActions>10);
assert(!expeditionGardenAssetBatch('fire',{partySpeciesIds:['orbit'],includeEncounter:true,base:'./'}).some(path=>path.includes('/expedition/')&&path.includes('-motion-')),'full enemy sheets remain encounter-lazy');
console.log(`PASS Fire seven connected candidates: eighteen simulated battles, ${actions} paid actions/${enemyActions} enemy actions/${delayedActions} delayed fire actions; boss ${bossCommands} commands, exact restore/replay fencing. Native art/device final acceptance remains pending.`);
