import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDefense,plantDefense,placeDefensePad,mergeDefense,defenseMergeResult,defensePlacement,defenseSeedCap,DEFENSE,defenseTowerStats,defensePath,defensePathLength,startDefenseWave,stepDefense,checkpointDefense,restoreDefense} from '../src/seed-defense-rules.js';
import {defenseLearningHint,createDefenseLearningGuide,createDefenseLossObserver,defenseResultLearning} from '../src/defense-learning-guide.js';
import {defenseRangeSegments} from '../src/defense-tactical-guide.js';

const source=readFileSync('src/seed-defense-view.js','utf8'),css=readFileSync('src/seed-defense.css','utf8');
const fresh=createDefense(73),before=JSON.stringify(fresh),guide=createDefenseLearningGuide();
assert.match(guide(fresh,0).title,/길 앞쪽.*첫 법칙/);
assert.match(guide(fresh,7).title,/출구 쪽.*첫 법칙/);
assert.doesNotMatch(guide(fresh,7).body,/\d+.*사거리/,'unknown random law has no invented numeric range');
const same=guide(fresh,7);for(let i=0;i<120;i++)assert.equal(guide(fresh,7),same);
assert.equal(JSON.stringify(fresh),before,'no seed RNG, payment or checkpoint mutation');
assert.equal(guide(fresh,-1),null);

plantDefense(fresh,0,'pierce');assert.match(guide(fresh,0).body,/Lv\.1 → 2/);
fresh.currency=0;assert.match(guide(fresh,0).title,/햇살 40 더/);
assert.match(guide(fresh,1).title,/햇살 30 더/);
fresh.currency=1000;plantDefense(fresh,1);const a=fresh.towers[0],b=fresh.towers[1];
Object.assign(b,{line:'pierce',laws:['pierce'],lawRanks:{pierce:1}});
let pair=guide(fresh,0);assert.equal(pair.targetId,b.id);assert.match(pair.body,/오른쪽.*위로 끌어/);assert.equal(defenseMergeResult(fresh,a.id,pair.targetId).ok,true);
placeDefensePad(fresh,1,6,30);pair=guide(fresh,0);assert.equal(pair.targetId,b.id);assert.match(pair.body,/아래쪽/,'destination tracks real moved coordinates');
const checkpoint=JSON.stringify(checkpointDefense(fresh));assert.equal(mergeDefense(fresh,a.id,b.id),true);assert.notEqual(guide(fresh,0).targetId,b.id,'consumed source cannot keep a stale merge highlight');
const restored=restoreDefense(JSON.parse(checkpoint));assert.ok(restored);assert.equal(guide(restored,0).targetId,b.id);
restored.towers[1].tier=2;assert.equal(guide(restored,0).targetId,undefined,'matching line but different rank is not advertised');
restored.towers[1].tier=1;restored.towers[1].line='frost';restored.towers[1].laws=['frost'];assert.equal(guide(restored,0).targetId,undefined,'different lines are not advertised as fusion');
restored.towers[0].level=5;assert.match(guide(restored,0).title,/Lv\.5/);
const expansion=createDefense(7,{actCount:5});assert.equal(plantDefense(expansion,0,'pierce'),true);expansion.wave=37;
const et=expansion.towers[0];assert.ok(defensePath(expansion)!==defensePath(fresh));
assert.equal(Boolean(guide(expansion,0).title.includes('사거리')),defenseRangeSegments(defensePath(expansion),et.x,et.y,defenseTowerStats(et).range).length===0);
for(const phase of ['lost','won']){expansion.phase=phase;assert.equal(guide(expansion,0),null);}

// Real shipping planting prompt: empty slots must distinguish resources/cap/
// occupied cells. It does not permit a second paid action or first-law reroll.
const promptCode=source.slice(source.indexOf(' function updatePlantPrompt(){'),source.indexOf(' let starterPad=null;'));
function prompt(s,pad){const button={},tip={};let positioned=0;const c=vm.createContext({state:s,selected:pad,DEFENSE,defenseSeedCap,defensePlacement,learningGuide:createDefenseLearningGuide(),$:()=>button,setLabel:(id,text)=>{tip.text=text;},positionPlantPrompt(){positioned++;}});vm.runInContext(promptCode,c);c.updatePlantPrompt();return {button,tip,positioned};}
const empty=createDefense(84);assert.equal(prompt(empty,7).button.disabled,false);assert.match(prompt(empty,7).tip.text,/출구/);
empty.currency=0;assert.equal(prompt(empty,7).button.disabled,true);assert.match(prompt(empty,7).button.textContent,/햇살 30 더/);
empty.currency=10000;for(let i=0;i<8;i++)plantDefense(empty,i);assert.equal(prompt(empty,8).button.disabled,true);assert.match(prompt(empty,8).button.textContent,/가득/);
empty.towers.pop();empty.pads[8]={x:empty.towers[0].x,y:empty.towers[0].y};assert.match(prompt(empty,8).button.textContent,/다른 화단/);
assert.equal((source.match(/id="td-upgrade"/g)||[]).length,1);
assert.ok(source.indexOf('if(learning)html+=')<source.indexOf('if(t){const {current:stats,next}'),'next action precedes stat sheets in the small scrolling panel');

