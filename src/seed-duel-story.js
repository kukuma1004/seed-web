import {normalizeDuelStory,storyUnlocked} from './seed-duel-story-progress.js';
export const DUEL_STORY_CHAPTERS=Object.freeze([
 {name:'1장 · 바람이 열린 마당',intro:'생명의 나무에 닿던 아홉 빛이 흩어졌다. 작은 씨앗은 빛을 모으기 위해 정원의 수련자들을 찾아간다.'},
 {name:'2장 · 길을 잃은 빛',intro:'힘만으로는 빛을 되찾을 수 없다. 상대의 움직임을 읽고, 물러설 순간과 파고들 순간을 골라야 한다.'},
 {name:'3장 · 아홉 빛의 약속',intro:'마지막 세 빛은 정원의 깊은 곳에 있다. 익힌 싸움법을 모두 펼쳐 아홉 빛을 다시 하나로 모으자.'}
]);
const encounters=[
 ['pierce','첫 인사, 잎의 창','쉬움','easy','창은 길지만 옆으로 피하면 빈틈이 보여. 내 창끝보다 네 발걸음을 믿어 봐.','창끝을 옆으로 회피한 뒤 가까이 들어가 공격하세요.','네 발걸음이 길을 열었구나. 첫 빛을 맡길게.'],
 ['burst','불꽃의 박자','쉬움','easy','불꽃은 서두르는 씨앗을 붙잡지. 크게 휘두르기 전, 내 몸이 움츠러드는 걸 보렴.','강공격을 회피하고 내리친 뒤의 빈틈에 반격하세요.','잘 기다렸네! 불꽃도 네 박자에 함께할 거야.'],
 ['split','꽃잎 사이로','쉬움','easy','한 번 닿았다고 멈추지 마. 꽃잎은 세 번 춤추거든!','연속 공격을 전부 맞받지 말고, 막기와 회피로 거리를 다시 잡으세요.','네가 춤을 끝까지 읽었어. 첫 마당의 빛은 이제 네 것이야.'],
 ['orbit','고리의 바깥','보통','normal','내 고리 가까이 오래 서 있으면 다칠 거야. 들어왔다가 나가는 용기가 필요해.','공전 고리가 켜지면 거리를 벌리고, 기술이 끝날 때 파고드세요.','내 고리에도 열린 틈이 있다는 걸 찾아냈구나.'],
 ['recall','돌아오는 약속','보통','normal','날아간 칼날은 잊지 말아 줘. 돌아오는 길에도 내가 있거든.','칼날을 한 번 피한 뒤에도 돌아오는 궤적을 확인하세요.','돌아오는 길까지 지켜봤네. 이 빛도 너에게 돌아갈 거야.'],
 ['frost','멈춘 연못','보통','normal','몸이 느려져도 마음까지 멈추지는 마. 얼음 밖에 다음 한 걸음이 있어.','냉기 기술이 닿기 전에 회피하세요. 느려졌을 때는 무리한 추격을 쉬세요.','겨울을 건너는 방법을 배웠구나. 이제 깊은 정원으로 가렴.'],
 ['chain','번개보다 먼저','어려움','hard','멀리 있다고 안전한 건 아니야. 네 다음 움직임을 나에게 알려주지 마.','중거리에서 기술을 정면으로 받지 말고, 옆으로 회피하며 접근하세요.','번개가 네 뒤를 따라갔네. 다음 빛은 더 까다로울 거야.'],
 ['gravity','끌림을 거슬러','어려움','hard','막고만 있으면 나에게 끌려와. 스스로 거리를 만드는 씨앗인지 보여 줘.','중력 끌어당기기는 막기를 무시해요. 가까워지기 전에 회피로 거리를 바꾸세요.','붙잡히지 않고 네 길을 골랐구나. 마지막 거울이 기다리고 있어.'],
 ['reflect','마지막 거울','어려움','hard','여기까지 온 네 힘을 보았어. 이제 반복하던 습관을 깨고 나에게 닿아 봐.','평타만 반복하면 반격당해요. 강공격·회피·기술을 섞고 필살의 기회를 노리세요.','아홉 빛은 서로 다른 싸움법이었어. 네가 그 차이를 받아들였기에 정원은 다시 빛날 거야.']
];
export const DUEL_STORY_STAGES=Object.freeze(encounters.map(([enemy,title,label,difficulty,before,tip,after],i)=>Object.freeze({id:`s${i+1}`,number:i+1,chapter:Math.floor(i/3),enemy,title,label,difficulty,before,tip,after})));
// Only an actual, finished best-of-three campaign victory can open the next encounter.
export function completeStoryMatch(raw,stage,match,now=Date.now()){
 if(!DUEL_STORY_STAGES.includes(stage)||!storyUnlocked(raw,stage.number)||match?.practice||match?.phase!=='over'||match.winner!==0||match.wins?.[0]!==2||![0,1].includes(match.wins?.[1])||match.fighters?.[1]?.char!==stage.enemy)return null;
 const out=normalizeDuelStory(raw);out.hero=match.fighters[0].char;out.updatedAt=Math.max(now,out.updatedAt+1);
 const prev=out.cleared[stage.id];out.cleared[stage.id]={losses:Math.min(prev?.losses??2,match.wins[1]),at:now};return normalizeDuelStory(out);
}
