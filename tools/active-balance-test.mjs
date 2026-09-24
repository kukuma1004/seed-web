import assert from 'node:assert/strict';
import {FORMS,CURATED_FORMS,SOLO_FORMS,ALL_FORMS,AWAKEN_FORMS,LIVE_AWAKEN_FORMS,TWIN_FORMS,SOLO_LEVEL,formStats,soloFormOf} from '../src/forms.js';
import {averageDps,bossDps,simulate,SCENES} from './balance-sim.mjs';

// Balance is measured, not guessed: every evolution fights the same three crowds (see balance-sim.mjs).
const median=list=>{const s=[...list].sort((a,b)=>a-b),m=s.length/2;return s.length%2?s[Math.floor(m)]:(s[m-1]+s[m])/2;};
const offensive=ids=>ids.filter(id=>!ALL_FORMS[id].passive);
// 의도적으로 역할이 치우친 조합들. 이 조합들이 기준 중앙값을 흔들면
// 손대지 않은 조합이 덩달아 검사에 걸리므로 기준에서 빼고 따로 잰다.
const tacticalFusions=['gravitymirror','chainburst','blastlance','frostkaleidoscope','lightningpetal','returnflare','comethalo','stormanchor','returningpetals','gravitystake',
 'icicle','halobloom','frostnet','rewindbolt','refractlance',
 'thundermirror','sunmirror','pierceshower','ebbring','pullgarden',
 'spearring','accretiondisk','rimeback','coldwell','rimepetal','echolane'];
const batch1=['icicle','halobloom','frostnet','rewindbolt','refractlance'];

// A completed Lv.3 first fusion must contribute enough sustained pressure to
// finish stage-one Austin with ordinary seed fire and skilled dodging. The
// mirror is measured under Austin's real projectile pressure; this is a
// damage floor, not a guarantee that standing still wins the encounter.
for(const id of Object.keys(FORMS)){
 const damage=bossDps(id,3,{shots:true});
 if(id==='mirrorguard'){
  assert.ok(damage>=10&&damage<=50,`defensive mirror guard should survive boss shots without becoming boss DPS (${Math.round(damage)} DPS)`);
  continue;
 }
 assert.ok(damage>=50,`${id}: Austin pressure too low at Lv.3 (${Math.round(damage)} DPS)`);
 assert.ok(damage<=260,`${id}: Austin pressure bypasses the boss damage budget (${Math.round(damage)} DPS)`);
}
const mirrorParry=simulate('mirrorguard',3,{positions:[[0,-5]],enemyType:'austin',shots:true,seconds:20});
assert.ok(mirrorParry.interceptions>=3&&mirrorParry.interceptions<=12,`mirror guard should return a few Austin bolts, not erase the barrage (${mirrorParry.interceptions})`);

// Equal investment: a fusion of two laws with p picks between them is level p-1; a solo law at level p evolves to level p-1.
// A solo evolution starts at law level SOLO_LEVEL, so the first comparison is at evolution level SOLO_LEVEL-1.
for(const level of [SOLO_LEVEL-1,9]){
 const fusion=Object.fromEntries(offensive(Object.keys(FORMS)).filter(id=>!tacticalFusions.includes(id)).map(id=>[id,averageDps(id,level)]));
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
 // 보류 중인 묶음도 손제작 조합이라 같은 잣대로 잰다.
 const curated=Object.fromEntries(Object.keys(CURATED_FORMS).map(id=>[id,averageDps(id,level,{shots:CURATED_FORMS[id].passive})]));
 const newForms=tacticalFusions;
 const established=Object.entries(curated).filter(([id])=>!newForms.includes(id)).map(([,damage])=>damage);
 const middle=median(established);
 // Adding a deliberately tactical weapon must not move the historical balance
 // yardstick and make an unchanged weapon fail merely by lowering the median.
 assert.ok(Math.max(...Object.values(curated))<=middle*2.1,`level ${level}: a curated form exceeds 2.1x the established median crowd damage`);
 for(const id of newForms.filter(id=>id!=='gravitystake'))assert.ok(curated[id]>=middle*.55&&curated[id]<=middle*1.55,`level ${level}: ${id} misses the authored fusion damage band`);
 assert.ok(curated.gravitystake>=middle*.08&&curated.gravitystake<=middle*.35,`level ${level}: gravity stake no longer pays a clear crowd-damage cost`);
 assert.ok(curated.tidepull>=middle*1.5&&curated.tidepull<=middle*2,`level ${level}: tidepull crowd damage ${Math.round(curated.tidepull)} misses its control-specialist band`);
 assert.ok(curated.tidepull<curated.collapse,`level ${level}: tidepull control and damage together exceed collapse's dedicated crowd burst`);
 assert.ok(bossDps('tidepull',level)<curated.tidepull*.2,`level ${level}: tidepull lost its single-target weakness`);
 assert.ok(bossDps('gravitystake',level)>curated.gravitystake*2.2&&bossDps('gravitystake',level)>middle*.25,`level ${level}: gravity stake lost its isolated-target specialty`);
 const lanceLine=simulate('thunderlance',level,{scene:'line'}).dps,lanceScatter=simulate('thunderlance',level,{scene:'scattered'}).dps;
 assert.ok(lanceLine>lanceScatter*2.5,`level ${level}: thunderlance no longer rewards a lined-up shot`);
 const stormCluster=simulate('seedstorm',level,{scene:'cluster'}).dps,stormScatter=simulate('seedstorm',level,{scene:'scattered'}).dps;
 assert.ok(stormCluster>stormScatter*3,`level ${level}: seedstorm no longer trades range for point-blank damage`);
}

