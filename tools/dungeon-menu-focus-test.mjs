import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DOMParser} from '@xmldom/xmldom';
import {applyDungeonMenuFocus} from '../src/dungeon-menu-focus.js';

// Real parsed shipping markup with a small browser-DOM adapter. This checks
// navigation and native details semantics, not browser layout or touch input.
const parser=new DOMParser(),sample=parser.parseFromString('<div/>','text/xml');
const ElementPrototype=Object.getPrototypeOf(sample.documentElement);
const matches=(node,selector)=>{
 if(node.nodeType!==1)return false;
 if(selector.startsWith('#'))return node.getAttribute('id')===selector.slice(1);
 const [tag,...classes]=selector.split('.');
 return (!tag||node.tagName===tag)&&classes.every(name=>(node.getAttribute('class')||'').split(/\s+/).includes(name));
};
ElementPrototype.querySelectorAll=function(selector){return Array.from(this.getElementsByTagName('*')).filter(node=>matches(node,selector));};
ElementPrototype.querySelector=function(selector){return this.querySelectorAll(selector)[0]||null;};
ElementPrototype.append=function(...nodes){for(const node of nodes)this.appendChild(node);};
ElementPrototype.replaceChildren=function(...nodes){while(this.firstChild)this.removeChild(this.firstChild);this.append(...nodes);};
ElementPrototype.remove=function(){this.parentNode?.removeChild(this);};
Object.defineProperty(ElementPrototype,'className',{get(){return this.getAttribute('class')||'';},set(value){this.setAttribute('class',value);},configurable:true});
Object.defineProperty(ElementPrototype,'classList',{get(){const node=this;return {contains:name=>node.className.split(/\s+/).includes(name),add(...names){node.className=[...new Set([...node.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove(...names){node.className=node.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');}};},configurable:true});

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('function showDungeon(){'),end=source.indexOf('\n// 던전 화면:',start);
assert(start>=0&&end>start,'shipping menu entry must be located');
const fn=source.slice(start,end).replaceAll('import.meta.env.BASE_URL',"'./'");
function launch({released=true,inspection=false,developer=false}={}){
 let doc=parser.parseFromString('<div id="overlay"/>','text/xml'),overlay=doc.documentElement,cancelled=0,rewards=0;
 Object.defineProperty(overlay,'innerHTML',{set(html){doc=parser.parseFromString(`<div id="overlay">${html.replace(/<img([^>]*)>/g,'<img$1/>')}</div>`,'text/xml');while(overlay.firstChild)overlay.removeChild(overlay.firstChild);for(const child of Array.from(doc.documentElement.childNodes))overlay.appendChild(child);}});
 const destinations=[];
 const names=['showSeedExpedition','showSeedAdventure','showSeedDuel','showJourneys','showSurvivalSetup','showSeedDefense','showSeedPuzzle','showIntro'];
 const ctx={survivalEntry:{cancel:()=>cancelled++},retryModeBossRewards:()=>rewards++,mode:'playing',touch:{reset(){}},keys:new Set(['Space']),localInspection:inspection,developerRun:developer,EXPEDITION_ACCOUNT_RELEASED:released,document:overlay.ownerDocument,applyDungeonMenuFocus,$:selector=>selector==='#overlay'?overlay:selector.endsWith(' small')?overlay.querySelector(selector.split(' ')[0])?.querySelector('small'):overlay.querySelector(selector)};
 for(const name of names)ctx[name]=()=>destinations.push(name);
 vm.runInNewContext(`${fn};showDungeon();`,ctx);
 // Old VM hosts may omit the optional helper; the shipping DOM must still use it.
 assert(overlay.querySelector('.dungeon-featured'),'shipping menu must render the featured destinations');
 assert.equal(cancelled,1);assert.equal(rewards,1);assert.equal(ctx.mode,'ready');assert.equal(ctx.keys.size,0);
 return {overlay,ctx,destinations};
}
for(const options of [{released:true},{released:false},{released:false,inspection:true},{released:false,developer:true}]){
 const {overlay,destinations}=launch(options),featured=overlay.querySelector('.dungeon-featured'),details=overlay.querySelector('.dungeon-other'),choices=overlay.querySelector('.dungeon-other-modes'),footer=overlay.querySelector('.dungeon-footer');
 assert.deepEqual(featured.querySelectorAll('button').map(node=>node.getAttribute('id')),['open-journey','open-survival']);
 assert.equal(overlay.querySelector('.mode-strategy').getAttribute('id'),'open-defense');
 assert.equal(details.hasAttribute('open'),false,'other challenges start collapsed');
 assert.equal(details.firstChild.tagName,'summary','native summary preserves keyboard and touch disclosure');
 assert(choices.querySelector('#open-adventure'));assert(choices.querySelector('#open-duel'));assert(choices.querySelector('#open-puzzle'));
 assert.equal(Boolean(choices.querySelector('#open-expedition')),options.released||options.inspection||options.developer||false,'original expedition account release gate is preserved');
 const ids=overlay.querySelectorAll('button').map(node=>node.getAttribute('id'));assert.equal(new Set(ids).size,ids.length,'no duplicate button or rebinding shadow');
 const launches={'open-journey':'showJourneys','open-survival':'showSurvivalSetup','open-defense':'showSeedDefense','open-adventure':'showSeedAdventure','open-duel':'showSeedDuel','open-puzzle':'showSeedPuzzle','open-expedition':'showSeedExpedition','back-menu':'showIntro'};
 for(const id of ids){overlay.querySelector(`#${id}`).onclick();assert.equal(destinations.at(-1),launches[id],`${id}: original launch handler survives relocation`);}
 assert.equal(footer.querySelector('#back-menu').parentNode,footer,'return remains outside the scroll lane');
 assert.equal(footer.parentNode,overlay.querySelector('.dungeon-hub'));
 const before=overlay.toString();assert.equal(applyDungeonMenuFocus(overlay),false);assert.equal(overlay.toString(),before,'repeated entry does not duplicate or reset nodes');
 const nested=choices.querySelectorAll('button');details.setAttribute('open','');assert.equal(nested.length,choices.querySelectorAll('button').length,'disclosure changes visibility without rebuilding controls');
 const oldImage=featured.querySelector('.mode-art').getAttribute('src');assert.match(oldImage,/assets\/menu\/mode-journey-v1\.webp$/,'approved illustration reused');
 for(const button of nested)assert.equal(button.querySelector('.mode-art').loading,'lazy','secondary artwork can defer loading');
}
assert.equal(applyDungeonMenuFocus(null),false);assert.equal(applyDungeonMenuFocus(sample.documentElement),false);
{
 const broken=parser.parseFromString('<div><div class="dungeon-hub"><div class="dungeon-scroll"><div class="dungeon-modes"><button id="open-journey"/></div></div></div></div>','text/xml').documentElement;
 const before=broken.toString();assert.equal(applyDungeonMenuFocus(broken),false);assert.equal(broken.toString(),before,'partial entry is preserved rather than losing a destination');
}
{
 const long='이름이 아주 긴 다음 정원의 특별한 도전'.repeat(3);
 const future=parser.parseFromString(`<div><div class="dungeon-hub"><div class="dungeon-scroll"><div class="dungeon-modes"><button class="dungeon-mode" id="open-journey"><strong>여정</strong></button><button class="dungeon-mode" id="open-survival"><strong>물량생존전</strong></button><button class="dungeon-mode" id="open-defense"><strong>씨앗 수호전</strong></button><button class="dungeon-mode" id="open-future"><strong>${long}</strong></button></div></div><footer class="dungeon-footer"><button id="back-menu">돌아가기</button></footer></div></div>`,'text/xml').documentElement;
 let clicks=0;const button=future.querySelector('#open-future');button.onclick=()=>clicks++;
 assert.equal(applyDungeonMenuFocus(future),true);
 assert.equal(future.querySelector('.dungeon-other-modes').querySelector('#open-future'),button,'future destinations move as original nodes');
 assert.equal(button.querySelector('strong').textContent,long,'long labels are preserved in full');
 assert.equal(future.querySelector('.dungeon-other-hint').textContent,long);
 button.onclick();assert.equal(clicks,1,'unknown future destination handler is preserved');
}
const css=readFileSync(new URL('../src/dungeon-menu.css',import.meta.url),'utf8');
assert.match(css,/\.dungeon-footer\{flex:none/,'return cannot be flex-compressed by open other challenges');
assert.match(css,/\.dungeon-scroll\{min-height:0;overflow-y:auto/,'long menu has a separate scroll lane');
assert.match(css,/\.dungeon-other-toggle\{[^}]*min-height:48px/,'desktop disclosure meets touch target');
assert.match(css,/@media\(max-height:500px\)[\s\S]*\.dungeon-other-toggle\{min-height:44px/,'320px landscape keeps a 44px disclosure');
assert.match(css,/\.dungeon-footer button\{[^}]*min-height:44px/,'compact return retains 44px');
assert.match(css,/\.dungeon-focus \.dungeon-mode \.mode-caption strong,\.dungeon-focus \.dungeon-mode \.mode-caption small\{white-space:normal;word-break:keep-all;overflow-wrap:anywhere/,'long destination names can wrap, never ellipsize');
assert.match(css,/\.dungeon-focus \.dungeon-heading h2\{font-size:22px!important;line-height:1\.25!important/,'compact heading uses a stable line height');
console.log('PASS actual shipping menu DOM: original 8 launch handlers, release/inspection gates, two featured modes, native closed/open disclosure, idempotence, safe partial entry, lazy secondary art and CSS touch/scroll/wrap contracts. Not live browser/device layout approval.');
