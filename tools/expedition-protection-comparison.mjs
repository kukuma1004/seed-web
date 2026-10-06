import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createExpeditionCombat as create,performExpeditionCombatAction as act,expeditionCombatTurn as turn,checkpointExpeditionCombat as checkpoint,restoreExpeditionCombat as restore} from '../src/expedition/combat.js';
import {getExpeditionSpecies,expeditionStats} from '../src/expedition/species.js';
import {EXPEDITION_GARDENS,expeditionEncounter,expeditionEnemyProfile} from '../src/expedition/world.js';
import {expeditionBossCommand} from '../src/expedition/boss-ai.js';
import {createExpeditionController} from '../src/expedition/controller.js';
import {EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
const files=['combat','species','controller','world','boss-ai','relics','session','roster'].map(name=>'src/expedition/'+name+'.js');
const hashes=()=>Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),snapshot=hashes(),start=performance.now();
const live=u=>u.hp>0&&!u.dead&&u.slot<5,body=(id,speciesId,slot)=>({id,instanceId:id,speciesId,slot,level:8,...expeditionStats(speciesId,8),maxHp:expeditionStats(speciesId,8).hp});
let actions=0,forecasts=0,serial=0;
// One actual P2-action lookahead uses accepted operation receipts. Protection
// depletion is progress; saturated status marks grant no score. No enemy search,
// hidden information, arbitrary stat grants or real user/account writes.
function intent(s){const u=turn(s),targets=s.units.filter(v=>live(v)&&v.side!==u.side).sort((a,b)=>a.slot-b.slot),front=targets.filter(v=>v.slot<2),allowed=front.length?front:targets;
 if(s.warnings.some(w=>w.targetId===u.id&&w.issuedRound===s.round-1))return {kind:'guard'};
 const choices=['attack','skill1',...(u.level>=5?['skill2']:[]),...(u.level>=8&&!u.awakenUsed?['awaken']:[])];let best=null;
 for(const kind of choices)for(const target of allowed){const candidate={kind,targetId:target.id},copy=checkpoint(s),out=act(copy,{id:'forecast-'+(++serial),unitId:u.id,...candidate});forecasts++;if(!out.ok)continue;let score=0;
  for(const before of s.units){const after=copy.units.find(v=>v.id===before.id),ally=before.side===u.side;
   score+=(before.hp-after.hp)*(ally?-1.5:1);
   score+=(before.status.protection-after.status.protection)*(ally?-.15:.5);
   if(ally)score+=Math.max(0,after.status.protection-before.status.protection)*.15;
   else {score+=(after.status.chill-before.status.chill)*u.power*.1;score+=(after.status.vulnerable-before.status.vulnerable)*u.power*.08;score+=(after.status.conductive-before.status.conductive)*u.power*.04;}
  }
  score+=out.events.filter(e=>e.type==='returnWarning'&&e.unitId===u.id).reduce((n,e)=>{const p=copy.pending.find(p=>p.ownerId===u.id&&p.targetId===e.targetId);return n+(p?u.power*p.ratio*.35:0);},0);
  if(!best||score>best.score)best={...candidate,score};
 }
 assert(best);delete best.score;return best;
}
function enemy(s,id){return expeditionBossCommand(s,id)||{id,unitId:turn(s).id,kind:'skill1',targetId:s.units.filter(u=>live(u)&&u.side==='ally').sort((a,b)=>a.slot-b.slot)[0].id};}
function inspect(s){assert.deepEqual(restore(checkpoint(s)),s);assert(s.units.every(u=>u.status.protection<=(s.version===1?100000:u.maxHp)));}
const probes=[];
for(const speciesId of ['orbit','starring','reflect','mirrorguard','comethalo'])for(const version of [1,2]){
 const s=create({version,allies:[body('a',speciesId,0)],enemies:[{...body('e','burst',0),hp:10000,maxHp:10000}],getSpecies:getExpeditionSpecies});let maxProtection=0;
 while(s.phase==='fight'){const u=turn(s),out=act(s,{id:'probe-'+(++serial),unitId:u.id,kind:u.side==='ally'?'skill1':'guard',...(u.side==='ally'?{targetId:'e'}:{})});assert(out.ok);actions++;maxProtection=Math.max(maxProtection,s.units[0].status.protection);}
 inspect(s);probes.push({speciesId,version,maxHp:s.units[0].maxHp,maxProtection,phase:s.phase,actions:s.actionCount});
}
const representatives=[];
for(const speciesId of ['final-spearring-orbit','final-stormanchor-gravity','final-gravitymirror-gravity','final-coldwell-gravity','final-accretiondisk-gravity','final-echolane-reflect'])for(const garden of ['meadow','moon','dream'])for(const difficulty of [1,3])for(const version of [1,2]){
 const battleId='ward-compare-'+(++serial),s=create({version,battleId,allies:[body('a',speciesId,0)],enemies:expeditionEncounter(garden,{difficulty,kind:'boss',battleId}),getSpecies:id=>getExpeditionSpecies(id)||expeditionEnemyProfile(id)});let maxProtection=0;
 while(s.phase==='fight'){const u=turn(s),id='compare-'+(++serial),out=act(s,u.side==='enemy'?enemy(s,id):{id,unitId:u.id,...intent(s)});assert(out.ok,JSON.stringify(out));actions++;maxProtection=Math.max(maxProtection,...s.units.map(v=>v.status.protection));}
 inspect(s);representatives.push({speciesId,garden,difficulty,version,phase:s.phase,actions:s.actionCount,rounds:s.round,maxProtection});
}
const campaigns=[];
for(const [garden,difficulty] of [...Object.keys(EXPEDITION_GARDENS).map(id=>[id,1]),['moon',3],['dream',4]])for(const version of [1,2]){
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},options={storage,owner:'ward-comparison',idFactory:()=>String(++serial),combatVersion:version},c=createExpeditionController(options);assert(c.dispatch({type:'depart',gardenId:garden,difficulty}).ok);let count=0,maxShieldRatio=0;
 for(let step=0;step<1600&&c.state().screen!=='result';step++){
  const s=c.state();if(s.screen==='battle'){const u=turn(s.battle),cmd=u.side==='enemy'?{type:'enemy'}:{type:'action',...intent(s.battle)};assert(c.dispatch(cmd).ok);count++;actions++;maxShieldRatio=Math.max(maxShieldRatio,...s.battle.units.map(u=>u.status.protection/u.maxHp));}
  else{for(let n=0;n<35;n++)assert(c.dispatch({type:'move',dx:1,dt:.1}).ok);const point=EXPEDITION_RUN_STEPS[c.state().route.step],cmd=point==='choice'?{type:'choice',mode:'core',lawId:'chain'}:point==='rest'?{type:'rest'}:point==='return_or_boss'?{type:'boss'}:{type:'interact'};assert(c.dispatch(cmd).ok);}
 }
 const end=c.state();assert.equal(end.screen,'result');c.close();assert.deepEqual(createExpeditionController(options).state().roster,end.roster);campaigns.push({garden,difficulty,version,kind:end.lastResult.kind,boss:end.lastResult.boss,survivors:end.lastResult.survivors,lost:end.lastResult.lost,actions:count,maxShieldRatio:+maxShieldRatio.toFixed(3)});
}
assert.deepEqual(hashes(),snapshot,'Do not combine results from different source snapshots');
const report={policy:'Same one actual-P2-action lookahead policy in both versions; scores shield depletion and incremental statuses. No future enemy search. Lv8 individual representative bodies; actual freshLv1/earned XP campaigns. No human-time estimate.',sourceHashes:snapshot,counts:{probes:probes.length,representatives:representatives.length,campaigns:campaigns.length,acceptedActions:actions,forecastActions:forecasts},runtimeMs:+(performance.now()-start).toFixed(1),probes,representatives,campaigns};
writeFileSync('artifacts/expedition-protection-comparison-20261006.json',JSON.stringify(report,null,2)+'\n');
const summary=list=>({n:list.length,victories:list.filter(r=>r.phase==='victory').length,limits:list.filter(r=>r.phase==='limit').length,defeats:list.filter(r=>r.phase==='defeat').length});
console.log(JSON.stringify({counts:report.counts,runtimeMs:report.runtimeMs,V1:summary(representatives.filter(r=>r.version===1)),V2:summary(representatives.filter(r=>r.version===2)),probes,campaigns}));
