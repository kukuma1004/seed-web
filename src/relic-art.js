const TILES=Object.freeze({mirror:0,crystal:1,coil:2,core:3});
export const RELIC_ATLAS='relic-atlas-v1.png';
const BASE=import.meta.env?.BASE_URL||'/';

export function relicArt(id,extra=''){
 const tile=TILES[id];
 if(tile===undefined)return '';
 return `<span class="relic-art ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/${RELIC_ATLAS}');background-position:${tile%2*100}% ${Math.floor(tile/2)*100}%"></span>`;
}
