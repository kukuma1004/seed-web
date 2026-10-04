import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createDuel,stepDuel,duelAi} from '../src/seed-duel-rules.js';
const results={},dt=1/60;
for(const hero of ['returnblade','frostguard']){
 let total=0,won=0,maxShots=0,maxHazards=0,maxEffects=0;const opponents={};
 for(const other of ['pierce','reflect','split','gravity','blastlance','frostnet']){
  let games=0,wins=0,seconds=0;
  for(const seat of [0,1])for(let seed=1;seed<=8;seed++){
   const s=createDuel({player:seat===0?hero:other,enemy:seat===0?other:hero,seed,difficulty:'normal'});let n=0;
   while(s.phase!=='over'&&n++<60*300){stepDuel(s,dt,duelAi(s,0,dt),null);maxShots=Math.max(maxShots,s.shots.length);maxHazards=Math.max(maxHazards,s.hazards.length);maxEffects=Math.max(maxEffects,s.effects.length);}
   assert.equal(s.phase,'over',hero+'/'+other);assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);
   games++;total++;seconds+=s.time;if(s.winner===seat){wins++;won++;}
  }
  opponents[other]={games,wins,winPercent:Math.round(wins/games*1000)/10,meanSeconds:Math.round(seconds/games*10)/10};
 }
 results[hero]={total,won,winPercent:Math.round(won/total*1000)/10,maxShots,maxHazards,maxEffects,opponents};
}
writeFileSync('artifacts/duel-batch-03-ai.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
console.log('192 seeded AI matches finished, both seats, six archetypes each. Bot statistics are not human/device balance evidence.');
