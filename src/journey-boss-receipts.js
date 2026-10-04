const bosses=['austin','alwaysbeginner','tempestcarrier'];
export function validJourneyBossReceipts(value){
 return Array.isArray(value)&&value.length<=3&&value.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).length===2&&Object.keys(e).every(k=>['boss','ordinal'].includes(k))&&bosses.includes(e.boss)&&Number.isInteger(e.ordinal)&&e.ordinal>=1&&e.ordinal<=1000000)&&new Set(value.map(e=>e.boss+':'+e.ordinal)).size===value.length;
}
export function addJourneyBossReceipt(pending,boss,ordinal){
 if(!validJourneyBossReceipts(pending)||!validJourneyBossReceipts([{boss,ordinal}]))throw Error('invalid-journey-receipt');
 if(pending.some(e=>e.boss===boss&&e.ordinal===ordinal))return pending;
 const next=[...pending,{boss,ordinal}];if(!validJourneyBossReceipts(next))throw Error('journey-receipt-full');return next;
}
