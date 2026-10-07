// Recipe coverage is deliberately not an art, balance or completion certificate.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {LAWS} from '../src/laws.js';
import {DISCOVERY_FORMS} from '../src/forms.js';
import {DUEL_CHARACTERS,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {DUEL_STORY_STAGES} from '../src/seed-duel-story.js';

const originals=[...Object.entries(LAWS).map(([id,f])=>({id,name:f.name,kind:'base',laws:[id]})),
 ...Object.values(DISCOVERY_FORMS).map(f=>({id:f.id,name:f.name,kind:f.twin?'twin':f.awakened?'final':f.solo?'solo':'fusion',laws:[...f.requires]}))];
const originalById=new Map(originals.map(f=>[f.id,f]));

// Current private connection contract. Recipe totals come from the ORIGINAL
// book, never from the roster being asserted. Thirteen independent fighters
// remain a separate explicit boundary; public36 and completion remain gated.
export const DUEL_CATALOG_COUNT_CONTRACT=Object.freeze({
 sourceTotal:originalById.size,
 twinTotal:originals.filter(f=>f.kind==='twin').length,
 independentExtras:13,
 privateRoster:originalById.size+13,
 publicRoster:36,
 unconnected:0,
 completedArt:null,
 completedBalance:null,
 fullyVerified:null,
});

export function duelCatalogCoverage(characters=DUEL_CHARACTERS,order=DUEL_ORDER,stages=DUEL_STORY_STAGES){
 assert.equal(originalById.size,162,'the source book must contain exactly162 distinct recipes');
 assert.equal(new Set(order).size,order.length,'selectable fighter IDs are unique');
 assert.deepEqual([...order].sort(),Object.keys(characters).sort(),'all fighters are selectable once');
 const linked=new Map(),independent=[];
 for(const id of order){
  const c=characters[id],recipeId=c.comboId||(Object.hasOwn(LAWS,id)?id:null);
  if(!recipeId){independent.push(id);continue;}
  const recipe=originalById.get(recipeId);assert(recipe,`${id} references an unknown original recipe`);
  assert(!linked.has(recipeId),`${recipeId} has duplicate fighter mappings`);
  assert.equal(c.id,id,'fighter key and saved identity agree');
  assert(recipe.laws.includes(c.law||id),`${id} adapter law must come from its original recipe`);
  assert(stages.some(stage=>stage.enemy===id),`${id} is missing its story encounter`);
  linked.set(recipeId,id);
 }
 const rows=originals.map(f=>({...f,characterId:linked.get(f.id)||null,status:linked.has(f.id)?'connected-candidate':'unconnected'}));
 const byKind=Object.fromEntries(['base','solo','fusion','final','twin'].map(kind=>[kind,{total:rows.filter(f=>f.kind===kind).length,connected:rows.filter(f=>f.kind===kind&&f.characterId).length}]));
 assert.deepEqual(Object.fromEntries(Object.entries(byKind).map(([k,v])=>[k,v.total])),{base:9,solo:9,fusion:36,final:72,twin:36});
 return {sourceTotal:originalById.size,roster:order.length,connected:linked.size,unconnected:originalById.size-linked.size,fullyVerified:null,
  verification:'Completion requires separate art, human play, device, audio, save and balance evidence; connection is not completion.',independent,byKind,rows};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const result=duelCatalogCoverage();
 // The old independently authored prism happens to share a recipe ID. That
 // name alone cannot turn it into a verified reflect+split adaptation.
 if(!DUEL_CHARACTERS.prism.comboId)assert(result.independent.includes('prism'),'matching an old name is not original-recipe coverage');
 const duplicate={...DUEL_CHARACTERS,duplicate:{...DUEL_CHARACTERS.blastlance,id:'duplicate'}};
 assert.throws(()=>duelCatalogCoverage(duplicate,[...DUEL_ORDER,'duplicate']),/duplicate fighter mappings/);
 const invalid={...DUEL_CHARACTERS,blastlance:{...DUEL_CHARACTERS.blastlance,comboId:'not-a-recipe'}};
 assert.throws(()=>duelCatalogCoverage(invalid),/unknown original recipe/);
 const index=process.argv.indexOf('--output');
 if(index>=0){assert(process.argv[index+1],'--output requires a file path');writeFileSync(process.argv[index+1],JSON.stringify(result,null,2)+'\n');}
 const {rows,...summary}=result;console.log(JSON.stringify(summary));
}
