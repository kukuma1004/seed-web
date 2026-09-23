import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOSS_PET_KEY,BOSS_PETS,unlockedBossPets,normalizeBossPet,readBossPet,writeBossPet,bossPetTarget,stepBossPet} from '../src/boss-pets.js';

const profile={bosses:['warden','austin','alwaysbeginner']};
const data=new Map();
const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};

assert.deepEqual(unlockedBossPets(profile).map(pet=>pet.id),['austin','alwaysbeginner']);
assert.equal(BOSS_PETS.tempestcarrier.id,'tempestcarrier');
for(const pet of Object.values(BOSS_PETS)){
 const png=readFileSync(new URL(`../public/assets/${pet.file}`,import.meta.url));
 assert.equal(png.readUInt32BE(16),384,`${pet.id} width`);
 assert.equal(png.readUInt32BE(20),384,`${pet.id} height`);
 assert.equal(png[25],6,`${pet.id} has alpha`);
 assert(png.byteLength<250_000,`${pet.id} lightweight texture`);
}
assert.equal(writeBossPet(storage,profile,'tempestcarrier',10).saved,false);
assert.equal(data.has(BOSS_PET_KEY),false);
assert.equal(writeBossPet(storage,profile,'austin',20).saved,true);
assert.deepEqual(readBossPet(storage,profile),{version:1,id:'austin',updatedAt:20});
assert.equal(readBossPet(storage,{bosses:[]}).id,null);
assert.equal(writeBossPet(storage,profile,null,30).selection.id,null);
assert.equal(normalizeBossPet({id:'not-a-boss',updatedAt:-1}).id,null);

const target=bossPetTarget(10,10,1,0);
assert.deepEqual(target,{x:9.18,z:9.58});
const next=stepBossPet({x:0,z:0},{x:1,z:0},.016);
assert(next.x>0&&next.x<1);
assert.deepEqual(stepBossPet({x:0,z:0},{x:10,z:10},.016),{x:10,z:10});
assert.deepEqual(stepBossPet({x:1,z:2},{x:5,z:3},0),{x:1,z:2});

console.log('boss pet unlock, selection and follow tests passed');
