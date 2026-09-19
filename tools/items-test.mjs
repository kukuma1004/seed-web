import assert from 'node:assert/strict';
import {STARTING_ITEMS,startingInventory,ITEMS,ITEM_ORDER,emptyInventory,normalizeInventory,validInventory,addItem,useItem,drinkPotion,tryRevive,austinDrops,austinBonus,AUSTIN_BONUS,BOSS_SPROUT_CHANCE,TURRET_POTION_CHANCE,TURRET_POTION_PITY,turretPotionDrop,nextHeld,heldItems,usable} from '../src/inventory.js';
import {validCheckpoint} from '../src/run-save.js';

// Every kind is listed once, in screen order, with a stack limit.
assert.deepEqual([...ITEM_ORDER].sort(),Object.keys(ITEMS).sort());
for(const id of ITEM_ORDER)assert.ok(Number.isInteger(ITEMS[id].max)&&ITEMS[id].max>0,`${id} has a stack limit`);
assert.deepEqual(emptyInventory(),{potion:0,tonic:0,wind:0,shell:0,sprout:0});

// Healing potions are refused at full health and spend nothing.
const inv=emptyInventory();addItem(inv,'tonic',2);
assert.deepEqual(useItem(inv,'tonic',{hp:100}),{ok:false,reason:'full',hp:100});assert.equal(inv.tonic,2);
const small=useItem(inv,'tonic',{hp:90});assert.equal(small.ok,true);assert.equal(small.hp,100);assert.equal(small.healed,10);assert.equal(inv.tonic,1);
assert.equal(useItem(inv,'tonic',{hp:40}).hp,65,'small potion heals 25');
assert.equal(useItem(inv,'tonic',{hp:40}).reason,'empty');

// Wind and shell work at any health and report how long they last.
addItem(inv,'wind',1);addItem(inv,'shell',1);
assert.deepEqual(useItem(inv,'wind',{hp:100}),{ok:true,kind:'haste',hp:100,seconds:ITEMS.wind.seconds});
assert.deepEqual(useItem(inv,'shell',{hp:100}),{ok:true,kind:'shell',hp:100,seconds:ITEMS.shell.seconds});
assert.ok(ITEMS.wind.speed>1&&ITEMS.shell.seconds>0);
assert.equal(inv.wind,0);assert.equal(inv.shell,0);

// A sprout cannot be drunk; it is spent only when the seed falls, once.
addItem(inv,'sprout',5);assert.equal(inv.sprout,1,'only one sprout at a time');
assert.equal(useItem(inv,'sprout',{hp:10}).reason,'passive');assert.equal(inv.sprout,1);
assert.deepEqual(tryRevive(inv),{hp:ITEMS.sprout.heal,guard:ITEMS.sprout.guard});assert.equal(inv.sprout,0);
assert.equal(tryRevive(inv),null,'no second revive');
assert.equal(usable('sprout'),false);assert.equal(usable('wind'),true);assert.equal(usable('nothing'),false);

// Stacks stop at their limit and unknown kinds are ignored.
const full=emptyInventory();assert.equal(addItem(full,'shell',10),ITEMS.shell.max);assert.equal(addItem(full,'shell',1),0);assert.equal(addItem(full,'elixir',1),0);
assert.equal(useItem(full,'elixir',{hp:10}).reason,'unknown');

// The old potion call still behaves the same.
const old=emptyInventory();addItem(old,'potion',1);assert.equal(drinkPotion(old,100).reason,'full');assert.equal(drinkPotion(old,30).hp,80);

