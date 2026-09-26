import {FIREBASE} from './online-ranking.js';
import {cleanName} from './score.js';
import {isBadName} from './name-filter.js';

export const SURVIVAL_RANK_PATH='seedSurvivalRanking/v1';
const PENDING='seed-survival-rank-pending-v1:', LIMIT=1000;
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export function validSurvivalRank(e){
 return Boolean(e&&typeof e.uid==='string'&&e.uid&&typeof e.name==='string'&&cleanName(e.name)===e.name&&e.name&&!isBadName(e.name)
  &&integer(e.score,1,1e9)&&integer(e.kills,1,1e7)&&integer(e.bosses,0,1000)&&integer(e.time,1,86400)
  &&e.bosses<=e.kills&&e.time>=e.bosses*270&&e.score<=(e.kills-e.bosses)*30+e.bosses*500
  &&typeof e.laws==='string'&&e.laws.length<=120&&typeof e.forms==='string'&&e.forms.length<=120);
}
// Equal scores share a place. Only the best score per authenticated account is kept.
export const survivalPlaces=rows=>rows.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid)).map((row,i,all)=>({...row,rank:all.findIndex(v=>v.score===row.score)+1}));
export function createSurvivalRanking({storage,authProvider,config=FIREBASE,fetchImpl=(...a)=>fetch(...a)}={}){
 let serial=Promise.resolve();
 const key=uid=>PENDING+encodeURIComponent(uid);
 const pending=uid=>{try{const e=JSON.parse(storage?.getItem(key(uid)));return e?.uid===uid&&validSurvivalRank(e)?e:null;}catch{return null;}};
 async function auth(uid){const s=await authProvider();if(!s?.uid||!s.idToken||(uid&&s.uid!==uid))throw new Error('account-changed');return s;}
 async function request(s,path='',query='',options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const r=await fetchImpl(`${config.databaseURL}/${SURVIVAL_RANK_PATH}${path}.json?${query}auth=${encodeURIComponent(s.idToken)}`,{cache:'no-store',...options,signal:controller.signal});
   const body=await r.json();if(!r.ok){const e=new Error('survival-ranking-'+r.status);e.status=r.status;throw e;}return {body,etag:r.headers.get('ETag')};
  }finally{clearTimeout(timer);}
 }
 async function send(entry){
  for(let attempt=0;attempt<3;attempt++){
   const s=await auth(entry.uid),path='/'+encodeURIComponent(s.uid);
   const current=await request(s,path,'',{headers:{'X-Firebase-ETag':'true'}});
   if(validSurvivalRank(current.body)&&current.body.score>=entry.score)return;
   if(!current.etag)throw new Error('missing-etag');
   try{await request(s,path,'',{method:'PUT',headers:{'Content-Type':'application/json','if-match':current.etag},body:JSON.stringify(entry)});return;}
   catch(e){if(e.status!==412)throw e;}
  }
  throw new Error('survival-ranking-conflict');
 }
 function flush(){
  const work=async()=>{const s=await auth(),entry=pending(s.uid);if(!entry)return;await send(entry);
   // A better run may have been queued while the request was in flight.
   if(pending(s.uid)?.score===entry.score)storage?.removeItem(key(s.uid));
  };
  const result=serial.then(work,work);serial=result.catch(()=>{});return result;
 }
 async function submit(entry){
  if(!validSurvivalRank(entry))throw new Error('invalid-run');
  const previous=pending(entry.uid);if(!previous||previous.score<entry.score){storage.setItem(key(entry.uid),JSON.stringify(entry));}
  // Retain this UID's entry if the account changed or the network is unavailable.
  await auth(entry.uid);return flush();
 }
 async function board(){
  const s=await auth();
  const [best,own]=await Promise.all([request(s,'',`orderBy=%22score%22&limitToLast=${LIMIT}&`),request(s,'/'+encodeURIComponent(s.uid))]);
  const raw=best.body||{},rows=survivalPlaces(Object.entries(raw).filter(([uid,e])=>e?.uid===uid&&validSurvivalRank(e)).map(([,e])=>e));
  const complete=Object.keys(raw).length<LIMIT;
  const mine=validSurvivalRank(own.body)&&own.body.uid===s.uid?{...own.body,rank:0}:null;
  if(mine){const higher=rows.filter(e=>e.score>mine.score).length;if(complete||rows.some(e=>e.score<mine.score))mine.rank=higher+1;}
  return {top:rows.slice(0,10),mine};
 }
 return {submit,flush,board};
}
