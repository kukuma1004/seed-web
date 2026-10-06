import {expeditionUnitFeedback} from './battle-presentation.js';

export const EXPEDITION_FEEDBACK_MS=720;
const cell=(pose,offsets)=>Object.freeze({pose,x:`${pose%4*100/3}%`,y:`${Math.floor(pose/4)*100}%`,offsetY:`${Number.isFinite(offsets?.[pose])?offsets[pose]:0}%`});

// A finite presentation of accepted combat events. These cells never delay an
// action, repeat damage, or enter the durable battle/save state.
export function expeditionSpriteSequence(unit,units,events,presentation={}){
 if(!unit||!Array.isArray(units))return null;
 const fx=expeditionUnitFeedback(unit,units,events),rest=unit.dead?7:unit.guarding?6:0;
 const animate=!unit.dead&&(fx.hit||['attack','skill1','skill2','resonance','awaken','guard'].includes(fx.action));
 const configured=presentation.impactPoses?.[fx.action];
 const mapped=Array.isArray(configured)?configured[Math.max(0,fx.pose-1)%configured.length]:configured;
 const impact=fx.hit?7:fx.action==='guard'?6:Number.isInteger(mapped)&&mapped>=0&&mapped<8?mapped:fx.action==='attack'?fx.pose:['skill1','skill2','resonance','awaken'].includes(fx.action)?5:rest;
 const preparation=fx.hit?7:fx.action==='guard'?6:animate?4:rest;
 return Object.freeze({animate,duration:EXPEDITION_FEEDBACK_MS,preparation:cell(preparation,presentation.poseOffsets),impact:cell(impact,presentation.poseOffsets),rest:cell(rest,presentation.poseOffsets)});
}

export function expeditionFeedbackDelay(start,now){
 const elapsed=Math.min(EXPEDITION_FEEDBACK_MS,Math.max(0,Number.isFinite(start)&&Number.isFinite(now)?now-start:0));
 return elapsed?-elapsed:0;
}
