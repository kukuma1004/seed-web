import {EXPEDITION_GARDENS} from './world.js';

// Story receipts live in the existing roster.story set. Older `garden:return`
// receipts are intentionally not evidence that a boss was beaten or restored.
const NARRATIVE=Object.freeze({
 meadow:{
  intro:'가시뿔 수호자가 길을 가로막는다. 곧게 뻗은 뿔 뒤로, 겁먹은 새싹들이 몸을 숨긴다.',
  outro:'마지막 돌진이 멈추자 수호자는 뿔을 내린다. 새싹들이 처음으로 길 한가운데 고개를 내민다.',
  restore:'막혀 있던 바람길이 열렸다. 초원의 씨앗들은 서로를 관통하지 않고도 햇빛을 나누는 법을 배운다.'
 },
 blossom:{
  intro:'천개의 꽃잎이 한꺼번에 흩날린다. 아름다운 꽃비 아래서는 어느 꽃잎이 칼날인지 보이지 않는다.',
  outro:'한 장, 또 한 장. 날 선 꽃잎들이 땅에 내려앉고, 꽃잎 사이에 작은 틈이 생긴다.',
  restore:'벚꽃은 다시 피지만 예전처럼 모든 가지를 뒤덮지 않는다. 작은 싹 하나가 자랄 자리를 남긴다.'
 },
 autumn:{
  intro:'낙엽 사냥꾼이 지나간 발자국을 되밟는다. 던져진 잎은 언제나 다른 길로 돌아온다.',
  outro:'사냥꾼의 마지막 잎이 제자리로 돌아온다. 이번에는 누구도 뒤쫓지 않고 조용히 땅에 눕는다.',
  restore:'되돌아오는 길은 함정만 뜻하지 않는다. 가을의 씨앗은 흩어진 잎을 모아 서로의 둥지를 덮는다.'
 },
 snow:{
  intro:'백설의 거인이 발을 딛자 정원의 시간이 느려진다. 눈 속의 작은 숨결만 아직 움직이고 있다.',
  outro:'거인이 물러난 자리에 얼음이 금 간다. 갇혀 있던 물소리가 먼저 돌아온다.',
  restore:'해빙은 서두르지 않는다. 설원의 싹들은 조금씩 녹는 물을 따라 스스로 일어선다.'
 },
 moon:{
  intro:'월륜 수호자 주위로 달빛 고리가 돈다. 한 고리가 물러나면 다른 고리가 씨앗을 가린다.',
  outro:'돌던 고리들이 제 속도를 잃고 별빛처럼 흩어진다. 수호자는 빈 하늘을 잠시 올려다본다.',
  restore:'밤꽃 주위에 다시 작은 궤도가 생긴다. 달빛의 정원은 서로를 가두지 않고 지키는 거리를 찾는다.'
 },
 fire:{
  intro:'용암의 심장이 느리게 뛴다. 뛰는 순간마다 땅속의 불씨가 한 박자 늦게 터진다.',
  outro:'심장의 뜨거운 맥이 잦아든다. 꺼진 듯 보이던 재 아래에서 아직 붉은 씨앗이 숨을 쉰다.',
  restore:'불길은 사라지지 않았다. 이제는 땅을 삼키지 않고, 새 씨앗이 추위를 견디도록 온기를 남긴다.'
 },
 shadow:{
  intro:'심연의 문지기가 그림자를 한곳에 모은다. 바닥의 작은 돌까지 보이지 않는 중심으로 끌려간다.',
  outro:'문지기가 물러서자 눌렸던 땅이 제 높이를 찾는다. 어둠 속에도 서로 다른 발자국이 남아 있다.',
  restore:'어둠의 정원은 여전히 어둡다. 그러나 씨앗들은 한 점에 끌려가지 않고 각자의 자리를 지킨다.'
 },
 dream:{
  intro:'거울의 여왕이 한 걸음 앞선 모습을 비춘다. 피하지 않은 공격은 그대로 되돌아올 것만 같다.',
  outro:'마지막 거울이 깨지는 대신 빛을 놓는다. 여왕의 얼굴 뒤에서 수많은 씨앗의 얼굴이 보인다.',
  restore:'설렘의 정원에 새 거울이 선다. 이번 거울은 상처를 돌려주지 않고, 살아 돌아온 얼굴을 기억한다.'
 }
});

