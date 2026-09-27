import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {DEFENSE,DEFENSE_FORMS,createDefense,plantDefense,chooseDefenseLaw,upgradeDefense,startDefenseWave,stepDefense,defensePoint,defenseWaveInfo,getDefenseEvolutionOptions,evolveDefense,checkpointDefense,restoreDefense} from '../src/seed-defense-rules.js';
import {createDefenseCombat,DEFENSE_COMBAT} from '../src/seed-defense-combat.js';
import {SOLO_FORMS,TWIN_FORMS} from '../src/forms.js';

const report={scope:'Actual shared createFormCombat through createDefenseCombat; Node CPU measurements are not device/render benchmarks.',forms:[],runs:[],stress:null,errors:[]};
let checks=0;
function test(name,fn){fn();checks++;console.log(`PASS ${name}`);}
function ranksFor(f){const ranks=Object.fromEntries(f.requires.map(id=>[id,1]));if(f.twin)for(const id of f.requires)ranks[id]=3;else if(f.solo)ranks[f.requires[0]]=3;else if(f.awakened)ranks[SOLO_FORMS[f.addedSolo].requires[0]]=3;return ranks;}
function fixture(ids,count=24,level=1){const s=createDefense(3001);s.currency=10000;for(let i=0;i<ids.length;i++){plantDefense(s,ids.length===1?1:i);const t=s.towers.at(-1),f=DEFENSE_FORMS[ids[i]];Object.assign(t,{laws:[...f.requires],lawRanks:ranksFor(f),formId:f.id,level,ultimateCharge:0});}s.currency=80;s.phase='wave';s.wave=12;s.spawned=defenseWaveInfo(12).count;s.enemies=Array.from({length:count},(_,i)=>{const p=ids.length===1?36+(i%16)*.9+(i>=16?90:0):8+(i%110)*2;return {id:1000+i,...defensePoint(p),progress:p,hp:1e7,maxHp:1e7,kind:i%11===10?'shield':'normal',speed:.15,slow:1,slowTime:0,attackTime:99,leakDamage:1};});s.nextId=5000;return s;}
function checkVisuals(s,c){const visuals=c.visuals();assert(visuals.length<=DEFENSE_COMBAT.maxVisuals);for(const v of visuals)for(const key of ['x','y','angle','size'])assert(Number.isFinite(v[key]),`${v.formId}.${key}`);for(const e of s.effects)for(const key of ['x','y','tx','ty','life','maxLife'])assert(Number.isFinite(e[key]),`effect ${e.kind}.${key}`);assert(s.effects.length<=DEFENSE.maxEffects);return visuals.length;}

test('all153 shared attacks execute normal and ultimate phases with finite bounded visuals',()=>{
 for(const f of Object.values(DEFENSE_FORMS)){
  let c;try{const s=fixture([f.id]);c=createDefenseCombat(s);let visualPeak=0,boltPeak=0;for(let i=0;i<480;i++){stepDefense(s,1/60,c);if(i%12===0){visualPeak=Math.max(visualPeak,checkVisuals(s,c));boltPeak=Math.max(boltPeak,c.diagnostics().bolts);}}
   const normalDamage=s.stats.damage;{assert(!c.surge(-1));if(s.towers[0].ultimateCharge<30)assert(!c.surge(s.towers[0].id));}
   // A unit test supplies earned charge to exercise the ultimate itself.
   s.towers[0].ultimateCharge=30;assert(c.surge(s.towers[0].id));assert.equal(s.towers[0].ultimateCharge,0);assert(!c.surge(s.towers[0].id));
   for(let i=0;i<300;i++){stepDefense(s,1/60,c);if(i%12===0){visualPeak=Math.max(visualPeak,checkVisuals(s,c));boltPeak=Math.max(boltPeak,c.diagnostics().bolts);}}
   const diag=c.diagnostics();assert(diag.engines===(f.twin?2:1));assert(boltPeak<=diag.engines*DEFENSE_COMBAT.maxBolts);
   const row={id:f.id,kind:f.kind,normalDamage:Number(normalDamage.toFixed(2)),ultimateWindowDamage:Number((s.stats.damage-normalDamage).toFixed(2)),totalDamage:Number(s.stats.damage.toFixed(2)),resonances:diag.resonances,visualPeak,boltPeak};report.forms.push(row);
   if(s.stats.damage<=0)report.errors.push(`${f.id}: zero damage in near-path target pack`);
  }catch(error){report.errors.push(`${f.id}: ${error.stack}`);}finally{c?.dispose();}
 }
 assert.equal(report.forms.length,153,report.errors.join('\n'));
});

