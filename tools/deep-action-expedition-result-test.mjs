import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {build} from 'esbuild';

// Mount the shipping view's actual result renderer. No reward implementation is
// re-created here; the whole-route controller cohort verifies its real receipts.
class Element {
 constructor(){this.dataset={};this.style={};this.hidden=false;this.innerHTML='';this.textContent='';this.children=new Map();this.handlers=new Map();this.classList={add(){},remove(){},toggle(){}};}
 querySelector(q){if(!this.children.has(q))this.children.set(q,new Element());return this.children.get(q);}
 querySelectorAll(){return [];}
 addEventListener(k,f){this.handlers.set(k,f);}
 removeEventListener(k,f){if(this.handlers.get(k)===f)this.handlers.delete(k);}
 append(e){this.child=e;}
 remove(){this.removed=true;}
 setAttribute(){}
}
const old={document:globalThis.document,window:globalThis.window,Image:globalThis.Image};
const doc=new Element(),win=new Element();doc.hidden=true;doc.createElement=()=>new Element();
globalThis.document=doc;globalThis.window=win;globalThis.Image=class {};
const source=readFileSync('src/expedition/view.js','utf8');
async function compile(contents){const out=await build({stdin:{contents,resolveDir:resolve('src/expedition'),sourcefile:'view.js'},bundle:true,platform:'node',format:'esm',loader:{'.css':'empty'},define:{'import.meta.env':'{"BASE_URL":"/"}'},write:false});return import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));}
function render(mountExpedition,{kind,survivors=kind==='wipe'?0:3,completed=kind==='return'?4:3,notice=''}={}){
 const host=new Element(),state={screen:'result',roster:{instances:{},tombstones:{},party:[],story:[]},meta:{relics:[]},route:{gardenId:'meadow',completedBattles:Array.from({length:completed},(_,n)=>`r:b${n}`)},battle:null,lastResult:{kind,gardenId:'meadow',difficulty:1,survivors,lost:8-survivors,loot:kind==='return'?7:0,boss:false},notice,saveState:'saved',events:[]};
 const before=JSON.stringify(state);let commands=0;
 const view=mountExpedition({host,owner:'test',currentOwner:()=> 'test',createController:()=>({state:()=>state,dispatch(){commands++;throw Error('result render must not dispatch');},close(){}})});
 const html=host.child.querySelector('.exv-main').innerHTML;assert.equal(JSON.stringify(state),before,'result rendering cannot mutate rewards, roster, XP or receipts');assert.equal(commands,0);view.close();assert.equal(doc.handlers.size,0);assert.equal(win.handlers.size,0);return html;
}
try{
 const {mountExpedition}=await compile(source);
 const limit=render(mountExpedition,{kind:'limit'});assert.match(limit,/전투 행동 한도에 도달했어요/);assert.match(limit,/미확정 전리품과 귀환 경험치는 받지 못했어요/);assert.match(limit,/살아 있는 씨앗 <b>3<\/b>/);assert.doesNotMatch(limit,/생환 <b>|경험치를 얻었어요|경험을 얻었습니다/);assert.match(limit,/확정 법칙핵 <b>0<\/b>/);
 const wipe=render(mountExpedition,{kind:'wipe'});assert.match(wipe,/씨앗의 기억이 남았습니다/);assert.match(wipe,/씨앗의 전투·사망 기록을 저장했어요/);assert.match(wipe,/미확정 전리품과 귀환 경험치는 받지 못했어요/);assert.doesNotMatch(wipe,/경험치를 얻었어요|경험을 얻었습니다/);
 const returned=render(mountExpedition,{kind:'return'});assert.match(returned,/생환한 씨앗이 귀환 경험치를 얻었어요/);assert.match(returned,/생환 <b>3<\/b>/);assert.match(returned,/확정 법칙핵 <b>7<\/b>/);
 const early=render(mountExpedition,{kind:'return',completed:0});assert.doesNotMatch(early,/경험치를 얻었어요/);assert.match(early,/현재 상태와 귀환 기록을 저장했어요/);
 const empty=render(mountExpedition,{kind:'return',survivors:0});assert.doesNotMatch(empty,/경험치를 얻었어요/);
 const notice=render(mountExpedition,{kind:'limit',notice:'저장 원본 보존 <확인>'});assert.match(notice,/저장 원본 보존 &lt;확인&gt;/);
 // Negative control: restore the exact old generic XP claim while keeping the
 // new heading. The same rendered-result expectation must detect the defect.
 const regressed=source.replace(/const resultNote=[^\n]*;/,"const resultNote='살아 돌아온 씨앗이 경험을 얻었습니다. 미확정 전리품의 확정 여부를 확인하세요.';");assert.notEqual(regressed,source);
 const oldModule=await compile(regressed),oldLimit=render(oldModule.mountExpedition,{kind:'limit'});assert.throws(()=>assert.match(oldLimit,/미확정 전리품과 귀환 경험치는 받지 못했어요/));assert.match(oldLimit,/경험을 얻었습니다/);
 console.log('PASS shipping expedition result UI: return with/without earned XP, limit, wipe, escaped save notice; 0 mutation/commands; old generic XP negative control rejected. Mock DOM, not device screenshot.');
}finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
