import assert from 'node:assert/strict';
import {SUPPORT_RELEASED,SUPPORT_PRODUCTS,supportProduct,supportRewardLines,supportRoom,grantSupportPurchase} from '../src/support.js';
import {createBilling,completeSupportPurchase,recoverSupportPurchases,googlePlayPlugin,purchaseKey} from '../src/billing.js';
import {readShop,writeShop,normalizeShop,STARTING_COINS,SHOP_STOCK_MAX} from '../src/shop.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

// 2026-09-22 사용자 설계: 세 가지 후원. 가격 = 받는 JP, 물약은 작은 물약 10개, 보스 물약 4종 1세트, 국밥은 다시 싹 하나 더.
assert.equal(SUPPORT_RELEASED,false,'결제 플러그인·플레이 콘솔 상품을 붙이기 전까지 공개하지 않는다');
assert.deepEqual(SUPPORT_PRODUCTS.map(p=>[p.icon,p.title,p.price,p.jp]),[['🌱','개발자 응원하기',500,500],['☕','커피 한 잔 사주기',2500,2500],['🍲','국밥 한 그릇 보태주기',5000,5000]]);
assert.ok(SUPPORT_PRODUCTS.every(p=>/^[a-z0-9_]+$/.test(p.id)),'플레이 콘솔 상품 id 형식(소문자·숫자·밑줄)');
assert.deepEqual(supportProduct('seed_support_500').items,{tonic:10});
assert.deepEqual(supportProduct('seed_support_2500').items,{tonic:10,potion:1,wind:1,shell:1,sprout:1});
assert.deepEqual(supportProduct('seed_support_5000').items,{tonic:10,potion:1,wind:1,shell:1,sprout:2});
assert.deepEqual(supportRewardLines(supportProduct('seed_support_5000')),['5,000 JP','작은 물약 10개','보스 물약 4종 1세트','다시 싹 1개']);

// 영수증 기록이 없으면 저장 모양이 예전과 똑같다(클라우드 저장 호환).
assert.equal(Object.hasOwn(normalizeShop({coins:10}),'purchases'),false);
assert.deepEqual(normalizeShop({coins:10,purchases:['A','A','',7,'x'.repeat(81)]}).purchases,['A'],'중복·빈 값·너무 긴 값은 버린다');

{
 const s=memory();
 const first=grantSupportPurchase(s,'seed_support_2500','GPA.0000-0001');
 assert.equal(first.status,'granted');assert.equal(first.shop.coins,STARTING_COINS+2500);
 assert.equal(first.shop.stash.tonic,10);assert.equal(first.shop.stash.sprout,1);assert.equal(first.shop.carry.tonic,0,'가져갈 개수는 플레이어가 고른다');
 assert.equal(grantSupportPurchase(s,'seed_support_2500','GPA.0000-0001').status,'duplicate','같은 주문은 두 번 주지 않는다');
 assert.equal(readShop(s).coins,STARTING_COINS+2500);
 assert.equal(grantSupportPurchase(s,'seed_support_9999','GPA.x').status,'unknown');
 assert.equal(grantSupportPurchase(s,'seed_support_500','').status,'unknown','주문 번호 없는 결제는 주지 않는다');
 // 보관 상한(999)을 넘으면 결제 전에 막는다(돈 낸 물건이 잘려 사라지지 않게).
 writeShop(s,{...readShop(s),stash:{...readShop(s).stash,sprout:SHOP_STOCK_MAX-1}});
 assert.equal(supportRoom(readShop(s),supportProduct('seed_support_5000')).ok,false);
 assert.deepEqual(supportRoom(readShop(s),supportProduct('seed_support_5000')).full,['sprout']);
 assert.equal(grantSupportPurchase(s,'seed_support_5000','GPA.0000-0002').status,'full');
 assert.equal(supportRoom(readShop(s),supportProduct('seed_support_500')).ok,true);
 writeShop(s,{...readShop(s),stash:{...readShop(s).stash,tonic:SHOP_STOCK_MAX-9}});
 assert.equal(supportRoom(readShop(s),supportProduct('seed_support_500')).ok,false,'작은 물약 10개가 안 들어가면 막는다');
}

// 결제 창구: 웹은 결제 없음, 안드로이드는 플러그인 전까지 준비 중, 가짜 결제는 개발 서버에서만.
assert.equal(createBilling({native:false,dev:false}).status,'web');
assert.equal(createBilling({native:true,dev:false,plugin:null}).status,'not-ready');
assert.equal(createBilling({native:true,dev:false}).status,'ready','안드로이드 앱은 구글 플레이 결제를 기본으로 붙인다');
assert.equal(createBilling({native:false,dev:false,search:'?billing=mock'}).status,'web','배포판에서는 가짜 결제가 켜지지 않는다');
assert.equal((await createBilling({native:false,dev:false}).purchase('seed_support_500')).ok,false);

