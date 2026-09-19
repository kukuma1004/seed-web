// Act 3 prototype: a forward-scrolling sky route inspired by classic vertical shooters.
// The first slice is local/admin-only until its controls, readability and mobile budget pass.
export const ACT3_REGION='skyway';
export const ACT3_GRAMMAR='A';
export const ACT3_NAME='3막 · 폭풍의 항로';
export const ACT3_RELEASED=false;
export const isAct3=region=>region===ACT3_REGION;
export const act3Unlocked=profile=>Array.isArray(profile?.bosses)&&profile.bosses.includes('alwaysbeginner');
export function act3Available(where=globalThis.location){return ACT3_RELEASED||['localhost','127.0.0.1'].includes(where?.hostname);}
export function playableAct3Region(region,where=globalThis.location){return isAct3(region)&&!act3Available(where)?'garden':region;}

export const ACT3_PRESSURE=Object.freeze({
 hp:1.22,speed:1.14,projectile:1.18,bossTempo:1.1,
 crowdInitial:8,crowdInterval:.84,crowdExtra:Object.freeze([2,3,4,5,0])
});

export const SKYWAY_ROOMS=Object.freeze([
 Object.freeze({name:'상승 기류',hint:'V자 편대의 가운데를 비우고 날개 끝부터 끊으세요',covers:[],enemies:[['sky-scout',-4.8,-4.8],['sky-scout',0,-6.1],['sky-scout',4.8,-4.8]]}),
 Object.freeze({name:'구름 협곡',hint:'돌격기의 짧은 섬광을 본 뒤 옆으로 빠지고 폭격탄 사이를 지나세요',covers:[],enemies:[['sky-diver',-4.5,-4.8],['sky-bomber',0,-6.2],['sky-diver',4.5,-4.8]]}),
 Object.freeze({name:'뇌운 회랑',hint:'속도가 다른 탄은 한 번에 피하지 말고 두 번에 나누어 가르세요',covers:[],enemies:[['sky-bomber',-4.2,-5.6],['sky-bomber',4.2,-5.6],['sky-scout',0,-3.8]]}),
 Object.freeze({name:'공중 함대',hint:'뒤에서 탄을 뿌리는 모함을 먼저 노릴지 돌격 편대를 먼저 끊을지 정하세요',covers:[],enemies:[['sky-carrier',0,-6.1],['sky-diver',-5.8,-3.8],['sky-diver',5.8,-3.8],['sky-scout',0,-2.5]]}),
 Object.freeze({name:'폭풍 관문',hint:'편대 문지기의 날개가 접히면 돌진, 펼쳐지면 교차 사격입니다',covers:[],enemies:[['act3warden',0,-4.7],['sky-scout',-5.7,-5.6],['sky-scout',5.7,-5.6]]})
]);

export const ACT3_ARENA=Object.freeze({
 shape:'poly',id:'skyway',
 points:Object.freeze([[-9.3,7.6],[9.3,7.6],[9.3,-8.4],[-9.3,-8.4]].map(Object.freeze)),
 start:Object.freeze({x:0,z:5.5}),exit:Object.freeze({x:0,z:-6.8,radius:1.7}),
 spawns:Object.freeze([[-7.8,-6.8],[0,-7.1],[7.8,-6.8],[-8,0],[8,0],[-7.6,5.7],[7.6,5.7]].map(([x,z])=>Object.freeze({x,z})))
});

const ACT3_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act3-v1','seed-ranking-v2':'seed-ranking-act3-v1'});
export function act3Storage(storage){
 if(!storage)return storage;const key=k=>ACT3_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
