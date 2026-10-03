// Shared UID-bound best-record queue; optimistic concurrency protects other devices.
export function createBestRanking({storage,authProvider,config,fetchImpl=(...a)=>fetch(...a),path:rankPath,pendingPrefix,valid,places,limit=1000,timeout=10000}={}){
 let serial=Promise.resolve();
 const key=uid=>pendingPrefix+encodeURIComponent(uid);
 const pending=uid=>{try{const e=JSON.parse(storage?.getItem(key(uid)));return e?.uid===uid&&valid(e)?e:null;}catch{return null;}};
 async function auth(uid){let timer;try{const s=await Promise.race([Promise.resolve().then(()=>authProvider()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('account-timeout')),timeout);})]);if(!s?.uid||!s.idToken||(uid&&s.uid!==uid))throw new Error('account-changed');return s;}finally{clearTimeout(timer);}}
 async function request(s,path='',query='',options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{const r=await fetchImpl(`${config.databaseURL}/${rankPath}${path}.json?${query}auth=${encodeURIComponent(s.idToken)}`,{cache:'no-store',...options,signal:controller.signal});
   const body=await r.json();if(!r.ok){const e=new Error('account-ranking-'+r.status);e.status=r.status;throw e;}return {body,etag:r.headers.get('ETag')};
  }finally{clearTimeout(timer);}
 }
 async function send(entry){
  for(let attempt=0;attempt<3;attempt++){
   const s=await auth(entry.uid),path='/'+encodeURIComponent(s.uid);
   const current=await request(s,path,'',{headers:{'X-Firebase-ETag':'true'}});
   // A login switch during GET must not upload or acknowledge the old account.
   const latest=await auth(entry.uid);
   if(valid(current.body)&&current.body.score>=entry.score)return;
   if(!current.etag)throw new Error('missing-etag');
   try{await request(latest,path,'',{method:'PUT',headers:{'Content-Type':'application/json','if-match':current.etag},body:JSON.stringify(entry)});return;}
   catch(e){if(e.status!==412)throw e;}
  }
  throw new Error('account-ranking-conflict');
 }
 function flush(){
  const work=async()=>{const s=await auth(),entry=pending(s.uid);if(!entry)return;await send(entry);
   // A better run may have been queued while the request was in flight.
   if(pending(s.uid)?.score===entry.score)storage?.removeItem(key(s.uid));
  };
  const result=serial.then(work,work);serial=result.catch(()=>{});return result;
 }
 async function submit(entry){
  if(!valid(entry))throw new Error('invalid-run');
  const previous=pending(entry.uid);if(!previous||previous.score<entry.score){storage.setItem(key(entry.uid),JSON.stringify(entry));}
  // Retain this UID's entry if the account changed or the network is unavailable.
  await auth(entry.uid);return flush();
 }
 async function board(){
  const s=await auth();
  const [best,own]=await Promise.all([request(s,'',`orderBy=%22score%22&limitToLast=${limit}&`),request(s,'/'+encodeURIComponent(s.uid))]);
  await auth(s.uid);
  const raw=best.body||{},rows=places(Object.entries(raw).filter(([uid,e])=>e?.uid===uid&&valid(e)).map(([,e])=>e));
  const complete=Object.keys(raw).length<limit;
  const mine=valid(own.body)&&own.body.uid===s.uid?{...own.body,rank:0}:null;
  if(mine){const higher=rows.filter(e=>e.score>mine.score).length;if(complete||rows.some(e=>e.score<mine.score))mine.rank=higher+1;}
  return {top:rows.slice(0,10),mine};
 }
 return {submit,flush,board};
}
