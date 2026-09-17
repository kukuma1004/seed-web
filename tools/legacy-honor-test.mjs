import assert from 'node:assert/strict';
import {FIRST_GARDEN_BADGE,readAccountProfile} from '../src/account-profile.js';
import {AUTH_KEY} from '../src/online-ranking.js';
import {FIRST_GARDEN_WINNER_HASHES,isFirstGardenPioneer,claimFirstGardenPioneer,legacyRankingUid} from '../src/legacy-honor.js';

const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
assert.equal(FIRST_GARDEN_WINNER_HASHES.length,9,'ten ranked records belonged to nine unique accounts');
assert.equal(new Set(FIRST_GARDEN_WINNER_HASHES).size,9);assert.ok(FIRST_GARDEN_WINNER_HASHES.every(v=>/^[a-f0-9]{64}$/.test(v)));
const winnerDigest=async()=>FIRST_GARDEN_WINNER_HASHES[0],loserDigest=async()=>'0'.repeat(64);
assert.equal(await isFirstGardenPioneer('winner',winnerDigest),true);assert.equal(await isFirstGardenPioneer('other',loserDigest),false);
const storage=memory();storage.setItem(AUTH_KEY,JSON.stringify({uid:'old-winner',refreshToken:'kept-private'}));
assert.equal(legacyRankingUid(storage),'old-winner');assert.equal(legacyRankingUid({getItem:()=>'{broken'}),'');
const selectiveDigest=async uid=>uid==='old-winner'?FIRST_GARDEN_WINNER_HASHES[0]:'0'.repeat(64);
assert.equal(await claimFirstGardenPioneer(storage,['new-account',legacyRankingUid(storage)],selectiveDigest),true,'a historical anonymous ranking identity can claim on the same device');
assert.deepEqual(readAccountProfile(storage).badges,[FIRST_GARDEN_BADGE]);
assert.equal(await claimFirstGardenPioneer(storage,'winner',winnerDigest),false,'the permanent honor is claimed once');
console.log('Legacy honor: nine unique old-board accounts claim one permanent no-power title.');
