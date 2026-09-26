// Account-separated local checkpoints, also used by the dedicated cloud channel.
export const SURVIVAL_SAVE_KEY='seed-survival-checkpoint-v1';
const newWriteId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`;
export const survivalRecordId=s=>s?JSON.stringify(s):'none';
export function validSurvivalRecord(s){return validSurvivalSave(s)||Boolean(s?.version===1&&s.ended===true&&typeof s.id==='string'&&s.id.length>0&&s.id.length<100&&Number.isInteger(s.revision)&&s.revision>0&&Number.isFinite(s.savedAt)&&s.savedAt>0);}
const forbidden=new Set(['__proto__','prototype','constructor']);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e12;
export function captureCombatFields(actor){
 const out={};
 for(const [key,value] of Object.entries(actor)){
  if(forbidden.has(key)||key==='lab'||key==='benchmark')continue;
  if(finite(value)||typeof value==='boolean'||typeof value==='string'&&value.length<100||value===null)out[key]=value;
  else if(value?.isVector3)out[key]={vector:[value.x,value.y,value.z]};
 }
 return out;
}
export function restoreCombatFields(actor,fields,vector){
 for(const [key,value] of Object.entries(fields||{})){
  if(forbidden.has(key))continue;
  // Never let a primitive saved field replace live render/config/function data.
  if(typeof actor[key]==='function'||actor[key]&&typeof actor[key]==='object'&&!actor[key].isVector3)continue;
  if(value?.vector?.length===3&&value.vector.every(finite)){
   if(actor[key]?.isVector3)actor[key].set(...value.vector);else actor[key]=vector(...value.vector);
  }else if(finite(value)||typeof value==='boolean'||typeof value==='string'&&value.length<100||value===null)actor[key]=value;
 }
 return actor;
}
export function validSurvivalSave(s){
 if(s?.version!==1||s.ended||typeof s.id!=='string'||!Number.isInteger(s.revision)||s.revision<1)return false;
 const t=s.session,p=s.progress;
 if(!t||t.lab||t.benchmark||t.finished||!p||!finite(p.hp)||p.hp<=0)return false;
 if(!Number.isInteger(t.act)||t.act<0||t.act>2||!Number.isInteger(t.lap)||t.lap<0)return false;
 if(!finite(t.time)||t.time<0||!finite(t.legStartedAt)||t.legStartedAt>t.time||!finite(t.rngState))return false;
 if(!Array.isArray(s.enemies)||s.enemies.length>301||!Array.isArray(s.hostiles)||s.hostiles.length>192)return false;
 if(!s.player?.position?.every(finite)||s.player.position.length!==3)return false;
 for(const key of ['kills','score','choicesTaken','choiceKills','bankedUpgrades','elapsed'])if(!finite(p[key])||p[key]<0)return false;
 for(const key of ['levels','forms','inventory'])if(!p[key]||typeof p[key]!=='object'||Array.isArray(p[key]))return false;
 for(const key of ['levels','forms'])if(Object.entries(p[key]).length>6||!Object.entries(p[key]).every(([id,v])=>!forbidden.has(id)&&id.length<100&&Number.isInteger(v)&&v>0&&v<=1000000))return false;
 if(Object.values(p.inventory).some(n=>!Number.isInteger(n)||n<0||n>5))return false;
 for(const key of ['baseSlideTarget','baseSlideDir','lastMove'])if(s.player[key]?.length!==3||!s.player[key].every(finite))return false;
 if(s.pending&&(!Array.isArray(s.pending.offered)||s.pending.offered.length>6||!s.pending.offered.every(id=>typeof id==='string'&&id.length<100)||!Array.isArray(s.pending.bonus)||s.pending.bonus.length>8))return false;
 if(!s.hostiles.every(q=>q?.position?.length===3&&q.position.every(finite)&&finite(q.fields?.life)&&q.fields.life>0&&q.fields.dir?.vector?.length===3&&q.fields.dir.vector.every(finite)))return false;
 if(s.analysis){const a=s.analysis,pairs=v=>Array.isArray(v)&&v.length<=200&&v.every(r=>Array.isArray(r)&&r.length===2&&finite(r[1]));if(!finite(a.start)||!finite(a.damage)||!pairs(a.sources)||!pairs(a.buckets)||!Array.isArray(a.sourceBuckets)||a.sourceBuckets.length>200||!a.sourceBuckets.every(r=>Array.isArray(r)&&r.length===2&&pairs(r[1])))return false;}
 if(!s.enemies.every(e=>e?.position?.length===3&&e.position.every(finite)&&finite(e.fields?.hp)&&e.fields.hp>0&&finite(e.fields.maxHp)&&e.fields.maxHp>=e.fields.hp))return false;
 if(s.enemies.filter(e=>e.fields.survivalBoss).length>(t.won?0:1))return false;
 if(t.bossSpawned&&!t.won&&!s.enemies.some(e=>e.fields.survivalBoss))return false;
 return true;
}
export function createSurvivalSaveStore(storage,owner='guest'){
 const key=SURVIVAL_SAVE_KEY+':'+encodeURIComponent(owner||'guest');
 const raw=()=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};
 return {key,
  readRecord(){const s=raw();return validSurvivalRecord(s)?s:null;},
  read(){const s=raw();return validSurvivalSave(s)?s:null;},
  replace(expected,next){
   try{
    if(survivalRecordId(raw())!==survivalRecordId(expected))return {ok:false,reason:'conflict'};
    if(!validSurvivalRecord(next))return {ok:false,reason:'invalid'};
    const json=JSON.stringify(next);if(json.length>800000)return {ok:false,reason:'invalid'};
    // One bounded recovery copy before accepting another device's checkpoint.
    if(expected)storage.setItem(key+':previous',JSON.stringify(expected));
    storage.setItem(key,json);return {ok:storage.getItem(key)===json};
   }catch{return {ok:false,reason:'storage'};}
  },
  write(snapshot,{fresh=false}={}){
   try{
    const old=raw();
    if(!fresh&&(!old||old.ended||old.id!==snapshot.id||old.revision!==snapshot.revision||snapshot.writeId&&old.writeId!==snapshot.writeId))return {ok:false,reason:'conflict'};
    const next={...snapshot,version:1,revision:fresh?1:snapshot.revision+1,savedAt:Date.now(),writeId:newWriteId()};
    if(!validSurvivalSave(next))return {ok:false,reason:'invalid'};
    const json=JSON.stringify(next);if(json.length>800000||!storage)return {ok:false,reason:'storage'};
    storage.setItem(key,json);if(storage.getItem(key)!==json)return {ok:false,reason:'storage'};
    return {ok:true,value:next};
   }catch{return {ok:false,reason:'storage'};}
  },
  end(id,revision,writeId){
   try{const old=raw();if(!old||old.ended||old.id!==id||old.revision!==revision||writeId&&old.writeId!==writeId)return false;
    storage.setItem(key,JSON.stringify({version:1,ended:true,id,revision:revision+1,savedAt:Date.now(),writeId:newWriteId()}));return true;
   }catch{return false;}
  }
 };
}
