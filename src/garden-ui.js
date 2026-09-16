// 정원 화면 · 씨앗을 심고, 자란 식물의 갈래를 고르고, 다음 여정에 데려갈 세 칸을 정한다.
// 그림은 아직 법칙 그림을 빌려 쓴다(전용 그림이 나오면 plantArt만 바꾸면 된다).
import {LAWS} from './laws.js';
import {lawArt} from './law-art.js';
import {harvestLine,SEEDS,SEED_IDS,GUARDIAN,PLOTS,ACTIVE_SLOTS,FRAGMENTS_PER_SEED,STAGES,STAGE_NAMES,STAGE_POINTS,
 stageOf,nextStagePoints,plantName,branchSummary,activePlants,gardenEffects,centerInfo,activeSlots,
 plantSeed,uproot,chooseBranch,setActive,craftSeed,BRANCHES,BRANCH_KINDS} from './garden.js';
import './garden.css';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 씨앗 그림 자리. 법칙 씨앗은 법칙 그림, 시계탑 씨앗은 글리프.
export function plantArt(seedId,extra=''){
 const seed=SEEDS[seedId];
 if(!seed)return '';
 if(seed.law)return lawArt(seed.law,extra);
 return `<em class="plant-glyph ${extra}" aria-hidden="true">◷</em>`;
}
const growthBar=growth=>{
 const stage=stageOf(growth),next=nextStagePoints(growth);
 const from=STAGE_POINTS[stage],to=stage==='bloom'?from:STAGE_POINTS[STAGES[STAGES.indexOf(stage)+1]];
 const percent=stage==='bloom'?100:Math.round((growth-from)/Math.max(1,to-from)*100);
 return `<div class="grow-bar"><i style="width:${percent}%"></i></div><small>${STAGE_NAMES[stage]}${next?` · 다음 단계까지 여정 ${next}회`:' · 다 자랐어요'}</small>`;
};

