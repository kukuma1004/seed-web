// 정원 입구(허브)와 테마 정원 꾸미기 화면.
// 허브: 정원 그림 위 표지판을 눌러 테마로 들어간다(온실부터 차례로 열린다). 생명의 나무는 기존 3D 정원으로 간다.
// 테마: 가게에서 JP로 구성물을 사서 아무 곳에나 끌어다 놓는다. 뒤집기 · 크기 · 앞으로 · 보관(가방).
import {GARDEN_THEMES,GARDEN_OBJECTS,OBJECT_KINDS,THEME_UNLOCK_PLACED,THEME_MAX_ITEMS,themeCatalog,themeUnlocked,themeLockInfo,themeItemCount,buyObject,placeFromBag,moveObject,storeObject,bringToFront,themeDrawOrder} from './garden-themes.js';
import {GARDEN_OBJECT_ART,GARDEN_THEME_ART} from './garden-theme-art.js';
import './garden-hub.css';

const BASE=import.meta.env.BASE_URL,ART=BASE+'assets/garden/';
const HUB=[1281,778];
// 허브 그림 속 표지판 가운데(그림 픽셀). 어둠 · 설렘은 그림에 없어서 아래 줄 카드로 연다.
const SIGNS={blossom:[170,91],meadow:[101,271],fire:[120,428],snow:[1063,91],moon:[1175,250],autumn:[1087,336],greenhouse:[1038,537]};
const TREE=[593,85];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jp=n=>Number(n||0).toLocaleString('ko-KR');

// 아틀라스 한 칸을 w×h 상자에 그리는 CSS.
function spriteStyle(obj,h){
 const art=GARDEN_OBJECT_ART[obj.set],[, ,x,y,bw,bh]=art.items[obj.index],k=h/bh;
 return {w:bw*k,h,css:`background-image:url(${ART}objects-${obj.set}-v1.webp);background-size:${art.size[0]*k}px ${art.size[1]*k}px;background-position:${-x*k}px ${-y*k}px`};
}

