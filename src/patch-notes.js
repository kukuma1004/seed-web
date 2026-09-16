// 새 소식(패치노트) · 아이들이 읽을 글이라 짧고 쉬운 말로 쓴다.
// 맨 위가 가장 최근. id는 날짜로 두고, 마지막으로 읽은 id를 기억해 새 소식 점을 띄운다.
export const NOTES_KEY='seed-notes-seen-v1';

export const PATCH_NOTES=Object.freeze([
 {
  id:'2026-09-16',date:'9월 16일',title:'나의 정원과 변이',
  lines:[
   '첫 화면이 내 정원이 되었어요. 여정이 끝나면 가장 깊게 키운 법칙의 씨앗이 남아요.',
   '씨앗을 심고 여정을 다녀오면 자랍니다. 다 자라면 꽃·나무·덩굴 중 하나를 골라 다음 여정에 데려가요.',
   '변이가 생겼어요. 정원에서 꽃을 키우면 반사·분열·연쇄가 빠름·룬·폭발로 바뀝니다.',
   '출발 상점이 열렸어요. 문지기 +50원, 오스틴 +200원으로 작은 물약을 사서 들고 갑니다. 처음 오면 100원을 드려요.',
   '고침: 나갔다 이어하면 체력이 다시 차던 문제를 고쳤어요. 이제 나갈 때 체력 그대로 저장됩니다.',
   '회피 진화를 지금은 고르지 않을 수 있어요. 다음 문지기를 잡으면 다시 고를 수 있습니다.',
   '휴대폰에서 글자가 잘리던 것과 전투가 버벅이던 것도 손봤어요.'
  ]
 },
 {
  id:'2026-09-15',date:'9월 15일',title:'각성 진화와 2막',
  lines:[
   '진화끼리 다시 합치는 각성 진화가 생겼어요.',
   '오스틴을 이기면 2막 야간 경기장이 열립니다.',
   '회피에도 진화가 붙어요. 첫 문지기를 이기면 셋 중 하나를 고릅니다.',
   '기기에 맞춰 화질을 자동으로 낮춰 끊김을 줄였어요.'
  ]
 },
 {
  id:'2026-09-14',date:'9월 14일',title:'진짜 보스와 랭킹',
  lines:[
   '문지기를 다섯 번 이기면 진짜 보스 정시파이터 오스틴이 나타나요.',
   '오스틴을 이기면 시간의 물약을 줍니다.',
   '점수와 명예의 전당이 생겼어요. 이름을 적으면 모두의 랭킹에 올라갑니다.',
   '유물과 물약 다섯 가지, 조합 기록(도감)이 추가됐어요.'
  ]
 }
]);

export const latestNoteId=PATCH_NOTES[0]?.id||'';
export function readSeenNote(storage){
 try{const seen=storage?.getItem(NOTES_KEY);return typeof seen==='string'?seen:'';}catch{return '';}
}
export function markNotesSeen(storage,id=latestNoteId){
 try{storage?.setItem(NOTES_KEY,id);return true;}catch{return false;}
}
// 아직 안 읽은 소식이 있는지. 처음 오는 사람에게는 점을 띄우지 않는다(읽을 것이 쌓여 있지 않으므로).
export function hasUnseenNotes(storage,{firstVisit=false}={}){
 if(firstVisit)return false;
 const seen=readSeenNote(storage);
 return Boolean(latestNoteId)&&seen!==latestNoteId;
}
export function noteCount(){return PATCH_NOTES.length;}
