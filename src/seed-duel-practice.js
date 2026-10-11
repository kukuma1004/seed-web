// Practice instructions describe real combat prerequisites. They never create
// shots, marks, hit receipts or charged state, and never grant unlocks.
import {DUEL_BATCH34,batch34CanAction} from './seed-duel-batch34.js';
import {DUEL_BATCH35,batch35CanAction} from './seed-duel-batch35.js';
import {DUEL_BATCH36,batch36CanAction} from './seed-duel-batch36.js';
import {DUEL_BATCH37,batch37CanAction} from './seed-duel-batch37.js';
import {DUEL_BATCH38,batch38CanAction} from './seed-duel-batch38.js';
import {DUEL_BATCH39,batch39CanAction} from './seed-duel-batch39.js';
import {DUEL_BATCH40,batch40CanAction} from './seed-duel-batch40.js';
import {DUEL_BATCH41,batch41CanAction} from './seed-duel-batch41.js';
import {DUEL_BATCH42,batch42CanAction} from './seed-duel-batch42.js';
import {DUEL_BATCH43,batch43CanAction} from './seed-duel-batch43.js';
import {DUEL_BATCH44,batch44CanAction} from './seed-duel-batch44.js';
import {DUEL_BATCH45,batch45CanAction} from './seed-duel-batch45.js';
import {DUEL_BATCH46,batch46CanAction} from './seed-duel-batch46.js';
import {DUEL_BATCH47,batch47CanAction} from './seed-duel-batch47.js';
import {DUEL_BATCH48,batch48CanAction} from './seed-duel-batch48.js';
import {DUEL_BATCH49,batch49CanAction} from './seed-duel-batch49.js';

