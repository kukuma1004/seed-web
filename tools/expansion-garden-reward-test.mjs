import {createModeBossOutbox} from '../src/mode-boss-outbox.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {expansionGardenReceipt,expansionBossTreeReward} from '../src/expansion-garden-reward.js';
import {GARDEN_KEY,emptyGarden,readGarden,writeGarden,normalizeGarden,autoPlantSeeds} from '../src/garden.js';
import {normalizeTree} from '../src/tree-of-life.js';
import {MODE_BOSSES,recordModeBossVictory} from '../src/mode-boss-titles.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile,writeAccountProfile} from '../src/account-profile.js';
import {DISCOVERIES_KEY,readDiscoveries,recordDiscovery} from '../src/discoveries.js';
import {collectCloudSnapshot,mergeCloudSnapshots,applyCloudSnapshot} from '../src/cloud-save.js';

// Execute the real main bridge against actual garden/account/cloud helpers.
// Storage faults and device transfers are simulated; no live device is claimed.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const bridge=source.slice(source.indexOf('function awardExpansionBossTree('),source.indexOf('function remember(',source.indexOf('function awardExpansionBossTree(')));
assert(bridge.startsWith('function awardExpansionBossTree('));
function memory(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,data,fail:'',drop:'',readFail:'',attempts:[],getItem(k){if(this.readFail===k)throw Error('unavailable');return data.get(k)??null;},setItem(k,v){this.attempts.push([k,String(v)]);if(this.fail===k)throw Error('quota');if(this.drop!==k)data.set(k,String(v));},removeItem:k=>data.delete(k)};}
function host(storage=memory()){
 const toast={textContent:''};
 const ctx=vm.createContext({runStorage:storage,currentJourneyOwner:null,rawStorage:storage,createModeBossOutbox,account:{user:()=>({uid:'test-owner'})},GARDEN_KEY,readGarden,writeGarden,normalizeGarden,autoPlantSeeds,expansionBossTreeReward,recordModeBossVictory,readAccountProfile,MODE_BOSSES,readDiscoveries,profile:readDiscoveries(storage),garden:readGarden(storage),localInspection:false,developerRun:false,$:()=>toast,cloud:{flush:()=>Promise.resolve()},dominantLaw:()=>null,effectiveLevels:()=>[],levels:new Map(),heldForms:new Map(),treeReward:()=>{throw Error('new bosses must use the durable path');},treeWater:()=>{throw Error('new bosses must use the durable path');}});
 ctx.remember=(kind,id)=>{const result=recordDiscovery(storage,ctx.profile,kind,id);ctx.profile=result.profile;return result;};
 vm.runInContext(bridge,ctx);return {ctx,storage,toast};
}
function planted(storage){const g=emptyGarden();g.tree.plots[1]={seed:'frost',water:0};g.tree.updatedAt=10;assert(writeGarden(storage,g));return g;}
const event=boss=>({type:'boss',boss,act:MODE_BOSSES[boss].act,final:true,wins:1,law:null});
const noStamp=t=>({...t,updatedAt:0});
const runId='01234567-89ab-4cde-a123-0123456789ab';
for(const boss of Object.keys(MODE_BOSSES))for(const mode of ['journey','survival','defense','adventure']){
 if(mode==='journey'&&MODE_BOSSES[boss].act<4)continue;
 const s=memory();planted(s);let h=host(s);
 const key=expansionGardenReceipt(mode,runId,boss,1),counter=MODE_BOSSES[boss].counter;
 // Account succeeded, but discovery failed: retry after reload must repair both.
 s.fail=DISCOVERIES_KEY;assert.equal(h.ctx.awardModeBoss(mode,runId,boss,1),false);
 assert.equal(readAccountProfile(s)[counter],1);assert.equal(readGarden(s).tree.plots[1].water,0);
 s.fail='';h=host(s);assert(h.ctx.awardModeBoss(mode,runId,boss,1));
 assert.equal(readAccountProfile(s)[counter],1);assert.equal(readGarden(s).tree.plots[1].water,1);assert.equal(readGarden(s).tree.once[key],true);
 const before=s.getItem(GARDEN_KEY);h=host(s);assert(h.ctx.awardModeBoss(mode,runId,boss,1));assert.equal(s.getItem(GARDEN_KEY),before,'duplicate after reload cannot reroll or water');
 assert(h.ctx.awardModeBoss(mode,runId,boss,2));assert.equal(readGarden(s).tree.plots[1].water,2);assert.equal(readAccountProfile(s)[counter],2);
}
for(const fault of ['fail','drop'])for(const boss of Object.keys(MODE_BOSSES)){
 const s=memory();planted(s);let h=host(s);s[fault]=GARDEN_KEY;
 assert.equal(h.ctx.awardModeBoss('defense',runId,boss,1),false,'a thrown or silently dropped garden write leaves the receipt pending');
 assert.equal(readAccountProfile(s)[MODE_BOSSES[boss].counter],1);assert(readDiscoveries(s).bosses.includes(boss));assert.equal(readGarden(s).tree.plots[1].water,0);
 const attempted=JSON.parse(s.attempts.filter(([k])=>k===GARDEN_KEY).at(-1)[1]).tree;
 s[fault]='';h=host(s);assert(h.ctx.awardModeBoss('defense',runId,boss,1));
 assert.deepEqual(noStamp(readGarden(s).tree),noStamp(attempted),'retries keep the same chance result as the failed write');
 const before=s.getItem(GARDEN_KEY);assert(h.ctx.awardModeBoss('defense',runId,boss,1));assert.equal(s.getItem(GARDEN_KEY),before);
}
// A counted legacy 1..3 event has no durable tree intent. Preserve its old
// outcome instead of inventing another chance roll from a checkpoint replay.
for(const boss of ['austin','alwaysbeginner','tempestcarrier']){
 const s=memory();planted(s);assert(recordModeBossVictory(s,{mode:'survival',runId,boss,ordinal:1}).saved);
 assert(createModeBossOutbox(s,'test-owner').enqueue({mode:'survival',runId,boss,ordinal:1}));
 const before=s.getItem(GARDEN_KEY),h=host(s);assert(h.ctx.awardModeBoss('survival',runId,boss,1));assert.equal(s.getItem(GARDEN_KEY),before);
 const longRun='x'.repeat(90),reward=expansionBossTreeReward(readGarden(s).tree,{mode:'defense',runId:longRun,boss,ordinal:1000000,event:event(boss)});assert(reward.ok);assert(normalizeTree(reward.tree).once[expansionGardenReceipt('defense',longRun,boss,1000000)]);
}
// Retry after another device raises the count and the player changes builds:
// the original 9th-win/law reward must not become a 10th-win legendary reward.
{
 const s=memory();planted(s);writeAccountProfile(s,{...readAccountProfile(s),austinWins:8});let h=host(s);h.ctx.dominantLaw=()=> 'frost';s.fail=GARDEN_KEY;
 assert.equal(h.ctx.awardModeBoss('survival',runId,'austin',1),false);const attempted=JSON.parse(s.attempts.filter(([k])=>k===GARDEN_KEY).at(-1)[1]).tree;
 s.fail='';writeAccountProfile(s,{...readAccountProfile(s),austinWins:10});h=host(s);h.ctx.dominantLaw=()=> 'burst';assert(h.ctx.awardModeBoss('survival',runId,'austin',1));
 assert.deepEqual(noStamp(readGarden(s).tree),noStamp(attempted),'pending chance uses frozen boss count and law');
}
{
 const s=memory();planted(s);const h=host(s);s.fail=ACCOUNT_PROFILE_KEY;
 assert.equal(h.ctx.awardModeBoss('defense',runId,'crystalGardener',1),false);assert.equal(readGarden(s).tree.plots[1].water,0);assert.deepEqual(readDiscoveries(s).bosses,[]);
}
for(const raw of ['{broken','null','[]',JSON.stringify({version:7,tree:{unknown:true}}),JSON.stringify({version:'future',tree:{unknown:true}})]){
 const s=memory(),h=host(s);s.data.set(GARDEN_KEY,raw);
 assert.equal(h.ctx.awardModeBoss('journey',runId,'crosswindKeeper',1),false);assert.equal(s.getItem(GARDEN_KEY),raw,'unknown garden bytes stay recoverable');
}
{
 const s=memory();planted(s);const h=host(s),before=s.getItem(GARDEN_KEY);s.readFail=GARDEN_KEY;
 assert.equal(h.ctx.awardModeBoss('survival',runId,'crosswindKeeper',1),false);s.readFail='';assert.equal(s.getItem(GARDEN_KEY),before,'failed read must never replace the existing tree with an empty one');
 assert(h.ctx.awardModeBoss('survival',runId,'crosswindKeeper',1));assert.equal(readGarden(s).tree.plots[1].water,1);
}
for(const flag of ['localInspection','developerRun','explicit']){
 const s=memory();planted(s);const h=host(s),before=JSON.stringify([...s.data]);if(flag!=='explicit')h.ctx[flag]=true;
 assert(h.ctx.awardModeBoss('journey',runId,'crosswindKeeper',1,flag==='explicit'));assert.equal(JSON.stringify([...s.data]),before);
}
{
 const a='x'.repeat(89)+'a',b='x'.repeat(89)+'b';let tree=emptyGarden().tree;
 for(const id of [a,b]){const reward=expansionBossTreeReward(tree,{mode:'journey',runId:id,boss:'crystalGardener',ordinal:1000000,event:event('crystalGardener')});assert(reward.ok&&reward.applied);tree=reward.tree;}
 const keys=[a,b].map(id=>expansionGardenReceipt('journey',id,'crystalGardener',1000000));assert.notEqual(...keys);assert(keys.every(k=>k.length>60));assert(keys.every(k=>normalizeTree(tree).once[k]));
 const pc=memory(),phone=memory();writeGarden(pc,{...emptyGarden(),tree});let remote=collectCloudSnapshot(pc,{revision:1});
 applyCloudSnapshot(phone,remote);assert(keys.every(k=>readGarden(phone).tree.once[k]));
 const h=host(phone),before=phone.getItem(GARDEN_KEY);assert(h.ctx.awardExpansionBossTree('journey',a,'crystalGardener',1000000,event('crystalGardener')));assert.equal(phone.getItem(GARDEN_KEY),before);
 remote=mergeCloudSnapshots(collectCloudSnapshot(phone,{revision:2}),remote);applyCloudSnapshot(pc,remote);assert(keys.every(k=>readGarden(pc).tree.once[k]));
}
for(const extra of [{event:null},{event:{...event('crosswindKeeper'),act:1}},{event:event('crystalGardener')},{mode:'unknown'},{runId:'x'.repeat(91)},{ordinal:0},{ordinal:1000001}])assert.equal(expansionBossTreeReward(emptyGarden().tree,{mode:'journey',runId,boss:'crosswindKeeper',ordinal:1,event:event('crosswindKeeper'),...extra}).ok,false);
console.log('Linked five-boss garden: actual main bridge, new 1..3 durable intent and atomic chance/water/receipt retry, legacy counted replay neutrality, silent write/read faults, practice/unknown data protection and full-ID cloud roundtrip passed (VM/helper mocks).');
