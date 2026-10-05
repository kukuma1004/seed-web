import assert from 'node:assert/strict';
import {createModeBossOutbox,modeBossOutboxKey,modeBossLegacyArchiveKey} from '../src/mode-boss-outbox.js';
import {recordModeBossVictory} from '../src/mode-boss-titles.js';
import {ACCOUNT_PROFILE_KEY,readAccountProfile} from '../src/account-profile.js';
import {installBossVictoryAccount} from '../src/boss-victory-account.js';
import {createBossMigrationSeal} from '../src/boss-victory-migration.js';
import {createBossVictoryLedger} from '../src/boss-victory-events.js';
class Memory{
 constructor(){this.data=new Map();this.beforeWrite=null;this.dropWrite=false;this.dropRemove=false;}
 get length(){return this.data.size;}key(i){return [...this.data.keys()][i]??null;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){this.beforeWrite?.(k,v);if(!this.dropWrite)this.data.set(k,String(v));}
 removeItem(k){if(!this.dropRemove)this.data.delete(k);}
}
const uid='legacy-owner',epoch='sealed-epoch';
const old={mode:'survival',runId:'old-run',boss:'austin',ordinal:1},fresh={...old,runId:'new-run',bossEpoch:epoch};
const source=(e,channel='shared')=>(channel==='journey'?'seed-journey-boss-outbox-v1:'+encodeURIComponent(uid):modeBossOutboxKey(uid))+':'+encodeURIComponent(`${e.mode}:${e.runId}:${e.boss}:${e.ordinal}`);
for(const channel of ['shared','journey']){
 const m=new Memory(),box=createModeBossOutbox(m,uid,{channel});
 assert(box.enqueue(old,{durableTree:true,treeContext:{wins:9,law:null}}));
 const path=source(old,channel),bytes=' \n'+m.getItem(path)+'\n ';m.setItem(path,bytes);
 const archive=modeBossLegacyArchiveKey(uid,old,{channel});
 assert(box.archiveLegacy(old));assert.equal(m.getItem(path),null);assert.equal(m.getItem(archive),bytes,'exact envelope and whitespace remain recoverable');
 assert(box.archiveLegacy(old),'retry after source removal is idempotent');
 assert(box.enqueue(old,{durableTree:true,treeContext:{wins:9,law:null}}));m.setItem(path,bytes);
 assert(box.archiveLegacy(old),'same exact source may safely finish an interrupted copy');
 assert.equal(m.getItem(archive),bytes);assert.equal(m.getItem(ACCOUNT_PROFILE_KEY),null,'quarantine grants no counter');
 assert.equal(m.getItem('seed-garden-v1'),null);assert.equal(m.getItem('seed-discoveries-v1'),null);
 assert(box.enqueue(fresh));const newBytes=m.getItem(source(fresh,channel));
 assert.equal(box.archiveLegacy(fresh),false);assert.equal(box.archiveLegacy({...fresh,bossEpoch:undefined}),false);
 assert.equal(m.getItem(source(fresh,channel)),newBytes,'V3 is never archived even through an epochless argument');
}
assert.notEqual(modeBossLegacyArchiveKey(uid,old),modeBossLegacyArchiveKey(uid,old,{channel:'journey'}));
assert.notEqual(modeBossLegacyArchiveKey(uid,old),modeBossLegacyArchiveKey('other-owner',old));
for(const failure of ['quota','dropped-copy','conflict','future-schema','bad-json','epoch-in-old-envelope','foreign-envelope','practice','foreign-owner','owner-changed-during-copy','remove-failure']){
 const m=new Memory();let owner=uid,practice=false;const box=createModeBossOutbox(m,uid,{currentOwner:()=>owner,practice:()=>practice});assert(box.enqueue(old));
 const path=source(old),archive=modeBossLegacyArchiveKey(uid,old);
 if(failure==='quota')m.beforeWrite=k=>{if(k===archive)throw Error('quota');};
 if(failure==='dropped-copy')m.dropWrite=true;
 if(failure==='conflict')m.setItem(archive,'{"do":"not replace"}');
 if(failure==='future-schema')m.setItem(path,JSON.stringify({version:99,owner:uid,event:old}));
 if(failure==='bad-json')m.setItem(path,'{broken');
 if(failure==='epoch-in-old-envelope')m.setItem(path,JSON.stringify({version:1,owner:uid,event:{...old,bossEpoch:epoch}}));
 if(failure==='foreign-envelope')m.setItem(path,JSON.stringify({version:1,owner:'other-owner',event:old}));
 if(failure==='practice')practice=true;
 if(failure==='foreign-owner')owner='other-owner';
 if(failure==='owner-changed-during-copy')m.beforeWrite=k=>{if(k===archive)owner='other-owner';};
 if(failure==='remove-failure')m.dropRemove=true;
 const before=m.getItem(path),archiveBefore=m.getItem(archive);assert.equal(box.archiveLegacy(old),false,failure);assert.equal(m.getItem(path),before,failure+' preserves original');
 if(archiveBefore!==null)assert.equal(m.getItem(archive),archiveBefore,'existing archive is never overwritten');
 if(failure==='remove-failure'){m.dropRemove=false;assert(box.archiveLegacy(old));assert.equal(m.getItem(archive),before);}
}
{
 const m=new Memory(),box=createModeBossOutbox(m,uid);assert.equal(box.archiveLegacy(old),false,'missing source and archive never license completion');
 for(let i=0;i<2048;i++){const e={...old,runId:'capacity-'+i};m.setItem(source(e),JSON.stringify({version:1,owner:uid,event:e}));}
 assert.equal(box.enqueue(fresh),false,'full delivery queue preserves all originals');assert(box.archiveLegacy({...old,runId:'capacity-0'}));assert(box.enqueue(fresh),'verified quarantine frees capacity without discarding bytes');
 const unknown=modeBossOutboxKey(uid)+':unknown';m.setItem(unknown,'{"version":99}');const bytes=m.getItem(unknown);assert.equal(box.retry(()=>true),false);assert.equal(m.getItem(unknown),bytes,'unknown queue entries remain untouched');
}
{
 const m=new Memory();m.setItem('seed-cloud-owner-v1',uid);m.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify({version:1,austinWins:8}));
 const seal=createBossMigrationSeal(uid,epoch,{version:1,account:{version:1,austinWins:8},discoveries:{bosses:[]}},1);
 installBossVictoryAccount(m,{ownerUid:uid,seal,ledger:createBossVictoryLedger(uid,epoch,seal.baseline)});
 const box=createModeBossOutbox(m,uid);assert(box.enqueue(old,{durableTree:true}));assert(box.enqueue(fresh,{durableTree:true}));
 const oldBytes=m.getItem(source(old)),visited=[];
 assert(box.retry(event=>{
  visited.push(event.runId);const result=recordModeBossVictory(m,{...event,bossEpoch:event.bossEpoch??null});
  return result.kind==='legacy-receipt'?box.archiveLegacy(event):result.saved;
 }));
 assert.deepEqual(visited,['old-run','new-run'],'actual FIFO continues from quarantined V1 to current V3');
 assert.equal(readAccountProfile(m).austinWins,9,'only the actual current-epoch event is counted');
 assert.equal(m.getItem(modeBossLegacyArchiveKey(uid,old)),oldBytes);assert.equal(m.getItem(source(old)),null);assert.equal(m.getItem(source(fresh)),null);
 assert.equal(m.getItem('seed-discoveries-v1'),null,'quarantine itself never awards discoveries');
}
console.log('Legacy receipt quarantine passed: exact-byte owner/channel archives, idempotent recovery, FIFO V3 continuation, capacity release, unknown/V3/quota/practice/owner isolation and zero inferred historical wins. Local fixtures only.');
