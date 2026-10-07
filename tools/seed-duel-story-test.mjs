import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {DUEL_STORY_STAGES as LEGACY_STAGES,DUEL_STORY_CHAPTERS as LEGACY_CHAPTERS,DUEL_RELEASE_STORY_STAGES as DUEL_STORY_STAGES,DUEL_RELEASE_STORY_CHAPTERS as DUEL_STORY_CHAPTERS,completeStoryMatch} from '../src/seed-duel-story.js';
import {DUEL_STORY_STAGE_COUNT,normalizeDuelStory,mergeDuelStory,storyUnlocked,nextStoryStage,duelStorySaveKey,readDuelStory,writeDuelStory} from '../src/seed-duel-story-progress.js';
import {createDuel,stepDuel,duelAi,DUEL_ORDER,availableDuelCharacters,availableDuelOpponents} from '../src/seed-duel-rules.js';
import {collectCloudSnapshot,mergeCloudSnapshots,applyCloudSnapshot,isSyncKey} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';
import {DUEL_RELEASE_ORDER} from '../src/seed-duel-release-catalog.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
// Independent Firebase REST nodes and ETags; device tests use mocked transport,
// not authenticated Firebase or physical PC/phone sessions.
const cloudFixture=({read=()=>undefined,onPut=()=>{},beforePut=()=>null}={})=>{
 const records=new Map(),etags=new Map();
 const set=(path,value)=>{const copy=structuredClone(value);if(!records.has(path)||JSON.stringify(records.get(path))!==JSON.stringify(copy)){records.set(path,copy);etags.set(path,(etags.get(path)||0)+1);}};
 const fetch=async(url,options={})=>{
  const path=new URL(url).pathname.replace(/^\//,'').replace(/\.json$/,'');
  const external=read(path);if(external!==undefined)set(path,external);
  const response=(status=200,value=records.get(path)??null)=>({ok:status>=200&&status<300,status,headers:{get:name=>name.toLowerCase()==='etag'?String(etags.get(path)||0):null},json:async()=>structuredClone(value)});
  if(options.method==='PUT'){
   const interrupted=beforePut({path,options,response,set});if(interrupted)return interrupted;
   if(options.headers?.['if-match']!==undefined&&options.headers['if-match']!==String(etags.get(path)||0))return response(412,{error:'stale ETag'});
   const value=JSON.parse(options.body);set(path,value);onPut(path,structuredClone(value));
  }
  return response();
 };
 return {records,etags,set,fetch};
};

const accountOnly=process.argv.includes('--account-only');
assert.equal(LEGACY_CHAPTERS.length,8);assert.equal(LEGACY_STAGES.length,36);assert.equal(DUEL_STORY_STAGES.length,DUEL_STORY_STAGE_COUNT);assert.equal(DUEL_STORY_STAGE_COUNT,175);assert.ok(DUEL_STORY_CHAPTERS.length>8);assert.deepEqual(DUEL_STORY_STAGES.slice(0,36),LEGACY_STAGES);assert.deepEqual(DUEL_STORY_STAGES.map(v=>v.difficulty),['easy','easy','easy','normal','normal','normal',...Array(DUEL_STORY_STAGES.length-6).fill('hard')]);
assert.deepEqual([...DUEL_STORY_STAGES.map(v=>v.enemy)].sort(),[...DUEL_RELEASE_ORDER].sort());
for(const hero of DUEL_RELEASE_ORDER.slice(9))assert.equal(mergeDuelStory({hero,updatedAt:500,cleared:{s1:{losses:0,at:400}}},{hero:'pierce',updatedAt:100}).hero,hero);
assert.deepEqual(availableDuelCharacters(),['pierce']);
assert.ok(availableDuelOpponents().includes('burst'),'one starter still has a valid practice opponent');
assert.equal(availableDuelOpponents().includes('heart'),false);
const oldComplete={cleared:Object.fromEntries(Array.from({length:9},(_,i)=>[`s${i+1}`,{losses:0,at:100}]))};assert.equal(nextStoryStage(oldComplete),10);assert.equal(storyUnlocked(oldComplete,10),true);assert.equal(storyUnlocked(oldComplete,11),false);
const old36={cleared:Object.fromEntries(Array.from({length:36},(_,i)=>[`s${i+1}`,{losses:0,at:100}]))};assert.equal(nextStoryStage(old36),37);assert.equal(storyUnlocked(old36,37),true);assert.equal(storyUnlocked(old36,38),false);
let p=normalizeDuelStory(null);assert.equal(nextStoryStage(p),1);assert.equal(storyUnlocked(p,2),false);
// Completed engine matches, including a lost round, advance the story. Menus,
// practice, losses and mismatched opponents cannot unlock another encounter.
for(const stage of DUEL_STORY_STAGES){
 const match=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty,boss:stage.boss,released:true});match.phase='fight';
 match.fighters[0].hp=0;match.roundTime=0;stepDuel(match,1/60,{},{});assert.equal(match.wins[1],1);
 let limit=0;while(match.phase!=='over'&&limit++<2000){if(match.phase==='fight'){match.fighters[0].hp=match.fighters[0].maxHp;match.fighters[1].hp=0;match.roundTime=0;}stepDuel(match,1/60,{},{});}
 assert.equal(match.phase,'over');assert.equal(match.winner,0);
 if(stage.enemy!=='pierce')assert.equal(availableDuelCharacters(p,{released:true}).includes(stage.enemy),false);
 p=completeStoryMatch(p,stage,match,100+stage.number);assert.ok(p);assert.equal(p.cleared[stage.id].losses,1);
 assert.ok(availableDuelCharacters(p,{released:true}).includes(stage.enemy),'actual story victory opens its hero');
 assert.equal(storyUnlocked(p,stage.number),true);
 assert.equal(completeStoryMatch(p,stage,{...match,winner:1}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,practice:true}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,phase:'fight'}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,fighters:[match.fighters[0],{char:'not-an-opponent'}]}),null);
}
assert.deepEqual(availableDuelCharacters(p,{released:true}),[...DUEL_RELEASE_ORDER]);
assert.equal(nextStoryStage(p),null);assert.equal(storyUnlocked({},9),false);
assert.equal(availableDuelCharacters({}).includes('heart'),false);
assert.equal(availableDuelCharacters({...p,cleared:{...p.cleared,s22:undefined}},{released:true}).includes('heart'),false);
assert.equal(availableDuelCharacters(p,{released:true}).includes('heart'),true);
assert.equal(completeStoryMatch(p,DUEL_STORY_STAGES[21],{phase:'over',winner:0,wins:[2,0],boss:false,fighters:[{char:'pierce'},{char:'heart'}]}),null,'ordinary heart victory cannot unlock the boss');
assert.equal(completeStoryMatch({},DUEL_STORY_STAGES[8],{phase:'over',winner:0,wins:[2,0],fighters:[{char:'pierce'},{char:'reflect'}]}),null);
// Every campaign opponent can finish a real duel; repeated attacks cannot idle
// their timers forever. This is an engine simulation, not a human playtest.
if(!accountOnly)for(const stage of LEGACY_STAGES){const m=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty,boss:stage.boss,seed:stage.number});let i=0;while(m.phase!=='over'&&i++<60*250)stepDuel(m,1/60,duelAi(m,0,1/60),null);assert.equal(m.phase,'over',stage.title);}
// Offline devices union permanent clears, preserve the best round result, and
// retain the latest character choice; replay never erases completed chapters.
const a={hero:'frost',updatedAt:300,cleared:{s1:{losses:1,at:100},s2:{losses:0,at:200}}},b={hero:'recall',updatedAt:400,cleared:{s1:{losses:0,at:150},s3:{losses:1,at:400}}};
const merged=mergeDuelStory(a,b);assert.equal(merged.hero,'recall');assert.equal(merged.cleared.s1.losses,0);assert.equal(nextStoryStage(merged),4);assert.deepEqual(mergeDuelStory(merged,merged),merged);
assert.equal(Object.keys(normalizeDuelStory({cleared:{s1:{losses:9},['s'+(DUEL_STORY_STAGE_COUNT+1)]:{losses:0},s2:{losses:0}}}).cleared).length,1);
assert.equal(normalizeDuelStory({hero:'blastlance',cleared:{s22:{losses:0},s23:{losses:1}}}).hero,'blastlance');
const pc=memory(),phone=memory();for(const d of [pc,phone])d.setItem('seed-cloud-owner-v1','same-uid');
assert.ok(writeDuelStory(pc,a,'same-uid',300));const snap=collectCloudSnapshot(pc);applyCloudSnapshot(phone,snap);assert.deepEqual(readDuelStory(phone,'same-uid').cleared,a.cleared);assert.ok(availableDuelCharacters(readDuelStory(phone,'same-uid')).includes('burst'));assert.equal(availableDuelCharacters(readDuelStory(phone,'same-uid')).includes('frost'),false);
assert.ok(writeDuelStory(phone,b,'same-uid',400));const combined=mergeCloudSnapshots(collectCloudSnapshot(pc),collectCloudSnapshot(phone));applyCloudSnapshot(pc,combined);assert.equal(nextStoryStage(readDuelStory(pc,'same-uid')),4);
assert.equal(readDuelStory(pc,'other-uid').cleared.s1,undefined);assert.equal(readDuelStory(pc,'guest').cleared.s1,undefined);
assert.ok(isSyncKey(duelStorySaveKey('same-uid')));assert.equal(isSyncKey('seed-duel-story-v1-invalid'),false);
// The actual save coordinator transfers a story-only write PC -> phone -> PC.
let puts=0,clock=1000;const account={ready:async()=>{},user:()=>({uid:'player'}),tokenSession:async()=>({uid:'player',idToken:'test'})};
const fixture=cloudFixture({onPut:()=>{puts++;}}),fetchImpl=fixture.fetch;
const devices=[memory(),memory()].map(storage=>createCloudSync({storage,account,fetchImpl,now:()=>++clock,debounceMs:60000}));
assert.equal((await devices[0].start()).ok,true);writeDuelStory(devices[0].storage,a,'player',500);assert.equal(devices[0].isDirty(),true);assert.equal((await devices[0].flush()).ok,true);
assert.equal((await devices[1].start()).ok,true);assert.ok(readDuelStory(devices[1].storage,'player').cleared.s2);writeDuelStory(devices[1].storage,b,'player',600);assert.equal((await devices[1].flush()).ok,true);assert.equal((await devices[0].syncNow()).ok,true);assert.equal(nextStoryStage(readDuelStory(devices[0].storage,'player')),4);
const before=puts;await devices[0].syncNow();assert.equal(puts,before,'a synchronized campaign does not keep uploading');for(const d of devices)d.signOutCleanup();
// A different signed-in UID must not inherit the previous player's local key.
const otherFixture=cloudFixture();
const other=createCloudSync({storage:devices[0].storage,account:{...account,user:()=>({uid:'other'}),tokenSession:async()=>({uid:'other',idToken:'test'})},fetchImpl:otherFixture.fetch,debounceMs:60000});
await other.start();assert.equal(readDuelStory(other.storage,'other').cleared.s1,undefined);assert.equal(otherFixture.records.get('seedUsers/other/save')?.garden?.duelStory?.cleared.s1,undefined);other.signOutCleanup();
// A legacy nine-stage app may overwrite /save after a newer web session. The
// authoritative V2 record survives both save and old36 backup replacement.
{
 const state={puts:0,conflict:false,deny:false};let clock=2000;
 const prefix='seedUsers/story-expanded/',fixture=cloudFixture({
  beforePut:({path,response,set})=>{
   if(path!==prefix+'duelStoryV2')return;
   if(state.deny)return response(403,{error:'denied'});
   if(state.conflict){state.conflict=false;set(path,mergeDuelStory(fixture.records.get(path),{updatedAt:3000,hero:'pulse',cleared:{s21:{losses:0,at:2500}}}));return response(412,{error:'stale'});}
  },onPut:path=>{assert.notEqual(path,prefix+'duelStory','new clients never overwrite the legacy backup');state.puts++;}
 });
 const fetchImpl=fixture.fetch;
 const account={ready:async()=>{},user:()=>({uid:'story-expanded'}),tokenSession:async()=>({uid:'story-expanded',idToken:'test'})};
 const first=createCloudSync({storage:memory(),account,fetchImpl,now:()=>++clock,debounceMs:60000});await first.start();
 const all=normalizeDuelStory({...p,hero:'shard'});writeDuelStory(first.storage,all,'story-expanded',2100);await first.flush();assert.ok(fixture.records.get(prefix+'duelStoryV2').cleared.s21);assert.equal(fixture.records.get(prefix+'duelStoryV2').hero,'shard');
 const stable=state.puts;await first.syncNow();assert.equal(state.puts,stable);
 const save=structuredClone(fixture.records.get(prefix+'save'));
 save.garden.duelStory={...save.garden.duelStory,hero:'pierce',cleared:Object.fromEntries(Object.entries(save.garden.duelStory.cleared).filter(([k])=>Number(k.slice(1))<=9))};
 fixture.set(prefix+'save',save);
 // A distinct old36 client also replaces its legacy backup. V2 remains whole.
 const oldBackup=normalizeDuelStory({...all,hero:'pierce',cleared:Object.fromEntries(Object.entries(all.cleared).filter(([k])=>Number(k.slice(1))<=36))});
 fixture.set(prefix+'duelStory',oldBackup);
 assert.equal(fixture.records.get(prefix+'duelStory').cleared.s37,undefined);
 assert.ok(fixture.records.get(prefix+'duelStoryV2').cleared.s175);
 const second=createCloudSync({storage:memory(),account,fetchImpl,now:()=>++clock,debounceMs:60000});assert.equal((await second.start()).ok,true);assert.ok(readDuelStory(second.storage,'story-expanded').cleared.s175);assert.equal(readDuelStory(second.storage,'story-expanded').hero,'shard');
 writeDuelStory(second.storage,{...all,cleared:{...all.cleared,s20:{losses:0,at:2400}}},'story-expanded',2600);state.conflict=true;assert.equal((await second.flush()).ok,true);assert.equal(fixture.records.get(prefix+'duelStoryV2').cleared.s21.losses,0);assert.equal(fixture.records.get(prefix+'duelStoryV2').cleared.s20.losses,0);
 state.deny=true;writeDuelStory(second.storage,{...all,hero:'echo'},'story-expanded',4000);assert.equal((await second.flush()).ok,false,'backup upload failure must not claim account success');
 assert.ok(readDuelStory(second.storage,'story-expanded').cleared.s21);first.signOutCleanup();second.signOutCleanup();
}
// Cross-tab sign-out/account switch during reads cannot apply the old account.
{
 let uid='previous',release;const gate=new Promise(resolve=>release=resolve),store=memory();
 const account={ready:async()=>{},user:()=>({uid}),tokenSession:async()=>({uid,idToken:'test'})};
 const cloud=createCloudSync({storage:store,account,fetchImpl:async url=>{await gate;return {ok:true,status:200,json:async()=>url.includes('/save.json')?{garden:{duelStory:p}}:null};},debounceMs:60000});
 const start=cloud.start();await new Promise(resolve=>setImmediate(resolve));uid='next';release();const result=await start;assert.equal(result.reason,'account-changed');assert.equal(store.getItem('seed-garden-v1'),null);assert.equal(store.getItem('seed-cloud-owner-v1'),null);cloud.signOutCleanup();
}
console.log(`Duel story: ${DUEL_STORY_CHAPTERS.length} chapters / ${DUEL_STORY_STAGES.length} encounters, declared engine victory fixtures, account union, V2 backup, old36 overwrite, UID races, conflicts, mocked PC -> phone -> PC and idempotent saves passed; no physical-device proof. Autonomous legacy AI simulation: ${accountOnly?'SKIPPED (--account-only)':'PASSED (engine simulation, not physical)'}.`);

