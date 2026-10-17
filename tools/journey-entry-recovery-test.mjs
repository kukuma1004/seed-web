import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './expansion-public-host-test.mjs';
import {launchJourneyCard} from '../src/journey-entry-ui.js';

// These are the actual source launcher/store/sync with mock HTTP and locks.
// The menu sees no local run; the server then supplies an accepted checkpoint.
for(const act of ['crosswind','crystalGorge']){
 const f=fixture(),record=await f.seed(act,{hp:42});
 f.storage.removeItem(f.getStore(act).key);
 f.setRemote({version:1,ownerUid:'owner-A',act,revision:1,checkpoint:JSON.stringify(record)});
 assert(await f.c.startPublicExpansionJourney(act,{resume:null}));
 assert.equal(f.c.hp,42);assert.equal(f.c.expansionEntry.id,record.entry.id);
 assert.equal(f.stats.puts,0,'resume does not replace server progress');
 await f.c.releaseExpansionSaveLease();
}
// Fresh/offline and explicit new-run requests still cannot erase a timeline.
for(const act of ['crosswind','crystalGorge']){
 const f=fixture();await f.seed(act);const bytes=f.storage.getItem(f.getStore(act).key);
 assert.equal(await f.c.startPublicExpansionJourney(act,{resume:false}),false);
 assert.equal(f.storage.getItem(f.getStore(act).key),bytes);
 f.offline(true);assert(await f.c.startPublicExpansionJourney(act,{resume:null}));
 await f.c.releaseExpansionSaveLease();
 const empty=fixture();empty.offline(true);
 assert.equal(await empty.c.startPublicExpansionJourney(act,{resume:null}),false);
 assert.equal(empty.stats.puts,0);
}
// Genuine divergent timelines present the existing CAS choice, never merge.
{
 const f=fixture(),a=await f.seed('crosswind');
 const remote=structuredClone(a);remote.entry.id='remote-other-run';
 f.setRemote({version:1,ownerUid:'owner-A',act:'crosswind',revision:2,checkpoint:JSON.stringify(remote)});
 let seen=null;f.c.showExpansionSaveConflict=(act,state)=>seen={act,state};
 const bytes=f.storage.getItem(f.getStore('crosswind').key);
 assert.equal(await f.c.startPublicExpansionJourney('crosswind',{resume:null}),false);
 assert.equal(seen.act,'crosswind');assert.equal(seen.state.kind,'conflict');
 assert.equal(f.storage.getItem(f.getStore('crosswind').key),bytes);assert.equal(f.stats.puts,0);
 assert(await f.c.startPublicExpansionJourney('crosswind',{resume:null,syncChoice:'remote',syncExpected:seen.state.expected}));
 assert.equal(f.c.expansionEntry.id,'remote-other-run');await f.c.releaseExpansionSaveLease();
}
const node=()=>({disabled:false,dataset:{},hidden:true,isConnected:true,textContent:'',setAttribute(k,v){this[k]=v;}});
{
 const a=node(),b=node(),status=node();let finish,calls=0;
 const pending=launchJourneyCard(a,()=>{calls++;return new Promise(r=>finish=r);},{status,buttons:[a,b],label:'4막'});
 assert(a.disabled&&b.disabled);assert.match(status.textContent,/4막.*준비/);
 assert.equal(await launchJourneyCard(b,()=>{calls++;return true;},{status,buttons:[a,b]}),false);
 finish(false);assert.equal(await pending,false);assert.equal(calls,1);
 assert.equal(status.role,'alert');assert(!a.disabled&&!b.disabled);assert(!status.dataset.busy);
 assert(await launchJourneyCard(a,async()=>true,{status,buttons:[a,b]}));
 assert.equal(await launchJourneyCard(a,async()=>{throw Error('import failure');},{status,buttons:[a,b]}),false);
 assert.match(status.textContent,/연결.*기록/);assert(!a.disabled&&!b.disabled);
 assert.equal(await launchJourneyCard(a,async()=>false,{status,buttons:[a,b],message:()=> '다른 탭에서 진행 중이에요'}),false);
 assert.equal(status.textContent,'다른 탭에서 진행 중이에요');
}
const main=readFileSync('src/main.js','utf8');
assert.match(main,/startPublicExpansionJourney\(act,\{resume:null\}\)/);
assert.match(main,/id="journey-entry-status" role="status" hidden/);
console.log('Journey menu recovery: cloud-discovered entry/attrition, conflict choice, offline safeguards, visible failure/retry and duplicate tap protection PASS. No real-account/browser assertion.');
