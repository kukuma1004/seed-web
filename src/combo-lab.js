import './combo-art.css';
import './combo-lab.css';
import {COMBO_LAW_BY_ID,FIRST_FUSIONS,SECOND_FUSIONS} from './combo-catalog.js';
import {comboArt,comboProjectileArt} from './combo-art.js';
import {CURATED_FORMS,SECOND_FORMS} from './forms.js';
import {formArt} from './form-art.js';

const $=q=>document.querySelector(q);
const PAGE=24;
const pairKey=ids=>[...ids].sort().join('+');
const CURATED_FIRST_BY_PAIR=new Map(Object.values(CURATED_FORMS).map(form=>[pairKey(form.requires),form]));
const curatedOf=combo=>SECOND_FORMS[combo.id]||CURATED_FIRST_BY_PAIR.get(pairKey(combo.laws));
let mode='first',family='all',page=0,query='';

function source(){
 const list=mode==='first'?FIRST_FUSIONS:SECOND_FUSIONS;
 return list.filter(v=>{
  if(mode==='second'&&family!=='all'&&v.family!==family)return false;
  const text=[v.name,curatedOf(v)?.name,v.pair,v.epithet,...v.laws.map(id=>COMBO_LAW_BY_ID[id].name)].join(' ').toLowerCase();
  return !query||text.includes(query);
 });
}

function card(v){
 const lawNames=v.laws.map(id=>COMBO_LAW_BY_ID[id].name).join(' · ');
 const badge=v.family==='resonance'?'공명형':v.family==='convergence'?'교차형':'1차 융합';
 const curated=curatedOf(v);
 return `<article class="combo-card" style="--a:${v.visual.accent};--b:${v.visual.secondary}"><div class="art">${curated?formArt(curated.id,'lab-form-art'):comboArt(v)}${comboProjectileArt(v)}</div><div class="copy"><small>${badge} · ${v.id}</small><h2>${curated?.name||v.name}</h2><p>${curated?.desc||v.epithet||v.mechanic}</p><span>${lawNames}</span>${v.rule?`<em>${v.rule}</em>`:''}</div></article>`;
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
 $('#family').hidden=mode!=='second';
 window.scrollTo({top:0,behavior:'instant'});
}

document.querySelectorAll('nav button[data-mode]').forEach(button=>button.onclick=()=>{
 mode=button.dataset.mode;page=0;
 document.querySelectorAll('nav button[data-mode]').forEach(v=>v.classList.toggle('on',v===button));
 draw();
});
document.querySelectorAll('#family button').forEach(button=>button.onclick=()=>{
 family=button.dataset.family;page=0;
 document.querySelectorAll('#family button').forEach(v=>v.classList.toggle('on',v===button));
 draw();
});
$('#search').oninput=event=>{query=event.target.value.trim().toLowerCase();page=0;draw();};
$('#prev').onclick=()=>{page--;draw();};
$('#next').onclick=()=>{page++;draw();};
draw();
