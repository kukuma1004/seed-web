import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDuel,stepDuel,DUEL_RELEASE_ORDER} from '../src/seed-duel-rules.js';

// Exact real-input cohort reproducer, NOT fixture HP/time/kill edits or a player review.
const seed=1374487570;
const rng=value=>{let n=value>>>0;return()=>{n=(n+0x6d2b79f5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
function episode(engine){
 const rnd=rng(seed^0xdee1),player=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],enemy=DUEL_RELEASE_ORDER[Math.floor(rnd()*DUEL_RELEASE_ORDER.length)],difficulty=['easy','normal','hard'][Math.floor(rnd()*3)];
 assert.equal(player,'final-pierceshower-split');assert.equal(enemy,'final-echolane-recall');assert.equal(difficulty,'easy');
 const s=engine.createDuel({player,enemy,seed,difficulty,released:true});let input={};
 for(let frame=0;frame<6000&&s.phase!=='over';frame++){
  if(s.phase==='fight'&&frame%9===0){const a=rnd()*Math.PI*2;input={x:Math.cos(a),y:Math.sin(a),attack:rnd()<.5,skill1:rnd()<.08};}
  else if(s.phase!=='fight')input={};
  engine.stepDuel(s,.05,input);s.events.length=0;
 }
 assert.equal(s.phase,'over');const result={winner:s.winner,wins:[...s.wins],hp:s.fighters.map(f=>f.hp),seconds:s.time};
 for(let n=0;n<80;n++)engine.stepDuel(s,.05,{attack:true,skill1:true,skill2:true,ult:true});
 assert.deepEqual(s.fighters.map(f=>f.hp),result.hp,'terminal HP remains immutable under continued input');
 assert.deepEqual(s.wins,result.wins,'terminal input cannot issue another round receipt');
 return result;
}
const fixed=episode({createDuel,stepDuel});assert(fixed.hp.every(hp=>Number.isFinite(hp)&&hp>=0),'a genuine victory cannot retain negative winner HP');assert.equal(fixed.winner,0);
const url=new URL('../src/seed-duel-rules.js',import.meta.url),source=readFileSync(url,'utf8');
// A copy loaded from data URL changes ONLY the new phase guard. All dependencies
// still resolve to the exact shipping modules. This never edits a production file.
const guarded=/if\(s\.phase!=='fight'\|\|def\.hp<=0\|\|def\.inv>0\)return false;/;
assert(guarded.test(source),'negative control must match the shipping terminal strike guard');
const original=source.replace(guarded,"if(def.hp<=0||def.inv>0)return false;").replace(/(from\s*['"])(\.\/[^'"]+)(['"])/g,(_,a,path,z)=>a+new URL(path,url).href+z);
const oldEngine=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));
const broken=episode(oldEngine);assert(broken.hp[0]<0,'guard removal reproduces the measured same-tick post-KO damage');assert.equal(broken.winner,0);assert.deepEqual(broken.wins,[2,0]);
console.log(JSON.stringify({note:'Shipping rules exact seeded natural best-of-three input, plus guard-removal negative control; no fixture setup or human/device claims',seed,fixed,broken},null,2));
