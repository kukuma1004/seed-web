import assert from 'node:assert/strict';
import {BETA_CONSENT_VERSION,betaApplicant,betaApplicationMessage,submitBetaApplication} from '../src/beta-signup.js';

const user={uid:'tester-1',email:' Student@Gmail.com ',displayName:'테스터',isAnonymous:false};
const applicant=betaApplicant(user,{android:true,consent:true,now:()=>1234});
assert.deepEqual(applicant,{email:'student@gmail.com',displayName:'테스터',android:true,consentVersion:BETA_CONSENT_VERSION,appliedAt:1234,status:'pending',source:'public-web'});
assert.throws(()=>betaApplicant(user,{android:false,consent:true}),/ANDROID_REQUIRED/);
assert.throws(()=>betaApplicant(user,{android:true,consent:false}),/CONSENT_REQUIRED/);
let request;
const result=await submitBetaApplication({account:{user:()=>user,tokenSession:async()=>({uid:'tester-1',idToken:'token'})},android:true,consent:true,now:()=>4321,fetchImpl:async(url,options)=>{request={url,options};return {ok:true};}});
assert.equal(result.appliedAt,4321);assert.match(request.url,/seedBetaApplicants\/tester-1\.json\?auth=token$/);assert.equal(request.options.method,'PUT');
assert.match(betaApplicationMessage(new Error('ANDROID_REQUIRED')),/Android/);
assert.match(betaApplicationMessage({code:'auth/unauthorized-domain'}),/AUTH-DOMAIN/);
console.log('Beta signup: Google account record, Android eligibility, consent and authenticated Firebase write passed.');
