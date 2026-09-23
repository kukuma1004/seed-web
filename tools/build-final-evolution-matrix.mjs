import fs from 'node:fs';
import path from 'node:path';
import {CURATED_FORMS,SOLO_FORMS,AWAKEN_FORMS} from '../src/forms.js';

// The attached draft is reference material, not a runnable content table.
// Resolve every proposal against the game's actual ids before reviewing a batch.
const source=process.argv[2]||new URL('../docs/SEED_FINAL_EVOLUTIONS_72_DRAFT_v1.json',import.meta.url);
const output=process.argv[3]||new URL('../docs/COMBO_162_FINAL_BRANCH_MATRIX.json',import.meta.url);
const draft=JSON.parse(fs.readFileSync(source,'utf8'));
const lawId={폭발:'burst',공전:'orbit',반사:'reflect',관통:'pierce',중력:'gravity',연쇄:'chain',얼음:'frost',분열:'split',귀환:'recall'};
const pairKey=laws=>[...laws].sort().join('+');
const fusions=new Map(Object.values(CURATED_FORMS).map(f=>[pairKey(f.requires),f]));
const solos=new Map(Object.values(SOLO_FORMS).map(f=>[f.requires[0],f]));
const awakenings=new Map(Object.values(AWAKEN_FORMS).map(f=>[`${f.base}+${f.addedSolo}`,f]));
const pairs=draft.fusion_pairs.map(item=>{
 const laws=item.fusion_ko.map(name=>lawId[name]);
 const fusion=fusions.get(pairKey(laws));
 if(!fusion||item.branches.length!==2)throw new Error(`Unknown pair: ${item.fusion_ko.join('+')}`);
 const branches=item.branches.map(branch=>{
  const addedLaw=lawId[branch.added_solo_evolution_ko],addedSolo=solos.get(addedLaw);
  if(!fusion.requires.includes(addedLaw)||!addedSolo)throw new Error(`Invalid solo: ${branch.id}`);
  const implemented=awakenings.get(`${fusion.id}+${addedSolo.id}`);
  return {
   designId:branch.id,id:implemented?.id||`final-${fusion.id}-${addedLaw}`,
   status:implemented?'implemented_existing':'design_only',
   name:implemented?.name||branch.name_ko,conceptName:branch.name_ko,
   fusion:fusion.id,addedSolo:addedSolo.id,addedLaw,
   behavior:implemented?.desc||branch.behavior,
   proposedBehavior:branch.behavior,visual:branch.visual_signature,
   role:branch.intended_role,tradeoff:branch.intended_tradeoff
  };
 });
 if(new Set(branches.map(b=>b.addedLaw)).size!==2)throw new Error(`Duplicate branches: ${fusion.id}`);
 return {fusion:fusion.id,laws:[...fusion.requires],branches,contrast:item.branch_contrast,guardrail:item.test_and_guardrail};
});
if(pairs.length!==36||pairs.reduce((n,p)=>n+p.branches.length,0)!==72)throw new Error('Expected 36 pairs and 72 branches');
if(pairs.flatMap(p=>p.branches).filter(b=>b.status==='implemented_existing').length!==Object.keys(AWAKEN_FORMS).length)throw new Error('Implemented awakenings did not map exactly once');
const matrix={version:1,source:path.basename(source instanceof URL?source.pathname:source),scope:'9 basic + 9 solo + 36 fusion + 72 fusion-and-solo + 36 solo twins = 162 identities',
 releaseRule:'design_only branches are never in the selection pool or player codex',pairs};
fs.writeFileSync(output,JSON.stringify(matrix,null,2)+'\n','utf8');
const implemented=pairs.flatMap(p=>p.branches).filter(b=>b.status==='implemented_existing').length;
console.log(`Wrote ${pairs.length} pairs, 72 branches (${implemented} implemented, ${72-implemented} design-only) to ${output}`);
