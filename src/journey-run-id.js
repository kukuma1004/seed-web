// Save identity only, never an authentication token. Legacy checkpoints that
// were copied to another device must acquire the same identity, not two UUIDs.
export const validJourneyRunId=id=>typeof id==='string'&&/^[\w-]{1,90}$/.test(id);
const canonical=value=>{
 if(value===null||value===undefined)return undefined;
 if(Array.isArray(value)){const next=value.map(canonical);return next.length?next:undefined;}
 if(value&&typeof value==='object'){const next=Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]).filter(([,v])=>v!==undefined));return Object.keys(next).length?next:undefined;}
 return value;
};
function legacyId(checkpoint){
 const bytes=JSON.stringify(canonical(checkpoint));
 if(!bytes||bytes.length>100000)throw new Error('invalid-journey-identity');
 // Four deterministic lanes; this fingerprint is not used for security.
 const hash=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35];
 for(let i=0;i<bytes.length;i++)for(let lane=0;lane<4;lane++)hash[lane]=Math.imul(hash[lane]^(bytes.charCodeAt(i)+lane*257),0x01000193+lane*2)>>>0;
 return 'legacy-'+hash.map(v=>v.toString(16).padStart(8,'0')).join('');
}
export function journeyRunId(checkpoint=null,{createId=()=>globalThis.crypto?.randomUUID?.()||`run-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`}={}){
 if(checkpoint){
  if(Object.hasOwn(checkpoint,'runId')){if(!validJourneyRunId(checkpoint.runId))throw new Error('invalid-journey-identity');return checkpoint.runId;}
  return legacyId(checkpoint);
 }
 const id=createId();if(!validJourneyRunId(id))throw new Error('invalid-journey-identity');return id;
}
