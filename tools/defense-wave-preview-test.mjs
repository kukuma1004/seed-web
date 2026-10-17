import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,defenseActCount,defenseWaveInfo,defenseSpawnKind,checkpointDefense,restoreDefense} from '../src/seed-defense-rules.js';
import {defenseWavePreview} from '../src/defense-wave-preview.js';
const source=readFileSync('src/seed-defense-rules.js','utf8'),a=source.indexOf('function spawn(s,info){'),b=source.indexOf('\nfunction tick(',a);
assert.ok(a>0&&b>a);
for(const acts of [3,5])for(let wave=1;wave<=12*acts*3;wave++){
 const state=createDefense(73,{actCount:acts});state.wave=wave-1;
 const before=JSON.stringify(state),preview=defenseWavePreview(state),info=defenseWaveInfo(wave,state);
 assert.equal(JSON.stringify(state),before,'preview must not consume RNG or change save');
 assert.equal(preview.count,Object.values(preview.counts).reduce((a,b)=>a+b,0));
 assert.equal(preview.title,info.title);assert.equal(preview.wave,wave);
 const spawned={...state,wave,spawned:0,nextId:1,enemies:[]};
 const ctx=vm.createContext({defenseActCount,defenseSpawnKind,random:()=>.5,defensePathLength:()=>100,DEFENSE_PATH_LENGTH:100,defensePoint:()=>({x:0,y:0})});
 vm.runInContext(source.slice(a,b),ctx);
 for(let i=0;i<info.count;i++)ctx.spawn(spawned,info);
 const actual={normal:0,fast:0,shield:0,resilient:0,boss:0};for(const e of spawned.enemies)actual[e.kind]++;
 assert.deepEqual(actual,preview.counts,'actual shipping spawn composition matches the advertised pack');
 assert.equal(spawned.enemies.filter(e=>e.entry==='rear').length,preview.rear);
 // Preserve the pre-change schedule exactly, including last-index boss override.
 for(let i=0;i<info.count;i++)assert.equal(defenseSpawnKind(wave,i,info),info.boss&&i===info.count-1?'boss':wave>=3&&i%5===3?'shield':wave>=2&&i%4===1?'fast':wave>=6&&i%7===0?'resilient':'normal');
}
const fresh=createDefense(13);assert.deepEqual(defenseWavePreview(restoreDefense(checkpointDefense(fresh))),defenseWavePreview(fresh));
assert.match(defenseWavePreview(fresh).advice,/입구.*사거리/,'first-wave guidance explains placement rather than granting combat power');
for(const phase of ['wave','won','lost','draft']){fresh.phase=phase;assert.equal(defenseWavePreview(fresh),null);}
// Exercise the actual shipping HUD function: steady builds cannot keep allocating
// HTML, while a new wave, pause/book and terminal phase update immediately.
const view=readFileSync('src/seed-defense-view.js','utf8'),start=view.indexOf(" let forecastKey='';"),end=view.indexOf(' function updateUI(){',start);
assert.ok(start>0&&end>start);let writes=0,markup='';
const element={hidden:true,set innerHTML(s){writes++;markup=s;},get innerHTML(){return markup;}};
const context=vm.createContext({state:createDefense(73),paused:false,bookOpen:false,$:()=>element,defenseWavePreview,esc:s=>s});
vm.runInContext(view.slice(start,end),context);context.updateForecast();assert.equal(writes,1);assert.match(markup,/일반 12/);
for(let i=0;i<120;i++)context.updateForecast();assert.equal(writes,1,'unchanged preparation renders once');
context.paused=true;context.updateForecast();assert.equal(element.hidden,true);context.paused=false;context.bookOpen=true;context.updateForecast();assert.equal(element.hidden,true);
context.bookOpen=false;context.state.wave=2;context.updateForecast();assert.equal(element.hidden,false);assert.equal(writes,2);assert.match(markup,/방패/);
context.state.phase='wave';context.updateForecast();assert.equal(element.hidden,true);context.state.phase='lost';context.updateForecast();assert.equal(element.hidden,true);
console.log('PASS 288 actual spawn schedules across both circuits/three loops, old kind parity, rear entries, immutable RNG/checkpoints and hidden active/terminal forecast');
