import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPerfMonitor,PERF_CONFIG,S,E,severityOfFrame,severityOfFps,percentileFromHistogram,analyzeCauses,readSessions,saveSession,detectRegression,compareBuilds,formatSessionReport,uploadSession,describeEnvironment,summarizeSessions,PERF_STORAGE_KEY} from '../src/perf-monitor.js';
import {tapCounter} from '../src/perf-dev-menu.js';

function memoryStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),map:m};}
function rig(){
 let t=0,w=1_800_000_000_000;
 const mon=createPerfMonitor({now:()=>t,wall:()=>w+t});
 const state={enemies:10,bullets:20,enemyShots:5,formShots:0,particles:40,drawCalls:60,triangles:20000,build:{laws:'split:2',forms:'prism:3',relic:''}};
 const play=(ms,n=1,sections=null)=>{const out=[];for(let i=0;i<n;i++){t+=ms;if(sections){mon.beginFrame();for(const [k,v] of Object.entries(sections))mon.add(S[k],v);}const r=mon.frame(ms,true,()=>({...state}));if(r)out.push(r);}return out;};
 return {mon,play,state,advance:ms=>{t+=ms;},time:()=>t};
}

// 등급 기준
assert.equal(severityOfFrame(20),null);assert.equal(severityOfFrame(26),'MINOR');assert.equal(severityOfFrame(41),'MAJOR');assert.equal(severityOfFrame(61),'CRITICAL');
assert.equal(severityOfFps(50),null);assert.equal(severityOfFps(44),'MAJOR');assert.equal(severityOfFps(29),'CRITICAL');
const hist=new Uint32Array(252);hist[16]=95;hist[40]=5;assert.equal(percentileFromHistogram(hist,100,.95),17);assert.equal(percentileFromHistogram(hist,100,.99),41);

