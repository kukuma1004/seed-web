import assert from 'node:assert/strict';
import {DUEL_STORY_STAGES,DUEL_STORY_CHAPTERS,completeStoryMatch} from '../src/seed-duel-story.js';
import {normalizeDuelStory,mergeDuelStory,storyUnlocked,nextStoryStage,duelStorySaveKey,readDuelStory,writeDuelStory} from '../src/seed-duel-story-progress.js';
import {createDuel,stepDuel,duelAi,DUEL_ORDER} from '../src/seed-duel-rules.js';
import {collectCloudSnapshot,mergeCloudSnapshots,applyCloudSnapshot,isSyncKey} from '../src/cloud-save.js';
import {createCloudSync} from '../src/cloud-sync.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
assert.equal(DUEL_STORY_CHAPTERS.length,3);assert.deepEqual(DUEL_STORY_STAGES.map(v=>v.difficulty),['easy','easy','easy','normal','normal','normal','hard','hard','hard']);
assert.deepEqual([...DUEL_STORY_STAGES.map(v=>v.enemy)].sort(),[...DUEL_ORDER].sort());
let p=normalizeDuelStory(null);assert.equal(nextStoryStage(p),1);assert.equal(storyUnlocked(p,2),false);
// Completed engine matches, including a lost round, advance the story. Menus,
// practice, losses and mismatched opponents cannot unlock another encounter.
for(const stage of DUEL_STORY_STAGES){
 const match=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty});match.phase='fight';
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
assert.equal(completeStoryMatch({},DUEL_STORY_STAGES[8],{phase:'over',winner:0,wins:[2,0],fighters:[{char:'pierce'},{char:'reflect'}]}),null);
// Every campaign opponent can finish a real duel; repeated attacks cannot idle
// their timers forever. This is an engine simulation, not a human playtest.
for(const stage of DUEL_STORY_STAGES){const m=createDuel({player:'pierce',enemy:stage.enemy,difficulty:stage.difficulty,seed:stage.number});let i=0;while(m.phase!=='over'&&i++<60*250)stepDuel(m,1/60,duelAi(m,0,1/60),null);assert.equal(m.phase,'over',stage.title);}
// Offline devices union permanent clears, preserve the best round result, and
// retain the latest character choice; replay never erases completed chapters.
const a={hero:'frost',updatedAt:300,cleared:{s1:{losses:1,at:100},s2:{losses:0,at:200}}},b={hero:'recall',updatedAt:400,cleared:{s1:{losses:0,at:150},s3:{losses:1,at:400}}};
const merged=mergeDuelStory(a,b);assert.equal(merged.hero,'recall');assert.equal(merged.cleared.s1.losses,0);assert.equal(nextStoryStage(merged),4);assert.deepEqual(mergeDuelStory(merged,merged),merged);
assert.equal(Object.keys(normalizeDuelStory({cleared:{s1:{losses:9},s10:{losses:0},s2:{losses:0}}}).cleared).length,1);
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
console.log('Duel story: 3 chapters / 9 encounters, engine victories, retry/unlocks, account merge, PC -> phone -> PC and idempotent saves passed.');
