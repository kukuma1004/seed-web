import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDefense,plantDefense,upgradeDefense,startDefenseWave,stepDefense,checkpointDefense,restoreDefense,defenseSeedCap} from '../src/seed-defense-rules.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';
import {DEFENSE_SIEGE_NODES,enableDefenseSiegeReview,prepareDefenseSiege,harvestDefenseSiege,checkpointDefenseSiege,restoreDefenseSiege,createDefenseSiegeInspection,defenseSiegeReviewKey} from '../src/defense-crystal-siege.js';
import {createDefenseAccountStore,defenseAccountKey,validDefenseAccountRecord} from '../src/defense-account-save.js';
import {defenseRankEntry,defenseExpansionRankProgress} from '../src/defense-ranking.js';
import {openExpansionActs} from './expansion-gate-fixtures.mjs';

const owner='review-owner',s=createDefenseSiegeInspection();
assert.equal(s.wave,48);assert.equal(s.migratedWaves,0);assert.equal(defenseSeedCap(s),16);
assert.equal(s.currency,231);assert.equal(s.towers.length,13);assert(s.towers.some(t=>t.formId));
assert.equal(s.inspectionPreview,true);assert.equal(s.kills,1956);assert.equal(s.bossWins.crystalGardener,0);
assert.equal(checkpointDefense(s),null);assert.equal(restoreDefense(checkpointDefenseSiege(s,owner)),null);
const rng=s.rng,ids=s.towers.map(t=>t.id),before=s.currency;
assert(harvestDefenseSiege(s,0));assert.equal(s.currency,before+8);assert.equal(s.rng,rng);
assert(!harvestDefenseSiege(s,0));for(const invalid of [-1,6,NaN,Infinity,'0',.5])assert(!harvestDefenseSiege(s,invalid));
const saved=checkpointDefenseSiege(s,owner),restored=restoreDefenseSiege(JSON.stringify(saved),owner);
assert(restored);assert.equal(restoreDefense(saved.state),null,'extracted review state cannot become a normal save');
assert.equal(restored.currency,s.currency);assert.deepEqual(restored.towers.map(t=>t.id),ids);assert.equal(restored.rng,rng);
assert(!harvestDefenseSiege(restored,0));
for(let id=1;id<6;id++)assert(harvestDefenseSiege(restored,id));assert.equal(restored.currency,before+48);
assert.equal(prepareDefenseSiege(restored).mask,63);
// Gathered sunlight is spent by the original economy, not a substitute skill.
const emptyPad=restored.pads.findIndex((p,i)=>!restored.towers.some(t=>t.pad===i));
assert(plantDefense(restored,emptyPad));assert.equal(restored.currency,before+18);
const planted=restored.towers.at(-1);assert(upgradeDefense(restored,planted.id));assert.equal(restored.currency,before-22);assert.equal(planted.level,2);
while(planted.level<5&&upgradeDefense(restored,planted.id)){}
const paidBalance=restored.currency;assert(!upgradeDefense(restored,planted.id));assert.equal(restored.currency,paidBalance);
assert(startDefenseWave(restored));assert.equal(restored.wave,49);assert.equal(prepareDefenseSiege(restored),null);
assert(!harvestDefenseSiege(restored,1));assert.equal(checkpointDefenseSiege(restored,owner),null);
const combat=createDefenseCombat(restored);for(let i=0;i<250&&restored.phase==='wave';i++){
 stepDefense(restored,.1,combat);assert(restored.enemies.length<=120&&restored.shots.length<=180&&restored.effects.length<=100);
}assert(restored.time>0);assert(restored.stats.damage>0,'actual authored combat runs after paid preparation');combat.dispose();

