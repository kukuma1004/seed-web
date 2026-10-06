import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {EXPEDITION_JOB_PASSIVES,expeditionJobPassive,applyExpeditionMilestonesToActions as grow,expeditionMilestoneActionHint as hint,expeditionMilestoneHomeHint} from '../src/expedition/milestones.js';
import {createExpeditionCombat as create,performExpeditionCombatAction as act,expeditionCombatTurn as turn,checkpointExpeditionCombat as checkpoint,restoreExpeditionCombat as restore} from '../src/expedition/combat.js';
import {nextExpeditionRuntimeAccount as next,auditExpeditionRuntimeTransaction as audit} from '../src/expedition/account-runtime.js';
import {decodeExpeditionAccount} from '../src/expedition/account-codec.js';
import {createExpeditionLineageReceipt,replayExpeditionLineageReceipt} from '../src/expedition/account-lineage.js';
import {EXPEDITION_RELICS,applyExpeditionRelicsToActions} from '../src/expedition/relics.js';
import {expeditionProtectionActionHint,expeditionProtectionStatus} from '../src/expedition/battle-presentation.js';
const frozen=JSON.parse(readFileSync(new URL('./fixtures/expedition-milestones-runtime-v3.json',import.meta.url),'utf8'));
let groups=0,commands=0,serial=0;
async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
const clone=v=>structuredClone(v);
const input=(id,slot,extra={})=>({id,speciesId:'test',slot,hp:2000,maxHp:2000,power:100,defense:0,speed:10,level:7,...extra});
function battle(law,level=3,enemyExtra={}){return create({allies:[input('a',0,{speciesId:law,level,speed:30,actions:grow(law,EXPEDITION_SPECIES[law].actionPattern,level)})],enemies:[input('e',0,enemyExtra),input('f',1),input('g',2)]});}
function perform(s,kind='attack',extra={}){const result=act(s,{id:'milestone-'+(++serial),unitId:turn(s).id,kind,...extra});assert(result.ok,JSON.stringify(result));commands++;assert.deepEqual(restore(checkpoint(s)),s);return result;}
await check('126 individuals inherit ONE dominant-law passive at Lv3; 36 twins stay pairs; canonical actions immutable',()=>{
 const original=JSON.stringify(EXPEDITION_SPECIES);let individuals=0,pairs=0,different=0;
 for(const species of Object.values(EXPEDITION_SPECIES)){
  const base=species.actionPattern,at2=grow(species.id,base,2),at3=grow(species.id,base,3),at6=grow(species.id,base,6),at7=grow(species.id,base,7);
  assert.deepEqual(at2,base);assert.notEqual(at2,base);
  if(species.kind==='twin'){pairs++;assert.equal(expeditionJobPassive(species.id),null);assert.deepEqual(at3,base);assert.deepEqual(at7,base);continue;}
  individuals++;if(species.dominantLaw!==species.laws[0])different++;
  assert.equal(expeditionJobPassive(species.id),EXPEDITION_JOB_PASSIVES[species.dominantLaw]);
  assert.deepEqual(at3.attack,[...base.attack,EXPEDITION_JOB_PASSIVES[species.dominantLaw].operation]);assert.deepEqual(at6,at3);
  assert.deepEqual(at7.attack,at3.attack);assert.deepEqual(at7.awaken,base.awaken);
  for(const [kind,ops] of Object.entries(at7)){
   assert(ops.length<=8);if(!['skill1','skill2'].includes(kind))continue;
   assert.equal(ops.length,base[kind].length);
   ops.forEach((op,index)=>{const before=base[kind][index];for(const key of ['type','target','when','maxTargets','rounds','charges','gaugeAdd','gaugeSpend','column','ignoreFront'])assert.equal(op[key],before[key]);assert((op.ratio??0)<=3);assert((op.amount??op.stacks??1)<=3);});
  }
  const combined=applyExpeditionRelicsToActions(species.id,at7,Object.keys(EXPEDITION_RELICS));
  const s=create({allies:[input('a',0,{speciesId:species.id,level:7,actions:combined})],enemies:[input('e',0)]});assert.deepEqual(restore(checkpoint(s)),s);
  assert.equal(hint(s,s.units[0],'attack'),expeditionJobPassive(species.id).name);
  const disabled=clone(s.units[0]),passiveOp=disabled.actions.attack.at(-1);if(Object.hasOwn(expeditionJobPassive(species.id).operation,'ratio'))passiveOp.ratio=0;else passiveOp.amount=0;assert.equal(hint(s,disabled,'attack'),'');
  for(const kind of ['skill1','skill2'])assert.equal(hint(s,s.units[0],kind),'Lv.7 강화',`${species.id} ${kind}`);
 }
 assert.equal(individuals,126);assert.equal(pairs,36);assert.equal(different,36);assert.equal(JSON.stringify(EXPEDITION_SPECIES),original);
 assert.deepEqual(grow('enemy-test',{attack:[{type:'damage',target:'single',ratio:1}]},10),{attack:[{type:'damage',target:'single',ratio:1}]});
});
await check('All nine passive effects produce actual bounded receipts after the right trigger',()=>{
 for(const law of Object.keys(EXPEDITION_JOB_PASSIVES)){
  if(law==='reflect')continue;const s=battle(law),out=perform(s,'attack',{targetId:'e'}),enemy=s.units.find(u=>u.id==='e');
  assert.equal(out.events.filter(e=>e.type==='damage'&&e.kind==='attack')[0].amount,Math.round(100*EXPEDITION_SPECIES[law].actionPattern.attack[0].ratio));
  if(law==='pierce'){assert.equal(out.events.filter(e=>e.type==='damage').length,4);assert.equal(s.units.find(u=>u.id==='g').hp,1905);}
  if(law==='split'){assert.equal(out.events.filter(e=>e.type==='damage').length,3);assert.equal(s.units.find(u=>u.id==='f').hp,1980);}
  if(law==='gravity')assert.equal(enemy.status.vulnerable,1);
  if(law==='chain'){assert.equal(enemy.status.conductive,1);assert(!out.events.some(e=>e.type==='chain'),'mark prepares the next attack, never a retroactive chain');}
  if(law==='frost')assert.equal(enemy.status.chill,1);
  if(law==='orbit')assert.equal(s.units[0].status.protection,25);
  if(['burst','recall'].includes(law)){assert.equal(s.pending.length,law==='burst'?3:1);assert(s.pending.every(p=>p.dueRound===2));while(turn(s).id!=='a')perform(s,'guard');assert.equal(s.pending.length,0);assert(s.log.some(e=>e.type==='damage'&&e.kind==='attack'&&e.round===2));}
 }
 const s=create({allies:[input('a',0,{speciesId:'reflect',speed:30,level:3,actions:grow('reflect',EXPEDITION_SPECIES.reflect.actionPattern,3)})],enemies:[input('e',0,{power:40})]});
 perform(s,'guard');perform(s,'attack',{targetId:'a'});assert.equal(s.units[0].guardedReceipt,true);perform(s,'attack',{targetId:'e'});assert.equal(s.units[0].counter.ratio,.3);assert.equal(s.units[0].counter.uses,1);const reply=perform(s,'attack',{targetId:'a'});assert(reply.events.some(e=>e.type==='damage'&&e.kind==='counter'&&e.amount===30));assert.equal(s.units[0].counter.uses,0);
});
await check('Lv2, fully shielded hits, dead targets and counter-death do not invent passive procs',()=>{
 for(const law of ['gravity','chain','frost','orbit','recall','burst','pierce','split']){const low=battle(law,2),receipt=perform(low,'attack',{targetId:'e'});assert.equal(receipt.events.filter(e=>e.type==='damage').length,law==='pierce'?2:1);assert.equal(low.pending.length,0);assert.equal(low.units[0].status.protection,0);}
 const blocked=battle('gravity',3,{status:{protection:2000}}),out=perform(blocked,'attack',{targetId:'e'});assert.equal(out.events.find(e=>e.type==='damage').amount,0);assert.equal(blocked.units[1].status.vulnerable,0);
 const dead=battle('gravity',3,{hp:10});perform(dead,'attack',{targetId:'e'});assert.equal(dead.units[1].dead,true);assert(dead.units.every(u=>u.status.vulnerable===0));
 const self=battle('orbit',3,{hp:10});perform(self,'attack',{targetId:'e'});assert.equal(self.units[0].status.protection,25);
 const killed=battle('orbit');killed.units[0].hp=10;killed.units[1].counter={ratio:3,uses:1,expiresRound:1};perform(killed,'attack',{targetId:'e'});assert.equal(killed.units[0].dead,true);assert.equal(killed.units[0].status.protection,0);
});
await check('Lv7 improves real skill damage/marks, keeps Lv5 skill2 gate and boss/status/protection caps',()=>{
 const low=battle('pierce',6),high=battle('pierce',7),a=perform(low,'skill1',{targetId:'e'}),b=perform(high,'skill1',{targetId:'e'});assert.equal(a.events.find(e=>e.type==='damage').amount,110);assert.equal(b.events.find(e=>e.type==='damage').amount,125);
 const cold=battle('frost',7,{boss:true});const freeze=perform(cold,'skill1',{targetId:'e'});assert.equal(cold.units[1].status.chill,0);assert.equal(cold.delayed.includes('e'),true);assert.equal(freeze.events.filter(e=>e.type==='bossDelay').length,1);
 const ward=battle('orbit',7);ward.units[0].status.protection=ward.units[0].maxHp;perform(ward,'skill1',{targetId:'a'});assert.equal(ward.units[0].status.protection,2000);assert.equal(expeditionProtectionStatus(ward,ward.units[0]),'보호 2000 / 2000');assert.equal(expeditionProtectionActionHint(ward,ward.units[0],'skill1'),'보호는 대상 최대 HP까지');
 const locked=battle('pierce',4),raw=JSON.stringify(locked);assert.equal(act(locked,{id:'locked-skill',unitId:'a',kind:'skill2',targetId:'e'}).ok,false);assert.equal(JSON.stringify(locked),raw);
});
await check('Frozen high-level runtime3 creation and action stay byte-identical; tx4 never recompiles saved combat2',async()=>{
 for(const f of frozen.cases){const r=await next(f.previous,{owner:frozen.owner,transaction:f.transaction,writer:frozen.writer,now:f.now});assert(r.ok,r.reason);assert.equal(r.raw,f.raw);assert.deepEqual(r.events,f.events);assert((await audit(f.previous,f.raw,{owner:frozen.owner,transaction:f.transaction})).ok);}
 const f=frozen.cases[1],tx={...f.transaction,version:4},r=await next(f.previous,{owner:frozen.owner,transaction:tx,writer:frozen.writer,now:f.now});assert(r.ok,r.reason);assert.equal(r.raw,f.raw);assert.deepEqual(r.events,f.events);assert.equal(r.record.state.battle.version,2);
 const receipt=await createExpeditionLineageReceipt(f.previous,r.raw,{owner:frozen.owner,transaction:tx});assert(receipt.ok,receipt.reason);const replay=await replayExpeditionLineageReceipt(f.previous,receipt.receipt,{owner:frozen.owner});assert(replay.ok);assert.equal(replay.raw,f.raw);
});
await check('Fresh tx4 battle compiles Lv7 once; account codec/restore preserve actions; enemy/resonance rules unchanged',async()=>{
 const f=frozen.cases[0],r=await next(f.previous,{owner:frozen.owner,transaction:{...f.transaction,version:4},writer:frozen.writer,now:f.now});assert(r.ok,r.reason);const battle=r.record.state.battle;assert.equal(battle.version,3);assert(decodeExpeditionAccount(r.raw,{owner:frozen.owner}));assert.deepEqual(restore(checkpoint(battle)),battle);
 const old=JSON.parse(f.raw).state.battle;assert.deepEqual(battle.units.filter(u=>u.side==='enemy'),old.units.filter(u=>u.side==='enemy'));assert.deepEqual(battle.resonances,old.resonances);
 for(const u of battle.units.filter(u=>u.side==='ally')){assert.equal(u.level,7);assert.equal(u.actions.attack.length,2);assert.equal(hint(battle,u,'attack'),expeditionJobPassive(u.speciesId).name);assert.equal(hint(battle,u,'skill1'),'Lv.7 강화');assert.equal(hint(old,u,'attack'),'');assert.equal(hint(null,u,'attack'),'');assert.match(expeditionMilestoneHomeHint(u),/해금/);}
 const actor=turn(battle),target=battle.units.find(u=>u.side==='enemy'&&u.slot<2),command={type:'action',kind:'skill1',targetId:target.id},tx={version:4,kind:'runtime',receiptId:`write-${r.record.revision+1}-milestone-skill`,commands:[command],generatedIds:[]};
 const result=await next(r.record,{owner:frozen.owner,transaction:tx,writer:frozen.writer,now:f.now+1});assert(result.ok,result.reason);assert.equal(result.record.state.battle.version,3);assert.deepEqual(result.record.state.battle.units.find(u=>u.id===actor.id).actions,actor.actions);assert((await audit(r.record,result.raw,{owner:frozen.owner,transaction:tx})).ok);
 const uncompiled={...battle.units[0],actions:EXPEDITION_SPECIES[battle.units[0].speciesId].actionPattern};assert.equal(hint(battle,uncompiled,'attack'),'');assert.equal(hint(battle,uncompiled,'skill1'),'');
});
await check('Five simultaneous delayed passives stay within pending/event/action budgets through 1024 commands',()=>{
 const a=Array.from({length:5},(_,i)=>input('a'+i,i,{speciesId:'burst',level:7,power:1,hp:100000,maxHp:100000,speed:30-i,actions:grow('burst',EXPEDITION_SPECIES.burst.actionPattern,7)})),e=Array.from({length:5},(_,i)=>input('e'+i,i,{hp:100000,maxHp:100000,power:1,speed:10-i})),s=create({allies:a,enemies:e});let peakPending=0,peakEvents=0;
 while(s.phase==='fight'){const u=turn(s),receipt=perform(s,u.side==='ally'?'attack':'guard',u.side==='ally'?{targetId:'e0'}:{});peakPending=Math.max(peakPending,s.pending.length);peakEvents=Math.max(peakEvents,receipt.events.length);assert(s.actionCount<=1024);}
 assert.equal(s.phase,'limit');assert.equal(s.actionCount,1024);assert.equal(peakPending,15);assert(peakEvents<=128);assert(s.log.length<=256);assert(s.units.every(u=>u.hp>0));console.log(`BOUND pending ${peakPending}/32 · events ${peakEvents}/128 · actions ${s.actionCount}/1024`);
});
console.log(`Expedition milestones: ${groups} groups / ${commands} accepted engine commands PASS. Synthetic local evidence; no human/device/cloud balance acceptance.`);