// 11. 부드러운 플레이 1분: 사건 0, 스팸 없음
{
 const {mon,play}=rig();mon.begin({env:{device:'Windows PC',browser:'Chrome',launch:'browser',version:'a'}});
 assert.equal(play(16.7,3600).length,0);
 // 가끔 주사율 한 칸을 놓치는 프레임(33ms)도 사건이 아니다.
 for(let i=0;i<20;i++){play(16.7,90);assert.equal(play(33.4).length,0);}
 const report=mon.end({outcome:'ended'});
 assert.equal(report.counts.MINOR+report.counts.MAJOR+report.counts.CRITICAL,0,'부드러운 판에서는 사건이 없어야 합니다.');
 assert.ok(report.avgFps>55&&report.avgFps<61);assert.equal(report.p95Ms,17);
 assert.match(formatSessionReport(report),/^SEED SESSION PERFORMANCE REPORT/);
}
// 1초 안에 3번 모인 긴 프레임은 MINOR 사건 하나
{
 const {mon,play}=rig();mon.begin();play(16.7,120);
 const made=[...play(30),...play(16.7,10),...play(30),...play(16.7,10),...play(30)];
 assert.equal(made.length,1);assert.equal(made[0].severity,'MINOR');assert.equal(made[0].type,'FRAME SPIKE');
}
// MAJOR·CRITICAL 한 프레임과 합치기, 시작 직후와 1초 넘는 멈춤은 무시
{
 const {mon,play}=rig();mon.begin();
 assert.equal(play(80).length,0,'시작 직후 준비 시간은 세지 않습니다.');
 play(16.7,120);
 const major=play(45);assert.equal(major.length,1);assert.equal(major[0].severity,'MAJOR');
 play(16.7,30);assert.equal(play(48).length,0,'3초 안의 같은 등급 사건은 합칩니다.');
 const crit=play(70);assert.equal(crit.length,1);assert.equal(crit[0].severity,'CRITICAL');
 assert.equal(play(4000).length,0,'탭 전환 같은 긴 멈춤은 세지 않습니다.');play(16.7,200);
 const r=mon.end();assert.equal(r.incidents[0].merged,1);assert.equal(r.worstMs,70);
}
// 지속 하락: 40FPS 3초 → FPS DROP(MAJOR)가 SUSTAINED FPS DROP으로, 25FPS면 CRITICAL로 올라간다
{
 const {mon,play}=rig();mon.begin();play(16.7,150);
 play(25,40*3);play(40,25*2);
 const r=mon.end();const drop=r.incidents.find(i=>i.type==='SUSTAINED FPS DROP');
 assert.ok(drop,'2초 넘는 하락은 SUSTAINED FPS DROP입니다.');assert.equal(drop.severity,'CRITICAL');assert.ok(drop.durationS>=4);
}
// 55FPS 밑이 2초 넘게 이어지면 MINOR 지속 하락
{
 const {mon,play}=rig();mon.begin();play(16.7,150);play(20,50*3);
 const r=mon.end();assert.equal(r.incidents.length,1);assert.equal(r.incidents[0].type,'SUSTAINED FPS DROP');assert.equal(r.incidents[0].severity,'MINOR');
}
// 7·9. 무거운 조합 + 파티클 급증 → 사건 자동 기록, 원인 후보에 파티클
{
 const {mon,play,state}=rig();mon.begin();play(16.7,120);
 for(let i=0;i<40;i++)mon.event(E.shot);mon.event(E.ultimate);
 state.particles=520;state.fxCounters={burst:10,explosion:3};mon.sampleState({...state});state.fxCounters={burst:220,explosion:60};
 mon.sampleState({...state});
 const [row]=play(52,1,{particles:9,render:4,projectiles:1});
 assert.ok(row);assert.equal(row.events.shot,40);assert.equal(row.events.ultimate,1);assert.equal(row.fx.burst,210);
 assert.ok(row.causes.some(c=>c.id==='particles'),'파티클 급증을 원인 후보로 짚어야 합니다.');
 assert.equal(row.build.forms,'prism:3');assert.equal(row.state.particles,520);
}
// 10. 충돌 급증 → 원인 후보에 충돌
{
 const {mon,play,state}=rig();mon.begin();play(16.7,120);
 state.enemies=90;state.bullets=160;state.particles=50;mon.sampleState({...state});
 const [row]=play(46,1,{collision:3,projectiles:11,enemyShots:2,enemyAI:4,render:3});
 assert.ok(row.causes.some(c=>c.id==='collision'),'충돌 과부하를 원인 후보로 짚어야 합니다.');
}
// 원인 분석: CPU가 한가한데 프레임만 길면 GPU/GC 후보
assert.ok(analyzeCauses({frameMs:70,sections:{render:2,enemyAI:1}}).some(c=>c.id==='gc'));
assert.ok(analyzeCauses({frameMs:30,sections:{render:2,enemyAI:1}}).some(c=>c.id==='gpu'));
assert.ok(analyzeCauses({frameMs:30,sections:{render:2},state:{drawCalls:160}}).some(c=>c.id==='drawCalls'));
// 사건 창: 3초 지난 사건은 빠진다
{
 const {mon,play,advance}=rig();mon.begin();play(16.7,120);mon.event(E.enemyDeath,3);advance(3500);play(16.7,1);
 assert.equal(mon.recentEvents().enemyDeath,undefined);
}
// 12. 판이 끝나면 요약 보고서
{
 const {mon,play,state}=rig();mon.begin({env:{device:'iPhone',os:'iOS 18.1',browser:'Safari',launch:'pwa',pwa:true,version:'2026-09-21·abc1234'}});
 play(16.7,300);state.enemies=70;mon.sampleState({...state});play(45);play(16.7,300);
 const r=mon.end({outcome:'cleared',context:{act:1,journey:12,build:state.build}});
 for(const k of ['durationS','avgFps','p95Ms','p99Ms','worstMs','counts','peaks','sectionAvg','incidents'])assert.ok(k in r,k);
 assert.equal(r.peaks.enemies,70);assert.equal(r.counts.MAJOR,1);
 const text=formatSessionReport(r);assert.match(text,/PERFORMANCE INCIDENT #1 · MAJOR · FRAME SPIKE/);assert.match(text,/설치 앱/);
 // 너무 짧은 판은 버린다
 const short=rig();short.mon.begin();short.play(16.7,60);assert.equal(short.mon.end(),null);
}
// 보관: 개수·기간·용량 제한
{
 const storage=memoryStorage(),now=1_800_000_000_000;
 for(let i=0;i<30;i++)saveSession(storage,{v:1,id:'s'+i,startedAt:now-i*1000,durationS:60,p95Ms:17,incidents:[]},{now});
 assert.equal(readSessions(storage,{now}).length,PERF_CONFIG.maxSessions);
 assert.equal(readSessions(storage,{now:now+15*86400000}).length,0,'14일 지난 기록은 사라집니다.');
 const big={v:1,id:'big',startedAt:now,incidents:Array.from({length:30},()=>({pad:'x'.repeat(9000)}))};
 saveSession(storage,big,{now});assert.ok(storage.getItem(PERF_STORAGE_KEY).length<=PERF_CONFIG.maxBytes*1.05);
}
// 버전 회귀 감지(P95 +55%)와 조합 비교
{
 const env={device:'Android 폰',browser:'Chrome',launch:'pwa'};
 const list=[{version:'A',env,startedAt:1,p95Ms:20,durationS:60},{version:'A',env,startedAt:2,p95Ms:20,durationS:60},{version:'B',env,startedAt:3,p95Ms:31,durationS:60},{version:'B',env,startedAt:4,p95Ms:31,durationS:60}];
 const [g]=detectRegression(list);assert.equal(g.increase,55);assert.equal(g.from,'A');assert.equal(g.to,'B');
 assert.match(formatSessionReport({...list[3],v:1,counts:{},spikes:{},peaks:{}},{regressions:[g]}),/PERFORMANCE REGRESSION DETECTED .* P95 \+55%/);
 assert.equal(detectRegression(list.slice(0,2)).length,0);
 const rows=compareBuilds([{context:{build:{forms:'a:1'}},p95Ms:30,avgFps:40,durationS:60,counts:{MAJOR:2}},{context:{build:{forms:'b:1'}},p95Ms:17,avgFps:59,durationS:60,counts:{}}]);
 assert.equal(rows[0].build,'a:1');assert.equal(rows[0].majorPerMin,2);
 assert.equal(summarizeSessions([]).sessions,0);
}
// 개발자 업로드: 개인정보 없음, 자기 uid 경로, 거절이면 permission_denied
{
 let seen=null;
 const report={id:'abc',version:'v',env:{device:'iPhone',browser:'Safari',launch:'pwa'},p95Ms:20,avgFps:58,incidents:[]};
 const ok=await uploadSession(report,{session:{uid:'U1',idToken:'T'},databaseURL:'https://db',fetchImpl:async(url,opt)=>{seen={url,opt};return {ok:true,status:200};}});
 assert.equal(ok.ok,true);assert.match(seen.url,/^https:\/\/db\/seedPerformance\/sessions\/U1\/abc\.json\?auth=T$/);
 const body=JSON.parse(seen.opt.body);assert.deepEqual(Object.keys(body).sort(),['at','avg','device','p95','r','v','version']);
 assert.doesNotMatch(seen.opt.body,/email|@|bphoneb|userAgent/i);
 assert.equal((await uploadSession(report,{session:{uid:'U1',idToken:'T'},databaseURL:'https://db',fetchImpl:async()=>({ok:false,status:401})})).reason,'permission_denied');
 assert.equal((await uploadSession(report,{session:null,databaseURL:'https://db'})).reason,'authentication_missing');
}
// 환경: UA 원문은 남기지 않는다
{
 const env=describeEnvironment({nav:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',maxTouchPoints:5,hardwareConcurrency:6},screenInfo:{width:390,height:844},win:{innerWidth:844,innerHeight:390,devicePixelRatio:3},launch:{mode:'pwa',fullscreenApi:false},version:'v'});
 assert.equal(env.device,'iPhone');assert.equal(env.os,'iOS 18.1');assert.equal(env.browser,'Safari');assert.equal(env.pwa,true);assert.equal(env.dpr,3);
 assert.doesNotMatch(JSON.stringify(env),/Mozilla|AppleWebKit/);
}
// 숨은 메뉴: 3초 안에 7번
{
 let t=0;const tap=tapCounter({now:()=>t});
 for(let i=0;i<6;i++){assert.equal(tap(),false);t+=300;}assert.equal(tap(),true);
 for(let i=0;i<7;i++){t+=900;assert.equal(tap(),false,"느리게 누르면 열리지 않습니다.");}
}
// 매 프레임 경로에서 JSON·DOM을 쓰지 않는다
{
 const src=fs.readFileSync(new URL('../src/perf-monitor.js',import.meta.url),'utf8');
 const frameBody=src.slice(src.indexOf(' function frame('),src.indexOf(' function fps1('));
 assert.doesNotMatch(frameBody,/JSON\.stringify|document\.|innerHTML/);
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/perf\.frame\(raw\*1000,mode==='playing'&&!paused,perfSnapshot\)/);
 assert.match(main,/function animate\(now\)\{animationHandle=0;if\(document\.hidden\)return;startAnimation\(\)/);
 for(const k of ['player','collision','forms','enemyAI','projectiles','enemyShots','particles','hud','render'])assert.match(main,new RegExp(`perfMark\\(PS\\.${k}\\)`),k);
 assert.match(main,/function perfFinish[\s\S]*saveSession\(rawStorage,report\)[\s\S]*if\(adminMode&&!localInspection\)/,'개발자 계정만 올립니다.');
 assert.doesNotMatch(main.slice(main.indexOf('function perfSnapshot'),main.indexOf('function perfBegin')),/playerName|email|displayName/,'성능 기록에 이름·이메일을 넣지 않습니다.');
}
console.log('성능 감시 검사 통과');
// 파이어베이스 규칙: 개발 기록은 자기 uid 아래에만, 익명 불가, 크기 제한
{
 const rules=JSON.parse(fs.readFileSync(new URL('../docs/firebase-rules-with-seed.json',import.meta.url),'utf8')).rules;
 const node=rules.seedPerformance.sessions.$uid;
 assert.equal(node['.read'],'auth != null && auth.uid == $uid');
 assert.match(node.$sessionId['.write'],/auth\.uid == \$uid && auth\.token\.firebase\.sign_in_provider != 'anonymous'/);
 assert.match(node.$sessionId.r['.validate'],/length <= 60000/);
 assert.equal(node.$sessionId.$other['.validate'],false);
 assert.equal(rules['.read'],false);assert.equal(rules['.write'],false);
}
console.log('성능 기록 규칙 검사 통과');
