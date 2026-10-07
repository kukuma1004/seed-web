import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createDuel,stepDuel,duelAi} from '../src/seed-duel-rules.js';

// Observation only: no fighter, cooldown, budget or world data is written.
// Retain removed warning references and deduplicate the wells' shared budget.
export function createFinal08Observer(seat){
 const metrics={primary:0,secondary:0,ultimate:0,plants:0,wells:0,wellClosures:0,wellContacts:0,wellEscapes:0,wellDefended:0,wellOtherMiss:0,ambiguousContacts:0,cancelledPlants:0,retiredPlants:0,seeds:0,bursts:0,burstContacts:0,openedHalls:0,armedHalls:0,cancelledHalls:0,returns:0,bossBlocks:0,plainFolds:0,chargedFolds:0};
 let prior;
 return {metrics,
  before(s){const f=s.fighters[seat];prior={phase:s.phase,cd:[...f.cd],meter:f.meter,stored:f.hallStored||0,cast:f.finalCast,hazards:new Map(s.hazards.filter(h=>h.owner===seat).map(h=>[h,{arm:h.arm,t:h.t,triggered:h.triggered,hits:h.budget?.hits||0,ordinary:h.budget?.ordinary,boss:h.budget?.boss}])),shots:new Map(s.shots.map(q=>[q,{returned:q.hallReturned,owner:q.owner}]))};},
  after(s){assert(prior,'Observer requires before()');const f=s.fighters[seat],o=s.fighters[1-seat];
   if(f.cd[0]>prior.cd[0]+1)metrics.primary++;if(f.cd[1]>prior.cd[1]+1)metrics.secondary++;if(f.meter<prior.meter-90)metrics.ultimate++;
   const contactBudgets=new Map();
   for(const [h,b] of prior.hazards){
    if(h.kind==='crunchWell'&&!b.triggered&&h.triggered){metrics.wellClosures++;if(Math.hypot(h.x-o.x,h.y-o.y)>=h.r+.3)metrics.wellEscapes++;else if(h.budget.hits===b.hits){if(o.inv>0||o.blocking)metrics.wellDefended++;else metrics.wellOtherMiss++;}}
    if(['crunchWell','crunchBurst'].includes(h.kind)&&!b.triggered&&h.triggered){let group=contactBudgets.get(h.budget);if(!group){group={delta:Math.max(0,h.budget.hits-b.hits),kinds:new Set()};contactBudgets.set(h.budget,group);}group.kinds.add(h.kind);}
    if(prior.phase==='fight'&&s.phase==='fight'&&b.arm>0&&h.t<=0&&!h.triggered){if(h.kind==='crunchPlant')metrics[f.finalCast===prior.cast?'cancelledPlants':'retiredPlants']++;else if(h.kind==='hallOpen')metrics.cancelledHalls++;}
    if(h.kind==='hallOpen'){if(b.arm>0&&h.arm<=0&&h.t>0)metrics.armedHalls++;metrics.bossBlocks+=Math.max(0,(b.boss||0)-(h.budget.boss||0));}
   }
   // The ultimate seed shares a budget with both wells. Attribute a delta only
   // to the kind that actually closed this step, rather than every live well.
   // Simultaneous different kinds are explicitly ambiguous, never invented hits.
   for(const {delta,kinds} of contactBudgets.values())metrics[kinds.size>1?'ambiguousContacts':kinds.has('crunchWell')?'wellContacts':'burstContacts']+=delta;
   for(const h of s.hazards){if(h.owner!==seat||prior.hazards.has(h))continue;const key={crunchPlant:'plants',crunchWell:'wells',crunchBurst:'bursts',hallOpen:'openedHalls',hallFold:prior.stored?'chargedFolds':'plainFolds'}[h.kind];if(key)metrics[key]++;}
   for(const q of s.shots){if(q.owner===seat&&q.kind==='crunchSeed'&&!prior.shots.has(q))metrics.seeds++;}
   // A shot removed later in the step remains in the pre-step map.
   for(const [q,b] of prior.shots)if(!b.returned&&q.hallReturned&&q.owner===seat)metrics.returns++;
   prior=null;
  }
 };
}

export function runFinal08Sample({seeds=8,opponents=['pierce','reflect','split','gravity','blastlance','frostnet'],print=true}={}){
 const report={},dt=1/60;
 for(const hero of ['bigcrunch','mirrorhall']){
  const row={games:0,wins:0,seats:{0:{games:0,wins:0},1:{games:0,wins:0}},opponents:{},activity:{},maxShots:0,maxHazards:0,maxEffects:0};
  for(const opponent of opponents){const versus={games:0,wins:0,seconds:0};
   for(const seat of [0,1])for(let seed=1;seed<=seeds;seed++){
    const s=createDuel({inspection:true,player:seat?opponent:hero,enemy:seat?hero:opponent,seed,difficulty:'normal'}),observer=createFinal08Observer(seat);let n=0;
    while(s.phase!=='over'&&n++<60*300){observer.before(s);s.events.length=0;stepDuel(s,dt,duelAi(s,0,dt),null);observer.after(s);
     row.maxShots=Math.max(row.maxShots,s.shots.length);row.maxHazards=Math.max(row.maxHazards,s.hazards.length);row.maxEffects=Math.max(row.maxEffects,s.effects.length);
     assert(s.shots.length<=64&&s.hazards.length<=32&&s.effects.length<=120);assert(s.fighters.every(f=>Number.isFinite(f.hp)&&Number.isFinite(f.x)&&Number.isFinite(f.y)));
    }
    assert.equal(s.phase,'over',hero+'/'+opponent+' seat'+seat+' seed'+seed);
    for(const [k,v] of Object.entries(observer.metrics))row.activity[k]=(row.activity[k]||0)+v;
    row.games++;row.seats[seat].games++;versus.games++;versus.seconds+=s.time;
    if(s.winner===seat){row.wins++;row.seats[seat].wins++;versus.wins++;}
   }
   versus.meanSeconds=Math.round(versus.seconds/versus.games*10)/10;delete versus.seconds;row.opponents[opponent]=versus;
  }
  row.winPercent=Math.round(row.wins/row.games*1000)/10;if(print)console.log(hero,JSON.stringify(row));assert(row.activity.primary>0,hero+' primary unused');assert(row.activity.secondary>0,hero+' secondary unused');if(hero==='mirrorhall')assert(row.activity.returns>0);report[hero]=row;
 }
 if(print){console.log(JSON.stringify(report,null,2));console.log(`${Object.values(report).reduce((n,r)=>n+r.games,0)} normal-AI inspection matches terminated within300s; caps/finite state/observed techniques verified. VM balance sample only; no art/browser/device approval or public release.`);}
 return report;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const arg=process.argv.find(a=>a.startsWith('--seeds='));runFinal08Sample({seeds:arg?Number(arg.slice(8)):8});}