// 2026-09-21 1묶음: 다섯 조합이 각자 다른 역할을 실제로 수행하는지 같은 시드로 잰다.
for(const level of [SOLO_LEVEL-1,9]){
 const crowd=Object.fromEntries(batch1.map(id=>[id,averageDps(id,level,{shots:CURATED_FORMS[id].passive})]));
 const boss=Object.fromEntries(batch1.map(id=>[id,bossDps(id,level)]));
 // 단일 대상: 고드름 창은 묶음에서 보스 피해가 가장 높고, 다수전 피해는 중간을 넘지 않는다.
 assert.ok(boss.icicle===Math.max(...Object.values(boss)),`level ${level}: 고드름 창이 단일 대상 1위가 아님`);
 assert.ok(boss.icicle>crowd.icicle*.4,`level ${level}: 고드름 창 보스 피해 ${Math.round(boss.icicle)}가 다수전에 비해 낮음`);
 {
  const line=simulate('icicle',level,{scene:'line'}).dps,cluster=simulate('icicle',level,{scene:'cluster'}).dps;
  assert.ok(line<cluster*1.6,'고드름 창은 줄 세우기 보상이 아니라 같은 적 재적중 보상이다');
 }
 // 제어: 단독 보스에게도 서리 줄 하나를 걸지만, 무리 연결보다 훨씬 약하다.
 assert.ok(boss.frostnet<crowd.frostnet*.2,`level ${level}: 얼어붙은 그물이 제어 대가를 치르지 않음`);
 assert.ok(boss.frostnet===Math.min(...Object.values(boss)),`level ${level}: 얼어붙은 그물이 단일 대상에서 약하지 않음`);
 // 다수전: 꽃잎 후광은 붙은 적 수만큼 세지고, 멀리 떨어진 적에게는 아예 닿지 않는다.
 {
  assert.ok(crowd.halobloom>boss.halobloom*2.5,`level ${level}: 꽃잎 후광이 다수전 보상을 잃음 (${Math.round(crowd.halobloom)} vs 단일 ${Math.round(boss.halobloom)})`);
  const ring=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*1.5,Math.sin(i*Math.PI/4)*1.5]);
  const far=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*8,Math.sin(i*Math.PI/4)*8]);
  const close=simulate('halobloom',level,{positions:ring,seconds:3}).dps;
  const away=simulate('halobloom',level,{positions:far,seconds:3}).dps;
  assert.ok(away<close*.12,`level ${level}: 꽃잎 후광이 멀리 있는 적에게도 닿음 (${Math.round(away)} vs 붙었을 때 ${Math.round(close)})`);
 }
 // 이동 보상: 되감는 번개는 멈춰 있으면 눈에 띄게 약하다.
 {
  const still=simulate('rewindbolt',level,{scene:'cluster',positions:SCENES.cluster(),still:true}).dps;
  const moving=simulate('rewindbolt',level,{scene:'cluster'}).dps;
  assert.ok(moving>still*1.35,`level ${level}: 되감는 번개가 이동 보상을 잃음 (${Math.round(moving)} vs 정지 ${Math.round(still)})`);
 }
 // 방어·엄폐 대응: 굴절 창은 벽에 붙어 늘어선 적을 벽을 타고 훑는다.
 {
  // 엄폐물(z=-6) 바로 앞에 좌우로 늘어선 셋. 창은 벽에 닿아 옆으로 꺾이며 줄을 훑는다.
  const alongWall=[[0,-5.2],[-2,-5.2],[2,-5.2]];
  const walled=simulate('refractlance',level,{positions:alongWall,walls:true,seconds:4}).dps;
  const open=simulate('refractlance',level,{positions:alongWall,seconds:4}).dps;
  assert.ok(walled>open*1.25,`level ${level}: 굴절 창이 벽 보상을 잃음 (${Math.round(walled)} vs 벽 없음 ${Math.round(open)})`);
 }
}

