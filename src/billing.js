import {SUPPORT_PRODUCTS,supportProduct,supportPriceLabel,grantSupportPurchase} from './support.js';

// 결제 창구. 게임은 이 네 가지만 부른다: products() · purchase(id) · finish(구매) · pending().
// - 웹: 결제 없음(status 'web'). 구글 플레이 결제는 안드로이드 앱에서만 된다.
// - 안드로이드: 구글 플레이 결제(@capgo/native-purchases)를 붙여 'ready'. plugin:null이면 'not-ready'.
// - 개발 서버(vite dev)에서 주소에 ?billing=mock: 돈이 나가지 않는 가짜 결제(시험용). 배포판에는 절대 안 켜진다.
// 구매 한 건 = {productId, orderId, token}. orderId는 구글 주문 번호(GPA.…), token은 소모 처리에 쓰는 값.
// 주의(2026-09-22 사고): 매개변수 기본값 안에 ?.() 를 쓰면 빌드(esbuild)가 변수 범위를 잘못 옮겨
// 배포판에서 'ReferenceError: s is not defined'로 첫 화면이 멈췄다. 기본값 계산은 함수 몸통에서 평범하게 한다.
function nativePlatform(){
 const capacitor=globalThis.Capacitor;
 return Boolean(capacitor&&typeof capacitor.isNativePlatform==='function'&&capacitor.isNativePlatform());
}
export function createBilling(options={}){
 const native=options.native===undefined?nativePlatform():Boolean(options.native);
 const dev=options.dev===undefined?Boolean(import.meta.env&&import.meta.env.DEV):Boolean(options.dev);
 const search=options.search===undefined?((globalThis.location&&globalThis.location.search)||''):String(options.search);
 const plugin=options.plugin===undefined?(native?googlePlayPlugin():null):options.plugin;
 if(dev&&new URLSearchParams(search).get('billing')==='mock')return mockBilling();
 if(native&&plugin)return pluginBilling(plugin);
 const status=native?'not-ready':'web';
 return {status,async products(){return [];},async purchase(){return {ok:false,reason:status};},async finish(){return false;},async pending(){return [];}};
}

function mockBilling(){
 const open=[];
 return {
  status:'mock',
  async products(){return SUPPORT_PRODUCTS.map(p=>({id:p.id,priceLabel:supportPriceLabel(p)}));},
  async purchase(id){if(!supportProduct(id))return {ok:false,reason:'unknown'};const purchase={productId:id,orderId:`MOCK.${Date.now().toString(36)}.${Math.random().toString(36).slice(2,8)}`,token:`mock-${open.length}`};open.push(purchase);return {ok:true,...purchase};},
  async finish(purchase){const i=open.findIndex(p=>p.token===purchase?.token);if(i>=0)open.splice(i,1);return i>=0;},
  async pending(){return open.map(p=>({...p}));}
 };
}

// 실제 플러그인 연결부. 어떤 결제 플러그인을 쓰든 이 네 함수만 맞춰 주면 된다.
function pluginBilling(plugin){
 return {
  status:'ready',
  async products(){try{return (await plugin.products(SUPPORT_PRODUCTS.map(p=>p.id)))||[];}catch{return [];}},
  async purchase(id){try{return await plugin.purchase(id);}catch(error){return {ok:false,reason:error?.code==='cancelled'||error?.code==='USER_CANCELED'?'cancelled':'error'};}},
  async finish(purchase){try{return Boolean(await plugin.finish(purchase));}catch{return false;}},
  async pending(){try{return (await plugin.pending())||[];}catch{return [];}}
 };
}

// 구글 플레이 결제 연결(2026-09-22). 플러그인은 앱에서 처음 결제를 부를 때만 불러온다(웹 번들은 건드리지 않음).
// - 자동 확인(autoAcknowledge)·자동 소모를 끈다: 게임 안 지급·저장이 끝난 뒤 finish()에서 consumePurchase(확인 겸 소모).
// - 사용자가 취소하면 USER_CANCELED, 편의점 결제처럼 '대기'면 purchaseState 2 → 끝나면 앱을 켤 때 pending()에서 받는다.
// - 주문 번호(orderId)가 비는 경우(일부 테스트 결제)에는 purchaseToken을 줄여 만든 키로 한 번만 지급한다.
export function purchaseKey(transaction){
 if(typeof transaction?.orderId==='string'&&transaction.orderId)return transaction.orderId.slice(0,80);
 const token=String(transaction?.purchaseToken||'');if(!token)return '';
 let a=0x811c9dc5,b=0x01000193;for(let i=0;i<token.length;i++){const c=token.charCodeAt(i);a=Math.imul(a^c,0x01000193)>>>0;b=Math.imul(b^c,0x5bd1e995)>>>0;}
 return `T.${a.toString(36)}${b.toString(36)}.${token.length}`;
}
function fromTransaction(t,fallbackId=''){
 const productId=t?.productIdentifier||fallbackId,token=t?.purchaseToken||'';
 if(t?.purchaseState&&t.purchaseState!=='1')return {ok:false,reason:'pending'};
 const orderId=purchaseKey(t);
 return productId&&token&&orderId?{ok:true,productId,orderId,token}:{ok:false,reason:'error'};
}
export function googlePlayPlugin(load=()=>import('@capgo/native-purchases')){
 let plugin=null;const native=async()=>plugin||(plugin=(await load()).NativePurchases);
 return {
  async products(ids){const {products=[]}=await (await native()).getProducts({productIdentifiers:ids,productType:'inapp'});return products.map(p=>({id:p.identifier,priceLabel:p.priceString}));},
  async purchase(id){
   try{return fromTransaction(await (await native()).purchaseProduct({productIdentifier:id,productType:'inapp',isConsumable:false,autoAcknowledgePurchases:false}),id);}
   catch(error){const code=String(error?.code||''),message=String(error?.message||'');return {ok:false,reason:code==='USER_CANCELED'?'cancelled':/pending/i.test(message)?'pending':code==='ITEM_ALREADY_OWNED'?'owned':'error'};}
  },
  async finish(purchase){await (await native()).consumePurchase({purchaseToken:purchase.token});return true;},
  async pending(){const {purchases=[]}=await (await native()).getPurchases({productType:'inapp'});return purchases.map(t=>fromTransaction(t)).filter(p=>p.ok&&supportProduct(p.productId));}
 };
}

// 결제 한 건 마무리: 먼저 게임 안에 지급(저장)하고, 저장이 끝난 뒤에만 구글에 '소모 완료'를 알린다.
// 순서가 반대면 앱이 중간에 꺼졌을 때 돈만 나가고 물건이 없을 수 있다. 이 순서면 최악이어도 다음 실행 때 다시 지급된다.
export async function completeSupportPurchase(storage,billing,purchase){
 const result=grantSupportPurchase(storage,purchase?.productId,purchase?.orderId);
 if(result.status==='granted'||result.status==='duplicate')await billing.finish(purchase);
 return result;
}
// 앱을 켤 때: 지난번에 지급·소모가 끝나지 않은 결제를 찾아 마무리한다.
export async function recoverSupportPurchases(storage,billing){
 const done=[];
 for(const purchase of await billing.pending())done.push(await completeSupportPurchase(storage,billing,purchase));
 return done.filter(r=>r.status==='granted');
}
