// Keep this module independent of the checkpoint codec. Main/menu/title code
// can check ordinary-run identity without loading the Act 6 combat/save graph.
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/^(guest|anonymous|inspection|inspection-boss|practice)(:|$)/i.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const integer=(v,min=0,max=1000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function arborAccountEligible(owner,{currentOwner,released=false,inspection=false,practice=false,anonymous=false,developerRun=false}={}){
 return uid(owner)&&currentOwner===owner&&released===true&&inspection===false&&practice===false&&anonymous===false&&developerRun===false;
}
export function validArborEnded(v,owner=v?.owner){
 return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['version','kind','owner','id','revision','savedAt'].includes(k))&&v.version===1&&v.kind==='arbor-ended'&&uid(owner)&&v.owner===owner&&typeof v.id==='string'&&v.id.length>0&&v.id.length<=100&&integer(v.revision,1)&&integer(v.savedAt,1,Number.MAX_SAFE_INTEGER));
}
