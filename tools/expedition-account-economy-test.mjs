import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {auditExpeditionHomeTransaction,projectExpeditionHomeTransaction} from '../src/expedition/account-economy.js';
import {createFreshExpeditionAccount,decodeExpeditionAccount,expeditionAccountParent} from '../src/expedition/account-codec.js';
import {recruitInstance,setParty,grantInstanceXP,evolveInstance,damageInstance,recordStory} from '../src/expedition/roster.js';
import {EXPEDITION_SPECIES,getExpeditionSpecies,LAW_DNA} from '../src/expedition/species.js';
import {canResowExpedition,nurseryGrowthCandidates,NURSERY_GROWTH_XP} from '../src/expedition/nursery.js';
import {newExpeditionRoute,advanceExpeditionRoute} from '../src/expedition/world.js';

// Synthetic account fixtures only. Expected state runs actual controller HOME
// branch source in a VM, with real P1 helpers. No review record is promoted.
const clone=x=>structuredClone(x),owner='home-audit',now=1700000000000,writer={deviceId:'pc',leaseId:'finite',issuedAt:now,expiresAt:now+60000};let seq=0,groups=0,actualBlocks=0;
const source=readFileSync(new URL('../src/expedition/controller.js',import.meta.url),'utf8');
function block(start,end){const at=source.indexOf(start),until=source.indexOf(end,at+start.length);assert(at>=0&&until>at,'actual controller branch anchor');return source.slice(at+start.length,until);}
const bodies={evolve:block("}else if(intent.type==='evolve'){","}else if(intent.type==='twin'){"),birth:block("}else if(intent.type==='hatch'||intent.type==='resow'){","}else if(intent.type==='grow'){"),grow:block("}else if(intent.type==='grow'){","}else throw Error('알 수 없는 원정대 명령');")};
function actualState(previous,tx){
 const s=clone(previous.state),intent={type:tx.kind,instanceId:tx.instanceId,eggId:tx.eggId,to:tx.to};
 const ids=tx.kind==='resow'?[tx.receiptId.slice(6),tx.instanceId.slice(5)]:tx.kind==='hatch'?[tx.instanceId.slice(5)]:[tx.receiptId.slice(7)];
 const context={s,intent,message:'',idFactory:()=>{assert(ids.length);return ids.shift();},getExpeditionSpecies,LAW_DNA,recruitInstance,setParty,grantInstanceXP,evolveInstance,canResowExpedition,nurseryGrowthCandidates,NURSERY_GROWTH_XP};
 vm.runInNewContext(bodies[tx.kind==='hatch'||tx.kind==='resow'?'birth':tx.kind],context);assert.equal(ids.length,0);actualBlocks++;return JSON.parse(JSON.stringify(s));
}
const fresh=()=>createFreshExpeditionAccount({owner,now,writer,idFactory:()=>String(++seq)});
async function pack(a,state){const b={...clone(a),state,revision:a.revision+1,writeId:`write-${a.revision+1}-${++seq}`,updatedAt:a.updatedAt+1,parent:await expeditionAccountParent(a,{owner})};assert(decodeExpeditionAccount(b,{owner}));return b;}
async function basis(mutate=()=>{}){const a=fresh(),s=clone(a.state);mutate(s);return pack(a,s);}
const tx=(kind,data)=>({version:1,kind,receiptId:`${kind==='grow'?'growth':kind}:${++seq}`,...data});
async function run(a,t){const b=await pack(a,actualState(a,t)),result=await auditExpeditionHomeTransaction(a,b,{owner,transaction:t});assert(result.ok,result.reason);assert.deepEqual(result.record,b);return b;}
async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
function egg(s,name='egg-trip',gardenId='meadow') {const law={meadow:'pierce',snow:'frost'}[gardenId],eggId=`${name}:find:choice`;s.meta.eggs.push({eggId,speciesId:law,sourceRun:name,gardenId});s.meta.rewardIds.push(eggId);return eggId;}
await check('Actual HOME hatch consumes one confirmed egg, creates one newLv1 body and costs no currency',async()=>{
 const a=await basis(s=>egg(s)),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),raw=JSON.stringify(a),b=await run(a,t);
 assert.equal(b.state.meta.eggs.length,0);assert.equal(Object.keys(b.state.roster.instances).length,10);assert.equal(b.state.roster.instances[t.instanceId].level,1);assert.equal(b.state.roster.instances[t.instanceId].xp,0);assert.deepEqual(b.state.meta.cores,a.state.meta.cores);assert.equal(b.state.meta.rewardIds.filter(id=>id===t.receiptId).length,1);assert.equal(JSON.stringify(a),raw);
 assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:t}).ok,false);assert.equal((await auditExpeditionHomeTransaction(b,await pack(b,b.state),{owner,transaction:t})).ok,false);
});
await check('Actual hatch fills one empty front slot and preserves old permanent death/history/reserves',async()=>{
 const a=await basis(s=>{egg(s);recordStory(s.roster,'memory-kept');for(const id of s.roster.party.slice(0,5))assert(damageInstance(s.roster,id,1000,{receiptId:`fatal:${id}`,place:'declared boundary'}));}),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),b=await run(a,t);
 assert.equal(b.state.roster.party[0],t.instanceId);assert.deepEqual(b.state.roster.party.slice(1),a.state.roster.party.slice(1));assert.deepEqual(b.state.roster.tombstones,a.state.roster.tombstones);assert.deepEqual(b.state.roster.story,a.state.roster.story);
});
await check('Unconfirmed/wrong egg, wrong hatch receipt, reused/tombstoned birth identity consume nothing',async()=>{
 const a=await basis(s=>egg(s)),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`});
 for(const bad of [{...t,eggId:'pending-only'},{...t,receiptId:'hatch:wrong'},{...t,instanceId:a.state.roster.party[0]},{...t,instanceId:'seed-foreign'}]){const before=JSON.stringify(a);assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:bad}).ok,false);assert.equal(JSON.stringify(a),before);}
});
await check('Two hatch operations/additional payment or unrelated party edit cannot be attached to a single valid receipt',async()=>{
 const a=await basis(s=>{egg(s);egg(s,'second-trip','snow');}),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),s=actualState(a,t),second=a.state.meta.eggs[1],t2=tx('hatch',{receiptId:`hatch:${second.eggId}`,eggId:second.eggId,instanceId:`born-${++seq}`});
 const double=actualState({...a,state:s},t2);assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,double),{owner,transaction:t})).reason,'transaction result mismatch');
 const fee=clone(s);fee.meta.cores.chain++;assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,fee),{owner,transaction:t})).ok,false);
 const edit=clone(s);assert(setParty(edit.roster,[...edit.roster.party].reverse()));assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,edit),{owner,transaction:t})).ok,false);
});
await check('Actual nursery growth gives only target10XP and chain1, consumes exactly one earned charge',async()=>{
 const a=await basis(s=>{s.meta.growthCharges=2;}),id=Object.values(a.state.roster.instances).find(i=>!a.state.roster.party.includes(i.instanceId)).instanceId,t=tx('grow',{instanceId:id}),b=await run(a,t);
 assert.equal(b.state.roster.instances[id].xp,10);assert.equal(b.state.meta.cores.chain,1);assert.equal(b.state.meta.growthCharges,1);assert.equal(b.state.meta.growthReceipts.length,1);
 for(const i of Object.values(a.state.roster.instances).filter(i=>i.instanceId!==id))assert.deepEqual(b.state.roster.instances[i.instanceId],i);
 assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:t}).reason,'receipt already used');
});
await check('Growth rejects active and reserve slots/dead/maxLv/zero charge/foreign body; no free XP rollback leak',async()=>{
 const a=await basis(s=>s.meta.growthCharges=1),spare=Object.values(a.state.roster.instances).find(i=>!a.state.roster.party.includes(i.instanceId)).instanceId;
 for(const id of [a.state.roster.party[0],a.state.roster.party[6],'not-found'])assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:tx('grow',{instanceId:id})}).ok,false);
 for(const mutate of [s=>s.meta.growthCharges=0,s=>assert(damageInstance(s.roster,spare,1000,{receiptId:'dead-nursery'})),s=>assert(grantInstanceXP(s.roster,spare,900,'maxlevel'))]){const b=clone(a);mutate(b.state);const raw=JSON.stringify(b);assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:tx('grow',{instanceId:spare})}).ok,false);assert.equal(JSON.stringify(b),raw);}
});
await check('All-dead declared fixture resow creates only one NEW pierceLv1 and preserves XP/evolution/tombstones',async()=>{
 const a=await basis(s=>{const id=s.roster.party[2],solo=Object.values(EXPEDITION_SPECIES).find(x=>x.kind==='solo'&&x.parents.includes('pierce'));assert(grantInstanceXP(s.roster,id,160,'grown-before-death'));assert(evolveInstance(s.roster,id,solo.id,{receiptId:'old-evo',home:true,validateEvolution:()=>true}));for(const i of Object.values(s.roster.instances))assert(damageInstance(s.roster,i.instanceId,1000,{receiptId:`fatal:${i.instanceId}`}));}),t=tx('resow',{instanceId:`born-${++seq}`}),b=await run(a,t);
 assert.equal(Object.values(b.state.roster.instances).filter(i=>i.status==='alive').length,1);assert.equal(b.state.roster.instances[t.instanceId].speciesId,'pierce');assert.equal(b.state.roster.instances[t.instanceId].level,1);assert.equal(b.state.roster.party[0],t.instanceId);
 for(const [id,i]of Object.entries(a.state.roster.instances))assert.deepEqual(b.state.roster.instances[id],i);assert.deepEqual(b.state.roster.tombstones,a.state.roster.tombstones);assert.deepEqual(b.state.meta.cores,a.state.meta.cores);
 assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:t}).ok,false);
});
await check('Resow rejects any living body or unhatched egg and wrong species candidate',async()=>{
 const live=await basis(),t=tx('resow',{instanceId:`born-${++seq}`});assert.equal(projectExpeditionHomeTransaction(live,{owner,transaction:t}).ok,false);
 const a=await basis(s=>{for(const i of Object.values(s.roster.instances))assert(damageInstance(s.roster,i.instanceId,1000,{receiptId:`fatal:${i.instanceId}`}));egg(s);});assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:t}).ok,false);
 const noEgg=clone(a);noEgg.state.meta.eggs=[];const s=clone(noEgg.state);assert(recruitInstance(s.roster,{instanceId:t.instanceId,speciesId:'burst'}));s.meta.resowIds.push(t.receiptId);assert(setParty(s.roster,[t.instanceId,null,null,null,null,null,null,null]));assert.equal((await auditExpeditionHomeTransaction(noEgg,await pack(noEgg,s),{owner,transaction:t})).ok,false);
});
await check('All nine original SOLO and36 FUSION evolutions use actual parent/Lv5 and exactly one canonical core',async()=>{
 const forms=Object.values(EXPEDITION_SPECIES).filter(s=>['solo','fusion'].includes(s.kind));assert.equal(forms.length,45);
 for(const to of forms){let body;const a=await basis(s=>{body=Object.values(s.roster.instances).find(i=>i.speciesId===to.parents[0]).instanceId;assert(grantInstanceXP(s.roster,body,160,'level5'));const from=getExpeditionSpecies(s.roster.instances[body].speciesId),law=to.kind==='solo'?from.laws[0]:to.laws.find(l=>l!==from.laws[0]);s.meta.cores[law]=3;}),t=tx('evolve',{instanceId:body,to:to.id}),b=await run(a,t);assert.equal(b.state.roster.instances[body].speciesId,to.id);assert.equal(b.state.roster.instances[body].instanceId,body);assert.equal(Object.values(a.state.meta.cores).reduce((n,v)=>n+v,0)-Object.values(b.state.meta.cores).reduce((n,v)=>n+v,0),1);assert.equal(b.state.meta.awakenMaterials,a.state.meta.awakenMaterials);}
});
await check('All72 original FINAL evolutions require fusionLv8 + own risk and cost2 core +1 material',async()=>{
 const forms=Object.values(EXPEDITION_SPECIES).filter(s=>s.kind==='final');assert.equal(forms.length,72);
 for(const to of forms){let body;const from=getExpeditionSpecies(to.parents[0]),a=await basis(s=>{body=Object.values(s.roster.instances).find(i=>i.speciesId===from.parents[0]).instanceId;assert(grantInstanceXP(s.roster,body,500,'level8'));assert(evolveInstance(s.roster,body,from.id,{receiptId:'base-fusion',home:true,validateEvolution:()=>true}));s.meta.cores[to.dominantLaw]=3;s.meta.awakenMaterials=2;s.meta.highRisk.push(`${body}:${to.dominantLaw}`);}),t=tx('evolve',{instanceId:body,to:to.id}),b=await run(a,t);assert.equal(b.state.meta.cores[to.dominantLaw],1);assert.equal(b.state.meta.awakenMaterials,1);assert.equal(b.state.roster.instances[body].speciesId,to.id);assert.deepEqual(b.state.meta.highRisk,a.state.meta.highRisk);}
});
await check('Evolution invalid canonical parent/lowLv/missing material/foreign-body risk/dead consumes nothing',async()=>{
 const fusion=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='fusion'&&s.parents.includes('pierce')),final=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='final'&&s.parents.includes(fusion.id));let body;
 const a=await basis(s=>{body=Object.values(s.roster.instances).find(i=>i.speciesId==='pierce').instanceId;assert(grantInstanceXP(s.roster,body,500,'level8'));assert(evolveInstance(s.roster,body,fusion.id,{receiptId:'fusion',home:true,validateEvolution:()=>true}));s.meta.cores[final.dominantLaw]=2;s.meta.awakenMaterials=1;s.meta.highRisk=[`${body}:${final.dominantLaw}`];});
 for(const mutate of [s=>s.meta.awakenMaterials=0,s=>s.meta.cores[final.dominantLaw]=1,s=>s.meta.highRisk=[`${s.roster.party[0]}:${final.dominantLaw}`],s=>assert(damageInstance(s.roster,body,1000,{receiptId:'dead-evolver'}))]){const b=clone(a);mutate(b.state);const before=JSON.stringify(b);assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:tx('evolve',{instanceId:body,to:final.id})}).ok,false);assert.equal(JSON.stringify(b),before);}
 const early=await basis(s=>s.meta.cores[fusion.laws.find(l=>l!=='pierce')]=1),id=Object.values(early.state.roster.instances).find(i=>i.speciesId==='pierce').instanceId;assert.equal(projectExpeditionHomeTransaction(early,{owner,transaction:tx('evolve',{instanceId:id,to:fusion.id})}).ok,false);
});
await check('Missing/extra/accessor/unsafe transaction evidence is rejected without invoking getters',async()=>{
 const a=await basis(s=>s.meta.growthCharges=1),id=Object.values(a.state.roster.instances).find(i=>!a.state.roster.party.includes(i.instanceId)).instanceId,t=tx('grow',{instanceId:id}),b=await pack(a,actualState(a,t));
 for(const bad of [undefined,{...t,version:2},{...t,kind:'return'},{...t,fee:0},{...t,receiptId:'arbitrary'},{...t,instanceId:'constructor'}])assert.equal((await auditExpeditionHomeTransaction(a,b,{owner,transaction:bad})).ok,false);
 const getter={...t};let called=false;Object.defineProperty(getter,'receiptId',{enumerable:true,get(){called=true;return t.receiptId;}});assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:getter}).ok,false);assert.equal(called,false);
});
await check('Stale/missing/foreign parent and review/guest account never authorize a HOME transaction',async()=>{
 const a=await basis(s=>egg(s)),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),b=await pack(a,actualState(a,t));
 for(const mutate of [x=>x.parent.checkpointHash='f'.repeat(64),x=>x.parent=null,x=>x.ownerUid='other',x=>x.channel='review',x=>x.state.roster.channel='guest',x=>x.parent.revision++]){const bad=clone(b);mutate(bad);assert.equal((await auditExpeditionHomeTransaction(a,bad,{owner,transaction:t})).ok,false);}
 const newer=await pack(a,a.state);assert.equal((await auditExpeditionHomeTransaction(newer,b,{owner,transaction:t})).ok,false);
});
await check('Receipt globally reused on another body or nursery namespace rejects; altered target/result/XP rejects',async()=>{
 const a=await basis(s=>{s.meta.growthCharges=2;assert(grantInstanceXP(s.roster,s.roster.party[0],1,'growth:used'));}),spare=Object.values(a.state.roster.instances).find(i=>!a.state.roster.party.includes(i.instanceId)).instanceId;
 assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:{version:1,kind:'grow',instanceId:spare,receiptId:'growth:used'}}).reason,'receipt already used');
 const t=tx('grow',{instanceId:spare}),s=actualState(a,t);const wrong=clone(s);assert(grantInstanceXP(wrong.roster,wrong.roster.party[0],1,'extra-free-xp'));assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,wrong),{owner,transaction:t})).ok,false);
 assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,s),{owner,transaction:{...t,instanceId:a.state.roster.party[0]}})).ok,false);
});
await check('Instance/reward/growth/core capacity failures preserve input account exactly',async()=>{
 const a=await basis(s=>{egg(s);for(let n=0;n<247;n++)assert(recruitInstance(s.roster,{instanceId:`capacity-${n}`,speciesId:'pierce'}));}),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),before=JSON.stringify(a);assert.equal(projectExpeditionHomeTransaction(a,{owner,transaction:t}).ok,false);assert.equal(JSON.stringify(a),before);
 const full=await basis(s=>{s.meta.growthCharges=1;s.meta.cores.chain=10000;}),spare=Object.values(full.state.roster.instances).find(i=>!full.state.roster.party.includes(i.instanceId)).instanceId,raw=JSON.stringify(full);assert.equal(projectExpeditionHomeTransaction(full,{owner,transaction:tx('grow',{instanceId:spare})}).ok,false);assert.equal(JSON.stringify(full),raw);
 const rewards=await basis(s=>{egg(s);for(let n=0;n<1999;n++)s.meta.rewardIds.push(`other-reward:${n}`);}),rewardsBefore=JSON.stringify(rewards),e2=rewards.state.meta.eggs[0];assert.equal(projectExpeditionHomeTransaction(rewards,{owner,transaction:tx('hatch',{receiptId:`hatch:${e2.eggId}`,eggId:e2.eggId,instanceId:`born-${++seq}`})}).ok,false);assert.equal(JSON.stringify(rewards),rewardsBefore);
 const charges=await basis(s=>{s.meta.growthCharges=1;for(let n=0;n<1000;n++)s.meta.growthReceipts.push(`growth:previous-${n}`);}),chargeBefore=JSON.stringify(charges),spare2=Object.values(charges.state.roster.instances).find(i=>!charges.state.roster.party.includes(i.instanceId)).instanceId;assert.equal(projectExpeditionHomeTransaction(charges,{owner,transaction:tx('grow',{instanceId:spare2})}).ok,false);assert.equal(JSON.stringify(charges),chargeBefore);
});
await check('HOME-only, one exact state and pure repeated audit never applies an extra grant',async()=>{
 const a=await basis(s=>s.meta.growthCharges=2),spare=Object.values(a.state.roster.instances).find(i=>!a.state.roster.party.includes(i.instanceId)).instanceId,t=tx('grow',{instanceId:spare}),b=await pack(a,actualState(a,t)),rawA=JSON.stringify(a),rawB=JSON.stringify(b);
 const first=await auditExpeditionHomeTransaction(a,b,{owner,transaction:t}),again=await auditExpeditionHomeTransaction(a,b,{owner,transaction:t});assert(first.ok&&again.ok);assert.deepEqual(first.receipt,again.receipt);assert.equal(JSON.stringify(a),rawA);assert.equal(JSON.stringify(b),rawB);assert.equal(projectExpeditionHomeTransaction(b,{owner,transaction:t}).ok,false);
 const exploring=clone(a);exploring.state.screen='explore';exploring.state.route={...newExpeditionRoute({runId:'active-route',gardenId:'meadow',partyIds:exploring.state.roster.party}),pendingFinds:[]};advanceExpeditionRoute(exploring.state.route);assert(decodeExpeditionAccount(exploring,{owner}));assert.equal(projectExpeditionHomeTransaction(exploring,{owner,transaction:t}).reason,'HOME required');
});
await check('Full128 body/risk identity evolves own canonical FINAL; another parent and unrelated balance max reject',async()=>{
 const fusion=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='fusion'&&s.parents.includes('pierce')),final=Object.values(EXPEDITION_SPECIES).find(s=>s.kind==='final'&&s.parents.includes(fusion.id)),id='i'.repeat(128);
 const a=await basis(s=>{const old=Object.values(s.roster.instances).find(i=>i.speciesId==='pierce').instanceId,i=s.roster.instances[old];delete s.roster.instances[old];i.instanceId=id;s.roster.instances[id]=i;s.roster.party=s.roster.party.map(v=>v===old?id:v);assert(grantInstanceXP(s.roster,id,500,'full-id-xp'));assert(evolveInstance(s.roster,id,fusion.id,{receiptId:'full-id-fusion',home:true,validateEvolution:()=>true}));s.meta.cores[final.dominantLaw]=2;s.meta.awakenMaterials=1;s.meta.highRisk=[`${id}:${final.dominantLaw}`];}),t=tx('evolve',{instanceId:id,to:final.id}),b=await run(a,t);assert.equal(b.state.roster.instances[id].speciesId,final.id);
 const wrong=await basis(s=>{const body=Object.values(s.roster.instances).find(i=>i.speciesId==='frost');assert(grantInstanceXP(s.roster,body.instanceId,160,'wrong-parent-xp'));for(const law of Object.keys(s.meta.cores))s.meta.cores[law]=10;}),wrongID=Object.values(wrong.state.roster.instances).find(i=>i.speciesId==='frost').instanceId;assert.equal(projectExpeditionHomeTransaction(wrong,{owner,transaction:tx('evolve',{instanceId:wrongID,to:fusion.id})}).ok,false);
 const altered=clone(b);altered.state.meta.cores.chain=Math.max(a.state.meta.cores.chain,9);assert.equal((await auditExpeditionHomeTransaction(a,altered,{owner,transaction:t})).reason,'transaction result mismatch');
});
await check('A valid hatch cannot erase a permanent death or attach another return settlement/history',async()=>{
 let living,body;const a=await basis(s=>{body=s.roster.party[0];living=clone(s.roster.instances[body]);assert(damageInstance(s.roster,body,1000,{receiptId:'permanent-death',place:'declared fixture'}));recordStory(s.roster,'memory-kept');egg(s);}),e=a.state.meta.eggs[0],t=tx('hatch',{receiptId:`hatch:${e.eggId}`,eggId:e.eggId,instanceId:`born-${++seq}`}),s=actualState(a,t),original=JSON.stringify(a);
 const undead=clone(s);undead.roster.instances[body]=living;delete undead.roster.tombstones[body];assert(decodeExpeditionAccount(await pack(a,undead),{owner}));assert.equal((await auditExpeditionHomeTransaction(a,await pack(a,undead),{owner,transaction:t})).reason,'transaction result mismatch');
 for(const mutate of [v=>{v.meta.returnCount++;v.meta.committedRuns.push('unearned-return');},v=>v.roster.story=[],v=>v.meta.growthCharges++,v=>v.meta.restoration.meadow++]){const altered=clone(s);mutate(altered);const b=await pack(a,altered);assert.equal((await auditExpeditionHomeTransaction(a,b,{owner,transaction:t})).reason,'transaction result mismatch');}
 assert.equal(JSON.stringify(a),original);
});
for(const file of ['src/expedition/account-economy.js','src/expedition/account-codec.js','src/expedition/controller.js'])console.log(`SOURCE ${file} SHA256 ${createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex')}`);
console.log(`Account HOME economy: ${groups} groups PASS; ${actualBlocks} real controller HOME branches via Node VM (synthetic account fixtures). No live/account transport/return settlement/server anti-cheat claim.`);
