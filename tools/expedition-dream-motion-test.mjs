import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {expeditionEnemyArt,expeditionGardenAssetBatch} from '../src/expedition/art.js';
import {expeditionSpriteSequence} from '../src/expedition/sprite-motion.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {getExpeditionSpecies} from '../src/expedition/species.js';
import {expeditionEnemyProfile,expeditionEncounter} from '../src/expedition/world.js';
import {expeditionBossCommand,expeditionBossPlan} from '../src/expedition/boss-ai.js';
const ids=['dream-normal-0','dream-normal-1','dream-normal-2','dream-normal-3','dream-elite-0','dream-elite-1','dream-boss'];
const attackPoses={'dream-normal-0':[1,3],'dream-normal-1':[1,2,3],'dream-normal-2':[1,2,3],'dream-normal-3':[1,3],'dream-elite-0':[1,2],'dream-elite-1':[1,2,3],'dream-boss':[1,3]};
const profile=s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s);
const ally=(id,slot)=>({id,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:20,defense:0,speed:0});
let paid=0,counters=0,protections=0,returns=0,marks=0;
function accepted(battle,input,art){
 const restored=restoreExpeditionCombat(battle),left=performExpeditionCombatAction(battle,input),right=performExpeditionCombatAction(restored,input);
 assert(left.ok,left.reason);assert.deepEqual(left,right);assert.deepEqual(battle,restored);
 const saved=JSON.stringify(battle),enemy=battle.units.find(u=>u.side==='enemy');
 for(let i=0;i<8;i++)expeditionSpriteSequence(enemy,battle.units,left.events,art);
 assert.equal(JSON.stringify(battle),saved,'presentation cannot add counter charges, protection, pending returns or damage');
 assert.deepEqual(restoreExpeditionCombat(battle),battle);assert.equal(performExpeditionCombatAction(battle,input).ok,false);assert.equal(JSON.stringify(battle),saved);
 paid++;counters+=left.events.filter(e=>e.type==='counterReady').length;protections+=left.events.filter(e=>e.type==='protection').length;returns+=left.events.filter(e=>e.type==='returnWarning').length;marks+=left.events.filter(e=>e.type==='vulnerable').length;return left;
}
for(const id of ids){
 const art=expeditionEnemyArt(id),file=new URL('../public/assets/'+art.motionPath,import.meta.url),native=readFileSync(file);
 assert.equal(art.ready,false);assert.equal(art.facing,'left');assert(art.motionDefects.length);assert(statSync(file).size<300000);
 assert.equal(native.toString('ascii',0,4),'RIFF');assert.equal(native.toString('ascii',8,12),'WEBP');
 const enemy={id:'e',side:'enemy',speciesId:id,hp:100};
 for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<6;seq++){
  const motion=expeditionSpriteSequence(enemy,[enemy],[{type:'action',unitId:'e',kind,seq}],art);
  assert.equal(motion.duration,720);assert.equal(motion.preparation.pose,4);assert.equal(motion.rest.pose,0);
  if(kind==='attack')assert(attackPoses[id].includes(motion.impact.pose),'never use raised-wing/rearing-hoof windup as impact');else assert.equal(motion.impact.pose,5);
 }
 assert.equal(expeditionSpriteSequence({...enemy,guarding:true},[enemy],[{type:'action',unitId:'e',kind:'guard'}],art).rest.pose,6);
 assert.equal(expeditionSpriteSequence(enemy,[enemy],[{type:'damage',targetId:'e',unitId:'a',amount:1}],art).impact.pose,7);
 if(id==='dream-boss')continue;
 for(const kind of ['attack','skill1','skill2']){
  const battle=createExpeditionCombat({battleId:id+'-'+kind,allies:[ally('a',0)],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:1000,maxHp:1000,power:20,defense:0,speed:20}],getSpecies:profile});
  const out=accepted(battle,{id:id+'-'+kind,unitId:'e',kind,targetId:'a'},art);
  if(kind!=='attack'){
   if(id==='dream-normal-0')assert(out.events.some(e=>e.type==='counterReady'));
   if(id==='dream-normal-1')assert(out.events.some(e=>e.type==='protection')&&battle.units.find(u=>u.id==='e').status.protection>0);
   if(['dream-normal-2','dream-elite-0'].includes(id))assert(out.events.some(e=>e.type==='returnWarning')&&battle.pending.length>0);
   if(['dream-normal-3','dream-elite-0','dream-elite-1'].includes(id))assert(out.events.some(e=>e.type==='vulnerable'));
  }
  const enemyBefore=structuredClone(battle.units.find(u=>u.id==='e'));
  const hit=accepted(battle,{id:id+'-'+kind+'-reply',unitId:'a',kind:'attack',targetId:'e'},art);
  if(enemyBefore.counter.uses>0){assert(hit.events.some(e=>e.type==='damage'&&e.kind==='counter'&&e.unitId==='e'&&e.targetId==='a'));assert.equal(battle.units.find(u=>u.id==='e').counter.uses,0,'counter only once per paid charge');}
 }
}
const boss=createExpeditionCombat({battleId:'dream-boss-motion',allies:[ally('a',0)],enemies:expeditionEncounter('dream',{kind:'boss',battleId:'dream-boss-motion'}).filter(u=>u.boss),getSpecies:profile}),art=expeditionEnemyArt('dream-boss'),kinds=new Set();
while(boss.phase==='fight'&&boss.round<=8){
 const actor=expeditionCombatTurn(boss),id='dream-boss-paid-'+paid;assert.deepEqual(expeditionBossPlan(restoreExpeditionCombat(boss)),expeditionBossPlan(boss));
 const input=actor.boss?expeditionBossCommand(boss,id):{id,unitId:actor.id,kind:'attack',targetId:boss.units.find(u=>u.boss).id};
 const out=accepted(boss,input,art);if(actor.boss)kinds.add(input.kind);
 if(actor.boss&&input.kind==='skill1')assert(out.events.some(e=>e.type==='counterReady')&&out.events.some(e=>e.type==='protection'));
 assert(paid<100);
}
assert(kinds.has('attack')&&kinds.has('guard')&&kinds.has('skill1'));assert(counters>2&&protections>2&&returns===4&&marks>=6);
assert(!expeditionGardenAssetBatch('dream',{partySpeciesIds:['orbit'],includeEncounter:true,base:'./'}).some(p=>p.includes('/expedition/')&&p.includes('-motion-')));
console.log(`PASS Dream seven native candidates: ${paid} paid actions; ${counters} counters/${protections} protections/${returns} fixed return warnings/${marks} marks, immutable presentation and exact restore/replay. Visual/device final acceptance pending.`);