{
 // 지급 → 저장 → 그 다음에 소모 완료. 앱이 지급 전에 꺼지면 다음 실행 때 pending에서 다시 지급한다.
 const s=memory(),billing=createBilling({dev:true,search:'?billing=mock'});
 assert.equal(billing.status,'mock');
 const bought=await billing.purchase('seed_support_500');assert.ok(bought.ok&&bought.orderId);
 assert.equal((await billing.pending()).length,1,'아직 소모 안 됨');
 const result=await completeSupportPurchase(s,billing,bought);
 assert.equal(result.status,'granted');assert.equal((await billing.pending()).length,0,'지급한 뒤 소모 완료');
 const crashed=await billing.purchase('seed_support_2500');
 const recovered=await recoverSupportPurchases(s,billing);
 assert.equal(recovered.length,1);assert.equal(readShop(s).coins,STARTING_COINS+500+2500);assert.equal((await billing.pending()).length,0);
 assert.equal(await completeSupportPurchase(s,billing,crashed).then(r=>r.status),'duplicate','다시 불려도 두 번 주지 않는다');
 // 보관함이 가득 차면 소모하지 않고 남겨 둔다(구글은 3일 안에 확인 안 된 결제를 자동 환불).
 writeShop(s,{...readShop(s),stash:{...readShop(s).stash,sprout:SHOP_STOCK_MAX}});
 const blocked=await billing.purchase('seed_support_5000');
 assert.equal((await completeSupportPurchase(s,billing,blocked)).status,'full');assert.equal((await billing.pending()).length,1);
}

// 플러그인 연결부: 어떤 플러그인이든 네 함수만 맞추면 된다. 사용자가 취소하면 cancelled.
{
 const calls=[];
 const plugin={products:async ids=>ids.map(id=>({id,priceLabel:'KRW'})),purchase:async id=>{if(id==='seed_support_500'){const e=new Error('no');e.code='cancelled';throw e;}return {ok:true,productId:id,orderId:'GPA.1',token:'t1'};},finish:async p=>{calls.push(p.token);return true;},pending:async()=>[]};
 const billing=createBilling({native:true,dev:false,plugin});
 assert.equal(billing.status,'ready');assert.equal((await billing.products()).length,3);
 assert.deepEqual(await billing.purchase('seed_support_500'),{ok:false,reason:'cancelled'});
 const s=memory(),bought=await billing.purchase('seed_support_2500');
 assert.equal((await completeSupportPurchase(s,billing,bought)).status,'granted');assert.deepEqual(calls,['t1']);
}
// 구글 플레이 연결부(@capgo/native-purchases): 자동 확인·자동 소모 끔, 지급 뒤 consumePurchase, 취소·대기·주문 번호 없는 테스트 결제.
{
 const log=[],owned=[];
 const fake={
  getProducts:async({productIdentifiers,productType})=>{log.push(['products',productType]);return {products:productIdentifiers.slice(0,2).map(identifier=>({identifier,priceString:'₩500'}))};},
  purchaseProduct:async o=>{log.push(['purchase',o.productIdentifier,o.productType,o.isConsumable,o.autoAcknowledgePurchases]);
   if(o.productIdentifier==='seed_support_500'){const e=new Error('Purchase is not purchased');e.code='USER_CANCELED';throw e;}
   if(o.productIdentifier==='seed_support_5000')throw new Error('Purchase is pending');
   const t={productIdentifier:o.productIdentifier,purchaseState:'1',orderId:'',purchaseToken:'tok-'+'x'.repeat(150)};owned.push(t);return t;},
  consumePurchase:async({purchaseToken})=>{log.push(['consume',purchaseToken.length]);owned.splice(owned.findIndex(t=>t.purchaseToken===purchaseToken),1);},
  getPurchases:async()=>({purchases:[...owned,{productIdentifier:'seed_support_500',purchaseState:'2',orderId:'GPA.wait',purchaseToken:'p'},{productIdentifier:'other_app_item',purchaseState:'1',orderId:'GPA.other',purchaseToken:'o'}]})
 };
 const billing=createBilling({native:true,dev:false,plugin:googlePlayPlugin(async()=>({NativePurchases:fake}))});
 assert.deepEqual(await billing.products(),[{id:'seed_support_500',priceLabel:'₩500'},{id:'seed_support_2500',priceLabel:'₩500'}],'스토어에 등록된 상품만 가격표에');
 assert.deepEqual(await billing.purchase('seed_support_500'),{ok:false,reason:'cancelled'});
 assert.deepEqual(await billing.purchase('seed_support_5000'),{ok:false,reason:'pending'});
 const s=memory(),bought=await billing.purchase('seed_support_2500');
 assert.ok(bought.ok&&bought.orderId.startsWith('T.')&&bought.orderId.length<=80,'주문 번호가 비면 토큰으로 짧은 키');
 assert.deepEqual(log.find(l=>l[0]==='purchase'&&l[1]==='seed_support_2500'),['purchase','seed_support_2500','inapp',false,false],'자동 확인·자동 소모를 끄고 산다');
 assert.equal((await billing.pending()).length,1,'대기(2)·다른 상품은 빼고, 소모 안 된 결제만');
 assert.equal((await completeSupportPurchase(s,billing,bought)).status,'granted');
 assert.ok(log.some(l=>l[0]==='consume'),'지급 뒤 소모(확인 겸)');assert.equal((await billing.pending()).length,0);
 assert.equal(purchaseKey({orderId:'GPA.1234'}),'GPA.1234');assert.equal(purchaseKey({purchaseToken:'abc'}),purchaseKey({purchaseToken:'abc'}));
 assert.notEqual(purchaseKey({purchaseToken:'abc'}),purchaseKey({purchaseToken:'abd'}));assert.equal(purchaseKey({}),'');
}
console.log('개발자 후원: 상품 세 가지·받는 것·영수증 한 번만·보관함 넘침 막기·지급 후 소모·다시 켤 때 마무리·웹/개발 게이트 통과');
