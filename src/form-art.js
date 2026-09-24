import {CURATED_FORMS,SOLO_FORMS,GENERATED_FORMS,AWAKEN_FORMS,TWIN_FORMS,SECOND_FORMS} from './forms.js';
import {FIRST_FUSIONS,FIRST_FUSION_BY_ID} from './combo-catalog.js';
import {comboArt} from './combo-art.js';
import {finalArt} from './final-identity-art.js';
// One authored illustration for each completed form, in a 4 by 3 atlas.
const TILES={collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
// Solo evolutions use their own painted 4 by 3 atlas. The last three cells stay empty.
const LAW_TILES={reflect:0,split:1,pierce:2,orbit:3,burst:4,gravity:5,recall:6,frost:9,chain:10};
export const SOLO_ATLAS='seed-solo-atlas-v3-ui.webp';
export const FUSION_ATLAS='seed-forms-atlas-v4-ui.png';
const SOLO_TILES={mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8};
const BASE=import.meta.env?.BASE_URL||'/';
const tileStyle=(file,tile)=>`background-image:url('${BASE}assets/${file}');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*50}%`;
const soloStyle=id=>id==='riftseed'?tileStyle('seed-law-atlas-v4-ui.webp',7):tileStyle(SOLO_ATLAS,SOLO_TILES[id]);
// Awakened evolutions have their own mature relic paintings; twins combine two
// solo relics and keep the same gold awakening frame.
export const AWAKEN_ATLAS='seed-awaken-atlas-v1-ui.webp';
const AWAKEN_TILES={bigcrunch:0,frostarmada:1,thousandblades:2,infiniteprism:3,skyspear:4,icegarden:5,tempestcrown:6,maelstrom:7,bloomtempest:8,mirrorhall:9};
// Hand-painted, 5x4 atlas for the twenty curated second fusions. Keep the
// catalog's stable IDs: saves and the illustrated cards must agree.
export const SECOND_ATLAS='seed-second-forms-atlas-v1-ui.webp';
export const FIRST_CANDIDATE_ATLAS='seed-first-forms-atlas-v1-ui.webp';
const FIRST_CANDIDATE_ART_IDS=[
 'icicle','halobloom','frostnet','rewindbolt','refractlance',
 'thundermirror','sunmirror','pierceshower','ebbring','pullgarden',
 'spearring','accretiondisk','rimeback','coldwell','rimepetal','echolane'
];
const FIRST_CANDIDATE_ART_TILES=Object.freeze(Object.fromEntries(FIRST_CANDIDATE_ART_IDS.map((id,tile)=>[id,tile])));
const SECOND_ART_IDS=[
 'x651-19-31','x363-10-13','x732-22-40','x903-32-36','x317-08-38',
 'x316-08-37','x388-10-38','x630-18-36','x856-29-31','x718-22-26',
 'x500-14-20','x683-20-38','x381-10-31','x857-29-32','x305-08-26',
 'x916-33-37','x730-22-38','x894-31-40','x631-18-37','x478-13-29'
];
const SECOND_ART_TILES=Object.freeze(Object.fromEntries(SECOND_ART_IDS.map((id,tile)=>[id,tile])));
const secondTileStyle=tile=>`background-image:url('${BASE}assets/${SECOND_ATLAS}');background-position:${tile%5*25}% ${Math.floor(tile/5)*100/3}%`;
const firstCandidateTileStyle=tile=>`background-image:url('${BASE}assets/${FIRST_CANDIDATE_ATLAS}');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*100/3}%`;
const pairKey=ids=>[...ids].sort().join('+');
const CURATED_COMBO_ART=Object.freeze(Object.fromEntries(Object.values(CURATED_FORMS).filter(f=>TILES[f.id]===undefined).map(f=>[f.id,FIRST_FUSIONS.find(entry=>pairKey(entry.laws)===pairKey(f.requires))]).filter(([,entry])=>entry)));
export function formArt(id,extra=''){
 if(id==='comethalo')return `<span class="form-art comethalo-art ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/seed-comethalo-card-v1.webp');background-size:cover;background-position:center"></span>`;
 if(Object.hasOwn(FIRST_CANDIDATE_ART_TILES,id))return `<span class="form-art first-candidate-art ${extra}" aria-hidden="true" style="${firstCandidateTileStyle(FIRST_CANDIDATE_ART_TILES[id])}"></span>`;
 if(Object.hasOwn(SECOND_ART_TILES,id))return `<span class="form-art second-art ${extra}" aria-hidden="true" style="${secondTileStyle(SECOND_ART_TILES[id])}"></span>`;
 if(Object.hasOwn(SECOND_FORMS,id))return comboArt(SECOND_FORMS[id],`form-art ${extra}`);
 // Twin awakenings: both solo paintings, split on the diagonal, in the awakened golden frame (until their own art exists).
 if(Object.hasOwn(TWIN_FORMS,id)){
  return finalArt(id,extra);
 }
 if(Object.hasOwn(AWAKEN_FORMS,id)){
  if(AWAKEN_FORMS[id].finalCandidate)return finalArt(id,extra);
  if(id==='pulsegravity')return `<span class="form-art awakened-art ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/seed-pulsegravity-v1-ui.webp');background-size:125%;background-position:center"></span>`;
  const style=AWAKEN_TILES[id]!==undefined?tileStyle(AWAKEN_ATLAS,AWAKEN_TILES[id]):tileStyle(FUSION_ATLAS,TILES[AWAKEN_FORMS[id].base]);
  return `<span class="form-art awakened-art ${extra}" aria-hidden="true" style="${style}"></span>`;
 }
 if(Object.hasOwn(GENERATED_FORMS,id))return comboArt(FIRST_FUSION_BY_ID[id],`form-art ${extra}`);
 if(Object.hasOwn(CURATED_COMBO_ART,id))return comboArt(CURATED_COMBO_ART[id],`form-art curated-art ${extra}`);
 const tile=TILES[id];
 if(tile!==undefined)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle(FUSION_ATLAS,tile)}"></span>`;
 if(Object.hasOwn(SOLO_FORMS,id)){
  if(id==='riftseed')return `<span class="form-art solo-art ${extra}" aria-hidden="true" style="${tileStyle('seed-law-atlas-v4-ui.webp',7)}"></span>`;
  if(SOLO_ATLAS)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle(SOLO_ATLAS,SOLO_TILES[id])}"></span>`;
  return `<span class="form-art solo-art ${extra}" aria-hidden="true" style="${tileStyle('seed-law-atlas-v3-ui.webp',LAW_TILES[SOLO_FORMS[id].requires[0]])}"></span>`;
 }
 return '';
}
