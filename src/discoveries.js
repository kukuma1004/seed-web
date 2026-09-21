import {LAWS} from './laws.js';
import {ALL_FORMS as FORMS} from './forms.js';

export const DISCOVERIES_KEY='seed-discoveries-v1';
// austinclear: 오스틴을 열 번 이겨 1막을 완주함(칭호 '정시를 정복한 자'). 기기 사이 저장에도 함께 옮겨진다.
// alwaysclear: 항상초심을 열 번 이겨 2막을 완주함(칭호 '초심을 완성한 자').
const BOSS_IDS=new Set(['warden','austin','alwaysbeginner','tempestcarrier','austinclear','alwaysclear']);
const emptyProfile=()=>({version:1,forms:[],bosses:[],records:{}});
const uniqueKnown=(items,known)=>Array.isArray(items)?[...new Set(items.filter(id=>typeof id==='string'&&known(id)))]:[];
const recordsOf=value=>{
 const records={};if(!value||typeof value!=='object'||Array.isArray(value))return records;
 for(const [id,row] of Object.entries(value))if(Object.hasOwn(FORMS,id)&&row&&Number.isFinite(row.dps)&&row.dps>0)records[id]={dps:Math.min(1e9,Math.round(row.dps*10)/10),peak:Math.min(1e9,Math.max(0,Math.round((row.peak||0)*10)/10)),total:Math.min(1e12,Math.max(0,Math.round(row.total||0))),duration:Math.min(3600,Math.max(.1,Math.round((row.duration||0)*10)/10)),at:Number.isFinite(row.at)?Math.max(0,Math.floor(row.at)):0};
 return records;
};

export function normalizeDiscoveries(profile){
 if(!profile||profile.version!==1)return emptyProfile();
 return {version:1,forms:uniqueKnown(profile.forms,id=>Object.hasOwn(FORMS,id)),bosses:uniqueKnown(profile.bosses,id=>BOSS_IDS.has(id)),records:recordsOf(profile.records)};
}

export function writeDiscoveries(storage,profile){const next=normalizeDiscoveries(profile);try{storage.setItem(DISCOVERIES_KEY,JSON.stringify(next));return next;}catch{return next;}}

export function readDiscoveries(storage){
 try{return normalizeDiscoveries(JSON.parse(storage.getItem(DISCOVERIES_KEY)));}catch{return emptyProfile();}
}

export function recordDiscovery(storage,profile,kind,id){
 const next=normalizeDiscoveries(profile);
 const valid=typeof id==='string'&&(kind==='forms'?Object.hasOwn(FORMS,id):kind==='bosses'&&BOSS_IDS.has(id));
 if(!valid)return {profile:next,saved:false,newlyDiscovered:false};
 const newlyDiscovered=!next[kind].includes(id);
 if(newlyDiscovered)next[kind].push(id);
 try{storage.setItem(DISCOVERIES_KEY,JSON.stringify(next));return {profile:next,saved:true,newlyDiscovered};}
 catch{return {profile:next,saved:false,newlyDiscovered};}
}

export function growthGuide(profile){return normalizeDiscoveries(profile).forms.length>=1;}
export function rerollUnlocked(profile){return normalizeDiscoveries(profile).forms.length>=3;}

// Only call for a normal law reward. This guides a discovered form without
// adding slots, granting stats, removing laws, or silently replacing a held law.
export function guideOffer(offered,held,targetForm,profile){
 const result=uniqueKnown(offered,id=>Object.hasOwn(LAWS,id)).slice(0,3);
 const laws=uniqueKnown(held instanceof Set?[...held]:held,id=>Object.hasOwn(LAWS,id));
 const discovered=normalizeDiscoveries(profile).forms;
 if(laws.length>=5||!discovered.includes(targetForm))return result;
 const missing=FORMS[targetForm].requires.find(id=>!laws.includes(id));
 if(!missing||result.includes(missing))return result;
 if(result.length===3)result[2]=missing;else result.push(missing);
 return result;
}