for(const invalidOwner of [undefined,null,'',4,'other'])assert.equal(restoreDefenseSiege(saved,invalidOwner),null);
for(const mutate of [r=>delete r.owner,r=>r.owner='',r=>r.version=2,r=>r.kind='defense',r=>r.extra=true,r=>r.gather.mask=64,r=>r.gather.mask=-1,r=>r.gather.lap++,r=>r.gather.group++,r=>r.gather.extra=true,r=>delete r.state.siegeReview,r=>r.state.siegeReview=false,r=>r.state.currency=-1,r=>r.state.rng=NaN]){
 const bad=structuredClone(saved);mutate(bad);assert.equal(restoreDefenseSiege(bad,owner),null);
}
assert.equal(restoreDefenseSiege('{broken',owner),null);
const normal=createDefense(413,{actCount:5});assert.equal(prepareDefenseSiege(normal),null);assert(!harvestDefenseSiege(normal,0));
assert.equal(normal.currency,90);assert(restoreDefense(checkpointDefense(normal)));
assert.equal(enableDefenseSiegeReview(createDefense(1)),false);
// Even with an open release gate, this review never writes into account/rank.
const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},key=defenseAccountKey(owner,5);
const account=createDefenseAccountStore({storage,owner,circuit:5,acts:openExpansionActs,lease:{ok:true,key,active:()=>true}});
assert.equal(account.write(null,s).ok,false);assert.equal(map.size,0);
const record={version:1,ownerUid:owner,circuit:5,id:s.runId,revision:1,writeId:'review',ended:false,checkpoint:saved.state};
assert.equal(validDefenseAccountRecord(record,owner,5),false);
assert.equal(defenseExpansionRankProgress(s,{acts:openExpansionActs}).eligible,false);
assert.equal(defenseRankEntry({...s,phase:'lost'},{uid:owner,name:'검토',acts:openExpansionActs}),null);
assert.notEqual(defenseSiegeReviewKey(owner),key);assert.notEqual(defenseSiegeReviewKey(owner),defenseSiegeReviewKey('other'));

// Exercise the actual view timer branch: pause, book and placement preserve
// the new 20s preparation grace; the old mode retains its original 3s policy.
const view=readFileSync('src/seed-defense-view.js','utf8');
const timerStart=view.indexOf("const inspecting=root.classList.contains('td-inspecting'),waiting="),timerEnd=view.indexOf('if(!paused&&!confirming){const phase=',timerStart);
assert(timerStart>=0&&timerEnd>timerStart);
const classes=new Set(),events=[],ctx=vm.createContext({root:{classList:{contains:c=>classes.has(c)}},ended:false,paused:true,confirming:false,bookOpen:false,state:s,wasInspecting:false,autoWait:20,localSiege:true,raw:1,DEFENSE_AUTO_INSPECT:6,DEFENSE_AUTO_START:3,prepareDefenseSiege,$:()=>({hidden:true,click:()=>events.push('start')})});
ctx.publicSiegeAllowed=()=>false;vm.runInContext(view.match(/const siegeActive=([^;]+);/)[0],ctx);
const tick=()=>vm.runInContext('{'+view.slice(timerStart,timerEnd)+'}',ctx);
tick();assert.equal(ctx.autoWait,20);ctx.paused=false;ctx.bookOpen=true;tick();assert.equal(ctx.autoWait,20);
ctx.bookOpen=false;classes.add('td-placing');tick();assert.equal(ctx.autoWait,20);classes.clear();tick();assert.equal(ctx.autoWait,19.75);
ctx.localSiege=false;ctx.paused=true;tick();assert.equal(ctx.autoWait,3);
// Manual start checkpoints before the first authored wave, even if no crystal
// or tower button was pressed. A paused start only resumes and does not save.
const handler=view.match(/\$\('#td-start'\)\.onclick=(\(\)=>\{[^\n]+\});/)[1],order=[];
const startCtx=vm.createContext({paused:false,localSiege:true,state:{phase:'build'},save:()=>order.push('save'),startDefenseWave:()=>{order.push('start');return false;},togglePause:()=>order.push('resume')});
startCtx.publicSiegeAllowed=()=>false;vm.runInContext(view.match(/const siegeActive=([^;]+);/)[0],startCtx);vm.runInContext('handler='+handler,startCtx);startCtx.handler();assert.deepEqual(order,['save','start']);order.length=0;startCtx.paused=true;startCtx.handler();assert.deepEqual(order,['resume']);
assert.equal(DEFENSE_SIEGE_NODES.length,6);assert(DEFENSE_SIEGE_NODES.every(n=>Object.isFrozen(n)));
console.log('TD crystal siege: original paid economy/combat, duplicate harvest, strict local resume, extracted-state account/rank rejection, manual-start checkpoint and pause/book/placement grace passed. Supplied Node-grown wave48 fixture is not human/account progress; Node verification is not device QA.');
