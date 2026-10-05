import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {titleState} from '../src/titles.js';
import {createTitleCombatBinding,refreshAdventureTitleHp} from '../src/title-combat-bonuses.js';
import {createDefense,defenseHurt,plantDefense,stepDefense,defenseTowerStats,defenseWaveInfo,checkpointDefense,restoreDefense,DEFENSE_FORMS} from '../src/seed-defense-rules.js';
import {createDefenseCombat} from '../src/seed-defense-combat.js';
import {createAdventure,startAdventure,stepAdventure,attackAdventure,dodgeAdventure,adventureFormHit,adventureCheckpoint,restoreAdventure,ADVENTURE_ARENA} from '../src/seed-adventure-rules.js';
import {createAdventureCombat} from '../src/seed-adventure-combat.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
let uid='same',practice=false,info=titleState({crystal:true,crystalVeteran:true,johan:true,johanVeteran:true,austin:true,austinVeteran:true,alwaysBeginner:true,alwaysVeteran:true,crosswind:true,crosswindVeteran:true,austinClear:true,alwaysClear:true,johanClear:true,crosswindClear:true,crystalClear:true});
const binding=createTitleCombatBinding({owner:'same',currentOwner:()=>uid,practice:()=>practice,titleStats:()=>info});
const dummy=(id,x,y)=>({id,type:'hound',kind:'normal',role:'melee',x,y,hp:1e6,maxHp:1e6,r:.42,progress:0,speed:0,cd:1000,tell:0,slow:0,frost:0,flash:0,pattern:0});
function td(law='pierce',title=true){const s=createDefense(7);if(title)binding.attach(s);plantDefense(s,1);const t=s.towers[0];Object.assign(t,{laws:[law],line:law,lawRanks:{[law]:1}});s.phase='wave';s.wave=1;s.spawned=defenseWaveInfo(1).count;s.enemies=[{...dummy(100,t.x,t.y-9),progress:t.x+4,slow:1,slowTime:0,attackTime:99}];return s;}
function adventure(law='recall',title=true){const s=createAdventure(42);startAdventure(s,'slash',law);s.region=null;s.arena={...ADVENTURE_ARENA};s.enemies=[dummy(100,13,10),dummy(101,14,10)];s.props=[];s.player.x=12;s.player.y=10;s.player.aimX=1;s.player.aimY=0;s.player.attack=0;s.player.inv=1000;if(title)binding.attach(s);return s;}
function tick(s,seconds,combat){for(let i=0;i<seconds*60;i++)stepAdventure(s,1/60,{},combat);}
// Direct final damage and base attacks apply power exactly once.
{
 const s=td();defenseHurt(s,s.enemies[0],100);close(1e6-s.enemies[0].hp,108);assert.equal(s.coreHp,20);
 const a=adventure(),b=adventure('recall',false);attackAdventure(a);attackAdventure(b);close((1e6-a.enemies[0].hp)/(1e6-b.enemies[0].hp),1.08);close(a.player.attack,b.player.attack/1.1);
 // A derived chain receives the title multiplier once, not again at each hop.
 a.player.attack=0;b.player.attack=0;a.laws=b.laws=['chain'];a.ranks=b.ranks={chain:1};a.enemies=b.enemies.map(e=>dummy(e.id,e.x,e.y));b.enemies=b.enemies.map(e=>dummy(e.id,e.x,e.y));attackAdventure(a);attackAdventure(b);for(let i=0;i<2;i++)close((1e6-a.enemies[i].hp)/(1e6-b.enemies[i].hp),1.08);
 const c=adventure();c.enemies=[];const x=c.player.x;stepAdventure(c,.05,{x:1});close(c.player.x-x,5.6*.05*1.15);dodgeAdventure(c,1,0);close(c.player.dash,.9/1.1);
 const d=td('recall');stepDefense(d,.001);close(d.towers[0].shotTime,defenseTowerStats(d.towers[0]).interval/1.1);
}
// Real basic bullet rolls are restricted to pierce, and already-born shots lose
// account-derived critical damage when their original account is no longer active.
let lucky=0;while(((Math.imul(lucky,1664525)+1013904223)>>>0)/4294967296>=.03)lucky++;
{
 info=titleState({crosswind:true,crosswindVeteran:true});
 const s=td();s.rng=lucky;stepDefense(s,.001);assert.equal(s.shots[0].critical,true);const q=s.shots[0];q.x=s.enemies[0].x-.1;q.y=s.enemies[0].y;q.vx=48;q.vy=0;const damage=q.damage;stepDefense(s,.005);close(1e6-s.enemies[0].hp,damage*1.5);
 const plain=td('burst');plain.rng=lucky;stepDefense(plain,.001);assert.equal(plain.shots[0].critical,false);assert.equal(plain.rng,lucky,'non-pierce titles do not consume seeded RNG');
 const crossed=td();crossed.rng=lucky;stepDefense(crossed,.001);const b=crossed.shots[0];uid='other';b.x=crossed.enemies[0].x-.1;b.y=crossed.enemies[0].y;b.vx=48;b.vy=0;stepDefense(crossed,.005);close(1e6-crossed.enemies[0].hp,b.damage);uid='same';
 const a=adventure('pierce');a.seed=lucky;adventureFormHit(a,a.enemies[0],100,{criticalEligible:true});close(1e6-a.enemies[0].hp,150);
 const no=adventure();no.seed=lucky;adventureFormHit(no,no.enemies[0],100);close(1e6-no.enemies[0].hp,100);assert.equal(no.seed,lucky);
}
// Shared canonical form adapters, including passive and twin effects, use the
// same final-damage title boundary. A power-only fixture removes crit variance.
{
 info=titleState({crystal:true,crystalVeteran:true});
 for(const id of ['collapse','thunderlance','frostguard','returnblade','lightningmirror']){
  const f=DEFENSE_FORMS[id];const pair=[td('recall',false),td('recall')];
  for(const s of pair){const t=s.towers[0];Object.assign(t,{formId:id,laws:[...f.requires],lawRanks:Object.fromEntries(f.requires.map(l=>[l,1]))});s.enemies[0].x=t.x+3;s.enemies[0].y=t.y;s.enemies[0].progress=t.x+4;const c=createDefenseCombat(s);for(let i=0;i<300;i++)stepDefense(s,1/60,c);c.dispose();}
  close(pair[1].stats.damage/pair[0].stats.damage,1.03);
  const ap=[adventure('recall',false),adventure()];for(const s of ap){s.formId=id;s.laws=[...f.requires];s.ranks=Object.fromEntries(f.requires.map(l=>[l,1]));const c=createAdventureCombat(s);tick(s,5,c);c.dispose();}
  const lost=s=>s.enemies.reduce((n,e)=>n+1e6-e.hp,0);assert(lost(ap[0])>0,id);close(lost(ap[1])/lost(ap[0]),1.03);
 }
}
// Practice and UID changes cannot receive title effects; integer building HP
// and raw TD checkpoints are unchanged by account-derived modifiers.
{
 const s=td();practice=true;defenseHurt(s,s.enemies[0],100);close(1e6-s.enemies[0].hp,100);practice=false;uid='other';defenseHurt(s,s.enemies[0],100);close(1e6-s.enemies[0].hp,200);uid='same';
 s.phase='build';s.wave=0;const saved=checkpointDefense(s);assert(!Object.hasOwn(saved,'titleHp'));assert(!Object.hasOwn(saved,'titleCombat'));assert.equal(saved.coreHp,20);assert.equal(restoreDefense(saved).coreHp,20);
}
// Actual adventure checkpoints use raw growth HP + a bounded derived marker.
// Five save/resume cycles retain low absolute health, including growth, and
// old unmarked checkpoints never grant a free title heal.
{
 info=titleState({alwaysBeginner:true,alwaysVeteran:true,austinClear:true,crystalClear:true});let s=adventure();refreshAdventureTitleHp(s,{fresh:true});assert.equal(s.player.maxHp,122);s.player.maxHp+=10;s.player.hp=7;s.phase='doors';s.room=0;s.doors=[{room:'combat',reward:'law'}];
 for(let i=0;i<5;i++){const cp=adventureCheckpoint(s);assert.equal(cp.maxHp,110);close(cp.titleHp.health,7);s=restoreAdventure(JSON.stringify(cp));assert(s);binding.attach(s);refreshAdventureTitleHp(s);assert.equal(s.player.maxHp,132);close(s.player.hp,7);}
 const cp=adventureCheckpoint(s);uid='other';const other=restoreAdventure(cp);binding.attach(other);refreshAdventureTitleHp(other);assert.equal(other.player.maxHp,110);close(other.player.hp,7);uid='same';
 assert.equal(restoreAdventure({...cp,titleHp:{...cp.titleHp,health:30}}),null);assert.equal(restoreAdventure({...cp,titleHp:{...cp.titleHp,bonus:26}}),null);
 const old={...cp,hp:7};delete old.titleHp;const r=restoreAdventure(old);binding.attach(r);refreshAdventureTitleHp(r);assert.equal(r.player.maxHp,132);close(r.player.hp,7);
}
// Execute the actual view save functions in a VM. Practice/account switches
// leave original local/account save bytes and pending rewards untouched.
for(const [file,start,end,functions] of [
 ['seed-adventure-view.js','function readSave(){','function resetBossAccount(){',['readSave','clearSave','persist']],
 ['seed-defense-view.js','function save(){','function sound(',['save','clearSave']]
]){
 const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');let blocked=true,writes=0,reads=0,credits=0;const original='original-account-checkpoint';
 const ctx=vm.createContext({localSiege:false,isolated:()=>blocked,storage:{getItem(){reads++;return original;},setItem(){writes++;},removeItem(){writes++;}},state:{phase:'build'},actCount:3,canWriteDefensePreparation:()=>true,s:{},key:'save',saveKey:'save',owner:'same',ADVENTURE_SAVE_KEY:'old',adventureCheckpoint:()=>({}),adventureTombstone:()=>({}),checkpointDefense:()=>({}),restoreAdventure:()=>({}),adventureCredit:()=>1,onCredit:()=>{credits++;return '';},preparation:null,saveNote:'',creditNote:''});
 vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);for(const name of functions)ctx[name]();assert.equal(reads,0);assert.equal(writes,0);assert.equal(credits,0);blocked=false;ctx[functions.at(-1)]();assert.equal(writes,1);
 // Evaluate the real isolation predicate, including the original guest local
 // checkpoint path; guest may save, but never receives account title stats.
 const declaration=source.split('\n').find(line=>line.includes('const isolated='));
 ctx.owner='guest';ctx.currentOwner=()=>ctx.owner;ctx.practice=false;
 vm.runInContext(declaration.replace('const isolated=', 'isolated='),ctx);
 assert.equal(ctx.isolated(),false);assert.equal(createTitleCombatBinding({owner:'guest',currentOwner:()=> 'guest',titleStats:()=>info}).get().power,1);
 const before=writes;ctx[functions.at(-1)]();assert.equal(writes,before+1,'same-owner guest local save survives');
 if(file==='seed-adventure-view.js'){const r=reads;assert(ctx.readSave());assert(reads>r,'same-owner guest local resume still reads original bytes');assert.equal(writes,before+1);}
 ctx.currentOwner=()=> 'different';const after=writes;for(const name of functions)ctx[name]();assert.equal(writes,after,'guest UID transition cannot overwrite the old checkpoint');
 ctx.currentOwner=()=> 'guest';ctx.practice=true;for(const name of functions)ctx[name]();assert.equal(writes,after,'guest practice leaves the ordinary checkpoint untouched');
}
console.log('Titles in TD/adventure: actual basic/shared-form HP damage, once-only scaling, cooldown/movement, limited seeded crit, UID/practice neutrality, integer TD core and five low-health checkpoint resumes passed. Source VM/local engines; authenticated devices and visual QA not performed.');
