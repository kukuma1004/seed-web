import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8');
const held=source.slice(source.indexOf(' function planningHeld(){'),source.indexOf('\n',source.indexOf(' function planningHeld(){')));
const begin=source.indexOf("const inspecting=root.classList.contains('td-inspecting'),waiting="),end=source.indexOf('if(!paused&&!confirming){const phase=',begin);
assert(begin>0&&end>begin);
const classes=new Set(),state={phase:'build',draftCredit:0,towers:[{id:1}]};let launches=0;
const context=vm.createContext({state,root:{classList:{contains:c=>classes.has(c)}},ended:false,paused:false,confirming:false,bookOpen:false,moving:false,drag:null,autoWait:3,wasInspecting:false,raw:.1,DEFENSE_AUTO_START:3,DEFENSE_AUTO_INSPECT:6,siegeActive:()=>false,prepareDefenseSiege:()=>false,$:id=>id==='.td-dialog'?{hidden:true}:{click(){launches++;state.phase='wave';}}});
vm.runInContext(held+'\nfunction step(){'+source.slice(begin,end)+'}',context);
const frames=n=>{for(let i=0;i<n;i++)context.step();};
classes.add('td-inspecting');frames(120);assert.equal(launches,0);assert.equal(context.autoWait,6,'reading actual upgrade details holds preparation');
classes.clear();frames(50);assert.equal(launches,0);frames(12);assert.equal(launches,1,'closing the panel retains its original six-second grace');
state.phase='build';context.autoWait=3;context.moving=true;frames(120);assert.equal(launches,1);
context.moving=false;context.drag={moved:false};frames(120);assert.equal(launches,1,'even an uncompleted pointer hold cannot auto-start');
context.drag=null;frames(31);assert.equal(launches,2,'unattended preparation still starts quickly');
for(const key of ['paused','confirming','bookOpen']){
 state.phase='build';context[key]=true;context.autoWait=3;frames(120);assert.equal(launches,2);context[key]=false;
}
console.log('Defense shipping preparation flow: reading/move/pointer/modal holds, close-panel grace and unattended three-second auto-start PASS (CPU controller, not native play)');
