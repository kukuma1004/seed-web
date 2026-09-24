import assert from 'node:assert/strict';
import {ACCOUNT_PROFILE_KEY,FOUNDING_BADGE,FOUNDING_SEED,normalizeAccountProfile,recordBestScore} from '../src/account-profile.js';
import {DISCOVERIES_KEY} from '../src/discoveries.js';
import {GARDEN_KEY,emptyGarden,gardenEffects,autoPlantSeeds,chooseBranch,setActive,growPlants} from '../src/garden.js';
import {SHOP_KEY} from '../src/shop.js';
import {SAVE_KEY} from '../src/run-save.js';
import {ACT2_STORAGE_KEYS} from '../src/act2.js';
import {ACT3_STORAGE_KEYS,act3Storage,ACT3_REGION} from '../src/act3.js';
import {MIRROR_CHECKPOINT_KEY,MIRROR_RECORD_KEY,readMirrorCheckpoint,writeMirrorCheckpoint,clearMirrorCheckpoint} from '../src/mirror-trial.js';
import {BOSS_PET_KEY,readBossPet,writeBossPet} from '../src/boss-pets.js';
import {QUALITY_KEY} from '../src/quality.js';
import {CLOUD_SCHEMA,SYNC_KEYS,collectCloudSnapshot,normalizeCloudSnapshot,mergeCloudSnapshots,mergeGardenProgress,applyRewardGrants,applyCloudSnapshot,clearCloudLocalData,isSyncKey,replacedRuns,readCheckpointBackups,forgetCheckpointBackup,snapshotAdds,CHECKPOINT_BACKUP_KEY} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';

const memory=initial=>{const data=new Map(Object.entries(initial||{}).map(([k,v])=>[k,String(v)]));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};

// Rendering quality must stay on the device: legacy PC saves at "high" must
// never enable full bloom and shadows on a phone when progress is merged.
{
 const phone=memory({[QUALITY_KEY]:'0'}),pc=memory({[QUALITY_KEY]:'2'});
 const legacyPc={...collectCloudSnapshot(pc),settings:{quality:2,theme:'botanical',sound:'on'}};
 assert.equal(isSyncKey(QUALITY_KEY),false);
 assert.equal(collectCloudSnapshot(phone).settings.quality,1,'the cloud schema has a fixed compatibility value');
 assert.equal(normalizeCloudSnapshot(legacyPc).settings.quality,1,'old PC quality must not propagate');
 applyCloudSnapshot(phone,legacyPc);
 assert.equal(phone.getItem(QUALITY_KEY),'0');
 clearCloudLocalData(phone);
 assert.equal(phone.getItem(QUALITY_KEY),'0','signing out must keep the phone quality setting');
}

// Same-UID devices share personal act records and the union of discovered forms.
// The local top-20 board is intentionally separate: it can contain other users.
{
 const pad=memory({[ACCOUNT_PROFILE_KEY]:JSON.stringify(recordBestScore(null,'act1',12000)),[DISCOVERIES_KEY]:JSON.stringify({version:1,forms:['prism'],bosses:[]})});
 const phone=memory({[ACCOUNT_PROFILE_KEY]:JSON.stringify(recordBestScore(null,'act2',18000)),[DISCOVERIES_KEY]:JSON.stringify({version:1,forms:['prism','mirrorguard'],bosses:[]})});
 const merged=mergeCloudSnapshots(collectCloudSnapshot(pad),collectCloudSnapshot(phone));
 assert.deepEqual(merged.account.bestScores,{act1:12000,act2:18000,act3:0});
 assert.ok(merged.discoveries.forms.includes('prism'));
 assert.ok(merged.discoveries.forms.includes('mirrorguard'));
 applyCloudSnapshot(pad,merged);
 assert.deepEqual(JSON.parse(pad.getItem(ACCOUNT_PROFILE_KEY)).bestScores,{act1:12000,act2:18000,act3:0});
}