test('mirror protection intercepts actual hostile projectiles and survives resets without charge refill',()=>{const s=fixture(['mirrorguard'],8);const c=createDefenseCombat(s);try{const t=s.towers[0];stepDefense(s,1/60,c);for(let i=0;i<120;i++){if(i%15===0)s.shots.push({id:s.nextId++,x:t.x+8.8,y:t.y,tx:104,ty:48,vx:-15,vy:0,speed:15,life:5,age:0,law:'hostile',damage:1,hit:[]});stepDefense(s,1/60,c);}assert(s.stats.blocked>0);t.ultimateCharge=17;c.reset();assert.equal(t.ultimateCharge,17);stepDefense(s,1/60,c);assert(t.ultimateCharge<18);assert(!c.surge(t.id));}finally{c.dispose();}});

test('earned ultimate charge survives between-wave save/restore without reset exploits',()=>{const s=createDefense(19);plantDefense(s,1);chooseDefenseLaw(s,s.towers[0].id,'burst');s.wave=1;s.phase='draft';s.draftCredit=1;chooseDefenseLaw(s,s.towers[0].id,'gravity');s.towers[0].ultimateCharge=13.25;const restored=restoreDefense(checkpointDefense(s));assert(restored);assert.equal(restored.towers[0].ultimateCharge,13.25);const c=createDefenseCombat(restored);try{c.reset();assert.equal(restored.towers[0].ultimateCharge,13.25);assert(!c.surge(restored.towers[0].id));assert(startDefenseWave(restored));stepDefense(restored,.1,c);assert.equal(restored.towers[0].ultimateCharge,13.25);}finally{c.dispose();}});

function plan(state,seed,style){
 for(const pad of [2,1,5,6,0,3,4,7])plantDefense(state,pad);
 const pairs=seed%3===0?[['gravity','burst'],['frost','chain'],['pierce','chain'],['orbit','frost']]:seed%3===1?[['orbit','frost'],['burst','split'],['pierce','chain'],['gravity','burst']]:[['pierce','chain'],['gravity','burst'],['orbit','reflect'],['frost','chain']];
 if(state.draftCredit){
  const first=state.towers[0],total=Object.values(first.lawRanks).reduce((n,r)=>n+r,0),limit=style==='twin'?6:style==='final'?4:style==='solo'?3:0;
  if(total<limit){const order=style==='twin'?['gravity','gravity','gravity','burst','burst','burst']:style==='solo'?['orbit','orbit','orbit']:['gravity','burst','gravity','gravity'];assert(chooseDefenseLaw(state,first.id,order[total]));}
  else {let t=state.towers.find(t=>t.laws.length<2&&(style!=='solo'||t!==first));if(!t)t=state.towers[0];const index=state.towers.indexOf(t),pair=pairs[index%pairs.length],chosen=t.laws.length===0?pair[0]:t.laws.length===1?pair[1]:t.laws[0];assert(chooseDefenseLaw(state,t.id,chosen));}
 }
 for(const t of state.towers){const options=getDefenseEvolutionOptions(t),f=style==='twin'&&t===state.towers[0]?(options.find(f=>f.kind==='twin')||options.find(f=>f.kind==='solo')):options.find(f=>f.kind==='final')||options[0];if(f)evolveDefense(state,t.id,f.id);}

 for(const t of [...state.towers].sort((a,b)=>(a.level-b.level)||(Number(!!b.formId)-Number(!!a.formId))))upgradeDefense(state,t.id);
}
function run(seed,reload=false,style='broad'){let s=createDefense(seed),c=createDefenseCombat(s),frames=0,lastPhase=s.phase,maxBolts=0,maxVisuals=0;try{while(!['won','lost'].includes(s.phase)&&frames++<18000){if(s.phase!=='wave'){c.reset();if(reload){const raw=checkpointDefense(s);c.dispose();s=restoreDefense(raw);assert(s);c=createDefenseCombat(s);}plan(s,seed,style);assert(startDefenseWave(s));}stepDefense(s,.1,c);for(const t of s.towers)if(t.ultimateCharge>=30)c.surge(t.id);if(frames%15===0){maxVisuals=Math.max(maxVisuals,checkVisuals(s,c));maxBolts=Math.max(maxBolts,c.diagnostics().bolts);}if(lastPhase==='wave'&&s.phase!=='wave')c.reset();lastPhase=s.phase;}assert(frames<18000,'combat run stalled');return {seed,reload,style,phase:s.phase,wave:s.wave,hp:s.coreHp,kills:s.kills,currency:s.currency,time:Number(s.time.toFixed(3)),forms:s.towers.map(t=>t.formId),maxBolts,maxVisuals};}finally{c.dispose();}}
test('seeded investment strategies run all12 real waves with actual authored attacks',()=>{for(const seed of [1,2,3]){const result=run(seed);report.runs.push(result);console.log('Actual run',JSON.stringify(result));}for(const style of ['solo','final','twin']){const result=run(1,false,style);report.runs.push(result);assert.equal(result.phase,'won');assert(result.forms.some(id=>DEFENSE_FORMS[id]?.kind===style),`actual ${style} strategy`);console.log('Focused evolution run',JSON.stringify(result));}const replay=run(1,true);report.runs.push(replay);for(const key of ['phase','wave','hp','kills','currency','time'])assert.equal(replay[key],report.runs[0][key],key);assert(report.runs.slice(0,3).some(r=>r.phase==='won'),'at least one honest strategy should win');});

