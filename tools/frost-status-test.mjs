import assert from 'node:assert/strict';
import {applyFrostContact} from '../src/frost-status.js';

const foe={slow:0};
assert.deepEqual(applyFrostContact(foe,{now:1}),{first:true,shatter:false,bonus:0});
assert.equal(foe.slow,1.3);
assert.deepEqual(applyFrostContact(foe,{now:1.2}),{first:false,shatter:true,bonus:.6});
assert.equal(foe.frostLock,.3);
assert.equal(applyFrostContact(foe,{now:1.3}).shatter,false);
assert.equal(applyFrostContact(foe,{now:2.8}).shatter,true);
const boss={slow:0};
applyFrostContact(boss,{now:4,boss:true});
assert.equal(applyFrostContact(boss,{now:4.2,boss:true}).bonus,.35);
assert.equal(boss.frostLock,undefined);
console.log('Frost first hit, shatter cadence, short ordinary lock and boss safety passed.');