// An app left open on the phone receives progress made on the tablet when it
// returns to the foreground and explicitly refreshes the same UID's save.
{
 let remote=null;const user={ready:async()=>({uid:'same-user'}),user:()=>({uid:'same-user'}),tokenSession:async()=>({uid:'same-user',idToken:'token'})};
 const fetchImpl=async(url,options={})=>{
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT')remote=JSON.parse(options.body);
  return {ok:true,status:200,headers:{get:()=>null},json:async()=>remote};
 };
 const padStore=memory(),phoneStore=memory();
 const padCloud=createCloudSync({storage:padStore,account:user,fetchImpl,debounceMs:60_000});
 const phoneCloud=createCloudSync({storage:phoneStore,account:user,fetchImpl,debounceMs:60_000});
 await padCloud.start();await phoneCloud.start();
 padCloud.storage.setItem(ACCOUNT_PROFILE_KEY,JSON.stringify(recordBestScore(null,'act3',27000)));
 padCloud.storage.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:['prism'],bosses:[]}));
 await padCloud.syncNow();
 const returned=await phoneCloud.syncNow();
 assert.equal(returned.changed,true);
 assert.equal(JSON.parse(phoneStore.getItem(ACCOUNT_PROFILE_KEY)).bestScores.act3,27000);
 assert.ok(JSON.parse(phoneStore.getItem(DISCOVERIES_KEY)).forms.includes('prism'));
 padCloud.signOutCleanup();phoneCloud.signOutCleanup();
}

// 2026-09-22 신고(저장하고 나갔는데 예전으로 돌아옴): 두 기기의 저장 중 '더 최근에 저장한 판'을 고른다.
// 예전에는 올리지 못한 작은 변경이 있는 기기 쪽 저장을 통째로 골라, 그 기기의 옛 판이 다른 기기의 최신 판을 덮었다.
{
 const {writeCheckpoint,clearCheckpoint,readCheckpoint}=await import('../src/run-save.js');
 const run=(stage,kills)=>({version:1,cycle:1,stage,mode:'entry',region:'garden',hp:90,rules:['split'],mutated:[],kills,elapsed:60+stage*30});
 const phone=memory(),pc=memory();
 writeCheckpoint(pc,run(1,20),1000);            // PC에 남은 옛 판(1번째 방)
 writeCheckpoint(phone,run(3,90),5000);         // 휴대폰에서 3번째 방까지 가고 저장하고 나감
 const server=collectCloudSnapshot(phone,{revision:7,updatedAt:5000});
 // PC를 켜면 PC 쪽에 올리지 못한 변경(새 소식 읽음 등)이 있어 PC 저장이 '이긴 쪽'이 된다.
 const merged=mergeCloudSnapshots(collectCloudSnapshot(pc,{revision:6,updatedAt:6000}),server,{prefer:'local'});
 assert.equal(merged.checkpoints.act1.stage,3,'PC의 옛 판이 휴대폰의 최신 판을 덮지 않는다');
 applyCloudSnapshot(pc,merged);assert.equal(readCheckpoint(pc).stage,3,'PC에서도 최신 판을 이어한다');
 // 휴대폰에서 판이 끝나(저장 지움) 올라간 뒤, PC의 옛 판이 되살아나지 않는다.
 clearCheckpoint(phone,8000);
 const ended=mergeCloudSnapshots(collectCloudSnapshot(pc,{revision:8,updatedAt:8100}),collectCloudSnapshot(phone,{revision:9,updatedAt:8000}),{prefer:'local'});
 assert.equal(ended.checkpoints.act1.cleared,true,'끝난 판은 끝난 채로');applyCloudSnapshot(pc,ended);assert.equal(readCheckpoint(pc),null);
 // 반대로 더 최근에 새로 시작한 판은 옛 '지운 표시'를 이긴다.
 writeCheckpoint(pc,run(0,0),9000);
 const fresh=mergeCloudSnapshots(collectCloudSnapshot(pc,{revision:10,updatedAt:9000}),collectCloudSnapshot(phone,{revision:9,updatedAt:8000}),{prefer:'remote'});
 assert.equal(fresh.checkpoints.act1.stage,0,'새로 시작한 판이 이긴다');
 // 시각이 없는 예전 저장끼리는 예전처럼 이긴 쪽 것을 쓴다.
 const legacyA=normalizeCloudSnapshot({checkpoints:{act1:run(2,40)}}),legacyB=normalizeCloudSnapshot({checkpoints:{act1:run(4,80)}});
 assert.equal(mergeCloudSnapshots(legacyA,legacyB,{prefer:'local'}).checkpoints.act1.stage,2);
 assert.equal(mergeCloudSnapshots(legacyA,legacyB,{prefer:'remote'}).checkpoints.act1.stage,4);
}

