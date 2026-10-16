// Act 3: a forward-scrolling sky route inspired by classic vertical shooters.
export const ACT3_REGION='skyway';
export const ACT3_GRAMMAR='A';
export const ACT3_NAME='3막 · 폭풍의 항로';
export const ACT3_RELEASED=true;
export const isAct3=region=>region===ACT3_REGION;
// The beta lets players test this route without first clearing acts 1 and 2.
export const act3Unlocked=()=>true;
export function act3Available(where=globalThis.location){return ACT3_RELEASED||['localhost','127.0.0.1'].includes(where?.hostname);}
export function playableAct3Region(region,where=globalThis.location,preview=false){return isAct3(region)&&!act3Available(where)&&!preview?'garden':region;}

export const ACT3_PRESSURE=Object.freeze({
 hp:1.22,speed:1.17,projectile:1.22,bossTempo:1.14,
 crowdInitial:11,crowdInterval:.64,crowdExtra:Object.freeze([0,3,7,11,0]),
 projectileCapLow:38,projectileCapNormal:48
});

// Teach a close pass and its escape window before combining flankers with fans.
// Later rooms restore density without changing the 14-actor ceiling.
export const ACT3_ROOM_PRESSURE=Object.freeze([
 Object.freeze({crowdInitial:6,crowdInterval:.93,crowdExtra:0,projectile:1.08,projectileCapLow:24,projectileCapNormal:32}),
 Object.freeze({crowdInitial:8,crowdInterval:.78,crowdExtra:3,projectile:1.12,projectileCapLow:32,projectileCapNormal:40}),
 Object.freeze({crowdInitial:10,crowdInterval:.70,crowdExtra:7,projectile:1.16,projectileCapLow:30,projectileCapNormal:38}),
 Object.freeze({crowdInitial:11,crowdInterval:.64,crowdExtra:11,projectile:1.16,projectileCapLow:34,projectileCapNormal:44}),
 Object.freeze({crowdInitial:0,crowdInterval:.64,crowdExtra:0,projectile:ACT3_PRESSURE.projectile,projectileCapLow:36,projectileCapNormal:48})
]);
export const act3RoomPressure=stage=>ACT3_ROOM_PRESSURE[Math.max(0,Math.min(4,stage|0))];

// Each formation has a fragile committed threat to intercept, plus scouts that
// cross the front of the player. Later groups combine that pass with a bomber.
export function act3CrowdType(index,stage=0){
 const slot=(index+stage*3)%12;
 if(slot===2||slot===9||stage>=2&&slot===6)return 'sky-diver';
 if(stage>0&&(slot===4||stage>=2&&slot===10))return 'sky-bomber';
 if(stage>=2&&slot===7)return 'sky-carrier';
 return 'sky-scout';
}
export function act3ReinforcementSpawn(index){
 // Alternate a readable bow formation with an open-centre flank group. Side
 // entries stay away from the player's starting lane and have an entry pause.
 const lanes=[-6.6,-4.5,-1.8,0,1.8,4.5,6.6];
 const slot=index%lanes.length,flank=Math.floor(index/lanes.length)%2;
 const sides=[[-6.6,-3.3],[-6.2,-1.3],[-6.6,1.1],[0,-6.3],[6.6,1.1],[6.2,-1.3],[6.6,-3.3]];
 return Object.freeze(flank?{x:sides[slot][0],z:sides[slot][1]}:{x:lanes[slot],z:-6.3+Math.abs(lanes[slot])*.13});
}

