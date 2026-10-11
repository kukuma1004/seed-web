import assert from 'node:assert/strict';
import {createCrystalSiege,buildCrystalSiege,startCrystalSiegeDefense,stepCrystalSiege,stepCrystalSiegePaidFacilities,createCrystalSiegeThreat,stepCrystalSiegeThreat,checkpointCrystalSiege,restoreCrystalSiege,applyCrystalSiegeSnare} from '../src/crystal-siege-rules.js';
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(kind){const s=createCrystalSiege();assert(buildCrystalSiege(s,'pad-0',kind,s.pads[0]).ok);startCrystalSiegeDefense(s);return s;}
const enemies=Array.from({length:100},(_,i)=>({id:'e'+i,x:-3+(i%3)*.1,z:-2.5,hp:100}));
{
 const s=setup('snare'),o=stepCrystalSiege(s,.05,{enemies});assert.equal(o.snares.length,24);assert.equal(new Set(o.snares.map(e=>e.id)).size,24);assert(enemies.every(e=>e.hp===100));
 assert.equal(stepCrystalSiege(s,0,{enemies}).snares.length,0);assert.equal(stepCrystalSiege(s,.05,{enemies}).snares.length,0);
 const raw=checkpointCrystalSiege(s);assert.deepEqual(checkpointCrystalSiege(restoreCrystalSiege(clone(raw))),raw);
 const old=clone(raw);delete old.paceVersion;old.pads[0].cooldown=0;const legacy=restoreCrystalSiege(old);assert.equal(stepCrystalSiege(legacy,.05,{enemies}).snares.length,1);
 const m=createCrystalSiegeThreat({id:'slow',position:{x:-3,z:-2.5},hp:100,speed:2,damage:5});assert(applyCrystalSiegeSnare(m,{facilityId:'pad-0',factor:.6,duration:.8}));s.pads[0].hp=0;
 for(let n=0;n<20;n++)stepCrystalSiegeThreat(m,.05,s);assert.equal(m.slowFactor,1);assert.equal(m.siegeSnares.length,0);
}
{
 const s=setup('wall'),packet={id:'lane',position:{x:-1,z:-2.5},hp:100,speed:2,damage:5},m=createCrystalSiegeThreat(packet);m.phase='approach';
 stepCrystalSiegeThreat(m,.05,s);assert(m.position.x<-1&&m.position.z===-2.5,'Nearby wall draws the actual approach away from heart');
 const old=clone(checkpointCrystalSiege(s));delete old.paceVersion;const legacy=restoreCrystalSiege(old),l=createCrystalSiegeThreat(packet);l.phase='approach';stepCrystalSiegeThreat(l,.05,legacy);assert(l.position.x>-1&&l.position.z>-2.5,'Old wall keeps close-intercept movement');
 const dead=setup('wall');dead.pads[0].hp=0;const d=createCrystalSiegeThreat(packet);d.phase='approach';stepCrystalSiegeThreat(d,.05,dead);assert(d.position.x>-1,'Broken wall cannot taunt or refill');
 const paused=clone(m);stepCrystalSiegeThreat(m,0,s);assert.deepEqual(m,paused);
}
{
 const s=setup('snare');s.phase='boss';const list=[{id:'boss',x:-3,z:-2.5,hp:1000},{id:'guard',x:-3,z:-2.5,hp:100,siegeGuard:true}];
 assert.deepEqual(stepCrystalSiegePaidFacilities(s,.05,list,{boss:true}).snares.map(e=>e.id),['guard'],'Only minions, never the real boss, are slowed');
}
console.log('Paid support roles PASS: bounded group pulse, old checkpoint single target/range, independent expiration, real wall approach and broken/pause/boss boundaries. Rule checks, not device/human balance.');
