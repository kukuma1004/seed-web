import assert from 'node:assert/strict';
import {deferDuelPortraits} from '../src/duel-roster-art.js';
// A 162-card menu can register all entries without initiating any offscreen
// image requests. Two actual observer notifications model opening and scroll.
const cards=Array.from({length:162},(_,i)=>({dataset:{portraitSrc:`/assets/duel/${i}.webp`},style:{}}));
let notify,disconnected=false;const watching=new Set();
class Observer{constructor(fn,options){notify=fn;assert.equal(options.rootMargin,'160px');}
 observe(el){watching.add(el);}unobserve(el){watching.delete(el);}disconnect(){disconnected=true;watching.clear();}}
const root={querySelectorAll(selector){assert.equal(selector,'[data-portrait-src]');return cards;}};
const dispose=deferDuelPortraits(root,Observer);assert.equal(watching.size,162);
assert(cards.every(c=>!c.style.backgroundImage));
notify(cards.slice(0,6).map(target=>({target,isIntersecting:true})));
notify([{target:cards[100],isIntersecting:false}]);
assert.equal(cards.filter(c=>c.style.backgroundImage).length,6);assert.equal(watching.size,162);
notify(cards.slice(0,6).map(target=>({target,isIntersecting:false})));
notify(cards.slice(6,12).map(target=>({target,isIntersecting:true})));
assert.equal(cards.filter(c=>c.style.backgroundImage).length,6);assert(!cards[100].style.backgroundImage);
assert.equal(cards[0].dataset.portraitSrc,'/assets/duel/0.webp');
notify([{target:cards[0],isIntersecting:true}]);assert.equal(cards[0].style.backgroundImage,"url('/assets/duel/0.webp')");
dispose();assert(disconnected);assert.equal(watching.size,0);assert(cards.every(c=>!c.style.backgroundImage));
const fallback={dataset:{portraitSrc:'/seed.webp'},style:{}};
deferDuelPortraits({querySelectorAll:()=>[fallback]},null);assert.equal(fallback.style.backgroundImage,"url('/seed.webp')");
console.log('162-card portrait loading: zero eager requests, visible+scroll batches only, old-browser fallback and disposal verified. Not a physical network/battery measurement.');
