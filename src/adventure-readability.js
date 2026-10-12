// Presentation only: fade foreground bodies which hide the seed's torso.
// Flat arithmetic, no sorting, allocations, RNG or simulation mutations.
export function adventureActorOpacity(seed,actor){
 if(actor.type==='seed'||actor.type==='pet'||actor.hp<=0||actor.y<=seed.y)return 1;
 const size=actor.type==='obstacle'?actor.r*2.8:actor.type==='boss'?3.9:actor.role==='tank'?1.85:1.65;
 if(!Number.isFinite(size)||Math.abs(actor.x-seed.x)>=size*.5+.62||actor.y-seed.y>=size*.9-.35)return 1;
 return actor.type==='boss'?.64:actor.type==='obstacle'?.32:.3;
}
