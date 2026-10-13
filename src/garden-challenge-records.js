// Deliberately independent from SEED accounts, currencies, gardens and rankings.
export const GARDEN_CHALLENGE_RECORD_KEY='seed-garden-challenge-records-v1';
const MODES=['normal','expert'],LIMIT=12;
const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const empty=()=>({version:1,normal:{plays:0,wins:0,bestScore:0,bestSeconds:null},expert:{plays:0,wins:0,bestScore:0,bestSeconds:null},recent:[]});
const storageOf=storage=>storage===undefined?globalThis.localStorage:storage;
function recap(value){
 if(!value||!MODES.includes(value.difficulty)||!['won','lost'].includes(value.phase)||!integer(value.score,100000000)||!integer(value.kills,100000)||!Number.isFinite(value.seconds)||value.seconds<0||value.seconds>181||!integer(value.at,9007199254740991))return null;
 if(!Array.isArray(value.build)||value.build.length>16||value.build.some(x=>typeof x!=='string'||x.length>80))return null;
 return {difficulty:value.difficulty,phase:value.phase,score:value.score,kills:value.kills,seconds:value.seconds,at:value.at,build:[...value.build],fusion:typeof value.fusion==='string'?value.fusion.slice(0,80):'',reason:typeof value.reason==='string'?value.reason.slice(0,140):''};
}
export function readGardenChallengeRecords(storage){
 try{
  const target=storageOf(storage);if(!target?.getItem)throw new Error('storage');
  const raw=target.getItem(GARDEN_CHALLENGE_RECORD_KEY);if(!raw)return {ok:true,records:empty(),error:null};
  if(raw.length>24000)throw new Error('invalid');const value=JSON.parse(raw);
  if(value?.version!==1||!Array.isArray(value.recent)||value.recent.length>LIMIT)throw new Error('invalid');
  const records=empty();
  for(const mode of MODES){const row=value[mode];if(!row||!integer(row.plays,1000000)||!integer(row.wins,row.plays)||!integer(row.bestScore,100000000)||!(row.bestSeconds===null||Number.isFinite(row.bestSeconds)&&row.bestSeconds>=0&&row.bestSeconds<=181))throw new Error('invalid');records[mode]={plays:row.plays,wins:row.wins,bestScore:row.bestScore,bestSeconds:row.bestSeconds};}
  for(const row of value.recent){const checked=recap(row);if(!checked)throw new Error('invalid');records.recent.push(checked);}
  return {ok:true,records,error:null};
 }catch{return {ok:false,records:empty(),error:'이 기기의 기록을 읽지 못했어요. 플레이는 할 수 있어요.'};}
}
export function recordGardenChallenge(summary,storage,now=Date.now()){
 const row=recap(summary&&{...summary,seconds:summary.seconds??summary.time,at:now,build:summary.build??[],fusion:summary.fusion?.name??summary.fusion??''});
 if(!row)return {ok:false,records:readGardenChallengeRecords(storage).records,error:'이번 결과를 저장하지 못했어요.'};
 const loaded=readGardenChallengeRecords(storage);if(!loaded.ok)return loaded;
 const records={version:1,normal:{...loaded.records.normal},expert:{...loaded.records.expert},recent:[...loaded.records.recent]},mode=records[row.difficulty];
 mode.plays=Math.min(1000000,mode.plays+1);if(row.phase==='won'){mode.wins=Math.min(mode.plays,mode.wins+1);mode.bestSeconds=mode.bestSeconds===null?row.seconds:Math.min(mode.bestSeconds,row.seconds);}mode.bestScore=Math.max(mode.bestScore,row.score);
 records.recent.unshift(row);records.recent.length=Math.min(records.recent.length,LIMIT);
 try{const target=storageOf(storage);if(!target?.setItem)throw new Error('storage');target.setItem(GARDEN_CHALLENGE_RECORD_KEY,JSON.stringify(records));return {ok:true,records,error:null};}
 catch{return {ok:false,records:loaded.records,error:'이 기기에 저장할 공간이 없어요. 이번 결과는 화면에서만 볼 수 있어요.'};}
}
