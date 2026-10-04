import {normalizeTree,rollTreeReward,waterTree} from './tree-of-life.js';
import {MODE_BOSSES} from './mode-boss-titles.js';

// Receipt identity is stored in full, never truncated or hashed. A seed hash
// below drives chance only, so retries cannot reroll a failed storage write.
export const expansionGardenReceipt=(mode,runId,boss,ordinal)=>['defense','survival','adventure','journey'].includes(mode)&&typeof runId==='string'&&/^[-\w]{1,90}$/.test(runId)&&Object.hasOwn(MODE_BOSSES,boss)&&Number.isSafeInteger(ordinal)&&ordinal>=1&&ordinal<=1000000?`boss-v1:${mode}:${runId}:${boss}:${ordinal}`:null;
function rewardRandom(key){let state=2166136261;for(let i=0;i<key.length;i++)state=Math.imul(state^key.charCodeAt(i),16777619)>>>0;return ()=>{state=(state+0x6d2b79f5)>>>0;let x=state;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};}
export function expansionBossTreeReward(tree,{mode,runId,boss,ordinal,event}={}){
 const key=expansionGardenReceipt(mode,runId,boss,ordinal),act=MODE_BOSSES[boss]?.act;
 if(!key||event?.type!=='boss'||event.boss!==boss||event.act!==act||event.final!==true)return {ok:false};
 const current=normalizeTree(tree);if(current.once[key])return {ok:true,applied:false,tree:current,notes:[]};
 const earned=rollTreeReward(current,event,rewardRandom(key)),watered=waterTree(earned.tree,1);watered.tree.once[key]=true;watered.tree.updatedAt=Math.max(Date.now(),watered.tree.updatedAt+1);
 return {ok:true,applied:true,tree:watered.tree,notes:[...earned.notes,...watered.notes]};
}
