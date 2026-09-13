const CACHE='seed-play-v1';
const ROOT=new URL('./',self.location).href;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([ROOT,ROOT+'manifest.webmanifest',ROOT+'icons/seed-192.png',ROOT+'icons/seed-512.png']))));
// Waiting workers activate when the old game tabs close, never halfway through a run.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('seed-play-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||!request.url.startsWith(ROOT))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(ROOT,copy)));}return response;}).catch(()=>caches.match(ROOT)));
 }else{
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
 }
});
