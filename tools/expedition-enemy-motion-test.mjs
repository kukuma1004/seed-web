import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionEnemyArt,expeditionArtAudit} from '../src/expedition/art.js';
import {expeditionSpriteSequence,expeditionFeedbackDelay} from '../src/expedition/sprite-motion.js';
import {createExpeditionCombat,expeditionCombatTurn,performExpeditionCombatAction,restoreExpeditionCombat} from '../src/expedition/combat.js';
import {getExpeditionSpecies} from '../src/expedition/species.js';
import {expeditionEnemyProfile,expeditionEncounter} from '../src/expedition/world.js';
import {expeditionBossActionPattern,expeditionBossCommand} from '../src/expedition/boss-ai.js';

const art=expeditionEnemyArt('meadow-normal-0');
assert.equal(art.facing,'left');assert.equal(art.ready,false);assert.equal(expeditionArtAudit().enemies.motionCandidate,21);assert.equal(expeditionArtAudit().enemies.motionReady,0);
const unit={id:'e',speciesId:'meadow-normal-0',side:'enemy',hp:40},units=[unit,{id:'a',speciesId:'pierce',side:'ally',hp:40}];
for(let seq=0;seq<8;seq++){
 const s=expeditionSpriteSequence(unit,units,[{type:'action',unitId:'e',kind:'attack',seq}],art);
 assert.equal(s.preparation.pose,4);assert([1,3].includes(s.impact.pose),'jab impact must never use raised preparation pose2');assert.equal(s.rest.pose,0);
}
for(const [kind,impact]of [['skill1',3],['skill2',5],['awaken',5]]){
 const s=expeditionSpriteSequence(unit,units,[{type:'action',unitId:'e',kind,seq:0}],art);assert.equal(s.preparation.pose,4);assert.equal(s.impact.pose,impact);assert.notEqual(s.impact.pose,s.preparation.pose);
}
console.log('PASS Enemy-specific jab/thrust/downstroke map: actual impact cell never raised windup, no extra creatures/final-ready claims');
// Native foot-bottom measurements from the preserved v8 PNG. Ground-pivot
// translation corrects the renderer, not image pixels or combat positions.
const contacts=[.8771138669673055,.879368658399098,.879368658399098,.8771138669673055,.8173618940248028,.8196166854565953,.8196166854565953,.8196166854565953];
for(let pose=0;pose<8;pose++)assert(Math.abs(contacts[pose]+art.poseOffsets[pose]/100-art.baseline)<.000002,'native foot anchor aligned without crop or alpha filtering');
const received=[{type:'action',unitId:'e',kind:'skill2',seq:1},{type:'damage',unitId:'a',targetId:'e',amount:10}];
const hit=expeditionSpriteSequence(unit,units,received,art);assert.equal(hit.impact.pose,7);assert.equal(hit.rest.pose,0);
const dead=expeditionSpriteSequence({...unit,dead:true,hp:0},units,received,art);assert.equal(dead.animate,false);assert.equal(dead.rest.pose,7,'dead enemy never plays a recover-to-idle');
const guarded=expeditionSpriteSequence({...unit,guarding:true},units,[{type:'action',unitId:'e',kind:'guard'}],art);assert.equal(guarded.rest.pose,6);
assert.equal(expeditionSpriteSequence(unit,units,[],art).animate,false);assert.equal(expeditionFeedbackDelay(0,1000),-720);
console.log('PASS All eight planted-foot anchors, hit/guard/death priority and exhausted feedback stay presentation-only');
const extraContacts={
 'meadow-normal-1':[.8387824126268321,.8387824126268321,.8500563697857948,.8478015783540023,.790304396843292,.7790304396843292,.7767756482525366,.7790304396843292],
 'meadow-normal-2':[.859075535512965,.8523111612175873,.8523111612175873,.8568207440811725,.7677564825253664,.7677564825253664,.7700112739571589,.7700112739571589],
 'meadow-normal-3':[.85456595264938,.859075535512965,.8568207440811725,.859075535512965,.7790304396843292,.7812852311161217,.7790304396843292,.7767756482525366]
};
for(const [id,contacts]of Object.entries(extraContacts)){
 const meta=expeditionEnemyArt(id),u={...unit,speciesId:id};
 for(let pose=0;pose<8;pose++)assert(Math.abs(contacts[pose]+meta.poseOffsets[pose]/100-meta.baseline)<.000002,`${id} pose${pose} planted-foot pivot`);
 for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<3;seq++){
  const s=expeditionSpriteSequence(u,[u,units[1]],[{type:'action',unitId:'e',kind,seq}],meta);
  assert.equal(s.preparation.pose,4);assert(![0,2,4,6,7].includes(s.impact.pose),`${id} must use a completed attack not draw/guard/rest/hit`);assert.equal(s.rest.pose,0);
 }
 assert.equal(expeditionSpriteSequence(u,[u],[],meta).animate,false);
}
console.log('PASS Bee release, thorn-tail lunge and flower cast use distinct authored impacts; all24 extra foot anchors align');
{
 const contacts={
  'meadow-elite-0':[.8658399098083427,.8703494926719277,.8703494926719277,.8680947012401353,.774520856820744,.7722660653889516,.7722660653889516,.7767756482525366],
  'meadow-elite-1':[.9131905298759865,.9154453213077791,.9154453213077791,.8297632468996619,.7722660653889516,.7655016910935739,.7655016910935739,.7767756482525366]
 };
 let accepted=0,enemyTurns=0;
 for(const [id,pivots]of Object.entries(contacts)){
  const meta=expeditionEnemyArt(id);assert.equal(meta.ready,false);assert.equal(meta.facing,'left');assert(meta.motionDefects.length>0);
  for(let pose=0;pose<8;pose++)assert(Math.abs(pivots[pose]+meta.poseOffsets[pose]/100-meta.baseline)<.000002,`${id} pose${pose} native ground pivot`);
  for(let n=0;n<12;n++){
   const battle=createExpeditionCombat({battleId:`elite-motion-${id}-${n}`,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:240,maxHp:240,power:30,defense:5,speed:20}],enemies:expeditionEncounter('meadow',{kind:'elite',difficulty:5,battleId:`elite-motion-${n}`}).filter(u=>u.speciesId===id),getSpecies:s=>getExpeditionSpecies(s)||expeditionEnemyProfile(s)});
   while(battle.phase==='fight'){
    const actor=expeditionCombatTurn(battle),kind=actor.side==='ally'?'attack':['attack','skill1','skill2'][n%3];
    const result=performExpeditionCombatAction(battle,{id:`elite-act-${++accepted}`,unitId:actor.id,kind,targetId:actor.side==='ally'?battle.units.find(u=>u.side==='enemy').id:'a'});assert(result.ok,result.reason);
    const before=JSON.stringify(battle),u=battle.units.find(u=>u.side==='enemy'),sequence=expeditionSpriteSequence(u,battle.units,result.events,meta);
    if(actor.side==='enemy'){enemyTurns++;if(!u.dead){assert.equal(sequence.preparation.pose,4);assert(![0,4,6,7].includes(sequence.impact.pose),'elite attack must use a completed hit, not windup');}}
    assert.equal(JSON.stringify(battle),before,'elite presentation never changes accepted damage/status/turns');assert.deepEqual(restoreExpeditionCombat(battle),battle);
    assert(accepted<2000);
   }
   assert.notEqual(battle.phase,'fight');
  }
 }
 assert(enemyTurns>=24);console.log(`PASS Two elite native16 pivots, bison horn/deer hoof impacts; 24 actual P2 simulated encounters/${accepted} commands/${enemyTurns} enemy turns, exact restore`);
}
{
 const meta=expeditionEnemyArt('meadow-boss'),contacts=[.8771138669673055,.8816234498308907,.8838782412626832,.8793686583990981,.774520856820744,.7812852311161218,.7812852311161218,.7790304396843293];
 for(let pose=0;pose<8;pose++)assert(Math.abs(contacts[pose]+meta.poseOffsets[pose]/100-meta.baseline)<.000002,'boss foot pivots preserve native atlas without moving combat formation');
 const battle=createExpeditionCombat({battleId:'boss-motion',allies:Array.from({length:5},(_,slot)=>({id:`a${slot}`,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:10})),enemies:expeditionEncounter('meadow',{kind:'boss',battleId:'boss-motion'}).filter(u=>u.boss),getSpecies:id=>{const profile=getExpeditionSpecies(id)||expeditionEnemyProfile(id);return id==='meadow-boss'?{...profile,actionPattern:expeditionBossActionPattern('meadow')}:profile;}});
 const kinds=new Set();let count=0;
 while(battle.phase==='fight'&&battle.round<=6){
  const current=expeditionCombatTurn(battle),id=`boss-motion-${++count}`,input=current.boss?expeditionBossCommand(battle,id):{id,unitId:current.id,kind:'guard'};
  const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);
  const before=JSON.stringify(battle),boss=battle.units.find(u=>u.boss),seq=expeditionSpriteSequence(boss,battle.units,result.events,meta);
  if(current.boss){kinds.add(input.kind);if(input.kind==='guard'){assert.equal(seq.rest.pose,6);}else{assert.equal(seq.preparation.pose,4);assert([1,3].includes(seq.impact.pose));}}
  assert.equal(JSON.stringify(battle),before,'boss renderer cannot mutate warning, damage, target or receipts');
  assert.deepEqual(restoreExpeditionCombat(battle),battle);
  assert(count<100);
 }
 assert.deepEqual([...kinds].sort(),['attack','guard','skill1']);
 console.log(`PASS Actual meadow boss AI ${count} accepted commands: native pivots, completed horn impacts and recovery guard; exact save/restore`);
}
let commands=0,enemyActs=0;
for(let n=0;n<80;n++){
 const enemyId=`meadow-normal-${n%4}`,meta=expeditionEnemyArt(enemyId);
 const battle=createExpeditionCombat({battleId:`enemy-motion-${n}`,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:240,maxHp:240,power:30,defense:5,speed:20}],enemies:[{id:'e',speciesId:enemyId,slot:0,level:5,hp:140,maxHp:140,power:25,defense:4,speed:12}],getSpecies:id=>getExpeditionSpecies(id)||expeditionEnemyProfile(id)});
 while(battle.phase==='fight'&&commands<5000){
  const turn=expeditionCombatTurn(battle);assert(turn);
  const kind=turn.side==='ally'?'attack':['attack','skill1','skill2'][n%3];
  const result=performExpeditionCombatAction(battle,{id:`motion-${++commands}`,unitId:turn.id,kind,targetId:turn.side==='ally'?'e':'a'});assert(result.ok,result.reason);
  const before=JSON.stringify(battle);
  for(const u of battle.units)expeditionSpriteSequence(u,battle.units,result.events,u.side==='enemy'?meta:{});
  assert.equal(JSON.stringify(battle),before,'motion cannot mutate HP, turn order, pending attacks, death or action receipts');
  assert.deepEqual(restoreExpeditionCombat(battle),battle,'save reload has no presentation fields');
  if(turn.side==='enemy')enemyActs++;
 }
 assert.notEqual(battle.phase,'fight');
}
assert(enemyActs>=80);console.log(`PASS 80 actual P2 simulated encounters/${commands} accepted commands/${enemyActs} enemy turns: four enemy presentations and restore leave every accepted combat state exact`);
{
 // Contacts measured from preserved native PNGs, independent of metadata.
 // Archer guard and boss low fan use ROOT feet, not the lower weapon bounds.
 const contacts={
 "blossom-normal-0": [
  0.9041713641488163,
  0.9041713641488163,
  0.9086809470124013,
  0.9041713641488163,
  0.8173618940248026,
  0.8196166854565952,
  0.8173618940248026,
  0.8173618940248026
 ],
 "blossom-normal-1": [
  0.874859075535513,
  0.874859075535513,
  0.874859075535513,
  0.874859075535513,
  0.7361894024802706,
  0.7361894024802706,
  0.7361894024802706,
  0.7361894024802706
 ],
 "blossom-normal-2": [
  0.874859075535513,
  0.874859075535513,
  0.8771138669673055,
  0.874859075535513,
  0.8083427282976325,
  0.8038331454340473,
  0.80608793686584,
  0.80608793686584
 ],
 "blossom-normal-3": [
  0.8478015783540023,
  0.859075535512965,
  0.8523111612175873,
  0.8500563697857948,
  0.7857948139797069,
  0.7519729425028185,
  0.770011273957159,
  0.7790304396843293
 ],
 "blossom-elite-0": [
  0.8816234498308907,
  0.8816234498308907,
  0.8861330326944757,
  0.8816234498308907,
  0.7812852311161218,
  0.7812852311161218,
  0.7835400225479143,
  0.7970687711386697
 ],
 "blossom-elite-1": [
  0.8455467869222097,
  0.8455467869222097,
  0.8455467869222097,
  0.8455467869222097,
  0.7294250281848929,
  0.7271702367531003,
  0.7294250281848929,
  0.7316798196166854
 ],
 "blossom-boss": [
  0.8726042841037204,
  0.8680947012401353,
  0.874859075535513,
  0.874859075535513,
  0.7722660653889515,
  0.774520856820744,
  0.7812852311161218,
  0.7790304396843293
 ]
};
 let commands=0,enemyTurns=0;
 for(const [id,pivots] of Object.entries(contacts)){
  const meta=expeditionEnemyArt(id);
  for(let pose=0;pose<8;pose++)assert(Math.abs(pivots[pose]+meta.poseOffsets[pose]/100-meta.baseline)<.000002,id+' native contact '+pose);
  const u={id:'e',speciesId:id,side:'enemy',hp:140};
  for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<3;seq++){
   const s=expeditionSpriteSequence(u,[u,{id:'a',side:'ally',hp:240}],[{type:'action',unitId:'e',kind,seq}],meta);
   assert.equal(s.preparation.pose,4);assert([1,2,3,5].includes(s.impact.pose));assert.equal(s.rest.pose,0);
   if(kind==='attack'&&['blossom-normal-3','blossom-boss'].includes(id))assert.notEqual(s.impact.pose,3,'hover/folded fan is not a completed strike');
  }
  if(id==='blossom-boss')continue;
  for(let n=0;n<6;n++){
   const battle=createExpeditionCombat({battleId:'blossom-motion-'+id+'-'+n,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:240,maxHp:240,power:30,defense:5,speed:20}],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:140,maxHp:140,power:25,defense:4,speed:12}],getSpecies:id=>getExpeditionSpecies(id)||expeditionEnemyProfile(id)});
   while(battle.phase==='fight'){
    const actor=expeditionCombatTurn(battle),kind=actor.side==='ally'?'attack':['attack','skill1','skill2'][n%3];
    const result=performExpeditionCombatAction(battle,{id:'blossom-act-'+(++commands),unitId:actor.id,kind,targetId:actor.side==='ally'?'e':'a'});assert(result.ok,result.reason);
    const before=JSON.stringify(battle),enemy=battle.units.find(u=>u.side==='enemy'),s=expeditionSpriteSequence(enemy,battle.units,result.events,meta);
    if(actor.side==='enemy'){enemyTurns++;if(!enemy.dead){assert.equal(s.preparation.pose,4);assert([1,2,3,5].includes(s.impact.pose));}}
    assert.equal(JSON.stringify(battle),before);assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(commands<3000);
   }
  }
 }
 assert(enemyTurns>=36);
 const meta=expeditionEnemyArt('blossom-boss'),battle=createExpeditionCombat({battleId:'blossom-boss-motion',allies:Array.from({length:5},(_,slot)=>({id:'a'+slot,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:10})),enemies:expeditionEncounter('blossom',{kind:'boss',battleId:'blossom-boss-motion'}).filter(u=>u.boss),getSpecies:id=>{const p=getExpeditionSpecies(id)||expeditionEnemyProfile(id);return id==='blossom-boss'?{...p,actionPattern:expeditionBossActionPattern('blossom')}:p;}});
 const kinds=new Set();let bossCommands=0;
 while(battle.phase==='fight'&&battle.round<=6){
  const actor=expeditionCombatTurn(battle),id='blossom-boss-act-'+(++bossCommands),input=actor.boss?expeditionBossCommand(battle,id):{id,unitId:actor.id,kind:'guard'};
  const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);
  const before=JSON.stringify(battle),boss=battle.units.find(u=>u.boss),s=expeditionSpriteSequence(boss,battle.units,result.events,meta);
  if(actor.boss){kinds.add(input.kind);if(input.kind==='guard')assert.equal(s.rest.pose,6);else{assert.equal(s.preparation.pose,4);assert([1,2,3,5].includes(s.impact.pose));}}
  assert.equal(JSON.stringify(battle),before);assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(bossCommands<100);
 }
 assert(kinds.has('skill1'));assert(kinds.has('guard'));
 console.log('PASS Blossom seven native56 contacts, 36 simulated P2 normal/elite battles/'+commands+' actions/'+enemyTurns+' enemy turns; actual boss AI/'+bossCommands+' actions; exact accepted-state restore');
}
{
 // Independent native PNG contact measurements. Ignore unused low-tail
 // poses whose feet are partly occluded rather than testing effect bounds.
 const contacts={
  'autumn-normal-0':[373,372,376,373,752,751,752,752],
  'autumn-normal-1':[369,369,368,369,780,779,780,780],
  'autumn-normal-2':[378,377,377,null,752,753,754,754],
  'autumn-normal-3':[387,388,null,396,760,764,770,764],
  'autumn-elite-0':[399,395,null,403,null,777,777,775],
  'autumn-elite-1':[375,372,373,366,772,772,769,771],
  'autumn-boss':[403,401,null,402,802,801,801,800]
 };
 let accepted=0,enemyTurns=0;const seen=new Set();
 for(const [id,feet] of Object.entries(contacts)){
  const meta=expeditionEnemyArt(id);assert.equal(meta.facing,'left');
  for(let pose=0;pose<8;pose++)if(feet[pose]!==null){
   const pivot=(feet[pose]-(pose>=4?443.5:0))/443.5;
   assert(Math.abs(pivot+meta.poseOffsets[pose]/100-meta.baseline)<.000002,id+' actual root contact '+pose);
  }
  const u={id:'e',side:'enemy',hp:140};
  for(const kind of ['attack','skill1','skill2','awaken'])for(let seq=0;seq<6;seq++){
   const s=expeditionSpriteSequence(u,[u,{id:'a',side:'ally',hp:240}],[{type:'action',unitId:'e',kind,seq}],meta);
   assert.equal(s.preparation.pose,id==='autumn-elite-0'?3:4);assert.notEqual(s.preparation.pose,s.impact.pose);
   assert([1,2,3,5].includes(s.impact.pose));assert.equal(s.rest.pose,0);
   if(id==='autumn-normal-2')assert.notEqual(s.impact.pose,3,'rear tail must not play as a LEFT attack');
   if(['autumn-elite-0','autumn-boss'].includes(id))assert.notEqual(s.impact.pose,2,'wrong-facing or low-tail pose must not be a mapped attack');
  }
  const guarding={...u,guarding:true};assert.equal(expeditionSpriteSequence(guarding,[guarding],[{type:'action',unitId:'e',kind:'guard'}],meta).preparation.pose,6);
  assert.equal(expeditionSpriteSequence(u,[u],[{type:'damage',targetId:'e',unitId:'a',amount:1}],meta).impact.pose,7,'authored windup must not override hit priority');
  if(id==='autumn-boss')continue;
  for(let n=0;n<6;n++){
   const battle=createExpeditionCombat({battleId:`autumn-${id}-${n}`,allies:[{id:'a',speciesId:'pierce',slot:0,level:8,hp:240,maxHp:240,power:30,defense:5,speed:20}],enemies:[{id:'e',speciesId:id,slot:0,level:5,hp:140,maxHp:140,power:25,defense:4,speed:12}],getSpecies:id=>getExpeditionSpecies(id)||expeditionEnemyProfile(id)});
   while(battle.phase==='fight'){
    const actor=expeditionCombatTurn(battle),kind=actor.side==='ally'?'attack':['attack','skill1','skill2'][n%3];
    const result=performExpeditionCombatAction(battle,{id:'autumn-act-'+(++accepted),unitId:actor.id,kind,targetId:actor.side==='ally'?'e':'a'});assert(result.ok,result.reason);
    for(const event of result.events)seen.add(event.type);
    const before=JSON.stringify(battle),enemy=battle.units.find(u=>u.side==='enemy');expeditionSpriteSequence(enemy,battle.units,result.events,meta);
    if(actor.side==='enemy')enemyTurns++;
    assert.equal(JSON.stringify(battle),before,'autumn presentation cannot mutate delayed returns, counter uses, protection, HP or receipts');
    assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(accepted<3000);
   }
  }
 }
 const battle=createExpeditionCombat({battleId:'autumn-boss-motion',allies:Array.from({length:5},(_,slot)=>({id:'a'+slot,speciesId:'orbit',slot,level:8,hp:1000,maxHp:1000,power:0,defense:0,speed:10})),enemies:expeditionEncounter('autumn',{kind:'boss',battleId:'autumn-boss-motion'}).filter(u=>u.boss),getSpecies:id=>{const p=getExpeditionSpecies(id)||expeditionEnemyProfile(id);return id==='autumn-boss'?{...p,actionPattern:expeditionBossActionPattern('autumn')}:p;}});
 const kinds=new Set();let bossCommands=0,returnedDamage=false;
 while(battle.phase==='fight'&&battle.round<=6){
  const actor=expeditionCombatTurn(battle),id='autumn-boss-act-'+(++bossCommands),input=actor.boss?expeditionBossCommand(battle,id):{id,unitId:actor.id,kind:'guard'};
  const result=performExpeditionCombatAction(battle,input);assert(result.ok,result.reason);
  for(const event of result.events){seen.add(event.type);if(event.type==='damage'&&event.unitId===battle.units.find(u=>u.boss).id)returnedDamage=true;}
  const before=JSON.stringify(battle),boss=battle.units.find(u=>u.boss),s=expeditionSpriteSequence(boss,battle.units,result.events,expeditionEnemyArt('autumn-boss'));
  if(actor.boss){kinds.add(input.kind);if(input.kind==='guard')assert.equal(s.rest.pose,6);else{assert.equal(s.preparation.pose,4);assert([1,3,5].includes(s.impact.pose));}}
  assert.equal(JSON.stringify(battle),before);assert.deepEqual(restoreExpeditionCombat(battle),battle);assert(bossCommands<100);
 }
 assert.deepEqual([...kinds].sort(),['attack','guard','skill1']);assert(returnedDamage);assert(seen.has('returnWarning'));assert(seen.has('counterReady'));assert(seen.has('protection'));assert(enemyTurns>=36);
 console.log(`PASS Autumn seven native contact sets with explicit occluded exclusions; 36 simulated normal/elite battles/${accepted} actions/${enemyTurns} enemy turns; boss AI/${bossCommands} commands with returns/guard; exact restore`);
}
const css=readFileSync(new URL('../src/expedition/view.css',import.meta.url),'utf8'),view=readFileSync(new URL('../src/expedition/view.js',import.meta.url),'utf8');
assert.match(css,/background-size:400% 200%/);assert.match(css,/translate:0 var\(--pose-impact-offset,0%\)/);assert.match(css,/prefers-reduced-motion:reduce.*pose-impact-offset/s);
assert(!/exv-enemy-sheet[^}]*scaleX\(-1\)/.test(css),'authored face-left sheet must not be mirrored away from allies');
assert.match(view,/if\(art\?\.motionPath\)return sheetSprite/);assert(!view.includes('ENEMY_MOTION_CANDIDATES'),'no eager 56 atlas gallery in view');
console.log('PASS Native normalized cells, per-pose offset/reduced-motion CSS and encounter-only sheet connection; physical frame/battery and human balance remain unverified');
