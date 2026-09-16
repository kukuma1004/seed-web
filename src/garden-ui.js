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

// 화면을 그리고 버튼을 연결한다. onChange(garden)으로 바뀐 정원을 돌려준다.
export function renderGarden(root,{garden,onChange,onClose=null,onOpen=null,picking=null,austinDefeated=false,inline=false,compact=false}){
 const slots=activeSlots(garden,{austinDefeated}),effects=gardenEffects(garden,slots),actives=activePlants(garden,slots),center=centerInfo(garden,{austinDefeated});
 const owned=Object.entries(garden.seeds).filter(([,n])=>n>0);
 const plots=garden.plots.map((plant,index)=>{
  if(!plant)return `<button class="plot empty" data-plant-here="${index}"><span class="plot-hole">＋</span><small>${owned.length?'씨앗 심기':'씨앗이 없어요'}</small></button>`;
  const seed=SEEDS[plant.seed],stage=stageOf(plant.growth),grown=STAGES.indexOf(stage)>=STAGES.indexOf('mature');
  const branchRow=plant.branch
   ? `<p class="plot-effect">${escape(branchSummary(plant.seed,plant.branch,stage))}</p>`
   : grown
    ? `<div class="branch-row">${BRANCHES.map(b=>`<button class="branch" data-branch="${index}:${b}"><strong>${escape(seed.branchNames[b])}</strong><small>${escape(branchSummary(plant.seed,b,stage))}</small></button>`).join('')}</div>`
    : `<p class="plot-effect dim">자라면 세 갈래 중 하나를 고를 수 있어요</p>`;
  return `<div class="plot ${plant.active?'active':''} stage-${stage}">
   <div class="plot-head">${plantArt(plant.seed,'plot-art')}<div><strong>${escape(plantName(plant))}</strong>${growthBar(plant.growth)}</div></div>
   ${branchRow}
   <div class="plot-actions">
    ${plant.branch&&grown?`<button class="primary small" data-active="${index}">${plant.active?'정원에서 빼기':'데려가기'}</button>`:''}
    <button class="ghost small" data-uproot="${index}">뽑기</button>
   </div>
  </div>`;
 }).join('');

 const shelf=owned.length
  ? owned.map(([id,n])=>`<button class="seed-chip ${picking===null?'':'pickable'}" data-seed="${id}">${plantArt(id,'chip-art')}<span>${escape(SEEDS[id].name)}</span><b>×${n}</b></button>`).join('')
  : '<p class="dim">아직 모은 씨앗이 없어요. 여정을 다녀오면 가장 깊게 키운 법칙의 씨앗이 남습니다.</p>';

 const craft=garden.fragments>0
  ? `<div class="fragments"><span>씨앗 조각 ${garden.fragments}개</span>${garden.fragments>=FRAGMENTS_PER_SEED
     ? `<small>조각 ${FRAGMENTS_PER_SEED}개로 원하는 씨앗을 만들 수 있어요</small><div class="craft-row">${SEED_IDS.filter(id=>id!==GUARDIAN).map(id=>`<button class="seed-chip" data-craft="${id}">${plantArt(id,'chip-art')}<span>${escape(SEEDS[id].name)}</span></button>`).join('')}</div>`
     : `<small>${FRAGMENTS_PER_SEED-garden.fragments}개 더 모으면 원하는 씨앗을 만들 수 있어요</small>`}</div>`
  : '';

 if(compact){
  const strip=garden.plots.map(plant=>{
   if(!plant)return `<span class="mini empty">＋</span>`;
   const stage=stageOf(plant.growth);
   return `<span class="mini ${plant.active?'on':''} stage-${stage}" title="${escape(plantName(plant))}">${plantArt(plant.seed,'mini-art')}<b>${escape(plantName(plant))}</b><small>${STAGE_NAMES[stage]}</small></span>`;
  }).join('');
  const seeds=Object.values(garden.seeds).reduce((sum,n)=>sum+n,0);
  root.innerHTML=`<div class="garden-strip">
   <div class="strip-heart stage-${center.id}"><em aria-hidden="true">${center.glyph}</em><span><b>${escape(center.name)}</b><small>${escape(center.hint)}</small></span></div>
   <div class="mini-plots">${strip}</div>
   <button class="primary small" id="open-garden">정원 손질하기${seeds?` · 씨앗 ${seeds}개`:''}${garden.fragments?` · 조각 ${garden.fragments}`:''}</button>
   <small class="strip-note">데려가는 식물 ${actives.length}/${slots}칸${effects.actives.length?' · '+effects.actives.map(a=>escape(a.name)).join(' · '):''}</small>
  </div>`;
  if(onOpen)root.querySelector('#open-garden').onclick=onOpen;
  return root;
 }
 const heart=`<div class="garden-heart stage-${center.id}">
   <em class="heart-glyph" aria-hidden="true">${center.glyph}</em>
   <div><strong>${escape(center.name)}</strong><p>${escape(center.line)}</p><small>${escape(center.hint)}</small></div>
  </div>`;
 root.innerHTML=`<div class="garden-screen${inline?' inline':''}">
  ${inline?'':'<p>여정이 남긴 것을 키우는 곳</p><h2>나의 정원</h2>'}
  ${heart}
  <p class="garden-note">데려갈 수 있는 식물은 ${slots}칸 · 지금 ${actives.length}칸
  ${effects.actives.length?`<br>${effects.actives.map(a=>escape(a.name)+' · '+escape(a.summary)).join('<br>')}`:'<br>자란 식물의 갈래를 고르면 다음 여정의 선택지가 달라집니다.'}</p>
  ${picking!==null?`<p class="garden-pick">어떤 씨앗을 심을까요? <button class="ghost small" data-cancel="1">취소</button></p>`:''}
  <div class="plots">${plots}</div>
  <div class="seed-shelf"><h3>씨앗 보관함</h3><div class="chips">${shelf}</div>${craft}</div>
  ${inline?'':'<button class="primary" id="garden-close">돌아가기</button>'}
 </div>`;

 const options={onChange,onClose,austinDefeated,inline};
 const update=(next,pick=null)=>{onChange(next);renderGarden(root,{...options,garden:next,picking:pick});};
 if(root.querySelector('#garden-close'))root.querySelector('#garden-close').onclick=onClose;
 for(const button of root.querySelectorAll('[data-plant-here]'))
  button.onclick=()=>{if(Object.keys(garden.seeds).length)renderGarden(root,{...options,garden,picking:Number(button.dataset.plantHere)});};
 for(const button of root.querySelectorAll('[data-seed]'))
  button.onclick=()=>{if(picking===null)return;const r=plantSeed(garden,button.dataset.seed,picking);if(r.ok)update(r.garden);};
 for(const button of root.querySelectorAll('[data-craft]'))
  button.onclick=()=>{const r=craftSeed(garden,button.dataset.craft);if(r.ok)update(r.garden,picking);};
 for(const button of root.querySelectorAll('[data-branch]')){
  const [index,branch]=button.dataset.branch.split(':');
  button.onclick=()=>{const r=chooseBranch(garden,Number(index),branch);if(r.ok)update(r.garden);};
 }
 for(const button of root.querySelectorAll('[data-active]')){
  const index=Number(button.dataset.active);
  button.onclick=()=>{const r=setActive(garden,index,!garden.plots[index].active,slots);if(r.ok)update(r.garden);};
 }
 for(const button of root.querySelectorAll('[data-uproot]')){
  const index=Number(button.dataset.uproot);
  button.onclick=()=>{
   if(button.dataset.sure!=='1'){button.dataset.sure='1';button.textContent='정말 뽑기';setTimeout(()=>{button.dataset.sure='';button.textContent='뽑기';},2500);return;}
   const r=uproot(garden,index);if(r.ok)update(r.garden);
  };
 }
 for(const button of root.querySelectorAll('[data-cancel]'))button.onclick=()=>renderGarden(root,{...options,garden,picking:null});
 return root;
}
export {harvestLine};
