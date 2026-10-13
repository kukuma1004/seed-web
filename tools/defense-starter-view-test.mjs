import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDefense,plantDefense,defenseStarterLaws,DEFENSE_LAWS,DEFENSE} from '../src/seed-defense-rules.js';
const view=readFileSync('src/seed-defense-view.js','utf8'),from=view.indexOf(' let starterPad=null;'),to=view.indexOf(" $('#td-plant-here')",from);
assert.ok(from>0&&to>from);
const dialogs={'.td-dialog':{hidden:true},'.td-starter-cancel':{}},buttons=['pierce','frost','burst'].map(id=>({dataset:{starterLaw:id}}));
let saves=0,shown=0,html='';
const context=vm.createContext({ended:false,paused:false,confirming:false,selected:0,state:createDefense(73),dirty:false,uiKey:'',
 root:{querySelectorAll:()=>buttons},$:id=>dialogs[id],defenseStarterLaws,plantDefense,DEFENSE_LAWS,DEFENSE,
 lawArt:()=>'',dialog:s=>{html=s;dialogs['.td-dialog'].hidden=false;},sound(){},save(){saves++;},updateUI(){},showSelection(){shown++;},hint(){}});
vm.runInContext(view.slice(from,to),context);
context.plantSelected();assert.equal(context.confirming,true);assert.equal(saves,0);assert.match(html,/다음 씨앗부터는 무작위/);
// Execute the real showBook guard, not a separate implementation of it.
const book=view.slice(view.indexOf(' function showBook(){'),view.indexOf(" $('#td-book').onclick"));
vm.runInContext(book,context);context.showBook();assert.equal(dialogs['.td-dialog'].hidden,false,'book cannot replace starter');
dialogs['.td-starter-cancel'].onclick();assert.equal(context.confirming,false);assert.equal(dialogs['.td-dialog'].hidden,true);assert.equal(context.state.currency,90);
context.plantSelected();buttons[1].onclick();assert.equal(context.state.towers[0].line,'frost');assert.equal(context.state.currency,60);assert.equal(saves,1);assert.equal(shown,1);assert.equal(context.confirming,false);
const count=context.state.towers.length;buttons[1].onclick();assert.equal(context.state.towers.length,count,'stale starter click cannot plant twice');assert.equal(context.selected,0,'stale callback cannot clear selection');
context.ended=true;context.selected=1;context.plantSelected();assert.equal(saves,1);
console.log('PASS shipping first-choice controller: cancel/payment/save, book guard, stale click and closed guard. VM UI, not physical browser input.');
