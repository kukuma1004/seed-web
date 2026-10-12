// Small presentation/encounter adapter. Adventure owns damage, HP, reward IDs,
// collision and saves; importing this module never loads the Duel combat roster.
// Shipping alpha-audited 8-pose sheets from duel-motion-art-fixture.json.
const freezeList = list => Object.freeze(list.map(item => Array.isArray(item) ? Object.freeze(item) : item));
const PPU = 512 / 3.8;
function sheet(poses) {
  return Object.freeze(poses.map(([x,y,w,h],i) => Object.freeze({
    file:0,
    src:Object.freeze([i%4*512+x,Math.floor(i/4)*512+y,w,h]),
    // Match seed-duel-view.js FUSION_POSES, including its .04 ground offset.
    // This is the audited crop-floor baseline, not a new anatomical boot claim.
    foot:Object.freeze([w/2,h-.04*PPU]),
    dst:Object.freeze([-w/(2*PPU),-h/PPU+.04,w/PPU,h/PPU]),
  })));
}
function guardian(def,poses) {
  return Object.freeze({...def,
    name:`${def.legacyName} · ${def.subtitle}`,
    files:Object.freeze([`duel/${def.fighterId}-motion-v1.webp`]),
    width:2048,height:1024,pixelsPerUnit:PPU,displayScale:1.25,
    frames:sheet(poses),patterns:freezeList(def.patterns),
    combo:Object.freeze(def.combo),tellSeconds:Object.freeze(def.tellSeconds),
    recovery:Object.freeze({normal:1,enraged:.72,follow:.08}),
  });
}
export const ADVENTURE_DUEL_GUARDIANS = Object.freeze({
  austin:guardian({bossId:'austin',legacyName:'오스틴',fighterId:'collapse',subtitle:'대붕괴의 수호자',ink:'#d7a0fa',
    opening:'돌의 무게를 모으는 동안, 내 옆으로 걸어와 봐.',
    patterns:['charge','slam','punches','triple'],combo:{slam:'punches'},
    tellSeconds:{charge:.72,slam:.85,punches:.62,triple:.62},
    identity:'압축하는 몸짓 → 고정 낙점 내려찍기 → 짧은 다섯 갈래 씨앗. 돌진 중 옆으로 빠지고 내려찍은 뒤 가까이 들어간다.',
    projectileStyle:'heavy-seed',
  },[[120,128,272,312],[56,136,399,304],[106,136,299,304],[46,157,420,283],[85,146,341,294],[82,134,348,306],[108,125,295,315],[83,139,345,301]]),
  alwaysbeginner:guardian({bossId:'alwaysbeginner',legacyName:'항상초심',fighterId:'frostbloom',subtitle:'서리꽃 수호자',ink:'#b9dedd',
    opening:'꽃은 한 자리에서 피어. 넌 그 사이 길을 찾아 줘.',
    // Existing Adventure shot/swing/ring kinds, not a second frost debuff engine.
    // Replace duplicate swing with the familiar fixed slam: reads as one planted
    // bloom, then flowers opening outwards. All contact rules remain Adventure's.
    patterns:['pitch','slam','rain','curve','swing'],combo:{slam:'pitch',curve:'swing'},
    tellSeconds:{pitch:.6,slam:.9,rain:.95,curve:.75,swing:.7},
    identity:'한 낙점에 꽃 심기 → 바깥으로 꽃씨 고리 → 휘는 세 잎. 고정된 낙점과 고리의 빈틈을 번갈아 읽는다.',
    projectileStyle:'frost-petal',
  },[[78,132,355,308],[38,143,436,297],[94,103,324,337],[49,150,413,290],[100,83,311,357],[59,152,393,288],[92,163,328,277],[77,119,358,321]]),
  tempestcarrier:guardian({bossId:'tempestcarrier',legacyName:'요한',fighterId:'stormcrown',subtitle:'폭풍 왕관',ink:'#f9dfa3',
    opening:'왕관 사이에도 네가 걸어올 길은 남겨 둘게.',
    patterns:['strikes','beam','spiral','chase','slam'],combo:{beam:'strikes',chase:'spiral'},
    tellSeconds:{strikes:.95,beam:.9,spiral:.9,chase:.5,slam:.85},
    identity:'고정 번개 낙점 → 왕관 쓸기 광선 → 어긋난 두 꽃씨 고리. 광선 방향을 넘고 연속 낙뢰 중 멈추지 않는다.',
    projectileStyle:'star-seed',
  },[[101,108,309,332],[52,136,408,304],[57,123,397,317],[37,131,437,309],[95,85,321,355],[82,133,347,307],[91,124,329,316],[77,153,358,287]]),
});

export function getAdventureGuardian(bossId) {
  return Object.hasOwn(ADVENTURE_DUEL_GUARDIANS,bossId) ? ADVENTURE_DUEL_GUARDIANS[bossId] : null;
}
export function adventureGuardianFrame(bossId,frame=0) {
  const guardian=getAdventureGuardian(bossId);
  return guardian?.frames[Number.isInteger(frame)&&frame>=0&&frame<8?frame:0] ?? null;
}

// visual is a local view-owned record: {lastKind,attackAge}. Detect tell ending
// in the view, retain its kind there, then advance age only while game plays.
// Never infer a new attack from wall clock, damage flash or global animation.
export function adventureGuardianMotionFrame(entity,visual) {
  if(!entity||!getAdventureGuardian(entity.bossId))return 0;
  if(entity.flash>0)return 7;
  if(entity.tell>0)return 4;
  if(entity.charging>0)return entity.charging>.3?1:3;
  if(entity.beam)return 5;
  const age=visual?.attackAge;
  if(Number.isFinite(age)&&age>=0&&age<.32){
    const kind=visual.lastKind;
    if(kind==='slam'||kind==='strikes'||kind==='chase')return 5;
    if(kind==='rain'||kind==='spiral')return 3;
    if(kind==='punches'||kind==='curve')return age<.1?1:age<.21?2:3;
    if(kind==='pitch')return 2;
    if(kind==='swing')return 3;
  }
  // Braced settling pose only; it confers no shield or block in Adventure.
  if(Number.isFinite(age)&&age>=.32&&age<.5&&entity.cd>0)return 6;
  return 0;
}
