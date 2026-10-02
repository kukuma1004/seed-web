// Local, isolated review. No sign-in, real account storage or server writes.
import {mountSeedDuel} from './seed-duel-view.js';
import {duelStorySaveKey} from './seed-duel-story-progress.js';
if(!import.meta.env.DEV||!['localhost','127.0.0.1'].includes(location.hostname))document.body.textContent='로컬 시연 화면입니다.';
else{
 const data=new Map(),owner='duel-story-demo',storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
 const preview=new URLSearchParams(location.search).get('preview');
 if(['final','ending'].includes(preview)){
  const cleared={};for(let n=1;n<=(preview==='ending'?9:8);n++)cleared[`s${n}`]={losses:n%2,at:1};
  data.set(duelStorySaveKey(owner),JSON.stringify({hero:'recall',updatedAt:1,cleared}));
 }
 const note=document.createElement('div');note.textContent='로컬 예제 · 실제 계정 미연결';note.style.cssText='position:fixed;z-index:200;bottom:2px;left:50%;transform:translateX(-50%);font:10px sans-serif;color:#ccd3bf;pointer-events:none';document.body.append(note);
 mountSeedDuel({storage,owner,onClose:()=>{location.href='./';}});
}