// Preserve the authored near/side formations. A late arrival never appears
// directly on the player; its existing entry pause still precedes an attack.
export function act3EntryPoint(x,z,player,roamingArena=null){
 if(roamingArena){
  const mx=roamingArena.halfWidth-.8,mz=roamingArena.halfDepth-.8,clamp=(n,limit)=>Math.max(-limit,Math.min(limit,n));
  let px=Number.isFinite(x)?x:0,pz=Number.isFinite(z)?z:-6.15;
  if(Number.isFinite(player?.x)&&Number.isFinite(player?.z)){
   // Keep the authored opening; late entries follow exploration rather than
   // leaving every reinforcement at the centre of the enlarged route.
   if(Math.abs(player.x)>8||Math.abs(player.z)>6.5){px+=player.x;pz+=player.z;}
   px=clamp(px,mx);pz=clamp(pz,mz);
   if(Math.hypot(px-player.x,pz-player.z)<3.4){
    let best=Infinity,bx=px,bz=pz;
    for(let i=0;i<8;i++){const angle=i*Math.PI/4,sx=clamp(player.x+Math.cos(angle)*6.5,mx),sz=clamp(player.z+Math.sin(angle)*6.5,mz);if(Math.hypot(sx-player.x,sz-player.z)<3.4)continue;const d=(sx-px)**2+(sz-pz)**2;if(d<best){best=d;bx=sx;bz=sz;}}
    px=bx;pz=bz;
   }
  }
  return {x:clamp(px,mx),z:clamp(pz,mz)};
 }
 const p={x:Math.max(-8,Math.min(8,Number.isFinite(x)?x:0)),z:Math.max(-6.15,Math.min(5.7,Number.isFinite(z)?z:-6.15))};
 if(!Number.isFinite(player?.x)||!Number.isFinite(player?.z)||Math.hypot(p.x-player.x,p.z-player.z)>=3.4)return p;
 let nearest=null,best=Infinity;
 for(const [sx,sz] of [[-8,-6.15],[0,-6.15],[8,-6.15],[-8,0],[8,0],[-7.6,5.7],[7.6,5.7]]){
  if(Math.hypot(sx-player.x,sz-player.z)<3.4)continue;const d=(sx-p.x)**2+(sz-p.z)**2;if(d<best){best=d;nearest={x:sx,z:sz};}
 }
 return nearest||p;
}

// Two supply windows, one in each late formation room. The player must bring
// down a carrier; the item goes straight to the capped run bag and cannot be
// farmed by leaving and re-entering a cleared room.
export function act3SupplyDrop(type,stage,claimed,inventory){
 return type==='sky-carrier'&&(stage===2||stage===3)&&!claimed&&(inventory?.tonic||0)<5?'tonic':null;
}

export const SKYWAY_ROOMS=Object.freeze([
 Object.freeze({name:'상승 기류',hint:'밝은 항로로 회피 · 초록 고리 반격 피해 +35%',covers:[],enemies:[['sky-scout',-4.8,-3.9],['sky-scout',-2.5,-4.8],['sky-diver',0,-5.7],['sky-scout',2.5,-4.8],['sky-scout',4.8,-3.9]]}),
 Object.freeze({name:'구름 협곡',hint:'양옆 편대 접근 → 중앙으로 회피!',covers:[],enemies:[['sky-scout',-7,-1.8],['sky-scout',-3.6,-5.8],['sky-bomber',0,-6.5],['sky-scout',7,-1.8],['sky-diver',4.6,-5.4]]}),
 Object.freeze({name:'뇌운 회랑',hint:'돌격 회피 → 폭격 직후 전진!',covers:[],enemies:[['sky-bomber',-5,-5.4],['sky-scout',-7,-1],['sky-diver',0,-6.5],['sky-scout',7,-1],['sky-bomber',5,-5.4]]}),
 Object.freeze({name:'공중 함대',hint:'돌격기 먼저! · 모함 포격 직후 접근해 보급',covers:[],enemies:[['sky-carrier',0,-6.4],['sky-scout',-7,-1.4],['sky-bomber',-3.4,-4.6],['sky-scout',3.4,-4.6],['sky-scout',7,-1.4],['sky-diver',0,-3.6]]}),
 Object.freeze({name:'폭풍 관문',hint:'측면 호위 처치 → 문지기를 피할 틈 확보!',covers:[],enemies:[['act3warden',0,-5.2],['sky-scout',-7,-1.8],['sky-scout',-3.3,-4.8],['sky-scout',3.3,-4.8],['sky-scout',7,-1.8]]})
]);
export const ACT3_ROOM_HINTS=Object.freeze(SKYWAY_ROOMS.map(room=>room.hint));

export const ACT3_ARENA=Object.freeze({
 shape:'poly',id:'skyway',halfWidth:15,halfDepth:13,
 points:Object.freeze([[-15,13],[15,13],[15,-13],[-15,-13]].map(Object.freeze)),
 start:Object.freeze({x:0,z:5.5}),exit:Object.freeze({x:0,z:-6.8,radius:1.7}),
 spawns:Object.freeze([[-7.8,-6.8],[0,-7.1],[7.8,-6.8],[-8,0],[8,0],[-7.6,5.7],[7.6,5.7]].map(([x,z])=>Object.freeze({x,z})))
});

export const ACT3_STORAGE_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act3-v1','seed-ranking-v2':'seed-ranking-act3-v1'});
export function act3Storage(storage){
 if(!storage)return storage;const key=k=>ACT3_STORAGE_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
