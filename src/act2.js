// Act 2 · 다시 심는 씨앗 (docs/STAGE-2-AND-PVP-DIRECTION.md). First slice, 2026-09-16:
// unlocked by a first Austin victory, its own save and local records, the night stadium and four minions.
// The run's region is the act marker: 'stadium' is act 2, so saves and every room rule already carry it.
// Pure data only (no THREE, no DOM) so tests and main.js share the rules.
export const ACT2_REGION='stadium';
export const ACT2_NAME='2막 · 다시 심는 씨앗';
export const isAct2=region=>region===ACT2_REGION;
export const actOf=region=>isAct2(region)?2:1;
export const act2Unlocked=profile=>Array.isArray(profile?.bosses)&&profile.bosses.includes('austin');

const wall=(x,z,w,d,h=1.4)=>({x,z,w,d,h});
// Rooms 1-4 teach one new minion rule each and then mix them; room 5 holds the gate.
// The act-2 wardens A/B/C are the next slice; until then the familiar warden stands in (said so in the hint).
export const STADIUM_ROOMS=Object.freeze([
 Object.freeze({name:'연습 구장',hint:'투수 앞의 흰 선이 차오르면 옆으로 비키세요',covers:[wall(-4,1,2.2,1),wall(4,1,2.2,1)],enemies:[['pitcher',-5,-5],['pitcher',5,-5],['runner',0,-4]]}),
 Object.freeze({name:'불펜 통로',hint:'포수는 앞만 막고 맞은 탄을 되던집니다 · 옆이나 뒤로 돌아가세요',covers:[wall(-3.4,-.5,1,3.6),wall(3.4,-.5,1,3.6)],enemies:[['catcher',0,-3],['pitcher',0,-6],['runner',-6,-2],['runner',6,-2]]}),
 Object.freeze({name:'다이아몬드',hint:'주자는 바닥의 베이스로 전력 질주합니다 · 표시에서 벗어나고, 멈춘 주자를 노리세요',covers:[wall(0,.2,1.4,1.4)],enemies:[['runner',-4.4,-3],['runner',4.4,-3],['batter',0,-5],['pitcher',0,-6.2]]}),
 Object.freeze({name:'야간 조명 아래',hint:'타자는 날아오는 탄을 되받아칩니다 · 관통하거나 진화 공격으로 상대하세요',covers:[wall(-5,0,3,.9),wall(5,0,3,.9)],enemies:[['batter',-4,-4],['batter',4,-4],['catcher',0,-2.4],['pitcher',-6.5,-6],['pitcher',6.5,-6]]}),
 Object.freeze({name:'경기장의 문지기',hint:'2막 전용 문지기는 준비 중이에요 · 지금은 기억의 문지기가 대신 지킵니다',covers:[wall(-5,1,2,1),wall(5,1,2,1)],enemies:[['warden',0,-3]]})
]);

// Act 2 keeps its checkpoint and local board apart from act 1 (names, discoveries, titles and settings are shared).
export const ACT2_STORAGE_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act2-v1','seed-ranking-v2':'seed-ranking-act2-v1'});
export function actStorage(storage,act=1){
 if(act!==2||!storage)return storage;
 const key=k=>ACT2_STORAGE_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
