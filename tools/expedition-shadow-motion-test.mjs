import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {expeditionEnemyArt,expeditionGardenAssetBatch} from '../src/expedition/art.js';
import {expeditionSpriteSequence} from '../src/expedition/sprite-motion.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {getExpeditionSpecies} from '../src/expedition/species.js';
import {expeditionEnemyProfile,expeditionEncounter} from '../src/expedition/world.js';
import {expeditionBossCommand,expeditionBossPlan} from '../src/expedition/boss-ai.js';
const ids=['shadow-normal-0','shadow-normal-1','shadow-normal-2','shadow-normal-3','shadow-elite-0','shadow-elite-1','shadow-boss'];
const profile=s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s);
const ally=(id,slot)=>({id,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:0});
let commands=0,pulls=0,delays=0,marks=0;
function accepted(battle,input,art){
 const restored=restoreExpeditionCombat(battle),left=performExpeditionCombatAction(battle,input),right=performExpeditionCombatAction(restored,input);
 assert(left.ok,left.reason);assert.deepEqual(left,right);assert.deepEqual(battle,restored);
 const snapshot=JSON.stringify(battle),enemy=battle.units.find(u=>u.speciesId===art.speciesId)||battle.units.find(u=>u.side==='enemy');
 for(let i=0;i<8;i++)expeditionSpriteSequence(enemy,battle.units,left.events,art);
 assert.equal(JSON.stringify(battle),snapshot,'eight presentations cannot add damage, move slots or reorder the next actor');
 assert.deepEqual(restoreExpeditionCombat(battle),battle);
 assert.equal(performExpeditionCombatAction(battle,input).ok,false);assert.equal(JSON.stringify(battle),snapshot,'replayed paid command cannot mutate the saved battle');
 pulls+=left.events.filter(e=>e.type==='pull').length;delays+=left.events.filter(e=>e.type==='delay').length;marks+=left.events.filter(e=>e.type==='vulnerable').length;
 commands++;return left;
}
for(const id of ids){
 const art=expeditionEnemyArt(id),file=new URL('../public/assets/'+art.motionPath,import.meta.url),native=readFileSync(file);
 assert.equal(art.ready,false);assert.equal(art.facing,'left');assert(art.motionDefects.length);assert(statSync(file).size<300000);
 assert.equal(native.toString('ascii',0,4),'RIFF');assert.equal(native.toString('ascii',8,12),'WEBP');
 const enemy={id:'e',side:'enemy',speciesId:id,hp:100};
 for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<6;seq++){
  const motion=expeditionSpriteSequence(enemy,[enemy],[{type:'action',unitId:'e',kind,seq}],art);
  assert.equal(motion.duration,720);assert.equal(motion.preparation.pose,4);assert.equal(motion.rest.pose,0);
  if(kind==='attack')assert([1,2,3].includes(motion.impact.pose));else assert.equal(motion.impact.pose,5);
 }
 assert.equal(expeditionSpriteSequence({...enemy,guarding:true},[enemy],[{type:'action',unitId:'e',kind:'guard'}],art).rest.pose,6);
 assert.equal(expeditionSpriteSequence(enemy,[enemy],[{type:'damage',targetId:'e',unitId:'a',amount:1}],art).impact.pose,7);
 if(id==='shadow-boss')continue;
 for(const kind of ['attack','skill1','skill2']){
  const battle=createExpeditionCombat({battleId:id+'-'+kind,allies:[ally('a',2),ally('b',4)],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:1000,maxHp:1000,power:20,defense:0,speed:20}],getSpecies:profile});
  const result=accepted(battle,{id:'shadow-'+id+'-'+kind,unitId:'e',kind,targetId:'a'},art);
  if(kind!=='attack'){
   if(['shadow-normal-0','shadow-normal-2','shadow-elite-0'].includes(id)){
    assert(result.events.some(e=>e.type==='pull'&&e.targetId==='a'&&e.slot===0));assert.equal(battle.units.find(u=>u.id==='a').slot,0);
   }
   if(['shadow-normal-1','shadow-elite-0','shadow-elite-1'].includes(id))assert(result.events.some(e=>e.type==='vulnerable'));
   if(['shadow-normal-3','shadow-elite-1'].includes(id)){
    assert(result.events.some(e=>e.type==='delay'&&e.unitId==='a'));assert.equal(expeditionCombatTurn(battle).id,'b','unacted target waits behind another living ally');
   }
  }
 }
}
const boss=createExpeditionCombat({battleId:'shadow-boss-motion',allies:[ally('frontB',1),ally('backA',2),ally('backB',3),ally('alone',4)],enemies:expeditionEncounter('shadow',{kind:'boss',battleId:'shadow-boss-motion'}).filter(u=>u.boss),getSpecies:profile});
const bossArt=expeditionEnemyArt('shadow-boss'),kinds=new Set();let firstTarget;
while(boss.phase==='fight'&&boss.round<=8){
 const actor=expeditionCombatTurn(boss),key='shadow-boss-paid-'+commands;
 if(actor.boss){
  const plan=expeditionBossPlan(boss);assert.deepEqual(expeditionBossPlan(restoreExpeditionCombat(boss)),plan);
  const input=expeditionBossCommand(boss,key),out=accepted(boss,input,bossArt);kinds.add(input.kind);
  if(boss.round===1){firstTarget=input.targetId;assert.equal(firstTarget,'backA');assert(out.events.some(e=>e.type==='pull'&&e.targetId===firstTarget&&e.slot===0));}
  if(boss.round===2){assert.equal(input.targetId,firstTarget);assert(out.events.some(e=>e.type==='vulnerable'&&e.targetId===firstTarget));}
 }else accepted(boss,{id:key,unitId:actor.id,kind:'guard'},bossArt);
 assert(commands<180);
}
assert.deepEqual([...kinds].sort(),['attack','guard','skill1']);assert(pulls>8&&delays===4&&marks>8);
assert(!expeditionGardenAssetBatch('shadow',{partySpeciesIds:['orbit'],includeEncounter:true,base:'./'}).some(p=>p.includes('/expedition/')&&p.includes('-motion-')),'full sheets are encounter-lazy');
console.log(`PASS Shadow seven native candidates: ${commands} paid actions, ${pulls} pulls/${delays} turn delays/${marks} vulnerability events; real empty-front and previous-column boss targets, exact save/replay, presentation cannot mutate combat. Final visual/device acceptance pending.`);
