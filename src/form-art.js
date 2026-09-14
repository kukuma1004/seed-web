// One authored illustration for each completed form, in a 4 by 3 atlas.
const TILES={collapse:0,frostguard:1,returnblade:2,prism:3,thunderlance:4,frostbloom:5,stormcrown:6,tidepull:7,seedstorm:8,mirrorguard:9};
export function formArt(id,extra=''){
 const tile=TILES[id];
 if(tile===undefined)return '';
 return `<span class="form-art ${extra}" aria-hidden="true" style="background-image:url('${import.meta.env.BASE_URL}assets/seed-forms-atlas-v4.png');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*50}%"></span>`;
}
