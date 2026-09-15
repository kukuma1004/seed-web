import {SOLO_FORMS,AWAKEN_FORMS,TWIN_FORMS} from './forms.js';
// One authored illustration for each completed form, in a 4 by 3 atlas.
const TILES={collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
// Solo evolutions use their own painted 4 by 3 atlas. The last three cells stay empty.
const LAW_TILES={reflect:0,split:1,pierce:2,orbit:3,burst:4,gravity:5,recall:6,frost:9,chain:10};
export const SOLO_ATLAS='seed-solo-atlas-v2.png';
export const FUSION_ATLAS='seed-forms-atlas-v4-ui.png';
const SOLO_TILES={mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8};
const BASE=import.meta.env?.BASE_URL||'/';
const tileStyle=(file,tile)=>`background-image:url('${BASE}assets/${file}');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*50}%`;
// Awakened evolutions: their own atlas once it is painted (AWAKEN_ATLAS), until then the fusion's picture in a golden frame.
export const AWAKEN_ATLAS='';
const AWAKEN_TILES={bigcrunch:0,frostarmada:1,thousandblades:2,infiniteprism:3,skyspear:4,icegarden:5,tempestcrown:6,maelstrom:7,bloomtempest:8,mirrorhall:9};
export function formArt(id,extra=''){
 // Twin awakenings: both solo paintings, split on the diagonal, in the awakened golden frame (until their own art exists).
 if(Object.hasOwn(TWIN_FORMS,id)){
  const [a,b]=TWIN_FORMS[id].parts;
  return `<span class="form-art awakened-art twin-art ${extra}" aria-hidden="true"><i style="${tileStyle(SOLO_ATLAS,SOLO_TILES[a])}"></i><i style="${tileStyle(SOLO_ATLAS,SOLO_TILES[b])}"></i></span>`;
 }
 if(Object.hasOwn(AWAKEN_FORMS,id)){
  const style=AWAKEN_ATLAS?tileStyle(AWAKEN_ATLAS,AWAKEN_TILES[id]):tileStyle(FUSION_ATLAS,TILES[AWAKEN_FORMS[id].base]);
  return `<span class="form-art awakened-art ${extra}" aria-hidden="true" style="${style}"></span>`;
 }
 const tile=TILES[id];
 if(tile!==undefined)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle(FUSION_ATLAS,tile)}"></span>`;
 if(Object.hasOwn(SOLO_FORMS,id)){
  if(SOLO_ATLAS)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle(SOLO_ATLAS,SOLO_TILES[id])}"></span>`;
  return `<span class="form-art solo-art ${extra}" aria-hidden="true" style="${tileStyle('seed-law-atlas-v2-ui.png',LAW_TILES[SOLO_FORMS[id].requires[0]])}"></span>`;
 }
 return '';
}
