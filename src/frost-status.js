// The base law gains a visible payoff for consecutive accurate hits.
// Ordinary foes briefly lock; bosses still move and keep attack telegraphs.
export function applyFrostContact(enemy,{duration=1.3,now=0,boss=false}={}){
 const chilled=(enemy.slow||0)>0;
 const first=!chilled||!enemy.frostHits;
 enemy.slow=Math.max(enemy.slow||0,duration);
 enemy.frostHits=first?1:Math.min(2,enemy.frostHits+1);
 const shatter=enemy.frostHits>=2&&now>=(enemy.frostNextShatter||0);
 if(shatter){enemy.frostHits=0;enemy.frostNextShatter=now+1.5;if(!boss)enemy.frostLock=Math.max(enemy.frostLock||0,.3);}
 return {first,shatter,bonus:shatter?(boss?.35:.6):0};
}
