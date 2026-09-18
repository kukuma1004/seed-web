// Act 2 · 다시 심는 씨앗 (docs/STAGE-2-AND-PVP-DIRECTION.md). First slice, 2026-09-16:
// unlocked by a first Austin victory, its own save and local records, the night stadium and four minions.
// The run's region is the act marker: 'stadium' is act 2, so saves and every room rule already carry it.
// Pure data only (no THREE, no DOM) so tests and main.js share the rules.
export const ACT2_REGION='stadium';
export const ACT2_NAME='2막 · 다시 심는 씨앗';
export const isAct2=region=>region===ACT2_REGION;
export const actOf=region=>isAct2(region)?2:1;
export const act2Unlocked=profile=>Array.isArray(profile?.bosses)&&profile.bosses.includes('austin');
// Not released yet (2026-09-16, user decision): act 2 only appears on a local development server.
// Flip ACT2_RELEASED to true when the user says act 2 may go public.
export const ACT2_RELEASED=false;
export function act2Available(where=globalThis.location){return ACT2_RELEASED||['localhost','127.0.0.1'].includes(where?.hostname);}
// Public builds always send an act-2 URL or stale checkpoint back to act 1.
export function playableRegion(region,where=globalThis.location){return isAct2(region)&&!act2Available(where)?'garden':region;}

const wall=(x,z,w,d,h=1.4)=>({x,z,w,d,h});
// Rooms 1-4 teach one new minion rule each and then mix them; room 5 holds the act-2 guardian.
export const STADIUM_ROOMS=Object.freeze([
 Object.freeze({name:'연습 구장',hint:'빛나는 베이스를 밟으면 다음 베이스까지 미끄러집니다 · 투구선을 건너지 않게 방향을 고르세요',covers:[wall(-4,1,2.2,1),wall(4,1,2.2,1)],enemies:[['pitcher',-5,-5],['pitcher',5,-5],['runner',0,-4]]}),
 Object.freeze({name:'불펜 통로',hint:'가운데 패스 포탑과 반대편 포수가 공을 주고받습니다 · 흰 선을 보고 베이스 활주로 가로지르세요',covers:[wall(-3.4,-.5,1,3.6),wall(3.4,-.5,1,3.6),wall(0,0,1.35,1.35)],enemies:[['catcher',0,-3],['pitcher',0,-6],['runner',-6,-2],['runner',6,-2]]}),
 Object.freeze({name:'다이아몬드',hint:'주자는 바닥의 베이스로 전력 질주합니다 · 표시에서 벗어나고, 멈춘 주자를 노리세요',covers:[wall(0,.2,1.4,1.4)],enemies:[['runner',-4.4,-3],['runner',4.4,-3],['batter',0,-5],['pitcher',0,-6.2]]}),
 Object.freeze({name:'야간 조명 아래',hint:'타자와 패스 포탑이 함께 압박합니다 · 베이스 활주를 쓰되 돌아오는 공의 길에 멈추지 마세요',covers:[wall(-5,0,3,.9),wall(5,0,3,.9),wall(0,0,1.35,1.35)],enemies:[['batter',-4,-4],['batter',4,-4],['catcher',0,-2.4],['pitcher',-6.5,-6],['pitcher',6.5,-6]]}),
 Object.freeze({name:'경기장의 문지기',hint:'투구선·베이스·부채꼴을 읽고 문지기의 빈틈을 노리세요',covers:[wall(-5,1,2,1),wall(5,1,2,1)],enemies:[['act2warden',0,-3]]})
]);

// Act 2 keeps its checkpoint and local board apart from act 1 (names, discoveries, titles and settings are shared).
export const ACT2_STORAGE_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act2-v1','seed-ranking-v2':'seed-ranking-act2-v1'});
export function actStorage(storage,act=1){
 if(act!==2||!storage)return storage;
 const key=k=>ACT2_STORAGE_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
