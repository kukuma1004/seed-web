import assert from 'node:assert/strict';
import {createDefense,defenseWaveInfo,defensePathLength,DEFENSE_PATH_LENGTH,startDefenseWave,plantDefense,stepDefense} from '../src/seed-defense-rules.js';
import {tickDefenseExpansionBoss,acceptDefenseCoreStrike} from '../src/seed-defense-expansion.js';

let rear=0,keeperBolts=0,gardenerBolts=0;
for(const lap of [0,1])for(const bossId of ['crosswindKeeper','crystalGardener'])for(const position of [{x:-4,y:12},{x:48,y:12},{x:104,y:40}]){
 const s=createDefense(413,{actCount:5});s.wave=lap*60+(bossId==='crosswindKeeper'?48:60);
 const info=defenseWaveInfo(s.wave,s),e={id:47,bossId,...position,progress:0,hp:info.bossHp,maxHp:info.bossHp};
 if(lap)assert(info.bossHp>defenseWaveInfo(s.wave-60,s).bossHp,'later lap keeps actual higher boss HP');
 const strikes=new Map();
 const patterns=new Set();
 for(let n=0;n<1600;n++){
  assert(tickDefenseExpansionBoss(s,e,.025,q=>{
   patterns.add(q.pattern);assert(Math.abs(Math.hypot(q.dir.x,q.dir.z)-1)<1e-9);
   assert(q.coreStrike.startsWith(`47:${bossId}:`));
   const first=!strikes.has(q.coreStrike);assert.equal(acceptDefenseCoreStrike(s,q),first);
   strikes.set(q.coreStrike,(strikes.get(q.coreStrike)||0)+1);
   if(bossId==='crosswindKeeper')keeperBolts++;else gardenerBolts++;
   if(q.pattern!=='rear-salvo')return;
   rear++;const x=q.position.x*5,y=q.position.z*5;
   assert(x>=0&&x<=100&&y>=1&&y<=59,'escort origin stays in the garden');
   assert(Math.hypot(x-e.x,y-e.y)<=8,'escort originates beside actual boss, never teleports beside core');
   const tx=e.expansionBoss.target.x-q.position.x,tz=e.expansionBoss.target.z-q.position.z;
   assert(Math.abs(tx*q.dir.z-tz*q.dir.x)<1e-9,'shot keeps committed heart aim');
   assert.equal(q.spec.life,3.6);assert.equal(q.spec.damage,16);
  },{travelScale:defensePathLength(s)/DEFENSE_PATH_LENGTH}));
 }
 assert(patterns.size>=2,`${bossId} keeps authored distinct shooting patterns`);
 assert([...strikes.values()].some(n=>n>1),'canonical volleys retain multiple real projectiles');
 const key=[...strikes.keys()][0];assert.equal(acceptDefenseCoreStrike(s,{coreStrike:key}),false);
 assert(acceptDefenseCoreStrike(s,{coreStrike:key.replace('47:','48:')}),'different actor has its own committed strike');
 assert(acceptDefenseCoreStrike(s,{law:'hostile'}));assert(acceptDefenseCoreStrike(s,{law:'hostile'}),'legacy normal shots each remain damaging');
 s.wave++;assert(acceptDefenseCoreStrike(s,{coreStrike:key}),'new wave has its own strike receipts');
}
assert(rear>0&&keeperBolts>0&&gardenerBolts>0);
// Exercise the real swept core-contact path, rather than only its receipt helper.
for(const bossId of ['crosswindKeeper','crystalGardener']){
 const s=createDefense(3,{actCount:5});s.wave=bossId==='crosswindKeeper'?48:60;s.phase='wave';s.spawned=defenseWaveInfo(s.wave,s).count;
 const shot=(id,strike)=>({id,x:103.9,y:48,vx:15,vy:0,speed:15,life:1,age:0,law:'hostile',damage:1,hit:[],ballistic:true,...(strike?{coreStrike:strike}:{})});
 const volley=`17:${bossId}:1`;s.shots=Array.from({length:6},(_,i)=>shot(i+1,volley));stepDefense(s,1/60);assert.equal(s.coreHp,19,'six contacts from one committed volley hit core once');
 s.phase='wave';s.shots=[shot(8,volley),shot(9,`17:${bossId}:2`)];stepDefense(s,1/60);assert.equal(s.coreHp,18,'duplicate strike neutral; next committed volley remains threatening');
 s.phase='wave';s.shots=[shot(10),shot(11)];stepDefense(s,1/60);assert.equal(s.coreHp,16,'ordinary legacy projectiles retain independent damage');
}
// Real spawn speed gives the short road the same traversal window, without a
// second .7 multiplier; old three-act road and ordinary HP stay unchanged.
for(const wave of [37,97]){
 const s=createDefense(77,{actCount:5});s.wave=wave-1;assert(plantDefense(s,2));assert(startDefenseWave(s));stepDefense(s,.1);stepDefense(s,.1);stepDefense(s,.1);
 const e=s.enemies[0],info=defenseWaveInfo(wave,s);assert(e);assert.equal(e.maxHp,info.hp*(e.kind==='resilient'?2:e.kind==='shield'?1.5:e.kind==='fast'?.65:1));
 const travel=defensePathLength(s)/e.speed,baseTravel=DEFENSE_PATH_LENGTH/(e.speed/(defensePathLength(s)/DEFENSE_PATH_LENGTH));
 assert(Math.abs(travel-baseTravel)<1e-9);
}
console.log(`TD expansion geometry: ${rear} escort shots remain beside boss/in bounds with unchanged life/damage and committed aim; keeper ${keeperBolts}, gardener ${gardenerBolts} bolts. Node adapter contract, not browser/device/balance QA.`);
