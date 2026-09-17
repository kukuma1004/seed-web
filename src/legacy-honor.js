import {FIRST_GARDEN_BADGE,readAccountProfile,writeAccountProfile} from './account-profile.js';
import {AUTH_KEY} from './online-ranking.js';

// Snapshot of the ten old-board records at the beta 1.1 reset. Two records used
// the same Firebase account, so ten ranked names resolve to nine permanent awards.
// Only SHA-256 digests are shipped; Firebase UIDs are not published in the bundle.
export const FIRST_GARDEN_WINNER_HASHES=Object.freeze([
 '3fbe162b8fe48e2e8c697ad68c6fa568dbab37be8e22c42faca6b43d36df79b2',
 'c07b0797d96137988cd4b72c8482eb90e66bd86bb68e81a161c162a396011c74',
 '40df1cb40d98e6e32e8b3b9619fb8a8357a8fa5a76a80e6937566aa1cd5d0776',
 '29b0d54b189b39d898a7f973e450bc2bab6a3c0151b50142c303b66bc5672f4a',
 '366a3fea1e94dd41169577be099a79f0bd8947c0e04e4311adc9ef495d07c290',
 '0f9c60ebecc453e3608e55a95608d40c8954b01c0c288ff3425e2cb8fcac83da',
 '450639ed3a1d0d2c9d65096146a6ef3fa9b1d455d0bf3c348ba53ede9d96fa7a',
 '7e52902263db7826b4465c3848310071d6a7e23d869e15b839c24c7e12b04ac5',
 '1cc6d54542060eaf946d45a1366894592d862985b14ca1fb056eb4fb1f104fc8'
]);

const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function sha256(value,subtle=globalThis.crypto?.subtle){
 if(!subtle||typeof TextEncoder==='undefined')return '';
 return hex(await subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
}
export async function isFirstGardenPioneer(uid,digest=sha256){
 if(typeof uid!=='string'||!uid)return false;
 const hash=await digest(uid);return FIRST_GARDEN_WINNER_HASHES.includes(hash);
}
export function legacyRankingUid(storage){
 try{const saved=JSON.parse(storage?.getItem(AUTH_KEY));return typeof saved?.uid==='string'?saved.uid:'';}catch{return '';}
}
export async function claimFirstGardenPioneer(storage,uids,digest=sha256){
 const profile=readAccountProfile(storage);if(profile.badges.includes(FIRST_GARDEN_BADGE))return false;
 const candidates=[...new Set((Array.isArray(uids)?uids:[uids]).filter(uid=>typeof uid==='string'&&uid))];
 let eligible=false;for(const uid of candidates)if(await isFirstGardenPioneer(uid,digest)){eligible=true;break;}
 if(!eligible)return false;
 return writeAccountProfile(storage,{...profile,badges:[...profile.badges,FIRST_GARDEN_BADGE],lastRewardAt:Date.now()});
}
