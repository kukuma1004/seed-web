import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,setDefenseBossEpoch,defenseHurt,checkpointDefense,restoreDefense,stepDefense,defenseWaveInfo} from '../src/seed-defense-rules.js';
const view=readFileSync(new URL('../src/seed-defense-view.js',import.meta.url),'utf8'),epoch='migration-02',nextEpoch='migration-03';
const copy=v=>JSON.parse(JSON.stringify(v));
const refresh=view.slice(view.indexOf('function refreshBossEpoch(){'),view.indexOf(' binding.attach(state);'));
const auto=view.slice(view.indexOf('function autoUltimates(){'),view.indexOf(" $('#td-speed').onclick"));
const step=view.slice(view.indexOf('for(let left=Math.min(.05,raw)*speed;'),view.indexOf('autoUltimates();if(!paused'));
const manual=view.split('\n').find(line=>line.includes("if($('#td-ultimate'))"));
const retry=view.slice(view.indexOf("$('#td-retry').onclick="),view.indexOf("$('#td-home').onclick"));
assert(refresh.includes('setDefenseBossEpoch'));assert(step.includes('refreshBossEpoch()'));assert(auto.includes('refreshBossEpoch()'));assert(manual.includes('refreshBossEpoch()'));assert(retry.indexOf('refreshBossEpoch()')<retry.indexOf('combat.dispose()'));
assert(view.includes('state=createDefense(Date.now()>>>0,{actCount})'),'function-valued epoch never enters initial constructor');
assert(view.includes('selected=state.selectedPad;}refreshBossEpoch();'),'restored state adopts only future live epoch');
assert(view.includes('hint(bossEpochBlocked?saveNote:'));
function restored(){const s=createDefense(4);s.wave=12;const enemy={hp:1,kind:'boss',bossId:'austin',x:10,y:10};defenseHurt(s,enemy,10);const cp=checkpointDefense(s);assert(cp);const r=restoreDefense(cp);assert(r);return r;}
function context(state=restored()){
 const nodes=new Map(),messages=[],audio=[],data={state,paused:false,bossEpochBlocked:false,saveNote:'',uiKey:'cached',bossEpoch:()=>epoch,isolated:()=>false,setDefenseBossEpoch,stepDefense,audio:{setPaused:v=>audio.push(v)},$:key=>{if(!nodes.has(key))nodes.set(key,{textContent:'',hidden:true,setAttribute(){}});return nodes.get(key);},hint:m=>messages.push(m)};
 const ctx=vm.createContext({freshObjective:()=>null,localSiege:false,...data});vm.runInContext(refresh,ctx);return {ctx,nodes,messages,audio};
}
{
 const original=restored(),pending=copy(original.pendingBosses),{ctx}=context(original);
 assert(ctx.refreshBossEpoch());assert.equal(original.bossEpoch,epoch);assert.deepEqual(original.pendingBosses,pending,'live adoption never tags old receipts');
 ctx.bossEpoch=()=>nextEpoch;assert(ctx.refreshBossEpoch());assert.equal(original.bossEpoch,nextEpoch);assert.deepEqual(original.pendingBosses,pending);
 ctx.bossEpoch=null;assert(ctx.refreshBossEpoch());assert(!Object.hasOwn(original,'bossEpoch'));assert.deepEqual(original.pendingBosses,pending);
 ctx.bossEpoch=()=>{throw Error('corrupt-cache');};const before=copy(original);assert(!ctx.refreshBossEpoch());assert(ctx.paused);assert(ctx.bossEpochBlocked);assert.deepEqual(original,before);
 for(const invalid of ['bad',undefined,7]){ctx.paused=false;ctx.bossEpoch=()=>invalid;assert(!ctx.refreshBossEpoch());assert(ctx.paused);assert.deepEqual(original,before);}
 ctx.isolated=()=>true;assert(ctx.refreshBossEpoch(),'public practice ignores normal account getter');assert(!Object.hasOwn(original,'bossEpoch'));
}
function armed(){const s=restored();s.wave=48;s.phase='wave';s.spawned=defenseWaveInfo(48,s).count;s.spawnTimer=1000;s.waveTime=0;const enemy={id:1,hp:1,maxHp:1,kind:'boss',bossId:'austin',act:0,x:10,y:10,progress:0,speed:0,slow:1,slowTime:0,attackTime:1000,leakDamage:5};s.enemies=[enemy];return {s,enemy};}
{
 const {s,enemy}=armed(),{ctx}=context(s);let updates=0;
 Object.assign(ctx,{raw:1/60,speed:2,combat:{update(){updates++;defenseHurt(s,enemy,10);}}});vm.runInContext(step,ctx);
 assert(updates>0);assert.deepEqual(s.pendingBosses,[{boss:'austin',ordinal:1,wave:12},{boss:'austin',ordinal:2,wave:48,bossEpoch:epoch}]);
 const broken=armed(),b=context(broken.s);let badUpdates=0;Object.assign(b.ctx,{bossEpoch:()=>{throw Error('corrupt');},raw:1/60,speed:2,combat:{update(){badUpdates++;}}});const before=copy(broken.s);vm.runInContext(step,b.ctx);assert.equal(badUpdates,0);assert.deepEqual(broken.s,before);assert(b.ctx.paused);assert(b.messages.at(-1).includes('계정 기록'));
}
for(const pathway of ['auto','manual']){
 const {s,enemy}=armed(),{ctx,nodes}=context(s);const tower={id:1,formId:'collapse',ultimateCharge:30,x:10,y:10};s.towers=[tower];let surges=0;
 Object.assign(ctx,{autoSkill:true,DEFENSE_COMBAT:{ultimateSeconds:30},defenseTowerStats:()=>({range:100}),combat:{surge(){surges++;defenseHurt(s,enemy,10);return true;}},sound:()=>{},name:()=> '씨앗',SIGNATURES:{},t:tower,updateUI:()=>{}});
 if(pathway==='auto'){vm.runInContext(auto,ctx);ctx.autoUltimates();}else{vm.runInContext(manual,ctx);nodes.get('#td-ultimate').onclick();}
 assert.equal(surges,1);assert.equal(s.pendingBosses.at(-1).bossEpoch,epoch,pathway+' resolves epoch before actual surge death');
 ctx.paused=false;ctx.bossEpoch=()=>{throw Error('broken-cache');};const before=copy(s);
 if(pathway==='auto')ctx.autoUltimates();else nodes.get('#td-ultimate').onclick();
 assert.equal(surges,1);assert.deepEqual(s,before);assert(ctx.paused,pathway+' stops on corrupt getter');
}
{
 const s=restored(),{ctx,nodes}=context(s);let disposed=0,created=0;
 Object.assign(ctx,{bossEpoch:()=>{throw Error('corrupt');},closeSelection:()=>{},combat:{dispose(){disposed++;}},binding:{attach:x=>x},createDefense,createDefenseCombat:()=>{created++;return {};},actCount:3,selected:0,moving:false,evolutionCues:[],dirty:false,placeButtons:()=>{},announced:'lost',save:()=>{},updateUI:()=>{},sound:()=>{}});
 vm.runInContext(retry,ctx);const before=copy(s);nodes.get('#td-retry').onclick();assert.equal(ctx.state,s);assert.deepEqual(s,before);assert.equal(disposed,0);assert.equal(created,0);
 ctx.bossEpoch=()=>nextEpoch;nodes.get('#td-retry').onclick();assert.notEqual(ctx.state,s);assert.equal(ctx.state.bossEpoch,nextEpoch);assert.equal(ctx.state.pendingBosses.length,0);assert.equal(disposed,1);assert.equal(created,1);
 assert.equal(s.pendingBosses[0].bossEpoch,undefined,'new run retry does not upgrade old retained record');
}
console.log('TD live epoch view seam passed: late migration and restored legacy preservation, guarded real simulation deaths, auto/manual surge deaths, null/practice isolation, corrupt getter pause with unchanged state, and guarded fresh retry. VM/rules checks; physical browser/device QA remains separate.');
