import assert from 'node:assert/strict';
import {ADMIN_EMAIL_HASH,DEFAULT_SEASON_STATUS,isSeasonAdmin,loadSeasonStatus,normalizeSeasonStatus} from '../src/season-access.js';

const adminDigest=async value=>value.toLowerCase()==='kukuma1004@gmail.com'?ADMIN_EMAIL_HASH:'0'.repeat(64);
assert.equal(await isSeasonAdmin({email:'KUKUMA1004@gmail.com',isAnonymous:false},adminDigest),true);
assert.equal(await isSeasonAdmin({email:'student@example.com',isAnonymous:false},adminDigest),false);
assert.equal(await isSeasonAdmin({email:'kukuma1004@gmail.com',isAnonymous:true},adminDigest),false);
assert.equal(normalizeSeasonStatus({paused:false,title:' 열림 '}).paused,false);
assert.equal(normalizeSeasonStatus({}).paused,true,'missing or malformed remote values fail closed');
const open=await loadSeasonStatus({fetchImpl:async()=>({ok:true,json:async()=>({paused:false,season:'1.2'})})});
assert.equal(open.paused,false);assert.equal(open.season,'1.2');
const offline=await loadSeasonStatus({fetchImpl:async()=>{throw new Error('offline');}});assert.deepEqual(offline,DEFAULT_SEASON_STATUS);
const dev=await loadSeasonStatus({enabled:false,fetchImpl:async()=>{throw new Error('must not fetch');}});assert.equal(dev.paused,false);
console.log('Season access: remote pause, fail-closed fallback, local development and administrator bypass passed.');
