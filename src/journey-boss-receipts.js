const bosses=['austin','alwaysbeginner','tempestcarrier'];
const validEpoch=value=>typeof value==='string'&&/^[\w-]{6,96}$/.test(value);
const sameEpoch=(a,b)=>a.bossEpoch===b.bossEpoch;
export function validJourneyBossReceipts(value){
 return Array.isArray(value)&&value.length<=3&&value.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).length===(Object.hasOwn(e,'bossEpoch')?3:2)&&Object.keys(e).every(k=>['boss','ordinal','bossEpoch'].includes(k))&&(!Object.hasOwn(e,'bossEpoch')||validEpoch(e.bossEpoch))&&bosses.includes(e.boss)&&Number.isInteger(e.ordinal)&&e.ordinal>=1&&e.ordinal<=1000000)&&new Set(value.map(e=>e.boss+':'+e.ordinal)).size===value.length;
}
export function addJourneyBossReceipt(pending,boss,ordinal,bossEpoch=null){
 const event={boss,ordinal,...(bossEpoch===null?{}:{bossEpoch})};
 if(!validJourneyBossReceipts(pending)||!validJourneyBossReceipts([event]))throw Error('invalid-journey-receipt');
 const previous=pending.find(e=>e.boss===boss&&e.ordinal===ordinal);
 if(previous){if(!sameEpoch(previous,event))throw Error('journey-receipt-epoch-conflict');return pending;}
 const next=[...pending,event];if(!validJourneyBossReceipts(next))throw Error('journey-receipt-full');return next;
}
