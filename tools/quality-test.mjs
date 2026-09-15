import assert from 'node:assert/strict';
import {QUALITY_LEVELS,QUALITY_NAMES,initialQuality,createQualityGovernor,GOVERNOR,clampLevel} from '../src/quality.js';

// Levels get cheaper step by step and never change gameplay fields.
assert.equal(QUALITY_LEVELS.length,3);assert.equal(QUALITY_NAMES.length,3);
assert.ok(QUALITY_LEVELS[0].pixelRatio<QUALITY_LEVELS[1].pixelRatio&&QUALITY_LEVELS[1].pixelRatio<QUALITY_LEVELS[2].pixelRatio);
assert.deepEqual(QUALITY_LEVELS.map(q=>q.bloom),['off','half','full']);
assert.deepEqual(QUALITY_LEVELS.map(q=>q.shadows),[false,true,true]);
assert.deepEqual(QUALITY_LEVELS.map(q=>q.lanternLights),[false,false,true]);

// Start level: URL override > saved device level > phone 1 / computer 2.
assert.equal(initialQuality({mobile:false}),2);assert.equal(initialQuality({mobile:true}),1);
assert.equal(initialQuality({stored:'0'}),0);assert.equal(initialQuality({stored:'1',mobile:false}),1);
assert.equal(initialQuality({search:'?quality=2',stored:'0'}),2);
assert.equal(initialQuality({search:'?quality=9',stored:'1'}),2,'out of range clamps');
assert.equal(initialQuality({stored:'junk',mobile:false}),2);assert.equal(clampLevel(1.5),null);

// Fast device: stays where it started.
{const g=createQualityGovernor(2);for(let i=0;i<60*20;i++)g.sample(16.7);assert.equal(g.state().level,2);assert.equal(g.state().drops,0);}

// Slow device (~30 fps): drops one level after two slow windows, waits, then drops again, never below 0.
{
 const changes=[];const g=createQualityGovernor(2,{onChange:l=>changes.push(l)});
 const run=seconds=>{for(let t=0;t<seconds*1000;t+=33)g.sample(33);};
 run(GOVERNOR.settleSeconds+GOVERNOR.windowSeconds*GOVERNOR.slowWindowsToDrop+.2);
 assert.equal(g.state().level,1,'first drop');
 run(GOVERNOR.settleSeconds+GOVERNOR.windowSeconds*GOVERNOR.slowWindowsToDrop+.2);
 assert.equal(g.state().level,0,'second drop');
 run(60);assert.equal(g.state().level,0);assert.deepEqual(changes,[1,0]);
}
// One slow window (a busy moment) is not enough; neither are paused frames or tab-switch stalls.
{
 const g=createQualityGovernor(2);
 for(let t=0;t<GOVERNOR.settleSeconds*1000+50;t+=16)g.sample(16);
 for(let t=0;t<GOVERNOR.windowSeconds*1000+50;t+=40)g.sample(40);
 for(let t=0;t<GOVERNOR.windowSeconds*1000+50;t+=16)g.sample(16);
 for(let t=0;t<GOVERNOR.windowSeconds*1000+50;t+=40)g.sample(40);
 assert.equal(g.state().level,2,'isolated slow windows do not drop');
 for(let i=0;i<500;i++){g.sample(50,false);g.sample(900);}
 assert.equal(g.state().level,2,'paused frames and long stalls are ignored');
}
// Very slow device (~20 fps): goes straight to low instead of waiting through medium.
{const g=createQualityGovernor(2);for(let t=0;t<(GOVERNOR.settleSeconds+GOVERNOR.windowSeconds*2+.5)*1000;t+=50)g.sample(50);assert.equal(g.state().level,0);assert.equal(g.state().drops,1);}
// Around 55 fps stays on high.
{const g=createQualityGovernor(2);for(let t=0;t<30000;t+=18)g.sample(18);assert.equal(g.state().level,2);}
console.log('Quality: three render levels, start level (URL/saved/device), steady devices keep quality, slow devices step down once per settle, stalls and pauses ignored passed.');
