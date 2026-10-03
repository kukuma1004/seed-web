import assert from 'node:assert/strict';
import {DUEL_STORY_STAGES,DUEL_STORY_CHAPTERS,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,storyUnlocked,nextStoryStage,duelStorySaveKey,readDuelStory,writeDuelStory} from '../src/seed-duel-story-progress.js';
import {createDuel,stepDuel,duelAi,DUEL_ORDER,availableDuelCharacters} from '../src/seed-duel-rules.js';
import {collectCloudSnapshot,mergeCloudSnapshots,applyCloudSnapshot,isSyncKey} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
assert.equal(DUEL_STORY_CHAPTERS.length,8);assert.deepEqual(DUEL_STORY_STAGES.map(v=>v.difficulty),['easy','easy','easy','normal','normal','normal',...Array(DUEL_STORY_STAGES.length-6).fill('hard')]);
assert.deepEqual([...DUEL_STORY_STAGES.map(v=>v.enemy)].sort(),[...DUEL_ORDER].sort());
for(const hero of DUEL_ORDER.slice(9))assert.equal(mergeDuelStory({hero,updatedAt:500,cleared:{s1:{losses:0,at:400}}},{hero:'pierce',updatedAt:100}).hero,hero);
const oldComplete={cleared:Object.fromEntries(Array.from({length:9},(_,i)=>[`s${i+1}`,{losses:0,at:100}]))};assert.equal(nextStoryStage(oldComplete),10);assert.equal(storyUnlocked(oldComplete,10),true);assert.equal(storyUnlocked(oldComplete,11),false);
let p=normalizeDuelStory(null);assert.equal(nextStoryStage(p),1);assert.equal(storyUnlocked(p,2),false);
// Completed engine matches, including a lost round, advance the story. Menus,
// practice, losses and mismatched opponents cannot unlock another encounter.
for(const stage of DUEL_STORY_STAGES){
 const match=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty,boss:stage.boss});match.phase='fight';
 match.fighters[0].hp=0;match.roundTime=0;stepDuel(match,1/60,{},{});assert.equal(match.wins[1],1);
 let limit=0;while(match.phase!=='over'&&limit++<2000){if(match.phase==='fight'){match.fighters[0].hp=match.fighters[0].maxHp;match.fighters[1].hp=0;match.roundTime=0;}stepDuel(match,1/60,{},{});}
 assert.equal(match.phase,'over');assert.equal(match.winner,0);
 p=completeStoryMatch(p,stage,match,100+stage.number);assert.ok(p);assert.equal(p.cleared[stage.id].losses,1);
 assert.equal(storyUnlocked(p,stage.number),true);
 assert.equal(completeStoryMatch(p,stage,{...match,winner:1}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,practice:true}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,phase:'fight'}),null);
 assert.equal(completeStoryMatch(p,stage,{...match,fighters:[match.fighters[0],{char:'not-an-opponent'}]}),null);
}
assert.equal(nextStoryStage(p),null);assert.equal(storyUnlocked({},9),false);
assert.equal(availableDuelCharacters({}).includes('heart'),false);
assert.equal(availableDuelCharacters({...p,cleared:{...p.cleared,s22:undefined}}).includes('heart'),false);
assert.equal(availableDuelCharacters(p).includes('heart'),true);
assert.equal(completeStoryMatch(p,DUEL_STORY_STAGES[21],{phase:'over',winner:0,wins:[2,0],boss:false,fighters:[{char:'pierce'},{char:'heart'}]}),null,'ordinary heart victory cannot unlock the boss');
assert.equal(completeStoryMatch({},DUEL_STORY_STAGES[8],{phase:'over',winner:0,wins:[2,0],fighters:[{char:'pierce'},{char:'reflect'}]}),null);
// Every campaign opponent can finish a real duel; repeated attacks cannot idle
// their timers forever. This is an engine simulation, not a human playtest.
for(const stage of DUEL_STORY_STAGES){const m=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty,boss:stage.boss,seed:stage.number});let i=0;while(m.phase!=='over'&&i++<60*250)stepDuel(m,1/60,duelAi(m,0,1/60),null);assert.equal(m.phase,'over',stage.title);}
// Offline devices union permanent clears, preserve the best round result, and
// retain the latest character choice; replay never erases completed chapters.
const a={hero:'frost',updatedAt:300,cleared:{s1:{losses:1,at:100},s2:{losses:0,at:200}}},b={hero:'recall',updatedAt:400,cleared:{s1:{losses:0,at:150},s3:{losses:1,at:400}}};
const merged=mergeDuelStory(a,b);assert.equal(merged.hero,'recall');assert.equal(merged.cleared.s1.losses,0);assert.equal(nextStoryStage(merged),4);assert.deepEqual(mergeDuelStory(merged,merged),merged);
assert.equal(Object.keys(normalizeDuelStory({cleared:{s1:{losses:9},s24:{losses:0},s2:{losses:0}}}).cleared).length,1);
assert.equal(normalizeDuelStory({hero:'blastlance',cleared:{s22:{losses:0},s23:{losses:1}}}).hero,'blastlance');
const pc=memory(),phone=memory();for(const d of [pc,phone])d.setItem('seed-cloud-owner-v1','same-uid');
assert.ok(writeDuelStory(pc,a,'same-uid',300));const snap=collectCloudSnapshot(pc);applyCloudSnapshot(phone,snap);assert.deepEqual(readDuelStory(phone,'same-uid').cleared,a.cleared);
assert.ok(writeDuelStory(phone,b,'same-uid',400));const combined=mergeCloudSnapshots(collectCloudSnapshot(pc),collectCloudSnapshot(phone));applyCloudSnapshot(pc,combined);assert.equal(nextStoryStage(readDuelStory(pc,'same-uid')),4);
assert.equal(readDuelStory(pc,'other-uid').cleared.s1,undefined);assert.equal(readDuelStory(pc,'guest').cleared.s1,undefined);
assert.ok(isSyncKey(duelStorySaveKey('same-uid')));assert.equal(isSyncKey('seed-duel-story-v1-invalid'),false);
// The actual save coordinator transfers a story-only write PC -> phone -> PC.
let remote=null,puts=0,clock=1000;const account={ready:async()=>{},user:()=>({uid:'player'}),tokenSession:async()=>({uid:'player',idToken:'test'})};
const fetchImpl=async(url,options={})=>{if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};if(options.method==='PUT'){remote=JSON.parse(options.body);puts++;}return {ok:true,status:200,json:async()=>remote};};
const devices=[memory(),memory()].map(storage=>createCloudSync({storage,account,fetchImpl,now:()=>++clock,debounceMs:60000}));
await devices[0].start();writeDuelStory(devices[0].storage,a,'player',500);assert.equal(devices[0].isDirty(),true);await devices[0].flush();
await devices[1].start();assert.ok(readDuelStory(devices[1].storage,'player').cleared.s2);writeDuelStory(devices[1].storage,b,'player',600);await devices[1].flush();await devices[0].syncNow();assert.equal(nextStoryStage(readDuelStory(devices[0].storage,'player')),4);
const before=puts;await devices[0].syncNow();assert.equal(puts,before,'a synchronized campaign does not keep uploading');for(const d of devices)d.signOutCleanup();
// A different signed-in UID must not inherit the previous player's local key.
let otherSave=null;
const other=createCloudSync({storage:devices[0].storage,account:{...account,user:()=>({uid:'other'}),tokenSession:async()=>({uid:'other',idToken:'test'})},fetchImpl:async(url,options={})=>{if(options.method==='PUT')otherSave=JSON.parse(options.body);return {ok:true,status:200,json:async()=>otherSave};},debounceMs:60000});
await other.start();assert.equal(readDuelStory(other.storage,'other').cleared.s1,undefined);assert.equal(otherSave?.garden?.duelStory?.cleared.s1,undefined);other.signOutCleanup();
// A legacy nine-stage app may overwrite /save after a newer web session. The
// separate record survives and restores all new chapters on a fresh device.
{
 const state={save:null,story:null,puts:0,backupRevision:0,conflict:false,deny:false};let clock=2000;
 const fetchImpl=async(url,options={})=>{
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  const backup=url.includes('/duelStory.json'),key=backup?'story':'save';
  if(options.method==='PUT'){
   if(backup&&state.deny)return {ok:false,status:403,json:async()=>({error:'denied'})};
   if(backup&&state.conflict){state.conflict=false;state.story=mergeDuelStory(state.story,{updatedAt:3000,hero:'pulse',cleared:{s21:{losses:0,at:2500}}});return {ok:false,status:412,json:async()=>({error:'stale'})};}
   state[key]=JSON.parse(options.body);state.puts++;if(backup)state.backupRevision++;
  }return {ok:true,status:200,headers:{get:()=>String(state.backupRevision)},json:async()=>state[key]};
 };
 const account={ready:async()=>{},user:()=>({uid:'story-expanded'}),tokenSession:async()=>({uid:'story-expanded',idToken:'test'})};
 const first=createCloudSync({storage:memory(),account,fetchImpl,now:()=>++clock,debounceMs:60000});await first.start();
 const all=normalizeDuelStory({...p,hero:'shard'});writeDuelStory(first.storage,all,'story-expanded',2100);await first.flush();assert.ok(state.story.cleared.s21);assert.equal(state.story.hero,'shard');
 const stable=state.puts;await first.syncNow();assert.equal(state.puts,stable);
 state.save.garden.duelStory={...state.save.garden.duelStory,hero:'pierce',cleared:Object.fromEntries(Object.entries(state.save.garden.duelStory.cleared).filter(([k])=>Number(k.slice(1))<=9))};
 const second=createCloudSync({storage:memory(),account,fetchImpl,now:()=>++clock,debounceMs:60000});assert.equal((await second.start()).ok,true);assert.ok(readDuelStory(second.storage,'story-expanded').cleared.s21);assert.equal(readDuelStory(second.storage,'story-expanded').hero,'shard');
 writeDuelStory(second.storage,{...all,cleared:{...all.cleared,s20:{losses:0,at:2400}}},'story-expanded',2600);state.conflict=true;assert.equal((await second.flush()).ok,true);assert.equal(state.story.cleared.s21.losses,0);assert.equal(state.story.cleared.s20.losses,0);
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
console.log('Duel story: 8 chapters / 23 encounters, engine victories, account union, legacy-app backup, UID races, conflicts, PC -> phone -> PC and idempotent saves passed.');
