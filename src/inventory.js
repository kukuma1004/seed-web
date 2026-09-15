// Items carried through a run. Only Austin gives them, so they stay rare: no loot on the floor, none from wardens.
// kind: heal (refused at full health) · haste · shell (short protection) · revive (used by itself when the seed falls)
export const ITEMS=Object.freeze({
 potion:{id:'potion',name:'시간의 물약',kind:'heal',heal:50,max:9,key:'Q',desc:'마시면 생명력 50 회복',from:'오스틴'},
 tonic:{id:'tonic',name:'작은 물약',kind:'heal',heal:25,max:5,key:'Q',desc:'마시면 생명력 25 회복',from:'오스틴'},
 wind:{id:'wind',name:'바람 물약',kind:'haste',seconds:6,speed:1.35,max:3,key:'Q',desc:'6초 동안 이동 속도 +35%',from:'오스틴'},
 shell:{id:'shell',name:'껍질 물약',kind:'shell',seconds:3,max:3,key:'Q',desc:'3초 동안 모든 피해를 막음',from:'오스틴'},
 sprout:{id:'sprout',name:'다시 싹',kind:'revive',heal:50,guard:2,max:1,key:'',desc:'쓰러지는 순간 저절로 생명력 50으로 다시 일어남 (한 번)',from:'오스틴'}
});
// Order on screen and in the pause sheet. Passive items come last.
export const ITEM_ORDER=Object.freeze(['potion','tonic','wind','shell','sprout']);
export const usable=id=>Object.hasOwn(ITEMS,id)&&ITEMS[id].kind!=='revive';

export function emptyInventory(){return Object.fromEntries(ITEM_ORDER.map(id=>[id,0]));}
// A new run starts with one healing potion (2026-09-15: students kept asking for a way to heal).
// Continued runs keep whatever their save holds. A later idea: watch an ad for one more.
export const STARTING_ITEMS=Object.freeze({potion:1});
export function startingInventory(){const inv=emptyInventory();for(const [id,n] of Object.entries(STARTING_ITEMS))inv[id]=Math.min(ITEMS[id].max,n);return inv;}
export function normalizeInventory(value){
 const out=emptyInventory();
 if(value&&typeof value==='object'&&!Array.isArray(value))for(const id of ITEM_ORDER){const n=value[id];if(Number.isInteger(n))out[id]=Math.max(0,Math.min(ITEMS[id].max,n));}
 return out;
}
// Older saves only have {potion}; missing kinds are simply zero.
export function validInventory(value){
 return value===undefined||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([id,n])=>Object.hasOwn(ITEMS,id)&&Number.isInteger(n)&&n>=0&&n<=ITEMS[id].max));
}
// Adds up to the stack limit and reports how many were actually kept.
export function addItem(inventory,id,count=1){
 if(!Object.hasOwn(ITEMS,id))return 0;
 const before=inventory[id]||0,after=Math.min(ITEMS[id].max,before+count);inventory[id]=after;return after-before;
}

// Uses one item. Nothing is spent when the use would be wasted.
// Returns {ok,reason} or {ok:true,kind,hp,healed,seconds}.
export function useItem(inventory,id,{hp,maxHp=100}={}){
 const item=ITEMS[id];
 if(!item)return {ok:false,reason:'unknown',hp};
 if(item.kind==='revive')return {ok:false,reason:'passive',hp};
 if(!(inventory[id]>0))return {ok:false,reason:'empty',hp};
 if(item.kind==='heal'){
  if(hp>=maxHp)return {ok:false,reason:'full',hp};
  inventory[id]--;const next=Math.min(maxHp,hp+item.heal);
  return {ok:true,kind:'heal',hp:next,healed:next-hp};
 }
 inventory[id]--;
 return {ok:true,kind:item.kind,hp,seconds:item.seconds};
}
// Kept for the original potion flow and its tests.
export function drinkPotion(inventory,hp,maxHp=100){return useItem(inventory,'potion',{hp,maxHp});}

// Called when the seed would fall. Spends a sprout and says how to stand back up.
export function tryRevive(inventory){
 if(!(inventory.sprout>0))return null;
 inventory.sprout--;
 return {hp:ITEMS.sprout.heal,guard:ITEMS.sprout.guard};
}

// Austin is the only source: the big potion every time, plus one more drawn from the rest.
// Kinds already at their stack limit are not drawn, so the bonus is never wasted.
export const AUSTIN_BONUS=Object.freeze([['tonic',35],['wind',25],['shell',25],['sprout',15]]);
export function austinBonus(random=Math.random,inventory=null){
 const pool=AUSTIN_BONUS.filter(([id])=>!inventory||(inventory[id]||0)<ITEMS[id].max);
 if(!pool.length)return null;
 const total=pool.reduce((sum,[,w])=>sum+w,0);
 let roll=random()*total;
 for(const [id,w] of pool){if(roll<w)return id;roll-=w;}
 return pool[pool.length-1][0];
}
export function austinDrops(random=Math.random,inventory=null){
 const bonus=austinBonus(random,inventory);
 return bonus?['potion',bonus]:['potion'];
}

// The next usable item after `current` that the seed actually holds, for cycling on one button.
export function nextHeld(inventory,current=null){
 const held=ITEM_ORDER.filter(id=>usable(id)&&inventory[id]>0);
 if(!held.length)return null;
 const at=held.indexOf(current);
 return held[(at+1)%held.length];
}
export function heldItems(inventory){return ITEM_ORDER.filter(id=>inventory[id]>0);}
