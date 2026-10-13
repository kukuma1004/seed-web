import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createDuel,stepDuel,DUEL_RELEASE_ORDER} from '../src/seed-duel-rules.js';
const seeds=[1374487469,1374487509,1374489621,1374489669,1374490001,1374490153,1374490617,1374491061,1374491669,1374492229,1374493029,1374493461,1374493697,1374494849,1374495929];
const rng=value=>{let n=value>>>0;return()=>{n=(n+0x6d2b79f5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
function episode(engine,seed,hz=20){
 const rnd=rng(seed^0xdee1),player=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],enemy=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],difficulty=['easy','normal','hard'][Math.floor(rnd()*3)];assert.equal(enemy,'twin-mirrorring');
 const s=engine.createDuel({player,enemy,seed,difficulty,released:true});let firstContact=null,minHp=s.fighters[0].hp,casts=0;
 for(let frame=0;frame<hz*310&&s.phase!=='over';frame++){
  engine.stepDuel(s,1/hz,{});minHp=Math.min(minHp,s.fighters[0].hp);if(s.fighters[0].hp<s.fighters[0].maxHp)firstContact??=s.time;casts+=s.events.filter(e=>e==='shot'||e==='twinMirror53'||e==='twinStar53').length;s.events.length=0;
 }
 assert.equal(s.phase,'over');assert(s.fighters.every(f=>Number.isFinite(f.hp)&&f.hp>=0));return{seed,hz,player,enemy,difficulty,winner:s.winner,wins:s.wins,hp:s.fighters[0].hp,minHp,firstContact,casts,seconds:s.time};
}
const current={createDuel,stepDuel},fixed=seeds.map(seed=>episode(current,seed));
for(const row of fixed){assert(row.firstContact!==null,'ordinary idle opponent receives actual attack threat');assert.equal(row.winner,1,'idle does not earn a full-HP time-tie victory');assert(row.seconds<149);}
const fixed60=seeds.slice(0,3).map(seed=>episode(current,seed,60));for(const row of fixed60){assert(row.firstContact!==null);assert.equal(row.winner,1);}
const rulesUrl=new URL('../src/seed-duel-rules.js',import.meta.url),batchUrl=new URL('../src/seed-duel-batch53.js',import.meta.url),rules=readFileSync(rulesUrl,'utf8'),batch=readFileSync(batchUrl,'utf8');
const patch=/   \/\/ Approach only a bank inside the authored mirror cast range; a distant wall otherwise loops forever\.\r?\n   const reach=dist\(goal,o\);if\(reach<=1\.2\|\|reach>=5\.5\)continue;\r?\n/;
assert(patch.test(batch),'negative control must remove exactly the audited two-line AI range eligibility correction');
const brokenBatch=batch.replace(patch,''),batchCopy='data:text/javascript;base64,'+Buffer.from(brokenBatch).toString('base64'),original=rules.replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,(_,a,path,z)=>a+(path==='./seed-duel-batch53.js'?batchCopy:new URL(path,rulesUrl).href)+z),oldEngine=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));
const broken=seeds.slice(0,3).map(seed=>episode(oldEngine,seed));for(const row of broken){assert.equal(row.winner,0);assert.equal(row.firstContact,null);assert(row.seconds>=150);}
const report={note:'Actual normal start/input-only whole matches. 15 formerly idle full-HP wins now face genuine attacks at20Hz;3also60Hz. Original AI copied in memory reproduces stall. No HP/time/position/kill fixtures, nohuman/device FPS claim.',fixed,fixed60,negativeControl:broken};
writeFileSync('artifacts/population-action-duel-ai-stall-20261014.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
