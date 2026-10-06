import {EXPEDITION_SPECIES,getExpeditionSpecies} from './species.js';
import {EXPEDITION_RESONANCE_PROFILES} from './resonance.js';

export const EXPEDITION_CODEX_PAGE_SIZE=12;
export const EXPEDITION_CODEX_KINDS=Object.freeze({all:'전체',base:'기본',solo:'단독진화',fusion:'융합',final:'완성각성',twin:'쌍둥이 공명'});
const order=['base','solo','fusion','final','twin'];
const catalog=Object.freeze(Object.values(EXPEDITION_SPECIES).slice().sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind)||a.name.localeCompare(b.name,'ko')));
export function expeditionCodexPage(roster,{kind='all',page=0}={}){
 if(!Object.hasOwn(EXPEDITION_CODEX_KINDS,kind))kind='all';
 const found=new Set((roster?.discoveries||[]).filter(id=>Object.hasOwn(EXPEDITION_SPECIES,id)));
 const recipes=new Set(roster?.recipes||[]),list=kind==='all'?catalog:catalog.filter(s=>s.kind===kind);
 const pages=Math.max(1,Math.ceil(list.length/EXPEDITION_CODEX_PAGE_SIZE));
 page=Math.max(0,Math.min(pages-1,Number.isInteger(page)?page:0));
 return {kind,page,pages,total:catalog.length,found:found.size,filteredTotal:list.length,
  entries:list.slice(page*EXPEDITION_CODEX_PAGE_SIZE,(page+1)*EXPEDITION_CODEX_PAGE_SIZE).map(species=>({species,discovered:found.has(species.id),recipe:recipes.has(species.id)}))};
}
const targets={single:'한 대상',column:'한 열',adjacent:'대상 주변',all:'전체',self:'자신',ally:'아군'};
const effects={damage:'타격',split:'분열 타격',return:'귀환 타격',protection:'보호막',counter:'반격 준비',chill:'냉기',conductive:'전도',vulnerable:'취약',pull:'전열로 끌어당김'};
const conditions={hit:'적중 뒤',guarded:'방어와 맞물릴 때',marked:'취약한 대상',chilled:'냉각된 대상',conductive:'전도된 대상',protected:'보호막이 남았을 때',crowded:'주변에 적이 모였을 때'};
export function expeditionCodexActionLines(id,kind){
 const s=getExpeditionSpecies(id),ops=s?.kind==='twin'?(kind==='resonance'?EXPEDITION_RESONANCE_PROFILES[id]?.actions:[]):s?.actionPattern?.[kind];
 return (ops||[]).map(op=>[
  conditions[op.when],`${targets[op.target]||'대상'} ${effects[op.type]||'효과'}`,
  op.ratio>0?`POWER ${Math.round(op.ratio*100)}%`:['chill','conductive','vulnerable'].includes(op.type)?`${op.stacks??op.amount??1}단계`:'',
  op.type==='return'?`${op.rounds||1}라운드 뒤`:'',op.maxTargets?`최대 ${op.maxTargets}기`:'',op.type==='counter'?`${op.charges||1}회`:'',
 ].filter(Boolean).join(' · '));
}
