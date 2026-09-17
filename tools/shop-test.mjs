import assert from 'node:assert/strict';
import {SHOP_KEY,SHOP_STOCK_MAX,SHOP_PRICES,STARTING_COINS,STASH_ITEMS,normalizeShop,readShop,writeShop,earnCoins,buyTonics,setCarry,claimCarry,grantGift,stashTotal,carryTotal} from '../src/shop.js';

const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
const empty={tonic:0,sprout:0};

// 처음 오는 사람은 시작 자금으로 물약 하나를 살 수 있다.
{
 const s=memory();
 assert.deepEqual(readShop(s),{version:2,coins:STARTING_COINS,stash:empty,carry:empty,gifts:[]});
 assert.equal(STARTING_COINS,SHOP_PRICES[1],'시작 자금으로 딱 한 개');
 assert.equal(readShop(s).coins,STARTING_COINS,'두 번째로 열어도 다시 주지 않는다');
 const spent=buyTonics(s,1);assert.ok(spent.ok);assert.equal(spent.shop.coins,0);
 assert.deepEqual(spent.shop.stash,{tonic:1,sprout:0});assert.deepEqual(spent.shop.carry,{tonic:1,sprout:0},'산 만큼은 가져가기에도 들어간다');
 assert.ok(s.data.has(SHOP_KEY));
}

// 값과 한계
assert.equal(SHOP_PRICES[1],100);assert.equal(SHOP_PRICES[10],500);assert.equal(SHOP_STOCK_MAX,10);
{
 const s=memory();writeShop(s,{coins:0,stash:empty,carry:empty});
 assert.equal(earnCoins(s,50).coins,50);assert.equal(buyTonics(s,1).reason,'coins');
 earnCoins(s,450);const bundle=buyTonics(s,10);assert.equal(bundle.ok,true);assert.equal(bundle.shop.coins,0);assert.equal(bundle.shop.stash.tonic,10);
 earnCoins(s,100);assert.equal(buyTonics(s,1).reason,'full','작은 물약은 10개까지 보관');
}

// 많이 있어도 안 가져갈 수 있다: 가져갈 개수를 고르고, 새 여정을 시작할 때 그만큼만 꺼낸다.
{
 const s=memory();writeShop(s,{coins:0,stash:{tonic:7,sprout:0},carry:{tonic:7,sprout:0}});
 assert.equal(setCarry(s,'tonic',0).carry.tonic,0);
 assert.deepEqual(claimCarry(s),{},'가져가기 0이면 아무것도 안 들어간다');
 assert.equal(readShop(s).stash.tonic,7,'보관함에 그대로 남는다');
 assert.equal(setCarry(s,'tonic',3).carry.tonic,3);
 assert.deepEqual(claimCarry(s),{tonic:3});assert.equal(readShop(s).stash.tonic,4);
 assert.equal(readShop(s).carry.tonic,3,'고른 개수는 다음 새 여정에도 그대로');
 assert.deepEqual(claimCarry(s),{tonic:3});assert.deepEqual(claimCarry(s),{tonic:1},'남은 만큼만');
 assert.deepEqual(claimCarry(s),{});assert.equal(readShop(s).carry.tonic,0);
 assert.equal(setCarry(s,'tonic',99).carry.tonic,0,'없는 것은 고를 수 없다');
 assert.equal(setCarry(s,'nope',2).carry.nope,undefined);
}

// 점검 선물: 다시 싹 1개와 작은 물약 3개가 각각 한 번만 보관함에 들어간다.
{
 const s=memory();
 const first=grantGift(s,'sorry-20260917','sprout',1);
 assert.equal(first.granted,true);assert.equal(first.shop.stash.sprout,1);assert.equal(first.shop.carry.sprout,1);
 assert.equal(grantGift(s,'sorry-20260917','sprout',1).granted,false,'같은 선물은 다시 주지 않는다');
 const tonics=grantGift(s,'sorry-tonics-20260917','tonic',3);
 assert.equal(tonics.granted,true);assert.equal(tonics.shop.stash.tonic,3);assert.equal(tonics.shop.carry.tonic,3);
 assert.equal(grantGift(s,'sorry-tonics-20260917','tonic',3).granted,false,'작은 물약도 한 번만 준다');
 assert.equal(readShop(s).stash.sprout,1);
 writeShop(s,{...readShop(s),stash:{tonic:0,sprout:3},carry:{tonic:0,sprout:3}});
 assert.equal(readShop(s).carry.sprout,1,'다시 싹은 한 판에 1개만');
 assert.deepEqual(claimCarry(s),{sprout:1});assert.equal(readShop(s).stash.sprout,2);
 assert.equal(STASH_ITEMS.sprout.max,3);
 assert.equal(stashTotal(readShop(s)),2);assert.equal(carryTotal(readShop(s)),1);
}

// 예전 저장(version 1): 산 작은 물약은 다음 새 여정에 전부 들어가던 약속 그대로 옮긴다.
{
 const old=normalizeShop({version:1,coins:250,tonics:4});
 assert.deepEqual(old,{version:2,coins:250,stash:{tonic:4,sprout:0},carry:{tonic:4,sprout:0},gifts:[]});
 assert.deepEqual(normalizeShop({coins:-2,tonics:99}).stash,{tonic:SHOP_STOCK_MAX,sprout:0});
 assert.deepEqual(normalizeShop(null).stash,empty);
 const broken={getItem(){throw new Error('막힘');},setItem(){throw new Error('막힘');}};
 assert.equal(readShop(broken).coins,STARTING_COINS);
}

console.log('상점 보관함: 구매·가져갈 개수 고르기·새 여정에서만 꺼내기·다시 싹 선물 한 번·예전 저장 옮기기 통과');