// 정원 화면의 오른쪽 상자. 정원 자체는 3D 장면(garden-scene.js)이 그리고,
// 여기서는 고른 대상에 따라 할 수 있는 일만 보여 준다.
export function renderGardenPanel(root,{garden,selection,onChange,onSelect,onClose,austinDefeated=false}){
 const slots=activeSlots(garden,{austinDefeated}),actives=activePlants(garden,slots),center=centerInfo(garden,{austinDefeated});
 const owned=Object.entries(garden.seeds).filter(([,n])=>n>0);
 const seedChips=(action,label)=>owned.length
  ? `<div class="chips">${owned.map(([id,n])=>`<button class="seed-chip" data-${action}="${id}">${plantArt(id,'chip-art')}<span>${escape(SEEDS[id].name)}</span><b>×${n}</b></button>`).join('')}</div>`
  : `<p class="dim">${label}</p>`;
 const craft=garden.fragments>0
  ? `<div class="fragments"><span>씨앗 조각 ${garden.fragments}개</span>${garden.fragments>=FRAGMENTS_PER_SEED
     ? `<small>조각 ${FRAGMENTS_PER_SEED}개로 원하는 씨앗을 만들 수 있어요</small><div class="chips">${SEED_IDS.filter(id=>id!==GUARDIAN).map(id=>`<button class="seed-chip" data-craft="${id}">${plantArt(id,'chip-art')}<span>${escape(SEEDS[id].name)}</span></button>`).join('')}</div>`
     : `<small>${FRAGMENTS_PER_SEED-garden.fragments}개 더 모으면 원하는 씨앗을 만들 수 있어요</small>`}</div>`
  : '';

 let body;
 const plant=selection?.kind==='plot'?garden.plots[selection.index]:null;
 if(plant){
  const seed=SEEDS[plant.seed],stage=stageOf(plant.growth),grown=STAGES.indexOf(stage)>=STAGES.indexOf('mature'),next=nextStagePoints(plant.growth);
  body=`<div class="panel-plant">
   <div class="panel-head">${plantArt(plant.seed,'panel-art')}<div><strong>${escape(plantName(plant))}</strong><small>${STAGE_NAMES[stage]}${next?` · 다음 단계까지 여정 ${next}회`:' · 다 자랐어요'}</small></div></div>
   ${plant.branch
     ? `<p class="plot-effect">${escape(branchSummary(plant.seed,plant.branch,stage))}</p>`
     : grown
      ? `<p class="panel-ask">어떤 갈래로 키울까요?</p><div class="branch-row">${BRANCHES.map(b=>`<button class="branch" data-branch="${b}"><strong>${escape(seed.branchNames[b])}</strong><small>${escape(branchSummary(plant.seed,b,stage))}</small></button>`).join('')}</div>`
      : `<p class="plot-effect dim">자라면 세 갈래 중 하나를 고를 수 있어요</p>`}
   <div class="panel-actions">
    ${plant.branch&&grown?`<button class="primary small" data-active="1">${plant.active?'정원에서 빼기':'다음 여정에 데려가기'}</button>`:''}
    <button class="ghost small" data-uproot="1">뽑기</button>
   </div>
  </div>`;
 }else if(selection?.kind==='empty'){
  body=`<div class="panel-plant"><p class="panel-ask">빈 자리예요. 어떤 씨앗을 심을까요?</p>
   ${seedChips('plant','심을 씨앗이 없어요. 여정을 다녀오면 씨앗이 남습니다.')}${craft}</div>`;
 }else if(selection?.kind==='center'){
  body=`<div class="panel-plant"><div class="panel-head"><em class="panel-glyph">${center.glyph}</em><div><strong>${escape(center.name)}</strong><small>${escape(center.hint)}</small></div></div>
   <p class="plot-effect">${escape(center.line)}</p></div>`;
 }else{
  body=`<div class="panel-plant"><p class="panel-ask">정원의 식물이나 빈 자리를 눌러 보세요.</p>
   <h3>씨앗 상자</h3>${seedChips('pick','아직 모은 씨앗이 없어요. 여정을 다녀오면 가장 깊게 키운 법칙의 씨앗이 남습니다.')}${craft}</div>`;
 }

 root.innerHTML=`<aside class="garden-panel${selection?'':' idle'}">
  <header><strong>나의 정원</strong><small>${escape(center.name)}</small></header>
  <div class="panel-body">${body}</div>
  <footer><small>데려가는 식물 ${actives.length}/${slots}칸</small><button class="primary" id="garden-close">돌아가기</button></footer>
 </aside>`;

 const update=next=>{onChange(next);};
 root.querySelector('#garden-close').onclick=onClose;
 for(const button of root.querySelectorAll('[data-plant]'))
  button.onclick=()=>{const r=plantSeed(garden,button.dataset.plant,selection.index);if(r.ok)update(r.garden);};
 for(const button of root.querySelectorAll('[data-craft]'))
  button.onclick=()=>{const r=craftSeed(garden,button.dataset.craft);if(r.ok)update(r.garden);};
 for(const button of root.querySelectorAll('[data-pick]'))
  button.onclick=()=>{const empty=garden.plots.findIndex(p=>!p);if(empty>=0)onSelect({kind:'empty',index:empty});};
 for(const button of root.querySelectorAll('[data-branch]'))
  button.onclick=()=>{const r=chooseBranch(garden,selection.index,button.dataset.branch);if(r.ok)update(r.garden);};
 for(const button of root.querySelectorAll('[data-active]'))
  button.onclick=()=>{const r=setActive(garden,selection.index,!plant.active,slots);if(r.ok)update(r.garden);};
 for(const button of root.querySelectorAll('[data-uproot]'))
  button.onclick=()=>{
   if(button.dataset.sure!=='1'){button.dataset.sure='1';button.textContent='정말 뽑기';setTimeout(()=>{button.dataset.sure='';button.textContent='뽑기';},2500);return;}
   const r=uproot(garden,selection.index);if(r.ok){onSelect(null);update(r.garden);}
  };
 return root;
}

// 첫 화면에 얹는 미리보기. 정보를 늘어놓지 않고 '정원이 있다'는 느낌만 준다.
export function renderGardenPeek(root,{garden,austinDefeated=false,onOpen}){
 const center=centerInfo(garden,{austinDefeated});
 const planted=garden.plots.filter(Boolean);
 const icons=planted.length
  ? planted.slice(0,6).map(p=>`<span class="peek-plant ${p.active?'on':''} stage-${stageOf(p.growth)}" title="${escape(plantName(p))}">${plantArt(p.seed,'peek-art')}</span>`).join('')
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
