// Retry only on menu entry / reconnection, never in the rendering loop.
export function createRankingRetry({services,context,now=Date.now,interval=30_000}){
 let lastUid='',lastAt=-Infinity,busy=false;
 return async function retry({force=false}={}){
  const c=context();
  if(!c?.uid||!c.linked||c.testing||c.hidden||c.offline||busy)return;
  const at=now();
  if(!force&&c.uid===lastUid&&at-lastAt<interval)return;
  lastUid=c.uid;lastAt=at;busy=true;
  try{return await Promise.allSettled(services.map(service=>Promise.resolve().then(()=>service.flush())));}
  finally{busy=false;}
 };
}