const GARDEN_IDS=Object.freeze(Object.keys(EXPEDITION_GARDENS));
const scene=(id,trigger,title,body,gardenId=null)=>Object.freeze({id,trigger,title,body,gardenId,homeArt:gardenId?EXPEDITION_GARDENS[gardenId].homeArt:null});
const SCENES=[scene('story:prologue','prologue','첫 번째 씨앗의 이야기','첫 번째 씨앗은 살아남으려고 아홉 가지 법칙을 만들었다. 마침내 자신을 나누어 법칙과 생명의 나무가 되었다. 정원지기인 당신은 그 뒤에 태어난 씨앗들의 길을 지킨다.')];
for(const gardenId of GARDEN_IDS){
 const g=EXPEDITION_GARDENS[gardenId],lines=NARRATIVE[gardenId];
 if(!lines)throw Error(`Missing expedition story: ${gardenId}`);
 SCENES.push(scene(`story:${gardenId}:boss-intro`,'boss-intro',`${g.boss} · 마주침`,lines.intro,gardenId));
 SCENES.push(scene(`story:${gardenId}:boss-outro`,'boss-outro',`${g.boss} · 지나간 자리`,lines.outro,gardenId));
 SCENES.push(scene(`story:${gardenId}:restore`,'garden-restore',`${g.name} · 다시 자라는 곳`,lines.restore,gardenId));
}
SCENES.push(scene('story:tree:endgame','tree-endgame','생명의 나무 · 아홉 번째 빛','여덟 정원에서 돌아온 기억이 뿌리 사이로 흐른다. 온실의 생명전류가 그 빛을 잇는다. 첫 번째 씨앗의 이야기는 여기서 끝나지 않는다. 살아남은 씨앗들이 다음 이야기를 키운다.'));
export const EXPEDITION_STORY_SCENES=Object.freeze(SCENES);
const BY_ID=new Map(SCENES.map(value=>[value.id,value]));
const knownStoryIds=storyIds=>new Set(Array.isArray(storyIds)?storyIds.filter(value=>typeof value==='string'&&BY_ID.has(value)):[]);
export const EXPEDITION_RESTORATION_IDS=Object.freeze(GARDEN_IDS.map(id=>`story:${id}:restore`));

export function expeditionRestorationProgress(storyIds){
 const found=knownStoryIds(storyIds),restoredGardenIds=GARDEN_IDS.filter(id=>found.has(`story:${id}:restore`));
 return {restoredGardenIds,restoredCount:restoredGardenIds.length,total:GARDEN_IDS.length,treeReady:restoredGardenIds.length===GARDEN_IDS.length};
}

// A selector only: callers record `recordId` after the game event and the
// roster commit have succeeded. Reopening a scene never produces a receipt.
export function selectExpeditionStory({trigger,gardenId,bossReady=false,bossDefeated=false,returned=false}={},storyIds=[]){
 let id=null;
 if(trigger==='prologue')id='story:prologue';
 else if(trigger==='tree-endgame'){
  if(expeditionRestorationProgress(storyIds).treeReady)id='story:tree:endgame';
 }else if(Object.hasOwn(EXPEDITION_GARDENS,gardenId)){
  if(trigger==='boss-intro'&&bossReady)id=`story:${gardenId}:boss-intro`;
  if(trigger==='boss-outro'&&bossDefeated)id=`story:${gardenId}:boss-outro`;
  if(trigger==='garden-restore'&&bossDefeated&&returned)id=`story:${gardenId}:restore`;
 }
 const selected=BY_ID.get(id);
 if(!selected)return null;
 const firstDiscovery=!knownStoryIds(storyIds).has(id);
 return {scene:selected,firstDiscovery,recordId:firstDiscovery?id:null};
}

export function readExpeditionStory(id,storyIds=[]){
 if(!knownStoryIds(storyIds).has(id))return null;
 return {scene:BY_ID.get(id),firstDiscovery:false,recordId:null};
}

export function expeditionStoryJournal(storyIds=[]){
 const found=knownStoryIds(storyIds);
 return EXPEDITION_STORY_SCENES.filter(value=>found.has(value.id));
}
