import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createFreshExpeditionAccount,decodeExpeditionAccount,encodeExpeditionAccount,expeditionAccountParent,validateExpeditionAccountTransition,nextExpeditionAccount,EXPEDITION_ACCOUNT_MAX_BYTES} from '../src/expedition/account-codec.js';
import {grantInstanceXP,damageInstance,healInstance,expeditionHealReceipt,recruitInstance,normalizeRoster} from '../src/expedition/roster.js';
import {EXPEDITION_SPECIES,expeditionStats} from '../src/expedition/species.js';
import {newExpeditionRoute,advanceExpeditionRoute,expeditionEncounter,expeditionEnemyProfile,EXPEDITION_RUN_STEPS} from '../src/expedition/world.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction} from '../src/expedition/combat.js';
const clone=x=>structuredClone(x),owner='codec-qa',now=1700000000000;let serial=0,groups=0,combatActions=0;
const idFactory=()=>String(++serial),writer={deviceId:'device-pc',leaseId:'lease-a',issuedAt:now-1,expiresAt:now+60000};
const fresh=()=>createFreshExpeditionAccount({owner,now,writer,idFactory});
async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
async function candidate(a,mutate=()=>{}){const b=clone(a);b.revision++;b.writeId=`write-${b.revision}-${idFactory()}`;b.updatedAt++;b.parent=await expeditionAccountParent(a,{owner});mutate(b);return b;}
const advance=(a,state=a.state)=>nextExpeditionAccount(a,{owner,state,now:a.updatedAt+1,writer,idFactory});
await check('Fresh factory creates nine independent Lv1 bodies, eight slots and isolated channel with no imported data',()=>{
 const a=fresh(),b=fresh();assert(decodeExpeditionAccount(a,{owner}));assert.equal(a.state.roster.channel,'account');assert.equal(Object.keys(a.state.roster.instances).length,9);assert.equal(a.state.roster.party.length,8);
 assert.notEqual(a.campaignId,b.campaignId);assert.notEqual(a.writeId,b.writeId);assert(!Object.keys(a.state.roster.instances).some(id=>Object.hasOwn(b.state.roster.instances,id)));assert.equal(a.parent,null);assert.equal(a.revision,0);
 for(const key of ['state','roster','session','raw','review'])assert.throws(()=>createFreshExpeditionAccount({owner,now,writer,idFactory,[key]:a.state}));
 assert.throws(()=>createFreshExpeditionAccount({owner,now,writer,idFactory:()=> 'same'}));assert.throws(()=>createFreshExpeditionAccount({owner:'guest',now,writer,idFactory}));
});
await check('No review/guest/realtime/future/corrupt raw promotion and original bytes are never mutated',()=>{
 const a=fresh();for(const mutate of [x=>x.channel='review',x=>x.channel='guest',x=>x.version=2,x=>x.kind='seed-expedition',x=>x.protocol='future',x=>x.ownerUid='other',x=>x.state.roster.channel='review',x=>x.inspection=true]){const b=clone(a);mutate(b);const raw=JSON.stringify(b);assert.equal(decodeExpeditionAccount(raw,{owner}),null);assert.equal(raw,JSON.stringify(b));}
 assert.equal(decodeExpeditionAccount('{bad',{owner}),null);assert.equal(decodeExpeditionAccount(a),null);assert.equal(decodeExpeditionAccount({version:2,owner,channel:'review',roster:a.state.roster},{owner}),null);
 const borrowed=clone(a);assert(grantInstanceXP(borrowed.state.roster,borrowed.state.roster.party[0],20,'old-review-xp'));assert.equal(decodeExpeditionAccount(borrowed,{owner}),null,'revision0 cannot wrap progressed review as fresh account');
});
await check('Exact schema rejects prototypes/getters/missing fields/nonfinite values rather than JSON-clone sanitation',()=>{
 const a=fresh();for(const mutate of [x=>delete x.writer,x=>x.writer.foo=1,x=>x.writer.expiresAt=Infinity,x=>x.updatedAt=-1,x=>x.state.meta.returnCount=NaN,x=>x.state.roster.party[1]=x.state.roster.party[0],x=>Object.setPrototypeOf(x.state.meta,{})]){const b=clone(a);mutate(b);assert.equal(decodeExpeditionAccount(b,{owner}),null);}
 const b=clone(a);let invoked=false;Object.defineProperty(b,'ownerUid',{enumerable:true,get(){invoked=true;return owner;}});assert.equal(decodeExpeditionAccount(b,{owner}),null);assert.equal(invoked,false);
 const c=clone(a);c.state.meta.cores[Symbol('hidden')]=0;assert.equal(decodeExpeditionAccount(c,{owner}),null);
 const hidden=clone(a);Object.defineProperty(hidden,'extra',{value:1});assert.equal(decodeExpeditionAccount(hidden,{owner}),null);
 const sparse=clone(a);delete sparse.state.roster.party[0];sparse.state.roster.party.extra='seed-x';assert.equal(decodeExpeditionAccount(sparse,{owner}),null);
 const raw=JSON.stringify(a);assert.equal(decodeExpeditionAccount(raw.replace('"version":1','"version":2,"version":1'),{owner}),null);assert.equal(decodeExpeditionAccount(raw.replace('"screen":"home"','"screen":"battle","screen":"home"'),{owner}),null);
});
await check('Finite lease is metadata only: expired decode remains recognizable, impossible/oversized intervals fail',()=>{
 const a=fresh();assert(decodeExpeditionAccount(a,{owner}));
 for(const mutate of [x=>x.writer.expiresAt=x.writer.issuedAt,x=>x.writer.expiresAt=x.writer.issuedAt+120001,x=>x.writer.issuedAt=x.updatedAt+1,x=>x.writer.deviceId='__proto__',x=>x.writer.leaseId='']){const b=clone(a);mutate(b);assert.equal(decodeExpeditionAccount(b,{owner}),null);}
 const expired=createFreshExpeditionAccount({owner,now:10,writer:{...writer,issuedAt:9,expiresAt:20},idFactory});assert(decodeExpeditionAccount(expired,{owner}),'decoder does not infer current server time/lease authority');
});
await check('Expired local writer cannot mint next checkpoint; prior raw remains caller-owned unchanged',async()=>{
 const a=fresh(),raw=JSON.stringify(a),out=await nextExpeditionAccount(a,{owner,state:a.state,now:writer.expiresAt,writer,idFactory});assert.equal(out.ok,false);assert.equal(JSON.stringify(a),raw);
});
await check('Real WebCrypto parent hash binds exact canonical previous account, owner/campaign/write and one-step revision',async()=>{
 const a=fresh(),parent=await expeditionAccountParent(a,{owner});assert.equal(parent.checkpointHash.length,64);
 const b=await candidate(a);assert((await validateExpeditionAccountTransition(a,b,{owner})).ok);
 for(const mutate of [x=>x.parent.checkpointHash='f'.repeat(64),x=>x.parent.writeId='other',x=>x.parent.ownerUid='other',x=>x.parent.campaignId='other',x=>x.parent.revision++,x=>x.revision+=2,x=>x.writeId=a.writeId,x=>x.createdAt--]){const bad=clone(b);mutate(bad);assert.equal((await validateExpeditionAccountTransition(a,bad,{owner})).ok,false);}
 const reordered=Object.fromEntries(Object.entries(a).reverse());assert.deepEqual(await expeditionAccountParent(reordered,{owner}),parent);assert.throws(()=>createFreshExpeditionAccount({owner,now,writer,idFactory:()=>a.campaignId}));
});
await check('Stale fork is rejected by real parent digest, not highest device timestamp or revision',async()=>{
 const a=fresh(),x=(await advance(a)).record,y=await candidate(a);y.updatedAt+=1000;
 assert.equal((await validateExpeditionAccountTransition(x,y,{owner})).ok,false);const forged=await candidate(x);forged.parent.checkpointHash=y.parent.checkpointHash;assert.equal((await validateExpeditionAccountTransition(x,forged,{owner})).ok,false);
});
await check('Account route bound100 / individual bound128 and own canonical garden/encounter identity',async()=>{
 const a=fresh(),s=clone(a.state);s.screen='explore';s.route={...newExpeditionRoute({runId:'r'.repeat(100),gardenId:'meadow',partyIds:s.roster.party}),pendingFinds:[]};advanceExpeditionRoute(s.route);
 const out=await advance(a,s);assert(out.ok,out.reason);assert.equal(out.record.state.route.runId.length,100);
 for(const mutate of [x=>x.state.route.runId='r'.repeat(101),x=>x.state.route.gardenId='constructor',x=>x.state.route.partyIds[0]='constructor',x=>x.state.route.completedBattles=['wrong:b2'],x=>x.state.route.pendingLoot=[{lawId:'new-law',amount:1,material:0}],x=>x.state.route.pendingFinds=[{rewardId:'fake',kind:'egg',speciesId:'pierce',gardenId:'meadow'}]]){const b=clone(out.record);mutate(b);assert.equal(decodeExpeditionAccount(b,{owner}),null);}
});
await check('Real account-created battle HP/order/party/death mirrors actual roster; P2 accepted actions persist coherently',async()=>{
 const a=fresh(),s=clone(a.state),runId='run-account';s.screen='battle';s.route={...newExpeditionRoute({runId,gardenId:'meadow',partyIds:s.roster.party}),step:EXPEDITION_RUN_STEPS.indexOf('normal1'),status:'battle',pendingFinds:[]};
 const battleId=`${runId}:b${s.route.step}`;
 s.battle=createExpeditionCombat({battleId,allies:s.roster.party.map((id,slot)=>({...s.roster.instances[id],id,slot,...expeditionStats(s.roster.instances[id].speciesId,1)})),enemies:expeditionEncounter('meadow',{battleId}),getSpecies:id=>EXPEDITION_SPECIES[id]||expeditionEnemyProfile(id)});
 let out=await advance(a,s);assert(out.ok,out.reason);let record=out.record;
 for(let n=0;n<3;n++){
  const next=clone(record.state),actor=expeditionCombatTurn(next.battle),target=next.battle.units.find(u=>u.side!==actor.side&&!u.dead&&u.slot<5),command={id:`${battleId}:a${next.battle.actionCount+1}`,unitId:actor.id,kind:'attack',targetId:target.id};
  const result=performExpeditionCombatAction(next.battle,command);assert(result.ok);combatActions++;
  for(const e of result.events)if(e.type==='damage'&&next.roster.instances[e.targetId])assert(damageInstance(next.roster,e.targetId,e.amount,{receiptId:`${battleId}:e${e.seq}`,place:'meadow'}));
  out=await advance(record,next);assert(out.ok,out.reason);record=out.record;assert(decodeExpeditionAccount(out.raw,{owner}));
 }
 for(const mutate of [x=>x.state.battle.battleId='wrong',x=>x.state.battle.units[0].hp--,x=>x.state.battle.units[0].power=10000,x=>x.state.battle.units.find(u=>u.side==='enemy').power=0,x=>x.state.roster.party.reverse(),x=>x.state.battle.seen.push('extra'),x=>x.state.battle.phase='victory']){const bad=clone(record);mutate(bad);assert.equal(decodeExpeditionAccount(bad,{owner}),null);}
});
await check('Death and immutable event history cannot rewind under a correct fresh parent',async()=>{
 const a=fresh(),dead=await candidate(a);assert(damageInstance(dead.state.roster,dead.state.roster.party[0],1000,{receiptId:'death-account'}));assert((await validateExpeditionAccountTransition(a,dead,{owner})).ok);
 const resurrect=await candidate(dead);resurrect.state.roster=clone(a.state.roster);assert.equal((await validateExpeditionAccountTransition(dead,resurrect,{owner})).ok,false);
 const xp=await candidate(a);assert(grantInstanceXP(xp.state.roster,xp.state.roster.party[0],20,'earned-xp'));assert((await validateExpeditionAccountTransition(a,xp,{owner})).ok);const rewind=await candidate(xp);rewind.state.roster=clone(a.state.roster);assert.equal((await validateExpeditionAccountTransition(xp,rewind,{owner})).ok,false);
});
await check('Economy/result/birth changes fail closed until immutable transaction ledger exists; no max/union helper',async()=>{
 const a=fresh();for(const mutate of [x=>x.state.meta.cores.pierce++,x=>x.state.meta.growthCharges++,x=>{x.state.meta.returnCount++;x.state.meta.committedRuns.push('r');},x=>assert(recruitInstance(x.state.roster,{instanceId:'foreign-new-body',speciesId:'burst'}))]){const b=await candidate(a,mutate);assert(decodeExpeditionAccount(b,{owner}));assert.equal((await validateExpeditionAccountTransition(a,b,{owner})).ok,false);}
});
await check('Terminal result schema retains parent identity and requires settled loot/real party tally',async()=>{
 const a=fresh(),b=await candidate(a);b.state.screen='result';b.state.route={...newExpeditionRoute({runId:'returned',gardenId:'meadow',partyIds:b.state.roster.party}),step:3,status:'returned',completedBattles:['returned:b2'],pendingFinds:[]};b.state.meta.returnCount=1;b.state.meta.committedRuns=['returned'];b.state.lastResult={kind:'return',gardenId:'meadow',difficulty:1,survivors:8,lost:0,loot:0,boss:false};assert(decodeExpeditionAccount(b,{owner}));
 for(const mutate of [x=>x.state.route.pendingLoot.push({lawId:'pierce',amount:1,material:0}),x=>x.state.lastResult.survivors=7,x=>x.state.lastResult.boss=true,x=>x.state.meta.committedRuns=[]]){const bad=clone(b);mutate(bad);assert.equal(decodeExpeditionAccount(bad,{owner}),null);}
 assert.equal((await validateExpeditionAccountTransition(a,b,{owner})).reason,'economy ledger required');
});
await check('Declared valid 2.43M roster survives independent 4M UTF8 codec; old2M review cap is not reused',async()=>{
 const a=fresh(),b=await candidate(a),old=b.state.roster.party[0],id='i'.repeat(128),i=b.state.roster.instances[old];delete b.state.roster.instances[old];i.instanceId=id;b.state.roster.instances[id]=i;b.state.roster.party[0]=id;
 for(let n=0;n<8192;n++)i.events[`xp:128:${String(n).padStart(128,'r')}:128:${id}`]={kind:'xp',amount:1};Object.assign(i,{xp:8192,level:10,hp:expeditionStats(i.speciesId,10).hp,maxHp:expeditionStats(i.speciesId,10).hp});assert(normalizeRoster(b.state.roster,{owner,channel:'account'}));
 const out=encodeExpeditionAccount(b,{owner});assert(out.ok);assert(Buffer.byteLength(out.raw,'utf8')>2400000);assert(decodeExpeditionAccount(out.raw,{owner}));console.log('MEASURE synthetic account '+Buffer.byteLength(out.raw,'utf8')+' UTF8 bytes');
 const long=clone(b);for(const body of Object.values(long.state.roster.instances))body.nickname='한'.repeat(160);const raw=JSON.stringify(long);assert(Buffer.byteLength(raw,'utf8')>raw.length);assert(decodeExpeditionAccount(raw,{owner}));
 const exactly=out.raw+' '.repeat(EXPEDITION_ACCOUNT_MAX_BYTES-Buffer.byteLength(out.raw,'utf8'));assert.equal(Buffer.byteLength(exactly),EXPEDITION_ACCOUNT_MAX_BYTES);assert.equal(decodeExpeditionAccount(exactly,{owner}),null);assert.equal(decodeExpeditionAccount(exactly+' ',{owner}),null);
 assert(decodeExpeditionAccount(exactly.slice(0,-1),{owner}),'3,999,999-byte JSON is still structurally readable');
 const original=out.raw;let saved=original;const rejected=encodeExpeditionAccount(exactly,{owner});if(rejected.ok)saved=rejected.raw;assert.equal(rejected.ok,false);assert.equal(saved,original,'pure encode failure cannot authorize replacing caller raw bytes');
});
await check('Full128 instance and heal275/xp274 codecs delegate actual roster receipt validation',async()=>{
 const a=fresh(),b=await candidate(a),old=b.state.roster.party[0],id='i'.repeat(128),i=b.state.roster.instances[old];delete b.state.roster.instances[old];i.instanceId=id;b.state.roster.instances[id]=i;b.state.roster.party[0]=id;
 assert(grantInstanceXP(b.state.roster,id,1,`xp:128:${'r'.repeat(128)}:128:${id}`));assert(decodeExpeditionAccount(b,{owner}));const bad=clone(b);bad.state.roster.instances[id].events[`xp:128:${'r'.repeat(128)}:128:${id}x`]={kind:'xp',amount:1};assert.equal(decodeExpeditionAccount(bad,{owner}),null);
 assert(damageInstance(b.state.roster,id,2,{receiptId:'damage-before-full-heal'}));const receipt=expeditionHealReceipt('r'.repeat(128),id,'rest');assert.equal(receipt.length,275);assert(healInstance(b.state.roster,id,1,receipt));assert(decodeExpeditionAccount(b,{owner}));
});
const source=readFileSync(new URL('../src/expedition/account-codec.js',import.meta.url),'utf8');assert(!/from ['"](?:node:|\.\/session)/.test(source));assert(!/\b(?:fetch|localStorage|Buffer)\b/.test(source));
console.log('SOURCE SHA256 '+createHash('sha256').update(source).digest('hex'));
console.log(`Expedition account codec: ${groups} groups PASS, ${combatActions} real P2 actions in synthetic account fixtures. Structural codec only; no cloud/store/controller/gate integration, lease authority, economy merge, browser or production readiness claim.`);
