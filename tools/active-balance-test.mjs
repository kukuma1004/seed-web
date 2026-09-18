import assert from 'node:assert/strict';
import {FORMS,SOLO_FORMS,ALL_FORMS,AWAKEN_FORMS,TWIN_FORMS,SOLO_LEVEL,formStats,soloFormOf} from '../src/forms.js';
import {averageDps,bossDps,simulate,SCENES} from './balance-sim.mjs';

// Balance is measured, not guessed: every evolution fights the same three crowds (see balance-sim.mjs).
const median=list=>{const s=[...list].sort((a,b)=>a-b),m=s.length/2;return s.length%2?s[Math.floor(m)]:(s[m-1]+s[m])/2;};
const offensive=ids=>ids.filter(id=>!ALL_FORMS[id].passive);

// Equal investment: a fusion of two laws with p picks between them is level p-1; a solo law at level p evolves to level p-1.
// A solo evolution starts at law level SOLO_LEVEL, so the first comparison is at evolution level SOLO_LEVEL-1.
for(const level of [SOLO_LEVEL-1,9]){
 const fusion=Object.fromEntries(offensive(Object.keys(FORMS)).map(id=>[id,averageDps(id,level)]));
 const solo=Object.fromEntries(offensive(Object.keys(SOLO_FORMS)).map(id=>[id,averageDps(id,level)]));
 const fusionMedian=median(Object.values(fusion)),soloMedian=median(Object.values(solo));
 const ratio=soloMedian/fusionMedian;
 // Solo evolutions are the single-law path: a little behind fusions, never ahead of them.
 assert.ok(ratio>=.55&&ratio<=.95,`level ${level}: solo median ${Math.round(soloMedian)} is ${ratio.toFixed(2)} of fusion median ${Math.round(fusionMedian)}`);
 for(const [id,dps] of Object.entries(solo)){
  assert.ok(dps>=fusionMedian*.35,`level ${level}: ${id} too weak (${Math.round(dps)})`);
  assert.ok(dps<=fusionMedian*1.5,`level ${level}: ${id} too strong (${Math.round(dps)})`);
 }
}

// Curated weapons keep a real weakness. Crowd controllers cannot also own
// runaway damage, and the two aim-dependent weapons must retain their intended
// reward for lining enemies up or accepting point-blank danger.
for(const level of [SOLO_LEVEL-1,9]){
 const curated=Object.fromEntries(Object.keys(FORMS).map(id=>[id,averageDps(id,level,{shots:FORMS[id].passive})]));
 const middle=median(Object.values(curated));
 assert.ok(Math.max(...Object.values(curated))<=middle*2.1,`level ${level}: a curated form exceeds 2.1x median crowd damage`);
 assert.ok(curated.tidepull<=middle*1.5,`level ${level}: tidepull crowd damage ${Math.round(curated.tidepull)} exceeds its control budget`);
 assert.ok(bossDps('tidepull',level)<curated.tidepull*.2,`level ${level}: tidepull lost its single-target weakness`);
 const lanceLine=simulate('thunderlance',level,{scene:'line'}).dps,lanceScatter=simulate('thunderlance',level,{scene:'scattered'}).dps;
 assert.ok(lanceLine>lanceScatter*2.5,`level ${level}: thunderlance no longer rewards a lined-up shot`);
 const stormCluster=simulate('seedstorm',level,{scene:'cluster'}).dps,stormScatter=simulate('seedstorm',level,{scene:'scattered'}).dps;
 assert.ok(stormCluster>stormScatter*3,`level ${level}: seedstorm no longer trades range for point-blank damage`);
}

// Orbit family roles: only the crown spends its whole budget on automatic
// damage; the mirror is deliberately weak until it can turn enemy shots back.
for(const level of [SOLO_LEVEL-1,9]){
 const crown=averageDps('stormcrown',level),guard=averageDps('frostguard',level),ring=averageDps('starring',level);
 assert.ok(crown>=Math.max(guard,ring)*.98,`level ${level}: offensive storm crown fell behind defensive orbit forms`);
 const mirrorQuiet=averageDps('mirrorguard',level),mirrorUnderFire=averageDps('mirrorguard',level,{shots:true});
 assert.ok(mirrorUnderFire>mirrorQuiet*2,`level ${level}: mirror guard no longer rewards fighting shooters`);
}

