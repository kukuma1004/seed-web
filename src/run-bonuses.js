// Small run-only growth choices. They compete with a law choice, stay bounded,
// and disappear when the seed falls. Keeping them separate from laws preserves
// the combination identity while giving an injured or speed-focused player a
// meaningful alternative.
export const RUN_BONUS_MAX=5;
export const RUN_BONUS_CHANCE=.05;
export const RUN_BONUSES=Object.freeze({
 heal:Object.freeze({id:'heal',icon:'✦',name:'새잎 회복',desc:'생명력을 즉시 20 회복합니다.',color:'#9dffb7'}),
 move:Object.freeze({id:'move',icon:'➶',name:'가벼운 뿌리',desc:'이동 속도 +3%',color:'#8fe9ff'}),
 shot:Object.freeze({id:'shot',icon:'◇',name:'바람결 씨앗',desc:'탄환 속도 +4%',color:'#d2c4ff'}),
 power:Object.freeze({id:'power',icon:'✹',name:'단단한 심',desc:'씨앗의 모든 공격 피해 +3%',color:'#ffd384'})
});
export const emptyRunBonuses=()=>({move:0,shot:0,power:0});
export function normalizeRunBonuses(value){const out=emptyRunBonuses();for(const id of Object.keys(out)){const n=value?.[id];if(Number.isInteger(n))out[id]=Math.max(0,Math.min(RUN_BONUS_MAX,n));}return out;}
export function validRunBonuses(value){if(value===undefined)return true;const next=normalizeRunBonuses(value);return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(id=>Object.hasOwn(next,id))&&Object.entries(value).every(([id,n])=>next[id]===n);}
export const moveScale=value=>1+normalizeRunBonuses(value).move*.03;
export const shotScale=value=>1+normalizeRunBonuses(value).shot*.04;
export const powerScale=value=>1+normalizeRunBonuses(value).power*.03;
export function runBonusOffers(value,{hp=100,choicesTaken=0}={}){
 const state=normalizeRunBonuses(value),stats=['move','shot','power'].filter(id=>state[id]<RUN_BONUS_MAX);
 if(!stats.length)return hp<100?['heal']:[];
 const start=Math.max(0,choicesTaken)%stats.length,rotated=stats.slice(start).concat(stats.slice(0,start));
 return hp<100?['heal',rotated[0]]:rotated.slice(0,2);
}
// This is an extra blessing, never a replacement for the build-defining law
// card. Five percent keeps it memorable without flattening run variety.
export function rareRunBonusOffers(value,{hp=100,choicesTaken=0,random=Math.random,chance=RUN_BONUS_CHANCE}={}){
 const offers=runBonusOffers(value,{hp,choicesTaken});
 return offers.length&&random()<chance?offers:[];
}
export function applyRunBonus(value,id,{hp=100}={}){
 const state=normalizeRunBonuses(value),bonus=RUN_BONUSES[id];if(!bonus)return {ok:false,state,hp};
 if(id==='heal'){const next=Math.min(100,hp+20);return next===hp?{ok:false,state,hp}:{ok:true,state,hp:next,healed:next-hp};}
 if(state[id]>=RUN_BONUS_MAX)return {ok:false,state,hp};
 state[id]++;return {ok:true,state,hp,level:state[id]};
}
export function runBonusSummary(value){const s=normalizeRunBonuses(value),lines=[];if(s.move)lines.push(`이동 +${s.move*3}%`);if(s.shot)lines.push(`탄속 +${s.shot*4}%`);if(s.power)lines.push(`공격 +${s.power*3}%`);return lines;}
