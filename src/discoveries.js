import {LAWS} from './laws.js';
import {FORMS} from './forms.js';

export const DISCOVERIES_KEY='seed-discoveries-v1';
const BOSS_IDS=new Set(['warden']);
const emptyProfile=()=>({version:1,forms:[],bosses:[]});
const uniqueKnown=(items,known)=>Array.isArray(items)?[...new Set(items.filter(id=>typeof id==='string'&&known(id)))]:[];

export function normalizeDiscoveries(profile){
 if(!profile||profile.version!==1)return emptyProfile();
 return {version:1,forms:uniqueKnown(profile.forms,id=>Object.hasOwn(FORMS,id)),bosses:uniqueKnown(profile.bosses,id=>BOSS_IDS.has(id))};
}

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
