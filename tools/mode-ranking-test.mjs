import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adventureRankEntry,validAdventureRank,adventureRankScore,duelRankEntry,validDuelRank,duelRankScore,puzzleRankEntry,validPuzzleRank,puzzleRankScore,createAdventureRanking} from '../src/mode-ranking.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const adventureState={phase:'won',room:11,kills:340,bossesDefeated:3,level:18,time:420,weapon:'throw',laws:['recall','chain'],formId:'returnblade'};
const a=adventureRankEntry(adventureState,{uid:'u1',name:'씨앗'});assert(a&&validAdventureRank(a)&&a.score===adventureRankScore(a));
assert(!validAdventureRank({...a,score:a.score+1}));assert(!validAdventureRank({...a,room:13}));
const duelState={phase:'over',winner:0,wins:[2,0],time:180,difficulty:'hard',fighters:[{char:'thorn'},{char:'heart'}]};
const d=duelRankEntry(duelState,{uid:'u1',name:'씨앗',storyStage:9});assert(d&&validDuelRank(d)&&d.score===duelRankScore(d));assert(!validDuelRank({...d,score:d.score+1}));
const {DUEL_STORY_STAGE_COUNT}=await import('../src/seed-duel-story-progress.js');
const latest=duelRankEntry({...duelState,fighters:[{char:'frostnet'},{char:'frostnet'}]},{uid:'u1',name:'씨앗',storyStage:DUEL_STORY_STAGE_COUNT});assert.equal(latest.storyStage,DUEL_STORY_STAGE_COUNT);assert(validDuelRank(latest));assert(!validDuelRank({...latest,storyStage:DUEL_STORY_STAGE_COUNT+1}));
const p=puzzleRankEntry({stages:{'1':{stars:3},'2':{stars:2}},bestStreak:4},{uid:'u1',name:'씨앗',stage:2,stars:3,score:12000});assert(p&&validPuzzleRank(p)&&p.score===puzzleRankScore(p));
let remote={},rev=0,puts=0;const fetchImpl=async(url,options={})=>{const path=new URL(url).pathname;const id=path.split('/').at(-1).replace('.json','');if(options.method==='PUT'){assert.equal(options.headers['if-match'],String(rev));remote[id]=JSON.parse(options.body);rev++;puts++;return {ok:true,status:200,json:async()=>remote[id],headers:{get:()=>String(rev)}};}return {ok:true,status:200,json:async()=>id==='adventure'?remote:(remote[id]||null),headers:{get:()=>String(rev)}};};
const ranking=createAdventureRanking({storage:store(),authProvider:async()=>({uid:'u1',idToken:'token'}),fetchImpl});await ranking.submit(a);assert.equal(remote.u1.score,a.score);await ranking.submit(a);assert.equal(puts,1);
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules.seedModeRanking;for(const mode of ['adventure','duel','puzzle']){assert.deepEqual(rules[mode]['.indexOn'],['score']);assert(rules[mode].$uid['.write'].includes('auth.uid == $uid'));assert.equal(rules[mode].$uid.$other['.validate'],false);}
console.log('Mode rankings: adventure, duel, puzzle records, scores, identity queue and Firebase rules passed');
const backupRules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules.seedUsers.$uid.duelStory.cleared.$stage['.validate'];
const backupStagePattern=new RegExp(backupRules.match(/\$stage\.matches\(\/(.*?)\/\)/)[1]);
for(let n=1;n<=DUEL_STORY_STAGE_COUNT;n++)assert(backupStagePattern.test('s'+n),'local backup rule accepts campaign stage '+n);
for(const id of ['s0','s'+(DUEL_STORY_STAGE_COUNT+1),'s24evil'])assert(!backupStagePattern.test(id));
assert.equal(Number(rules.duel.$uid.storyStage['.validate'].match(/<= (\d+)/)[1]),DUEL_STORY_STAGE_COUNT,'campaign score and server stage cap stay aligned');
const top=duelRankEntry({...duelState,time:1},{uid:'u1',name:'씨앗',storyStage:DUEL_STORY_STAGE_COUNT});
assert(top.score<=Number(rules.duel.$uid.score['.validate'].match(/<= (\d+)/)[1]),'a perfect latest-stage run fits the server score cap');
const {DUEL_RANK_LIMITS}=await import('../src/duel-ranking-limits.js');
const {DISCOVERY_FORMS}=await import('../src/forms.js');
for(const field of ['character','opponent']){
 assert.equal(Number(rules.duel.$uid[field]['.validate'].match(/<= (\d+)/)[1]),DUEL_RANK_LIMITS.character,'server and client stable ID limits agree');
 for(const id of Object.keys(DISCOVERY_FORMS))assert(validDuelRank({...top,[field]:id}),'the wire format can preserve original recipe ID '+id);
 assert(!validDuelRank({...top,[field]:'x'.repeat(DUEL_RANK_LIMITS.character+1)}),'overlong IDs remain rejected');
}


// Display labels follow the combat catalog, including newly unlocked bosses.
const {duelCharacterName,adventureBuildLabels}=await import('../src/mode-ranking-labels.js');
const {DUEL_CHARACTERS}=await import('../src/seed-duel-rules.js');
for(const [id,c] of Object.entries(DUEL_CHARACTERS))assert.equal(duelCharacterName(id),c.name);
assert.deepEqual(adventureBuildLabels({weapon:'hybrid',laws:'recall,chain',form:'returnblade'}),{weapon:'베기 + 던지기',laws:'귀환 · 연쇄',form:'귀환의 칼날'});
assert.equal(duelCharacterName('<bad>'),'씨앗');
assert.equal(adventureBuildLabels({weapon:'bad',laws:'<bad>',form:'bad'}).laws,'법칙 없음');
const {createRankingRetry}=await import('../src/ranking-retry.js');
let clock=0,calls=0,ctx={uid:'a',linked:true};
const retry=createRankingRetry({services:[{flush:async()=>{calls++;throw Error('offline');}},{flush:async()=>{calls++;}}],context:()=>ctx,now:()=>clock});
const retried=await retry();assert.deepEqual(retried.map(r=>r.status),['rejected','fulfilled']);assert.equal(calls,2);
await retry();assert.equal(calls,2,'menu revisits do not spam retries');
clock=30000;await retry();assert.equal(calls,4);
await retry({force:true});assert.equal(calls,6,'reconnection can retry immediately');
for(const flag of ['testing','hidden','offline']){ctx={uid:'a',linked:true,[flag]:true};await retry({force:true});assert.equal(calls,6);}
ctx={uid:'a',linked:false};await retry({force:true});assert.equal(calls,6);
ctx={uid:'b',linked:true};await retry();assert.equal(calls,8,'new account bypasses old account cooldown');
console.log('Mode ranking labels and bounded reconnect retries passed');
