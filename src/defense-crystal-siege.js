import {defenseObjectiveScope,defenseObjectiveGather} from './defense-objective.js';
import {checkpointDefense,restoreDefense} from './seed-defense-rules.js';
import REVIEW_FIXTURE from './defense-siege-review-fixture.json' with {type:'json'};

// TD has no walking seed. Its resource verb is a world tap, paid through the
// original sunlight/tower economy. This review has its own checkpoint envelope.
export const DEFENSE_SIEGE_NODES=Object.freeze([[8,6],[35,6],[66,6],[8,55],[94,6],[78,55]].map(([x,y],id)=>Object.freeze({id,x,y,value:8})));
const ledgers=new WeakMap(),integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const scope=defenseObjectiveScope;
export const defenseSiegeReviewKey=owner=>'seed-defense-siege-review-v1:'+encodeURIComponent(owner);
export function enableDefenseSiegeReview(s){if(!s||s.actCount!==5||s.objective)return false;s.siegeReview=true;return true;}
export function prepareDefenseSiege(s){
 const key=scope(s);if(!key)return null;if(s.objective)return defenseObjectiveGather(s);let ledger=ledgers.get(s);
 if(!ledger||ledger.lap!==key.lap||ledger.group!==key.group){ledger={...key,mask:0};ledgers.set(s,ledger);}return ledger;
}
export function harvestDefenseSiege(s,id){
 const ledger=prepareDefenseSiege(s);if(!ledger||!integer(id,0,5)||!integer(s.currency,0,1e12-8))return false;
 const bit=1<<id;if(ledger.mask&bit)return false;ledger.mask|=bit;s.currency+=DEFENSE_SIEGE_NODES[id].value;
 s.lastEvent='수정 채집 · 햇살 +8 · 씨앗을 심거나 합체해 대비하세요';return true;
}
export function checkpointDefenseSiege(s,owner){
 if(typeof owner!=='string'||!owner||s?.objective||!s?.siegeReview||s.phase!=='build')return null;
 const copy={...s};delete copy.siegeReview;delete copy.inspectionPreview;const state=checkpointDefense(copy);if(!state)return null;
 state.siegeReview=true;
 const ledger=prepareDefenseSiege(s);return{version:1,kind:'defense-siege-review',owner,state,gather:ledger?{...ledger}:null};
}
export function restoreDefenseSiege(raw,owner){
 if(typeof owner!=='string'||!owner)return null;
 try{const r=typeof raw==='string'?JSON.parse(raw):raw;
  if(!r||Object.keys(r).some(k=>!['version','kind','owner','state','gather'].includes(k))||r.version!==1||r.kind!=='defense-siege-review'||r.owner!==owner)return null;
  if(r.state?.siegeReview!==true)return null;const checkpoint={...r.state};delete checkpoint.siegeReview;
  const s=restoreDefense(checkpoint);if(!s||s.actCount!==5||!enableDefenseSiegeReview(s))return null;const key=scope(s),g=r.gather;
  if(key){if(!g||Object.keys(g).some(k=>!['lap','group','mask'].includes(k))||g.lap!==key.lap||g.group!==key.group||!integer(g.mask,0,63))return null;ledgers.set(s,{...g});}
  else if(g!==null)return null;return s;
 }catch{return null;}
}
export function createDefenseSiegeInspection(){
 // Reproducibly earned by Node combat/economy through wave48, then supplied to
 // the local viewer. This is not a human/account record or a normal checkpoint.
 const s=restoreDefense(REVIEW_FIXTURE);if(!s||s.wave!==48)throw Error('invalid siege review fixture');
 s.inspectionPreview=true;enableDefenseSiegeReview(s);prepareDefenseSiege(s);return s;
}
