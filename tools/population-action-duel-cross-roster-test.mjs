import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDuel,stepDuel,duelAi,DUEL_RELEASE_ORDER} from '../src/seed-duel-rules.js';
const seed=1374487800;
const rng=value=>{let n=value>>>0;return()=>{n=(n+0x6d2b79f5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
function episode(engine){
 const rnd=rng(seed^0xdee1),player=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],enemy=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],difficulty=['easy','normal','hard'][Math.floor(rnd()*3)],s=engine.createDuel({player,enemy,seed,difficulty,released:true});
 for(let frame=0;frame<6000&&s.phase!=='over';frame++){
  const input=s.phase==='fight'?engine.duelAi(s,0,.05):{};engine.stepDuel(s,.05,input);s.events.length=0;
 }
 assert.equal(s.phase,'over');assert(s.fighters.every(f=>Number.isFinite(f.hp)&&f.hp>=0));return{player,enemy,difficulty,winner:s.winner,wins:s.wins,hp:s.fighters.map(f=>f.hp),seconds:s.time};
}
const fixed=episode({createDuel,stepDuel,duelAi});
const rulesUrl=new URL('../src/seed-duel-rules.js',import.meta.url),batchUrl=new URL('../src/seed-duel-batch52.js',import.meta.url),rules=readFileSync(rulesUrl,'utf8'),batch=readFileSync(batchUrl,'utf8');
const guarded='q=>q.life>0&&q.data?.caster===p.caster&&';assert(batch.includes(guarded),'negative control must match the new ordinary-projectile data boundary');
const brokenBatch=batch.replace(guarded,'q=>q.life>0&&q.data.caster===p.caster&&');const batchCopy='data:text/javascript;base64,'+Buffer.from(brokenBatch).toString('base64');
const original=rules.replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,(_,a,path,z)=>a+(path==='./seed-duel-batch52.js'?batchCopy:new URL(path,rulesUrl).href)+z);
const oldEngine=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));assert.throws(()=>episode(oldEngine),/caster/,'natural cross-roster old predicate must reproduce its original crash');
console.log(JSON.stringify({note:'Normal seeded best-of-three released-character match, actual automatic legal inputs, no fixture HP or shots. Guard-removal copy reproduces cross-roster crash without touching source.',seed,fixed,negativeControl:'TypeError reading caster reproduced'},null,2));