const predicates=new Map();
for(const [actors,can] of [[DUEL_BATCH34,batch34CanAction],[DUEL_BATCH35,batch35CanAction],[DUEL_BATCH36,batch36CanAction],[DUEL_BATCH37,batch37CanAction],[DUEL_BATCH38,batch38CanAction],[DUEL_BATCH39,batch39CanAction],[DUEL_BATCH40,batch40CanAction],[DUEL_BATCH41,batch41CanAction],[DUEL_BATCH42,batch42CanAction],[DUEL_BATCH43,batch43CanAction],[DUEL_BATCH44,batch44CanAction],[DUEL_BATCH45,batch45CanAction],[DUEL_BATCH46,batch46CanAction],[DUEL_BATCH47,batch47CanAction],[DUEL_BATCH48,batch48CanAction],[DUEL_BATCH49,batch49CanAction]])for(const id of Object.keys(actors))predicates.set(id,can);
const plan=(cue,{wall=false,miss=false}={})=>Object.freeze({cue,wall,miss,keys:Object.freeze(['공격+회피',miss?'빗겨 보내기':'설명대로 준비','방어+회피'])});
export const DUEL_SECOND_SKILL_PLANS=Object.freeze({
 'final-frostkaleidoscope-reflect':plan('왼쪽 방향을 누른 채 기술1(공격+회피)을 보내세요. 방향 입력이 없으면 상대를 자동 조준해요. 벽에 반사해 남은 도장이 사라지기 전에 기술2를 쓰세요.',{wall:true}),
 'final-frostkaleidoscope-frost':plan('기술1을 상대에게 맞혀 결정 껍질을 만드세요. 껍질이 남아 있을 때 기술2를 쓰세요.'),
 'final-echolane-reflect':plan('왼쪽 방향을 누른 채 기술1(공격+회피)을 보내세요. 방향 입력이 없으면 상대를 자동 조준해요. 벽을 튕긴 탄이 아직 나가는 동안 기술2를 쓰세요.',{wall:true}),
 'final-echolane-recall':plan('기술1을 보내고 기다리세요. 탄이 기록한 길로 돌아오는 동안 기술2를 쓰세요.'),
 'final-gravitystake-pierce':plan('기술1을 상대에게 맞히세요. 맞힌 창이 살아 있을 때 기술2를 쓰세요.'),
 'final-gravitystake-gravity':plan('기술1을 상대에게 맞힌 뒤 길목이 완성되기를 기다리세요. 완성된 길목이 남아 있을 때 기술2를 쓰세요.'),
 'final-icicle-pierce':plan('기술1을 직접 맞혀 상대에게 냉기를 남기세요. 냉기가 사라지기 전에 기술2를 쓰세요.'),
 'final-icicle-frost':plan('기술1의 얼음길을 상대에게 닿게 하세요. 상대가 길에서 냉기를 얻으면 길이 남아 있을 때 기술2를 쓰세요.'),
 'final-pierceshower-pierce':plan('기술1의 창을 상대에게 맞히세요. 맞힌 창이 남아 있는 동안 기술2를 쓰세요.'),
 'final-pierceshower-split':plan('기술1의 부채꼴 파편을 상대에게 맞히세요. 실제 맞힌 파편이 남아 있는 동안 기술2를 쓰세요.'),
 'final-thunderlance-chain':plan('기술1을 상대에게 맞혀 실제 접점을 남기세요. 접점이 살아 있을 때 기술2를 쓰세요.'),
 'final-returnblade-pierce':plan('기술1을 상대에게 맞히세요. 출격 창이 남아 있는 동안 기술2를 쓰세요.'),
 'final-pullgarden-gravity':plan('기술1의 바깥으로 나가는 파편을 상대에게 맞히세요. 맞힌 파편이 남아 있을 때 기술2를 쓰세요.'),
 'final-pullgarden-split':plan('기술1의 우물에 상대를 넣어 실제로 끌어당기세요. 우물이 남아 있을 때 기술2를 쓰세요.'),
 'final-coldwell-gravity':plan('기술1의 우물 안에서 상대가 냉기를 얻도록 하세요. 냉기와 원래 우물이 남아 있을 때 기술2를 쓰세요.'),
 'final-coldwell-frost':plan('기술1의 우물 안에서 상대가 냉기를 얻도록 하세요. 냉기와 원래 우물이 남아 있을 때 기술2를 쓰세요.'),
 'final-stormanchor-gravity':plan('기술1을 상대에게 맞혀 닻을 남기세요. 닻이 사라지기 전에 기술2를 쓰세요.'),
 'final-stormanchor-chain':plan('기술1을 상대에게 맞혀 우물을 만드세요. 실제 접점과 우물이 남아 있을 때 기술2를 쓰세요.'),
 'final-frostnet-chain':plan('기술1을 맞혀 마지막 결정을 남기세요. 마지막 결정이 살아 있을 때 기술2를 쓰세요.'),
 'final-frostnet-frost':plan('기술1을 상대에게 맞히세요. 지연 표식이 생기면 짧은 준비 시간이 끝나기 전에 기술2를 쓰세요.'),
 'final-lightningpetal-chain':plan('기술1의 탄을 상대에게 실제로 맞히세요. 원래 접점이 남아 있을 때 기술2를 쓰세요.'),
 'final-lightningpetal-split':plan('기술1의 파편을 상대에게 실제로 맞히세요. 원래 접점이 남아 있을 때 기술2를 쓰세요.'),
 'final-rewindbolt-chain':plan('기술1을 상대에게 맞히고 탄이 상대 뒤로 더 나가기를 기다리세요. 탄이 돌아오기 전에 기술2를 쓰세요.'),
 'final-rewindbolt-recall':plan('오른쪽+위 또는 오른쪽+아래 방향을 누른 채 기술1(공격+회피)을 사선으로 보내세요. 방향 입력이 없으면 상대를 자동 조준해요. 출격 때 상대를 빗겨 보내고, 사용 가능 표시가 뜨면 기술2를 쓰세요.',{miss:true}),
 'final-rimepetal-frost':plan('기술1을 상대에게 맞혀 정원을 키우세요. 원래 정원이 남아 있을 때 기술2를 쓰세요.'),
 'final-rimepetal-split':plan('기술1을 상대에게 맞혀 충돌 기억을 남기세요. 기억이 사라지기 전에 기술2를 쓰세요.'),
 'final-rimeback-frost':plan('기술1을 상대에게 맞히고 탄이 상대 뒤로 더 나가기를 기다리세요. 원래 탄이 살아 있을 때 기술2를 쓰세요.'),
 'final-rimeback-recall':plan('기술1을 상대에게 맞히고 탄이 상대 뒤로 더 나가기를 기다리세요. 원래 탄이 살아 있을 때 기술2를 쓰세요.'),
 'final-returningpetals-split':plan('기술1을 보내세요. 돌아오는 꽃잎이 상대에게 맞고 두 꽃잎 이상이 남아 있을 때 기술2를 쓰세요.'),
 'final-returningpetals-recall':plan('기술1을 보내고 두 꽃잎이 실제로 도착하기를 기다리세요. 자동으로 합쳐지기 전에 기술2를 쓰세요.'),
 'final-tidepull-recall':plan('기술1을 보내세요. 원래 씨앗의 무게가 아직 바깥으로 나가는 동안 기술2를 쓰세요.')
});

// Same authored predicates as the paid combat action. Read-only and bounded;
// caller refreshes only the visible practice label, never an AI decision loop.
export function secondSkillPracticeReady(s){
 const p=s?.fighters?.[0],other=s?.fighters?.[1];
 if(!s?.practice||s.phase!=='fight'||!p||!other||p.hp<=0||other.hp<=0||p.cd[1]>0||p.stun>0||['attack','heavy','skill','dodge'].includes(p.state))return false;
 const can=predicates.get(p.char);
 return can?Boolean(can(s,p,1)):true;
}