// The same wrapper called by the actual RAF observes the real combat rule.
const wrapper=source.slice(source.indexOf(' function stepLearningDefense(dt){'),source.indexOf(' function loop(now){'));
function host(s,code=wrapper){const observer=createDefenseLossObserver(),c=vm.createContext({state:s,stepDefense,combat:null,lossObserver:observer});vm.runInContext(code,c);return {c,observer,step:()=>c.stepLearningDefense(.05)};}
function leakFixture(kind='boss'){
 const s=createDefense(1);plantDefense(s,0,'pierce');startDefenseWave(s);s.spawned=100000;s.coreHp=kind==='boss'?4:1;
 const end=defensePathLength(s);s.enemies.push({id:900,x:104,y:48,progress:end-.01,hp:1e6,maxHp:1e6,kind,bossId:kind==='boss'?'austin':null,speed:10,slow:1,slowTime:0,attackTime:99,leakDamage:kind==='boss'?5:1});return s;
}
for(const kind of ['boss','fast','shield']){
 const s=leakFixture(kind),h=host(s);h.step();assert.equal(s.phase,'lost');assert.equal(s.leaked,1);assert.equal(h.observer.last().leaks,1);assert.equal(h.observer.last().kind,kind==='boss'?'boss-leak':'enemy-leak');
 const lesson=defenseResultLearning(s,h.observer.last());assert.match(lesson.cause,/길 끝을 통과/);assert.doesNotMatch(lesson.cause,/격파|승리/);
 if(kind==='boss')assert.match(lesson.cause,/−4.*보스/);if(kind==='fast')assert.match(lesson.next,/빙결/);
 assert.equal(checkpointDefense(s),null,'terminal observation cannot create a save');
}
const shot=createDefense(3);plantDefense(shot,0,'pierce');startDefenseWave(shot);shot.spawned=100000;shot.coreHp=1;
shot.shots.push({id:901,x:104,y:48,tx:104,ty:48,vx:0,vy:0,speed:17,life:12,age:0,law:'hostile',damage:1,hit:[],ownerId:900});
const sh=host(shot);sh.step();assert.equal(shot.phase,'lost');assert.equal(shot.leaked,0);assert.equal(sh.observer.last().kind,'core-attack');assert.match(defenseResultLearning(shot,sh.observer.last()).cause,/적 통과 없이/);
const coreReceipt=sh.observer.last();const unknown=defenseResultLearning(shot,null);assert.match(unknown.cause,/세부 기록은 없어요/);assert.doesNotMatch(unknown.cause,/공격을 받았|통과했/,'no fabricated reason without receipt');
const negative=host(leakFixture(),wrapper.replace('lossObserver.before(state);','').replace('lossObserver.after(state);',''));negative.step();assert.equal(negative.observer.last(),null,'removed shipping observer loses the real cause');
assert.match(defenseResultLearning(negative.c.state,negative.observer.last()).cause,/세부 기록은 없어요/);
const restart=createDefense(99);sh.c.state=restart;sh.step();assert.equal(sh.observer.last(),null,'retry run cannot inherit an old terminal hit');
assert.equal(restart.phase,'build');assert.equal(restart.coreHp,20);
const savedBefore=JSON.stringify(checkpointDefense(restart));for(let i=0;i<120;i++)sh.step();assert.equal(JSON.stringify(checkpointDefense(restart)).replace(/"time":\d+(\.\d+)?/, '"time":0'),savedBefore.replace(/"time":\d+(\.\d+)?/, '"time":0'));
// An observer must be simulation-neutral over real attacks, kills, spawning,
// path movement and wave completion, not just over a synthetic terminal hit.
const plain=createDefense(117);plantDefense(plain,0,'pierce');startDefenseWave(plain);
const observed=structuredClone(plain),neutral=host(observed);
for(let i=0;i<3000&&plain.phase==='wave';i++){stepDefense(plain,.05,null);neutral.step();}
assert.deepEqual(observed,plain,'observer must preserve exact RNG/combat/economy and pending boss receipts');
assert.ok(plain.kills>0&&plain.leaked>0,'parity includes real shot kills and ordinary leaks');
assert.equal(Object.hasOwn(plain,'lastLoss'),false);assert.equal(Object.hasOwn(plain,'learning'),false);

// Result branch uses actual cause and one conditional next action, replacing
// the old universal layout slogan. Retry/rank/home handlers remain unchanged.
const result=source.slice(source.indexOf(' function result(){'),source.indexOf(' function stepLearningDefense(dt){'));
let html='';const rank={isConnected:true,textContent:''};const rctx=vm.createContext({announced:'',state:shot,lossObserver:{last:()=>coreReceipt},autoSkill:true,defenseResultLearning,esc:s=>s,clearSave(){},sound(){},dialog:s=>{html=s;},$:()=>rank,onResult:()=>Promise.resolve(''),onRanking(){},close(){}});
vm.runInContext(result,rctx);rctx.result();assert.match(html,/다음 한 가지/);assert.match(html,/적 통과 없이/);assert.doesNotMatch(html,/직선에는 관통, 굴곡에는 공전/);assert.ok(html.indexOf('id="td-retry"')<html.indexOf('id="td-result-ranking"'));
assert.match(css,/\.td-scroll\{[^}]*overflow:auto[^}]*min-height:0;flex:1/);
assert.match(css,/\.td-panel footer\{display:grid;flex:none/);
assert.match(css,/@media\(max-height:360px\)/);assert.match(css,/\.td-result-sheet button\{min-height:44px/);
assert.match(css,/\.td-dialog>div:not\(\.td-book-sheet\)\{[^}]*max-height:100%;overflow-y:auto/);
// Explicit arithmetic of the authored 320px landscape panel, not browser
// layout or device proof: 232px sheet - 44/14px padding - 2x44px actions,
// divider+gaps = at least 70px independent scroll space for the contextual copy.
const height=320-88,padding=44+14,actions=44*2+8+4+1;assert.ok(height-padding-actions>=70);
console.log('PASS Defense contextual learning: real costs/route/first placement/legal merge target, empty-slot shipping controls, bounded loss observer with real leak/core-shot terminal fixtures, retry/saves/RNG and removed-observer negative control. CPU+CSS contracts only; no physical touch/browser layout proof.');
