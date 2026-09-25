import assert from 'node:assert/strict';
import {createWebTelemetry,loginFailureReason,seoulDay} from '../src/web-telemetry.js';
import {summarizeWebDay} from './web-telemetry-report.mjs';
import {summarizeUsageDay,usageTotals,readUsageDays} from '../src/usage-dashboard.js';
import {readFileSync} from 'node:fs';

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
assert.match(writes[1].url,/20260924\/starts\/anonymous-browser-1\/event-00000002\.json/);
assert.match(writes[2].url,/20260924\/loginFailures\/google\/network\/anonymous-browser-1\/event-00000003\.json/);
assert.ok(writes.every(({options})=>options.body==='true'),'no email, name or game state is sent');
for(let i=0;i<16;i++)telemetry.playTick(2);
await telemetry.playPause();
assert.match(writes.at(-1).url,/20260924\/sessions\/web\/anonymous-browser-1\/event-00000001\.json/);
assert.deepEqual(JSON.parse(writes.at(-1).options.body),{startedAt:Date.parse('2026-09-23T15:00:00Z'),activeSeconds:32,act:1,outcome:'active'});
await telemetry.endPlay('cleared');
assert.equal(JSON.parse(writes.at(-1).options.body).outcome,'cleared');

const appWrites=[];
const app=createWebTelemetry({enabled:true,platform:'android',databaseURL:'https://example.invalid',now:()=>Date.parse('2026-09-23T15:00:00Z'),session:async()=>({uid:'app-install-1',token:async()=>'token'}),eventId:()=>`android-${String(++serial).padStart(8,'0')}`,fetchImpl:async(url,options)=>{appWrites.push({url,options});return {ok:true};}});
await app.visit();await app.playStart();app.playTick(2);await app.endPlay();
assert.match(appWrites[0].url,/20260924\/appVisitors\/app-install-1\.json/);
assert.match(appWrites[1].url,/20260924\/appStarts\/app-install-1\//);
assert.match(appWrites[2].url,/20260924\/sessions\/android\/app-install-1\//);
assert.equal(JSON.parse(appWrites[2].options.body).activeSeconds,2);
assert.equal(JSON.parse(appWrites[2].options.body).outcome,'left');
assert.equal(await app.loginFailure('google',new Error('network')),false,'app login errors are not recorded as web failures');

let disabledCalls=0;
const disabled=createWebTelemetry({enabled:false,session:()=>{disabledCalls++;}});
assert.equal(await disabled.visit(),false);
assert.equal(await disabled.playStart(),false);
assert.equal(await disabled.loginFailure('google',new Error('network')),false);
assert.equal(disabledCalls,0,'Android and local QA never initialize web telemetry');
assert.deepEqual(summarizeWebDay({visitors:{a:true,b:true},starts:{a:{x:true,y:true}},loginFailures:{google:{network:{a:{z:true}}}}}),{
 browsers:2,starts:2,loginFailures:1,failureKinds:{'google/network':1}
});
const day=summarizeUsageDay('20260924',{visitors:{a:true,b:true},appVisitors:{c:true},starts:{a:{x:true,y:true}},appStarts:{c:{z:true}},sessions:{web:{a:{x:{activeSeconds:61,outcome:'cleared'}}},android:{c:{z:{activeSeconds:120,outcome:'ended'}}}}});
assert.deepEqual(day,{day:'20260924',webDevices:2,appDevices:1,webStarts:2,appStarts:1,activeSeconds:181,cleared:1,deaths:1});
assert.equal(usageTotals([day,day]).activeSeconds,362);
assert.equal(usageTotals([day,day]).cleared,2);
assert.equal(usageTotals([day,day]).deaths,2);
const read=await readUsageDays({tokenSession:async()=>({idToken:'admin-token'}),databaseURL:'https://example.invalid',now:()=>Date.parse('2026-09-23T15:00:00Z'),days:1,fetchImpl:async()=>({ok:true,json:async()=>({visitors:{a:true}})})});
assert.equal(read[0].webDevices,1);
const rules=JSON.parse(readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url))).rules.seedWebTelemetry.v1.days;
assert.match(rules['.read'],/email_verified/);
assert.match(rules['.read'],/kukuma1004@gmail\.com/);
assert.match(rules.$day.sessions.$platform.$uid.$eventId['.write'],/auth\.uid == \$uid/);
assert.match(rules.$day.sessions.$platform.$uid.$eventId['.write'],/activeSeconds/);
assert.match(rules.$day.sessions.$platform.$uid.$eventId.outcome['.validate'],/cleared/);
console.log('Web telemetry counting, privacy and platform gating passed.');
