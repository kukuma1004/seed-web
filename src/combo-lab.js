import './combo-art.css';
import './combo-lab.css';
import './final-identity-art.css';
import {LAWS} from './laws.js';
import {lawArt} from './law-art.js';
import {CURATED_FORMS,SOLO_FORMS,AWAKEN_FORMS,LIVE_AWAKEN_FORMS,TWIN_FORMS,isHeldBack} from './forms.js';
import {formArt} from './form-art.js';

const $=q=>document.querySelector(q);
const PAGE=24;
const LIBRARY=Object.freeze({
 basic:Object.entries(LAWS).map(([id,law])=>({id,name:law.name,desc:law.desc,role:law.hint,laws:[id],status:'공개',kind:'basic'})),
 solo:Object.values(SOLO_FORMS).map(form=>({id:form.id,name:form.name,desc:form.desc,role:form.strength,weakness:form.weakness,laws:form.requires,status:'공개',kind:'solo'})),
 first:Object.values(CURATED_FORMS).map(form=>({id:form.id,name:form.name,desc:form.desc,role:form.strength,weakness:form.weakness,laws:form.requires,status:isHeldBack(form.id)?'전투 검수 보류':'공개',kind:'first'})),
 final:Object.values(AWAKEN_FORMS).map(form=>({id:form.id,name:form.name,desc:form.desc,role:form.strength,weakness:form.weakness,laws:form.requires,status:LIVE_AWAKEN_FORMS[form.id]?'공개':'전투실험실 구현 · 공개 보류',kind:'final',recipe:form.pair})),
 twin:Object.values(TWIN_FORMS).map(form=>({id:form.id,name:form.name,desc:form.desc,role:form.strength,weakness:form.weakness,laws:form.requires,status:'공개',kind:'twin',recipe:form.parts.map(id=>SOLO_FORMS[id]?.name||id).join(' + ')}))
});
let mode='final',page=0,query='';
const hex=n=>`#${Number(n||0x90b7ad).toString(16).padStart(6,'0')}`;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lawNames=laws=>laws.map(id=>LAWS[id]?.name||id).join(' · ');

function source(){
 return LIBRARY[mode].filter(entry=>{
  const text=[entry.id,entry.name,entry.desc,entry.role,entry.weakness,entry.recipe,lawNames(entry.laws)].join(' ').toLowerCase();
  return !query||text.includes(query);
 });
}
function card(entry){
 const primary=LAWS[entry.laws[0]]?.color,secondary=LAWS[entry.laws[1]]?.color||primary;
 const art=entry.kind==='basic'?lawArt(entry.id,'lab-law-art'):formArt(entry.id,'lab-form-art');
 const artKind=entry.status==='공개'?'선택 원화':'검수 중인 시안';
 return `<article class="combo-card" style="--a:${hex(primary)};--b:${hex(secondary)}"><div class="art">${art}<span class="art-kind">${artKind}</span></div><div class="copy"><small>${escape(entry.status)} · ${escape(entry.id)}</small><h2>${escape(entry.name)}</h2><p>${escape(entry.desc)}</p><span>${escape(entry.recipe||lawNames(entry.laws))}</span><small class="art-status">${escape(entry.role||'')}</small><em>${escape(entry.weakness||'')}</em></div></article>`;
}
function draw(){
 const list=source(),pages=Math.max(1,Math.ceil(list.length/PAGE));
 page=Math.min(page,pages-1);
 const shown=list.slice(page*PAGE,page*PAGE+PAGE);
 $('#cards').innerHTML=shown.map(card).join('')||'<div class="empty">맞는 조합이 없습니다.</div>';
 $('#result').textContent=`${list.length.toLocaleString('ko-KR')}개 중 ${shown.length}개 표시`;
 $('#page').textContent=`${page+1} / ${pages}`;
 $('#prev').disabled=page===0;
 $('#next').disabled=page>=pages-1;
 window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('nav button[data-mode]').forEach(button=>button.onclick=()=>{
 mode=button.dataset.mode;page=0;
 document.querySelectorAll('nav button[data-mode]').forEach(v=>v.classList.toggle('on',v===button));
 draw();
});
$('#search').oninput=event=>{query=event.target.value.trim().toLowerCase();page=0;draw();};
$('#prev').onclick=()=>{page--;draw();};
$('#next').onclick=()=>{page++;draw();};
draw();
