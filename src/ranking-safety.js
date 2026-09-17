export const RANKING_TERMS_KEY='seed-ranking-terms-v1';
export const BLOCKED_USERS_KEY='seed-ranking-blocked-v1';
const MAX_BLOCKED=100;

export function rankingTermsAccepted(storage){
 try{return storage?.getItem(RANKING_TERMS_KEY)==='1';}catch{return false;}
}
export function setRankingTermsAccepted(storage,accepted){
 try{if(accepted)storage?.setItem(RANKING_TERMS_KEY,'1');else storage?.removeItem(RANKING_TERMS_KEY);return true;}catch{return false;}
}
export function blockedUsers(storage){
 try{const list=JSON.parse(storage?.getItem(BLOCKED_USERS_KEY));return Array.isArray(list)?list.filter(id=>typeof id==='string'&&id.length<=128).slice(-MAX_BLOCKED):[];}catch{return [];}
}
export function blockRankingUser(storage,uid){
 if(typeof uid!=='string'||!uid||uid.length>128)return blockedUsers(storage);
 const next=[...new Set([...blockedUsers(storage),uid])].slice(-MAX_BLOCKED);
 try{storage?.setItem(BLOCKED_USERS_KEY,JSON.stringify(next));}catch{}
 return next;
}
export function visibleRanking(board,storage){
 const blocked=new Set(blockedUsers(storage));
 return (Array.isArray(board)?board:[]).filter(entry=>!blocked.has(entry?.uid));
}
export function rankingReportMailto(entry,email='kukuma1004@gmail.com'){
 const subject='SEED 명예의 전당 신고';
 const body=['아래 랭킹 별명을 확인해 주세요.','',`별명: ${String(entry?.name||'')}`,`기록 ID: ${String(entry?.id||'')}`,`사용자 ID: ${String(entry?.uid||'')}`,'','신고 이유:'].join('\n');
 return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