// Only explicit game progress keys are allowed into the cloud snapshot.
{
 const storage=memory({
  [DISCOVERIES_KEY]:JSON.stringify({version:1,forms:['prism'],bosses:['austin']}),
  [GARDEN_KEY]:JSON.stringify({...emptyGarden(),harvests:3}),
  [SHOP_KEY]:JSON.stringify({version:2,coins:750,stash:{tonic:2,sprout:0},carry:{tonic:1,sprout:0},gifts:[]}),
  'seed-firebase-auth-v1':'SECRET_TOKEN','seed-ranking-pending-v2':'PRIVATE_QUEUE','unrelated':'nope'
 });
 const snapshot=collectCloudSnapshot(storage,{revision:4,updatedAt:123});
 assert.equal(snapshot.version,CLOUD_SCHEMA);assert.equal(snapshot.revision,4);assert.equal(snapshot.shop.coins,750);assert.equal(snapshot.garden.harvests,3);
 const encoded=JSON.stringify(snapshot);assert.ok(!encoded.includes('SECRET_TOKEN')&&!encoded.includes('PRIVATE_QUEUE')&&!encoded.includes('unrelated'));
 assert.ok(SYNC_KEYS.includes(SAVE_KEY)&&SYNC_KEYS.includes(ACT2_STORAGE_KEYS[SAVE_KEY])&&SYNC_KEYS.includes(ACT3_STORAGE_KEYS[SAVE_KEY]));
 assert.ok(SYNC_KEYS.includes(MIRROR_CHECKPOINT_KEY)&&SYNC_KEYS.includes(MIRROR_RECORD_KEY));
}

// Act 3 checkpoints use an independent key and must survive cloud round-trips.
{
 const {writeCheckpoint,readCheckpoint}=await import('../src/run-save.js');
 const phone=memory(),pc=memory(),run={version:1,cycle:2,stage:3,mode:'entry',region:ACT3_REGION,hp:72,rules:['chain'],mutated:[],kills:42,elapsed:330};
 assert.equal(writeCheckpoint(act3Storage(phone),run,5000),true);
 const merged=mergeCloudSnapshots(collectCloudSnapshot(pc),collectCloudSnapshot(phone),{prefer:'local'});
 applyCloudSnapshot(pc,merged);
 assert.equal(readCheckpoint(act3Storage(pc))?.stage,3);
 assert.equal(readCheckpoint(pc),null,'act 3 must not replace act 1');
}

// The hundred-floor tower keeps its ten-floor entry across devices. A later
// completion tombstone must beat an older copy of that checkpoint.
{
 const phone=memory(),pc=memory(),entry={floor:31,hp:63,levels:{reflect:3},forms:{},rules:['reflect'],mutated:['reflect'],choicesTaken:30,choiceKills:0,kills:200,elapsed:900};
 assert.equal(writeMirrorCheckpoint(phone,entry,5000),true);
 let merged=mergeCloudSnapshots(collectCloudSnapshot(pc,{revision:2}),collectCloudSnapshot(phone,{revision:3}),{prefer:'local'});
 applyCloudSnapshot(pc,merged);assert.equal(readMirrorCheckpoint(pc)?.floor,31);
 clearMirrorCheckpoint(phone,8000);
 merged=mergeCloudSnapshots(collectCloudSnapshot(pc,{revision:4}),collectCloudSnapshot(phone,{revision:5}),{prefer:'local'});
 applyCloudSnapshot(pc,merged);assert.equal(readMirrorCheckpoint(pc),null);
}

// A remote save wins ordinary conflicting state, while discoveries and entitlements are unioned.
{
 const local=normalizeCloudSnapshot({discoveries:{version:1,forms:['prism'],bosses:[]},shop:{coins:100},account:{badges:['local'],skins:[],equippedTitle:'codex'}});
 const remote=normalizeCloudSnapshot({discoveries:{version:1,forms:['collapse'],bosses:['austin']},shop:{coins:900},account:{badges:['remote'],skins:['jade'],equippedTitle:'austin'}});
 const merged=mergeCloudSnapshots(local,remote,{prefer:'remote'});
 assert.equal(merged.shop.coins,900);assert.deepEqual(new Set(merged.discoveries.forms),new Set(['prism','collapse']));assert.deepEqual(new Set(merged.account.badges),new Set(['local','remote']));
 assert.equal(merged.account.equippedTitle,'austin');
}

