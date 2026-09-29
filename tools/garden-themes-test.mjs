import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {GARDEN_THEMES,GARDEN_THEME_IDS,GARDEN_OBJECTS,OBJECT_KINDS,THEME_UNLOCK_PLACED,THEME_MAX_ITEMS,themeCatalog,themeUnlocked,themeLockInfo,buyObject,placeFromBag,moveObject,storeObject,bringToFront,themeDrawOrder,normalizeThemes,normalizeBag,ownedCount} from '../src/garden-themes.js';
import {GARDEN_OBJECT_ART,GARDEN_THEME_ART} from '../src/garden-theme-art.js';
import {normalizeGarden,emptyGarden} from '../src/garden.js';
import {mergeGardenProgress} from '../src/cloud-save.js';
import {SPOT_SCENES,chooseSpotStyle,spotsTotal} from '../src/garden-spots.js';
import {recordOpenedThemes} from '../src/garden-themes.js';

// 테마 9곳, 온실이 처음. 그림 파일이 다 있다.
assert.equal(GARDEN_THEMES.length,9);assert.equal(GARDEN_THEME_IDS[0],'greenhouse');assert.equal(new Set(GARDEN_THEME_IDS).size,9);
for(const id of GARDEN_THEME_IDS){assert.ok(GARDEN_THEME_ART[id],id);assert.ok(existsSync(`public/assets/garden/theme-${id}-v1.webp`),id);}
assert.ok(existsSync('public/assets/garden/hub-v1.webp'));
for(const [set,art] of Object.entries(GARDEN_OBJECT_ART)){assert.ok(existsSync(`public/assets/garden/objects-${set}-v1.webp`),set);
 for(const [name,kind,x,y,w,h] of art.items){assert.ok(OBJECT_KINDS[kind],name);assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=art.size[0]&&y+h<=art.size[1],name);}}
// 값: 모두 10 JP 단위, 꽃이 가장 싸고 큰 구조물이 가장 비싸다. 뒤 테마일수록 같은 종류가 비싸다.
const objs=Object.values(GARDEN_OBJECTS);assert.ok(objs.length>=150);
for(const o of objs){assert.equal(o.price%10,0,o.id);assert.ok(o.price>=70&&o.price<=1100,o.id);}
const price=(set,kind)=>objs.find(o=>o.set===set&&o.kind===kind)?.price;
assert.ok(price('greenhouse','p')<price('blossom','p'));assert.ok(price('meadow','T')<price('fire','T'));
// 가게: 테마 세트 + 공용 소품. 설렘의 정원은 전부 판다. 온실 첫 물건은 가볍게 살 수 있다.
for(const id of GARDEN_THEME_IDS){const c=themeCatalog(id);assert.ok(c.length>=12,id);assert.ok(c.some(o=>o.set==='etc'),id);}
assert.equal(themeCatalog('dream').length,objs.length);
assert.ok(Math.min(...themeCatalog("greenhouse").map(o=>o.price))<=110);

