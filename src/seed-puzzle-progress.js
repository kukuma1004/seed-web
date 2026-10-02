// Lightweight account progress; do not load the board/tuning engine at startup.
export const PUZZLE_SAVE_KEY='seed-puzzle-v1';
export const PUZZLE_LIVES=Object.freeze({max:5,regenMs:10*60e3,refill:300});
export const puzzleSaveKey=(owner='guest')=>`${PUZZLE_SAVE_KEY}:${encodeURIComponent(owner||'guest')}`;
const GARDEN_KEY='seed-garden-v1',OWNER_KEY='seed-cloud-owner-v1';
const int=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const dayKey=k=>/^\d{8}$/.test(k||'');
const json=(storage,key)=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};

export function normalizePuzzleProgress(raw){
 const out={version:3,updatedAt:0,stages:{},daily:{day:'',best:0,stars:0,rewarded:false},streak:0,bestStreak:0,lives:PUZZLE_LIVES.max,livesAt:0,dailyStars:0,dailyBaseStars:0,dailyHistory:{}};
 if(!raw||typeof raw!=='object')return out;
 out.updatedAt=int(raw.updatedAt,Number.MAX_SAFE_INTEGER);
 if(Number.isInteger(raw.lives))out.lives=Math.max(0,Math.min(PUZZLE_LIVES.max,raw.lives));
 if(Number.isFinite(raw.livesAt)&&raw.livesAt>0&&out.lives<PUZZLE_LIVES.max)out.livesAt=Math.floor(raw.livesAt);
 // Validate the existing 999 stage IDs without importing their board data.
 for(let n=1;n<=999;n++){const k=`s${n}`,v=raw.stages?.[k];if(!v||typeof v!=='object')continue;out.stages[k]={best:int(v.best,1e7),stars:int(v.stars,3),clears:int(v.clears,1e6)};}
 const d=raw.daily;if(d&&typeof d==='object'&&dayKey(d.day))out.daily={day:d.day,best:int(d.best,1e7),stars:int(d.stars,3),rewarded:d.rewarded===true};
 for(const k of Object.keys(raw.dailyHistory||{}).filter(dayKey).sort().slice(0,10000)){
  const v=raw.dailyHistory[k];if(!v||typeof v!=='object')continue;
  out.dailyHistory[k]={best:int(v.best,1e7),stars:int(v.stars,3),rewarded:v.rewarded===true};
 }
 if(out.daily.day){const k=out.daily.day,v=out.dailyHistory[k]||{};out.dailyHistory[k]={best:Math.max(v.best||0,out.daily.best),stars:Math.max(v.stars||0,out.daily.stars),rewarded:!!v.rewarded||out.daily.rewarded};}
 const known=Object.values(out.dailyHistory).reduce((n,v)=>n+v.stars,0);
 // Old clients only saved an aggregate. Keep that historical balance once.
 out.dailyBaseStars=Number.isFinite(raw.dailyBaseStars)?int(raw.dailyBaseStars,1e6):Math.max(0,int(raw.dailyStars,1e6)-known);
 out.dailyStars=Math.min(1e6,out.dailyBaseStars+known);
 out.streak=int(raw.streak,999);out.bestStreak=Math.max(out.streak,int(raw.bestStreak,999));
 return out;
}

export function mergePuzzleProgress(a,b,{prefer='remote'}={}){
 if(!a)return normalizePuzzleProgress(b);
 if(!b)return normalizePuzzleProgress(a);
 const local=normalizePuzzleProgress(a),remote=normalizePuzzleProgress(b);
 const winner=local.updatedAt===remote.updatedAt?(prefer==='local'?local:remote):local.updatedAt>remote.updatedAt?local:remote;
 const out={...winner,stages:{},dailyHistory:{},bestStreak:Math.max(local.bestStreak,remote.bestStreak),dailyBaseStars:Math.max(local.dailyBaseStars,remote.dailyBaseStars)};
 for(const k of new Set([...Object.keys(local.stages),...Object.keys(remote.stages)])){
  const x=local.stages[k]||{},y=remote.stages[k]||{};
  out.stages[k]={best:Math.max(x.best||0,y.best||0),stars:Math.max(x.stars||0,y.stars||0),clears:Math.max(x.clears||0,y.clears||0)};
 }
 for(const k of new Set([...Object.keys(local.dailyHistory),...Object.keys(remote.dailyHistory)])){
  const x=local.dailyHistory[k]||{},y=remote.dailyHistory[k]||{};
  out.dailyHistory[k]={best:Math.max(x.best||0,y.best||0),stars:Math.max(x.stars||0,y.stars||0),rewarded:!!x.rewarded||!!y.rewarded};
 }
 // The most recent day wins; merge its reward receipt even if another device
 // changed a setting or played a regular stage more recently.
 const day=[local.daily.day,remote.daily.day].sort().at(-1)||'';
 out.daily=day?{day,...out.dailyHistory[day]}:{day:'',best:0,stars:0,rewarded:false};
 return normalizePuzzleProgress(out);
}

export function readPuzzleProgress(storage,owner='guest'){
 const local=json(storage,puzzleSaveKey(owner));
 let mine=false;try{mine=owner&&owner!=='guest'&&storage?.getItem(OWNER_KEY)===owner;}catch{}
 return mine?mergePuzzleProgress(local,json(storage,GARDEN_KEY)?.puzzle,{prefer:'local'}):normalizePuzzleProgress(local);
}

export function writePuzzleProgress(storage,p,owner='guest',now=Date.now()){
 if(!storage?.setItem)return false;
 const current=readPuzzleProgress(storage,owner);
 const next=mergePuzzleProgress(current,{...p,updatedAt:Math.max(now,current.updatedAt+1,(p?.updatedAt||0)+1)},{prefer:'remote'});
 try{storage.setItem(puzzleSaveKey(owner),JSON.stringify(next));Object.assign(p,next);return true;}catch{return false;}
}