// Execute the view's real victory handler: failed disk/owner checks must not
// display an earned hero or advance the in-memory campaign.
{
 const source=readFileSync(new URL('../src/seed-duel-view.js',import.meta.url),'utf8');
 const start=source.indexOf('function recordStoryWin(){'),end=source.indexOf('function storyResult(){',start);
 const stage=DUEL_STORY_STAGES[1],before=normalizeDuelStory({cleared:{s1:{losses:0,at:1}}});
 const match=createDuel({player:'pierce',enemy:'burst'});Object.assign(match,{phase:'over',winner:0,wins:[2,0]});
 for(const [canSave,storage] of [[()=>false,memory()],[()=>true,{setItem(){throw Error('quota');},getItem:()=>null}],[()=>true,memory()]]){
  const ctx=vm.createContext({storyStage:stage,storySaved:false,s:match,saveNote:'',inspection:false,practice:false,refreshStory(){},completeStoryMatch,storyProgress:before,canSave,writeDuelStory,storage,owner:'same',onProgress(){},onSaveAccount:null});
  vm.runInContext(source.slice(start,end),ctx);ctx.recordStoryWin();
  assert.equal(availableDuelCharacters(ctx.storyProgress).includes('burst'),Boolean(storage.getItem('seed-duel-story-v1:same')));
 }
}