// 처음에는 온실만 열려 있다.
let g=normalizeGarden({});
assert.deepEqual(GARDEN_THEME_IDS.filter(id=>themeUnlocked(g,id)),['greenhouse']);
// 온실은 자리 꾸미기(v2)라 초원은 온실 자리를 모두 채우면 열린다.
assert.deepEqual(themeLockInfo(g,'meadow'),{locked:true,prev:'greenhouse',prevName:'온실',need:spotsTotal('greenhouse'),have:0,spots:true,prevOpen:true});
assert.equal(themeLockInfo(g,'blossom').prevOpen,false);
// 잠긴 테마 · 다른 테마 세트 · 돈이 모자라면 못 산다(돈은 빠지지 않는다).
let coins=1000;const spend=p=>coins>=p?(coins-=p,true):false;
assert.equal(buyObject(g,'meadow','meadow.0',{spend}).reason,'locked');
assert.equal(buyObject(g,'greenhouse','fire.0',{spend}).reason,'catalog');
assert.equal(buyObject(g,'greenhouse','nope',{spend}).reason,'object');
assert.equal(buyObject(g,'greenhouse','greenhouse.0',{spend:()=>false}).reason,'coins');assert.equal(coins,1000);
// 예전 구성물을 온실에 여섯 개 놓아도 초원은 안 열리고, 온실 자리를 모두 채우면 열린다(fresh로 알려 준다).
let opened=[];
for(let i=0;i<THEME_UNLOCK_PLACED;i++){const r=buyObject(g,'greenhouse',`greenhouse.${i}`,{u:.1*i+.2,v:.6,spend});assert.ok(r.ok);g=r.garden;opened.push(...r.fresh);}
assert.deepEqual(opened,[]);assert.ok(!themeUnlocked(g,'meadow'));
for(const s of SPOT_SCENES.greenhouse.spots)g=chooseSpotStyle(g,'greenhouse',s.id,'A',{}).garden;
{const rec=recordOpenedThemes(g);g=rec.garden;opened.push(...rec.fresh);}
assert.deepEqual(opened,['meadow']);assert.ok(themeUnlocked(g,'meadow'));assert.ok(!themeUnlocked(g,'blossom'));
// 초원(예전 방식)은 구성물 여섯 개로 벚꽃을 연다.
{let h=g;for(let i=0;i<THEME_UNLOCK_PLACED;i++)h=buyObject(h,'meadow',`meadow.${i}`,{}).garden;assert.ok(themeUnlocked(h,'blossom'));}
assert.equal(coins,1000-themeCatalog('greenhouse').slice(0,THEME_UNLOCK_PLACED).reduce((n,o)=>n+o.price,0));
// 옮기기 · 뒤집기 · 크기(범위 안으로) · 맨 앞으로 · 그리는 차례(위쪽부터).
g=moveObject(g,'greenhouse',0,{u:1.4,v:.3,s:9,f:1}).garden;assert.deepEqual(g.themes.greenhouse[0],{k:'greenhouse.0',u:1,v:.3,s:1.6,f:1});
assert.equal(themeDrawOrder(g.themes.greenhouse)[0].k,'greenhouse.0');
const front=bringToFront(g,'greenhouse',0);assert.equal(front.index,5);assert.equal(front.garden.themes.greenhouse[5].k,'greenhouse.0');
// 치우면 가방으로. 앞 테마를 치워도 이미 열린 테마는 닫히지 않는다. 가방에서 다른 테마에 놓을 수 있다.
const st=storeObject(g,'greenhouse',0);g=st.garden;assert.equal(st.key,'greenhouse.0');assert.deepEqual(g.bag,{'greenhouse.0':1});
assert.equal(g.themes.greenhouse.length,THEME_UNLOCK_PLACED-1);assert.ok(themeUnlocked(g,'meadow'));
assert.equal(ownedCount(g),THEME_UNLOCK_PLACED);
const pb=placeFromBag(g,'meadow','greenhouse.0',{u:.4,v:.8});assert.ok(pb.ok);g=pb.garden;assert.deepEqual(g.bag,{});assert.equal(g.themes.meadow.length,1);
assert.equal(placeFromBag(g,'meadow','greenhouse.0').reason,'bag');
// 한 테마에 최대 개수.
{let f={...g,themes:{...g.themes,dream:[]},themesOpened:[...GARDEN_THEME_IDS.slice(1)]};for(let i=0;i<THEME_MAX_ITEMS;i++)f=buyObject(f,'dream','etc.7',{}).garden;assert.equal(buyObject(f,'dream','etc.7',{}).reason,'full');}
// 저장: 이상한 값은 버리고, 저장·불러오기를 거쳐도 그대로.
assert.deepEqual(normalizeThemes({greenhouse:[{k:'bad'},{k:'greenhouse.1',u:'x',v:2}],fire:'no'}).greenhouse,[{k:'greenhouse.1',u:.5,v:1,s:1,f:0}]);
assert.deepEqual(normalizeBag({'greenhouse.1':2,'bad':1,'etc.0':-1,'etc.1':1.5}),{'greenhouse.1':2});
assert.deepEqual(normalizeGarden(JSON.parse(JSON.stringify(g))).themes,g.themes);
assert.deepEqual(normalizeGarden(JSON.parse(JSON.stringify(g))).themesOpened,['meadow']);
assert.deepEqual(emptyGarden().themes.greenhouse,[]);
// 클라우드 합치기: 구성물이 더 많은 쪽 배치, 열린 테마는 합친다(Firebase는 빈 배열을 버리므로 칸이 없어도 된다).
{const remote=JSON.parse(JSON.stringify(emptyGarden()));delete remote.themes;delete remote.bag;
 const m=mergeGardenProgress(g,remote);assert.deepEqual(m.themes,g.themes);assert.deepEqual(m.themesOpened,['meadow']);
 const m2=mergeGardenProgress(emptyGarden(),g,{prefer:'local'});assert.deepEqual(m2.themes,g.themes);}
console.log('garden themes ok');