// A phone that starts fresh after the PC cannot delete five Austin victories,
// permanent garden growth, or completed-journey evidence on the PC.
{
 const pcGarden={...emptyGarden(),bossWins:5,harvests:7,mastery:{power:3,move:2,critical:1,cooldown:0,maxHp:0},records:[{law:'split',score:4200,kills:90,journey:5,boss:'austin'}]};
 const phoneGarden={...emptyGarden(),bossWins:0,harvests:1,records:[{law:'chain',score:300,kills:8,journey:1,boss:null}]};
 const merged=mergeGardenProgress(pcGarden,phoneGarden,{prefer:'remote'});
 assert.equal(merged.bossWins,5);assert.equal(merged.harvests,7);
 assert.equal(merged.mastery.power,3);assert.equal(merged.mastery.move,2);
 assert.equal(merged.records.length,2);assert.equal(merged.records[1].boss,'austin');
 const pc=normalizeCloudSnapshot({garden:pcGarden,discoveries:{version:1,forms:['collapse'],bosses:['austin']}});
 const phone=normalizeCloudSnapshot({garden:phoneGarden,discoveries:{version:1,forms:[],bosses:[]}});
 const whole=mergeCloudSnapshots(pc,phone,{prefer:'remote'});
 assert.equal(whole.garden.bossWins,5);
 assert.ok(whole.discoveries.forms.includes('collapse')&&whole.discoveries.bosses.includes('austin'));
 assert.equal(snapshotAdds(whole,phone),true,'recovered progress must be uploaded to the other device');
}

// A defeated-boss pet is a cosmetic selection shared across devices. Later
// unequips must beat an older equipped copy, without losing the boss unlock.
{
 const phone=memory(),pc=memory();
 const profile={bosses:['austin']};
 phone.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:[],bosses:['austin']}));
 pc.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:[],bosses:['austin']}));
 assert.equal(writeBossPet(phone,profile,'austin',5000).saved,true);
 let merged=mergeCloudSnapshots(collectCloudSnapshot(pc),collectCloudSnapshot(phone),{prefer:'local'});
 applyCloudSnapshot(pc,merged);
 assert.ok(SYNC_KEYS.includes(BOSS_PET_KEY));
 assert.equal(readBossPet(pc,profile).id,'austin');
 writeBossPet(pc,profile,null,7000);
 merged=mergeCloudSnapshots(collectCloudSnapshot(phone),collectCloudSnapshot(pc),{prefer:'local'});
 applyCloudSnapshot(phone,merged);
 assert.equal(readBossPet(phone,profile).id,null);
 assert.equal(merged.bossPet.updatedAt,7000);
}

// Founding rewards apply once even if the same grant is downloaded repeatedly.
{
 const grant={label:'SEED 창립 테스터 선물',rewards:{jp:3000,badges:[FOUNDING_BADGE],seeds:{[FOUNDING_SEED]:1},items:{tonic:2},skins:['founder-glow']}};
 const first=applyRewardGrants(normalizeCloudSnapshot({shop:{coins:100}}),{'founding-tester-2026':grant},5000);
 assert.equal(first.applied.length,1);assert.equal(first.snapshot.shop.coins,3100);assert.equal(first.snapshot.shop.stash.tonic,2);assert.equal(first.snapshot.garden.plots[0].seed,FOUNDING_SEED);
 assert.ok(first.snapshot.account.badges.includes(FOUNDING_BADGE)&&first.snapshot.account.skins.includes('founder-glow'));
 const second=applyRewardGrants(first.snapshot,{'founding-tester-2026':grant},6000);
 assert.equal(second.applied.length,0);assert.equal(second.snapshot.shop.coins,3100);assert.equal(second.snapshot.garden.plots[0].seed,FOUNDING_SEED);
}

