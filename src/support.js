import {ITEMS} from './inventory.js';
import {readShop,writeShop,STASH_ITEMS,STASH_ORDER} from './shop.js';

// 개발자 후원(실제 결제, 2026-09-22 사용자 설계). 안드로이드 앱의 구글 플레이 결제로만 판다.
// 상품 id는 플레이 콘솔의 '인앱 상품 id'와 똑같아야 하고, 한 번 만들면 바꿀 수 없다(소모성 상품).
// '물약 10개'는 상점의 작은 물약, '보스 물약 4종 1세트'는 시간·바람·껍질 물약과 다시 싹 하나씩.
// 이 값이 공개되기 전까지(SUPPORT_RELEASED=false) 상점에 후원 칸이 보이지 않는다.
export const SUPPORT_RELEASED=false;
const BOSS_SET=Object.freeze({potion:1,wind:1,shell:1,sprout:1});
export const SUPPORT_PRODUCTS=Object.freeze([
 Object.freeze({id:'seed_support_500',icon:'🌱',title:'개발자 응원하기',price:500,jp:500,items:Object.freeze({tonic:10})}),
 Object.freeze({id:'seed_support_2500',icon:'☕',title:'커피 한 잔 사주기',price:2500,jp:2500,items:Object.freeze({tonic:10,...BOSS_SET})}),
 Object.freeze({id:'seed_support_5000',icon:'🍲',title:'국밥 한 그릇 보태주기',price:5000,jp:5000,items:Object.freeze({tonic:10,...BOSS_SET,sprout:BOSS_SET.sprout+1})})
]);
const byId=new Map(SUPPORT_PRODUCTS.map(p=>[p.id,p]));
export function supportProduct(id){return byId.get(id)||null;}
export function supportPriceLabel(product){return `${product.price.toLocaleString('ko-KR')}원`;}

// 받는 것 한 줄: "500 JP · 작은 물약 10 · 시간의 물약 1 …". 보스 물약 4종이 다 있으면 한 묶음으로 줄여 쓴다.
export function supportRewardLines(product){
 const items={...product.items},lines=[`${product.jp.toLocaleString('ko-KR')} JP`];
 if(items.tonic){lines.push(`${ITEMS.tonic.name} ${items.tonic}개`);delete items.tonic;}
 if(Object.keys(BOSS_SET).every(id=>(items[id]||0)>=BOSS_SET[id])){lines.push('보스 물약 4종 1세트');for(const id of Object.keys(BOSS_SET))items[id]-=BOSS_SET[id];}
 for(const id of STASH_ORDER)if(items[id]>0)lines.push(`${ITEMS[id].name} ${items[id]}개`);
 return lines;
}

// 보관함에 다 들어가는지. 돈을 낸 물건이 상한에 잘려 사라지면 안 되므로, 넘치면 결제를 시작하지 않는다.
export function supportRoom(shop,product){
 const full=Object.entries(product.items).filter(([id,n])=>!Object.hasOwn(STASH_ITEMS,id)||(shop.stash[id]||0)+n>STASH_ITEMS[id].max).map(([id])=>id);
 return {ok:full.length===0&&shop.coins+product.jp<=9_999_999,full};
}

// 결제 한 건 지급. orderId(구글 주문 번호)로 한 번만 준다: 앱이 결제 직후 꺼져서 다시 켤 때 또 불려도 안전.
// 결과 status: granted(지금 줌) · duplicate(이미 준 결제 — 구글 쪽 마무리만 하면 됨) · full(보관함 가득) · unknown(모르는 상품).
export function grantSupportPurchase(storage,productId,orderId){
 const product=supportProduct(productId),shop=readShop(storage);
 if(!product||typeof orderId!=='string'||!orderId||orderId.length>80)return {status:'unknown',shop};
 if((shop.purchases||[]).includes(orderId))return {status:'duplicate',product,shop};
 const room=supportRoom(shop,product);
 if(!room.ok)return {status:'full',product,full:room.full,shop};
 shop.coins+=product.jp;
 for(const [id,n] of Object.entries(product.items))shop.stash[id]+=n;
 shop.purchases=[...(shop.purchases||[]),orderId];
 if(!writeShop(storage,shop))return {status:'unsaved',product,shop:readShop(storage)};
 const saved=readShop(storage);
 return saved.purchases?.includes(orderId)?{status:'granted',product,shop:saved}:{status:'unsaved',product,shop:saved};
}