assert.equal(formStats('tidepull',SOLO_LEVEL-1).vortices,1,'normal tide owns one steerable lane');
assert.equal(formStats('maelstrom',SOLO_LEVEL-1).vortices,2,'awakened maelstrom earns a second lane');
assert.equal(formStats('tidepull',SOLO_LEVEL-1,{surge:true}).vortices,2,'tide ultimate adds one lane, not an arena-filling pair');
// The ring is passive like the three orbit fusions; it stays in their range.
{
 const passiveFusions=Object.keys(FORMS).filter(id=>FORMS[id].passive).map(id=>averageDps(id,SOLO_LEVEL-1,{shots:true}));
 const ring=averageDps('starring',SOLO_LEVEL-1,{shots:true});
 assert.ok(ring>=Math.min(...passiveFusions)*.8&&ring<=Math.max(...passiveFusions)*1.2,`starring ${Math.round(ring)} vs passive fusions ${passiveFusions.map(Math.round)}`);
}

// One signature (3 seconds) is worth 12-32 seconds of that evolution's normal damage. The gauge is slow (a whole crowd plus a
// 20 s cooldown), so the payoff must be decisive (2026-09-15: SURGE_DAMAGE 1.6 after players felt enemies survived it).
const SIGNATURE_SECONDS=3;
for(const id of Object.keys(ALL_FORMS)){
 const shots=ALL_FORMS[id].passive;let normal=0,boosted=0;
 for(const scene of Object.keys(SCENES)){
  normal+=simulate(id,SOLO_LEVEL-1,{scene,seconds:10,shots}).damage;
  boosted+=simulate(id,SOLO_LEVEL-1,{scene,seconds:10,shots,surgeAt:1,surgeSeconds:SIGNATURE_SECONDS}).damage;
 }
 const worth=(boosted-normal)/(normal/10);
 assert.ok(worth>=12&&worth<=32,`${id}: signature worth ${worth.toFixed(1)} seconds of normal damage`);
}

// Surge stat sheets are always stronger or equal, never weaker, and level one numbers are untouched.
for(const id of Object.keys(ALL_FORMS)){
 const base=formStats(id,3),up=formStats(id,3,{surge:true});
 assert.equal(up.surge,true);
 if(Number.isFinite(base.interval))assert.ok(up.interval<base.interval);
 for(const [key,value] of Object.entries(base))if(typeof value==='number'&&Number.isFinite(value)&&!['interval','novaEvery','pulse','delay','period','decay','cone','range','spread','life','flight','slow','cooldown','gain','ramp','inner','speed'].includes(key))assert.ok(up[key]>=value,`${id}.${key}`);
 assert.deepEqual(formStats(id,1),formStats(id,1,{surge:false}));
}
// Awakened evolutions replace two slots (the fusion and its best solo evolution at equal levels) with one:
// about as strong as the pair, never a runaway (0.7x-1.5x), and the level rule is the one progression.js uses.
for(const a of Object.values(AWAKEN_FORMS)){
 const L=SOLO_LEVEL-1,shots=a.passive,pair=averageDps(a.base,L,{shots})+Math.max(...a.requires.map(soloFormOf).map(id=>averageDps(id,L,{shots})));
 const ratio=averageDps(a.id,L+Math.ceil(L/3),{shots})/pair;
 assert.ok(ratio>=.7&&ratio<=1.5,`${a.id}: awakened is ${ratio.toFixed(2)} of fusion + solo`);
}
// Twins replace their two solo evolutions at equal levels the same way.
for(const t of Object.values(TWIN_FORMS)){
 const L=SOLO_LEVEL-1,shots=t.parts.includes('starring'),pair=t.parts.reduce((sum,id)=>sum+averageDps(id,L,{shots}),0);
 const ratio=averageDps(t.id,L+Math.ceil(L/3),{shots})/pair;
 assert.ok(ratio>=.7&&ratio<=1.5,`${t.id}: twin is ${ratio.toFixed(2)} of its two solo evolutions`);
}
console.log('Balance: solo evolutions sit just behind fusions at equal picks (levels 4 and 9), the ring matches orbit fusions, every signature is worth 12-32 seconds of its evolution, awakened evolutions match the pair they replace.');
