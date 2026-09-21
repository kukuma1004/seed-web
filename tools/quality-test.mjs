import assert from 'node:assert/strict';
import {QUALITY_LEVELS,QUALITY_NAMES,initialQuality,clampLevel,renderPixelRatio,resetAutoLowered,QUALITY_KEY,QUALITY_RESET_KEY} from '../src/quality.js';
import * as qualityModule from '../src/quality.js';
import fs from 'node:fs';

// Levels get cheaper step by step and never change gameplay fields.
assert.equal(QUALITY_LEVELS.length,3);assert.equal(QUALITY_NAMES.length,3);
assert.ok(QUALITY_LEVELS[0].pixelRatio<QUALITY_LEVELS[1].pixelRatio&&QUALITY_LEVELS[1].pixelRatio<QUALITY_LEVELS[2].pixelRatio);
assert.deepEqual(QUALITY_LEVELS.map(q=>q.bloom),['off','half','full']);
assert.deepEqual(QUALITY_LEVELS.map(q=>q.shadows),[false,false,true],'mobile default uses contact shadows without a periodic sun-shadow pass');
assert.deepEqual(QUALITY_LEVELS.map(q=>q.lanternLights),[false,false,true]);

// Start level: URL override > saved device level > phone 1 / computer 2.
assert.equal(initialQuality({mobile:false}),2);assert.equal(initialQuality({mobile:true}),1);
assert.equal(initialQuality({stored:'0'}),0);assert.equal(initialQuality({stored:'1',mobile:false}),1);
assert.equal(initialQuality({search:'?quality=2',stored:'0'}),2);
assert.equal(initialQuality({search:'?quality=9',stored:'1'}),2,'out of range clamps');
assert.equal(initialQuality({stored:'junk',mobile:false}),2);assert.equal(clampLevel(1.5),null);

// 자동 화질 낮춤은 없다(2026-09-21 사용자 결정): 감시기도, 화면 손실 때 한 단계 낮춰 저장하는 것도 없다.
assert.equal('createQualityGovernor' in qualityModule,false);
{const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(main,/qualityGovernor|createQualityGovernor/);
 assert.doesNotMatch(main,/setItem\(QUALITY_KEY,String\(Math\.max\(0,qualityLevel-1\)\)\)/);}
// 예전 자동 낮춤이 남긴 값은 한 번만 기기 기본값으로 돌린다. 기본 이상이거나 저장값이 없으면 그대로.
{
 const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m};};
 const phone=mem();phone.setItem(QUALITY_KEY,'0');assert.equal(resetAutoLowered(phone,{mobile:true}),true);assert.equal(phone.getItem(QUALITY_KEY),'1');
 phone.setItem(QUALITY_KEY,'0');assert.equal(resetAutoLowered(phone,{mobile:true}),false,'두 번째부터는 플레이어 선택을 존중');assert.equal(phone.getItem(QUALITY_KEY),'0');
 const pc=mem();pc.setItem(QUALITY_KEY,'1');resetAutoLowered(pc,{mobile:false});assert.equal(pc.getItem(QUALITY_KEY),'2');
 const high=mem();high.setItem(QUALITY_KEY,'2');resetAutoLowered(high,{mobile:true});assert.equal(high.getItem(QUALITY_KEY),'2');
 const empty=mem();resetAutoLowered(empty,{mobile:true});assert.equal(empty.getItem(QUALITY_KEY),null);assert.equal(empty.getItem(QUALITY_RESET_KEY),'1');
}
// Pixel ratio: computers and tablets keep the level floor; a sideways phone draws a sharper frame up to the level budget.
{const [low,mid,high]=QUALITY_LEVELS;
 assert.equal(renderPixelRatio(low,{width:1600,height:900,dpr:1.25}),.85);assert.equal(renderPixelRatio(mid,{width:1600,height:900,dpr:2}),1);assert.equal(renderPixelRatio(high,{width:1600,height:900,dpr:2}),1.5);
 assert.equal(renderPixelRatio(mid,{width:1180,height:820,dpr:2}),1);
 const phone=l=>renderPixelRatio(l,{width:915,height:412,dpr:3});
 assert.ok(phone(low)>1&&phone(low)<phone(mid)&&phone(mid)<phone(high)&&phone(high)<=2);
 for(const l of QUALITY_LEVELS)assert.ok(915*412*phone(l)**2<=l.pixelBudget*1.02||phone(l)===l.pixelRatio);
 assert.equal(renderPixelRatio(high,{width:915,height:412,dpr:1}),1,'never above the device ratio');}
console.log('화질: 세 단계·시작 화질(주소·저장·기기)·자동 낮춤 없음·예전 자동 낮춤 값 한 번 되돌리기 통과');
