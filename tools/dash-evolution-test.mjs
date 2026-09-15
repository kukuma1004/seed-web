import assert from 'node:assert/strict';
import {BASE_DASH,DASH_EVOLUTIONS,createDashState,tickDash,spendDash,dashMeter,dashEvolutionCards} from '../src/dash-evolution.js';
import {validCheckpoint} from '../src/run-save.js';

assert.equal(Object.keys(DASH_EVOLUTIONS).length,3);
const base=createDashState();assert.equal(spendDash(base),BASE_DASH);assert.equal(spendDash(base),null);
tickDash(base,BASE_DASH.recharge-.01);assert.equal(base.charges,0);tickDash(base,.02);assert.equal(base.charges,1);

const twin=createDashState('twinsprout');
assert.equal(dashMeter(twin).charges,2);assert.ok(spendDash(twin));assert.ok(spendDash(twin));assert.equal(spendDash(twin),null);
tickDash(twin,4.39);assert.equal(twin.charges,0);tickDash(twin,.02);assert.equal(twin.charges,1);assert.ok(twin.recharge>4.3);
tickDash(twin,4.4);assert.deepEqual(dashMeter(twin),{id:'twinsprout',charges:2,maxCharges:2,recharge:0,rechargeSeconds:4.4,fill:1,ready:true});

const long=DASH_EVOLUTIONS.longroot,molt=DASH_EVOLUTIONS.molt;
assert.ok(long.duration*long.speed>BASE_DASH.duration*BASE_DASH.speed*1.35,'long root travels at least 35% farther');
assert.ok(molt.invuln>BASE_DASH.invuln+.15,'molt leaves a meaningful guard after the dash');
assert.match(dashEvolutionCards(),/data-dash-evolution="twinsprout"/);assert.match(dashEvolutionCards(),/긴뿌리 도약/);assert.match(dashEvolutionCards(),/허물 벗기/);

const save={version:1,cycle:1,region:'garden',stage:0,mode:'entry',hp:100,rules:[],mutated:[],kills:100,elapsed:50,wardens:1,austins:0};
assert.ok(validCheckpoint(save),'old saves without a dash evolution remain valid');
for(const id of Object.keys(DASH_EVOLUTIONS))assert.ok(validCheckpoint({...save,dashEvolution:id}),id);
assert.equal(validCheckpoint({...save,dashEvolution:'infinite-dash'}),false);

console.log('Dash evolutions: separate first-warden choice, two sequential charges, distance/guard tradeoffs and save compatibility passed.');
