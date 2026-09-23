import {readFileSync,writeFileSync} from 'node:fs';
import {TWIN_FORMS} from '../src/forms.js';
import {FINAL_BRANCH_PATTERNS} from '../src/final-branch-patterns.js';

const root=new URL('../',import.meta.url);
const matrix=JSON.parse(readFileSync(new URL('docs/COMBO_162_FINAL_BRANCH_MATRIX.json',root),'utf8'));
const final=matrix.pairs.flatMap(({fusion,laws,branches})=>branches.map(branch=>({
 id:branch.id,kind:'final',fusion,laws,addedLaw:branch.addedLaw,addedSolo:branch.addedSolo,
 name:branch.name,behavior:branch.behavior,visual:branch.visual,role:branch.role,tradeoff:branch.tradeoff,
 status:branch.status,combatMotion:FINAL_BRANCH_PATTERNS[branch.id]?.motion||null,variation:FINAL_BRANCH_PATTERNS[branch.id]?.variation||null
})));
const twin=Object.values(TWIN_FORMS).map(f=>({id:f.id,kind:'twin',name:f.name,parts:f.parts,laws:f.requires,
 behavior:f.desc,visual:f.desc,role:f.strength,tradeoff:f.weakness,status:'implemented_existing'}));
if(final.length!==72||twin.length!==36||new Set([...final,...twin].map(x=>x.id)).size!==108)
 throw Error(`Identity count mismatch: ${final.length}+${twin.length}`);
const entries=[...final,...twin].map((x,i)=>({...x,atlas:Math.floor(i/36),tile:i%36}));
writeFileSync(new URL('src/final-identity-manifest.json',root),JSON.stringify({version:1,source:'COMBO_162_FINAL_BRANCH_MATRIX.json + TWIN_FORMS',entries},null,2)+'\n');
console.log(`Wrote ${entries.length} final/twin visual records`);
