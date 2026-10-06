import assert from 'node:assert/strict';
import {EXPEDITION_SPECIES,EXPEDITION_TAXONOMY} from '../src/expedition/species.js';
import {expeditionCodexPage,expeditionCodexActionLines,EXPEDITION_CODEX_PAGE_SIZE} from '../src/expedition/codex.js';
import {createRoster,recruitInstance,grantInstanceXP,evolveInstance,damageInstance,normalizeRoster} from '../src/expedition/roster.js';
const ids=Object.keys(EXPEDITION_SPECIES),roster={discoveries:[...ids,'not-canonical',ids[0]],recipes:[ids[0]]},raw=JSON.stringify(roster),seen=[];
for(let page=0;page<14;page++){
 const result=expeditionCodexPage(roster,{page});assert.equal(result.total,162);assert.equal(result.found,162);assert.equal(result.pages,14);assert(result.entries.length<=EXPEDITION_CODEX_PAGE_SIZE);seen.push(...result.entries.map(e=>e.species.id));assert(result.entries.every(e=>e.discovered));
}
assert.equal(seen.length,162);assert.equal(new Set(seen).size,162);assert.deepEqual(new Set(seen),new Set(ids));assert.equal(JSON.stringify(roster),raw);
for(const [kind,count]of Object.entries(EXPEDITION_TAXONOMY)){
 const result=expeditionCodexPage(roster,{kind});assert.equal(result.filteredTotal,count);assert(result.entries.every(e=>e.species.kind===kind));
}
assert.equal(expeditionCodexPage(roster,{page:999}).page,13);assert.equal(expeditionCodexPage(roster,{kind:'__proto__',page:NaN}).page,0);assert.equal(expeditionCodexPage(null).found,0);
for(const id of ids){
 const species=EXPEDITION_SPECIES[id];
 for(const kind of species.kind==='twin'?['resonance']:['attack','skill1','skill2','awaken'])assert(expeditionCodexActionLines(id,kind).length>0,`${id}:${kind}`);
}
assert(expeditionCodexActionLines('frost','skill1').some(line=>line.includes('냉기')));
assert(expeditionCodexActionLines('returnblade','skill1').some(line=>line.includes('라운드 뒤')));
assert.deepEqual(expeditionCodexActionLines('unknown','attack'),[]);
// Death removes the individual, not earned species/recipe records.
const r=createRoster({owner:'codex-review',channel:'review'});assert(recruitInstance(r,{instanceId:'seed',speciesId:'pierce'}));assert(grantInstanceXP(r,'seed',160,'earned-xp-fixture'));
const solo=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='solo'&&s.parents.includes('pierce'));assert(evolveInstance(r,'seed',solo.id,{receiptId:'evolved-fixture',home:true,validateEvolution:()=>true}));assert(damageInstance(r,'seed',1000,{receiptId:'death-fixture',place:'declared test'}));
const saved=normalizeRoster(r,{owner:'codex-review',channel:'review'});assert(saved);const entry=expeditionCodexPage(saved,{kind:'solo'}).entries.find(e=>e.species.id===solo.id);assert(entry.discovered&&entry.recipe);assert.equal(saved.instances.seed.status,'dead');
console.log('PASS canonical162 exactly once in14 bounded pages, taxonomy9/9/36/72/36, actual turn descriptions, immutable discovery/recipe records through evolution and death.');