// The beta seed is a garden collectible: it can grow and be displayed, but never changes combat odds.
{
 let garden=emptyGarden();garden.seeds[FOUNDING_SEED]=1;
 garden=autoPlantSeeds(garden);garden=growPlants(garden,9);garden=chooseBranch(garden,0,'flower').garden;garden=setActive(garden,0,true).garden;
 const effects=gardenEffects(garden);assert.equal(effects.actives.length,1);assert.deepEqual(effects.lawWeights,{});assert.equal(effects.freshBonus,0);
}

// Applying a snapshot replaces only the allowlisted state and keeps auth/local queues untouched.
{
 const storage=memory({'seed-firebase-auth-v1':'keep','seed-ranking-pending-v2':'keep'});
 const value=normalizeCloudSnapshot({shop:{coins:4321},account:{badges:[FOUNDING_BADGE]},player:{name:'새싹'}});
 assert.equal(applyCloudSnapshot(storage,value),true);assert.equal(JSON.parse(storage.getItem(SHOP_KEY)).coins,4321);assert.equal(JSON.parse(storage.getItem(ACCOUNT_PROFILE_KEY)).badges[0],FOUNDING_BADGE);
 assert.equal(storage.getItem('seed-firebase-auth-v1'),'keep');assert.equal(storage.getItem('seed-ranking-pending-v2'),'keep');
 assert.equal(normalizeAccountProfile(JSON.parse(storage.getItem(ACCOUNT_PROFILE_KEY))).version,1);
}

// The live coordinator creates the first UID save, uploads later local changes and consumes a remote grant once.
{
 const storage=memory({[SHOP_KEY]:JSON.stringify({version:2,coins:100,stash:{tonic:0,sprout:0},carry:{tonic:0,sprout:0},gifts:[]})});
 const state={save:null,rewards:null,puts:0},account={ready:async()=>({uid:'u1'}),user:()=>({uid:'u1'}),tokenSession:async()=>({uid:'u1',idToken:'token'})};
 const fetchImpl=async(url,options={})=>{
  const path=new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'');
  const key=path==='seedUsers/u1/save'?'save':path==='seedUserRewards/u1'?'rewards':null;
  if(!key)return {ok:false,status:404,json:async()=>({error:'not found'})};
  if(options.method==='PUT'){state[key]=JSON.parse(options.body);state.puts++;return {ok:true,status:200,json:async()=>state[key]};}
  return {ok:true,status:200,json:async()=>state[key]};
 };
 let clock=1000;const cloud=createCloudSync({storage,account,fetchImpl,now:()=>++clock,debounceMs:60_000});
 const first=await cloud.start();assert.equal(first.ok,true);assert.equal(state.puts,1);assert.equal(state.save.shop.coins,100);
 cloud.storage.setItem(SHOP_KEY,JSON.stringify({...state.save.shop,coins:150}));
 const second=await cloud.syncNow();assert.equal(second.ok,true);assert.equal(state.save.shop.coins,150);
 state.rewards={'founding-tester-2026':{label:'창립 테스터',createdAt:clock,rewards:{jp:3000,badges:[FOUNDING_BADGE],seeds:{[FOUNDING_SEED]:1}}}};
 const reward=await cloud.syncNow();assert.equal(reward.rewards.length,1);assert.equal(JSON.parse(storage.getItem(SHOP_KEY)).coins,3150);
 const again=await cloud.syncNow();assert.equal(again.rewards.length,0);assert.equal(JSON.parse(storage.getItem(SHOP_KEY)).coins,3150);
}

