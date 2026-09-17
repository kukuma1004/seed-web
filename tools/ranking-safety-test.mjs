import assert from 'node:assert/strict';
import {rankingTermsAccepted,setRankingTermsAccepted,blockedUsers,blockRankingUser,visibleRanking,rankingReportMailto} from '../src/ranking-safety.js';
const data=new Map(),storage={getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
assert.equal(rankingTermsAccepted(storage),false);assert.ok(setRankingTermsAccepted(storage,true));assert.equal(rankingTermsAccepted(storage),true);setRankingTermsAccepted(storage,false);assert.equal(rankingTermsAccepted(storage),false);
assert.deepEqual(blockedUsers(storage),[]);assert.deepEqual(blockRankingUser(storage,'u2'),['u2']);assert.deepEqual(blockRankingUser(storage,'u2'),['u2']);assert.deepEqual(blockRankingUser(storage,''),['u2']);
const board=[{id:'a',uid:'u1',name:'하나'},{id:'b',uid:'u2',name:'둘'}];assert.deepEqual(visibleRanking(board,storage),[board[0]]);assert.deepEqual(visibleRanking(null,storage),[]);
const mail=rankingReportMailto(board[0]);assert.ok(mail.startsWith('mailto:kukuma1004@gmail.com?'));assert.ok(decodeURIComponent(mail).includes('하나')&&decodeURIComponent(mail).includes('기록 ID: a'));
console.log('랭킹 안전: 이용규칙 동의, 신고 메일, 사용자 숨기기와 저장 복구 통과');
