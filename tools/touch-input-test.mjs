import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindPointerAction,createTouchControls} from '../src/touch.js';
class Element {
 constructor(){this.listeners={};this.style={};this.classList={toggle(){}};this.capture=new Set();this.children={i:{style:{}},small:{textContent:''},'.dash-charges':{children:[{classList:{toggle(){}}},{classList:{toggle(){}}}]}};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 fire(name,extra={}){let prevented=false;const event={target:this,preventDefault(){prevented=true;},...extra};for(const fn of this.listeners[name]||[])fn(event);return {event,prevented};}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
 setPointerCapture(id){this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){this.capture.delete(id);}
 querySelector(q){return this.children[q];}
 contains(){return true;}
}
const move=new Element(),dash=new Element(),panel=new Element(),doc=new Element(),win=new Element(),zone=new Element();
Object.assign(doc,{documentElement:{clientWidth:1000,clientHeight:800},body:{classList:{toggle(){}},append(){}},createElement:()=>panel,querySelector:q=>q==='#move-stick'?move:q==='#move-stick i'?move.children.i:q==='#touch-dash'?dash:q==='#move-zone'?zone:null});
globalThis.document=doc;globalThis.window=win;globalThis.matchMedia=()=>({matches:true});
let active=true;const control=createTouchControls(()=>active);
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(page,/maximum-scale=1,user-scalable=no/,'The game viewport must not pinch or double-tap zoom');
assert.equal(doc.fire('selectstart').prevented,true,'Game text cannot be block-selected by a long press');
assert.equal(doc.fire('contextmenu').prevented,true,'The game suppresses the mobile long-press callout');
assert.equal(doc.fire('dragstart').prevented,true,'Painted game art cannot be dragged');
assert.equal(doc.fire('touchmove',{touches:[{},{}]}).prevented,true,'Two-finger page gestures are blocked');
assert.equal(doc.fire('touchmove',{touches:[{}]}).prevented,false,'A single touch remains available to game controls');
const editable={closest(){return this;}};
assert.equal(doc.fire('selectstart',{target:editable}).prevented,false,'Name fields retain native editing and selection');
assert.ok(!panel.innerHTML.includes('aim-stick'));
assert.match(panel.innerHTML,/dash-charges/,'Double dodge owns two visible charge pips');
control.update(true,0,{charges:1,maxCharges:2,recharge:4.4});assert.equal(dash.children.small.textContent,'회피 1/2');
move.fire('pointerdown',{pointerId:1,clientX:85,clientY:50});
assert.equal(control.axes.move.x,1);
dash.fire('pointerdown',{pointerId:2});
assert.equal(control.consumeDash(),true);assert.equal(control.consumeDash(),false);
assert.equal(control.axes.move.x,1,'Dodge keeps the movement finger active');
// Potion and ultimate fire on their own pointerdown events while move and dodge
// pointers are still held. The later synthetic click is ignored, while keyboard
// click (detail=0) remains available.
let clock=100,activeUses=0,itemUses=0;
const activeButton=new Element(),itemBar=new Element(),itemButton=new Element();
itemButton.dataset={item:'tonic'};itemButton.closest=q=>q==='[data-item]'?itemButton:null;
bindPointerAction(activeButton,{now:()=>clock,onPress:()=>activeUses++});
bindPointerAction(itemBar,{selector:'[data-item]',now:()=>clock,onPress:b=>{assert.equal(b.dataset.item,'tonic');itemUses++;}});
activeButton.fire('pointerdown',{pointerId:3,pointerType:'touch'});
itemBar.fire('pointerdown',{pointerId:4,pointerType:'touch',target:itemButton});
assert.equal(activeUses,1);assert.equal(itemUses,1);assert.equal(control.axes.move.x,1,'Four-finger actions keep movement active');
activeButton.fire('click',{detail:1});itemBar.fire('click',{detail:1,target:itemButton});
assert.equal(activeUses,1);assert.equal(itemUses,1,'Synthetic clicks do not double-use actions');
clock+=900;activeButton.fire('click',{detail:0});assert.equal(activeUses,2,'Keyboard click remains accessible');
win.fire('pointerup',{pointerId:3});win.fire('pointerup',{pointerId:4});
move.fire('pointerdown',{pointerId:3,clientX:15,clientY:50});
assert.equal(control.axes.move.x,1,'A second finger cannot steal movement');
move.fire('pointercancel',{pointerId:1});assert.deepEqual(control.axes.move,{x:0,y:0});
move.fire('pointerdown',{pointerId:4,clientX:50,clientY:15});
win.fire('blur');assert.deepEqual(control.axes.move,{x:0,y:0});assert.equal(control.state().pointers,0);
active=false;move.fire('pointerdown',{pointerId:5,clientX:85,clientY:50});dash.fire('pointerdown',{pointerId:6});
assert.equal(control.state().pointers,0);assert.equal(control.consumeDash(),false);
// Floating stick: the thumb's landing point becomes the centre, and a long drag pulls the stick along.
active=true;zone.fire('pointerdown',{pointerId:7,clientX:300,clientY:400});
assert.deepEqual(control.state().center,{x:300,y:400});assert.equal(control.state().floating,true);
assert.deepEqual(control.axes.move,{x:0,y:0},'Landing does not move the seed');
zone.fire('pointermove',{pointerId:7,clientX:335,clientY:400});assert.equal(control.axes.move.x,1);
zone.fire('pointermove',{pointerId:7,clientX:520,clientY:400});
assert.ok(control.state().center.x>400,'The stick follows a thumb that runs off');assert.equal(control.axes.move.x,1);
move.fire('pointerdown',{pointerId:8,clientX:85,clientY:50});assert.equal(control.state().pointers,1,'A second finger cannot start another stick');
zone.fire('pointerup',{pointerId:7});assert.equal(control.state().floating,false);assert.deepEqual(control.axes.move,{x:0,y:0});
zone.fire('pointerdown',{pointerId:9,clientX:2,clientY:798});
assert.ok(control.state().center.x>=50&&control.state().center.y<=750,'A corner press keeps the stick on screen');
zone.fire('pointercancel',{pointerId:9});
console.log('Move-only touch, zoom/selection guards, independent dodge, pointer cancellation, pause cleanup and floating stick passed.');
