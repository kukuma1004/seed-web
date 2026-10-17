import {createDefense,plantDefense,upgradeDefense,startDefenseWave,stepDefense,defenseWaveInfo,defensePoint} from './seed-defense-rules.js';

// Explicit localhost inspection only; skipped waves earn no score, titles or
// account data. The actual spawn, boss clock and planted combat still run.
export function createDefenseArborInspection({enabled=false}={}){
 if(!enabled)return null;
 const s=createDefense(613,{actCount:6});s.currency=2000;
 for(let pad=0;pad<4;pad++)if(plantDefense(s,pad)){const tower=s.towers.at(-1);while(tower.level<5&&upgradeDefense(s,tower.id)){};}
 s.wave=71;startDefenseWave(s);s.spawned=defenseWaveInfo(s.wave,s).count-1;s.spawnTimer=0;stepDefense(s,.001);
 for(const enemy of s.enemies){enemy.progress=94;Object.assign(enemy,defensePoint(enemy.progress,s));}
 s.inspectionPreview=true;return s;
}
