// 생명의 나무 v2 화면(정원 입구 → 생명의 나무). 웅장한 장면 + 화단 7곳 + 아래 칸(가방 · 조각 · 씨앗 도감).
// 규칙은 tree-of-life.js, 화단 그림 좌표는 garden-spots/tree.js(tools/garden_spot_build.py가 만든다).
// 화단 그림: 1~6번 A 새싹 · B 자란 풀 · C 개화(등급 빛으로 구분), 0번(가운데 큰 화단) A 새싹 · B 자란 풀 · C~G 전설 개화.
import TREE_SCENE from './garden-spots/tree.js';
import {TREE_SEEDS,TREE_RARITY,TREE_PLOTS,normalizeTree,plotStage,plotNextIn,plantTreeSeed,clearTreePlot,craftTreeSeed,migrateTree} from './tree-of-life.js';
import {LAWS} from './laws.js';

const LEGEND_ART={clocktower:'C',alwaysbeginner:'D',tempestcarrier:'E',worldtree:'F',founder:'G'};
const STAGE_NAME={seed:'심은 씨앗',sprout:'새싹',grown:'자란 풀',bloom:'개화'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 화단에 보여 줄 그림 글자(없으면 그림 없이 씨앗 빛만).
export function plotArt(plot,index){
 const st=plotStage(plot);if(!st||st==='seed')return null;
 if(st==='sprout')return 'A';if(st==='grown')return 'B';
 if(index===0)return LEGEND_ART[plot.seed]||'C';
 return 'C';
}
const glowOf=seed=>{const s=TREE_SEEDS[seed];if(!s)return '#fff';if(s.rarity!=='common')return TREE_RARITY[s.rarity].color;const c=LAWS[s.law]?.color;return Number.isFinite(c)?`#${c.toString(16).padStart(6,'0')}`:TREE_RARITY.common.color;};

export function createTreeView({root,garden,audio,toast,onBack,BASE,observe}){
 const $=q=>root.querySelector(q);
 let pick=null,tab='bag';
 const scene=TREE_SCENE,[W,H]=scene.size,spot=i=>scene.spots.find(s=>s.id===String(i));
 const art=(i,letter)=>`${BASE}assets/garden/v2/tree/${i!==0||letter==='A'?`common-${letter}`:`0${letter}`}.webp`;
 const getTree=()=>{const g=garden.get(),t=migrateTree(g.tree,g);if(!g.tree?.once?.migrated)garden.set({...g,tree:t});return t;};
 const setTree=t=>garden.set({...garden.get(),tree:normalizeTree(t)});
 function show(){
  const base=new URL(`${BASE}assets/garden/v2/tree/base.webp`,document.baseURI).href;
  root.className='gh-theme-view gh-spots-view gh-tree-view';root.style.setProperty('--tone','#ffd36b');
  root.innerHTML=`<header class="gh-top"><button class="gh-back" aria-label="정원으로">‹</button><div class="gh-title"><small>TREE OF LIFE</small><b>생명의 나무</b></div><span class="gh-wallet gh-tree-shards"></span></header>
  <div class="gh-body"><div class="gh-stagebox gh-spotbox" style="--bg:url(${base})"><div class="gh-stage gh-spotstage" style="background-image:url(${base})"><div class="gh-layers"></div><div class="gh-marks"></div>
   <p class="gh-progress"></p></div></div>
  <section class="gh-tray gh-spot-tray"><div class="gh-tabs"><button data-tab="bag">씨앗 가방</button><button data-tab="craft">조각으로 만들기</button><button data-tab="book">씨앗 도감</button></div><div class="gh-pick"></div><div class="gh-list"></div></section></div>
  <p class="gh-toast" role="status" aria-live="polite"></p>`;
  $('.gh-back').onclick=onBack;
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;pick=null;paint();});
  layout();paint();observe?.($('.gh-stagebox'));
  if(!garden.get().tree?.once?.welcome){const g=garden.get(),t=normalizeTree(getTree());t.once.welcome=true;garden.set({...g,tree:t});setTimeout(()=>toast('생명의 나무가 새로 자라났어요 · 씨앗은 이제 보스와 어려운 도전에서만 얻어요'),400);}
 }
 function layout(){
  const box=$('.gh-stagebox'),st=$('.gh-stage');if(!box||!st)return;
  const cw=box.clientWidth,ch=box.clientHeight,fit=Math.min(cw/W,ch/H),s=cw<ch?Math.min(ch/H,cw*1.6/W):fit,wide=W*s>cw+1;
  st.style.width=Math.floor(W*s)+'px';st.style.height=Math.floor(H*s)+'px';
  box.classList.toggle('pan',wide);if(wide&&!box.dataset.centered){box.dataset.centered='1';box.scrollLeft=(W*s-cw)/2;}
 }
 function paint(){
  const t=getTree(),pct=(v,s)=>`${v/s*100}%`;
  $('.gh-layers').innerHTML=[...Array(TREE_PLOTS).keys()].map(i=>{const p=t.plots[i],sp=spot(i),letter=p&&plotArt(p,i);if(!sp||!letter)return '';const [x0,y0,x1,y1]=sp.box;
   const scale=letter==='A'?.5:letter==='B'?.75:1;
   return `<img class="gh-layer gh-plant${plotStage(p)==='bloom'?' bloom':''}" alt="" src="${art(i,letter)}" style="left:${pct(x0,W)};top:${pct(y0,H)};width:${pct(x1-x0,W)};height:${pct(y1-y0,H)};transform:scale(${scale});transform-origin:50% 100%;--glow:${glowOf(p.seed)}">`;}).join('');
  $('.gh-marks').innerHTML=[...Array(TREE_PLOTS).keys()].map(i=>{const sp=spot(i);if(!sp)return '';const p=t.plots[i];
   return `<button class="gh-mark${p?' filled':''}${pick===i?' on':''}${i===0?' center':''}" data-plot="${i}" aria-label="${esc(sp.name)}${p?` · ${esc(TREE_SEEDS[p.seed].name)} ${STAGE_NAME[plotStage(p)]}`:' · 비어 있음'}" style="left:${pct(sp.at[0],W)};top:${pct(sp.at[1],H)};${p?`--tone:${glowOf(p.seed)}`:''}"><span aria-hidden="true">${p?'✦':'＋'}</span></button>`;}).join('');
  root.querySelectorAll('[data-plot]').forEach(b=>b.onclick=e=>{e.stopPropagation();pick=pick===+b.dataset.plot?null:+b.dataset.plot;tab='bag';paint();});
  const bloomed=t.bloomed.length,total=Object.keys(TREE_SEEDS).length;
  $('.gh-progress').textContent=`개화 ${bloomed}/${total} · 던전·퍼즐·수호전을 할 때마다 물방울이 쌓여 자라요`;
  $('.gh-tree-shards').textContent=`조각 흔함 ${t.shards.common} · 희귀 ${t.shards.rare}`;
  root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  paintTray(t);
 }
 function seedCard(id,extra=''){const s=TREE_SEEDS[id];return `<span class="gh-seed-dot" style="--glow:${glowOf(id)}"></span><b>${esc(s.name)}</b><small>${TREE_RARITY[s.rarity].name}${extra}</small>`;}
 function paintTray(t){
  const bar=$('.gh-pick'),list=$('.gh-list');
  if(pick!==null){
   const p=t.plots[pick],sp=spot(pick);
   if(p){const st=plotStage(p),next=plotNextIn(p);
    bar.innerHTML=`<span><b>${esc(sp.name)}</b> · ${esc(TREE_SEEDS[p.seed].name)} · ${STAGE_NAME[st]}${next?` · 다음까지 물방울 ${next}`:' · 활짝 피었어요'}</span><button class="gh-clear">비우기</button><button class="gh-done">닫기</button>`;
    bar.querySelector('.gh-clear').onclick=()=>{if(!confirm(`${TREE_SEEDS[p.seed].name}을(를) 뽑을까요? 씨앗은 사라져요(개화 기록은 남아요).`))return;setTree(clearTreePlot(getTree(),pick).tree);pick=null;paint();};
    bar.querySelector('.gh-done').onclick=()=>{pick=null;paint();};list.innerHTML='';return;}
   const ids=Object.keys(t.bag).filter(id=>pick===0?TREE_SEEDS[id].rarity==='legend':TREE_SEEDS[id].rarity!=='legend');
   bar.innerHTML=`<span><b>${esc(sp.name)}</b> · ${pick===0?'전설 씨앗만 심을 수 있어요':'심을 씨앗을 골라요'}</span><button class="gh-done">닫기</button>`;
   bar.querySelector('.gh-done').onclick=()=>{pick=null;paint();};
   list.innerHTML=ids.length?ids.map(id=>`<button class="gh-item" data-plant="${id}">${seedCard(id,` × ${t.bag[id]}`)}</button>`).join(''):`<p class="gh-empty">${pick===0?'전설 씨앗이 없어요. 보스를 맞지 않고 쓰러뜨리거나 열 번 쓰러뜨리면 얻어요.':'가방에 씨앗이 없어요. 막 보스와 어려운 도전에서 얻어요.'}</p>`;
   list.querySelectorAll('[data-plant]').forEach(b=>b.onclick=()=>{const r=plantTreeSeed(getTree(),b.dataset.plant,pick);if(!r.ok){toast('여기에는 심을 수 없어요');return;}setTree(r.tree);audio?.play?.('evolve');toast(`${TREE_SEEDS[b.dataset.plant].name}을(를) 심었어요`);pick=null;paint();});
   return;
  }
  if(tab==='bag'){const ids=Object.keys(t.bag);bar.innerHTML='<small>빈 화단(＋)을 눌러 씨앗을 심어요. 가운데 큰 화단은 전설 씨앗 전용이에요.</small>';
   list.innerHTML=ids.length?ids.map(id=>`<div class="gh-item">${seedCard(id,` × ${t.bag[id]}`)}</div>`).join(''):'<p class="gh-empty">아직 씨앗이 없어요. 1막 보스를 처음 쓰러뜨리면 첫 씨앗을 받아요.</p>';}
  else if(tab==='craft'){bar.innerHTML=`<small>같은 씨앗을 또 얻으면 조각이 돼요. 흔함 ${TREE_RARITY.common.shardsToCraft}개 · 희귀 ${TREE_RARITY.rare.shardsToCraft}개로 원하는 씨앗을 만들어요.</small>`;
   const ids=Object.keys(TREE_SEEDS).filter(id=>TREE_SEEDS[id].rarity!=='legend');
   list.innerHTML=ids.map(id=>{const r=TREE_SEEDS[id].rarity,cost=TREE_RARITY[r].shardsToCraft;return `<button class="gh-item${t.shards[r]<cost?' poor':''}" data-craft="${id}">${seedCard(id,` · 조각 ${cost}`)}</button>`;}).join('');
   list.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{const r=craftTreeSeed(getTree(),b.dataset.craft);if(!r.ok){toast(r.reason==='shards'?`조각이 모자라요 (${r.need}개 필요)`:r.reason==='full'?'가방이 가득 찼어요':'만들 수 없는 씨앗이에요');return;}setTree(r.tree);audio?.play?.('pickup');toast(`${TREE_SEEDS[b.dataset.craft].name}을(를) 만들었어요`);paint();});}
  else{bar.innerHTML=`<small>피워 본 씨앗 ${t.bloomed.length}/${Object.keys(TREE_SEEDS).length}</small>`;
   list.innerHTML=Object.keys(TREE_SEEDS).map(id=>{const done=t.bloomed.includes(id);return `<div class="gh-item${done?' done':' locked'}" title="${esc(TREE_SEEDS[id].how)}">${seedCard(id,done?' · 개화':` · ${esc(TREE_SEEDS[id].how)}`)}</div>`;}).join('');}
 }
 return {show,layout,paint,get pick(){return pick;},debug:{pick:i=>{pick=i;paint();},tab:x=>{tab=x;pick=null;paint();}}};
}
