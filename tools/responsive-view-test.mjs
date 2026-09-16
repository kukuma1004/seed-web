import assert from 'node:assert/strict';
import {responsiveView,PHONE_ZOOM,TABLET_ZOOM} from '../src/responsive-view.js';

const desktop=responsiveView(1920,1080,false);
assert.equal(desktop.phone,false);
assert.equal(desktop.tablet,false);

for(const [label,width,height] of [
 ['16:9 phone',640,360],
 ['19.5:9 phone',844,390],
 ['20:9 phone',915,412]
]){
 const view=responsiveView(width,height,true);
 assert.equal(view.phone,true,label);
 assert.equal(view.tablet,false,label);
 assert.ok(view.zoom>desktop.zoom*1.3&&view.zoom<desktop.zoom*1.34,`${label} should frame combat about 32% closer than desktop`);
 assert.equal(view.followX,.5,label);
 assert.equal(view.followZ,.4,label);
}

const tablet=responsiveView(1024,768,true);
assert.equal(tablet.phone,false);
assert.equal(tablet.tablet,true);
assert.ok(Math.abs(tablet.zoom/desktop.zoom-TABLET_ZOOM)<1e-9);

const portrait=responsiveView(390,844,true);
assert.equal(portrait.phone,false);
assert.equal(portrait.tablet,false);
assert.ok(portrait.zoom<1);
assert.equal(PHONE_ZOOM,1.32);
console.log('responsive view: desktop, tablet, 16:9, 19.5:9 and 20:9 passed');
