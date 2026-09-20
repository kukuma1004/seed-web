// 정원 화면 · 여정에서 남은 씨앗을 심고, 플레이 방식대로 자라는 모습을 본다.
// 그림은 아직 법칙 그림을 빌려 쓴다(전용 그림이 나오면 plantArt만 바꾸면 된다).
import {LAWS} from './laws.js';
import {lawArt} from './law-art.js';
import {harvestLine,gardenRecordLine,SEEDS,FOUNDER,STAGES,STAGE_NAMES,STAGE_POINTS,PLAY_STYLES,MASTERY,MASTERY_KEYS,MASTERY_TOTAL_CAP,GARDEN_TRAINING_VISIBLE,
 stageOf,nextStagePoints,plantName,branchSummary,centerInfo,gardenMastery,bossGardenMilestones} from './garden.js';
import './garden.css';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 씨앗 그림 자리. 법칙 씨앗은 법칙 그림, 시계탑 씨앗은 글리프.
export function plantArt(seedId,extra=''){
 const seed=SEEDS[seedId];
 if(!seed)return '';
 if(seed.law)return lawArt(seed.law,extra);
 return `<em class="plant-glyph ${extra}" aria-hidden="true">${seedId===FOUNDER?'✦':'◷'}</em>`;
}
const growthBar=growth=>{
 const stage=stageOf(growth),next=nextStagePoints(growth);
 const from=STAGE_POINTS[stage],to=stage==='bloom'?from:STAGE_POINTS[STAGES[STAGES.indexOf(stage)+1]];
 const percent=stage==='bloom'?100:Math.round((growth-from)/Math.max(1,to-from)*100);
 return `<div class="grow-bar"><i style="width:${percent}%"></i></div><small>${STAGE_NAMES[stage]}${next?` · 다음 단계까지 여정 ${next}회`:' · 다 자랐어요'}</small>`;
};

// 정원 화면의 오른쪽 상자. 정원 자체는 3D 장면(garden-scene.js)이 그리고,
// 여기서는 고른 대상에 따라 할 수 있는 일만 보여 준다.
export function renderGardenPanel(root,{garden,selection,onChange,onSelect,onClose,onTraining,austinDefeated=false}){
 const planted=garden.plots.filter(Boolean).length,center=centerInfo(garden,{austinDefeated});
 const mastery=gardenMastery(garden),masteryRows=MASTERY_KEYS.map(id=>`<span><b>${escape(MASTERY[id].name)}</b><em>+${(mastery.points[id]/10).toFixed(1)}%</em></span>`).join('');
 const keepsake=bossGardenMilestones(garden),keepsakeLine=keepsake.earned
  ? `기억꽃 ${keepsake.flowers}송이 · 황금 열매 ${keepsake.fruits}개${keepsake.next?` · 다음 개화까지 ${keepsake.next}회`:''}`
  : `찐보스 ${keepsake.next}회 격파하면 첫 기억꽃이 피어요`;
 const fragmentLine=garden.fragments?`<p class="garden-auto-note">씨앗 조각 ${garden.fragments}/3 · 세 조각이 모이면 최근 여정의 식물이 자동으로 돋아요.</p>`:'';

 let body;
 const plant=selection?.kind==='plot'?garden.plots[selection.index]:null;
 if(plant){
  const stage=stageOf(plant.growth),next=nextStagePoints(plant.growth),style=PLAY_STYLES[plant.style]||PLAY_STYLES.balanced;
  body=`<div class="panel-plant">
   <div class="panel-head">${plantArt(plant.seed,'panel-art')}<div><strong>${escape(plantName(plant))}</strong><small>${STAGE_NAMES[stage]}${next?` · 다음 단계까지 여정 ${next}회`:' · 다 자랐어요'}</small></div></div>
   <p class="garden-style"><strong>${escape(style.label)}</strong><small>${escape(style.hint)}</small></p>
   <p class="plot-effect">${escape(branchSummary(plant.seed,plant.branch,stage))}</p>
  </div>`;
 }else if(selection?.kind==='empty'){
  body=`<div class="panel-plant"><p class="panel-ask">빈 화단이에요.</p><p class="plot-effect">여정을 마치면 가장 깊게 키운 법칙과 플레이 방식이 이곳에 식물로 자동으로 심깁니다.</p>${fragmentLine}</div>`;
 }else if(selection?.kind==='center'){
  body=`<div class="panel-plant"><div class="panel-head"><em class="panel-glyph">${center.glyph}</em><div><strong>${escape(center.name)}</strong><small>${escape(center.hint)}</small></div></div>
   <p class="plot-effect">${escape(center.line)}</p></div>`;
 }else{
  const recent=garden.records?.[0],memory=recent?`<h3>최근 여정의 흔적</h3><p class="plot-effect garden-memory">${escape(gardenRecordLine(recent))}</p>`:'';
  body=`<div class="panel-plant"><p class="panel-ask">정원의 식물을 눌러 지난 플레이의 흔적을 살펴보세요.</p>
   ${memory}<h3>자동으로 자라는 정원</h3><p class="plot-effect">여정을 마치면 씨앗은 빈 화단에 저절로 심기고, 이미 자라는 식물은 다음 여정마다 성장합니다.</p>${fragmentLine}</div>`;
 }

 root.innerHTML=`<aside class="garden-panel${selection?'':' idle'}">
  <header><strong>나의 정원</strong><small>${escape(center.name)}</small></header>
  <section class="garden-mastery"><div><strong>보스의 기억</strong><small>각 막의 최종 보스 격파마다 무작위 능력 +0.1%</small></div><p>${masteryRows}</p><small>누적 ${mastery.total}/${MASTERY_TOTAL_CAP} · 능력별 최대 3%</small><div class="garden-keepsake"><b>✦</b><span>${keepsakeLine}</span></div></section>
  <div class="panel-body">${body}</div>
  <footer><small>자라고 있는 식물 ${planted}/6 · 식물은 플레이 기록</small><div>${GARDEN_TRAINING_VISIBLE&&onTraining?'<button class="ghost small" id="garden-training">훈련장</button>':''}<button class="primary" id="garden-close">돌아가기</button></div></footer>
 </aside>`;

 root.querySelector('#garden-close').onclick=onClose;
 const trainingButton=root.querySelector('#garden-training');
 if(trainingButton)trainingButton.onclick=()=>onTraining();
 return root;
}

// 첫 화면에 얹는 미리보기. 정보를 늘어놓지 않고 '정원이 있다'는 느낌만 준다.
export function renderGardenPeek(root,{garden,austinDefeated=false,onOpen}){
 const center=centerInfo(garden,{austinDefeated});
 const planted=garden.plots.filter(Boolean);
 const icons=planted.length
  ? planted.slice(0,6).map(p=>`<span class="peek-plant stage-${stageOf(p.growth)}" title="${escape(plantName(p))}">${plantArt(p.seed,'peek-art')}</span>`).join('')
  : '<span class="peek-empty">아직 심은 것이 없어요</span>';
 root.innerHTML=`<button class="garden-peek stage-${center.id}" id="open-garden" aria-label="나의 정원 열기">
  <em class="peek-heart" aria-hidden="true">${center.glyph}</em>
  <span class="peek-row">${icons}</span>
  <span class="peek-go">나의 정원 ›</span>
 </button>`;
 if(onOpen)root.querySelector('#open-garden').onclick=onOpen;
 return root;
}
export {harvestLine};
