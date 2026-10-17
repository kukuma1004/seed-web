import {validSurvivalSave,validSurvivalRecord,survivalTitleEvents} from './survival-save.js';
import {validSurvivalObjectiveRecord,survivalObjectiveLegacyProjection} from './survival-objective-save.js';
import {SURVIVAL_OBJECTIVE,restoreSurvivalSiege,validSurvivalPublicSiegeWorld} from './survival-crystal-siege.js';

export const SURVIVAL_SIX_SAVE_KEY='seed-survival-checkpoint-v3';
export const SURVIVAL_SIX_CIRCUIT='arbor-six-v1';
export const sixEnabled=gate=>(typeof gate==='function'?gate():gate)===true;
const ownerName=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f]/.test(value);
const terminal=r=>r?.ended===true&&typeof r.id==='string'&&r.id.length>0&&r.id.length<100&&Number.isInteger(r.revision)&&r.revision>0&&Number.isFinite(r.savedAt)&&r.savedAt>0&&survivalTitleEvents(r)!==null;
export function survivalSixParent(record){
 return terminal(record)&&[1,2].includes(record.version)?{version:record.version,id:record.id,revision:record.revision,writeId:record.writeId??null,bytes:JSON.stringify(record)}:null;
}
export function validSurvivalSixParent(parent,owner){
 if(parent===null)return true;
 if(!parent||typeof parent.bytes!=='string'||parent.bytes.length>24000)return false;
 try{const r=JSON.parse(parent.bytes);return terminal(r)&&r.version===parent.version&&r.id===parent.id&&r.revision===parent.revision&&(r.writeId??null)===parent.writeId&&JSON.stringify(r)===parent.bytes&&(r.version===1?validSurvivalRecord(r):r.version===2&&validSurvivalObjectiveRecord(r,{owner,enabled:true}));}catch{return false;}
}
export const sameSurvivalSixParent=(parent,record)=>parent===null?record===null:Boolean(record&&validSurvivalSixParent(parent,record.owner)&&parent.bytes===JSON.stringify(record));
export function survivalSixProgressValid(t){
 if(t?.actCount!==6||t.circuit!==SURVIVAL_SIX_CIRCUIT||!Number.isInteger(t.lap)||t.lap<0||t.lap>1000||!Number.isInteger(t.act)||t.act<0||t.act>5||typeof t.won!=='boolean'||typeof t.bossSpawned!=='boolean')return false;
 if(t.won&&!t.bossSpawned||t.bossesDefeated!==t.lap*6+t.act+(t.won?1:0)||t.completedLaps!==t.lap+(t.act===5&&t.won?1:0))return false;
 for(const [act,key]of [[3,'crosswindBossWins'],[4,'crystalBossWins'],[5,'arborBossWins']])if(t[key]!==t.lap+(t.act>act||t.act===act&&t.won?1:0))return false;
 const events=survivalTitleEvents(t);if(!events)return false;
 const order={austin:0,alwaysbeginner:1,tempestcarrier:2,crosswindKeeper:3,crystalGardener:4,arbor:5};
 if(events.some(e=>e.ordinal>t.lap+(t.act>order[e.boss]||t.act===order[e.boss]&&t.won?1:0)))return false;
 return !Object.hasOwn(t,'legacyCompletedLaps')&&!Object.hasOwn(t,'legacyFastestLap');
}
export function validSurvivalSixRecord(s,{owner,enabled=true}={}){
 if(!sixEnabled(enabled)||s?.version!==3||s.circuit!==SURVIVAL_SIX_CIRCUIT||!ownerName(s.owner)||owner&&s.owner!==owner||!validSurvivalSixParent(s.parent,s.owner)||s.lab||s.benchmark||s.siegeReview)return false;
 if(s.objective!==undefined&&s.objective!==SURVIVAL_OBJECTIVE)return false;
 return s.ended===true?terminal(s):validSurvivalSixSave(s,{owner,enabled});
}
export function validSurvivalSixSave(s,{owner,enabled=true}={}){
 if(!sixEnabled(enabled)||s?.version!==3||s.ended||s.circuit!==SURVIVAL_SIX_CIRCUIT||!ownerName(s.owner)||owner&&s.owner!==owner||!validSurvivalSixParent(s.parent,s.owner)||!survivalSixProgressValid(s.session))return false;
 if(s.objective!==s.session.objective||s.objective!==undefined&&s.objective!==SURVIVAL_OBJECTIVE)return false;
 if(!validSurvivalSave(survivalObjectiveLegacyProjection(s),{six:true}))return false;
 if(s.session.act!==4||!s.objective)return s.siege===null||s.siege===undefined;
 const state=s.siege&&restoreSurvivalSiege(s.siege.state);return Boolean(state&&Array.isArray(s.siege.threats)&&validSurvivalPublicSiegeWorld(s,state,s.siege.threats));
}
export function captureSurvivalSixSnapshot(world,{owner,siege=null,threats=[],parent=world?.parent??null}={}){
 if(!world||!ownerName(owner)||world.session?.actCount!==6)return null;
 return {...world,version:3,circuit:SURVIVAL_SIX_CIRCUIT,owner,parent,...(world.session.objective?{objective:world.session.objective}:{}),siege:world.session.act===4&&world.session.objective?{state:siege,threats}:null};
}
