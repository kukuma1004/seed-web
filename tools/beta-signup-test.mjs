import assert from 'node:assert/strict';
import {BETA_CONSENT_VERSION,betaApplicant,betaApplicationMessage,submitBetaApplication} from '../src/beta-signup.js';

const user={uid:'tester-1',email:'',displayName:'',isAnonymous:true};
const applicant=betaApplicant(' Student@Gmail.com ',{android:true,consent:true,now:()=>1234});
assert.deepEqual(applicant,{email:'student@gmail.com',displayName:'',android:true,consentVersion:BETA_CONSENT_VERSION,appliedAt:1234,status:'pending',source:'public-web'});
assert.throws(()=>betaApplicant('student@gmail.com',{android:false,consent:true}),/ANDROID_REQUIRED/);
assert.throws(()=>betaApplicant('student@gmail.com',{android:true,consent:false}),/CONSENT_REQUIRED/);
assert.throws(()=>betaApplicant('student-at-gmail',{android:true,consent:true}),/EMAIL_INVALID/);
let request;
const result=await submitBetaApplication({account:{user:()=>null,guest:async()=>user,tokenSession:async()=>({uid:'tester-1',idToken:'token'})},email:'student@gmail.com',android:true,consent:true,now:()=>4321,fetchImpl:async(url,options)=>{request={url,options};return {ok:true};}});
assert.equal(result.appliedAt,4321);assert.match(request.url,/seedBetaApplicants\/tester-1\.json\?auth=token$/);assert.equal(request.options.method,'PUT');
assert.match(betaApplicationMessage(new Error('ANDROID_REQUIRED')),/Android/);
assert.match(betaApplicationMessage(new Error('EMAIL_INVALID')),/이메일/);
assert.match(betaApplicationMessage({code:'auth/unauthorized-domain'}),/AUTH-DOMAIN/);
console.log('Beta signup: direct Google Play email, anonymous application session, Android eligibility, consent and Firebase write passed.');
