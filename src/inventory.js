// Items carried through a run. The real boss drops the only item so far.
export const ITEMS=Object.freeze({
 potion:{id:'potion',name:'시간의 물약',heal:50,max:9,desc:'마시면 생명력 50 회복'}
});
export function emptyInventory(){return {potion:0};}
export function normalizeInventory(value){
 const out=emptyInventory();
 if(value&&typeof value==='object'&&!Array.isArray(value))for(const id of Object.keys(ITEMS)){const n=value[id];if(Number.isInteger(n))out[id]=Math.max(0,Math.min(ITEMS[id].max,n));}
 return out;
}
export function validInventory(value){
 return value===undefined||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([id,n])=>Object.hasOwn(ITEMS,id)&&Number.isInteger(n)&&n>=0&&n<=ITEMS[id].max));
}
// Adds up to the stack limit and reports how many were actually kept.
export function addItem(inventory,id,count=1){
 const before=inventory[id]||0,after=Math.min(ITEMS[id].max,before+count);inventory[id]=after;return after-before;
}
// Drinking at full health would waste the potion, so it is refused.
export function drinkPotion(inventory,hp,maxHp=100){
 if(!(inventory.potion>0))return {ok:false,reason:'empty',hp};
 if(hp>=maxHp)return {ok:false,reason:'full',hp};
 inventory.potion--;const next=Math.min(maxHp,hp+ITEMS.potion.heal);
 return {ok:true,hp:next,healed:next-hp};
}
