import assert from 'node:assert/strict';
import fs from 'node:fs';
import {accountRole,accountCanRank,rankingDecision,classifySubmitError,logRankingFailure,rankingFailures,RANKING_LOG_MAX} from '../src/ranking-eligibility.js';
import {launchContext} from '../src/mobile-app.js';

const google={uid:'dev-uid',isAnonymous:false},guest={uid:'g',isAnonymous:true};
// 4. 개발자(관리자) 계정: PC 웹에서도 일반 판은 랭킹에 들어간다
assert.deepEqual(rankingDecision({admin:true,user:google,score:1200,name:'개발자'}),{eligible:true,reason:null});
assert.equal(accountCanRank({admin:true,user:google}),true);
// 5. 개발자 실험 판(실험실·연습장·검사 도구)은 빠진다
assert.deepEqual(rankingDecision({isTestRun:true,admin:true,user:google,score:1200,name:'개발자'}),{eligible:false,reason:'test_run'});
assert.equal(rankingDecision({localInspection:true,admin:true,user:google,score:1,name:'a'}).reason,'test_run');
// 6. 일반 사용자(앱 로그인·등록 테스터)는 그대로 들어간다
assert.equal(rankingDecision({native:true,user:google,score:10,name:'a'}).eligible,true);
assert.equal(rankingDecision({tester:true,user:google,score:10,name:'a'}).eligible,true);
// 등록되지 않은 웹 계정·익명·점수 없음·속도 조작은 빠진다(보안 유지)
assert.equal(rankingDecision({user:google,score:10,name:'a'}).reason,'authentication_missing');
assert.equal(rankingDecision({native:true,user:guest,score:10,name:'a'}).reason,'authentication_missing');
assert.equal(rankingDecision({native:true,user:null,score:10,name:'a'}).reason,'authentication_missing');
assert.equal(rankingDecision({native:true,user:google,score:0,name:'a'}).reason,'invalid_score');
assert.equal(rankingDecision({native:true,user:google,score:NaN,name:'a'}).reason,'invalid_score');
assert.equal(rankingDecision({native:true,user:google,score:10,name:'a',paceTrusted:false}).reason,'invalid_score');
// 역할은 겹치지 않는다
assert.deepEqual({...accountRole({admin:true,tester:true})},{isAdmin:true,isDeveloper:true,isTester:false,isPlayer:false});
assert.deepEqual({...accountRole({tester:true})},{isAdmin:false,isDeveloper:false,isTester:true,isPlayer:false});
assert.equal(accountRole({}).isPlayer,true);
// 실패 이유 분류
assert.equal(classifySubmitError(Object.assign(new Error('Permission denied'),{status:401})),'authentication_missing');
assert.equal(classifySubmitError(Object.assign(new Error('Permission denied'),{status:403})),'permission_denied');
assert.equal(classifySubmitError(new Error('invalid-run')),'invalid_score');
assert.equal(classifySubmitError(new TypeError('Failed to fetch')),'network_error');
assert.equal(classifySubmitError(Object.assign(new Error('x'),{status:500})),'unknown');
// 실패 기록: 콘솔 형식, 이름·이메일 없음, 20개 제한
{
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},lines=[];
 const row=logRankingFailure(storage,{uid:'dev-uid',score:1234.7,reason:'permission_denied'},{warn:t=>lines.push(t)});
 assert.equal(lines[0],'RANKING SUBMIT FAILED\nUID: dev-uid\nScore: 1234\nReason: permission_denied');
 assert.deepEqual(Object.keys(row).sort(),['at','reason','score','uid']);
 for(let i=0;i<30;i++)logRankingFailure(storage,{uid:'u',score:i,reason:'weird'},{warn(){}});
 assert.equal(rankingFailures(storage).length,RANKING_LOG_MAX);assert.equal(rankingFailures(storage).at(-1).reason,'unknown');
 logRankingFailure(null,{reason:'test_run'},{warn(){}});
}
// main.js: 관리자도 랭킹 계정으로 치고, 실험 판만 뺀다
{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/const betaRankingEligible=\(\)=>accountCanRank\(\{native:account\.native,admin:adminMode,tester:betaTesterMode,user:account\.user\(\)\}\)/);
 assert.match(main,/rankingDecision\(\{isTestRun:developerRun,localInspection,score,name,native:account\.native,admin:role\.isAdmin/);
 assert.match(main,/if\(developerRun\)\{\$\('#overlay'\)[^\n]*logRankingFailure\(null,\{uid:account\.user\(\)\?\.uid,score,reason:'test_run'\}\);return;\}/);
 assert.match(main,/catch\(error=>\{\r?\n  logRankingFailure\(runStorage,\{uid:online\.uid\(\)\|\|account\.user\(\)\?\.uid,score,reason:classifySubmitError\(error\)\}\)/);
 assert.doesNotMatch(main,/betaTesterMode=!adminMode&&[^;]*;[^\n]*betaRankingEligible=\(\)=>Boolean\(\(account\.native\|\|betaTesterMode\)/,'예전 판정(관리자 제외)이 남으면 안 됩니다.');
}
// 1·2·3. 설치 앱과 일반 브라우저 구분
{
 const media=q=>({matches:q==='(display-mode: standalone)'});
 assert.equal(launchContext({media,nav:{},doc:{documentElement:{}}}).mode,'pwa','Android 설치 앱');
 assert.equal(launchContext({media:()=>({matches:false}),nav:{standalone:true},doc:{documentElement:{}}}).mode,'pwa','iPhone 홈 화면 앱');
 assert.equal(launchContext({media:()=>({matches:false}),nav:{standalone:false},doc:{documentElement:{requestFullscreen(){}}}}).mode,'browser','Safari·Chrome 탭');
 const fsMedia=q=>({matches:q==='(display-mode: fullscreen)'});
 assert.equal(launchContext({media:fsMedia,nav:{},doc:{fullscreenElement:{},documentElement:{requestFullscreen(){}}}}).mode,'browser','전체화면 API로 들어간 탭은 설치 앱이 아닙니다.');
 assert.equal(launchContext({media:fsMedia,nav:{},doc:{documentElement:{}}}).mode,'pwa','display_override fullscreen 설치 앱');
 assert.equal(launchContext({nativeApp:true,media:()=>({matches:true})}).mode,'native');
 const mobile=fs.readFileSync(new URL('../src/mobile-app.js',import.meta.url),'utf8');
 // 설치 앱: 버튼 없음, 자동 전체화면 없음, fullscreenchange 처리 없음
 assert.match(mobile,/\$\{browser\?'<button id="fullscreen-game"/);
 assert.match(mobile,/async function enterFullscreen\(\)\{[\s\S]*if\(!browser\)return;[\s\S]*requestFullscreen\(\{navigationUI:'hide'\}\)/);
 assert.match(mobile,/if\(browser\)\{\r?\n  document\.addEventListener\('fullscreenchange'/);
 const css=fs.readFileSync(new URL('../src/mobile.css',import.meta.url),'utf8');
 assert.match(css,/body\.installed-app #app-actions\{display:none!important\}/);
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.orientation,'landscape');assert.equal(manifest.display,'standalone');
}
console.log('랭킹 자격·설치 앱 검사 통과');
