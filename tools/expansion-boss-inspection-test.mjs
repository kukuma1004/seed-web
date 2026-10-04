import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createJourneyBossInspection,createDefenseBossInspection} from '../src/expansion-boss-inspection.js';
import {stepDefense,defenseWaveInfo} from '../src/seed-defense-rules.js';
const source=readFileSync('src/main.js','utf8').replaceAll('\r\n','\n');
const view=readFileSync('src/seed-defense-view.js','utf8');
assert.equal(createDefenseBossInspection('crosswind'),null);
assert.equal(createDefenseBossInspection('unknown',{enabled:true}),null);
for(const [act,wave,id] of [['crosswind',48,'crosswindKeeper'],['crystalGorge',60,'crystalGardener']]){
 const journey=createJourneyBossInspection(act);
 assert.equal(journey.phase,'boss');assert.equal(journey.boss.id,id);assert(journey.inspectionPreview);
 const state=createDefenseBossInspection(act,{enabled:true});
 assert.equal(state.wave,wave);assert.equal(state.kills,0);assert.equal(state.pendingBosses.length,0);
 assert.equal(state.enemies.length,1);assert.equal(state.enemies[0].bossId,id);
 assert.equal(defenseWaveInfo(wave,state).act,act==='crosswind'?3:4);
 assert.equal(state.towers.length,4);assert(state.towers.every(t=>t.level===5));
 assert(Object.values(state.bossWins).every(v=>v===0));
 const seen=new Set();for(let i=0;i<600;i++){stepDefense(state,1/60);seen.add(state.enemies[0]?.expansionState);}
 assert(seen.has('tell')&&seen.has('attack'),'canonical boss runs actual preparation and attack');
}
// Exercise the actual shipped HUD with no journey object, as in survival.
const start=source.indexOf('function renderBossHud('),end=source.indexOf('\n}',start)+2;
assert(start>=0&&end>start);
for(const [id,crystal] of [['crosswindKeeper',false],['crystalGardener',true]]){
 const elements=new Map(),hud={dataset:{},querySelector:s=>{if(!elements.has(s))elements.set(s,{});return elements.get(s);}};
 const context=vm.createContext({$:()=>hud,expansionJourney:null,setHidden:(e,v)=>e.hidden=v,setWidth:(e,v)=>e.width=v,setText:(e,v)=>e.text=v});
 vm.runInContext(source.slice(start,end),context);
 context.renderBossHud({expansionBoss:true,type:id,expansionMotion:{id},config:{name:id},state:'attack',hp:50,maxHp:100});
 assert.equal(elements.get('.boss-move').text,crystal?'수정 공격':'횡풍 공격');
 assert.match(elements.get('small').text,crystal?/꽃심.*다시 자라는 수정/:/돌진/);
}
const saveStart=source.indexOf('function canSaveExpansion('),saveEnd=source.indexOf('\n',saveStart);
const context=vm.createContext({expansionJourney:{inspectionPreview:true},Boolean});
vm.runInContext(source.slice(saveStart,saveEnd),context);
assert.equal(context.canSaveExpansion(),false,'scripted journey never enters save/lease/account code');
assert(source.includes('if(bossPreview&&(publicRun||resume||!localInspection))return false;'));
assert(source.includes('bossPreview:localInspection?bossPreview:null'));
assert(view.includes("['127.0.0.1','localhost'].includes(location.hostname)"));
assert(view.includes("has('inspect')&&isolated()?createDefenseBossInspection"));
// Actual canvas framing must retain the old three-act projection while making
// room for a larger expansion boss above the entry path and below the HUD.
const projectionStart=view.indexOf('const expanded=state.actCount===5'),projectionEnd=view.indexOf('dirty=true;placeButtons();',projectionStart);
assert(projectionStart>=0&&projectionEnd>projectionStart);
for(const [width,height] of [[844,390],[1280,720]])for(const actCount of [3,5]){
 const context=vm.createContext({width,height,state:{actCount,wave:60},defenseWaveInfo,scale:0,ox:0,oy:0});
 vm.runInContext(view.slice(projectionStart,projectionEnd),context);
 if(actCount===3){assert.equal(context.scale,Math.min(width/110,height/47));assert.equal(context.oy,height/2-31*context.scale);}
 else{const nameY=context.oy+(10-12.8*.76)*context.scale;assert(nameY>=54,'boss name below floating HUD');assert(context.oy+55*context.scale<height,'garden goal remains inside viewport');}
}
console.log('Scripted local boss scenarios: real 4/5 patterns, zero invented kills/rewards, normal-save exclusion and correct survival HUD passed. This is not a campaign clear.');
