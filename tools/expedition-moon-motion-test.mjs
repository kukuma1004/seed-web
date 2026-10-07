import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import {expeditionEnemyArt,expeditionGardenAssetBatch} from '../src/expedition/art.js';
import {expeditionSpriteSequence} from '../src/expedition/sprite-motion.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {getExpeditionSpecies} from '../src/expedition/species.js';
import {expeditionEnemyProfile,expeditionEncounter} from '../src/expedition/world.js';
import {expeditionBossCommand} from '../src/expedition/boss-ai.js';

// Native opaque bottoms, NOT a claim that luminous effect bounds are feet.
// Body/contact, colored fringes, margin and boss satellite defects remain QA gates.
const contacts={
 'moon-normal-0':[375,366,369,363,291.5,292.5,291.5,290.5],
 'moon-normal-1':[358,352,351,360,322.5,325.5,321.5,318.5],
 'moon-normal-2':[384,389,391,386,312.5,302.5,305.5,302.5],
 'moon-normal-3':[375,375,374,378,337.5,338.5,337.5,338.5],
 'moon-elite-0':[395,388,395,398,319.5,322.5,324.5,324.5],
 'moon-elite-1':[378,373,372,373,323.5,334.5,335.5,335.5],
 'moon-boss':[425,422,421,421,359.5,370.5,367.5,366.5]
};
const attackFrames={'moon-normal-0':[1,2,3],'moon-normal-1':[1],'moon-normal-2':[1,2],'moon-normal-3':[1,2,3],'moon-elite-0':[1,3],'moon-elite-1':[1,2,3],'moon-boss':[1,2]};
let actions=0,enemyActions=0,protectionOnlyActions=0;
for(const [id,bottoms] of Object.entries(contacts)){
 const art=expeditionEnemyArt(id);
 assert.equal(art.ready,false);assert.equal(art.facing,'left');assert.equal(art.reason,'authored_motion_candidate_final_gameplay_device_qa_pending');
 assert.ok(art.motionDefects.length,'unresolved art QA must not disappear');
 const native=readFileSync(new URL('../public/assets/'+art.motionPath,import.meta.url));
 assert.equal(native.toString('ascii',0,4),'RIFF');assert.equal(native.toString('ascii',8,12),'WEBP');
 assert.ok(statSync(new URL('../public/assets/'+art.motionPath,import.meta.url)).size<300000);
 for(let pose=0;pose<8;pose++)assert(Math.abs(bottoms[pose]/443.5+art.poseOffsets[pose]/100-art.baseline)<.000002,id+' source-frame bottom '+pose);
 const enemy={id:'e',side:'enemy',speciesId:id,hp:300};
 for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<6;seq++){
  const result=expeditionSpriteSequence(enemy,[enemy],[{type:'action',unitId:'e',kind,seq}],art);
  assert.equal(result.duration,720);assert.equal(result.rest.pose,0);
  assert.equal(result.preparation.pose,id==='moon-normal-2'?3:4);
  if(kind==='attack')assert(attackFrames[id].includes(result.impact.pose));
  else assert.equal(result.impact.pose,['moon-elite-0','moon-boss'].includes(id)?3:5);
  if(id==='moon-boss')assert.notEqual(result.impact.pose,5,'three-orb defective release must not be used');
 }
 assert.equal(expeditionSpriteSequence({...enemy,guarding:true},[enemy],[{type:'action',unitId:'e',kind:'guard'}],art).rest.pose,6);
 assert.equal(expeditionSpriteSequence(enemy,[enemy],[{type:'damage',unitId:'a',targetId:'e',amount:1}],art).impact.pose,7);
 if(id==='moon-boss')continue;
 for(const skill of ['attack','skill1','skill2']){
  const battle=createExpeditionCombat({battleId:id+'-'+skill,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:1000,maxHp:1000,power:40,defense:3,speed:10}],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:140,maxHp:140,power:25,defense:4,speed:12}],getSpecies:s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s)});
  while(battle.phase==='fight'){
   const actor=expeditionCombatTurn(battle),beforeHP=battle.units.find(u=>u.id==='a').hp;
   const input={id:'moon-act-'+(++actions),unitId:actor.id,kind:actor.side==='enemy'?skill:'attack',targetId:actor.side==='enemy'?'a':'e'};
   const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);
   if(actor.side==='enemy'){
    enemyActions++;
    if(skill!=='attack'&&['moon-normal-1','moon-normal-3','moon-elite-1'].includes(id)){
     assert.equal(battle.units.find(u=>u.id==='a').hp,beforeHP,'protection presentation cannot add damage');
     assert(result.events.some(e=>e.type==='protection'));protectionOnlyActions++;
    }
   }
   const frozen=JSON.stringify(battle);expeditionSpriteSequence(battle.units.find(u=>u.id==='e'),battle.units,result.events,art);
   assert.equal(JSON.stringify(battle),frozen,'art cannot mutate paid turns, HP, protection or receipts');
   assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(actions<2000);
  }
 }
}
const battle=createExpeditionCombat({battleId:'moon-boss-motion',allies:Array.from({length:5},(_,slot)=>({id:'a'+slot,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:10})),enemies:expeditionEncounter('moon',{kind:'boss',battleId:'moon-boss-motion'}),getSpecies:s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s)});
const seen=new Set(),kinds=new Set();let bossCommands=0;
while(battle.phase==='fight'&&battle.round<=8){
 const actor=expeditionCombatTurn(battle),id='moon-boss-act-'+(++bossCommands),input=actor.boss?expeditionBossCommand(battle,id):{id,unitId:actor.id,kind:'guard'};
 const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);for(const e of result.events)seen.add(e.type);
 const frozen=JSON.stringify(battle),boss=battle.units.find(u=>u.boss),seq=expeditionSpriteSequence(boss,battle.units,result.events,expeditionEnemyArt('moon-boss'));
 if(actor.boss){kinds.add(input.kind);if(input.kind==='guard')assert.equal(seq.rest.pose,6);else assert([1,2,3].includes(seq.impact.pose));}
 assert.equal(JSON.stringify(battle),frozen);assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(bossCommands<150);
}
assert.deepEqual([...kinds].sort(),['attack','guard','skill1']);assert(seen.has('protection'));assert(seen.has('damage'));assert(enemyActions>20);assert(protectionOnlyActions>10);
assert(!expeditionGardenAssetBatch('moon',{partySpeciesIds:['orbit'],includeEncounter:true,base:'./'}).some(path=>path.includes('/expedition/')&&path.includes('-motion-')),'enemy sheets must remain encounter-lazy');
console.log(`PASS Moon seven local candidates: eighteen simulated normal/elite battles, ${actions} paid actions/${enemyActions} enemy actions/${protectionOnlyActions} protection-only actions; boss ${bossCommands} commands; exact restore; no final visual/device acceptance`);
