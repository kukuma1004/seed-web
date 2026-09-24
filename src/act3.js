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
 projectileCapLow:48,projectileCapNormal:64
});

// The opening teaches aimed shots before adding the bombers' warned fan.
// Later rooms restore density without changing the 14-actor ceiling.
export const ACT3_ROOM_PRESSURE=Object.freeze([
 Object.freeze({crowdInitial:6,crowdInterval:.93,crowdExtra:0,projectile:1.08,projectileCapLow:24,projectileCapNormal:32}),
 Object.freeze({crowdInitial:8,crowdInterval:.78,crowdExtra:3,projectile:1.12,projectileCapLow:32,projectileCapNormal:40}),
 Object.freeze({crowdInitial:10,crowdInterval:.70,crowdExtra:7,projectile:1.16,projectileCapLow:40,projectileCapNormal:52}),
 Object.freeze({crowdInitial:11,crowdInterval:.64,crowdExtra:11,projectile:1.16,projectileCapLow:48,projectileCapNormal:64}),
 Object.freeze({crowdInitial:0,crowdInterval:.64,crowdExtra:0,projectile:ACT3_PRESSURE.projectile,projectileCapLow:48,projectileCapNormal:64})
]);
export const act3RoomPressure=stage=>ACT3_ROOM_PRESSURE[Math.max(0,Math.min(4,stage|0))];

// The sky route is a shooter stage first. Only one slot in twelve is a charger;
// the rest keep pressure on the player with aimed fire and overlapping lanes.
export function act3CrowdType(index,stage=0){
 const slot=(index+stage*3)%12;
 if(slot===9)return 'sky-diver';
 if(stage>0&&(slot===4||stage>=2&&slot===10))return 'sky-bomber';
 if(stage>=2&&slot===7)return 'sky-carrier';
 return 'sky-scout';
}
export function act3ReinforcementSpawn(index){
 // The middle three briefly form a cluster that split builds can cut apart;
 // outer lanes stay open so chain and single-target builds still have routes.
 const lanes=[-7.6,-5.1,-1.8,0,1.8,5.1,7.6];
 return Object.freeze({x:lanes[index%lanes.length],z:-7.2+(Math.floor(index/lanes.length)%2)*.9});
}

// Two supply windows, one in each late formation room. The player must bring
// down a carrier; the item goes straight to the capped run bag and cannot be
// farmed by leaving and re-entering a cleared room.
export function act3SupplyDrop(type,stage,claimed,inventory){
 return type==='sky-carrier'&&(stage===2||stage===3)&&!claimed&&(inventory?.tonic||0)<5?'tonic':null;
}

export const SKYWAY_ROOMS=Object.freeze([
 Object.freeze({name:'상승 기류',hint:'전진하는 V자 편대의 날개 끝부터 끊고 중앙 탄선을 가르세요',covers:[],enemies:[['sky-scout',-5.6,-4.4],['sky-scout',-2.8,-5.3],['sky-scout',0,-6.2],['sky-scout',2.8,-5.3],['sky-scout',5.6,-4.4]]}),
 Object.freeze({name:'구름 협곡',hint:'폭격탄 사이를 옮겨 다니고 붉은 돌격기만 짧게 크게 피하세요',covers:[],enemies:[['sky-scout',-6,-5],['sky-scout',-2.5,-5.8],['sky-bomber',0,-6.5],['sky-scout',2.5,-5.8],['sky-diver',6,-5]]}),
 Object.freeze({name:'뇌운 회랑',hint:'빠른 탄을 먼저 넘고 느린 탄의 빈 줄로 두 번 나누어 이동하세요',covers:[],enemies:[['sky-bomber',-5,-6],['sky-scout',-2.5,-4.6],['sky-scout',0,-6.5],['sky-scout',2.5,-4.6],['sky-bomber',5,-6]]}),
 Object.freeze({name:'공중 함대',hint:'모함의 넓은 탄막을 읽으며 작은 편대부터 잘라 안전한 항로를 만드세요',covers:[],enemies:[['sky-carrier',0,-6.4],['sky-scout',-5.8,-5.4],['sky-bomber',-2.8,-4.6],['sky-scout',2.8,-4.6],['sky-scout',5.8,-5.4],['sky-diver',0,-3.6]]}),
 Object.freeze({name:'폭풍 관문',hint:'문지기의 교차 탄막을 따라 이동하며 양쪽 호위 편대를 먼저 끊으세요',covers:[],enemies:[['act3warden',0,-5.2],['sky-scout',-6,-6],['sky-scout',-3.3,-4.8],['sky-scout',3.3,-4.8],['sky-scout',6,-6]]})
]);

export const ACT3_ARENA=Object.freeze({
 shape:'poly',id:'skyway',
 points:Object.freeze([[-9.3,7.6],[9.3,7.6],[9.3,-8.4],[-9.3,-8.4]].map(Object.freeze)),
 start:Object.freeze({x:0,z:5.5}),exit:Object.freeze({x:0,z:-6.8,radius:1.7}),
 spawns:Object.freeze([[-7.8,-6.8],[0,-7.1],[7.8,-6.8],[-8,0],[8,0],[-7.6,5.7],[7.6,5.7]].map(([x,z])=>Object.freeze({x,z})))
});

export const ACT3_STORAGE_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act3-v1','seed-ranking-v2':'seed-ranking-act3-v1'});
export function act3Storage(storage){
 if(!storage)return storage;const key=k=>ACT3_STORAGE_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
