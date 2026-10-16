import assert from 'node:assert/strict';
import {createJourneySignature,stepJourneySignature,journeySignatureHint,JOURNEY_SIGNATURE_RULES as R} from '../src/journey-act-signatures.js';
import {createCrystalSiege,harvestCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense,checkpointCrystalSiege,restoreCrystalSiege} from '../src/crystal-siege-rules.js';

const outside={x:7,z:6},close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} equals ${b}`);
function fixture(){
 const siege=createCrystalSiege(0,413),sig=createJourneySignature('crystalGorge');
 for(const n of siege.nodes)assert(harvestCrystalSiege(siege,n.id,n).ok);
 for(const p of siege.pads.slice(0,2)){assert(buildCrystalSiege(siege,p.id,'turret',p).ok);p.hp=10;}
 assert(startCrystalSiegeDefense(siege).ok);
 return {siege,sig,pad:siege.pads[0],other:siege.pads[1]};
}
const tick=(f,player,dt=.1,extra={})=>stepJourneySignature(f.sig,dt,{player,siege:f.siege,...extra});
function spend(f,seconds,player,extra={}){while(seconds>1e-9){const dt=Math.min(.1,seconds);tick(f,player,dt,extra);seconds-=dt;}}
function charged(){const f=fixture();spend(f,.8,f.pad);close(f.sig.repairCharge,.8);return f;}
function reset(f){assert.equal(f.sig.repairPad,null);assert.equal(f.sig.repairCharge,0);assert.equal(f.sig.repairGrace,0);assert.equal(f.sig.repairAway,false);}

assert.equal(R.repairDodgeGrace,.65);assert.equal(R.repairTime,1.5);assert.equal(R.repairHp,25);assert.equal(R.repairCooldown,4);
{
 const f=charged(),resources=f.siege.resources,before=checkpointCrystalSiege(f.siege);
 spend(f,.6,outside);close(f.sig.repairCharge,.8);assert(f.sig.repairAway);assert.equal(f.sig.rallyPad,null);assert.equal(f.siege.journeyRallyPad,null);assert.equal(f.pad.hp,10);assert.equal(f.siege.resources,resources);
 assert.equal(journeySignatureHint(f.sig,f.siege),'회피 뒤 돌아오면 수리 계속 · 수정 1');assert.deepEqual(checkpointCrystalSiege(f.siege),before,'leaving only changes ephemeral signature/aura state');
 tick(f,f.pad);close(f.sig.repairCharge,.9);assert(!f.sig.repairAway);assert.equal(f.sig.rallyPad,f.pad.id);assert.equal(f.pad.hp,10);
 spend(f,.6,f.pad);assert.equal(f.pad.hp,35);assert.equal(f.siege.resources,resources-1);assert.equal(f.sig.out.repaired,f.pad.id);assert.equal(f.sig.repairCooldown,4);reset(f);
 spend(f,3.9,f.pad);assert.equal(f.pad.hp,35);assert.equal(f.siege.resources,resources-1,'cooldown still prevents repeated payment');
}
{
 const f=charged();spend(f,.65,outside);close(f.sig.repairGrace,0);close(f.sig.repairCharge,.8);assert(f.sig.repairAway);
 tick(f,f.pad);close(f.sig.repairCharge,.9,'return at the inclusive grace boundary');
 const expired=charged();spend(expired,.650001,outside);reset(expired);tick(expired,expired.pad);close(expired.sig.repairCharge,.1);
}
{
 const f=charged();tick(f,outside);const before={charge:f.sig.repairCharge,grace:f.sig.repairGrace,away:f.sig.repairAway,time:f.sig.time,hp:f.pad.hp,resources:f.siege.resources};
 for(const dt of [0,-1,NaN,Infinity,undefined]){stepJourneySignature(f.sig,dt,{player:outside,siege:f.siege});assert.deepEqual({charge:f.sig.repairCharge,grace:f.sig.repairGrace,away:f.sig.repairAway,time:f.sig.time,hp:f.pad.hp,resources:f.siege.resources},before,'paused/invalid steps cannot consume grace or repair');}
 tick(f,outside,99);close(f.sig.repairGrace,before.grace-.1,'large resume frame remains clamped');
}
{
 const f=charged();tick(f,outside);tick(f,f.other);assert.equal(f.sig.repairPad,f.other.id);close(f.sig.repairCharge,.1);tick(f,f.pad);close(f.sig.repairCharge,.1,'another pad never transfers stored charge');
}
for(const mutation of ['destroy','full','resources','missing']){
 const f=charged();tick(f,outside);
 if(mutation==='destroy')f.pad.hp=0;if(mutation==='full')f.pad.hp=45;if(mutation==='resources')f.siege.resources=0;if(mutation==='missing')f.siege.pads[0]={...f.pad,id:'replacement'};
 tick(f,outside);reset(f);assert.equal(f.sig.rallyPad,null);assert.equal(f.sig.out.repaired,null);
}
for(const phase of ['prep','clear','failed','boss']){
 const f=charged();f.siege.phase=phase;tick(f,outside);reset(f);assert.equal(f.sig.rallyPad,null);
}
{
 const f=charged();f.siege.phase='clear';f.siege.room=4;tick(f,f.pad,.1,{boss:true});close(f.sig.repairCharge,.1,'entering the actual boss resets old night charge');spend(f,.4,f.pad,{boss:true});spend(f,.6,outside,{boss:true});close(f.sig.repairCharge,.5);tick(f,f.pad,.1,{boss:true});close(f.sig.repairCharge,.6,'same-pad dodge grace also works during the allowed boss defense');
 tick(f,f.pad,.1,{cleared:true,boss:true});reset(f);assert.equal(f.sig.rallyPad,null);assert.equal(f.siege.journeyRallyPad,null);
}
{
 const f=charged();f.siege.room=1;tick(f,f.pad);close(f.sig.repairCharge,.1,'room mutation resets the old channel');
 const original=charged();original.siege=restoreCrystalSiege(checkpointCrystalSiege(original.siege));original.pad=original.siege.pads[0];tick(original,original.pad);close(original.sig.repairCharge,.1,'restored siege identity cannot retain an old repair');
 const saved=checkpointCrystalSiege(original.siege);for(const key of ['repairGrace','repairAway','repairPad','repairCharge','repairSiege','repairSiegeRoom','repairSiegePhase','journeyRallyPad','journeyCommand'])assert(!Object.hasOwn(saved,key),`${key} stays out of paid checkpoints`);
 assert.deepEqual(checkpointCrystalSiege(restoreCrystalSiege(saved)),saved);
}
{
 const a=charged(),b=charged();for(let i=0;i<100;i++){tick(a,a.pad);tick(b,b.pad);}assert.deepEqual(checkpointCrystalSiege(a.siege),checkpointCrystalSiege(b.siege),'deterministic paid outcomes remain reproducible');
}
console.log('Journey repair dodge PASS: .65s inclusive same-pad grace, no outside support/progress/heal/payment, 1.5s actual repair time, pause/clamp/cooldown, switch/phase/room/identity/resource guards and unchanged paid checkpoint. Engine evidence, not native/device play.');
