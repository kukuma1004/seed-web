import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as shop from '../src/shop.js';
import {ITEMS,emptyInventory,addItem,useItem} from '../src/inventory.js';
import {collectCloudSnapshot,applyCloudSnapshot} from '../src/cloud-save.js';
import {itemArt} from '../src/item-art.js';

const memory=()=>{const data=new Map();return {data,fail:false,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail)throw Error('quota');data.set(k,String(v));},removeItem:k=>data.delete(k)};};
assert.deepEqual(shop.SHOP_PRODUCTS,['tonic','wind']);
for(const id of shop.SHOP_PRODUCTS){
 const s=memory();shop.writeShop(s,{coins:2000});
 assert(shop.buyShopItem(s,id,1).ok);assert.equal(shop.readShop(s).coins,1800);
 assert.equal(shop.readShop(s).stash[id],1);assert.equal(shop.readShop(s).carry[id],1);
 assert(shop.buyShopItem(s,id,10).ok);assert.equal(shop.readShop(s).coins,300);
 assert.equal(shop.readShop(s).stash[id],11);assert.equal(shop.readShop(s).carry[id],5);
 const raw=s.getItem(shop.SHOP_KEY);
 for(const n of [0,-1,2,1.5,NaN,Infinity,'1','10','toString']){assert(!shop.buyShopItem(s,id,n).ok);assert.equal(s.getItem(shop.SHOP_KEY),raw);}
 assert.equal(shop.buyShopItem(s,id,10).reason,'coins');assert.equal(s.getItem(shop.SHOP_KEY),raw);
 const phone=memory();applyCloudSnapshot(phone,collectCloudSnapshot(s));assert.deepEqual(shop.readShop(phone),shop.readShop(s),'existing account snapshot carries bought wind and selected departure counts');
 const inventory=emptyInventory();for(const [item,n] of Object.entries(shop.claimCarry(phone)))addItem(inventory,item,n);
 assert.equal(inventory[id],5);assert.equal(shop.readShop(phone).stash[id],6);
}
{
 const s=memory();shop.writeShop(s,{coins:9000,stash:{wind:999},carry:{wind:5},gifts:['old-gift'],purchases:['old-order']});const raw=s.getItem(shop.SHOP_KEY);
 assert.equal(shop.buyShopItem(s,'wind',1).reason,'full');
 for(const id of ['potion','shell','sprout','toString','__proto__',null])assert.equal(shop.buyShopItem(s,id,1).reason,'item');
 assert.equal(s.getItem(shop.SHOP_KEY),raw);
 s.fail=true;assert.equal(shop.buyTonics(s,1).reason,'save');assert.equal(s.getItem(shop.SHOP_KEY),raw);
 s.fail=false;assert(shop.buyTonics(s,1).ok);assert.equal(shop.readShop(s).coins,8800);assert.deepEqual(shop.readShop(s).purchases,['old-order']);
}
for(const outcome of ['accepted','rejected','throw','storage']){
 const s=memory();shop.writeShop(s,{coins:1200,stash:{wind:7,tonic:3},carry:{wind:3,tonic:2},gifts:['old-gift']});const before=s.getItem(shop.SHOP_KEY);let calls=0;
 if(outcome==='storage')s.fail=true;
 const result=shop.withDepartureSupplies(s,items=>{calls++;assert.deepEqual(items,{tonic:2,wind:3});assert.equal(shop.readShop(s).stash.wind,4);if(outcome==='throw')throw Error('checkpoint');return outcome==='accepted';});
 assert.equal(result.ok,outcome==='accepted');assert.equal(calls,outcome==='storage'?0:1);
 if(outcome!=='accepted')assert.equal(s.getItem(shop.SHOP_KEY),before,'failed first entry returns exact selected supplies');
 else{assert.equal(shop.readShop(s).stash.wind,4);assert.equal(shop.readShop(s).carry.wind,3);}
}

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const shopSource=source.slice(source.indexOf('function showShop('),source.indexOf('// 점검 사과 선물 안내'));
const useSource=source.slice(source.indexOf('function useInventoryItem('),source.indexOf('\nfunction projectile('));
const classes=()=>({add(){},remove(){}});
// Actual shipping shop handlers in a DOM adapter: state and queued callbacks,
// not browser layout, native touch, authenticated cloud or device proof.
function ui(){
 let uid='shop-owner',focus=null;
 const root={hidden:false,classList:classes(),buttons:[],html:'',scroll:{scrollTop:0},message:{focus(){focus='message';}},
  set innerHTML(value){this.html=value;this.scroll={scrollTop:0};this.buttons=Array.from(value.matchAll(/<button\b([^>]*)>/g),m=>{
   const attrs=Object.fromEntries(Array.from(m[1].matchAll(/([\w-]+)="([^"]*)"/g),a=>[a[1],a[2]])),dataset={};
   for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;
   const node={id:attrs.id,attrs,dataset,disabled:/\bdisabled\b/.test(m[1]),onclick:null,focus(){focus=this.id;}};return node;
  });},
  querySelectorAll(selector){return this.buttons.filter(n=>selector.startsWith('#')?n.id===selector.slice(1):Object.hasOwn(n.attrs,selector.slice(1,-1)));},
  querySelector(selector){return selector==='.shop-scroll'?this.scroll:selector==='#shop-message'?this.message:this.querySelectorAll(selector)[0]||null;}
 };
 const $=s=>s==='#overlay'?root:root.querySelector(s);
 const storage=memory();const c=vm.createContext({...shop,ITEMS,itemArt,runStorage:storage,account:{user:()=>({uid})},mode:'ready',lastShopBack:null,touch:{reset(){}},keys:new Set(),$,supportSection:()=>'',supportVisible:()=>false,showIntro(){c.mode='intro';},escapeHtml:s=>String(s).replaceAll('<','&lt;')});vm.runInContext(shopSource,c);
 return {root,c,storage,$,owner:v=>uid=v,focus:()=>focus};
}
{
 const f=ui();shop.writeShop(f.storage,{coins:1700});f.c.showShop();
 const wind=f.$('#buy-wind-one'),staleBuy=wind.onclick,staleBack=f.$('#shop-back').onclick;
 assert(!wind.disabled);assert.match(f.root.html,/6초 동안 이동 속도 \+35%/);
 f.root.scroll.scrollTop=70;staleBuy();assert.equal(shop.readShop(f.storage).coins,1500);assert.equal(shop.readShop(f.storage).stash.wind,1);assert.equal(f.root.scroll.scrollTop,70);assert.equal(f.focus(),'buy-wind-one');
 staleBuy();staleBack();assert.equal(shop.readShop(f.storage).coins,1500);assert.equal(f.c.mode,'ready','detached handlers cannot buy or leave a newer pane');
 f.$('#buy-wind-ten').onclick();assert.equal(shop.readShop(f.storage).coins,0);assert.equal(shop.readShop(f.storage).stash.wind,11);assert.equal(shop.readShop(f.storage).carry.wind,5);assert.equal(f.focus(),'message');
 const raw=f.storage.getItem(shop.SHOP_KEY),queued=f.$('#buy-wind-one').onclick;f.owner('another-owner');queued();assert.equal(f.storage.getItem(shop.SHOP_KEY),raw);
}
{
 const f=ui();f.c.showShop();const raw=f.storage.getItem(shop.SHOP_KEY);f.storage.fail=true;f.$('#buy-wind-one').onclick();assert.equal(f.storage.getItem(shop.SHOP_KEY),raw);assert.match(f.root.html,/저장하지 못했어요/);assert.equal(shop.readShop(f.storage).carry.wind,0);
 f.storage.fail=false;f.$('#buy-wind-one').onclick();assert.equal(shop.readShop(f.storage).stash.wind,1);assert.equal(shop.readShop(f.storage).coins,0);
 const inv=emptyInventory();for(const [id,n] of Object.entries(shop.claimCarry(f.storage)))addItem(inv,id,n);
 const toast={textContent:''},events=[];
 const c=vm.createContext({ITEMS,useItem,inventory:inv,mode:'playing',paused:false,potionCD:0,hp:100,maxPlayerHp:()=>100,hasteTime:0,shellTime:0,selectedItem:null,itemBarKey:'',exitOpen:false,survivalSession:null,player:{position:{}},vfx:{pulse:(...a)=>events.push(a),burst:(...a)=>events.push(a)},$:()=>toast});vm.runInContext(useSource,c);
 c.useInventoryItem('wind');assert.equal(inv.wind,0);assert.equal(c.hasteTime,6);assert.equal(c.potionCD,.6);assert.equal(events.length,2);
 const movement=source.match(/\(hasteTime>0\?ITEMS\.wind\.speed:1\)/)?.[0];assert(movement);assert.equal(vm.runInContext(movement,c),1.35);
 const clock=source.match(/hasteTime=Math\.max\(0,hasteTime-dt\);/)?.[0];assert(clock);c.dt=6;vm.runInContext(clock,c);assert.equal(c.hasteTime,0);assert.equal(vm.runInContext(movement,c),1);
}
console.log('Journey shop: real JP purchases/caps/storage failure, existing cloud+departure inventory, first-entry rollback, stale view/UID ownership and actual wind use/speed/expiry PASS. DOM/VM and rules, not live-account/device proof.');
