import assert from 'node:assert/strict';
import {createBestRanking} from '../src/best-ranking.js';
const storage=()=>{const m=new Map();return {m,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const valid=e=>typeof e?.uid==='string'&&Number.isInteger(e.score)&&e.score>0;
let rows={},etag=0,offline=false,hook=null,puts=0;
const reply=(body,status=200)=>{const capturedEtag=etag,captured=structuredClone(body);return {ok:status===200,status,headers:{get:()=>String(capturedEtag)},json:async()=>structuredClone(captured)};};
const fetchImpl=async(url,o={})=>{
 if(offline)throw Error('offline');
 const id=new URL(url).pathname.split('/').at(-1).replace('.json','');
 if(o.method==='PUT'){
  if(o.headers['if-match']!==String(etag))return reply(null,412);
  rows[id]=JSON.parse(o.body);etag++;puts++;return reply(rows[id]);
 }
 const r=reply(id==='records'?rows:rows[id]||null);
 if(hook){const f=hook;hook=null;await f();}return r;
};
function device(){const s=storage(),account={uid:'a'};const service=createBestRanking({storage:s,authProvider:async()=>({uid:account.uid,idToken:'token'}),config:{databaseURL:'https://example.invalid'},path:'records',pendingPrefix:'rank:',valid,places:rs=>rs.sort((a,b)=>b.score-a.score),fetchImpl});return {s,account,service};}
const pc=device(),phone=device();
await pc.service.submit({uid:'a',score:100});await phone.service.submit({uid:'a',score:200});
assert.equal((await pc.service.board()).mine.score,200,'PC sees the phone best');
await pc.service.submit({uid:'a',score:150});assert.equal(rows.a.score,200,'older PC cannot lower cloud best');
offline=true;await assert.rejects(phone.service.submit({uid:'a',score:300}));assert(phone.s.m.has('rank:a'));
offline=false;await phone.service.flush();assert.equal((await pc.service.board()).mine.score,300);
const before=puts;hook=()=>pc.account.uid='b';await assert.rejects(pc.service.submit({uid:'a',score:400}),/account-changed/);
assert.equal(puts,before,'account switch during GET prevents PUT');assert(pc.s.m.has('rank:a'));
pc.account.uid='a';await pc.service.flush();assert.equal(rows.a.score,400);
hook=()=>pc.account.uid='b';await assert.rejects(pc.service.board(),/account-changed/,'old account board never leaks after a login switch');
pc.account.uid='a';hook=()=>{rows.a={uid:'a',score:600};etag++;};await pc.service.submit({uid:'a',score:500});assert.equal(rows.a.score,600,'412 reread preserves concurrent higher score');
const hung=storage();const timeoutRank=createBestRanking({storage:hung,authProvider:()=>new Promise(()=>{}),config:{},path:'records',pendingPrefix:'rank:',valid,places:rs=>rs,timeout:10});
await assert.rejects(timeoutRank.submit({uid:'a',score:700}),/account-timeout/);assert(hung.m.has('rank:a'),'auth timeout retains recoverable pending run');
console.log('Best rankings: PC -> phone -> PC, offline recovery, account races, 412 and bounded auth passed');