// 2026-09-21 2묶음 역할 검사.
for(const level of [SOLO_LEVEL-1,9]){
 const crowd=id=>averageDps(id,level,{shots:CURATED_FORMS[id].passive});
 // 천둥 거울: 둘이 붙어 있을 때 가장 세다(혼자 있는 적보다 확실히, 무리 전체보다 크게 늘지 않음).
 {
  const pair=simulate('thundermirror',level,{positions:[[0,-3],[.9,-3.4]],seconds:6}).dps,single=bossDps('thundermirror',level);
  assert.ok(pair>single*1.6,`level ${level}: 천둥 거울이 두 적 주고받기 보상을 잃음 (${Math.round(pair)} vs 혼자 ${Math.round(single)})`);
 }
 // 태양 거울: 적 탄이 날아오는 방에서 확실히 세진다.
 {
  const quiet=averageDps('sunmirror',level),fire=averageDps('sunmirror',level,{shots:true});
  assert.ok(fire>quiet*1.25,`level ${level}: 태양 거울이 탄막 보상을 잃음 (${Math.round(fire)} vs ${Math.round(quiet)})`);
  const ordinary=simulate('sunmirror',level,{shots:true,seconds:20}),boss=simulate('sunmirror',level,{shots:true,seconds:20,enemyType:'austin'});
  assert.ok(ordinary.interceptions>0&&ordinary.interceptions<=60,`level ${level}: 태양 거울이 일반 탄막 절반 이상을 지움 (${ordinary.interceptions}/120)`);
  assert.equal(boss.interceptions,0,`level ${level}: 태양 거울이 보스 탄막을 지움`);
 }
 // 꿰뚫는 꽃비: 무리용이라 혼자 있는 적에게는 약하다.
 assert.ok(crowd('pierceshower')>bossDps('pierceshower',level)*3,`level ${level}: 꿰뚫는 꽃비가 무리 특화를 잃음`);
 // 밀물 고리: 움직여야 세다.
 {
  const still=simulate('ebbring',level,{scene:'cluster',still:true}).dps,moving=simulate('ebbring',level,{scene:'cluster'}).dps;
  assert.ok(moving>still*1.35,`level ${level}: 밀물 고리가 이동 보상을 잃음 (${Math.round(moving)} vs 정지 ${Math.round(still)})`);
 }
 // 끌림 꽃밭: 둘 이상 모여야 피므로 혼자인 적에게는 약하다.
 assert.ok(bossDps('pullgarden',level)<crowd('pullgarden')*.35,`level ${level}: 끌림 꽃밭이 혼자인 적에게 너무 셈`);
}

