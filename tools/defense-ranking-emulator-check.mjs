// Local demo database only. Never writes production records.
import assert from 'node:assert/strict';
import {createMockUserToken} from '@firebase/util';
import {createDefenseRanking,defenseRankEntry} from '../src/defense-ranking.js';
const databaseURL='http://127.0.0.1:9009',ns='demo-seed-release-default-rtdb';
const request=(url,o)=>{const u=new URL(url);assert.equal(u.origin,databaseURL);u.searchParams.set('ns',ns);return fetch(u,o);};
const token=(sub,provider='google.com')=>createMockUserToken({sub,iat:Math.floor(Date.now()/1000),firebase:{sign_in_provider:provider}},'demo-seed-release');
const uid='defense-qa-'+Date.now(),entry=defenseRankEntry({phase:'won',wave:12,coreHp:18,kills:340,time:304,towers:[{formId:'prism',laws:[],level:5}]},{uid,name:'검사씨앗'});
const device=()=>{const m=new Map();return createDefenseRanking({storage:{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)},authProvider:async()=>({uid,idToken:token(uid)}),config:{databaseURL},fetchImpl:request});};
const pc=device(),phone=device();await pc.submit(entry);assert.equal((await phone.board()).mine.score,entry.score);
await phone.submit({...entry,hp:19,score:1219340});assert.equal((await pc.board()).mine.hp,19);
await pc.submit(entry);assert.equal((await phone.board()).mine.hp,19);
const endpoint=`${databaseURL}/seedDefenseRanking/v1/${uid}.json`;
for(const [auth,body] of [[token('other'),entry],[token(uid,'anonymous'),entry],[token(uid),{...entry,score:99999999}],[token(uid),{...entry,hp:20,score:1220340,towers:'chain:6'}],[token(uid),{...entry,hp:20,score:1220340,extra:1}]]){
 const res=await request(endpoint+'?auth='+auth,{method:'PUT',body:JSON.stringify(body)});assert(!res.ok,'other accounts, anonymous writes, forged scores and invalid payloads denied');
}
const anon=await request(`${databaseURL}/seedDefenseRanking/v1.json?auth=${token(uid,'anonymous')}`,{});assert(!anon.ok);
console.log('LOCAL EMULATOR PASS: defense PC/phone best-record exchange; owner-only writes; anonymous, invalid score, level and extra-field rejection.');
