import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adventureRankEntry,validAdventureRank,adventureRankScore,duelRankEntry,validDuelRank,duelRankScore,puzzleRankEntry,validPuzzleRank,puzzleRankScore,createAdventureRanking} from '../src/mode-ranking.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const adventureState={phase:'won',room:11,kills:340,bossesDefeated:3,level:18,time:420,weapon:'던지기',laws:['recall','chain'],formId:'회귀화살'};
const a=adventureRankEntry(adventureState,{uid:'u1',name:'씨앗'});assert(a&&validAdventureRank(a)&&a.score===adventureRankScore(a));
assert(!validAdventureRank({...a,score:a.score+1}));assert(!validAdventureRank({...a,room:13}));
const duelState={phase:'over',winner:0,wins:[2,0],time:180,difficulty:'hard',fighters:[{char:'thorn'},{char:'heart'}]};
const d=duelRankEntry(duelState,{uid:'u1',name:'씨앗',storyStage:9});assert(d&&validDuelRank(d)&&d.score===duelRankScore(d));assert(!validDuelRank({...d,score:d.score+1}));
const p=puzzleRankEntry({stages:{'1':{stars:3},'2':{stars:2}},bestStreak:4},{uid:'u1',name:'씨앗',stage:2,stars:3,score:12000});assert(p&&validPuzzleRank(p)&&p.score===puzzleRankScore(p));
let remote={},rev=0,puts=0;const fetchImpl=async(url,options={})=>{const path=new URL(url).pathname;const id=path.split('/').at(-1).replace('.json','');if(options.method==='PUT'){assert.equal(options.headers['if-match'],String(rev));remote[id]=JSON.parse(options.body);rev++;puts++;return {ok:true,status:200,json:async()=>remote[id],headers:{get:()=>String(rev)}};}return {ok:true,status:200,json:async()=>id==='adventure'?remote:(remote[id]||null),headers:{get:()=>String(rev)}};};
const ranking=createAdventureRanking({storage:store(),authProvider:async()=>({uid:'u1',idToken:'token'}),fetchImpl});await ranking.submit(a);assert.equal(remote.u1.score,a.score);await ranking.submit(a);assert.equal(puts,1);
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules.seedModeRanking;for(const mode of ['adventure','duel','puzzle']){assert.deepEqual(rules[mode]['.indexOn'],['score']);assert(rules[mode].$uid['.write'].includes('auth.uid == $uid'));assert.equal(rules[mode].$uid.$other['.validate'],false);}
console.log('Mode rankings: adventure, duel, puzzle records, scores, identity queue and Firebase rules passed');

