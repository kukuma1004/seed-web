import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createDuel,stepDuel,duelAi} from '../src/seed-duel-rules.js';
const results={},dt=1/60;
for(const hero of ['frostbloom','stormcrown']){
 let total=0,won=0,maxShots=0,maxHazards=0,maxEffects=0;const opponents={},seats={0:{games:0,wins:0},1:{games:0,wins:0}},activity={primaryCasts:0,secondaryCasts:0,ults:0,projectiles:0,damage:0};
 for(const other of ['pierce','reflect','split','gravity','blastlance','frostnet']){
  let games=0,wins=0,seconds=0;
  for(const seat of [0,1])for(let seed=1;seed<=8;seed++){
   const s=createDuel({player:seat===0?hero:other,enemy:seat===0?other:hero,seed,difficulty:'normal'});let n=0;const shots=new WeakSet();
   while(s.phase!=='over'&&n++<60*300){const f=s.fighters[seat],o=s.fighters[1-seat],cd=[...f.cd],meter=f.meter,hp=o.hp;stepDuel(s,dt,duelAi(s,0,dt),null);
    if(f.cd[0]>cd[0]+1)activity.primaryCasts++;if(f.cd[1]>cd[1]+1)activity.secondaryCasts++;if(f.meter<meter-90)activity.ults++;if(o.hp<hp)activity.damage+=hp-o.hp;
    for(const q of s.shots)if(q.owner===seat&&!shots.has(q)){shots.add(q);activity.projectiles++;}
    maxShots=Math.max(maxShots,s.shots.length);maxHazards=Math.max(maxHazards,s.hazards.length);maxEffects=Math.max(maxEffects,s.effects.length);}
   assert.equal(s.phase,'over',hero+'/'+other);assert.ok(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);
   games++;total++;seats[seat].games++;seconds+=s.time;if(s.winner===seat){wins++;won++;seats[seat].wins++;}
  }
  opponents[other]={games,wins,winPercent:Math.round(wins/games*1000)/10,meanSeconds:Math.round(seconds/games*10)/10};
 }
 results[hero]={total,won,winPercent:Math.round(won/total*1000)/10,maxShots,maxHazards,maxEffects,seats,activity,opponents};
}
writeFileSync('artifacts/duel-batch-05-ai.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
console.log('192 seeded AI matches finished, both seats, six archetypes each. Bot statistics are not human/device balance evidence.');