// 2026-09-21 3묶음 역할 검사.
for(const level of [SOLO_LEVEL-1,9]){
 const r=(id,o)=>simulate(id,level,o).dps;
 // 창날 고리: 창이 줄을 꿰뚫으므로 줄지어 선 적에게 확실히 세다.
 assert.ok(r('spearring',{scene:'line',shots:true})>r('spearring',{scene:'scattered',shots:true})*1.5,`level ${level}: 창날 고리가 줄 꿰뚫기 보상을 잃음`);
 // 강착 원반: 적 탄이 날아오면 원반이 빨리 차서 세진다.
 assert.ok(averageDps('accretiondisk',level,{shots:true})>averageDps('accretiondisk',level)*1.2,`level ${level}: 강착 원반이 탄막 보상을 잃음`);
 // 서리 꽃잎: 꽃잎이 겹치는 뭉친 무리에서 세다.
 assert.ok(r('rimepetal',{scene:'cluster'})>r('rimepetal',{scene:'scattered'})*1.25,`level ${level}: 서리 꽃잎이 뭉친 무리 보상을 잃음`);
 // 메아리 회랑: 벽이 가까우면 짧은 길을 여러 번 오간다.
 {
  const few=[[0,-2],[0,-3],[0,-4]];
  assert.ok(r('echolane',{positions:few,walls:true,seconds:5})>r('echolane',{positions:few,seconds:5})*1.15,`level ${level}: 메아리 회랑이 벽 보상을 잃음`);
 }
 // 얼어붙은 블랙홀: 제어라 문지기·보스 하나에게는 약하다.
 assert.ok(bossDps('coldwell',level)<averageDps('coldwell',level)*.15,`level ${level}: 얼어붙은 블랙홀이 단일 대상에 너무 셈`);
}

// Orbit family roles: only the crown spends its whole budget on automatic
// damage; the mirror is deliberately weak until it can turn enemy shots back.
for(const level of [SOLO_LEVEL-1,9]){
 const crown=averageDps('stormcrown',level),guard=averageDps('frostguard',level),ring=averageDps('starring',level);
 assert.ok(crown>=Math.max(guard,ring)*.98,`level ${level}: offensive storm crown fell behind defensive orbit forms`);
 const mirrorQuiet=averageDps('mirrorguard',level),mirrorUnderFire=averageDps('mirrorguard',level,{shots:true});
 assert.ok(mirrorUnderFire>mirrorQuiet*2,`level ${level}: mirror guard no longer rewards fighting shooters`);
}

assert.equal(formStats('tidepull',SOLO_LEVEL-1).vortices,2,'normal tide keeps its two-core spectacle');
assert.equal(formStats('maelstrom',SOLO_LEVEL-1).vortices,3,'awakened maelstrom earns a third lane');
assert.equal(formStats('tidepull',SOLO_LEVEL-1,{surge:true}).vortices,3,'tide ultimate adds one lane without doubling the formation');
// The ring is passive like the three orbit fusions; it stays in their range.
{
 const passiveFusions=Object.keys(FORMS).filter(id=>FORMS[id].passive).map(id=>averageDps(id,SOLO_LEVEL-1,{shots:true}));
 const ring=averageDps('starring',SOLO_LEVEL-1,{shots:true});
 assert.ok(ring>=Math.min(...passiveFusions)*.8&&ring<=Math.max(...passiveFusions)*1.2,`starring ${Math.round(ring)} vs passive fusions ${passiveFusions.map(Math.round)}`);
}

// One signature (3 seconds) is worth 12-32 seconds of that evolution's normal damage. The gauge is slow (a whole crowd plus a
// 20 s cooldown), so the payoff must be decisive (2026-09-15: SURGE_DAMAGE 1.6 after players felt enemies survived it).
const SIGNATURE_SECONDS=3;
for(const id of Object.keys(ALL_FORMS).filter(id=>!ALL_FORMS[id].finalCandidate)){
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
 for(const [key,value] of Object.entries(base))if(typeof value==='number'&&Number.isFinite(value)&&!['interval','novaEvery','pulse','delay','period','decay','chargeDecay','isolation','cone','range','spread','life','flight','slow','cooldown','gain','ramp','inner','speed','shatterBounces',
  // 작을수록 좋은 값들(조건이 빨리 차거나 금방 회복된다)
  'bloomAt','regrow','rewindDistance','minLinks','webTick','launchEvery','capacity','freezeAfter'].includes(key))assert.ok(up[key]>=value,`${id}.${key}`);
 assert.deepEqual(formStats(id,1),formStats(id,1,{surge:false}));
}
// Awakened evolutions replace two slots (the fusion and its best solo evolution at equal levels) with one:
// about as strong as the pair, never a runaway (0.7x-1.5x), and the level rule is the one progression.js uses.
for(const a of Object.values(LIVE_AWAKEN_FORMS).filter(a=>!a.finalCandidate)){
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
