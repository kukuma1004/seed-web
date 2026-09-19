// Act 2 · 다시 심는 씨앗 (docs/STAGE-2-AND-PVP-DIRECTION.md). First slice, 2026-09-16:
// unlocked by a first Austin victory, its own save and local records, the night stadium and four minions.
// The run's region is the act marker: 'stadium' is act 2, so saves and every room rule already carry it.
// Pure data only (no THREE, no DOM) so tests and main.js share the rules.
export const ACT2_REGION='stadium';
export const ACT2_NAME='2막 · 다시 심는 씨앗';
export const isAct2=region=>region===ACT2_REGION;
export const actOf=region=>isAct2(region)?2:1;
export const act2Unlocked=profile=>Array.isArray(profile?.bosses)&&profile.bosses.includes('austin');
// Opened to the closed beta on 2026-09-18. Austin's first defeat remains the
// progression gate, and act 2 keeps a separate checkpoint and local record.
export const ACT2_RELEASED=true;
export function act2Available(where=globalThis.location){return ACT2_RELEASED||['localhost','127.0.0.1'].includes(where?.hostname);}
// A future maintenance switch can still send an unavailable act-2 save back to act 1 safely.
export function playableRegion(region,where=globalThis.location){return isAct2(region)&&!act2Available(where)?'garden':region;}

const wall=(x,z,w,d,h=1.4)=>({x,z,w,d,h});
// Rooms 1-4 teach one new minion rule each and then mix them; room 5 holds the act-2 guardian.
export const STADIUM_ROOMS=Object.freeze([
 Object.freeze({name:'홈플레이트 연습장',hint:'출구 쪽으로 좁아집니다 · 넓은 뒤쪽에서 투구를 흘리고 양옆 통로로 돌아가세요',covers:[wall(-6.15,2.25,2.2,1),wall(6.15,2.25,2.2,1)],enemies:[['pitcher',-3.7,-4.7],['pitcher',3.7,-4.7],['runner',0,-3.6]]}),
 Object.freeze({name:'내야 다이아몬드',hint:'네 모서리를 순환하세요 · 마운드와 홈 사이의 흰 투구선을 베이스 활주로 가로지르세요',covers:[wall(-5.4,0,1,3.2),wall(5.4,0,1,3.2),wall(0,0,1.35,1.35)],enemies:[['catcher',0,-3],['pitcher',0,-6],['runner',-5.7,-1.6],['runner',5.7,-1.6]]}),
 Object.freeze({name:'회전하는 야구공',hint:'둥근 벽과 솔기를 따라 계속 도세요 · 멈춘 주자를 노리고 반대 솔기로 빠져나오세요',covers:[wall(0,.2,1.4,1.4)],enemies:[['runner',-4.4,-3],['runner',4.4,-3],['batter',0,-5],['pitcher',0,-6.2]]}),
 Object.freeze({name:'글러브 포켓',hint:'깊은 포켓은 안전해 보여도 막다른 길입니다 · 손가락 사이 홈을 짧게 쓰고 중앙으로 돌아오세요',covers:[wall(-5.55,2.1,1.5,1),wall(5.55,2.1,1.5,1),wall(0,0,1.35,1.35)],enemies:[['batter',-4,-4],['batter',4,-4],['catcher',0,-2.4],['pitcher',-5.2,-5.7],['pitcher',5.2,-5.7]]}),
 Object.freeze({name:'결전의 야구장',hint:'넓은 외야를 쓰되 부채꼴 끝에 몰리지 마세요 · 문지기와 지원수를 함께 읽어야 합니다',covers:[wall(-6.6,2,2,1),wall(6.6,2,2,1)],enemies:[['act2warden',0,-3]]})
]);

// Act 2 keeps its checkpoint and local board apart from act 1 (names, discoveries, titles and settings are shared).
export const ACT2_STORAGE_KEYS=Object.freeze({'seed-run-checkpoint-v1':'seed-run-checkpoint-act2-v1','seed-ranking-v2':'seed-ranking-act2-v1'});
export function actStorage(storage,act=1){
 if(act!==2||!storage)return storage;
 const key=k=>ACT2_STORAGE_KEYS[k]||k;
 return {getItem:k=>storage.getItem(key(k)),setItem:(k,v)=>storage.setItem(key(k),v),removeItem:k=>storage.removeItem(key(k))};
}
