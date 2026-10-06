import {LAWS} from '../laws.js';
import {getExpeditionSpecies} from './species.js';
import {EXPEDITION_ENEMIES} from './world.js';

// Presentation only: positions never change combat slots, reach or hit rules.
export function expeditionFormationSpot(side,slot){
 if(!['ally','enemy'].includes(side)||!Number.isInteger(slot)||slot<0||slot>4)return null;
 const front=slot<2;
 return Object.freeze({x:side==='ally'?(front?72:25):(front?28:75),y:[30,73,14,50,86][slot],front});
}
const TARGET={single:'단일',column:'한 열',adjacent:'주변',all:'전체',self:'자신',ally:'아군'};
const EFFECT={damage:'타격',return:'귀환',split:'분열',protection:'보호',counter:'반격',chill:'냉기',vulnerable:'취약',conductive:'전도',pull:'끌어당김'};
export function expeditionProtectionStatus(battle,unit){return `보호 ${Math.ceil(unit.status.protection)}${battle?.version>=2?` / ${unit.maxHp}`:''}`;}
export function expeditionProtectionActionHint(battle,unit,kind){return battle?.version>=2&&unit?.actions?.[kind]?.some(op=>op.type==='protection')?'보호는 대상 최대 HP까지':'';}
export function expeditionActionPresentation(speciesId,kind){
 const species=getExpeditionSpecies(speciesId),law=LAWS[species?.dominantLaw];
 const ops=species?.actionPattern?.[kind]||[];
 const summary=[...new Set(ops.map(op=>`${TARGET[op.target]||'대상'} ${EFFECT[op.type]||'효과'}`))].slice(0,3).join(' · ');
 const title=kind==='attack'?'기본공격':kind==='guard'?'방어':kind==='switch'?'교대':kind==='awaken'?'각성기':`${law?.name||'법칙'}${kind==='skill2'?' 심화':' 발현'}`;
 return Object.freeze({title,icon:kind==='guard'?'◇':kind==='switch'?'⇄':kind==='awaken'?'✦':kind==='attack'?'➶':law?.icon||'✧',hint:kind==='guard'?'피해 완화':kind==='switch'?'대기 씨앗 투입':summary||'현재 법칙',color:`#${(law?.color||0xdde8ac).toString(16).padStart(6,'0')}`});
}
export function expeditionUnitFeedback(unit,units,events){
 const list=Array.isArray(events)?events.slice(-32):[],own=list.find(e=>e.type==='action'&&e.unitId===unit.id);
 const received=list.filter(e=>e.targetId===unit.id&&['damage','protection','chill','conductive','vulnerable','pull'].includes(e.type));
 const hit=received.some(e=>e.type==='damage'&&(e.amount>0||e.absorbed>0));
 const source=units.find(u=>u.id===received.find(e=>e.type==='damage')?.unitId);
 const law=getExpeditionSpecies(source?.speciesId)?.dominantLaw||EXPEDITION_ENEMIES[source?.speciesId]?.law||'pierce';
 const labels=received.slice(-3).map(e=>e.type==='damage'?e.amount>0?`−${Math.ceil(e.amount)}`:'막음':e.type==='protection'?e.amount>0?`보호 +${Math.ceil(e.amount)}`:'보호 유지':EFFECT[e.type]||'');
 return Object.freeze({action:own?.kind||null,pose:unit.dead||hit?7:unit.guarding?6:own?own.kind==='awaken'?5:['skill1','skill2','resonance'].includes(own.kind)?4:own.kind==='attack'?1+((Number.isInteger(own.seq)?own.seq:0)%3):0:0,hit,law,labels,guard:unit.guarding||received.some(e=>e.type==='protection')});
}
