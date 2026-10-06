import content from './content.json' with {type:'json'};
import {expeditionBossActionPattern} from './boss-ai.js';
import {GARDEN_THEMES} from '../garden-themes.js';
import {LAW_DNA} from './species.js';

export const EXPEDITION_GARDENS=Object.freeze(Object.fromEntries(content.campaignGardens.map(g=>[g.id,Object.freeze({...g,tone:GARDEN_THEMES.find(t=>t.id===g.id).tone,homeArt:`garden/v2/${g.id}/base.webp`})])));
export const EXPEDITION_RUN_STEPS=Object.freeze([...content.runStructure]);
const d=(target='single',ratio=1)=>({type:'damage',target,ratio});
const effect=(type,target='single',extra={})=>({type,target,ratio:0,...extra});
const back=(ratio=.8)=>({...d('single',ratio),ignoreFront:true});
const returnHit=(target='single',ratio=.8)=>({type:'return',target,ratio,rounds:1});
// Four common enemy skeletons; region actions give each a different lesson.
const REGION_PATTERNS=Object.freeze({
 meadow:[[d('column',.8)],[back(.8)],[returnHit('column',1)],[effect('vulnerable'),d('single',.6)]],
 blossom:[[{type:'split',target:'adjacent',ratio:.55,maxTargets:2}],[d('single',.9),effect('protection','ally',{ratio:.4})],[effect('vulnerable'),back(.65)],[effect('delay','single',{rounds:1})]],
 autumn:[[d('single',.6),returnHit()],[returnHit('single',1)],[d('single',.75),effect('protection','self',{ratio:.6})],[{type:'counter',target:'self',ratio:.7,charges:1}]],
 snow:[[effect('chill','single',{stacks:1}),d('single',.6)],[effect('chill','single',{stacks:1}),back(.5)],[effect('delay','single',{rounds:1})],[effect('chill','adjacent',{stacks:1})]],
 moon:[[d('adjacent',.65)],[effect('protection','ally',{ratio:1})],[d('column',.75)],[effect('protection','ally',{ratio:1.3})]],
 fire:[[d('adjacent',.7)],[returnHit('single',1)],[effect('vulnerable'),d('single',.8)],[returnHit('adjacent',.85)]],
 shadow:[[effect('pull'),d('single',.7)],[effect('vulnerable'),back(.7)],[effect('pull','column')],[effect('delay','single',{rounds:1}),d('single',.6)]],
 dream:[[{type:'counter',target:'self',ratio:.65,charges:1}],[effect('protection','self',{ratio:.7}),d('single',.6)],[returnHit('single',.7)],[effect('vulnerable'),d('single',.7)]]
});
const BOSS_ATTACKS=Object.freeze({
 meadow:[effect('vulnerable','column'),d('column',1.4)],
 blossom:[{type:'split',target:'all',ratio:.85,maxTargets:5}],
 autumn:[returnHit('column',1.2)],
 snow:[d('column',1.8)],
 moon:[effect('protection','ally',{ratio:1.8}),d('adjacent',.9)],
 fire:[returnHit('all',1.1)],
 shadow:[effect('pull','column'),effect('vulnerable','column'),d('column',.9)],
 dream:[{type:'counter',target:'self',ratio:1.2,charges:1},effect('protection','self',{ratio:1})]
});
export const EXPEDITION_ENEMIES=Object.freeze(Object.fromEntries(Object.values(EXPEDITION_GARDENS).flatMap(g=>[
 ...g.normal.map((name,i)=>[`${g.id}-normal-${i}`,Object.freeze({id:`${g.id}-normal-${i}`,name,gardenId:g.id,rank:'normal',skeleton:['assault','ranged','support','disruptor'][i],law:g.law,pattern:REGION_PATTERNS[g.id][i]})]),
 ...g.elite.map((name,i)=>[`${g.id}-elite-${i}`,Object.freeze({id:`${g.id}-elite-${i}`,name,gardenId:g.id,rank:'elite',skeleton:i?'disruptor':'assault',law:g.law,pattern:[...REGION_PATTERNS[g.id][i+2],effect('vulnerable')]})]),
 [`${g.id}-boss`,Object.freeze({id:`${g.id}-boss`,name:g.boss,gardenId:g.id,rank:'boss',skeleton:'boss',law:g.law,pattern:BOSS_ATTACKS[g.id],tell:`${g.lesson} · 다음 라운드에 강한 공격`,validation:'pattern_candidate'})]
])));
export function expeditionEnemyProfile(id){const e=Object.hasOwn(EXPEDITION_ENEMIES,id)?EXPEDITION_ENEMIES[id]:null;if(!e)return null;return {id:e.id,name:e.name,actionPattern:e.rank==='boss'?expeditionBossActionPattern(e.gardenId):{attack:REGION_PATTERNS[e.gardenId][0],skill1:e.pattern,skill2:e.pattern,awaken:e.pattern}};}
export function expeditionEncounter(gardenId,{difficulty=1,kind='normal',battleId='battle'}={}){
 const g=Object.hasOwn(EXPEDITION_GARDENS,gardenId)?EXPEDITION_GARDENS[gardenId]:null;if(!g||!Number.isInteger(difficulty)||difficulty<1||difficulty>5||!['normal','elite','boss'].includes(kind))throw Error('Invalid expedition encounter');
 const scale=1+.24*(difficulty-1),boss=kind==='boss';
 const members=boss?[`${gardenId}-normal-2`,`${gardenId}-boss`,`${gardenId}-normal-0`]:kind==='elite'?[`${gardenId}-elite-0`,`${gardenId}-elite-1`,`${gardenId}-normal-1`]:[`${gardenId}-normal-0`,`${gardenId}-normal-1`,`${gardenId}-normal-3`];
 return members.map((id,slot)=>{const e=EXPEDITION_ENEMIES[id],dna=LAW_DNA[g.law],isBoss=e.rank==='boss',elite=e.rank==='elite';return {id:`${battleId}:enemy:${slot}`,speciesId:id,side:'enemy',slot,
  hp:Math.round((isBoss?360:elite?100:55)*scale),maxHp:Math.round((isBoss?360:elite?100:55)*scale),power:Math.round((isBoss?24:elite?16:10)*scale),defense:Math.round((isBoss?7:elite?5:2)*scale),speed:isBoss?(gardenId==='snow'?3:7):dna.speed,
  level:difficulty,boss:isBoss,status:{chill:0,vulnerable:0,conductive:0,protection:0},bossLethal:isBoss};});
}
export function newExpeditionRoute({runId,gardenId,difficulty=1,partyIds}){
 const token=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,100}$/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
 const memberToken=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
 if(!token(runId)||!Object.hasOwn(EXPEDITION_GARDENS,gardenId)||!Number.isInteger(difficulty)||difficulty<1||difficulty>5||!Array.isArray(partyIds)||partyIds.length!==8||!partyIds.slice(0,5).some(Boolean)||partyIds.some(id=>id!==null&&!memberToken(id))||new Set(partyIds.filter(Boolean)).size!==partyIds.filter(Boolean).length)throw Error('Invalid expedition route');
 return {version:1,runId,gardenId,difficulty,partyIds:[...partyIds],step:0,position:0,status:'exploring',pendingLoot:[],completedBattles:[],restUsed:false,elapsedSeconds:0};
}
export function advanceExpeditionRoute(route){if(route.status!=='exploring'||route.step>=EXPEDITION_RUN_STEPS.length-1)return false;route.step++;route.position=0;return true;}
export function routeLandmarks(route){return [{id:'next',x:14,kind:EXPEDITION_RUN_STEPS[route.step],interactDistance:1.4}];}
