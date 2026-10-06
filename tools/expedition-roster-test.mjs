import assert from 'node:assert/strict';
import {EXPEDITION_SPECIES,expeditionStats} from '../src/expedition/species.js';
import {createRoster,recruitInstance,setParty,grantInstanceXP,awardExpeditionXP,damageInstance,markInstanceDead,healInstance,recordSurvival,evolveInstance,unlockTwin,recordStory,normalizeRoster,mergeRosters,instanceLevel,rosterMemorials,expeditionHealReceipt} from '../src/expedition/roster.js';
import {createRosterStore,rosterSaveKey} from '../src/expedition/save.js';
import {createExpeditionCombat,performExpeditionCombatAction,checkpointExpeditionCombat,restoreExpeditionCombat} from '../src/expedition/combat.js';
const clone=o=>JSON.parse(JSON.stringify(o));
const r8=()=>{const r=createRoster({owner:'alice'});for(let n=0;n<8;n++)assert(recruitInstance(r,{instanceId:`seed-${n}`,speciesId:n===7?'frost':'pierce'}));assert(setParty(r,Array.from({length:8},(_,n)=>`seed-${n}`)));return r;};
let groups=0;const check=(name,fn)=>{fn();groups++;console.log(`PASS ${name}`);};
check('Actual 162 catalog, eight distinct individuals and 5+3 slots',()=>{
 assert.equal(Object.keys(EXPEDITION_SPECIES).length,162);const r=r8();assert(normalizeRoster(r));
 assert.equal(recruitInstance(r,{instanceId:'seed-0',speciesId:'burst'}),false);assert.equal(setParty(r,Array(8).fill('seed-0')),false);
 assert.equal(setParty(r,Array(9).fill(null)),false);assert.equal(recruitInstance(r,{instanceId:'bad',speciesId:'pierce',maxHp:999}),false);
 const twin=Object.values(EXPEDITION_SPECIES).find(x=>x.kind==='twin');assert.equal(recruitInstance(r,{instanceId:'pair',speciesId:twin.id}),false);
 assert.equal(instanceLevel(19),1);assert.equal(instanceLevel(20),2);assert.equal(instanceLevel(900),10);assert.equal(instanceLevel(99999),10);
});
check('Earned encounter XP active100% reserve40%, exact replay and atomic changed-party replay',()=>{
 const r=r8();assert(awardExpeditionXP(r,{receiptId:'encounter1',activeIds:r.party.slice(0,5),reserveIds:r.party.slice(5),kind:'elite'}));
 assert.deepEqual(r.party.map(id=>r.instances[id].xp),[18,18,18,18,18,7,7,7]);
 const old=JSON.stringify(r);assert.equal(awardExpeditionXP(r,{receiptId:'encounter1',activeIds:['seed-7'],kind:'boss'}),false);assert.equal(JSON.stringify(r),old);
 assert(grantInstanceXP(r,'seed-0',142,'earned-more'));assert.equal(r.instances['seed-0'].level,5);assert.equal(r.instances['seed-0'].maxHp,expeditionStats('pierce',5).hp);
 assert.equal(grantInstanceXP(r,'seed-1',1,'earned-more'),false);assert(normalizeRoster(r));
});
check('Immediate permanent death empties only its slot, preserves discovery/story/other same species',()=>{
 const r=r8();recordStory(r,'first-boss');grantInstanceXP(r,'seed-0',160,'xp');recordSurvival(r,'seed-0',{expeditionId:'trip-1',boss:true});
 assert(damageInstance(r,'seed-0',r.instances['seed-0'].hp,{receiptId:'fatal',place:'초록 정원'}));
 assert.equal(r.party[0],null);assert.equal(r.party[5],'seed-5');assert.equal(r.instances['seed-1'].status,'alive');
 assert(r.discoveries.includes('pierce'));assert(r.story.includes('first-boss'));assert.equal(r.tombstones['seed-0'].level,5);assert.equal(r.tombstones['seed-0'].bossSurvivals,1);
 assert.equal(healInstance(r,'seed-0',100,'heal-dead'),false);assert.equal(grantInstanceXP(r,'seed-0',10,'dead-xp'),false);assert.equal(recruitInstance(r,{instanceId:'seed-0',speciesId:'pierce'}),false);
 const before=JSON.stringify(r);assert.equal(markInstanceDead(r,'seed-0',{receiptId:'second-death'}),false);assert.equal(JSON.stringify(r),before);assert(normalizeRoster(r));
});
check('Concurrent death dominates stale alive, level10 and healing branches without timestamp resurrection',()=>{
 const base=r8(),dead=clone(base),newer=clone(base);damageInstance(dead,'seed-0',1000,{receiptId:'dead-a',place:'보스'});grantInstanceXP(newer,'seed-0',900,'newer-xp');
 const a=mergeRosters(dead,newer),b=mergeRosters(newer,dead);assert(a.ok&&b.ok);assert.equal(a.roster.instances['seed-0'].status,'dead');assert.equal(b.roster.instances['seed-0'].status,'dead');assert.deepEqual(a.roster.tombstones,b.roster.tombstones);
 const replay=mergeRosters(a.roster,newer);assert(replay.ok);assert.equal(replay.roster.instances['seed-0'].hp,0);assert.equal(replay.roster.party[0],null);assert.equal(Object.keys(replay.roster.tombstones).length,1);
 const other=clone(base);damageInstance(other,'seed-0',1000,{receiptId:'dead-b',place:'다른 보스'});const m=mergeRosters(dead,other);assert(m.ok);assert.equal(Object.keys(m.roster.instances['seed-0'].events).length,2);assert.equal(m.roster.tombstones['seed-0'].receiptId,'dead-a');assert.deepEqual(rosterMemorials(m.roster).map(v=>v.receiptId),['dead-a','dead-b']);assert.equal(rosterMemorials(mergeRosters(m.roster,base).roster).length,2);
});
check('Two concurrent nonfatal receipts can become one deterministic permanent death',()=>{
 const a=r8(),b=clone(a);damageInstance(a,'seed-0',60,{receiptId:'hit-a'});damageInstance(b,'seed-0',60,{receiptId:'hit-b'});
 const m=mergeRosters(a,b);assert(m.ok);assert.equal(m.roster.instances['seed-0'].status,'dead');assert.equal(m.roster.tombstones['seed-0'].place,'동시 전투 기록');
 assert(mergeRosters(m.roster,a).ok);assert.equal(mergeRosters(m.roster,a).roster.instances['seed-0'].hp,0);
});
check('Immutable birth identity and conflicting receipt/evolution are never last-write-wins',()=>{
 const a=r8(),b=clone(a);b.instances['seed-0'].nickname='other';assert.equal(mergeRosters(a,b).reason,'immutable identity');
 const c=r8(),d=clone(c);grantInstanceXP(c,'seed-0',20,'same');grantInstanceXP(d,'seed-0',30,'same');assert.equal(mergeRosters(c,d).reason,'receipt conflict');
 const e=r8();grantInstanceXP(e,'seed-0',160,'xp');const f=clone(e);
 const solo=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='solo'&&s.parents.includes('pierce'));
 const fusion=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='fusion'&&s.parents.includes('pierce'));
 assert.equal(evolveInstance(e,'seed-0',solo.id,{receiptId:'no-auth',home:true}),false);
 assert(evolveInstance(e,'seed-0',solo.id,{receiptId:'solo',home:true,validateEvolution:()=>true}));assert(evolveInstance(f,'seed-0',fusion.id,{receiptId:'fusion',home:true,validateEvolution:()=>true}));
 assert.equal(mergeRosters(e,f).reason,'evolution conflict');assert(normalizeRoster(e));
});
check('Lv5 home evolution and Lv8 final ancestry gate, no free materials callback bypass',()=>{
 const r=r8(),fusion=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='fusion'&&s.parents.includes('pierce'));
 assert.equal(evolveInstance(r,'seed-0',fusion.id,{receiptId:'early',home:true,validateEvolution:()=>true}),false);grantInstanceXP(r,'seed-0',160,'lv5');
 assert.equal(evolveInstance(r,'seed-0',fusion.id,{receiptId:'out',home:false,validateEvolution:()=>true}),false);
 assert(evolveInstance(r,'seed-0',fusion.id,{receiptId:'evo',home:true,validateEvolution:()=>true}));const final=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='final'&&s.parents.includes(fusion.id));
 grantInstanceXP(r,'seed-0',340,'lv8');assert.equal(evolveInstance(r,'seed-0',final.id,{receiptId:'deny',home:true,validateEvolution:()=>false}),false);
 assert(evolveInstance(r,'seed-0',final.id,{receiptId:'final',home:true,validateEvolution:()=>true}));assert.equal(r.instances['seed-0'].instanceId,'seed-0');assert(normalizeRoster(r));
 const corrupt=clone(r);corrupt.instances['seed-0'].events.final.xpAtEvolution=20;assert.equal(normalizeRoster(corrupt),null);
});
check('Twin discovery uses two living solo instances and three real common expedition receipts, never merges bodies',()=>{
 const twin=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='twin'),r=createRoster({owner:'alice'});
 twin.parents.forEach((id,n)=>{assert(recruitInstance(r,{instanceId:`t${n}`,speciesId:id}));grantInstanceXP(r,`t${n}`,500,`xp${n}`);});
 assert.equal(unlockTwin(r,'t0','t1',twin.id),false);
 for(let n=0;n<3;n++)for(const id of ['t0','t1'])assert(recordSurvival(r,id,{expeditionId:`trip${n}`,boss:n===2}));
 assert(unlockTwin(r,'t0','t1',twin.id));assert.equal(Object.keys(r.instances).length,2);assert.equal(recordSurvival(r,'t0',{expeditionId:'trip0',boss:false}),false);
 damageInstance(r,'t0',1000,{receiptId:'fatal'});assert(r.recipes.includes(twin.id));assert.equal(r.instances.t1.status,'alive');assert(normalizeRoster(r));
});
check('Strict schema corruption, duplicate/prototype/twin/HP0-alive and owner/channel reject',()=>{
 const r=r8();for(const mutate of [v=>v.version=2,v=>v.party[1]='seed-0',v=>v.instances['seed-0'].instanceId='renamed',v=>v.instances['seed-0'].hp=0,v=>v.instances['seed-0'].xp=999,v=>v.instances['seed-0'].events.bad={kind:'unknown'},v=>v.story.push('__proto__')]){const v=clone(r);mutate(v);assert.equal(normalizeRoster(v),null);}
 assert.equal(normalizeRoster(r,{owner:'bob',channel:'account'}),null);assert.equal(normalizeRoster(r,{owner:'alice',channel:'review'}),null);assert.equal(normalizeRoster('{broken'),null);
 const proto=clone(r);Object.setPrototypeOf(proto.instances,{});assert.equal(normalizeRoster(proto),null);
 assert(normalizeRoster(JSON.stringify(r)));assert(damageInstance(r,'seed-0',2.4,{receiptId:'fraction'}));assert.equal(r.instances['seed-0'].hp,89.6);assert(healInstance(r,'seed-0',1.2,'fraction-heal'));assert.equal(r.instances['seed-0'].hp,90.8);assert(normalizeRoster(r));
});
function memory(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
check('Device-only scoped save durable readback, exact bytes CAS, party edits and stale-alive death preservation',()=>{
 const storage=memory(),store=createRosterStore({storage,currentOwner:()=> 'alice'}),r=r8();assert(store.load().ok);const first=store.save(r,{expectedRaw:null});assert(first.ok);assert.equal(store.save(r).reason,'expected bytes required');
 const edited=clone(first.roster);setParty(edited,[...edited.party].reverse());const second=store.save(edited,{expectedRaw:first.raw});assert(second.ok);assert.deepEqual(second.roster.party,edited.party);assert.equal(storage.getItem(rosterSaveKey('alice')+':backup'),first.raw);
 assert.equal(store.save(r,{expectedRaw:first.raw}).reason,'conflict');const dead=clone(second.roster);damageInstance(dead,'seed-0',1000,{receiptId:'die'});const third=store.save(dead,{expectedRaw:second.raw});assert(third.ok);
 const stale=store.save(second.roster,{expectedRaw:third.raw});assert(stale.ok);assert.equal(stale.roster.instances['seed-0'].status,'dead');assert.equal(stale.roster.party[7],null);assert(store.load().ok);
});
check('Malformed originals remain byte-identical, storage/readback failure never ACKs',()=>{
 const storage=memory(),key=rosterSaveKey('alice'),store=createRosterStore({storage,currentOwner:()=> 'alice'}),r=r8();storage.setItem(key,'{bad');assert.equal(store.load().reason,'malformed');assert.equal(store.save(r,{expectedRaw:'{bad'}).reason,'malformed');assert.equal(storage.getItem(key),'{bad');
 const silent=memory();silent.setItem=()=>{};assert.equal(createRosterStore({storage:silent,currentOwner:()=> 'alice'}).save(r,{expectedRaw:null}).reason,'readback');
 const denied={getItem:()=>null,setItem:()=>{throw Error('quota');}};assert.equal(createRosterStore({storage:denied,currentOwner:()=> 'alice'}).save(r,{expectedRaw:null}).reason,'storage write');
});
check('Owner change after GET/before commit/after write and backup races cannot ACK or overwrite observed conflict',()=>{
 for(const at of [1,2,3]){let owner='alice',n=0;const storage=memory(),r=r8();const get=storage.getItem;storage.getItem=k=>{const v=get(k);if(++n===at)owner='bob';return v;};const store=createRosterStore({storage,currentOwner:()=>owner});const out=store.save(r,{expectedRaw:null});assert.equal(out.ok,false);if(at<=2)assert.equal(storage.map.has(rosterSaveKey('alice')),false);}
 const storage=memory(),r=r8(),store=createRosterStore({storage,currentOwner:()=> 'alice'}),first=store.save(r,{expectedRaw:null});assert(first.ok);
 const set=storage.setItem;storage.setItem=(k,v)=>{set(k,v);if(k.endsWith(':backup'))set(rosterSaveKey('alice'),'concurrent-other-bytes');};const out=store.save(r,{expectedRaw:first.raw});assert.equal(out.ok,false);assert.equal(storage.getItem(rosterSaveKey('alice')),'concurrent-other-bytes');
});
check('Guest/review keys and markers cannot be promoted to account even with same displayed owner',()=>{
 const storage=memory();for(const channel of ['guest','review']){const r=createRoster({owner:'alice',channel});recruitInstance(r,{instanceId:`${channel}-seed`,speciesId:'burst'});const store=createRosterStore({storage,currentOwner:()=> 'alice',channel});assert(store.save(r,{expectedRaw:null}).ok);assert.equal(createRosterStore({storage,currentOwner:()=> 'alice'}).save(r,{expectedRaw:null}).reason,'invalid');}
 assert.equal(storage.getItem(rosterSaveKey('alice')),null);assert.notEqual(rosterSaveKey('alice','guest'),rosterSaveKey('alice','review'));
});
check('Actual P2 accepted damage result -> same instance tombstone; restored result replay has no second death',()=>{
 const r=r8(),s=createExpeditionCombat({battleId:'actual-fatal',allies:r.party.map((id,slot)=>({...r.instances[id],slot,...expeditionStats(r.instances[id].speciesId,1)})),enemies:[{id:'enemy',speciesId:'pierce',slot:0,hp:92,maxHp:92,power:200,defense:4,speed:100}],getSpecies:id=>EXPEDITION_SPECIES[id]});
 const command={id:'action-1',unitId:'enemy',kind:'attack',targetId:'seed-0'},out=performExpeditionCombatAction(s,command);assert(out.ok);assert(out.events.some(e=>e.type==='permadeath'&&e.instanceId==='seed-0'));
 for(const e of out.events.filter(e=>e.type==='damage'&&r.instances[e.targetId]))assert(damageInstance(r,e.targetId,e.amount,{receiptId:`actual-fatal:${e.seq}`,place:'풀밭'}));
 assert.equal(r.instances['seed-0'].status,'dead');assert.equal(r.party[0],null);assert.equal(r.instances['seed-5'].status,'alive');assert(normalizeRoster(r));
 const resumed=restoreExpeditionCombat(checkpointExpeditionCombat(s));const replay=performExpeditionCombatAction(resumed,command);assert.equal(replay.reason,'replay');const before=JSON.stringify(r);
 for(const e of out.events.filter(e=>e.type==='damage'&&r.instances[e.targetId]))assert.equal(damageInstance(r,e.targetId,e.amount,{receiptId:`actual-fatal:${e.seq}`,place:'풀밭'}),false);
 assert.equal(JSON.stringify(r),before);
});

check('Max128 immutable/run/award IDs create bounded unambiguous full-ID receipts with atomic replay protection',()=>{
 const a='a'.repeat(128),b='b'.repeat(128),trip='t'.repeat(128),award='x'.repeat(128),r=createRoster({owner:'boundary'});assert(recruitInstance(r,{instanceId:a,speciesId:'burst'}));assert(recruitInstance(r,{instanceId:b,speciesId:'frost'}));assert(setParty(r,[a,null,null,null,null,b,null,null]));
 assert(awardExpeditionXP(r,{receiptId:award,activeIds:[a],reserveIds:[b],kind:'elite'}));assert.equal(r.instances[a].xp,18);assert.equal(r.instances[b].xp,7);const before=JSON.stringify(r);assert(!awardExpeditionXP(r,{receiptId:award,activeIds:[b],kind:'boss'}));assert.equal(JSON.stringify(r),before);
 assert(recordSurvival(r,a,{expeditionId:trip,boss:true}));assert(recordSurvival(r,b,{expeditionId:trip,boss:true}));assert(!recordSurvival(r,a,{expeditionId:trip,boss:false}));assert(normalizeRoster(r));
 for(const id of [a,b])for(const [receipt,e]of Object.entries(r.instances[id].events)){assert(receipt.length<=274);assert(receipt.endsWith(id));if(e.kind==='survival')assert(receipt.includes(trip));else assert(receipt.includes(award));}
 const restored=normalizeRoster(JSON.stringify(r));assert.deepEqual(restored,r);assert(!awardExpeditionXP(restored,{receiptId:award,activeIds:[a],kind:'normal'}));assert(damageInstance(restored,b,restored.instances[b].hp,{receiptId:'fatal128',place:'boundary'}));assert.equal(rosterMemorials(restored)[0].instanceId,b);assert(normalizeRoster(restored));
});
check('Delimiter-bearing immutable IDs remain collision-free and malformed oversized receipts fail closed',()=>{
 const r=createRoster({owner:'boundary'});for(const id of ['b:xp:c','c'])assert(recruitInstance(r,{instanceId:id,speciesId:'burst'}));assert(awardExpeditionXP(r,{receiptId:'a',activeIds:['b:xp:c']}));assert(awardExpeditionXP(r,{receiptId:'a:xp:b',activeIds:['c']}));assert.equal(r.instances.c.xp,10);assert(normalizeRoster(r));
 const before=JSON.stringify(r);assert(!grantInstanceXP(r,'c',1,'x'.repeat(129)));assert.equal(JSON.stringify(r),before);assert(!grantInstanceXP(r,'c',1,'xp:128:'+ 'x'.repeat(128)+':128:'+ 'y'.repeat(128)));assert.equal(JSON.stringify(r),before);const corrupt=clone(r);corrupt.instances.c.events['xp:128:'+ 'x'.repeat(128)+':128:'+ 'y'.repeat(128)]={kind:'xp',amount:1};assert.equal(normalizeRoster(corrupt),null);
});
check('Imported legacy XP/survival receipt bytes remain unchanged and replay cannot cross encoding formats',()=>{
 const r=createRoster({owner:'legacy'});assert(recruitInstance(r,{instanceId:'seed',speciesId:'burst'}));assert(grantInstanceXP(r,'seed',10,'old:xp:seed'));assert(grantInstanceXP(r,'seed',1,'xp:1:a:1:b'));assert(recordSurvival(r,'seed',{expeditionId:'old-trip',boss:true}));const current=Object.keys(r.instances.seed.events).find(k=>r.instances.seed.events[k].kind==='survival');r.instances.seed.events['survival:old-trip:seed']=r.instances.seed.events[current];delete r.instances.seed.events[current];const restored=normalizeRoster(JSON.stringify(r));assert(restored);assert.deepEqual(restored,r);const before=JSON.stringify(restored);assert(!awardExpeditionXP(restored,{receiptId:'old',activeIds:['seed']}));assert(!recordSurvival(restored,'seed',{expeditionId:'old-trip',boss:true}));assert.equal(JSON.stringify(restored),before);
});

check('Max128 rest/camp healing uses exact bounded identities and survives reload replay without HP grants',()=>{
 const id='i'.repeat(128),run='r'.repeat(128),r=createRoster({owner:'long-heal'});assert(recruitInstance(r,{instanceId:id,speciesId:'burst'}));assert(damageInstance(r,id,30,{receiptId:'hurt'}));const rest=expeditionHealReceipt(run,id,'rest'),camp=expeditionHealReceipt(run,id,'camp');assert.equal(rest.length,275);assert.equal(camp.length,275);assert.notEqual(rest,camp);assert(rest.endsWith(id)&&rest.includes(run));assert(healInstance(r,id,10,rest));const resumed=normalizeRoster(JSON.stringify(r));assert(resumed);assert.deepEqual(resumed,r);const before=JSON.stringify(resumed);assert(!healInstance(resumed,id,10,rest));assert.equal(JSON.stringify(resumed),before);assert(healInstance(resumed,id,5,camp));assert.equal(resumed.instances[id].hp,resumed.instances[id].maxHp-15);assert(normalizeRoster(resumed));
 for(const args of [[run+'r',id,'rest'],[run,id+'i','camp'],[run,id,'future'],['bad/route',id,'rest']])assert.throws(()=>expeditionHealReceipt(...args));const invalid=JSON.stringify(resumed);assert(!healInstance(resumed,id,3,rest.replace('heal:rest:128:','heal:rest:127:')));assert(!healInstance(resumed,id,3,expeditionHealReceipt(run,'j'.repeat(128),'rest')));assert.equal(JSON.stringify(resumed),invalid);
});
check('Legacy rest/camp heal bytes preserved with bidirectional encoded replay and delimiter collision isolation',()=>{
 for(const phase of ['rest','camp']){const old=createRoster({owner:'legacy-heal'});assert(recruitInstance(old,{instanceId:'seed',speciesId:'burst'}));assert(damageInstance(old,'seed',30,{receiptId:'hurt'}));assert(healInstance(old,'seed',5,`run:${phase}:seed`));const restored=normalizeRoster(JSON.stringify(old));assert.deepEqual(restored,old);const before=JSON.stringify(restored);assert(!healInstance(restored,'seed',5,expeditionHealReceipt('run','seed',phase)));assert.equal(JSON.stringify(restored),before);
 const fresh=createRoster({owner:'new-heal'});assert(recruitInstance(fresh,{instanceId:'seed',speciesId:'burst'}));assert(damageInstance(fresh,'seed',30,{receiptId:'hurt'}));assert(healInstance(fresh,'seed',5,expeditionHealReceipt('run','seed',phase)));const bytes=JSON.stringify(fresh);assert(!healInstance(fresh,'seed',5,`run:${phase}:seed`));assert.equal(JSON.stringify(fresh),bytes);assert(normalizeRoster(fresh));}
 const r=createRoster({owner:'colon-heal'});for(const id of ['b:rest:c','c']){assert(recruitInstance(r,{instanceId:id,speciesId:'burst'}));assert(damageInstance(r,id,20,{receiptId:'hurt-'+id}));}const a=expeditionHealReceipt('a','b:rest:c','rest'),b=expeditionHealReceipt('a:rest:b','c','rest');assert.notEqual(a,b);assert(healInstance(r,'b:rest:c',5,a));assert(healInstance(r,'c',5,b));assert(normalizeRoster(r));
});
console.log(`Expedition roster/save: ${groups} groups PASS. Node rules and fake device storage only; no battle, real account cloud, browser or physical-device claim.`);
