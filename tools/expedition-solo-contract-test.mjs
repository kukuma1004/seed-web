import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SOLO_FORMS} from '../src/forms.js';
import {EXPEDITION_SPECIES,EXPEDITION_TAXONOMY,XP_THRESHOLDS,LAW_DNA,expeditionStats,getExpeditionSpecies} from '../src/expedition/species.js';
import {createExpeditionCombat as create,performExpeditionCombatAction as act,expeditionCombatTurn as turn,checkpointExpeditionCombat as checkpoint,restoreExpeditionCombat as restore} from '../src/expedition/combat.js';
let groups=0,seq=0;const check=(name,fn)=>{fn();groups++;console.log('PASS',name);};
const clone=v=>structuredClone(v),json=JSON.stringify,find=(s,id)=>s.units.find(u=>u.id===id);
const body=(id,speciesId,slot,extra={})=>({id,instanceId:id,speciesId,slot,level:5,...expeditionStats(speciesId,5),maxHp:expeditionStats(speciesId,5).hp,...extra});
const foes=(count=5,extra={})=>Array.from({length:count},(_,slot)=>body('e'+slot,'burst',slot,{hp:10000,maxHp:10000,power:10,defense:0,speed:10-slot,...extra}));
const fixture=(speciesId,{enemies=foes(),allies,level=5,heroExtra={}}={})=>create({battleId:'solo-contract-'+speciesId,allies:allies??[body('a',speciesId,0,{speed:100,level,...heroExtra})],enemies,getSpecies:getExpeditionSpecies});
const command=(s,kind='guard',extra={})=>{const t=turn(s);assert(t);const out=act(s,{id:'solo-input-'+(++seq),unitId:t.id,kind,...extra});assert(out.ok,json(out));return out;};
const roundEnd=s=>{const n=s.round;for(let i=0;i<16&&s.round===n&&s.phase==='fight';i++)command(s);};
const shape=out=>out.events.filter(e=>!['action','roundStart'].includes(e.type)).map(e=>({type:e.type,targetId:e.targetId,unitId:e.unitId,dueRound:e.dueRound,slot:e.slot,kind:e.kind}));
const soloFor=law=>Object.values(SOLO_FORMS).find(s=>s.requires[0]===law).id;
check('Canonical9 identities and all non-solo projections/stat/XP remain byte-identical',()=>{
 assert.deepEqual(EXPEDITION_TAXONOMY,{base:9,solo:9,fusion:36,final:72,twin:36});
 const hash=createHash('sha256').update(json({species:Object.values(EXPEDITION_SPECIES).filter(s=>s.kind!=='solo'),XP_THRESHOLDS,LAW_DNA})).digest('hex');assert.equal(hash,'4b6e1cfc8770b373979e2c931423cf4b695f3e68e37de81f3e39a83a60405947');
 for(const source of Object.values(SOLO_FORMS)){const s=EXPEDITION_SPECIES[source.id];assert.equal(s.id,source.id);assert.equal(s.name,source.name);assert.deepEqual(s.parents,source.requires);assert.deepEqual(s.laws,source.requires);assert.deepEqual(s.stats,EXPEDITION_SPECIES[source.requires[0]].stats);for(let lv=1;lv<=10;lv++)assert.deepEqual(expeditionStats(s.id,lv),expeditionStats(source.requires[0],lv));}
});
for(const source of Object.values(SOLO_FORMS))check(source.id+' Lv5 actual skill1 effect topology differs from base, gated skill2 and immutable restore',()=>{
 const base=fixture(source.requires[0]),solo=fixture(source.id),a=command(base,'skill1',{targetId:'e0'}),b=command(solo,'skill1',{targetId:'e0'});assert.notDeepEqual(shape(a),shape(b),'not merely changed ratios');assert.deepEqual(restore(checkpoint(solo)),solo);
 const s2=fixture(source.id),out=command(s2,'skill2',{targetId:'e0'});assert(out.events.length<=128&&s2.pending.length<=6);assert.deepEqual(restore(checkpoint(s2)),s2);
 const low=fixture(source.id,{level:4}),before=json(low);assert.equal(act(low,{id:'locked-'+source.id,unitId:'a',kind:'skill2',targetId:'e0'}).reason,'locked');assert.equal(json(low),before);assert.equal(act(s2,{id:'awaken-at5-'+source.id,unitId:'a',kind:'awaken',targetId:'e0'}).reason,'turn');
 const fresh=fixture(source.id);assert.equal(act(fresh,{id:'awaken5-'+source.id,unitId:'a',kind:'awaken',targetId:'e0'}).reason,'locked');
});
check('mirrormaze echo requires actual incoming guarded receipt and fixed column warning',()=>{
 const id=soloFor('reflect'),s=fixture(id,{enemies:[foes()[0],foes()[2]]});const initial=command(s,'skill2',{targetId:'e0'});assert.equal(initial.events.filter(e=>e.type==='returnWarning').length,0);assert.equal(s.pending.length,0);
 const earned=fixture(id,{enemies:[foes()[0],foes()[2]]});command(earned,'guard');command(earned,'attack',{targetId:'a'});roundEnd(earned);assert(find(earned,'a').guardedReceipt);const echo=command(earned,'skill2',{targetId:'e0'});assert.equal(echo.events.filter(e=>e.type==='returnWarning').length,2);assert.deepEqual(earned.pending.map(p=>p.targetId),['e0','e2']);assert(!find(earned,'a').guardedReceipt);assert.deepEqual(restore(checkpoint(earned)),earned);
});
check('fullbloom has bounded two-generation actual crowd branches and no phantom lone branches',()=>{
 const id=soloFor('split'),one=fixture(id,{enemies:foes(1)}),many=fixture(id);const a=command(one,'skill1',{targetId:'e0'}),b=command(many,'skill1',{targetId:'e0'});assert.equal(a.events.filter(e=>e.type==='damage').length,1);assert.equal(b.events.filter(e=>e.type==='damage').length,7);assert.deepEqual([...new Set(b.events.filter(e=>e.type==='damage').map(e=>e.targetId))],['e0','e1','e2']);assert(find(many,'e3').hp===10000&&find(many,'e4').hp===10000);
});
check('thunderweb marks real targets then uses common bounded chain; no reserve or lone secondary',()=>{
 const id=soloFor('chain'),many=fixture(id,{enemies:foes(6)}),out=command(many,'skill1',{targetId:'e0'});assert.equal(out.events.filter(e=>e.type==='conductive').length,3);assert(out.events.some(e=>e.type==='chain'));assert(out.events.filter(e=>e.type==='damage').length<=6);assert(find(many,'e5').hp===10000);const one=fixture(id,{enemies:foes(1)}),single=command(one,'skill1',{targetId:'e0'});assert.equal(single.events.filter(e=>e.type==='damage').length,1);assert(!single.events.some(e=>e.type==='chain'));
});
check('starring own protection enables finite contact; living ally selection protects actual companion',()=>{
 const id=soloFor('orbit'),s=fixture(id),out=command(s,'skill1',{targetId:'e0'});assert(find(s,'a').status.protection>0);assert.equal(out.events.filter(e=>e.type==='damage').length,3);assert(find(s,'e3').hp===10000);
 const mate=fixture(id,{allies:[body('a',id,2,{speed:100}),body('b','burst',0,{speed:50})]});const support=command(mate,'skill1',{targetId:'e0'});assert(find(mate,'b').status.protection>0);assert.equal(support.events.filter(e=>e.type==='damage').length,3);assert(support.events.some(e=>e.type==='protection'&&e.targetId==='b'));assert.deepEqual(restore(checkpoint(mate)),mate);
});
check('glassspear second passage requires actual HP hit and never sweeps other columns',()=>{
 const id=soloFor('pierce'),s=fixture(id),out=command(s,'skill1',{targetId:'e0'});assert.equal(out.events.filter(e=>e.type==='damage').length,4);assert.deepEqual([...new Set(out.events.filter(e=>e.type==='damage').map(e=>e.targetId))],['e0','e2']);assert(find(s,'e1').hp===10000);
 const shielded=fixture(id,{enemies:foes(5,{status:{chill:0,vulnerable:0,conductive:0,protection:1000}})}),blocked=command(shielded,'skill1',{targetId:'e0'});assert.equal(blocked.events.filter(e=>e.type==='damage').length,2);assert(blocked.events.filter(e=>e.type==='damage').every(e=>e.amount===0));assert.deepEqual(restore(checkpoint(shielded)),shielded);
});
check('flarebloom schedules actual primary impact and later embers with fixed identities',()=>{
 const s=fixture(soloFor('burst')),first=command(s,'skill1',{targetId:'e0'});assert(!first.events.some(e=>e.type==='damage'));assert.equal(s.pending.length,6);assert.deepEqual([...new Set(s.pending.map(p=>p.dueRound))],[2,3]);const saved=restore(checkpoint(s));for(let n=0;n<16&&s.round===1;n++){const input={id:'replay-flare-'+n,unitId:turn(s).id,kind:'guard'};const left=act(s,input),right=act(saved,input);assert(left.ok&&right.ok);assert.deepEqual(left,right);assert.deepEqual(saved,s);}const hp2=find(s,'e0').hp;assert(hp2<10000);roundEnd(s);assert(find(s,'e0').hp<hp2);assert.equal(s.pending.length,0);assert(find(s,'e3').hp===10000);
});
check('rewind consumes one paid turn for finite three fixed passes, no full-round extra actions',()=>{
 const s=fixture(soloFor('recall')),out=command(s,'skill2',{targetId:'e0'});assert.equal(s.actionCount,1);assert.equal(out.events.filter(e=>e.type==='returnWarning').length,6);assert.deepEqual([...new Set(s.pending.map(p=>p.dueRound))],[2,3,4]);for(let i=0;i<3;i++)roundEnd(s);assert.equal(s.round,4);assert.equal(s.pending.length,0);assert.equal(find(s,'e1').hp,10000);assert(find(s,'e0').hp<10000&&find(s,'e2').hp<10000);assert.deepEqual(restore(checkpoint(s)),s);
});
check('rewind fixed returned target moved to reserve is skipped rather than redirected to incoming body',()=>{
 const enemies=foes(6),s=fixture(soloFor('recall'),{enemies});command(s,'skill2',{targetId:'e0'});command(s,'switch',{reserveId:'e5'});roundEnd(s);assert.equal(find(s,'e0').slot,5);assert.equal(find(s,'e0').hp,10000);assert.equal(find(s,'e5').hp,10000);assert(find(s,'e2').hp<10000);assert.deepEqual(restore(checkpoint(s)),s);
});
check('blackhole actual open front pull plus two fixed ticks; actual boss never relocates',()=>{
 const id=soloFor('gravity'),s=fixture(id,{enemies:[foes()[2],foes()[3],foes()[4]]}),out=command(s,'skill1',{targetId:'e2'});assert(out.events.some(e=>e.type==='pull'));assert.equal(find(s,'e2').slot,0);assert.equal(find(s,'e3').slot,1);assert.equal(s.pending.length,6);roundEnd(s);const first=find(s,'e2').hp;roundEnd(s);assert(find(s,'e2').hp<first);assert.equal(s.pending.length,0);
 const boss=fixture(id,{enemies:[body('boss','burst',2,{boss:true,hp:10000,maxHp:10000,power:1,speed:10})]}),immune=command(boss,'skill1',{targetId:'boss'});assert(immune.events.some(e=>e.type==='controlImmune'));assert.equal(find(boss,'boss').slot,2);assert.equal(boss.pending.length,2);assert(!immune.events.some(e=>e.type==='damage'));assert.deepEqual(restore(checkpoint(boss)),boss);
});
check('winterbreath bonus reads preexisting cold; narrow3 victims freeze normal but only delay boss',()=>{
 const id=soloFor('frost'),coldFoes=foes(5,{status:{chill:1,vulnerable:0,conductive:0,protection:0}}),s=fixture(id,{enemies:coldFoes}),cold=command(s,'skill2',{targetId:'e0'});assert.equal(cold.events.filter(e=>e.type==='damage').length,6);assert(cold.events.some(e=>e.type==='frozenSkip'));assert(!s.acted.includes('e3'));assert.equal(find(s,'e3').status.chill,1);
 const fresh=fixture(id),plain=command(fresh,'skill2',{targetId:'e0'});assert.equal(plain.events.filter(e=>e.type==='damage').length,3);assert(find(fresh,'e0').status.chill===2);
 const boss=fixture(id,{enemies:[body('boss','burst',0,{boss:true,hp:10000,maxHp:10000,speed:30,status:{chill:1,vulnerable:0,conductive:0,protection:0}}),body('other','burst',1,{hp:10000,maxHp:10000,speed:20})]}),immune=command(boss,'skill2',{targetId:'boss'});assert(immune.events.some(e=>e.type==='bossDelay'));assert(!immune.events.some(e=>e.type==='frozenSkip'));assert.equal(find(boss,'boss').status.chill,0);assert.equal(turn(boss).id,'other');
});
check('Every solo actual skill2 respects common guard and enemy reserve bounds',()=>{
 for(const source of Object.values(SOLO_FORMS)){const enemies=foes(6);enemies[0].speed=200;const a=fixture(source.id,{enemies}),b=fixture(source.id,{enemies:clone(enemies)});assert.equal(turn(a).id,'e0');command(a,'attack',{targetId:'a'});command(b,'guard');assert(find(b,'e0').guarding);assert(restore(checkpoint(b)));const plain=command(a,'skill2',{targetId:'e0'}),guard=command(b,'skill2',{targetId:'e0'});assert(find(a,'e5').hp===10000&&find(b,'e5').hp===10000);assert(guard.events.filter(e=>e.type==='damage'&&e.targetId==='e0').every(e=>e.guarded));assert(plain.events.length<=128&&guard.events.length<=128);assert.deepEqual(restore(checkpoint(b)),b);}
});
console.log('Expedition solo contract actual P2 PASS',groups,'groups; nine distinct candidate law translations. Wall/range/projectile-class approximations explicitly retained; no visuals/device/full162/balance acceptance.');
