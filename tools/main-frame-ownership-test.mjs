import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function mainOwnsFrames(){');
const end = source.indexOf('const coveredMenu=menuArtCovers();', start);
assert(start >= 0 && end > start);
const prefix = source.slice(start, end);
assert(source.includes('onOpenSanctuary:()=>{showGarden(()=>showGardenHub());resume();}'));
assert(source.includes('onClose:()=>{showIntro();resume();}'));
const queue = new Map();
let serial = 0;
const scope = {
  document: { hidden: false },
  requestAnimationFrame: fn => { queue.set(++serial, fn); return serial; },
  cancelAnimationFrame: id => queue.delete(id),
};
vm.createContext(scope);
vm.runInContext(`let mode='ready',animationHandle=0;${prefix}}
this.start=startAnimation;this.stop=stopAnimation;this.stale=animate;
this.setMode=value=>{mode=value;};this.handle=()=>animationHandle;`, scope);

for (const mode of ['duel', 'puzzle', 'garden-hub', 'defense-loading', 'defense', 'adventure', 'expedition']) {
  scope.stop();
  scope.setMode(mode);
  scope.document.hidden = true;
  scope.start();
  assert.equal(queue.size, 0);
  scope.document.hidden = false;
  scope.start();
  assert.equal(queue.size, 0, `${mode}: returning to foreground must not restart covered main renderer`);
  scope.stale(60000);
  assert.equal(queue.size, 0, `${mode}: late main callback must not multiply loops`);
}
for (const mode of ['ready', 'garden', 'playing', 'forms', 'dead']) {
  scope.stop();scope.setMode(mode);scope.document.hidden=false;
  scope.start();scope.start();
  assert.equal(queue.size, 1, `${mode}: main renderer resumes exactly once`);
  scope.stop();assert.equal(queue.size, 0);
}
scope.setMode('playing');scope.document.hidden=true;scope.start();scope.stale(60000);
assert.equal(queue.size, 0, 'hidden gameplay main callback stays dormant');
console.log('Shipping main RAF ownership passed: dedicated views and hidden pages stay dormant, normal main modes resume exactly once. Source lifecycle proof, not physical battery measurement.');
