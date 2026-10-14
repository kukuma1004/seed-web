import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {readFileSync} from 'node:fs';
import {focusRunResult,focusSurvivalSetup} from '../src/run-result-view.js';
import {runReflectionHTML,reflectRun} from '../src/run-reflection.js';

// Parsed HTML and a bounded DOM adapter. This is a node identity/state test,
// not a browser rendering, physical touch or device layout measurement.
const parser=new DOMParser(),initial=parser.parseFromString('<div/>','text/xml');
const proto=Object.getPrototypeOf(initial.documentElement);
const matches=(node,selector)=>{
 if(node.nodeType!==1)return false;
 if(selector.startsWith('#'))return node.getAttribute('id')===selector.slice(1);
 const [tag,...classes]=selector.split('.');return (!tag||node.tagName===tag)&&classes.every(c=>(node.getAttribute('class')||'').split(/\s+/).includes(c));
};
proto.querySelectorAll=function(selectors){return Array.from(this.getElementsByTagName('*')).filter(n=>selectors.split(',').some(s=>matches(n,s.trim())));};
proto.querySelector=function(s){return this.querySelectorAll(s)[0]||null;};
proto.append=function(...nodes){for(const n of nodes)this.appendChild(n);};
proto.prepend=function(...nodes){const before=this.firstChild;for(const n of nodes)if(n!==before)this.insertBefore(n,before);};
proto.remove=function(){this.parentNode?.removeChild(this);};
proto.before=function(node){this.parentNode.insertBefore(node,this);};
proto.after=function(node){this.parentNode.insertBefore(node,this.nextSibling);};
proto.closest=function(s){for(let n=this;n;n=n.parentNode)if(matches(n,s))return n;return null;};
Object.defineProperty(proto,'className',{get(){return this.getAttribute('class')||'';},set(v){this.setAttribute('class',v);},configurable:true});
Object.defineProperty(proto,'classList',{get(){const n=this;return {add(...v){n.className=[...new Set([...n.className.split(/\s+/).filter(Boolean),...v])].join(' ');},remove(...v){n.className=n.className.split(/\s+/).filter(c=>!v.includes(c)).join(' ');}};},configurable:true});
Object.defineProperty(proto,'innerHTML',{set(value){const doc=parser.parseFromString('<div>'+value+'</div>','text/xml');while(this.firstChild)this.removeChild(this.firstChild);this.append(...Array.from(doc.documentElement.childNodes));},configurable:true});
Object.defineProperty(proto,'id',{get(){return this.getAttribute('id')||'';},set(v){this.setAttribute('id',v);},configurable:true});
const parse=html=>parser.parseFromString(html,'text/xml').documentElement;
const reflection=runReflectionHTML(reflectRun({coreLost:true}));
for(const fixture of [
 ['journey','<h2>잠든 씨앗</h2><div class="final-score">120</div><section class="death-combat-analysis">마지막 전장</section><p id="rank-status">등록 중</p><div class="end-actions"><button id="restart">돌아가기</button><button id="end-ranking">랭킹</button></div>',''],
 ['survival','<div class="menu-panel survival-panel"><h2>잠든 씨앗</h2><div class="survival-facts">3분</div><section class="death-combat-analysis">성능</section><p id="survival-submit-status">대기 중</p><button id="survival-result-ranking">랭킹 보기</button><div class="survival-actions"><button id="survival-retry">다시</button><button id="survival-home">메인</button></div></div>','survival-retry'],
 ['expansion','<div class="menu-panel"><h2>횡풍의 항로</h2><div class="final-score">777</div><p id="expansion-rank-status">확인 중</p><button id="expansion-retry">다시</button><button id="expansion-ranking">랭킹</button><button id="expansion-back">돌아가기</button></div>','expansion-retry'],
 ['mirror','<div class="menu-panel developer-panel"><h2>거울의 탑</h2><p>체크포인트 11층</p><div class="developer-footer"><button id="mirror-resume">11층</button><button id="mirror-retry">1층</button><button id="mirror-end">던전</button></div></div>','mirror-resume']
]){
 const [kind,html,primaryId]=fixture,overlay=parse('<div id="overlay">'+html+'</div>');
 const originals=overlay.querySelectorAll('button'),destinations=[];
 for(const b of originals)b.onclick=()=>destinations.push(b.getAttribute('id'));
 const status=overlay.querySelector('#rank-status,#survival-submit-status,#expansion-rank-status');
 assert(focusRunResult(overlay,{reflection,harvest:kind==='journey'?'실제 수확 · 씨앗 조각 1개':'',primaryId,
  onRetry:kind==='journey'?()=>destinations.push('new-journey'):null,onGarden:kind==='journey'?()=>destinations.push('garden'):null}));
 for(const b of originals){assert.equal(overlay.querySelector('#'+b.getAttribute('id')),b);b.onclick();assert.equal(destinations.at(-1),b.getAttribute('id'));}
 if(status){status.textContent='등록 완료';assert.equal(overlay.querySelector('#'+status.getAttribute('id')),status);assert.equal(status.textContent,'등록 완료');}
 const shell=overlay.querySelector('.run-result-layout'),actions=overlay.querySelector('.run-result-actions');assert(shell&&actions);
 assert.equal(actions.parentNode,shell,'actions are outside the scrolling result content');
 assert.match(overlay.querySelector('.run-reflection').textContent,/보호 목표/);
 const folded=overlay.querySelector('.run-result-details');if(folded){assert.equal(folded.hasAttribute('open'),false);assert(folded.querySelector('.death-combat-analysis'));}
 if(primaryId)assert.equal(actions.firstChild.getAttribute('id'),primaryId);
 if(kind==='expansion')assert.equal(actions.querySelectorAll('button').length,3,'all direct expansion actions remain reachable');
 if(kind==='journey'){assert.equal(actions.firstChild.getAttribute('id'),'run-again');overlay.querySelector('#run-again').onclick();assert.equal(destinations.at(-1),'new-journey');overlay.querySelector('#run-garden').onclick();assert.equal(destinations.at(-1),'garden');assert.match(overlay.querySelector('.run-harvest').textContent,/조각 1개/);}
 const snapshot=overlay.toString();assert.equal(focusRunResult(overlay,{reflection}),false);assert.equal(overlay.toString(),snapshot,'repeated result enhancement cannot duplicate callbacks/garden awards');
 const ids=overlay.querySelectorAll('button').map(n=>n.getAttribute('id'));assert.equal(ids.length,new Set(ids).size);
}
{
 const overlay=parse('<div><p>한 구간 3분</p><button id="open-garden-challenge" class="primary">정원 도전</button><button id="start-survival">생존전 시작</button></div>');
 let launched=0;const entry=overlay.querySelector('#open-garden-challenge');entry.onclick=()=>launched++;
 assert(focusSurvivalSetup(overlay));assert.equal(overlay.querySelector('.survival-short-fold').hasAttribute('open'),false);entry.onclick();assert.equal(launched,1);assert(overlay.querySelector('#start-survival'));assert.equal(focusSurvivalSetup(overlay),false);
}
assert.equal(focusRunResult(null),false);assert.equal(focusSurvivalSetup(null),false);
const css=readFileSync(new URL('../src/run-result.css',import.meta.url),'utf8');
assert.match(css,/\.run-result-content\{min-height:0;overflow-y:auto/);
assert.match(css,/min-height:44px/);assert.match(css,/env\(safe-area-inset-bottom\)/);assert.match(css,/@media\(max-height:450px\)/);
console.log('PASS parsed result DOM: four real state shapes, original callbacks/status node identity, fixed action lane, folded final combat detail, real harvest/retry separation, idempotent setup focus and touch/safe-area CSS contracts. No live rendering/device claim.');
