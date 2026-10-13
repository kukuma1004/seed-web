import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,plantDefense,upgradeDefense,defenseUpgradeCost,checkpointDefense} from '../src/seed-defense-rules.js';
import {defenseWavePreview} from '../src/defense-wave-preview.js';

const source=readFileSync('src/seed-defense-view.js','utf8');
assert.equal((source.match(/id="td-upgrade"/g)||[]).length,1,'one action, never a second paid dispatch');
assert.match(source,/<footer><button id="td-upgrade" hidden><\/button><button id="td-start">/,'upgrade stays outside scrolling details');
const from=source.indexOf(' function updateUpgradeAction(){'),to=source.indexOf(' function updateUI(){',from);
assert.ok(from>0&&to>from);
const state=createDefense(73);plantDefense(state,0,'pierce');state.currency=1000;plantDefense(state,1);
let selected=0,saves=0,updates=0;
const button={hidden:true,disabled:false,textContent:''};
const context=vm.createContext({state,tower:()=>state.towers[selected],$:()=>button,defenseUpgradeCost,upgradeDefense,
 setLabel:(id,s)=>{button.textContent=s;},ended:false,confirming:false,bookOpen:false,uiKey:'',hint(){},sound(){},save(){saves++;},updateUI(){updates++;}});
vm.runInContext(source.slice(from,to),context);context.updateUpgradeAction();
assert.equal(button.hidden,false);assert.equal(button.disabled,false);assert.match(button.textContent,/Lv.1 → 2 · 40 햇살/);
// The handler was bound once, before the selection changed. It must resolve
// the new seed rather than retaining the seed whose panel was first painted.
selected=1;const currency=state.currency;button.onclick();assert.equal(state.towers[0].level,1);assert.equal(state.towers[1].level,2);assert.equal(state.currency,currency-40);assert.equal(saves,1);assert.equal(updates,1);
state.currency=0;context.updateUpgradeAction();assert.equal(button.disabled,true);button.onclick();assert.equal(saves,1,'real payment rule rejects unaffordable dispatch');
state.currency=1000;state.towers[1].level=5;context.updateUpgradeAction();assert.equal(button.disabled,true);assert.match(button.textContent,/최대/);button.onclick();assert.equal(saves,1);
state.towers[1].level=1;
for(const flag of ['ended','confirming','bookOpen']){context[flag]=true;button.onclick();assert.equal(saves,1);context[flag]=false;}
for(const phase of ['draft','won','lost']){state.phase=phase;context.updateUpgradeAction();assert.equal(button.hidden,true);button.onclick();assert.equal(saves,1);}
state.phase='wave';context.updateUpgradeAction();assert.equal(button.hidden,false);button.onclick();assert.equal(saves,2,'in-wave upgrades retain the existing rule');
selected=9;context.updateUpgradeAction();assert.equal(button.hidden,true);button.onclick();assert.equal(saves,2);

const start=source.indexOf(" let forecastKey='';"),end=source.indexOf(' function updateUpgradeAction(){',start);
let writes=0;
const board={hidden:true,set innerHTML(s){this.markup=s;writes++;}},header={hidden:true,textContent:''};
state.phase='build';state.wave=0;
const forecast=vm.createContext({state,paused:false,bookOpen:false,$:s=>s==='.td-selected-threat'?header:board,defenseWavePreview,esc:s=>s});
vm.runInContext(source.slice(start,end),forecast);
const saved=JSON.stringify(checkpointDefense(state));forecast.updateForecast();assert.equal(header.textContent,'다음 1/12 · 일반 12');
for(let i=0;i<120;i++)forecast.updateForecast();assert.equal(writes,1);assert.equal(JSON.stringify(checkpointDefense(state)),saved);
state.wave=11;forecast.updateForecast();assert.match(header.textContent,/문지기·보스 1/);assert.match(header.textContent,/방패/);
for(const flag of ['paused','bookOpen']){forecast[flag]=true;forecast.updateForecast();assert.equal(header.hidden,true);forecast[flag]=false;}
state.phase='wave';forecast.updateForecast();assert.equal(header.hidden,true,'next pack is not advertised during the current wave');
console.log('Defense selected actions PASS: fixed single paid action, current-selection dispatch, affordability/max/modal/terminal guards, existing wave rule and shared cached actual-pack summary. CPU controller; not native touch proof.');
