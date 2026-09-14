import {SOLO_FORMS} from './forms.js';
// One authored illustration for each completed form, in a 4 by 3 atlas.
const TILES={collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
// Solo evolutions have no painted art yet (requested in docs/ART-REQUEST-ACTIVES.md). Until then they reuse
// their law's tile from the law atlas inside a gold ring. When the solo atlas arrives, set SOLO_ATLAS and fill SOLO_TILES.
const LAW_TILES={reflect:0,split:1,pierce:2,orbit:3,burst:4,gravity:5,recall:6,frost:9,chain:10};
export const SOLO_ATLAS=null; // e.g. 'seed-solo-atlas-v1.png'
const SOLO_TILES={mirrormaze:0,fullbloom:1,thunderweb:2,starring:3,glassspear:4,flarebloom:5,rewind:6,blackhole:7,winterbreath:8};
const tileStyle=(file,tile)=>`background-image:url('${import.meta.env.BASE_URL}assets/${file}');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*50}%`;
export function formArt(id,extra=''){
 const tile=TILES[id];
 if(tile!==undefined)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle('seed-forms-atlas-v4.png',tile)}"></span>`;
 if(Object.hasOwn(SOLO_FORMS,id)){
  if(SOLO_ATLAS)return `<span class="form-art ${extra}" aria-hidden="true" style="${tileStyle(SOLO_ATLAS,SOLO_TILES[id])}"></span>`;
  return `<span class="form-art solo-art ${extra}" aria-hidden="true" style="${tileStyle('seed-law-atlas-v2.png',LAW_TILES[SOLO_FORMS[id].requires[0]])}"></span>`;
 }
 return '';
}
