const TILES=Object.freeze({potion:0,tonic:1,wind:2,shell:3,sprout:4});
export const ITEM_ATLAS='item-atlas-v1-ui.png';
const BASE=import.meta.env?.BASE_URL||'/';

export function itemArt(id,extra=''){
 const tile=TILES[id];
 if(tile===undefined)return '';
 return `<i class="potion-icon ${id} ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/${ITEM_ATLAS}');background-position:${tile%3*50}% ${Math.floor(tile/3)*100}%"></i>`;
}