test('neglecting construction loses and short-range base orbit alone cannot clear the whole run',()=>{
 for(const mode of ['one-seed-no-upgrades','all-base-orbit']){
  const s=createDefense(1);let c=createDefenseCombat(s),steps=0;
  try{while(!['won','lost'].includes(s.phase)&&steps++<15000){
   if(s.phase!=='wave'){c.reset();if(mode==='all-base-orbit')for(const pad of [2,1,5,6,0,3,4,7])plantDefense(s,pad);else if(!s.towers.length)plantDefense(s,2);
    if(s.draftCredit){const t=s.towers.find(t=>!t.laws.length)||s.towers[0];assert(chooseDefenseLaw(s,t.id,'orbit'));}
    if(mode==='all-base-orbit')for(const t of [...s.towers].sort((a,b)=>a.level-b.level))upgradeDefense(s,t.id);
    assert(startDefenseWave(s));
   }stepDefense(s,.1,c);
  }assert.equal(s.phase,'lost');if(mode==='one-seed-no-upgrades')assert(s.wave<12);const outcome={strategy:mode,phase:s.phase,wave:s.wave,hp:s.coreHp,kills:s.kills,time:Number(s.time.toFixed(3)),note:'Mandatory wave rewards reinforced orbit; no fake skipped reward credits.'};report.runs.push(outcome);console.log('Failure baseline',JSON.stringify(outcome));}finally{c.dispose();}
 }
});

test('120 enemies and eight dense twin towers stay within per-engine and global visual bounds',()=>{const ids=['prismsiblings','stormpetals','burstpetals','lightningmirror','gravitybloom','returningbloom','winterring','spearthunder'],s=fixture(ids,120,5),c=createDefenseCombat(s),samples=[];let maxBolts=0,maxVisuals=0;try{for(let i=0;i<720;i++){if(i===180)for(const t of s.towers){t.ultimateCharge=30;c.surge(t.id);}const before=performance.now();stepDefense(s,1/60,c);samples.push(performance.now()-before);maxVisuals=Math.max(maxVisuals,checkVisuals(s,c));const d=c.diagnostics();maxBolts=Math.max(maxBolts,d.bolts);assert(d.engines===16);assert(d.bolts<=16*DEFENSE_COMBAT.maxBolts);assert(s.enemies.length<=120);assert(s.shots.length<=180);}samples.sort((a,b)=>a-b);report.stress={scope:'Node CPU only, no browser/device/render cost',enemies:120,towers:8,engines:16,ticks:720,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1),maxBolts,maxVisuals,diagnostics:c.diagnostics()};console.log('Node CPU stress',JSON.stringify(report.stress));}finally{c.dispose();}});

const twinRows=report.forms.filter(f=>TWIN_FORMS[f.id]);report.twinResonances={forms:twinRows.length,triggered:twinRows.filter(f=>f.resonances>0).length,missing:twinRows.filter(f=>!f.resonances).map(f=>f.id)};
const sorted=[...report.forms].sort((a,b)=>a.totalDamage-b.totalDamage);report.targetPackDamage={note:'Fixed near-path pack, 8 seconds normal plus5 seconds after supplied ultimate charge; geometry-specific and not a universal strength ranking.',weakest:sorted.slice(0,8).map(({id,totalDamage})=>({id,totalDamage})),strongest:sorted.slice(-8).reverse().map(({id,totalDamage})=>({id,totalDamage})),distinctTotals:new Set(sorted.map(r=>r.totalDamage)).size};
report.checks=checks;report.generatedAt=new Date().toISOString();await mkdir('artifacts',{recursive:true});await writeFile('artifacts/seed-defense-combat-report.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.errors.length,0,report.errors.join('\n'));assert.equal(report.twinResonances.triggered,36,'every authored twin resonance must trigger');
console.log(`Actual defence combat: ${checks} tests passed; ${report.forms.length} form cases; ${report.twinResonances.triggered}/36 twin resonances observed.`);
