// Five focused hits grow a visible frost shell and break it on the fifth.
// Ordinary foes briefly lock; bosses keep moving and finish their telegraphs.
export const FROST_SHATTER_HITS=5;
export function applyFrostContact(enemy,{duration=1.3,now=0,boss=false}={}){
 const expired=now-(enemy.frostLastHit??-Infinity)>duration;
 const first=expired||!enemy.frostHits;
 enemy.slow=Math.max(enemy.slow||0,duration);
 enemy.frostHits=first?1:Math.min(FROST_SHATTER_HITS,enemy.frostHits+1);
 enemy.frostLastHit=now;
 const shatter=enemy.frostHits>=FROST_SHATTER_HITS&&now>=(enemy.frostNextShatter||0);
 if(shatter){enemy.frostHits=0;enemy.frostNextShatter=now+1.2;if(!boss)enemy.frostLock=Math.max(enemy.frostLock||0,.55);}
 return {first,shatter,stacks:shatter?FROST_SHATTER_HITS:enemy.frostHits,bonus:shatter?(boss?1.25:.9):0};
}
