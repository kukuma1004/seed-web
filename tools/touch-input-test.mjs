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
const move=new Element(),dash=new Element(),panel=new Element(),doc=new Element(),win=new Element();
Object.assign(doc,{body:{classList:{toggle(){}},append(){}},createElement:()=>panel,querySelector:q=>q==='#move-stick'?move:q==='#move-stick i'?move.children.i:q==='#touch-dash'?dash:null});
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
console.log('Move-only touch, independent dodge, pointer cancellation and pause cleanup passed.');
