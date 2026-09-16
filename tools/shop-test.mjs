import assert from 'node:assert/strict';
import {SHOP_KEY,SHOP_STOCK_MAX,SHOP_PRICES,STARTING_COINS,normalizeShop,readShop,writeShop,earnCoins,buyTonics,claimTonics} from '../src/shop.js';

const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
// 처음 오는 사람은 시작 자금으로 물약 하나를 살 수 있다.
assert.deepEqual(readShop(storage),{version:1,coins:STARTING_COINS,tonics:0});
assert.equal(STARTING_COINS,SHOP_PRICES[1],'시작 자금으로 딱 한 개');
assert.deepEqual(readShop(storage),{version:1,coins:STARTING_COINS,tonics:0},'두 번째로 열어도 다시 주지 않는다');
{const spent=buyTonics(storage,1);assert.ok(spent.ok);assert.equal(readShop(storage).coins,0);
 assert.equal(readShop(storage).coins,0,'다 쓰고 나면 그대로 0원');
 assert.equal(claimTonics(storage),1);writeShop(storage,{coins:0,tonics:0});}
assert.deepEqual(normalizeShop({coins:-2,tonics:99}),{version:1,coins:0,tonics:SHOP_STOCK_MAX});
assert.equal(SHOP_PRICES[1],100);assert.equal(SHOP_PRICES[10],500);assert.equal(SHOP_STOCK_MAX,10);
assert.equal(earnCoins(storage,50).coins,50);assert.equal(buyTonics(storage,1).reason,'coins');
earnCoins(storage,450);const bundle=buyTonics(storage,10);assert.equal(bundle.ok,true);assert.equal(bundle.shop.coins,0);assert.equal(bundle.shop.tonics,10);
assert.equal(buyTonics(storage,1).reason,'full');assert.equal(claimTonics(storage),10);assert.equal(claimTonics(storage),0);
earnCoins(storage,250);assert.equal(buyTonics(storage,1).ok,true);assert.deepEqual(readShop(storage),{version:1,coins:150,tonics:1});
assert.ok(data.has(SHOP_KEY));
console.log('Shop: persistent boss coins, 100/500 prices, ten-potion cap and one-fresh-run claiming passed.');
