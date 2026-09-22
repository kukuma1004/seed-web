import assert from 'node:assert/strict';
import {escortWave,escortTypes} from '../src/boss-escorts.js';
import {validCheckpoint,writeCheckpoint,readCheckpoint} from '../src/run-save.js';
import {FORMS} from '../src/forms.js';
const base={version:1,cycle:0,region:'garden',stage:0,mode:'entry',hp:100,rules:[],mutated:[],kills:0,elapsed:0};
assert.equal(validCheckpoint(base),true,'old saves remain valid');
const storage={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};
for(const form of Object.values(FORMS)){
 const checkpoint={...base,rules:[...form.requires],form:form.id,guideTarget:form.id,rerollUsed:true};
 assert.equal(writeCheckpoint(storage,checkpoint),true);
 {const {savedAt,...saved}=readCheckpoint(storage);assert.deepEqual(saved,checkpoint);assert.ok(savedAt>0,'저장 시각');}
 assert.equal(validCheckpoint({...checkpoint,rules:[form.requires[0]]}),false);
}
assert.equal(validCheckpoint({...base,form:'toString'}),false);
assert.equal(validCheckpoint({...base,guideTarget:'unknown'}),false);
assert.equal(validCheckpoint({...base,rerollUsed:'yes'}),false);
let waves=0,total=0;
for(const hp of [1000,950,670,500,340,300,1,0]){
 const next=escortWave(hp,1000,waves);
 if(next>=0){assert.equal(next,waves);total+=escortTypes(next).length;waves++;}
}
assert.equal(waves,3);assert.equal(total,6);
for(let i=0;i<100;i++)assert.equal(escortWave(1,1000,waves),-1);
console.log('Identity: old/new saves, invalid form rejection, finite escort thresholds passed');
