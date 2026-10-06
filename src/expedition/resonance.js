import {EXPEDITION_SPECIES,getExpeditionSpecies} from './species.js';

const op=(type,target='single',ratio=0,extra={})=>({type,target,ratio,...extra});
const scaled=ratio=>Math.min(1.4,Math.round((ratio||.25)*2.2*100)/100);
function translate(a){
 switch(a.type){
  case'arc':return [op('conductive','adjacent'),op('damage','adjacent',scaled(a.ratio),{when:'conductive',maxTargets:3})];
  case'line':return [op('damage','column',scaled(a.ratio),{maxTargets:Math.min(3,(a.targets||1)+1)})];
  case'spray':return [op('split','adjacent',scaled(a.ratio),{maxTargets:Math.min(3,(a.targets||1)+1)})];
  case'recall':return [op('return','column',scaled(a.ratio),{rounds:1})];
  case'pull':return [op('pull','column'),op('vulnerable','column')];
  case'chill':return [op('chill','adjacent',0,{stacks:a.seconds>=1.2?2:1})];
  case'focus':return [op('damage','single',scaled(a.ratio),{when:a.condition==='slowed'?'chilled':a.condition==='near'?'protected':'always'})];
  case'guard':return [op('protection','ally',1.1)];
  default:throw Error(`Unsupported source resonance operation ${a.type}`);
 }
}
export const EXPEDITION_RESONANCE_PROFILES=Object.freeze(Object.fromEntries(Object.values(EXPEDITION_SPECIES).filter(s=>s.kind==='twin').map(s=>{
 const actions=s.resonance.actions.flatMap(translate);
 if(actions.length>8)throw Error(`Resonance budget ${s.id}`);
 return [s.id,Object.freeze({speciesId:s.id,name:s.name,parents:s.parents,rule:s.resonance.rule,actions:Object.freeze(actions.map(Object.freeze)),validation:'turn_adapter_candidate'})];
})));
export function hasSharedResonanceHistory(a,b){
 if(!a||!b||a.instanceId===b.instanceId||a.status!=='alive'||b.status!=='alive'||a.level<8||b.level<8||a.speciesId===b.speciesId||getExpeditionSpecies(a.speciesId)?.kind!=='solo'||getExpeditionSpecies(b.speciesId)?.kind!=='solo')return false;
 const left=Object.values(a.events).filter(e=>e.kind==='survival'),right=new Map(Object.values(b.events).filter(e=>e.kind==='survival').map(e=>[e.expeditionId,e]));
 const shared=left.filter(e=>right.has(e.expeditionId));
 return shared.length>=3&&shared.some(e=>e.boss&&right.get(e.expeditionId).boss);
}
// Choose at most one real eligible pair for each canonical form. Global recipe
// discovery cannot transfer the three shared survivals to fresh individuals.
// Canonical form IDs are unique in this list; immutable member IDs remain exact
// separate fields rather than an unbounded concatenation or truncated hash.
export function eligibleResonancePairs(roster,{activeOnly=false,unlockedOnly=true}={}){
 const active=new Set(roster.party.slice(0,5).filter(Boolean));
 const individuals=Object.values(roster.instances).filter(i=>i.status==='alive'&&i.level>=8&&getExpeditionSpecies(i.speciesId)?.kind==='solo'&&(!activeOnly||active.has(i.instanceId))).sort((a,b)=>a.instanceId.localeCompare(b.instanceId));
 const pairs=[];
 for(const profile of Object.values(EXPEDITION_RESONANCE_PROFILES)){
  if(unlockedOnly&&!roster.recipes.includes(profile.speciesId))continue;
  const left=individuals.filter(i=>i.speciesId===profile.parents[0]),right=individuals.filter(i=>i.speciesId===profile.parents[1]);
  let chosen=null;for(const a of left){for(const b of right)if(hasSharedResonanceHistory(a,b)){chosen={id:`resonance:${profile.speciesId}`,speciesId:profile.speciesId,memberIds:[a.instanceId,b.instanceId],actions:profile.actions};break;}if(chosen)break;}
  if(chosen)pairs.push(chosen);
 }
 return pairs;
}
