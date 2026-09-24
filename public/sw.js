// Offline play: after one visit with internet, the whole game (code, images, icons) is kept on the device.
// The online ranking still needs internet; runs finished offline wait in the browser and go up later.
const CACHE='seed-play-v44';
const ROOT=new URL('./',self.location).href;
const SHELL=[ROOT,ROOT+'manifest.webmanifest',ROOT+'icons/seed-192.png',ROOT+'icons/seed-512.png'];
let lastSync=0,syncing=null;

// Download every file listed by the build (offline-manifest.json) that is not stored yet,
// then forget files that belonged to older builds. Runs in the background and never blocks play.
function syncOfflineCopy(){
 if(syncing||Date.now()-lastSync<5*60*1000)return syncing||Promise.resolve();
 syncing=(async()=>{
  try{
   const response=await fetch(ROOT+'offline-manifest.json',{cache:'no-store'});
   if(!response.ok)return;
   const {files}=await response.json(),cache=await caches.open(CACHE);
   const wanted=new Set([...SHELL,...files.filter(f=>f!=='index.html').map(f=>ROOT+f)]);
   for(const url of wanted){
    if(url===ROOT||await cache.match(url,{ignoreVary:true}))continue;
    try{const file=await fetch(url);if(file.ok)await cache.put(url,file);}catch{}
   }
   for(const request of await cache.keys())if(!wanted.has(request.url))await cache.delete(request);
   lastSync=Date.now();
  }finally{syncing=null;}
 })();
 return syncing;
}

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
// Claim clients without navigating them: an update must not interrupt a run.
// The running game checks season access itself; new code loads on the next open.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(k=>k.startsWith('seed-play-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
 syncOfflineCopy();
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
