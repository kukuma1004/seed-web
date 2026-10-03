import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {offlineDownloadAllowed} from '../src/mobile-app.js';
for(const v of [{idle:false},{idle:true,hidden:true},{idle:true,saveData:true}])assert.equal(offlineDownloadAllowed(v),false);
assert.equal(offlineDownloadAllowed({idle:true}),true);
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(){
 const root='https://example.invalid/seed/',handlers={},stores=new Map(),requests=[];
 let fail=false,pause=false,clients=[{id:'tab'}];
 const cache=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {match:async u=>m.get(typeof u==='string'?u:u.url),put:async(u,v)=>m.set(typeof u==='string'?u:u.url,v),keys:async()=>[...m.keys()].map(url=>({url})),delete:async u=>m.delete(u.url||u),addAll:async urls=>urls.forEach(u=>m.set(u,{}))};};
 cache('seed-play-v54');stores.get('seed-play-v54').set(root+'old.js',{});
 cache('seed-play-v55');stores.get('seed-play-v55').set(root,{});
 function message(allowed,id='tab'){const waiting=[];handlers.message({data:{type:'SEED_OFFLINE_POLICY',allowed},source:{id},waitUntil:p=>waiting.push(p)});return Promise.all(waiting);}
 const self={location:root+'sw.js',addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>clients}};
 const caches={open:async n=>cache(n),keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n),match:async u=>{for(const m of stores.values()){const hit=m.get(u.url||u);if(hit)return hit;}}};
 const fetch=async u=>{requests.push(u);if(u.endsWith('offline-manifest.json'))return {ok:true,json:async()=>({files:['index.html','a.js','b.webp']})};if(u.endsWith('a.js')&&pause){pause=false;void message(false);}return {ok:!(fail&&u.endsWith('b.webp'))};};
 runInNewContext(source,{self,caches,fetch,URL,Map,Set,Date,Promise});
 return {root,stores,requests,message,handlers,setFail:v=>fail=v,setPause:v=>pause=v,setClients:v=>clients=v};
}
const w=worker();const activation=[];w.handlers.activate({waitUntil:p=>activation.push(p)});await Promise.all(activation);
assert.equal(w.requests.length,0,'activation does not start a 52MB download');
await w.message(false);assert.equal(w.requests.length,0,'combat/background stops prefetch');
w.setPause(true);await w.message(true);
assert(w.stores.has('seed-play-v54'),'interrupted update retains previous offline build');
assert(w.stores.get('seed-play-v55').has(w.root+'a.js'));assert(!w.stores.get('seed-play-v55').has(w.root+'b.webp'));
w.setFail(true);await w.message(true);assert(w.stores.has('seed-play-v54'),'failed download cannot purge backup');
w.setFail(false);await w.message(true);assert(!w.stores.has('seed-play-v54'),'complete update retires old cache');
assert(w.stores.get('seed-play-v55').has(w.root+'b.webp'));
const u=worker();u.setClients([{id:'tab'},{id:'old-tab'}]);await u.message(true);assert.equal(u.requests.length,0,'an old/unknown client prevents unsafe background cleanup');
console.log('Offline worker: idle-only download, pause/resume, failed-update preservation and safe cleanup passed');
