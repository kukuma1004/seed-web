import {formArt} from './form-art.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TARGETS=[
 ['1막 · 잠든 정원',[['room','일반 방'],['warden','문지기'],['duo','쌍문지기'],['austin','오스틴']]],
 ['2막 · 잊힌 구장',[['act2field','베이스 전장'],['act2warden','연계 문지기'],['act2boss','항상초심']]],
 ['3막 · 폭풍 항로',[['act3field','폭풍 항로'],['act3warden','편대 문지기'],['act3boss','요한']]]
];
// Draw only one page of portraits, including when inspecting archived recipes.
export function mountDeveloperLab(root,{groups,selected='',onSelect,onTarget,onCards,onBack}){
 let group=Math.max(0,groups.findIndex(([,rows])=>rows.some(([id])=>id===selected))),page=0;
 const pageSize=18,all=groups.flatMap(([,rows])=>rows),label=id=>all.find(row=>row[0]===id)?.[1]||'기본 씨앗';
 const portrait=id=>id?formArt(id,'developer-form-art'):'<span class="developer-seed-mark">♧</span>';
 root.innerHTML=`<section class="menu-panel developer-panel lab-workbench"><header class="lab-header"><div><h2>전투 실험실</h2><p>조합을 고르고 전장으로 · 실험 기록과 보상은 저장되지 않아요</p></div><button id="developer-back">메인으로</button></header><div class="lab-columns"><section class="lab-picker"><div class="lab-filters"><label>종류<select id="lab-category">${groups.map(([name,rows],i)=>`<option value="${i}">${esc(name)} (${rows.length})</option>`).join('')}</select></label><label>조합 찾기<input id="lab-search" type="search" placeholder="이름 검색 · 전체 종류" autocomplete="off"></label></div><div class="lab-card-scroll"><div id="lab-builds" class="developer-builds"></div></div><nav class="lab-pages" aria-label="조합 페이지"><button id="lab-prev">이전</button><span id="lab-count" role="status"></span><button id="lab-next">다음</button></nav></section><section class="lab-destinations"><div class="lab-current"><span id="lab-selected-art"></span><div><small>선택한 조합</small><strong id="lab-selected-name"></strong></div></div><div class="developer-toggles"><label><input id="developer-active" type="checkbox" checked> 궁극기 충전</label><label><input id="developer-safe" type="checkbox"> 피해 안 받기</label></div><div class="lab-target-scroll">${TARGETS.map(([name,rows])=>`<h3>${name}</h3><div class="developer-actions">${rows.map(([id,title])=>`<button data-developer-target="${id}">${title}</button>`).join('')}</div>`).join('')}</div><button id="developer-choice">법칙 선택창 확인</button></section></div></section>`;
 const $=selector=>root.querySelector(selector),category=$('#lab-category'),search=$('#lab-search');category.value=String(group);
 function showSelected(){ $('#lab-selected-art').innerHTML=portrait(selected);$('#lab-selected-name').textContent=label(selected); }
 function render(){
  const query=search.value.trim().replace(/\s/g,'').toLocaleLowerCase('ko-KR');
  const rows=query?all.filter(([id,name])=>(name+id).replace(/\s/g,'').toLocaleLowerCase('ko-KR').includes(query)):groups[group][1];
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages-1);
  $('#lab-builds').innerHTML=rows.length?rows.slice(page*pageSize,(page+1)*pageSize).map(([id,name])=>`<button type="button" data-developer-form="${esc(id)}" aria-pressed="${id===selected}" title="${esc(name)}">${portrait(id)}<strong>${esc(name)}</strong></button>`).join(''):'<p class="lab-empty">찾는 조합이 없어요. 다른 이름으로 찾아보세요.</p>';
  $('#lab-count').textContent=`${page+1} / ${pages} · ${rows.length}종`;
  $('#lab-prev').disabled=page===0;$('#lab-next').disabled=page===pages-1;
  $('.lab-card-scroll').scrollTop=0;
 }
 $('#lab-builds').onclick=e=>{const button=e.target.closest('[data-developer-form]');if(!button)return;selected=button.dataset.developerForm;onSelect(selected);showSelected();for(const b of root.querySelectorAll('[data-developer-form]'))b.setAttribute('aria-pressed',String(b.dataset.developerForm===selected));};
 category.onchange=()=>{group=Number(category.value);page=0;search.value='';render();};
 search.oninput=()=>{page=0;render();};
 $('#lab-prev').onclick=()=>{page--;render();};$('#lab-next').onclick=()=>{page++;render();};
 for(const button of root.querySelectorAll('[data-developer-target]'))button.onclick=()=>onTarget(button.dataset.developerTarget);
 $('#developer-choice').onclick=onCards;$('#developer-back').onclick=onBack;
 const index=groups[group][1].findIndex(([id])=>id===selected);page=Math.floor(Math.max(0,index)/pageSize);
 showSelected();render();
}
