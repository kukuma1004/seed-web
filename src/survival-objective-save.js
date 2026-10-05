import {validSurvivalSave,survivalTitleEvents} from './survival-save.js';
import {SURVIVAL_OBJECTIVE,checkpointSurvivalSiege,restoreSurvivalSiege,validSurvivalPublicSiegeWorld} from './survival-crystal-siege.js';
export {SURVIVAL_OBJECTIVE};

export const SURVIVAL_OBJECTIVES_DEFAULT=false;
export const objectiveEnabled=gate=>{const value=typeof gate==='function'?gate():gate;return value===true||value?.released===true||value?.[SURVIVAL_OBJECTIVE]?.version===1&&value[SURVIVAL_OBJECTIVE].released===true;};
const ownerName=value=>typeof value==='string'&&value!=='guest'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f]/.test(value);
const parentProof=p=>{if(p===null)return true;if(!p||typeof p.bytes!=='string'||p.bytes.length>24000)return false;try{const r=JSON.parse(p.bytes);return validLegacyTerminal(r)&&p.id===r.id&&p.revision===r.revision&&p.writeId===r.writeId&&JSON.stringify(r)===p.bytes;}catch{return false;}};
const validLegacyTerminal=r=>r?.version===1&&r.ended===true&&typeof r.id==='string'&&r.id.length>0&&Number.isInteger(r.revision)&&r.revision>0&&typeof r.writeId==='string'&&r.writeId.length>0&&survivalTitleEvents(r)!==null;
const clean=s=>s&&s.session?.objective===SURVIVAL_OBJECTIVE&&s.objective===SURVIVAL_OBJECTIVE&&ownerName(s.owner)&&s.session?.lab==null&&!s.session?.benchmark&&!s.session?.siegeReview&&!s.lab&&!s.benchmark&&!s.siegeReview;
export function survivalObjectiveLegacyProjection(s){
 const {owner,objective,parent,siege,...base}=s;const session={...base.session};delete session.objective;return {...base,version:1,session};
}

export function validSurvivalObjectiveRecord(s,{owner,enabled=true}={}){
 if(!objectiveEnabled(enabled)||!s||s.version!==2||s.objective!==SURVIVAL_OBJECTIVE||!ownerName(s.owner)||owner&&s.owner!==owner||!parentProof(s.parent)||s.lab||s.benchmark||s.siegeReview)return false;
 if(s.ended===true)return typeof s.id==='string'&&s.id.length>0&&s.id.length<100&&Number.isInteger(s.revision)&&s.revision>0&&Number.isFinite(s.savedAt)&&s.savedAt>0&&survivalTitleEvents(s)!==null;
 return validSurvivalObjectiveSave(s,{owner,enabled});
}
export function validSurvivalObjectiveSave(s,{owner,enabled=true}={}){
 if(!objectiveEnabled(enabled)||!s||s.version!==2||s.ended||!clean(s)||owner&&s.owner!==owner||!parentProof(s.parent))return false;
 if(!validSurvivalSave(survivalObjectiveLegacyProjection(s)))return false;
 if(s.session.act!==4)return s.siege===null;
 if(!s.siege||!Array.isArray(s.siege.threats))return false;
 const state=restoreSurvivalSiege(s.siege.state);
 return Boolean(state&&validSurvivalPublicSiegeWorld(s,state,s.siege.threats));
}
export function captureSurvivalObjectiveSnapshot(world,{siege=null,threats=[],owner,parent=world?.parent??null}={}){
 if(!ownerName(owner)||!world||world.session?.objective!==SURVIVAL_OBJECTIVE||world.session?.lab||world.session?.benchmark||world.session?.siegeReview)return null;
 const snap={...world,version:2,owner,objective:SURVIVAL_OBJECTIVE,parent,siege:world.session.act===4?{state:checkpointSurvivalSiege(siege),threats:structuredClone(threats)}:null};
 if(world.session.act===4&&!snap.siege.state)return null;
 return snap;
}
export function survivalObjectiveParent(legacy){
 return validLegacyTerminal(legacy)?{id:legacy.id,revision:legacy.revision,writeId:legacy.writeId,bytes:JSON.stringify(legacy)}:null;
}
export const sameSurvivalObjectiveParent=(parent,legacy)=>parent===null?legacy===null:Boolean(parentProof(parent)&&parent.bytes===JSON.stringify(legacy));
