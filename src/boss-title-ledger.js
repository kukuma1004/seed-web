export const validBossRunId=id=>typeof id==='string'&&/^(defense|survival|adventure):[\w-]{1,90}$/.test(id);
export function normalizeBossRuns(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([id,r])=>validBossRunId(id)&&r&&typeof r==='object')
  .map(([id,r])=>[id,Object.fromEntries(['at','austin','alwaysbeginner','tempestcarrier','crosswindKeeper','crystalGardener'].map(k=>[k,Number.isSafeInteger(r[k])?Math.max(0,Math.min(k==='at'?1e15:1000000,r[k])):0]))])
  .sort((a,b)=>b[1].at-a[1].at||a[0].localeCompare(b[0])).slice(0,64));
}
export function mergeBossRuns(a,b){
 const out=normalizeBossRuns(a);
 for(const [id,row] of Object.entries(normalizeBossRuns(b))){const prev=out[id]||{};out[id]=Object.fromEntries(Object.keys(row).map(k=>[k,Math.max(prev[k]||0,row[k])]));}
 return normalizeBossRuns(out);
}
