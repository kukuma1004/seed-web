import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,plantDefense,mergeDefense,defenseMergeResult,defenseTierOf,DEFENSE_TIER_NAMES,defenseCellAt,defensePlacement,placeDefensePad,checkpointDefense,removeDefense} from '../src/seed-defense-rules.js';
const source=readFileSync('src/seed-defense-view.js','utf8');
const begin=source.indexOf(' let drag=null,dragJustEnded=false,removing=0;'),end=source.indexOf(" listen(canvas,'pointerdown'",begin);
assert.ok(begin>0&&end>begin);
const handlers=source.slice(begin,end);
function setup(code=handlers){
 const state=createDefense(73);state.currency=500;plantDefense(state,0,'pierce');plantDefense(state,1);state.towers[1].laws=['pierce'];state.towers[1].line='pierce';
 const points={left:0,top:0},canvas={getBoundingClientRect:()=>points};let saves=0,resets=0;const hints=[];
 const c=vm.createContext({state,canvas,scale:1,ox:0,oy:0,ended:false,paused:false,bookOpen:false,confirming:false,selected:0,
  mergeDefense,defenseMergeResult,defenseTierOf,DEFENSE_TIER_NAMES,defenseCellAt,defensePlacement,placeDefensePad,
  root:{classList:{contains:()=>false}},moving:false,combat:{reset(){resets++;}},dirty:false,uiKey:'',save(){saves++;},sound(){},celebrate(){},placeButtons(){},updateUI(){},hint:s=>hints.push(s)});
 const planning=source.slice(source.indexOf(' function planningHeld(){'),source.indexOf('\n',source.indexOf(' function planningHeld(){')));
 vm.runInContext(code+'\nfunction dragState(){return drag;}\n'+planning,c);
 const point=(id,t)=>({pointerId:id,clientX:t.x,clientY:t.y});
 return {state,c,point,saves:()=>saves,resets:()=>resets,hints};
}
// Real shipping handlers and canonical rules; no separate reproduction of payment/merge.
{
 const a=setup(),[first,target]=a.state.towers,before=JSON.stringify(checkpointDefense(a.state));
 assert.equal(a.c.beginDrag(a.point(11,first),first),true);
 assert.equal(a.c.beginDrag(a.point(22,target),target),false,'second finger cannot replace drag owner');
 a.c.moveDrag(a.point(22,target));a.c.endDrag(a.point(22,target));assert.equal(JSON.stringify(checkpointDefense(a.state)),before);assert.equal(a.c.dragState().id,first.id);
 a.c.moveDrag(a.point(11,target));assert.equal(a.c.dragState().target,target.id);a.c.endDrag(a.point(22,target));assert.equal(a.state.towers.length,2);
 a.c.endDrag(a.point(11,target));assert.equal(a.state.towers.length,1,'owner can still perform actual legal merge');assert.equal(a.saves(),1);assert.equal(a.resets(),1);assert.equal(a.c.dragState(),null);
}
for(const flag of ['paused','bookOpen','confirming','ended']){
 const a=setup(),[f,t]=a.state.towers;a.c[flag]=true;assert.equal(a.c.beginDrag(a.point(11,f),f),false);
 a.c[flag]=false;a.c.beginDrag(a.point(11,f),f);a.c.moveDrag(a.point(11,t));a.c[flag]=true;a.c.endDrag(a.point(11,t));assert.equal(a.state.towers.length,2);assert.equal(a.saves(),0);assert.equal(a.c.dragState(),null);
}
for(const phase of ['won','lost']){const a=setup(),f=a.state.towers[0];a.state.phase=phase;assert.equal(a.c.beginDrag(a.point(11,f),f),false);}
{
 const a=setup(),[f,t]=a.state.towers;a.c.beginDrag(a.point(11,f),f);a.c.moveDrag(a.point(11,t));a.c.cancelDrag({pointerId:22});assert.ok(a.c.dragState());a.c.cancelDrag({pointerId:11});assert.equal(a.c.dragState(),null);a.c.endDrag(a.point(11,t));assert.equal(a.state.towers.length,2);assert.equal(a.saves(),0);
 a.c.beginDrag(a.point(11,f),f);assert.equal(a.c.planningHeld(),true);a.c.cancelDrag();assert.equal(a.c.dragState(),null,'blur/hide/pause reset has no pointer');assert.equal(a.c.planningHeld(),false,'canceled capture cannot permanently hold automatic preparation');
}
{
 const a=setup(),[f,t]=a.state.towers;a.c.beginDrag(a.point(11,f),f);a.c.moveDrag(a.point(11,t));removeDefense(a.state,t.id);assert.doesNotThrow(()=>a.c.endDrag(a.point(11,t)));assert.equal(a.saves(),0);assert.match(a.hints.at(-1),/바뀌었어요/);
}
// Negative control: remove pointer identity checks, as old shipped drag did.
{
 const old=handlers.replace("||e.pointerId!==drag.pointerId",'').replace("||e.pointerId!==drag.pointerId",'');
 const a=setup(old),[f,t]=a.state.towers;a.c.beginDrag(a.point(11,f),f);a.c.moveDrag(a.point(22,t));a.c.endDrag(a.point(22,t));assert.equal(a.state.towers.length,1,'negative control proves wrong finger could change actual tower state');
}
assert.match(source,/for\(const n of \['pointercancel','lostpointercapture'\]\)listen\(b,n,cancelDrag\)/);
assert.match(source,/for\(const n of \['pointercancel','lostpointercapture'\]\)listen\(canvas,n,cancelDrag\)/);
assert.match(source,/listen\(window,'blur',\(\)=>cancelDrag\(\)\)/);
assert.match(source,/if\(document.hidden\)\{cancelDrag\(\);cancelStarter/);
const keyboard=source.slice(source.indexOf("listen(window,'keydown',e=>"),source.indexOf('\n audio?.setScene',source.indexOf("listen(window,'keydown',e=>")));
let listener,actions=0,prevented=0,canceled=0;
vm.runInNewContext(keyboard,{listen:(w,n,fn)=>{listener=fn;},window:{},starterPad:null,$:()=>({click(){actions++;}}),cancelStarter(){canceled++;}});
const key=(code,repeat=false,target={})=>listener({code,repeat,target,preventDefault(){prevented++;}});
key('KeyP');key('KeyP',true);key('Space',true);assert.equal(actions,1,'holding a key cannot repeatedly pause/start');assert.equal(prevented,3);
key('Space',false,{closest:()=>true});assert.equal(actions,1,'typing cannot launch a wave');key('Space');assert.equal(actions,2,'deliberate start retained');
console.log('PASS Defense shipping drag ownership/cancel/modal/terminal/stale-target and held-key guards; actual merge/save ledger plus unsafe-control reproduction. VM input, no native touch/device claim.');
