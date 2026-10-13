// Journey-only travel and reinforcement pacing. Never scale the whole frame:
// warnings, enemy shots, damage, dodge cooldowns and facility timers stay real.
export function journeyTravelScale(region,expansionAct,otherMode=false){
 if(otherMode)return 1;
 if(expansionAct==='crosswind'||expansionAct==='crystalGorge')return 1.12;
 return region==='skyway'?1.08:1;
}
export function journeyReinforcementScale(region,otherMode=false){
 return !otherMode&&region==='skyway'?.82:1;
}
