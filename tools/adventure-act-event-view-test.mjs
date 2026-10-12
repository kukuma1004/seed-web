import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {adventureObjective,adventureEventName,adventureIngressLabel,adventureEventReward} from '../src/adventure-wayfinding.js';
import {createAdventure,startAdventure} from '../src/seed-adventure-rules.js';

for(const act of [0,1,2]){
 const s=createAdventure(13);s.room=act*4;startAdventure(s,'slash','recall');const ev=s.region.events[act===2?1:0];ev.state='active';s.player.x=ev.x;s.player.y=ev.y;
 const before=JSON.stringify(s),o=adventureObjective(s);assert.equal(o.kind,ev.type);assert.ok(o.label.includes(act===1?'꽃등 따라가기':act===2?'달꽃 제단':'습격지'));assert.equal(JSON.stringify(s),before,'objective is derived without mutation or RNG');
 if(act===1){s.player.x=ev.x+ev.r+.2;assert.ok(adventureObjective(s).label.endsWith('빛 안으로'));}
 ev.state='done';assert.equal(adventureObjective(s).kind,'guards','completed challenge restores the exit objective');
}
assert.equal(adventureEventName({type:'guard'}),'제단 수호','legacy untagged event remains supported');
const source=readFileSync(new URL('../src/seed-adventure-view.js',import.meta.url),'utf8');
const start=source.indexOf(' function paintRegionMarks(){'),end=source.indexOf(' function label(',start);assert.ok(start>=0&&end>start);
const labels=[],circles=[],items=[],ellipses=[],noop=()=>{};
const ctx=new Proxy({ellipse:(...a)=>ellipses.push(a)},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
const ev={type:'raid',variant:'flowertrail',state:'active',time:4,duration:16,x:40,y:26,r:3.4,origin:{x:44,y:26},trailEnd:{x:34,y:29}};
const s={time:5,props:[],region:{events:[ev],gate:{x:49,y:10,open:false}}};
const c=vm.createContext({s,ctx,scale:20,assets:{},point:(x,y)=>({x:x*20,y:y*20}),circle:(...a)=>circles.push(a),label:(...a)=>labels.push(a),itemSprite:(...a)=>items.push(a),glow:noop,adventureEventName,adventureEventReward});vm.runInContext(source.slice(start,end),c);
const before=JSON.stringify(s);c.paintRegionMarks();assert.equal(JSON.stringify(s),before);assert.ok(labels.some(a=>a[2]==='꽃등 따라가기 · 12초'));assert.ok(circles.some(a=>a[3]==='#b7f6d5bb'),'friendly moving zone is distinguished from red attack tells');assert.equal(items.length,1,'uses one existing item image, no new particle system');
const portals=[{x:14,y:9},{x:40,y:9},{x:27,y:19}],guard={type:'guard',variant:'moonaltar',x:27,y:8,hp:90,maxHp:100,state:'active',wave:2,waves:3,spawned:0,portal:portals[1],nextPortal:portals[2],portals};
assert.equal(adventureIngressLabel(guard),'아래 문 대기','offscreen entrance is also announced by direction in the HUD');
s.region.events=[guard];labels.length=0;c.paintRegionMarks();assert.ok(labels.some(a=>a[0]===27&&a[1]===17.9&&a[2]==='다음 무리'),'third entrance is previewed in the second-to-third lull');assert.ok(labels.some(a=>a[2]==='달꽃 제단 · 3/3번째 무리'));
guard.spawned=1;labels.length=0;c.paintRegionMarks();assert.ok(!labels.some(a=>a[2]==='다음 무리'),'final active wave does not preview an impossible fourth wave');
guard.wave=3;guard.spawned=0;labels.length=0;c.paintRegionMarks();assert.ok(!labels.some(a=>a[2]==='다음 무리'));
// Completed event caches temporarily guide nearby players without changing
// rewards, blocking the gate, or continuing to point to a broken/absent cache.
guard.state='done';guard.cacheId=31;s.props=[{id:31,kind:'cache',hp:1,x:27,y:8}];s.player={x:27,y:8};s.phase='playing';s.region.gate.open=true;
const rewardBefore=JSON.stringify(s);assert.equal(adventureObjective(s).kind,'cache');assert.equal(JSON.stringify(s),rewardBefore);
labels.length=0;c.paintRegionMarks();assert.ok(labels.some(a=>a[2]==='✦ 도전 보물 · 공격해서 열기'));
s.player.x=40;assert.equal(adventureObjective(s).kind,'exit','leaving the optional reward never forces a return');
s.player.x=27;s.props[0].hp=0;assert.equal(adventureObjective(s).kind,'exit','broken cache immediately restores main goal');
s.props[0].hp=1;s.props[0].id=32;assert.equal(adventureObjective(s).kind,'exit','unrelated cache cannot steal this event cue');
console.log('PASS Adventure stage-event view: read-only names/objectives, follow-zone feedback, reused item art, exact third-lull entrance and no fourth wave. Controlled Canvas VM, not browser/device proof.');
