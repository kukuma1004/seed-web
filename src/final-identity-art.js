import manifest from './final-identity-manifest.json' with {type:'json'};

// The card, projectile and ultimate direction share one ID-keyed identity.
// This module is intentionally data-only: importing the compendium never
// builds Three.js geometries or allocates GPU textures for 108 entries.
const BASE=import.meta.env?.BASE_URL||'/';
const ENTRIES=Object.freeze(Object.fromEntries(manifest.entries.map(entry=>[entry.id,Object.freeze(entry)])));
const SHAPE=Object.freeze({reflect:'prism',split:'petal',chain:'fork',orbit:'ring',pierce:'spear',burst:'flare',recall:'crescent',gravity:'well',frost:'crystal'});
const COLOR=Object.freeze({reflect:'#80dcf9',split:'#84e69d',chain:'#ffcc66',orbit:'#f4dc9b',pierce:'#c8e6ff',burst:'#ff9867',recall:'#84dfad',gravity:'#c994fa',frost:'#b3e8ff'});
const TRAIL=Object.freeze({reflect:'angular-reflection',split:'seedlets',chain:'forked-spark',orbit:'swept-arc',pierce:'fine-streak',burst:'ember-sparks',recall:'curved-return',gravity:'inward-spiral',frost:'crystal-dust'});
const IMPACT=Object.freeze({reflect:'shard-flash',split:'petal-birth',chain:'branch-lightning',orbit:'ring-slice',pierce:'piercing-line',burst:'petal-flame',recall:'reverse-crescent',gravity:'closing-well',frost:'six-point-crack'});
const ULTIMATE=Object.freeze({reflect:'DOMAIN',split:'RAIN',chain:'RAIN',orbit:'ORBIT',pierce:'BEAM',burst:'BURST',recall:'RAIN',gravity:'BLACKHOLE',frost:'TIME_STOP'});
const BEAT=Object.freeze({reflect:'거울면을 접어 공격 각도를 바꾼다',split:'씨앗이 갈라져 꽃잎 궤적을 만든다',chain:'적 사이에 번개 연결선을 건다',orbit:'씨앗 둘레에 회전 고리를 펼친다',pierce:'좁고 긴 창날을 전방에 세운다',burst:'꽃봉오리에 열을 모아 터뜨린다',recall:'밖으로 나간 잎을 역방향으로 불러들인다',gravity:'중심점을 오래 붙잡아 압축한다',frost:'대상 주변에 서리 결정을 세운다'});
const MOTION=Object.freeze({
 reflect:'bounce-and-fold',split:'divide-and-fan',chain:'jump-between-targets',orbit:'circle-the-seed',
 pierce:'straight-through',burst:'charge-and-detonate',recall:'out-and-back',gravity:'hold-and-pulse',frost:'freeze-and-shatter'
});
const AUDIO=Object.freeze({reflect:'shotCrystal',split:'shotPetal',chain:'shotArc',orbit:'shotOrbit',pierce:'shotPierce',burst:'shotBurst',recall:'shotReturn',gravity:'shotGravity',frost:'shotFrost'});
const FRAME=Object.freeze({final:'finished-fusion',twin:'interlocked-solos'});

function branchMotion(entry){
 const v=entry.visual||'',b=entry.behavior||'';
 if(/돌아|귀환|되돌|왕복|되감|재결합/.test(v+b))return 'out-and-back';
 if(/차례|교대|박자|맥동|연속/.test(v+b))return 'sequential-beats';
 if(/궤도|공전|주위|둘레|고리/.test(v+b))return 'anchored-orbit';
 if(/집중|한 발|한 점|한 줄|하나/.test(v+b))return 'focused-strike';
 if(/여러|다섯|갈라|사방|넓/.test(v+b))return 'spread-and-chain';
 return MOTION[entry.addedLaw||entry.laws[0]];
}

export function finalIdentity(id){
 const e=ENTRIES[id];if(!e)return null;
 const dominant=e.kind==='final'?e.addedLaw:e.laws[0],counter=e.kind==='final'?e.laws.find(law=>law!==dominant):e.laws[1];
 return Object.freeze({
  id:e.id,kind:e.kind,name:e.name,recipe:e.kind==='final'?[e.fusion,e.addedSolo]:e.parts,
  laws:e.laws,dominant,counter,status:e.status,frame:FRAME[e.kind],
  behavior:e.behavior,visual:e.visual,role:e.role,tradeoff:e.tradeoff,
  motion:branchMotion(e),projectile:finalProjectileStyle(id),
  impact:Object.freeze({shape:IMPACT[dominant],echo:IMPACT[counter],color:COLOR[dominant]}),
  ultimate:Object.freeze({archetype:ULTIMATE[dominant],opening:branchMotion(e),accent:COLOR[dominant],
   secondary:COLOR[counter],storyboard:Object.freeze(e.kind==='final'
    ?[`${e.visual}`,BEAT[counter],`${e.behavior}`]
    :[BEAT[dominant],BEAT[counter],`${e.behavior} 두 흔적이 만난 자리에서 공명 문양이 닫힌다.`])})
 });
}

// Exact field names accepted by buildComboProjectileGeometry(recipe). One
// merged mesh, one material, no extra texture; memoize the built geometry only
// for the equipped identity. The final branch's chosen solo owns the core;
// its fusion partner remains in the shell and the impact echo.
export function finalProjectileStyle(id){
 const e=ENTRIES[id];if(!e)return null;
 const first=e.kind==='final'?e.addedLaw:e.laws[0];
 const second=e.kind==='final'?e.laws.find(law=>law!==first):e.laws[1];
 const slot=e.tile,branch=e.kind==='final'?e.laws.indexOf(first):0;
 return Object.freeze({
  id:e.id,laws:e.laws,primary:first,secondary:second,tail:first,
  core:SHAPE[first],shell:SHAPE[second],trail:SHAPE[e.kind==='twin'?second:first],
  accent:COLOR[first],secondaryColor:COLOR[second],gold:true,twin:e.kind==='twin',second:false,
  coreVariant:(slot*3+branch*5)%12,shellVariant:(slot*5+branch*7)%12,
  trailVariant:(slot*7+branch*11)%12,twist:((slot%7)-3)*.045,mark:(slot%5)+1,
  audio:AUDIO[first],
  motion:branchMotion(e),trailCue:TRAIL[first],impactCue:IMPACT[first],
  echoCue:IMPACT[second],ultimateCue:ULTIMATE[first]
 });
}

export function finalArt(id,extra=''){
 const e=ENTRIES[id];if(!e)return '';
 const file=`seed-final-identity-atlas-v1-${e.atlas+1}.webp`;
 const x=e.tile%6*20,y=Math.floor(e.tile/6)*20;
 return `<span class="form-art final-identity-art ${e.kind==='twin'?'twin-identity-art':'final-branch-art'} ${extra}" aria-hidden="true" style="background-image:url('${BASE}assets/${file}');background-position:${x}% ${y}%"></span>`;
}

export const FINAL_IDENTITY_IDS=Object.freeze(Object.keys(ENTRIES));
export const FINAL_IDENTITY_COUNT=Object.freeze({final:manifest.entries.filter(e=>e.kind==='final').length,twin:manifest.entries.filter(e=>e.kind==='twin').length});
