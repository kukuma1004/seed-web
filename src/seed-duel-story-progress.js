import {DUEL_RELEASE_ORDER,DUEL_RELEASE_STAGE_COUNT} from './seed-duel-release-catalog.js';
// Account progress only; the duel renderer and campaign dialogue stay lazy-loaded.
export const DUEL_STORY_SAVE_KEY='seed-duel-story-v1';
export const DUEL_STORY_STAGE_COUNT=DUEL_RELEASE_STAGE_COUNT;
export const duelStorySaveKey=(owner='guest')=>`${DUEL_STORY_SAVE_KEY}:${encodeURIComponent(owner||'guest')}`;
const HEROES=DUEL_RELEASE_ORDER;
const GARDEN_KEY='seed-garden-v1',OWNER_KEY='seed-cloud-owner-v1';
const integer=v=>Number.isFinite(v)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(v))):0;
const json=(storage,key)=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};
export function normalizeDuelStory(raw){
 const out={version:1,updatedAt:integer(raw?.updatedAt),hero:HEROES.includes(raw?.hero)?raw.hero:'pierce',cleared:{}};
 for(let n=1;n<=DUEL_STORY_STAGE_COUNT;n++){const v=raw?.cleared?.[`s${n}`];if(v&&typeof v==='object'&&[0,1].includes(v.losses))out.cleared[`s${n}`]={losses:v.losses,at:integer(v.at)};}
 return out;
}
export function mergeDuelStory(a,b,{prefer='remote'}={}){
 const x=normalizeDuelStory(a),y=normalizeDuelStory(b),winner=x.updatedAt===y.updatedAt?(prefer==='local'?x:y):x.updatedAt>y.updatedAt?x:y;
 const out={...winner,cleared:{}};
 for(let n=1;n<=DUEL_STORY_STAGE_COUNT;n++){const k=`s${n}`,p=x.cleared[k],q=y.cleared[k];if(p||q)out.cleared[k]={losses:Math.min(p?.losses??2,q?.losses??2),at:Math.max(p?.at||0,q?.at||0)};}
 return out;
}
export function storyUnlocked(raw,n){const p=normalizeDuelStory(raw);return Number.isInteger(n)&&n>=1&&n<=DUEL_STORY_STAGE_COUNT&&Array.from({length:n-1},(_,i)=>`s${i+1}`).every(k=>p.cleared[k]);}
export function nextStoryStage(raw){const p=normalizeDuelStory(raw);for(let n=1;n<=DUEL_STORY_STAGE_COUNT;n++)if(!p.cleared[`s${n}`])return n;return null;}
export function readDuelStory(storage,owner='guest'){
 const local=json(storage,duelStorySaveKey(owner));let mine=false;
 try{mine=owner&&owner!=='guest'&&storage?.getItem(OWNER_KEY)===owner;}catch{}
 return mine?mergeDuelStory(local,json(storage,GARDEN_KEY)?.duelStory,{prefer:'local'}):normalizeDuelStory(local);
}
export function writeDuelStory(storage,p,owner='guest',now=Date.now()){
 if(!storage?.setItem)return false;
 const old=readDuelStory(storage,owner),next=mergeDuelStory(old,{...p,updatedAt:Math.max(integer(now),old.updatedAt+1,integer(p?.updatedAt)+1)});
 try{storage.setItem(duelStorySaveKey(owner),JSON.stringify(next));Object.assign(p,next);return true;}catch{return false;}
}