// Leaving a run must wait for its checkpoint to reach the account, including
// a second save made while the first upload was in flight.
{
 const {writeCheckpoint,readCheckpoint}=await import('../src/run-save.js');
 const run=stage=>({version:1,cycle:0,stage,mode:'entry',region:'garden',hp:90,rules:[],mutated:[],kills:stage*10,elapsed:stage*60});
 const account={ready:async()=>({uid:'same-run'}),user:()=>({uid:'same-run'}),tokenSession:async()=>({uid:'same-run',idToken:'token'})};
 let remote=null,duringPut=null,failUpload=false;
 const fetchImpl=async(url,options={})=>{
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT'){
   if(failUpload){failUpload=false;return {ok:false,status:503,json:async()=>({error:'offline'})};}
   remote=JSON.parse(options.body);if(duringPut){const callback=duringPut;duringPut=null;callback();}
  }
  return {ok:true,status:200,headers:{get:()=>null},json:async()=>remote};
 };
 const padStore=memory(),phoneStore=memory();
 const pad=createCloudSync({storage:padStore,account,fetchImpl,debounceMs:60_000});
 const phone=createCloudSync({storage:phoneStore,account,fetchImpl,debounceMs:60_000});
 await pad.start();await phone.start();
 writeCheckpoint(pad.storage,run(1),1000);
 duringPut=()=>writeCheckpoint(pad.storage,run(2),2000);
 assert.equal((await pad.flush()).ok,true);
 assert.equal(pad.isDirty(),false);
 assert.equal(remote.checkpoints.act1.stage,2,'save-and-exit waits for the last checkpoint upload');
 await phone.syncNow();assert.equal(readCheckpoint(phone.storage)?.stage,2,'another device can continue at the saved room');
 failUpload=true;writeCheckpoint(pad.storage,run(3),3000);
 assert.equal((await pad.flush()).reason,'upload');
 assert.equal(readCheckpoint(pad.storage)?.stage,3,'a failed cloud upload keeps the local checkpoint');
 assert.equal(remote.checkpoints.act1.stage,2,'a failed upload must not claim cross-device progress');
 assert.equal((await pad.flush()).ok,true);
 await phone.syncNow();assert.equal(readCheckpoint(phone.storage)?.stage,3);
 pad.signOutCleanup();phone.signOutCleanup();
}

// A concurrent phone write between GET and PUT must be merged, not replaced.
{
 const storage=memory({[DISCOVERIES_KEY]:JSON.stringify({version:1,forms:['collapse'],bosses:['austin'],records:{}})});
 const account={ready:async()=>({uid:'race'}),user:()=>({uid:'race'}),tokenSession:async()=>({uid:'race',idToken:'token'})};
 let remote=normalizeCloudSnapshot({revision:1,updatedAt:100,discoveries:{version:1,forms:[],bosses:[],records:{}}}),tag='v1',raced=false,puts=0;
 const fetchImpl=async(url,options={})=>{
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT'){
   puts++;
   if(!raced){raced=true;remote=normalizeCloudSnapshot({revision:2,updatedAt:200,discoveries:{version:1,forms:['prism'],bosses:[],records:{}}});tag='v2';return {ok:false,status:412,json:async()=>remote};}
   assert.equal(options.headers['if-match'],'v2');remote=JSON.parse(options.body);tag='v3';return {ok:true,status:200,json:async()=>remote};
  }
  return {ok:true,status:200,headers:{get:name=>name==='etag'?tag:null},json:async()=>remote};
 };
 const cloud=createCloudSync({storage,account,fetchImpl,now:()=>300,debounceMs:60_000});
 const result=await cloud.start();
 assert.equal(result.ok,true);assert.equal(puts,2);
 assert.deepEqual(new Set(remote.discoveries.forms),new Set(['collapse','prism']));
 assert.ok(remote.discoveries.bosses.includes('austin'));
}

// A beta applicant can already own a Google UID from the web form. If an Android
// guest then selects that account, the durable auth marker must claim the local
// save for the existing Google UID instead of replacing it with an empty save.
{
 const storage=memory({
  [SHOP_KEY]:JSON.stringify({version:2,coins:875,stash:{tonic:3,sprout:0},carry:{tonic:2,sprout:0},gifts:[]}),
  'seed-cloud-owner-v1':'guest-uid',
  'seed-cloud-meta-v1':JSON.stringify({version:1,ownerUid:'guest-uid',localRevision:4,syncedRevision:4,updatedAt:900})
 });
 const state={save:null,finished:false},account={
  ready:async()=>({uid:'google-uid'}),user:()=>({uid:'google-uid'}),tokenSession:async()=>({uid:'google-uid',idToken:'token'}),
  pendingMigration:()=>({fromUid:'guest-uid',toUid:'google-uid'}),finishMigration:()=>{state.finished=true;}
 };
 const fetchImpl=async(url,options={})=>{
  if(!url.includes('seedUsers/google-uid/save'))return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT'){state.save=JSON.parse(options.body);return {ok:true,status:200,json:async()=>state.save};}
  return {ok:true,status:200,json:async()=>state.save};
 };
 const cloud=createCloudSync({storage,account,fetchImpl,now:()=>1000,debounceMs:60_000});
 const migrated=await cloud.start();
 assert.equal(migrated.ok,true);assert.equal(migrated.migrated,true);assert.equal(state.finished,true);
 assert.equal(state.save.shop.coins,875);assert.equal(state.save.shop.stash.tonic,3);assert.equal(storage.getItem('seed-cloud-owner-v1'),'google-uid');
}

