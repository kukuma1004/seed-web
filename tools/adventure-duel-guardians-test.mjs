import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ADVENTURE_DUEL_GUARDIANS as guardians,getAdventureGuardian,adventureGuardianFrame,adventureGuardianMotionFrame} from '../src/adventure-duel-guardians.js';
import {ADVENTURE_BOSSES} from '../src/seed-adventure-rules.js';
import {DUEL_BATCH04} from '../src/seed-duel-batch04.js';
import {DUEL_BATCH05} from '../src/seed-duel-batch05.js';
const fixture=JSON.parse(readFileSync(new URL('./duel-motion-art-fixture.json',import.meta.url),'utf8')).characters;
const duel={...DUEL_BATCH04,...DUEL_BATCH05};
const supported=new Set(['charge','slam','punches','pitch','swing','rain','spiral','strikes','triple','curve','beam','chase']);
assert.deepEqual(Object.keys(guardians),['austin','alwaysbeginner','tempestcarrier']);
assert.deepEqual(Object.values(ADVENTURE_BOSSES).map(b=>b.hp),[3500,5600,14000],'legacy rewards/HP identities remain separate from presentation');
let totalBytes=0;
for(const [id,g] of Object.entries(guardians)){
  assert.equal(g.bossId,id);assert.equal(g.legacyName,ADVENTURE_BOSSES[id].name);
  assert.equal(duel[g.fighterId].comboId,g.fighterId,'shipping canonical Duel combo, not unrelated identity');
  assert.ok(g.name.startsWith(g.legacyName+' · '));
  assert.ok(Object.isFrozen(g)&&Object.isFrozen(g.frames)&&Object.isFrozen(g.patterns)&&Object.isFrozen(g.tellSeconds));
  assert.equal(g.files.length,1,'one lazy file for current guardian, no whole roster');
  const bytes=readFileSync(new URL('../public/assets/'+g.files[0],import.meta.url));
  const baseline=fixture[g.fighterId];
  assert.equal(bytes.length,baseline.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),baseline.sha256);
  assert.equal(1+bytes.readUIntLE(24,3),g.width);assert.equal(1+bytes.readUIntLE(27,3),g.height);
  assert.equal(baseline.cellEdgeAlpha,0);assert.ok(bytes.length<400000);totalBytes+=bytes.length;
  assert.equal(g.frames.length,8);assert.equal(new Set(g.frames.map(f=>f.src.join(','))).size,8);
  for(const [i,f] of g.frames.entries()){
    const [x,y,w,h]=f.src;
    assert.ok(x>=0&&y>=0&&x+w<=g.width&&y+h<=g.height);
    const pose=baseline.poses[i];assert.deepEqual(f.src,[i%4*512+pose[0],Math.floor(i/4)*512+pose[1],pose[2],pose[3]]);
    assert.ok(f.foot[0]>0&&f.foot[0]<w&&f.foot[1]>0&&f.foot[1]<h);
    assert.ok(Math.abs(f.dst[0]+f.foot[0]/g.pixelsPerUnit)<1e-9);
    assert.ok(Math.abs(f.dst[1]+f.foot[1]/g.pixelsPerUnit)<1e-9,'unchanged crop-floor anchor lands at worldY0');
    assert.ok(h/g.pixelsPerUnit*g.displayScale<3.5,'headroom remains below existing3.9boss sprite');
    assert.equal(adventureGuardianFrame(id,i),f,'cached frame, allocation-free accessor');
  }
  for(const kind of g.patterns){assert.ok(supported.has(kind));assert.ok(g.tellSeconds[kind]>=.5&&g.tellSeconds[kind]<=1.05,'telegraph remains readable');}
  for(const [from,to] of Object.entries(g.combo)){assert.ok(g.patterns.includes(from)&&supported.has(to));}
  assert.deepEqual(g.recovery,{normal:1,enraged:.72,follow:.08});
  assert.equal(adventureGuardianMotionFrame({bossId:id,tell:0,cd:0},{}),0);
  assert.equal(adventureGuardianMotionFrame({bossId:id,tell:.4,flash:.1},{}),7,'hurt overrides windup');
  assert.equal(adventureGuardianMotionFrame({bossId:id,tell:.4},{}),4);
  assert.equal(adventureGuardianMotionFrame({bossId:id,charging:.45},{}),1);
  assert.equal(adventureGuardianMotionFrame({bossId:id,charging:.1},{}),3);
  assert.equal(adventureGuardianMotionFrame({bossId:id,beam:{t:1}},{}),5);
  assert.equal(adventureGuardianMotionFrame({bossId:id,cd:1},{lastKind:'pitch',attackAge:.15}),2);
  assert.equal(adventureGuardianMotionFrame({bossId:id,cd:1},{lastKind:'pitch',attackAge:.4}),6);
  assert.equal(adventureGuardianMotionFrame({bossId:id,cd:1},{lastKind:'pitch',attackAge:4}),0,'old attack cannot hold action pose');
}
assert.ok(totalBytes<1100000,'all existing sheets under1.1MB; current boss needs only310-400KB');
assert.equal(getAdventureGuardian('__proto__'),null);assert.equal(getAdventureGuardian('unknown'),null);
assert.equal(adventureGuardianFrame('unknown',1),null);assert.equal(adventureGuardianFrame('austin',99),guardians.austin.frames[0]);
assert.equal(adventureGuardianMotionFrame(null),0);
const src=readFileSync(new URL('../src/adventure-duel-guardians.js',import.meta.url),'utf8');
assert.ok(!/^import /m.test(src),'no Duel combat or art registry dependencies in browser adapter');
assert.ok(!src.includes('Math.random')&&!src.includes('Date.now'),'motion does not create an independent attack clock');
console.log('Adventure guardian canonical identities, exact audited8pose assets, crop-floor anchors, combat cadence/headroom,8states and lazy budget PASS. Live visual/device approval remains lead-owned.');
