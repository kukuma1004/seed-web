export const COMBO_ART=Object.freeze({
 cores:'combo-cores-v1.webp',
 shells:'combo-shells-v1.webp',
 projectiles:'combo-projectiles-v1.webp'
});

const BASE=import.meta.env?.BASE_URL||'/';
const tileStyle=(file,tile)=>`background-image:url('${BASE}assets/${file}');background-position:${tile%4*100/3}% ${Math.floor(tile/4)*50}%`;

// Three shared atlas samples are enough to give every catalogue entry a stable
// silhouette. Game screens create only the two or three cards they currently
// show; the 990-entry collection view can virtualise rows later.
export function comboArt(combo,extra=''){
 if(!combo?.visual)return '';
 const v=combo.visual;
 return `<span class="combo-art ${combo.family||'first'} ${extra}" aria-hidden="true" style="--combo-a:${v.accent};--combo-b:${v.secondary}"><i class="combo-core" style="${tileStyle(COMBO_ART.cores,v.coreTile)}"></i><i class="combo-shell" style="${tileStyle(COMBO_ART.shells,v.shellTile)}"></i></span>`;
}

export function comboProjectileArt(combo,extra=''){
 if(!combo?.visual)return '';
 return `<span class="combo-projectile ${extra}" aria-hidden="true" style="${tileStyle(COMBO_ART.projectiles,combo.visual.projectileTile)}"></span>`;
}

