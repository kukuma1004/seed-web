import assert from 'node:assert/strict';
import {AWAKEN_FORMS,SOLO_LEVEL,soloFormOf} from '../src/forms.js';
import {averageDps,bossDps,simulate,SCENES} from './balance-sim.mjs';

const rows=[];
const SPECIALIST_FLOORS=new Set(['gravitystake','prism','mirrorguard','frostkaleidoscope']);
for(const a of Object.values(AWAKEN_FORMS).filter(form=>form.finalCandidate)){
 const L=SOLO_LEVEL-1,shots=a.passive;
 const pair=averageDps(a.base,L,{shots})+Math.max(...a.requires.map(soloFormOf).map(id=>averageDps(id,L,{shots})));
 const result=averageDps(a.id,L+Math.ceil(L/3),{shots});
 let normal=0,boosted=0;
 for(const scene of Object.keys(SCENES)){
  normal+=simulate(a.id,L,{scene,seconds:10,shots}).damage;
  boosted+=simulate(a.id,L,{scene,seconds:10,shots,surgeAt:1,surgeSeconds:3}).damage;
 }
 rows.push({id:a.id,ratio:result/pair,worth:(boosted-normal)/(normal/10),boss:bossDps(a.id,L,{shots})});
}
const extremes=(key)=>({min:rows.reduce((a,b)=>a[key]<b[key]?a:b),max:rows.reduce((a,b)=>a[key]>b[key]?a:b)});
if(process.argv.includes('--report'))console.log(rows.filter(r=>r.worth>32||r.worth<12).map(r=>`${r.id}: ${r.worth.toFixed(1)}s`).join('\n'));
assert.equal(rows.length,61);
for(const r of rows){
 const base=AWAKEN_FORMS[r.id].base;
 assert.ok(r.ratio<1.5,`${r.id}: crowd damage exceeds both ingredients`);
 assert.ok(r.ratio>=(SPECIALIST_FLOORS.has(base)?.2:.5),`${r.id}: too little crowd damage for its role (${r.ratio.toFixed(2)})`);
 assert.ok(r.worth>=8&&r.worth<=40,`${r.id}: signature worth ${r.worth.toFixed(1)} seconds`);
 assert.ok(r.boss>20&&r.boss<450,`${r.id}: boss damage ${r.boss.toFixed(0)} escapes safe band`);
}
console.log(`Final branch balance: 61 held branches; crowd ${extremes('ratio').min.ratio.toFixed(2)}–${extremes('ratio').max.ratio.toFixed(2)}x, signature ${extremes('worth').min.worth.toFixed(1)}–${extremes('worth').max.worth.toFixed(1)}s, boss ${extremes('boss').min.boss.toFixed(0)}–${extremes('boss').max.boss.toFixed(0)} DPS.`);
