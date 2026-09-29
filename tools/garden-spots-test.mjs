// 자리 꾸미기(정원 v2): 사기·바꿔 끼우기·비우기·저장 정리·두 기기 합치기·다음 정원 열림.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {SPOT_SCENES,SPOT_STYLE_IDS,spotPrice,spotArt,spotBase,chooseSpotStyle,clearSpot,spotsFilled,spotsTotal,normalizeSpots,mergeSpots,spotEntry} from '../src/garden-spots.js';
import {themeUnlocked,themeLockInfo,themeProgress,recordOpenedThemes} from '../src/garden-themes.js';
import {normalizeGarden,emptyGarden} from '../src/garden.js';

const G0=normalizeGarden(emptyGarden());
// 그림 파일이 모두 있다(빈 장면 + 자리 × 스타일 3).
for(const [theme,scene] of Object.entries(SPOT_SCENES)){
 assert.ok(existsSync('public/'+spotBase(theme)),`${theme} base`);
 for(const s of scene.spots){assert.equal(s.box.length,4);for(const st of SPOT_STYLE_IDS){assert.ok(s.styles[st],`${theme} ${s.id}${st} name`);assert.ok(existsSync('public/'+spotArt(theme,s.id,st)),`${theme} ${s.id}${st} art`);}}
}
// 사기: 돈이 모자라면 못 사고, 산 모습은 무료로 다시 끼운다.
let paid=0;const spend=p=>{paid+=p;return true;},broke=()=>false;
assert.equal(chooseSpotStyle(G0,'greenhouse','1','A',{spend:broke}).ok,false);
let r=chooseSpotStyle(G0,'greenhouse','1','A',{spend});assert.ok(r.ok);assert.equal(r.paid,spotPrice('A'));assert.equal(spotsFilled(r.garden,'greenhouse'),1);
r=chooseSpotStyle(r.garden,'greenhouse','1','C',{spend});assert.equal(r.paid,spotPrice('C'));
r=chooseSpotStyle(r.garden,'greenhouse','1','A',{spend:broke});assert.ok(r.ok,'owned style is free');assert.equal(r.paid,0);assert.deepEqual(spotEntry(r.garden,'greenhouse','1'),{on:'A',own:['A','C']});
assert.equal(spotPrice('C',1.5),600);assert.equal(chooseSpotStyle(G0,'greenhouse','99','A',{spend}).ok,false);assert.equal(chooseSpotStyle(G0,'nope','1','A',{spend}).ok,false);
const cleared=clearSpot(r.garden,'greenhouse','1');assert.equal(spotsFilled(cleared.garden,'greenhouse'),0);assert.deepEqual(spotEntry(cleared.garden,'greenhouse','1').own,['A','C']);
// 저장 정리: 이상한 값은 버린다.
assert.deepEqual(normalizeSpots({greenhouse:{'1':{on:'Z',own:['A','Q']},'77':{on:'A',own:['A']}},nope:{}}),{greenhouse:{'1':{on:null,own:['A']}}});
assert.deepEqual(normalizeGarden({...r.garden}).spots,r.garden.spots,'garden keeps spots');
// 다음 정원: 온실 자리를 모두 채우면 초원이 열린다.
assert.equal(themeUnlocked(G0,'meadow'),false);assert.equal(themeLockInfo(G0,'meadow').spots,true);assert.equal(themeLockInfo(G0,'meadow').need,spotsTotal('greenhouse'));
let G=G0;for(const s of SPOT_SCENES.greenhouse.spots)G=chooseSpotStyle(G,'greenhouse',s.id,'A',{spend}).garden;
assert.deepEqual(themeProgress(G,'greenhouse'),{have:spotsTotal('greenhouse'),need:spotsTotal('greenhouse'),spots:true});
assert.equal(themeUnlocked(G,'meadow'),true);assert.deepEqual(recordOpenedThemes(G).fresh,['meadow']);
// 두 기기: 산 모습은 합치고, 끼운 것은 고른 쪽.
const m=mergeSpots({greenhouse:{'1':{on:'A',own:['A']}}},{greenhouse:{'1':{on:'B',own:['B']},'2':{on:'C',own:['C']}}},'local');
assert.deepEqual(m,{greenhouse:{'1':{on:'A',own:['A','B']},'2':{on:'C',own:['C']}}});
console.log('garden spots ok');
