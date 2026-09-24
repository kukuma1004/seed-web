import assert from 'node:assert/strict';
import {createWebTelemetry,loginFailureReason,seoulDay} from '../src/web-telemetry.js';
import {summarizeWebDay} from './web-telemetry-report.mjs';

assert.equal(seoulDay(Date.parse('2026-09-23T14:59:00Z')),'20260923');
assert.equal(seoulDay(Date.parse('2026-09-23T15:00:00Z')),'20260924');
assert.equal(loginFailureReason({code:'auth/popup-closed-by-user'}),null);
assert.equal(loginFailureReason({code:'auth/network-request-failed'}),'network');
assert.equal(loginFailureReason({code:'DEVELOPER_ERROR'}),'config');

const writes=[];let sessions=0,serial=0;
const telemetry=createWebTelemetry({
 enabled:true,databaseURL:'https://example.invalid',now:()=>Date.parse('2026-09-23T15:00:00Z'),
 session:async()=>{sessions++;return {uid:'anonymous-browser-1',token:async()=>'<token>'};},
 eventId:()=>`event-${String(++serial).padStart(8,'0')}`,
 fetchImpl:async(url,options)=>{writes.push({url,options});return {ok:true};}
});
assert.deepEqual(await Promise.all([telemetry.visit(),telemetry.visit()]),[true,true]);
assert.equal(await telemetry.playStart(),true);
assert.equal(await telemetry.loginFailure('google',{code:'auth/network-request-failed'}),true);
assert.equal(await telemetry.loginFailure('google',{code:'auth/popup-closed-by-user'}),false);
assert.equal(sessions,1,'one separate anonymous Auth session is reused');
assert.equal(writes.length,3,'one daily browser, one start, one actual login failure');
assert.match(writes[0].url,/20260924\/visitors\/anonymous-browser-1\.json/);
assert.match(writes[1].url,/20260924\/starts\/anonymous-browser-1\/event-00000001\.json/);
assert.match(writes[2].url,/20260924\/loginFailures\/google\/network\/anonymous-browser-1\/event-00000002\.json/);
assert.ok(writes.every(({options})=>options.body==='true'),'no email, name or game state is sent');

let disabledCalls=0;
const disabled=createWebTelemetry({enabled:false,session:()=>{disabledCalls++;}});
assert.equal(await disabled.visit(),false);
assert.equal(await disabled.playStart(),false);
assert.equal(await disabled.loginFailure('google',new Error('network')),false);
assert.equal(disabledCalls,0,'Android and local QA never initialize web telemetry');
assert.deepEqual(summarizeWebDay({visitors:{a:true,b:true},starts:{a:{x:true,y:true}},loginFailures:{google:{network:{a:{z:true}}}}}),{
 browsers:2,starts:2,loginFailures:1,failureKinds:{'google/network':1}
});
console.log('Web telemetry counting, privacy and platform gating passed.');
