import assert from 'node:assert/strict';
import {createDuel,stepDuel,duelAi} from '../src/seed-duel-rules.js';
// Bounded 192-match candidate sample, no artifact/server/account writes.
const report={},dt=1/60;
for(const hero of ['bigcrunch','mirrorhall']){
 const row={games:0,wins:0,seats:{0:{games:0,wins:0},1:{games:0,wins:0}},opponents:{},activity:{primary:0,secondary:0,ultimate:0,wellDamage:0,returns:0,bossBlocks:0},maxShots:0,maxHazards:0,maxEffects:0};
 for(const opponent of ['pierce','reflect','split','gravity','blastlance','frostnet']){
  const versus={games:0,wins:0,seconds:0};
  for(const seat of [0,1])for(let seed=1;seed<=8;seed++){
   const s=createDuel({inspection:true,player:seat?opponent:hero,enemy:seat?hero:opponent,seed,difficulty:'normal'});let n=0;
   while(s.phase!=='over'&&n++<60*300){
    const f=s.fighters[seat],cd=[...f.cd],meter=f.meter,hits=s.hazards.filter(h=>h.kind==='crunchWell'&&h.owner===seat).reduce((sum,h)=>sum+(h.budget.hits||0),0);
    s.events.length=0;stepDuel(s,dt,duelAi(s,0,dt),null);
    if(f.cd[0]>cd[0]+1)row.activity.primary++;if(f.cd[1]>cd[1]+1)row.activity.secondary++;if(f.meter<meter-90)row.activity.ultimate++;
    if(f.char==='mirrorhall'){row.activity.returns+=s.events.filter(e=>e==='hallReturn').length;row.activity.bossBlocks+=s.events.filter(e=>e==='hallBlock').length;}
    const after=s.hazards.filter(h=>h.kind==='crunchWell'&&h.owner===seat).reduce((sum,h)=>sum+(h.budget.hits||0),0);row.activity.wellDamage+=Math.max(0,after-hits);
    row.maxShots=Math.max(row.maxShots,s.shots.length);row.maxHazards=Math.max(row.maxHazards,s.hazards.length);row.maxEffects=Math.max(row.maxEffects,s.effects.length);
    assert(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert(s.fighters.every(f=>Number.isFinite(f.hp)&&Number.isFinite(f.x)&&Number.isFinite(f.y)));
   }
   assert.equal(s.phase,'over',hero+'/'+opponent+' seat'+seat+' seed'+seed);
   row.games++;row.seats[seat].games++;versus.games++;versus.seconds+=s.time;
   if(s.winner===seat){row.wins++;row.seats[seat].wins++;versus.wins++;}
  }
  versus.meanSeconds=Math.round(versus.seconds/versus.games*10)/10;delete versus.seconds;row.opponents[opponent]=versus;
 }
 row.winPercent=Math.round(row.wins/row.games*1000)/10;console.log(hero,JSON.stringify(row));assert(row.activity.primary>0,hero+' primary unused');assert(row.activity.secondary>0,hero+' secondary unused');if(hero==='mirrorhall')assert(row.activity.returns>0);report[hero]=row;
}
console.log(JSON.stringify(report,null,2));
console.log('192 normal-AI inspection matches terminated within300s; caps/finite state/real technique use verified. Balance sample only; no art/browser/device approval or public release.');
