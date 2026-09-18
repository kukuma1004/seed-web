// Small run-only growth choices. They compete with a law choice, stay bounded,
// and disappear when the seed falls. Keeping them separate from laws preserves
// the combination identity while giving an injured or speed-focused player a
// meaningful alternative.
export const RUN_BONUS_MAX=5;
export const RUN_BONUS_CHANCE=.02;
export const RUN_BONUSES=Object.freeze({
 heal:Object.freeze({id:'heal',icon:'♥',name:'생명력 즉시 +20',desc:'지금 잃은 생명력을 20 회복',color:'#9dffb7'}),
 move:Object.freeze({id:'move',icon:'➶',name:'이동 속도 +3%',desc:'이번 여정 동안 더 빠르게 이동',color:'#8fe9ff'}),
 shot:Object.freeze({id:'shot',icon:'➤',name:'탄환 속도 +4%',desc:'이번 여정 동안 탄환이 더 빠르게 이동',color:'#d2c4ff'}),
 power:Object.freeze({id:'power',icon:'✹',name:'공격력 +3%',desc:'이번 여정 동안 모든 공격 피해 증가',color:'#ffd384'})
});
export const emptyRunBonuses=()=>({move:0,shot:0,power:0});
export function normalizeRunBonuses(value){const out=emptyRunBonuses();for(const id of Object.keys(out)){const n=value?.[id];if(Number.isInteger(n))out[id]=Math.max(0,Math.min(RUN_BONUS_MAX,n));}return out;}
export function validRunBonuses(value){if(value===undefined)return true;const next=normalizeRunBonuses(value);return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(id=>Object.hasOwn(next,id))&&Object.entries(value).every(([id,n])=>next[id]===n);}
export const moveScale=value=>1+normalizeRunBonuses(value).move*.03;
export const shotScale=value=>1+normalizeRunBonuses(value).shot*.04;
export const powerScale=value=>1+normalizeRunBonuses(value).power*.03;
export function runBonusOffers(value,{hp=100,maxHp=100,choicesTaken=0}={}){
 const state=normalizeRunBonuses(value),stats=['move','shot','power'].filter(id=>state[id]<RUN_BONUS_MAX);
 if(!stats.length)return hp<maxHp?['heal']:[];
 const start=Math.max(0,choicesTaken)%stats.length,rotated=stats.slice(start).concat(stats.slice(0,start));
 return hp<maxHp?['heal',rotated[0]]:rotated.slice(0,2);
}
// This is an extra blessing, never a replacement for the build-defining law
// card. Two percent keeps it truly hidden without flattening run variety.
export function rareRunBonusOffers(value,{hp=100,maxHp=100,choicesTaken=0,random=Math.random,chance=RUN_BONUS_CHANCE}={}){
 const offers=runBonusOffers(value,{hp,maxHp,choicesTaken});
 return offers.length&&random()<chance?offers:[];
}
export function applyRunBonus(value,id,{hp=100,maxHp=100}={}){
 const state=normalizeRunBonuses(value),bonus=RUN_BONUSES[id];if(!bonus)return {ok:false,state,hp};
 if(id==='heal'){const next=Math.min(maxHp,hp+20);return next===hp?{ok:false,state,hp}:{ok:true,state,hp:next,healed:next-hp};}
 if(state[id]>=RUN_BONUS_MAX)return {ok:false,state,hp};
 state[id]++;return {ok:true,state,hp,level:state[id]};
}
export function runBonusSummary(value){const s=normalizeRunBonuses(value),lines=[];if(s.move)lines.push(`이동 +${s.move*3}%`);if(s.shot)lines.push(`탄속 +${s.shot*4}%`);if(s.power)lines.push(`공격 +${s.power*3}%`);return lines;}
