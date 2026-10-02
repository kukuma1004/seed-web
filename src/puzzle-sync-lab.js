// Local review only: two in-memory devices and a fake server, no real accounts.
import {mountSeedPuzzle} from './seed-puzzle-view.js';
import {createCloudSync} from './cloud-sync.js';
import {puzzleSaveKey} from './seed-puzzle-progress.js';
if(!import.meta.env.DEV||!['localhost','127.0.0.1'].includes(location.hostname)){
 document.body.textContent='로컬 검증 화면입니다.';
}else{
 const uid='puzzle-sync-example',stores=[new Map(),new Map()];
 stores[0].set(puzzleSaveKey(uid),JSON.stringify({version:2,stages:{s1:{stars:3,best:5000,clears:1},s2:{stars:2,best:4000,clears:1},s3:{stars:1,best:3000,clears:1}},streak:3,bestStreak:3,lives:4,livesAt:Date.now()}));
 const memory=data=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)});
 let remote=null,offline=false,screen=null,current=0,changing=false;
 const account={ready:async()=>{},user:()=>({uid}),tokenSession:async()=>({uid,idToken:'local-fixture'})};
 const fetchImpl=async(url,opts={})=>{
  if(offline)throw new Error('Local simulated offline');
  if(url.includes('seedUserRewards'))return {ok:true,status:200,json:async()=>null};
  if(opts.method==='PUT')remote=JSON.parse(opts.body);
  return {ok:true,status:200,headers:{get:()=>null},json:async()=>remote};
 };
 const devices=stores.map(data=>createCloudSync({storage:memory(data),account,fetchImpl}));
 const bar=document.createElement('nav');bar.setAttribute('aria-label','로컬 저장 연동 시연');bar.style.cssText='position:fixed;z-index:10000;top:4px;right:4px;max-width:92vw;display:flex;gap:6px;align-items:center;background:#102a25;color:#fff;padding:6px;border:1px solid #bca66a;border-radius:10px;font:12px sans-serif;';
 bar.innerHTML='<span>예제 기록 · 실제 계정 미연결</span><button data-device="0">PC</button><button data-device="1">휴대폰</button><button data-offline>연결 끊기</button><b data-current></b><span data-remote></span>';
 document.body.append(bar);
 async function show(index){
  if(changing)return;changing=true;
  try{screen?.close();if(screen)await devices[current].flush();current=index;const result=await devices[index].start();
   const device=devices[index];screen=mountSeedPuzzle({storage:device.storage,owner:uid,onSaveAccount:async()=>{const r=await device.flush();return r.ok&&!device.isDirty();},onClose:()=>{}});
   bar.querySelector('[data-current]').textContent=index?'휴대폰 화면':'PC 화면';
   bar.querySelector('[data-remote]').textContent=`예제 서버 ${Object.keys(remote?.garden?.puzzle?.stages||{}).length}단계 · ${result.ok?'연결됨':result.reason}`;
   for(const b of bar.querySelectorAll('[data-device]'))b.disabled=Number(b.dataset.device)===index;
  }finally{changing=false;}
 }
 for(const b of bar.querySelectorAll('[data-device]'))b.onclick=()=>show(Number(b.dataset.device));
 bar.querySelector('[data-offline]').onclick=e=>{offline=!offline;e.target.textContent=offline?'연결 복구':'연결 끊기';};
 window.addEventListener('pagehide',()=>devices.forEach(d=>d.signOutCleanup()),{once:true});
 void show(0);
}
