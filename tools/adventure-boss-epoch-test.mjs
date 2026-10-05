import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createAdventure,startAdventure,adventureFormHit,stepAdventure,chooseAdventure,adventureCheckpoint,restoreAdventure,adventureBossReceipt,ADVENTURE_SAVE_KEY,ADVENTURE_ARENA} from '../src/seed-adventure-rules.js';
import {collectCloudSnapshot,applyCloudSnapshot} from '../src/cloud-save.js';
const oldEpoch='migration-02',newEpoch='migration-03';
const boss=act=>({id:100+act,type:'boss',role:'boss',bossId:['austin','alwaysbeginner','tempestcarrier'][act],act,x:13,y:10,hp:1,maxHp:100,r:1.1,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0,power:1});
function begin(){const s=createAdventure(17);startAdventure(s,'slash','recall');s.region=null;s.arena={...ADVENTURE_ARENA};s.enemies=[];s.props=[];s.player.inv=1000;return s;}
function kill(s,act){s.room=act*4+3;s.roomType='boss';s.roomReward='boss';s.phase='playing';s.wave=2;const e=boss(act);s.enemies=[e];assert(adventureFormHit(s,e,100));assert(!adventureFormHit(s,e,100),'dead boss cannot earn another epoch/receipt');for(let i=0;i<90;i++)stepAdventure(s,1/60,{});assert.equal(s.phase,'choice');assert(chooseAdventure(s,'grow'));assert.equal(s.phase,'doors');return adventureCheckpoint(s);}
const unmarked=begin(),legacy=kill(unmarked,0);
assert.equal(legacy.bossesDefeated,1);assert.equal(legacy.bossEpochs,undefined,'legacy checkpoint shape remains unchanged');
assert.equal(adventureBossReceipt(unmarked,0).bossEpoch,undefined);assert.equal(adventureBossReceipt(unmarked,1),null);
const continued=restoreAdventure(legacy);assert(continued);continued.bossEpoch=newEpoch;
assert.equal(adventureBossReceipt(continued,0).bossEpoch,undefined,'current epoch never tags an already cleared legacy boss');
continued.region=null;continued.arena={...ADVENTURE_ARENA};continued.player.inv=1000;
const mixed=kill(continued,1);assert.deepEqual(mixed.bossEpochs,{'1':newEpoch});
assert.equal(adventureBossReceipt(continued,0).bossEpoch,undefined);assert.equal(adventureBossReceipt(continued,1).bossEpoch,newEpoch);
const run=begin();run.bossEpoch=oldEpoch;const checkpoint=kill(run,0);
assert.deepEqual(checkpoint.bossEpochs,{'0':oldEpoch});assert.equal(adventureBossReceipt(run,0).bossEpoch,oldEpoch);
const restored=restoreAdventure(checkpoint);assert(restored);restored.bossEpoch=newEpoch;
assert.equal(adventureBossReceipt(restored,0).bossEpoch,oldEpoch,'recorded death epoch is immutable across account migration/reload');
for(const bossEpochs of [null,[],{'0':'bad'},{'1':oldEpoch},{'-1':oldEpoch},{'3':oldEpoch},{'future':oldEpoch}])assert.equal(restoreAdventure({...checkpoint,bossEpochs}),null,'reject malformed or unearned epoch map');
for(const current of [null,undefined,'bad','migration/02',3]){const s=begin();s.bossEpoch=current;assert.equal(kill(s,0).bossEpochs,undefined);}
const memory=initial=>{const data=new Map(Object.entries(initial||{}));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const pc=memory({[ADVENTURE_SAVE_KEY]:JSON.stringify(mixed)}),phone=memory();applyCloudSnapshot(phone,collectCloudSnapshot(pc));
assert.deepEqual(restoreAdventure(phone.getItem(ADVENTURE_SAVE_KEY)).bossEpochs,{'1':newEpoch},'cloud roundtrip preserves marked and unmarked acts separately');
const view=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const binder=view.slice(view.indexOf('function bindBossEpoch(run){'),view.indexOf(' bindBossEpoch(s);'));
assert(binder.includes('Object.defineProperty'));
const state=begin(),context=vm.createContext({bossEpoch:()=>oldEpoch,isolated:()=>false});vm.runInContext(binder,context);context.bindBossEpoch(state);
assert.equal(state.bossEpoch,oldEpoch);assert.equal(kill(state,0).bossEpochs[0],oldEpoch);
context.bossEpoch=()=>newEpoch;assert.equal(state.bossEpoch,newEpoch);assert.equal(adventureBossReceipt(state,0).bossEpoch,oldEpoch);
context.isolated=()=>true;assert.equal(state.bossEpoch,null,'practice/account switch cannot mark a normal epoch at death');
const bridge=view.slice(view.indexOf('function resetBossAccount(){'),view.indexOf('// 판의 진행'));
const received=[],timers=new Map();let serial=0;
const ctx=vm.createContext({s:continued,document:{hidden:false},closed:false,isolated:()=>false,bossRetryTimer:0,lastBossRun:'',settledBosses:new Set(),adventureBossReceipt,onBossDefeated:receipt=>{received.push(receipt);return true;},setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)});
vm.runInContext(bridge,ctx);ctx.syncBossAccount();assert.equal(received.length,2);assert.equal(received[0].bossEpoch,undefined);assert.equal(received[1].bossEpoch,newEpoch);
ctx.syncBossAccount();assert.equal(received.length,2,'settled restored receipts are not replayed per frame');
console.log('Adventure boss epoch passed: actual death marking, immutable per-act epoch, unmarked legacy continuation, mixed checkpoint/cloud roundtrip, malformed-map refusal, current-owner/practice getter and actual view receipt bridge. VM/mock checks only.');
