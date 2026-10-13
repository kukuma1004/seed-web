import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,plantDefense,upgradeDefense,defenseTowerStats,DEFENSE_FORMS,DEFENSE_LAWS,defenseTierOf,defensePath,defensePlacement,PATH,checkpointDefense} from '../src/seed-defense-rules.js';
import {defenseRangeSegments,defenseUpgradePreview,defenseTacticalVisible,createDefenseRangeGuide} from '../src/defense-tactical-guide.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const line=[{x:-2,y:0},{x:2,y:0}],clipped=defenseRangeSegments(line,0,0,1);
assert.deepEqual(clipped.segments,[{x1:-1,y1:0,x2:1,y2:0}]);close(clipped.length,2);
assert.equal(defenseRangeSegments([{x:-2,y:1},{x:2,y:1}],0,0,1).length,0,'tangent is not a covered interval');
assert.equal(defenseRangeSegments([{x:0,y:0},{x:0,y:0},{x:2,y:0}],0,0,5).length,2,'degenerate path vertices remain harmless');
const corner=defenseRangeSegments([{x:-2,y:0},{x:0,y:0},{x:0,y:2}],0,0,1);close(corner.length,2);assert.equal(corner.segments.length,2);
const state=createDefense(73);plantDefense(state,0,'pierce');const tower=state.towers[0],before=JSON.stringify(checkpointDefense(state)),cache=createDefenseRangeGuide(),a=cache(tower,PATH);
for(let i=0;i<120;i++)assert.equal(cache(tower,PATH),a,'unchanged preparation frames reuse geometry/stat sheets');
assert.equal(JSON.stringify(checkpointDefense(state)),before,'guide must never spend currency, roll RNG or change saves');
for(const segment of a.coverage.segments)for(const point of [[segment.x1,segment.y1],[segment.x2,segment.y2]])assert.ok(Math.hypot(point[0]-tower.x,point[1]-tower.y)<=a.current.range+1e-8);
state.currency=1000;upgradeDefense(state,tower.id);const b=cache(tower,PATH);assert.notEqual(b,a);assert.deepEqual(b.current,a.next,'paid shipping upgrade matches the advertised next values');
assert.notEqual(cache(tower,PATH,86,21),b,'drag destination invalidates route overlap');
const expanded=createDefense(1,{actCount:5});expanded.wave=37;assert.notEqual(defensePath(expanded),PATH);const c=cache(tower,defensePath(expanded));assert.notEqual(c,b,'crosswind route must use its own geometry');
let sheets=0;
for(const f of [...Object.values(DEFENSE_LAWS),...Object.values(DEFENSE_FORMS)])for(let level=1;level<=5;level++){
 const t={x:14,y:21,level,laws:f.requires||[f.id],formId:f.requires?f.id:null,tier:4,merit:1,stars:3,lawRanks:{},reinforce:2},json=JSON.stringify(t),p=defenseUpgradePreview(t);
 assert.equal(JSON.stringify(t),json);assert.deepEqual(p.current,defenseTowerStats(t));assert.ok(Number.isFinite(p.current.damage)&&Number.isFinite(p.current.range));
 if(level<5){assert.equal(p.cost,25+level*15);assert.deepEqual(p.next,defenseTowerStats({...t,level:level+1}));}else{assert.equal(p.next,null);assert.equal(p.cost,Infinity);}sheets++;
}
// The shipping Canvas function must hide the guide when the sheet is closed,
// a battle/terminal/modal is active, or the selection is paused. No new inputs.
const view=readFileSync('src/seed-defense-view.js','utf8'),start=view.indexOf(' const rangeGuide=createDefenseRangeGuide()'),end=view.indexOf(' function draw(now){',start);assert.ok(start>0&&end>start);
let selected=false,arcs=0,lines=0;const ctx=new Proxy({arc(){arcs++;},lineTo(){lines++;}},{get:(t,k)=>t[k]||(()=>{})});
const context=vm.createContext({createDefenseRangeGuide,defenseTacticalVisible,defensePath,defensePlacement,ctx,state,selected:0,paused:false,bookOpen:false,confirming:false,moving:false,drag:null,root:{classList:{contains:()=>selected}},tower:()=>tower,color:()=> '#b9efff'});
state.phase='build';vm.runInContext(view.slice(start,end),context);context.drawTacticalGuide(null);assert.equal(arcs,0);
selected=true;context.drawTacticalGuide(null);assert.equal(arcs,2);assert.ok(lines>0);
const painted=arcs;for(const phase of ['wave','won','lost']){state.phase=phase;context.drawTacticalGuide(null);}assert.equal(arcs,painted);
state.phase='build';for(const guard of ['paused','bookOpen','confirming']){context[guard]=true;context.drawTacticalGuide(null);context[guard]=false;}assert.equal(arcs,painted);
context.tower=()=>null;context.drawTacticalGuide(null);assert.equal(arcs,painted,'unknown random law cannot advertise a made-up attack range');context.tower=()=>tower;
context.drawTacticalGuide({x:0,y:0});assert.equal(arcs,painted,'illegal move destinations cannot advertise a valid placement');
// Render the actual current/next stat block, including no phantom increase at
// level 5; no duplicate catalog or UI damage calculations are allowed.
const blockStart=view.indexOf('  if(t){const {current:stats,next}'),blockEnd=view.indexOf('  }else html+=',blockStart);assert.ok(blockStart>0&&blockEnd>blockStart);
const panel=vm.createContext({t:tower,state,defenseUpgradePreview,defenseTierOf,DEFENSE_LAWS,DEFENSE_FORMS,defenseUpgradeCost:t=>t.level<5?25+t.level*15:Infinity,esc:s=>s,html:''});
vm.runInContext(view.slice(blockStart,blockEnd)+'}',panel);assert.match(panel.html,/기준 피해/);assert.match(panel.html,/31.2 → 40.5/);assert.match(panel.html,/탐색 사거리/);assert.doesNotMatch(panel.html,/id="td-upgrade"/,'scrolling copy must not contain a duplicate upgrade action');
tower.level=5;panel.html='';vm.runInContext(view.slice(blockStart,blockEnd)+'}',panel);assert.doesNotMatch(panel.html,/ → /);assert.match(panel.html,/강화 Lv.5\/5/);
console.log(`PASS ${sheets} shipping stat sheets, exact route clipping, paid upgrade parity, immutable saves/RNG, cached frames and actual controller visibility guards`);
