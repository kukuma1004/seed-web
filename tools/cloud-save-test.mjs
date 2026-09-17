import assert from 'node:assert/strict';
import {ACCOUNT_PROFILE_KEY,FOUNDING_BADGE,FOUNDING_SEED,normalizeAccountProfile} from '../src/account-profile.js';
import {DISCOVERIES_KEY} from '../src/discoveries.js';
import {GARDEN_KEY,emptyGarden,gardenEffects,plantSeed,chooseBranch,setActive,growPlants} from '../src/garden.js';
import {SHOP_KEY} from '../src/shop.js';
import {SAVE_KEY} from '../src/run-save.js';
import {ACT2_STORAGE_KEYS} from '../src/act2.js';
import {CLOUD_SCHEMA,SYNC_KEYS,collectCloudSnapshot,normalizeCloudSnapshot,mergeCloudSnapshots,applyRewardGrants,applyCloudSnapshot} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';

const memory=initial=>{const data=new Map(Object.entries(initial||{}).map(([k,v])=>[k,String(v)]));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};

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
 assert.ok(SYNC_KEYS.includes(SAVE_KEY)&&SYNC_KEYS.includes(ACT2_STORAGE_KEYS[SAVE_KEY]));
}

// A remote save wins ordinary conflicting state, while discoveries and entitlements are unioned.
{
 const local=normalizeCloudSnapshot({discoveries:{version:1,forms:['prism'],bosses:[]},shop:{coins:100},account:{badges:['local'],skins:[]}});
 const remote=normalizeCloudSnapshot({discoveries:{version:1,forms:['collapse'],bosses:['austin']},shop:{coins:900},account:{badges:['remote'],skins:['jade']}});
 const merged=mergeCloudSnapshots(local,remote,{prefer:'remote'});
 assert.equal(merged.shop.coins,900);assert.deepEqual(new Set(merged.discoveries.forms),new Set(['prism','collapse']));assert.deepEqual(new Set(merged.account.badges),new Set(['local','remote']));
}

// Founding rewards apply once even if the same grant is downloaded repeatedly.
{
 const grant={label:'SEED 창립 테스터 선물',rewards:{jp:3000,badges:[FOUNDING_BADGE],seeds:{[FOUNDING_SEED]:1},items:{tonic:2},skins:['founder-glow']}};
 const first=applyRewardGrants(normalizeCloudSnapshot({shop:{coins:100}}),{'founding-tester-2026':grant},5000);
 assert.equal(first.applied.length,1);assert.equal(first.snapshot.shop.coins,3100);assert.equal(first.snapshot.shop.stash.tonic,2);assert.equal(first.snapshot.garden.seeds[FOUNDING_SEED],1);
 assert.ok(first.snapshot.account.badges.includes(FOUNDING_BADGE)&&first.snapshot.account.skins.includes('founder-glow'));
 const second=applyRewardGrants(first.snapshot,{'founding-tester-2026':grant},6000);
 assert.equal(second.applied.length,0);assert.equal(second.snapshot.shop.coins,3100);assert.equal(second.snapshot.garden.seeds[FOUNDING_SEED],1);
}

// The beta seed is a garden collectible: it can grow and be displayed, but never changes combat odds.
{
 let garden=emptyGarden();garden.seeds[FOUNDING_SEED]=1;
 garden=plantSeed(garden,FOUNDING_SEED,0).garden;garden=growPlants(garden,9);garden=chooseBranch(garden,0,'flower').garden;garden=setActive(garden,0,true).garden;
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

console.log('Cloud save: allowlist, cross-device merge, idempotent tester rewards, founder seed and safe apply passed.');