// Austin gives the main item bundle: always the big potion, plus one bonus kind that is not already full.
assert.deepEqual(austinDrops(()=>0),['potion','potion']);assert.deepEqual(austinDrops(()=>.999),['potion','sprout']);
assert.match(ITEMS.potion.from,/오스틴/);assert.match(ITEMS.potion.from,/항상초심/);
assert.equal(ITEMS.tonic.from,'상점 · 포탑');
for(const id of ['wind','shell','sprout']){assert.match(ITEMS[id].from,/오스틴/);assert.match(ITEMS[id].from,/항상초심/);}
for(const id of ['potion','tonic','wind','shell'])assert.equal(ITEMS[id].max,5,`${id} run stack is capped at five`);
assert.deepEqual(AUSTIN_BONUS.map(([id])=>id),['potion','wind','shell','sprout']);
assert.equal(BOSS_SPROUT_CHANCE,.01);assert.equal(AUSTIN_BONUS.reduce((sum,[,weight])=>sum+weight,0),100);assert.equal(AUSTIN_BONUS.find(([id])=>id==='sprout')[1],1);
let seed=7;const rand=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;const tally={potion:0,wind:0,shell:0,sprout:0};
for(let i=0;i<4000;i++)tally[austinBonus(rand)]++;
assert.ok(tally.potion>tally.wind&&tally.potion>tally.shell&&tally.sprout>=20&&tally.sprout<=60,JSON.stringify(tally));
const sproutHeld={...emptyInventory(),sprout:1};for(let i=0;i<300;i++)assert.notEqual(austinBonus(rand,sproutHeld),'sprout','a held sprout is never drawn again');
const onlySproutOpen={potion:5,tonic:5,wind:5,shell:5,sprout:0};assert.equal(austinBonus(()=>.5,onlySproutOpen),null,'full ordinary stacks do not inflate revive odds');assert.equal(austinBonus(()=>.995,onlySproutOpen),'sprout');
const allFull={potion:5,tonic:5,wind:5,shell:5,sprout:1};assert.equal(austinBonus(rand,allFull),null);assert.deepEqual(austinDrops(rand,allFull),['potion']);
const onePotionSlot={...emptyInventory(),potion:4};assert.notDeepEqual(austinDrops(()=>0,onePotionSlot),['potion','potion'],'guaranteed reward reserves the last potion slot');

// A turret has a 5% small-potion chance, with a guaranteed drop on the tenth dry kill.
assert.equal(TURRET_POTION_CHANCE,.05);assert.equal(TURRET_POTION_PITY,10);
assert.deepEqual(turretPotionDrop(0,()=>0),{drop:true,dryKills:0});
assert.deepEqual(turretPotionDrop(0,()=>.5),{drop:false,dryKills:1});
assert.deepEqual(turretPotionDrop(8,()=>.5),{drop:false,dryKills:9});
assert.deepEqual(turretPotionDrop(9,()=>.5),{drop:true,dryKills:0});

// One button can cycle through what is actually held, skipping empty and passive kinds.
const bag=emptyInventory();assert.equal(nextHeld(bag),null);
addItem(bag,'tonic',1);addItem(bag,'shell',1);addItem(bag,'sprout',1);
assert.equal(nextHeld(bag),'tonic');assert.equal(nextHeld(bag,'tonic'),'shell');assert.equal(nextHeld(bag,'shell'),'tonic');assert.equal(nextHeld(bag,'wind'),'tonic');
assert.deepEqual(heldItems(bag),['tonic','shell','sprout']);

// Saves: old {potion} inventories stay valid; new kinds are validated against their limits.
assert.ok(validInventory(undefined)&&validInventory({potion:3})&&validInventory({potion:5,tonic:5,wind:5,shell:5,sprout:1}));
for(const bad of [{sprout:2},{tonic:6},{wind:-1},{elixir:1},[],{shell:5.5}])assert.ok(!validInventory(bad),JSON.stringify(bad));
assert.deepEqual(normalizeInventory({potion:99,tonic:2,sprout:4,junk:3}),{potion:ITEMS.potion.max,tonic:2,wind:0,shell:0,sprout:1});
assert.deepEqual(normalizeInventory('x'),emptyInventory());
const save={version:1,cycle:1,stage:0,mode:'entry',region:'garden',hp:80,rules:['split'],mutated:[],kills:3,elapsed:10,forms:{},wardens:1,austins:0};
assert.ok(validCheckpoint({...save,inventory:{potion:2}}),'legacy potion-only save');
assert.ok(validCheckpoint({...save,turretPotionDry:9}));assert.ok(!validCheckpoint({...save,turretPotionDry:-1}));
assert.ok(validCheckpoint({...save,inventory:{potion:0,tonic:1,wind:1,shell:0,sprout:1}}),'new bag save');
assert.ok(!validCheckpoint({...save,inventory:{sprout:3}}),'over-limit bag rejected');

// A fresh run is empty until the departure shop stock is claimed; Austin's big potion is boss-only.
assert.deepEqual(startingInventory(),emptyInventory());assert.deepEqual(STARTING_ITEMS,{});
{const a=startingInventory(),b=startingInventory();a.tonic=9;assert.equal(b.tonic,0);assert.ok(validInventory(b));}
console.log('Items: five potion kinds, healing rules, Austin rewards, turret pity drop, cycling and save compatibility passed.');
