import assert from 'node:assert/strict';
import {createTouchControls} from '../src/touch.js';
class Element {
 constructor(){this.listeners={};this.style={};this.classList={toggle(){}};this.capture=new Set();this.children={i:{style:{}},small:{textContent:''}};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 fire(name,extra={}){for(const fn of this.listeners[name]||[])fn({preventDefault(){},...extra});}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
 setPointerCapture(id){this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){this.capture.delete(id);}
 querySelector(q){return this.children[q];}
}
const move=new Element(),dash=new Element(),panel=new Element(),doc=new Element(),win=new Element(),zone=new Element();
Object.assign(doc,{documentElement:{clientWidth:1000,clientHeight:800},body:{classList:{toggle(){}},append(){}},createElement:()=>panel,querySelector:q=>q==='#move-stick'?move:q==='#move-stick i'?move.children.i:q==='#touch-dash'?dash:q==='#move-zone'?zone:null});
globalThis.document=doc;globalThis.window=win;globalThis.matchMedia=()=>({matches:true});
let active=true;const control=createTouchControls(()=>active);
assert.ok(!panel.innerHTML.includes('aim-stick'));
move.fire('pointerdown',{pointerId:1,clientX:85,clientY:50});
assert.equal(control.axes.move.x,1);
dash.fire('pointerdown',{pointerId:2});
assert.equal(control.consumeDash(),true);assert.equal(control.consumeDash(),false);
assert.equal(control.axes.move.x,1,'Dodge keeps the movement finger active');
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
console.log('Move-only touch, independent dodge, pointer cancellation, pause cleanup and floating stick passed.');
