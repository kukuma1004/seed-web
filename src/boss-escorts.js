// Finite reinforcements prevent endless cleanup and keep the boss as the objective.
export function escortWave(hp,maxHp,waves){if(waves===0)return 0;if(waves===1&&hp/maxHp<=.67)return 1;if(waves===2&&hp/maxHp<=.34)return 2;return -1;}
export function escortTypes(wave){return wave===1?['caster','caster']:['shield','caster'];}
