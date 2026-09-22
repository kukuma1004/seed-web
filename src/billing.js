import {SUPPORT_PRODUCTS,supportProduct,supportPriceLabel,grantSupportPurchase} from './support.js';

// 결제 창구. 게임은 이 네 가지만 부른다: products() · purchase(id) · finish(구매) · pending().
// - 웹: 결제 없음(status 'web'). 구글 플레이 결제는 안드로이드 앱에서만 된다.
// - 안드로이드: 결제 플러그인(plugin)을 넘겨받으면 'ready'. 플러그인을 아직 안 붙였으면 'not-ready'.
// - 개발 서버(vite dev)에서 주소에 ?billing=mock: 돈이 나가지 않는 가짜 결제(시험용). 배포판에는 절대 안 켜진다.
// 구매 한 건 = {productId, orderId, token}. orderId는 구글 주문 번호(GPA.…), token은 소모 처리에 쓰는 값.
export function createBilling({native=Boolean(globalThis.Capacitor?.isNativePlatform?.()),dev=Boolean(import.meta.env?.DEV),search=globalThis.location?.search||'',plugin=null}={}){
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
  async purchase(id){try{return await plugin.purchase(id);}catch(error){return {ok:false,reason:error?.code==='cancelled'?'cancelled':'error'};}},
  async finish(purchase){try{return Boolean(await plugin.finish(purchase));}catch{return false;}},
  async pending(){try{return (await plugin.pending())||[];}catch{return [];}}
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