// 2026-09-21: 업로드가 오가는 사이에 방 저장을 하면, 그 저장이 '올림'으로 잘못 표시되어 다음 실행 때
// 서버의 옛 저장이 이겨 진행이 되돌아갔다. 이제는 아직 안 올린 것으로 남아 다음 동기화에서 올라가고, 다음 실행에서도 기기 저장이 이긴다.
{
 const storage=memory({[SHOP_KEY]:JSON.stringify({version:2,coins:100,stash:{tonic:0,sprout:0},carry:{tonic:0,sprout:0},gifts:[]})});
 const state={save:null,puts:0,duringPut:null},account={ready:async()=>({uid:'u9'}),user:()=>({uid:'u9'}),tokenSession:async()=>({uid:'u9',idToken:'t'})};
 const fetchImpl=async(url,options={})=>{
  const path=new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'');
  if(path!=='seedUsers/u9/save')return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT'){state.save=JSON.parse(options.body);state.puts++;if(state.duringPut){const f=state.duringPut;state.duringPut=null;f();}return {ok:true,status:200,json:async()=>state.save};}
  return {ok:true,status:200,json:async()=>state.save};
 };
 let clock=5000;const cloud=createCloudSync({storage,account,fetchImpl,now:()=>++clock,debounceMs:60_000});
 await cloud.start();
 cloud.storage.setItem(SHOP_KEY,JSON.stringify({...state.save.shop,coins:200}));
 // 두 번째 업로드가 오가는 사이에 코인이 300이 된다.
 state.duringPut=()=>cloud.storage.setItem(SHOP_KEY,JSON.stringify({...state.save.shop,coins:300}));
 await cloud.syncNow();
 assert.equal(state.save.shop.coins,200,'이번 업로드에는 200까지만 들어갔다');
 assert.equal(cloud.isDirty(),true,'올리는 사이 저장한 300은 아직 안 올린 것으로 남는다');
 const meta=JSON.parse(storage.getItem('seed-cloud-meta-v1'));assert.ok(meta.localRevision>meta.syncedRevision);
 // 다음 실행(새 코디네이터): 기기 저장(300)이 서버(200)를 이기고 올라간다.
 const next=createCloudSync({storage,account,fetchImpl,now:()=>++clock,debounceMs:60_000});
 await next.start();
 assert.equal(JSON.parse(storage.getItem(SHOP_KEY)).coins,300,'다음 실행에서 서버의 옛 저장이 기기 저장을 덮어쓰지 않는다');
 assert.equal(state.save.shop.coins,300);
}

