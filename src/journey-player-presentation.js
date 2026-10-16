// Visual size only. The player's collision radius, attacks and speed stay in
// world units; a small landscape display needs a stronger readable silhouette.
export function journeyPlayerScale(width,height,act='skyway'){const small=width<=900||height<=520;return act==='crosswind'?(small?2.75:2.1):(small?2.3:1.75);}
