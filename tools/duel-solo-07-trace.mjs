// Read-only diagnostics against the real host. No separate simulator, stat
// patching, AI replacement or extra AI call (which would change RNG order).
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createDuel,stepDuel,duelAi,DUEL_CHARACTERS} from '../src/seed-duel-rules.js';
const dt=1/60,report={};
for(const hero of ['fullbloom','rewind']){
 const totals={matches:0,wins:0,swings:0,outOfRange:0,outOfFacing:0,inRangeFacing:0,invulnerableAtSwing:0,guardFacingAtSwing:0,actualBedForks:0,recoveryDodgeInputs:0,returnRepositionInputs:0,visibleInvPauseInputs:0},casts=[],own=DUEL_CHARACTERS[hero];
 for(const enemy of ['pierce','reflect','split','gravity','blastlance','frostnet'])for(let seed=1;seed<=4;seed++){
  const s=createDuel({player:hero,enemy,seed,difficulty:'normal'}),effects=new WeakSet(),shots=new WeakSet(),pending=new Map();let n=0;
  while(s.phase!=='over'&&n++<60*300){const f=s.fighters[0],o=s.fighters[1],before={x:o.x,y:o.y,inv:o.inv,fx:o.fx,fy:o.fy,blocking:o.blocking,state:o.state,cd:[...f.cd],round:s.round},oldBeds=s.hazards.filter(h=>h.kind==='fullBed'&&h.owner===0&&h.ready&&h.t>0).map(h=>({h,x:h.x,y:h.y})),input=duelAi(s,0,dt);
   if(input.dodge&&s.ai[0].b07Recovery>.1)totals.recoveryDodgeInputs++;
   if(hero==='rewind'&&!input.skill1&&!input.skill2&&!input.dodge&&(input.x||input.y)&&s.shots.some(q=>q.kind==='rewindLeaf'&&q.owner===0&&q.mode==='back'))totals.returnRepositionInputs++;
   if(input.skill2&&o.state==='dodge'&&o.inv>.07)totals.visibleInvPauseInputs++;
   stepDuel(s,dt,input,null);
   if(f.cd[0]>before.cd[0]+1){const cast=f.fullCast||f.rewindCast,key=s.round+':'+cast;const row={enemy,seed,round:s.round,cast,time:+s.time.toFixed(2),distance:+Math.hypot(f.x-before.x,f.y-before.y).toFixed(2),opponentState:before.state,opponentBlocking:before.blocking,aim:[+f.fx.toFixed(2),+f.fy.toFixed(2)],launched:0,budgets:[]};pending.set(key,row);casts.push(row);}
   for(const b of oldBeds)if(b.h.t<=0&&s.hazards.some(h=>h.kind==='fullFork'&&h.owner===0&&h.gen===1&&Math.hypot(h.x-b.x,h.y-b.y)<.01))totals.actualBedForks++;
   for(const q of s.shots)if(q.owner===0&&!shots.has(q)){shots.add(q);const row=pending.get(s.round+':'+q.cast);if(row){row.launched++;if(q.budget&&!row.budgets.includes(q.budget))row.budgets.push(q.budget);}}
   for(const e of s.effects)if(e.team===0&&e.char===hero&&['swing','heavySwing'].includes(e.type)&&!effects.has(e)){effects.add(e);totals.swings++;const d=Math.hypot(before.x-e.x,before.y-e.y),dot=((before.x-e.x)*Math.cos(e.angle)+(before.y-e.y)*Math.sin(e.angle))/(d||1),arc=e.type==='heavySwing'?own.arc*1.1:own.comboArc?.[e.step]??own.arc*(e.step===2?1.25:1);
    if(d>e.r+.45)totals.outOfRange++;else if(dot<=Math.cos(arc))totals.outOfFacing++;else{totals.inRangeFacing++;if(before.inv>0)totals.invulnerableAtSwing++;if(before.blocking&&((e.x-before.x)*before.fx+(e.y-before.y)*before.fy)/(d||1)>-.2)totals.guardFacingAtSwing++;}}
  }
  assert.equal(s.phase,'over');totals.matches++;if(s.winner===0)totals.wins++;
 }
 const castSummary={total:casts.length,noProjectileRelease:casts.filter(c=>!c.launched).length,rootContacts:0,petalContacts:0,leafContacts:0};for(const c of casts){c.contacts=c.budgets.reduce((n,b)=>n+(b.roots||0)+(b.petals||0)+(b.hits||0),0);for(const b of c.budgets){castSummary.rootContacts+=b.roots||0;castSummary.petalContacts+=b.petals||0;castSummary.leafContacts+=b.hits||0;}delete c.budgets;}
 report[hero]={totals,castSummary,firstCasts:casts.slice(0,80),limits:'Hero seat0 only for exact pre-enemy-act swing geometry; geometry eligibility is not damage, invulnerable/guarded contacts are separately identified. All ability contacts are shared real budget counters. Input counts can include busy or freeze frames and are not successful dodge/cast counts.'};
}
writeFileSync('artifacts/duel-batch-07-timing-trace.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([k,v])=>[k,{totals:v.totals,castSummary:v.castSummary}]))));
