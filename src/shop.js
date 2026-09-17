import {ITEMS} from './inventory.js';

export const SHOP_KEY='seed-shop-v1';
export const SHOP_STOCK_MAX=10;
export const TONIC_CARRY_MAX=5;
export const SHOP_PRICES=Object.freeze({1:200,10:1000});
// 처음 오는 사람도 물약 하나는 살 수 있게 시작 자금을 준다(첫 판을 맨손으로 시작하지 않도록).
export const STARTING_COINS=200;
// 상점 보관함: 산 물약과 선물을 모아 두는 곳. 가져갈 개수(carry)는 아이가 고르고,
// 새 여정을 시작할 때만 그만큼 가방으로 옮긴다. 많이 갖고 있어도 안 가져갈 수 있다.
// 보관함에는 10개까지 둘 수 있지만, 한 여정에 가져가는 작은 물약은 최대 5개다.
export const STASH_ITEMS=Object.freeze({tonic:Object.freeze({max:SHOP_STOCK_MAX,carryMax:TONIC_CARRY_MAX}),sprout:Object.freeze({max:3})});
export const STASH_ORDER=Object.freeze(['tonic','sprout']);
const carryMax=id=>Math.min(STASH_ITEMS[id].carryMax??STASH_ITEMS[id].max,ITEMS[id]?.max??STASH_ITEMS[id].max);
const count=v=>Number.isInteger(v)&&v>0?v:0;
const EMPTY=()=>({version:2,coins:STARTING_COINS,stash:{tonic:0,sprout:0},carry:{tonic:0,sprout:0},gifts:[]});
let fallback=EMPTY();

export function normalizeShop(value){
 const coins=Number.isInteger(value?.coins)?value.coins:0;
 // 예전(version 1)에는 산 작은 물약이 다음 새 여정에 전부 들어갔다. 그 약속대로 모두 가져가기로 옮긴다.
 const oldTonics=value?.stash?null:count(value?.tonics);
 const stash={},carry={};
 for(const id of STASH_ORDER){
  stash[id]=Math.min(STASH_ITEMS[id].max,id==='tonic'&&oldTonics!==null?oldTonics:count(value?.stash?.[id]));
  const wanted=id==='tonic'&&oldTonics!==null?oldTonics:count(value?.carry?.[id]);
  carry[id]=Math.min(wanted,stash[id],carryMax(id));
 }
 const gifts=[...new Set(Array.isArray(value?.gifts)?value.gifts.filter(g=>typeof g==='string'&&g.length<=40):[])].slice(-20);
 return {version:2,coins:Math.max(0,Math.min(9_999_999,coins)),stash,carry,gifts};
}
export function readShop(storage){
 if(!storage)return normalizeShop(fallback);
 try{
  const raw=storage.getItem(SHOP_KEY);
  if(raw===null||raw===undefined){const start=EMPTY();writeShop(storage,start);return start;}
  return normalizeShop(JSON.parse(raw||'null'));
 }catch{return EMPTY();}
}
export function writeShop(storage,value){
 const next=normalizeShop(value);
 if(!storage){fallback=next;return true;}
 try{storage.setItem(SHOP_KEY,JSON.stringify(next));return true;}catch{return false;}
}
export function earnCoins(storage,amount){
 const current=readShop(storage),add=Number.isInteger(amount)&&amount>0?amount:0;
 current.coins=Math.min(9_999_999,current.coins+add);writeShop(storage,current);return current;
}
// 산 만큼은 가져가기에도 더한다(사자마자 가져가고 싶은 경우가 대부분). 줄이는 건 보관함에서.
export function buyTonics(storage,n){
 const current=readShop(storage),price=SHOP_PRICES[n];
 if(!price)return {ok:false,reason:'count',shop:current};
 if(current.stash.tonic+n>SHOP_STOCK_MAX)return {ok:false,reason:'full',shop:current};
 if(current.coins<price)return {ok:false,reason:'coins',shop:current};
 current.coins-=price;current.stash.tonic+=n;current.carry.tonic+=n;writeShop(storage,current);
 return {ok:true,count:n,price,shop:readShop(storage)};
}
// 가져갈 개수 고르기. 보관한 만큼, 한 판 가방에 들어가는 만큼까지만.
export function setCarry(storage,id,n){
 const current=readShop(storage);
 if(!Object.hasOwn(STASH_ITEMS,id))return current;
 current.carry[id]=Math.max(0,Math.min(Number.isInteger(n)?n:0,current.stash[id],carryMax(id)));
 writeShop(storage,current);return readShop(storage);
}
// 새 여정을 시작할 때만 부른다(이어하기는 부르지 않는다). 고른 만큼 보관함에서 꺼내 돌려준다.
// 고른 개수는 남은 보관 수 안에서 그대로 두어, 다음 새 여정에도 같은 만큼 가져간다.
export function claimCarry(storage){
 const current=readShop(storage),taken={};
 for(const id of STASH_ORDER){
  const take=Math.min(current.carry[id],current.stash[id]);
  if(take)taken[id]=take;
  current.stash[id]-=take;
 }
 writeShop(storage,current);
 return taken;
}
// 한 번만 주는 선물. 같은 이름의 선물은 다시 주지 않는다. 받은 선물은 가져가기에도 넣어 둔다.
export function grantGift(storage,giftId,id,n=1){
 const current=readShop(storage);
 if(!Object.hasOwn(STASH_ITEMS,id)||current.gifts.includes(giftId))return {granted:false,shop:current};
 current.gifts.push(giftId);
 current.stash[id]=Math.min(STASH_ITEMS[id].max,current.stash[id]+count(n));
 current.carry[id]=current.carry[id]+count(n);
 writeShop(storage,current);
 return {granted:true,shop:readShop(storage)};
}
export function stashTotal(shop){return STASH_ORDER.reduce((sum,id)=>sum+(shop?.stash?.[id]||0),0);}
export function carryTotal(shop){return STASH_ORDER.reduce((sum,id)=>sum+(shop?.carry?.[id]||0),0);}
