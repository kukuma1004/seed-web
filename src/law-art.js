// Reuse the approved Unreal 4 x 3 law atlas without repainting its artwork.
// Chain uses the linked golden orbs (the Unreal Size tile); the web law has no exact Unreal counterpart.
const TILES={reflect:0,split:1,pierce:2,orbit:3,burst:4,gravity:5,recall:6,frost:9,chain:10};
export function lawArt(id,extra=''){
 const tile=TILES[id];
 return `<span class="law-art ${extra}" aria-hidden="true" style="background-image:url('${import.meta.env.BASE_URL}assets/seed-law-atlas-v2.png');background-position:${(tile%4)*100/3}% ${Math.floor(tile/4)*50}%"></span>`;
}
