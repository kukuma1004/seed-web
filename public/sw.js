// Offline play: after one visit with internet, the whole game (code, images, icons) is kept on the device.
// The online ranking still needs internet; runs finished offline wait in the browser and go up later.
const CACHE='seed-play-v55';
const ROOT=new URL('./',self.location).href;
const REVISIONS=ROOT+'offline-asset-revisions.json';
const SHELL=[ROOT,ROOT+'manifest.webmanifest',ROOT+'icons/seed-cute-v1-192.png',ROOT+'icons/seed-cute-v1-512.png',ROOT+'icons/seed-cute-v1-maskable-512.png'];
let lastSync=0,syncing=null;
const downloadPolicies=new Map();
const downloadsAllowed=()=>downloadPolicies.size>0&&[...downloadPolicies.values()].every(Boolean);
self.addEventListener('message',event=>{
 if(event.data?.type!=='SEED_OFFLINE_POLICY'||!event.source?.id)return;
 downloadPolicies.set(event.source.id,event.data.allowed===true);
 if(event.data.allowed===true)event.waitUntil(syncOfflineCopy());
});

// Download every file listed by the build (offline-manifest.json) that is not stored yet,
// then forget files that belonged to older builds. Runs in the background and never blocks play.
function syncOfflineCopy(){
 if(syncing||Date.now()-lastSync<5*60*1000)return syncing||Promise.resolve();
 syncing=(async()=>{
  try{
   const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true}),live=new Set(clients.map(c=>c.id));
   for(const id of downloadPolicies.keys())if(!live.has(id))downloadPolicies.delete(id);
   if(!downloadsAllowed()||clients.some(client=>!downloadPolicies.get(client.id)))return;
   const response=await fetch(ROOT+'offline-manifest.json',{cache:'no-store'});
   if(!response.ok)return;
   const {files,assetVersions={}}=await response.json(),cache=await caches.open(CACHE);
   // A static art path can change bytes without changing its filename. Refresh only
   // explicitly revised copies; the old cached image survives a failed download.
   let revisions={};
   try{const stored=await cache.match(REVISIONS);if(stored)revisions=await stored.json();}catch{}
   if(!revisions||typeof revisions!=='object'||Array.isArray(revisions))revisions={};
   let revisionChanged=false;
   const wanted=new Set([...SHELL,...files.filter(f=>f!=='index.html').map(f=>ROOT+f)]);
   let complete=true;
   for(const url of wanted){
    // Finish at most the in-flight file when play starts or the app is hidden.
    if(!downloadsAllowed()){complete=false;break;}
    if(url===ROOT)continue;
    const asset=url.slice(ROOT.length),revision=/^assets\/duel\/[a-z0-9-]+\.webp$/.test(asset)&&/^[a-f0-9]{64}$/.test(assetVersions?.[asset])?assetVersions[asset]:null;
    const cached=await cache.match(url,{ignoreVary:true});
    if(cached&&(!revision||revisions[asset]===revision))continue;
    if(!downloadsAllowed()){complete=false;break;}
    try{const file=await fetch(url,revision?{cache:'no-store'}:undefined);if(file.ok){await cache.put(url,file);if(revision){revisions[asset]=revision;revisionChanged=true;}}else complete=false;}catch{complete=false;}
   }
   if(!downloadsAllowed())complete=false;
   if(revisionChanged)await cache.put(REVISIONS,new Response(JSON.stringify(revisions),{headers:{'content-type':'application/json'}}));
   // A partial/failed update must retain old cached assets for offline players.
   if(!complete)return;
   wanted.add(REVISIONS);
   for(const request of await cache.keys())if(!wanted.has(request.url))await cache.delete(request);
   await Promise.all((await caches.keys()).filter(k=>k.startsWith('seed-play-')&&k!==CACHE).map(k=>caches.delete(k)));
   lastSync=Date.now();
  }finally{syncing=null;}
 })();
 return syncing;
}

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
// Claim clients without navigating them: an update must not interrupt a run.
// The running game checks season access itself; new code loads on the next open.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Keep the previous offline copy until the new one is fully downloaded.
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||!request.url.startsWith(ROOT))return;
 // The season gate must update immediately. The cached copy is only an offline
 // fallback, so reopening a season never waits for a service-worker refresh.
 if(new URL(request.url).pathname.endsWith('/season-status.json')){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(()=>caches.match(request,{ignoreSearch:true,ignoreVary:true})));
  return;
 }
 if(request.mode==='navigate'){
  // Online: always the newest page, and top up the offline copy. Offline: the stored page.
  const path=new URL(request.url).pathname,gamePage=path===new URL(ROOT).pathname||path.endsWith('/index.html');
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(gamePage?ROOT:request,copy)).then(()=>syncOfflineCopy()));}return response;}).catch(()=>caches.match(request,{ignoreSearch:true,ignoreVary:true}).then(hit=>hit||caches.match(ROOT))));
 }else{
  event.respondWith(caches.match(request,{ignoreSearch:true,ignoreVary:true}).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
 }
});
