const TILES=Object.freeze({mirror:0,crystal:1,coil:2,core:3});
const EXTRA_ART=Object.freeze({echo:'relic-echo.svg',stride:'relic-stride.svg'});
export const RELIC_ATLAS='relic-atlas-v1-ui.png';
const BASE=import.meta.env?.BASE_URL||'/';

export function relicArt(id,extra=''){
 const tile=TILES[id];
 if(tile===undefined){const art=EXTRA_ART[id];return art?`<span class="relic-art ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/${art}');background-size:cover;background-position:center"></span>`:'';}
 return `<span class="relic-art ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/${RELIC_ATLAS}');background-position:${tile%2*100}% ${Math.floor(tile/2)*100}%"></span>`;
}
