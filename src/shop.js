export const SHOP_KEY='seed-shop-v1';
export const SHOP_STOCK_MAX=10;
export const SHOP_PRICES=Object.freeze({1:100,10:500});
const EMPTY=()=>({version:1,coins:0,tonics:0});
let fallback=EMPTY();

export function normalizeShop(value){
 const coins=Number.isInteger(value?.coins)?value.coins:0,tonics=Number.isInteger(value?.tonics)?value.tonics:0;
 return {version:1,coins:Math.max(0,Math.min(9_999_999,coins)),tonics:Math.max(0,Math.min(SHOP_STOCK_MAX,tonics))};
}
export function readShop(storage){
 if(!storage)return {...fallback};
 try{return normalizeShop(JSON.parse(storage.getItem(SHOP_KEY)||'null'));}catch{return EMPTY();}
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
export function buyTonics(storage,count){
 const current=readShop(storage),price=SHOP_PRICES[count];
 if(!price)return {ok:false,reason:'count',shop:current};
 if(current.tonics+count>SHOP_STOCK_MAX)return {ok:false,reason:'full',shop:current};
 if(current.coins<price)return {ok:false,reason:'coins',shop:current};
 current.coins-=price;current.tonics+=count;writeShop(storage,current);return {ok:true,count,price,shop:current};
}
// Bought stock enters exactly one fresh run. Continuing a checkpoint never calls this.
export function claimTonics(storage){
 const current=readShop(storage),count=current.tonics;
 if(count){current.tonics=0;writeShop(storage,current);}
 return count;
}
