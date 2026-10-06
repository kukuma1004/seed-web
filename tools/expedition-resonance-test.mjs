import assert from 'node:assert/strict';
import {EXPEDITION_RESONANCE_PROFILES,eligibleResonancePairs} from '../src/expedition/resonance.js';
import {EXPEDITION_SPECIES} from '../src/expedition/species.js';
import {createRoster,recruitInstance,setParty,grantInstanceXP,evolveInstance,recordSurvival,unlockTwin,damageInstance,normalizeRoster} from '../src/expedition/roster.js';
import {createExpeditionCombat,performExpeditionCombatAction,checkpointExpeditionCombat,restoreExpeditionCombat,expeditionCombatTurn} from '../src/expedition/combat.js';
const forms=Object.values(EXPEDITION_SPECIES).filter(s=>s.kind==='twin');assert.equal(forms.length,36);assert.equal(Object.keys(EXPEDITION_RESONANCE_PROFILES).length,36);
for(const f of forms){const p=EXPEDITION_RESONANCE_PROFILES[f.id];assert.deepEqual(p.parents,f.parents);assert(p.actions.length>0&&p.actions.length<=8);assert(p.actions.every(a=>a.ratio<=1.4));}
const form=EXPEDITION_SPECIES.frostmirror,r=createRoster({owner:'qa',channel:'review'});
for(const [index,solo]of form.parents.entries()){
 const base=EXPEDITION_SPECIES[solo].parents[0],id=`pair-${index}`;assert(recruitInstance(r,{instanceId:id,speciesId:base}));assert(grantInstanceXP(r,id,500,`xp-${index}`));assert(evolveInstance(r,id,solo,{receiptId:`evo-${index}`,home:true,validateEvolution:()=>true}));
 for(let n=0;n<3;n++)assert(recordSurvival(r,id,{expeditionId:`course-${n}`,boss:n===2}));
}
assert(setParty(r,['pair-0','pair-1',null,null,null,null,null,null]));assert.equal(eligibleResonancePairs(r).length,0);assert.equal(eligibleResonancePairs(r,{unlockedOnly:false}).length,1);assert(unlockTwin(r,'pair-0','pair-1',form.id));assert.equal(Object.keys(r.instances).length,2);assert.equal(eligibleResonancePairs(r,{activeOnly:true}).length,1);
assert(setParty(r,['pair-0',null,null,null,null,'pair-1',null,null]));assert.equal(eligibleResonancePairs(r,{activeOnly:true}).length,0);assert.equal(eligibleResonancePairs(r).length,1);
assert(damageInstance(r,'pair-1',r.instances['pair-1'].hp,{receiptId:'death',place:'test'}));assert.equal(eligibleResonancePairs(r).length,0);assert.equal(r.instances['pair-0'].status,'alive');assert(r.recipes.includes(form.id));assert(r.discoveries.includes(form.id));
assert.notDeepEqual(EXPEDITION_RESONANCE_PROFILES.frostmirror.actions,EXPEDITION_RESONANCE_PROFILES.glassmaze.actions);

// Nine genuine solo histories unlock exactly the36 choose-two canonical forms.
const all=createRoster({owner:'canonical-qa',channel:'review'}),solos=Object.values(EXPEDITION_SPECIES).filter(s=>s.kind==='solo');assert.equal(solos.length,9);
for(const [n,solo]of solos.entries()){const id=String(n).padStart(3,'0')+'m'.repeat(125);assert.equal(id.length,128);assert(recruitInstance(all,{instanceId:id,speciesId:solo.parents[0]}));assert(grantInstanceXP(all,id,500,'all-xp-'+n));assert(evolveInstance(all,id,solo.id,{receiptId:'all-evo-'+n,home:true,validateEvolution:()=>true}));for(let k=0;k<3;k++)assert(recordSurvival(all,id,{expeditionId:'same-course-'+k,boss:k===2}));}
const bodyFor=species=>Object.values(all.instances).find(i=>i.speciesId===species).instanceId;
for(const f of forms)assert(unlockTwin(all,bodyFor(f.parents[0]),bodyFor(f.parents[1]),f.id));
assert(normalizeRoster(all));const pairs=eligibleResonancePairs(all);assert.equal(pairs.length,36);assert.equal(new Set(pairs.map(p=>p.id)).size,36);
for(const p of pairs){assert.equal(p.id,'resonance:'+p.speciesId);assert(p.id.length<=128);assert(p.memberIds.every(id=>id.length===128&&all.instances[id]));}
const reverse=structuredClone(all);reverse.instances=Object.fromEntries(Object.entries(reverse.instances).reverse());assert.deepEqual(eligibleResonancePairs(reverse),pairs);
const binding=pairs.find(p=>p.speciesId===form.id);assert(setParty(all,[...binding.memberIds,null,null,null,null,null,null]));
const units=binding.memberIds.map((id,slot)=>({...all.instances[id],id,slot,speed:100-slot}));const battle=createExpeditionCombat({battleId:'max128-pair',allies:units,enemies:[{id:'enemy',speciesId:'burst',slot:0,hp:10000,maxHp:10000,power:1000,defense:0,speed:50}],resonances:[binding],getSpecies:id=>EXPEDITION_SPECIES[id]});
assert(performExpeditionCombatAction(battle,{id:'long-pair-cast',unitId:binding.memberIds[0],kind:'resonance',resonanceId:binding.id,targetId:'enemy'}).ok);
const resumed=restoreExpeditionCombat(checkpointExpeditionCombat(battle));assert.deepEqual(resumed.resonances[0].memberIds,binding.memberIds);assert(resumed.resonances[0].used);
assert(performExpeditionCombatAction(resumed,{id:'partner-turn',unitId:expeditionCombatTurn(resumed).id,kind:'guard'}).ok);
const deadId=binding.memberIds[1],death=performExpeditionCombatAction(resumed,{id:'kill-partner',unitId:'enemy',kind:'attack',targetId:deadId});assert(death.ok);assert(death.events.some(e=>e.type==='permadeath'&&e.instanceId===deadId));assert(restoreExpeditionCombat(checkpointExpeditionCombat(resumed)).units.find(u=>u.id===deadId).dead);
assert(damageInstance(all,deadId,all.instances[deadId].hp,{receiptId:'long-pair-death',place:'boundary'}));assert(normalizeRoster(all));assert(!eligibleResonancePairs(all).some(p=>p.speciesId===form.id));assert.equal(all.instances[binding.memberIds[0]].status,'alive');assert(all.recipes.includes(form.id));
console.log('PASS36 canonical unique pair IDs plus actual max128 body cast/reload/death; real solo history/recipe/two-active/death eligibility. Behavior/art/balance acceptance is still pending.');