export function mountGardenHub({host=document.body,audio=null,garden,wallet=()=>0,onSpend=()=>false,onOpenSanctuary=null,onClose=()=>{},start=null}={}){
 const root=document.createElement('section');root.id='garden-hub';root.setAttribute('aria-label','정원');
 host.append(root);document.body.classList.add('garden-hub-open');
 const listeners=[];let closed=false,view='hub',theme=null,toastTimer=0,sel=-1,drag=null,tab='shop',pick=null;
 const listen=(t,n,f,o)=>{t.addEventListener(n,f,o);listeners.push(()=>t.removeEventListener(n,f,o));};
 const $=q=>root.querySelector(q);
 const g=()=>garden.get();
 function close(){if(closed)return;closed=true;ro?.disconnect();clearTimeout(toastTimer);for(const off of listeners)off();root.remove();document.body.classList.remove('garden-hub-open');onClose();}
 function toast(text){const el=$('.gh-toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}
 function announce(fresh){if(!fresh?.length)return;const t=GARDEN_THEMES.find(x=>x.id===fresh[0]);audio?.play?.('evolve');toast(`✦ ${t.name}이(가) 열렸어요!`);}

 // ── 허브
 function hub(){
  view='hub';theme=null;sel=-1;const G=g();
  const nextLocked=GARDEN_THEMES.find(t=>!themeUnlocked(G,t.id)),info=nextLocked&&themeLockInfo(G,nextLocked.id);
  root.className='gh-hub-view';
  root.innerHTML=`<header class="gh-top"><button class="gh-back" aria-label="처음 화면으로">‹</button><div class="gh-title"><small>S E E D</small><b>나의 정원</b></div><span class="gh-wallet" title="보유 JP">${jp(wallet())} JP</span></header>
  <div class="gh-scroll"><div class="gh-map" style="background-image:url(${ART}hub-v1.webp)">
   <button class="gh-tree" style="left:${TREE[0]/HUB[0]*100}%;top:${TREE[1]/HUB[1]*100}%"><b>생명의 나무</b><small>씨앗이 자라는 곳</small></button>
   ${Object.entries(SIGNS).map(([id,[x,y]])=>sign(G,id,x,y)).join('')}
  </div></div>
  <nav class="gh-extra">${['shadow','dream'].map(id=>card(G,id)).join('')}
   <p class="gh-hint">${info?`다음: <b>${esc(nextLocked.name)}</b> · ${esc(info.prevName)}에 구성물 ${Math.min(info.have,info.need)}/${info.need}`:'모든 테마 정원이 열렸어요'}</p></nav>
  <p class="gh-toast" role="status" aria-live="polite"></p>`;
  $('.gh-back').onclick=close;
  $('.gh-tree').onclick=()=>{if(onOpenSanctuary){closed=true;ro?.disconnect();for(const off of listeners)off();root.remove();document.body.classList.remove('garden-hub-open');onOpenSanctuary();}};
  root.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>enter(b.dataset.theme));
  layoutHub();observe($('.gh-scroll'));if(ro&&$('.gh-extra'))ro.observe($('.gh-extra'));// 아래 줄이 접혀 높이가 바뀌어도 다시 맞춘다
  // 처음 보는 자리: 조금만 넘치는 넓은 화면(패드·PC)은 가운데, 세로 화면은 생명의 나무와 온실 사이, 세로는 표지판들이 모인 띠가 가운데 오게.
  const sc=$('.gh-scroll'),mh=$('.gh-map').offsetHeight;sc.scrollLeft=sc.scrollWidth-sc.clientWidth<sc.clientWidth*.3?(sc.scrollWidth-sc.clientWidth)/2:Math.max(0,(TREE[0]+SIGNS.greenhouse[0])/2/HUB[0]*sc.scrollWidth-sc.clientWidth/2);sc.scrollTop=Math.max(0,(85+537)/2/HUB[1]*mh-sc.clientHeight/2);
 }
 function sign(G,id,x,y){
  const t=GARDEN_THEMES.find(q=>q.id===id),open=themeUnlocked(G,id),n=themeItemCount(G,id);
  return `<button class="gh-sign${open?'':' locked'}" data-theme="${id}" style="left:${x/HUB[0]*100}%;top:${y/HUB[1]*100}%;--tone:${t.tone}"><b>${open?'':'<i aria-hidden="true">🔒</i>'}${esc(t.name)}</b>${open?`<small>구성물 ${n}</small>`:''}</button>`;
 }
 function card(G,id){
  const t=GARDEN_THEMES.find(q=>q.id===id),open=themeUnlocked(G,id);
  return `<button class="gh-card${open?'':' locked'}" data-theme="${id}" style="background-image:url(${ART}theme-${id}-v1.webp);--tone:${t.tone}"><b>${open?'':'🔒 '}${esc(t.name)}</b></button>`;
 }
 // 세로 화면: 높이를 채우고 옆으로 밀어 본다. 넓은 화면: 폭에 맞춘다.
 function layoutHub(){
  const sc=$('.gh-scroll'),map=$('.gh-map');if(!sc||!map)return;
  // 아래 줄(어둠·설렘 카드·다음 안내)이 그림 아랫부분을 가리지 않게 그림 영역을 그 위까지만 쓴다.
  // 낮은 가로 휴대폰은 줄이 왼쪽 아래 작은 판이라 예전처럼 그림 위에 얹는다.
  const ex=$('.gh-extra'),lowLandscape=matchMedia('(orientation:landscape) and (max-height:620px)').matches;
  sc.style.bottom=ex&&!lowLandscape?ex.offsetHeight+'px':'';
  const cw=sc.clientWidth,ch=sc.clientHeight;let s=ch/HUB[1];if(HUB[0]*s<cw)s=cw/HUB[0];
  map.style.width=HUB[0]*s+'px';map.style.height=HUB[1]*s+'px';map.style.setProperty('--s',Math.max(.55,Math.min(1.25,s)));
 }
 function enter(id){
  const G=g();
  if(!themeUnlocked(G,id)){const i=themeLockInfo(G,id);toast(i.prevOpen?`🔒 ${i.prevName}에 구성물을 ${i.need}개 놓으면 열려요 (${Math.min(i.have,i.need)}/${i.need})`:`🔒 앞 정원부터 차례로 열려요 · 지금은 ${i.prevName}도 잠겨 있어요`);return;}
  themeView(id);
 }

 // ── 테마 꾸미기
 function themeView(id){
  view='theme';theme=GARDEN_THEMES.find(t=>t.id===id);sel=-1;pick=null;
  root.className='gh-theme-view';root.style.setProperty('--tone',theme.tone);
  root.innerHTML=`<header class="gh-top"><button class="gh-back" aria-label="정원으로">‹</button><div class="gh-title"><small>${esc(theme.en)}</small><b>${esc(theme.name)}</b></div><span class="gh-wallet" title="보유 JP"></span></header>
  <div class="gh-body"><div class="gh-stagebox"><div class="gh-stage" style="background-image:url(${ART}theme-${id}-v1.webp)"><div class="gh-items"></div>
   <p class="gh-quote">“${esc(theme.quote)}”</p><p class="gh-progress"></p>
   <div class="gh-tools" hidden><button data-act="flip" title="좌우 뒤집기">⇋</button><button data-act="smaller" title="작게">−</button><button data-act="bigger" title="크게">＋</button><button data-act="front" title="맨 앞으로">⬆</button><button data-act="store" title="가방에 보관">보관</button></div>
  </div></div>
  <section class="gh-tray"><div class="gh-tabs"><button data-tab="shop">가게</button><button data-tab="bag">가방</button></div><div class="gh-pick"></div><div class="gh-list"></div></section></div>
  <p class="gh-toast" role="status" aria-live="polite"></p>`;
  $('.gh-back').onclick=hub;
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;pick=null;paintTray();});
  root.querySelectorAll('[data-act]').forEach(b=>b.onclick=e=>{e.stopPropagation();act(b.dataset.act);});
  $('.gh-stage').addEventListener('pointerdown',e=>{if(e.target===$('.gh-stage')||e.target===$('.gh-items')){sel=-1;paintItems();}});
  paintTray();layoutStage();paintItems();
  observe($('.gh-stagebox'));
 }
 const stageRect=()=>{const st=$('.gh-stage');return {w:st.clientWidth,h:st.clientHeight};};
 function layoutStage(){
  const box=$('.gh-stagebox'),st=$('.gh-stage');if(!box||!st)return;
  const [aw,ah]=GARDEN_THEME_ART[theme.id],cw=box.clientWidth,ch=box.clientHeight,s=Math.min(cw/aw,ch/ah);
  st.style.width=Math.floor(aw*s)+'px';st.style.height=Math.floor(ah*s)+'px';
 }
 // 크기: 종류 기본 × 사용자 배율 × 깊이(아래쪽일수록 가깝고 크다).
 const itemHeight=(obj,it,H)=>H*obj.size*it.s*(.62+.55*it.v);
 function paintItems(){
  const G=g(),items=G.themes[theme.id]||[],{h:H,w:W}=stageRect(),layer=$('.gh-items');
  layer.innerHTML=themeDrawOrder(items).map((it,z)=>{const obj=GARDEN_OBJECTS[it.k],sp=spriteStyle(obj,itemHeight(obj,it,H));
   return `<div class="gh-obj${it.i===sel?' sel':''}" data-i="${it.i}" title="${esc(obj.name)}" style="left:${it.u*W-sp.w/2}px;top:${it.v*H-sp.h}px;width:${sp.w}px;height:${sp.h}px;z-index:${z+1}"><i style="${sp.css}${it.f?';transform:scaleX(-1)':''}"></i></div>`;}).join('');
  layer.querySelectorAll('.gh-obj').forEach(el=>el.addEventListener('pointerdown',e=>startDrag(e,+el.dataset.i)));
  const tools=$('.gh-tools'),cur=items[sel];tools.hidden=!cur;
  if(cur){const el=layer.querySelector(`[data-i="${sel}"]`),r=el.getBoundingClientRect(),sr=$('.gh-stage').getBoundingClientRect();
   const x=Math.max(90,Math.min(W-90,r.left-sr.left+r.width/2)),y=r.top-sr.top-44;tools.style.left=x+'px';tools.style.top=(y<6?r.bottom-sr.top+8:y)+'px';}
  const n=items.length,next=GARDEN_THEMES[GARDEN_THEMES.indexOf(theme)+1],prog=$('.gh-progress');
  prog.textContent=next&&!themeUnlocked(G,next.id)?`구성물 ${n} · ${next.name}까지 ${Math.min(n,THEME_UNLOCK_PLACED)}/${THEME_UNLOCK_PLACED}`:`구성물 ${n}/${THEME_MAX_ITEMS}`;
  $('.gh-wallet').textContent=`${jp(wallet())} JP`;
 }
 function startDrag(e,i){
  e.preventDefault();e.stopPropagation();
  const G=g(),it=G.themes[theme.id][i],sr=$('.gh-stage').getBoundingClientRect();
  if(sel!==i){sel=i;paintItems();}
  drag={i,id:e.pointerId,x0:e.clientX,y0:e.clientY,u0:it.u,v0:it.v,u:it.u,v:it.v,moved:false,sr};
  const el=root.querySelector(`.gh-obj[data-i="${i}"]`);el?.setPointerCapture?.(e.pointerId);el?.classList.add('dragging');
 }
 function onMove(e){
  if(!drag||e.pointerId!==drag.id)return;
  const {sr}=drag,dx=e.clientX-drag.x0,dy=e.clientY-drag.y0;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;
  drag.u=Math.max(0,Math.min(1,drag.u0+dx/sr.width));drag.v=Math.max(.05,Math.min(1,drag.v0+dy/sr.height));
  const el=root.querySelector(`.gh-obj[data-i="${drag.i}"]`);if(!el)return;
  const G=g(),it=G.themes[theme.id][drag.i],obj=GARDEN_OBJECTS[it.k],h=itemHeight(obj,{...it,v:drag.v},sr.height),sp=spriteStyle(obj,h);
  el.style.left=drag.u*sr.width-sp.w/2+'px';el.style.top=drag.v*sr.height-h+'px';el.style.width=sp.w+'px';el.style.height=h+'px';el.firstElementChild.style.cssText=sp.css+(it.f?';transform:scaleX(-1)':'');
  $('.gh-tools').hidden=true;
 }
 function onUp(e){
  if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
  if(d.moved){const r=moveObject(g(),theme.id,d.i,{u:d.u,v:d.v});if(r.ok)garden.set(r.garden);}
  paintItems();
 }
 function act(a){
  const G=g(),items=G.themes[theme.id],cur=items[sel];if(!cur)return;let r=null;
  if(a==='flip')r=moveObject(G,theme.id,sel,{f:cur.f?0:1});
  else if(a==='smaller')r=moveObject(G,theme.id,sel,{s:Math.max(.6,cur.s-.15)});
  else if(a==='bigger')r=moveObject(G,theme.id,sel,{s:Math.min(1.6,cur.s+.15)});
  else if(a==='front'){r=bringToFront(G,theme.id,sel);if(r.ok)sel=r.index;}
  else if(a==='store'){r=storeObject(G,theme.id,sel);if(r.ok){sel=-1;toast(`${GARDEN_OBJECTS[r.key].name} · 가방에 보관했어요`);}}
  if(r?.ok){garden.set(r.garden);paintItems();if(a==='store')paintTray();}
 }
 // 새로 놓는 자리: 가운데 근처에서 조금씩 비껴 겹치지 않게.
 function freeSpot(){const n=(g().themes[theme.id]||[]).length;return {u:.5+((n*37)%9-4)*.06,v:.62+((n*53)%5-2)*.06};}
 function paintTray(){
  const G=g();root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  const bag=Object.entries(G.bag||{}),bagN=bag.reduce((a,[,n])=>a+n,0);root.querySelector('[data-tab="bag"]').textContent=`가방 ${bagN}`;
  const list=$('.gh-list'),coins=wallet();
  const entries=tab==='shop'?themeCatalog(theme.id).map(o=>({o,n:0})):bag.map(([k,n])=>({o:GARDEN_OBJECTS[k],n}));
  list.innerHTML=entries.length?entries.map(({o,n})=>{const sp=spriteStyle(o,Math.min(64,64*OBJECT_KINDS[o.kind].size/.3+18));
   return `<button class="gh-item${pick===o.id?' on':''}${tab==='shop'&&o.price>coins?' poor':''}" data-k="${o.id}"><span class="gh-thumb"><i style="width:${sp.w}px;height:${sp.h}px;${sp.css}"></i></span><b>${esc(o.name)}</b><small>${tab==='shop'?`${o.price} JP`:`× ${n}`}</small></button>`;}).join('')
   :`<p class="gh-empty">${tab==='bag'?'보관한 구성물이 없어요. 놓인 구성물을 눌러 ‘보관’하면 여기로 와요.':'살 수 있는 구성물이 없어요.'}</p>`;
  list.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{pick=pick===b.dataset.k?null:b.dataset.k;paintTray();});
  const bar=$('.gh-pick');
  if(!pick){bar.innerHTML=tab==='shop'?'<small>구성물을 고르면 정원에 놓을 수 있어요</small>':'';return;}
  const o=GARDEN_OBJECTS[pick];
  bar.innerHTML=tab==='shop'?`<span>${esc(o.name)} · ${esc(OBJECT_KINDS[o.kind].label)}</span><button class="gh-buy"${o.price>coins?' disabled':''}>${o.price} JP로 놓기</button>`:`<span>${esc(o.name)}</span><button class="gh-buy">정원에 놓기</button>`;
  bar.querySelector('.gh-buy').onclick=()=>place(o);
 }
 function place(o){
  const G=g(),spot=freeSpot();let r;
  if(tab==='shop'){r=buyObject(G,theme.id,o.id,{...spot,spend:price=>onSpend(price)});}
  else r=placeFromBag(G,theme.id,o.id,spot);
  if(!r.ok){toast(r.reason==='coins'?'JP가 모자라요 · 던전과 씨앗 맞추기에서 모을 수 있어요':r.reason==='full'?`한 정원에는 ${THEME_MAX_ITEMS}개까지 놓을 수 있어요`:'지금은 놓을 수 없어요');return;}
  garden.set(r.garden);audio?.play?.('pickup');sel=r.index;pick=tab==='bag'&&(r.garden.bag||{})[o.id]?o.id:null;
  paintItems();paintTray();
  const el=root.querySelector(`.gh-obj[data-i="${r.index}"]`);el?.classList.add('pop');
  if(r.fresh?.length)announce(r.fresh);else toast(tab==='shop'?`${o.name} · 끌어서 원하는 곳에 옮겨 보세요`:`${o.name}을(를) 놓았어요`);
 }

 function onResize(){if(closed)return;if(view==='hub')layoutHub();else if(!drag){layoutStage();paintItems();}}
 // 트레이가 그려지거나 화면이 돌아가면 크기를 다시 잰다.
 let ro=null;function observe(el){ro?.disconnect();if(typeof ResizeObserver==='function'&&el){ro=new ResizeObserver(()=>onResize());ro.observe(el);}}
 function onKey(e){if(e.code!=='Escape')return;e.preventDefault();if(view==='theme'){if(sel>=0){sel=-1;paintItems();}else hub();}else close();}
 listen(window,'resize',onResize);listen(window,'pointermove',onMove);listen(window,'pointerup',onUp);listen(window,'pointercancel',onUp);listen(window,'keydown',onKey);
 if(start&&themeUnlocked(g(),start))themeView(start);else hub();
 return {close,hub,enter,get view(){return view;},get theme(){return theme?.id||null;},debug:{select:i=>{sel=i;paintItems();},pick:k=>{pick=k;paintTray();},place:()=>pick&&place(GARDEN_OBJECTS[pick]),tab:t=>{tab=t;pick=null;paintTray();}}};
}