// 2026-09-23 테스터 신고: "핸펀 업뎃하고 하니까 컴터로 해 둔 기록(오스틴 5번 잡은 판·새 도감)이 날아감".
// 휴대폰에서 더 나중에 새로 시작한 짧은 판이 PC의 긴 판을 덮으면, PC는 덮이기 전 판을 따로 남겨 되살릴 수 있어야 하고,
// PC에만 있던 도감은 PC에 '새 저장'이 없어도 서버로 올라가야 한다.
{
 const {writeCheckpoint,clearCheckpoint,readCheckpoint}=await import('../src/run-save.js');
 const run=(stage,elapsed,austins)=>({version:1,cycle:austins*5,stage,mode:'entry',region:'garden',hp:90,rules:['split'],mutated:[],kills:10,elapsed,wardens:austins*5,austins});
 const pc=memory();
 writeCheckpoint(pc,run(2,3000,5),1000);
 pc.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:['icicle','frostnet'],bosses:['warden','austin'],records:{}}));
 pc.setItem(GARDEN_KEY,JSON.stringify({...emptyGarden(),bossWins:5,mastery:{power:3,move:2,critical:1,cooldown:0,maxHp:0},records:[{law:'split',score:4200,kills:90,journey:5,boss:'austin'}]}));
 pc.setItem('seed-cloud-owner-v1','uid');pc.setItem('seed-cloud-meta-v1',JSON.stringify({version:1,ownerUid:'uid',localRevision:5,syncedRevision:5,updatedAt:1000}));
 const phone=memory();writeCheckpoint(phone,run(0,120,0),9000);phone.setItem(DISCOVERIES_KEY,JSON.stringify({version:1,forms:['icicle'],bosses:['warden'],records:{}}));
 phone.setItem(GARDEN_KEY,JSON.stringify(emptyGarden()));
 const state={save:collectCloudSnapshot(phone,{revision:9,updatedAt:9000}),puts:0};
 const account={ready:async()=>({uid:'uid'}),user:()=>({uid:'uid'}),tokenSession:async()=>({uid:'uid',idToken:'t'})};
 const fetchImpl=async(url,options={})=>{
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  if(options.method==='PUT'){state.puts++;state.save=JSON.parse(options.body);}
  return {ok:true,status:200,json:async()=>state.save};
 };
 const cloud=createCloudSync({storage:pc,account,fetchImpl,now:()=>10_000,debounceMs:60_000});
 assert.equal((await cloud.start()).ok,true);
 assert.equal(readCheckpoint(pc).elapsed,120,'이어하기 칸은 여전히 더 최근 판(휴대폰)');
 const backup=readCheckpointBackups(pc,10_000).act1;
 assert.equal(backup?.checkpoint.austins,5,'덮인 PC 판(오스틴 5번)은 따로 남는다');
 assert.equal(state.puts,1,'PC에만 있던 도감을 올린다');
 assert.deepEqual([...state.save.discoveries.forms].sort(),['frostnet','icicle']);assert.ok(state.save.discoveries.bosses.includes('austin'));
 assert.equal(state.save.garden.bossWins,5,'PC의 보스 격파 횟수도 전화기 쪽 최신 저장에 밀리지 않는다');
 assert.equal(state.save.garden.records[0].boss,'austin','완료한 여정 기록을 남긴다');
 assert.ok(!JSON.stringify(state.save).includes(CHECKPOINT_BACKUP_KEY),'남긴 판은 서버로 가지 않는다');
 // 되살리기: 남긴 판을 지금 시각으로 다시 저장하면 가장 최근 판이 되어 다른 기기에도 간다.
 writeCheckpoint(cloud.storage,backup.checkpoint,11_000);forgetCheckpointBackup(pc,'act1',11_000);
 await cloud.syncNow();assert.equal(state.save.checkpoints.act1.austins,5);assert.deepEqual(readCheckpointBackups(pc,11_000),{});
 // 같은 판을 다른 기기에서 더 이어 간 경우·끝난 판 표시로 바뀐 경우는 남기지 않는다.
 const snap=(cp)=>normalizeCloudSnapshot({checkpoints:{act1:cp}});
 assert.deepEqual(replacedRuns(snap(run(2,3000,5)),snap(run(4,3400,5))),{},'더 이어 간 같은 판');
 assert.deepEqual(replacedRuns(snap(run(2,3000,5)),snap({version:1,cleared:true,savedAt:5})),{},'끝난 판 표시');
 // 병합이 서버와 같으면(순서만 다름) 올리지 않는다.
 const a=normalizeCloudSnapshot({discoveries:{version:1,forms:['icicle','frostnet'],bosses:[],records:{}}}),b=normalizeCloudSnapshot({discoveries:{version:1,forms:['frostnet','icicle'],bosses:[],records:{}}});
 assert.equal(snapshotAdds(a,b),false);
 // PC를 바로 확인할 수 없는 테스터를 위해 90일 동안 밀린 판을 남긴다.
 const old=memory({[CHECKPOINT_BACKUP_KEY]:JSON.stringify({act1:{at:0,checkpoint:{...run(2,3000,5),savedAt:1}}})});
 assert.equal(readCheckpointBackups(old,89*864e5).act1?.checkpoint.austins,5);assert.deepEqual(readCheckpointBackups(old,91*864e5),{});
}

console.log('Cloud save: allowlist, cross-device merge, idempotent tester rewards, founder seed and safe apply passed.');
