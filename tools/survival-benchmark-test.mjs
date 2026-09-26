import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SURVIVAL_BENCHES,createSurvivalBenchmark,survivalBenchmarkPick,survivalBenchmarkMove,sampleSurvivalBenchmark} from '../src/survival-benchmark.js';
import {FORMS} from '../src/forms.js';
import {chooseLaw,fuse,slotsUsed} from '../src/progression.js';
assert.equal(createSurvivalBenchmark('boss'),null);
for(const id of Object.keys(SURVIVAL_BENCHES)){
 const bench=createSurvivalBenchmark(id),levels=new Map(),forms=new Map();
 for(let i=0;i<30;i++){
  const pick=survivalBenchmarkPick(bench,levels,forms,FORMS);
  assert(pick.fusion?fuse(levels,forms,pick.fusion):chooseLaw(levels,pick.law,forms));
  assert(slotsUsed(levels,forms)<=6);
  if(i===0)assert.equal(forms.size,0,'starts with a single base law');
 }
 assert.deepEqual([...forms.keys()],bench.forms);
 assert.deepEqual([...forms.values()],[8,8,8],'no free form upgrades');
 const out={x:0,z:0};
 for(let time=0;time<660;time++){
  survivalBenchmarkMove(time,{x:0,z:0},[{g:{position:{x:.5,z:.5}},dead:false}],out);
  assert(Number.isFinite(out.x)&&Number.isFinite(out.z)&&Math.hypot(out.x,out.z)<=1.00001);
  sampleSurvivalBenchmark(bench,{time,hp:100,kills:time,choices:30,enemies:20,shots:150});
 }
 for(let i=0;i<100;i++)sampleSurvivalBenchmark(bench,{time:660,hp:-5,kills:660,choices:30,enemies:30,shots:180,force:true});
 assert(bench.samples.length<=14);assert.equal(bench.peakShots,180);
 assert.equal(bench.samples.at(-1).hp,0);
}
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert(source.includes('survivalSession.benchmark=localInspection?createSurvivalBenchmark(lab):null'));
assert(source.includes('!survivalSession?.benchmark&&realDelta>0'),'simulated time never counted as live telemetry');
assert(source.includes('session.lab?survivalPersonalRecord():recordSurvivalResult'),'QA never updates records');
assert(source.includes('if(!survivalSession.won&&choiceKills>=choiceGoal()){choiceKills-=choiceGoal();choicesTaken++;takeSurvivalBenchmarkPick();}'),'only earned selections');
console.log('survival benchmark: real draft rules, bounded steering/samples, local-only and record isolation passed');
