// 조용한 성능 감시(Silent Performance Monitor).
// 화면에는 아무것도 띄우지 않고, 렉이 생긴 순간의 상황만 기록한다. 게임을 스스로 고치거나 화질을 낮추지 않는다.
// 비용 원칙: 매 프레임에는 프레임 시간과 구간 시간 덧셈만 한다. 무거운 집계는 0.5초마다, 기록 저장은 판이 끝날 때 한 번.
// 개인정보: 이름·이메일·전화번호·IP는 받지도 쓰지도 않는다. 계정은 내부 번호(uid)만 올릴 때 쓴다.
export const PERF_SCHEMA=1;
export const PERF_STORAGE_KEY='seed-perf-sessions-v1';
export const PERF_CONFIG=Object.freeze({
 targetFps:60,acceptableFps:55,
 // MINOR 한 프레임 25ms 초과 · MAJOR 40ms 초과 또는 1초 이상 45FPS 미만 · CRITICAL 60ms 초과 또는 1초 이상 30FPS 미만
 severity:Object.freeze({minorMs:25,majorMs:40,criticalMs:60,majorFps:45,criticalFps:30,lowFpsSeconds:1}),
 sustainedSeconds:2,
 budget:Object.freeze({enemies:Object.freeze([50,80]),bullets:Object.freeze([200,300]),particles:Object.freeze([300,500]),damageText:Object.freeze([25,50]),drawCalls:Object.freeze([100,150])}),
 sampleMs:500,eventBucketMs:100,eventWindowMs:3000,
 // 시작 직후(셰이더 준비)와 탭 전환·앱 복귀 같은 1초 넘는 멈춤은 사건으로 세지 않는다(통계에서도 뺀다).
 warmupMs:1500,ignoreFrameMs:1000,
 // 25~40ms 한 프레임은 주사율 한 칸을 놓친 정도라 1초 안에 3번 이상 모일 때만 사건으로 남긴다.
 minorCluster:3,
 incidentGapMs:Object.freeze({MINOR:10000,MAJOR:3000,CRITICAL:2000}),
 maxIncidents:30,maxSessions:20,ttlDays:14,maxBytes:200000,minSessionSeconds:5
});
// 매 프레임 덧셈할 구간. 번호로 쓰고 이름은 보고서에서만 쓴다.
export const SECTIONS=Object.freeze(['animation','player','shooting','collision','forms','active','enemyAI','spawn','hazards','orbit','projectiles','enemyShots','effects','world','particles','scene','hud','render']);
export const SECTION_LABELS=Object.freeze({animation:'성장 연출',player:'플레이어 이동·조준',shooting:'기본 공격 발사',collision:'충돌 격자 재구성',forms:'진화 무기',active:'궁극기',enemyAI:'적 행동',spawn:'적 소환',hazards:'함정·중력',orbit:'궤도 꽃잎',projectiles:'내 탄환 이동·충돌',enemyShots:'적 탄환',effects:'임시 효과 정리',world:'쓰러짐·방 정리',particles:'파티클',scene:'카메라·배경',hud:'HUD',render:'렌더 제출(CPU)'});
export const S=Object.freeze(Object.fromEntries(SECTIONS.map((name,i)=>[name,i])));
export const EVENTS=Object.freeze(['shot','enemyDeath','ultimate','activeSkill','loot','bossAttack']);
export const E=Object.freeze(Object.fromEntries(EVENTS.map((name,i)=>[name,i])));
const SEVERITY_ORDER=Object.freeze({MINOR:1,MAJOR:2,CRITICAL:3});
const HIST_BINS=252; // 0~250ms를 1ms 칸으로, 마지막 칸은 그 이상.

export function severityOfFrame(ms,c=PERF_CONFIG){
 const s=c.severity;return ms>s.criticalMs?'CRITICAL':ms>s.majorMs?'MAJOR':ms>s.minorMs?'MINOR':null;
}
export function severityOfFps(fps,c=PERF_CONFIG){
 const s=c.severity;return fps<s.criticalFps?'CRITICAL':fps<s.majorFps?'MAJOR':null;
}
export function percentileFromHistogram(hist,total,p){
 if(!total)return 0;const want=Math.ceil(total*p);let seen=0;
 for(let i=0;i<hist.length;i++){seen+=hist[i];if(seen>=want)return i+1;}
 return hist.length;
}
export function budgetLevel(value,[warn,limit]){return value>=limit?'over':value>=warn?'warn':'ok';}
const round=(v,d=1)=>Math.round((Number(v)||0)*10**d)/10**d;

// 사건이 났을 때 원인 후보를 고른다. 판단 근거를 같이 적어서 사람이 확인할 수 있게 한다.
export function analyzeCauses({frameMs=0,sections={},state={},events={},fx={},firstSeen=[]}={},c=PERF_CONFIG){
 const causes=[],b=c.budget,cpu=Object.values(sections).reduce((n,v)=>n+(v||0),0);
 const top=Object.entries(sections).sort((a,b)=>b[1]-a[1])[0]||['',0];
 const particles=state.particles||0,draws=state.drawCalls||0,enemies=state.enemies||0,bullets=(state.bullets||0)+(state.enemyShots||0)+(state.formShots||0);
 const fxTotal=Object.values(fx).reduce((n,v)=>n+(v||0),0);
 if(particles>=b.particles[0]||fxTotal>=600)causes.push({id:'particles',label:'파티클·겹침(가산 합성) 과다 가능성',evidence:`파티클 ${particles}개 · 최근 3초 방출 ${fxTotal}개`});
 const collide=(sections.collision||0)+(sections.projectiles||0)+(sections.enemyShots||0)+(sections.orbit||0);
 if(enemies*bullets>=6000||collide>=Math.max(4,cpu*.4))causes.push({id:'collision',label:'충돌 검사 과부하 가능성',evidence:`적 ${enemies} × 탄 ${bullets} · 충돌 관련 ${round(collide)}ms`});
 if(draws>=b.drawCalls[0])causes.push({id:'drawCalls',label:'드로콜·재질 전환 과다 가능성',evidence:`드로콜 ${draws}회 · 삼각형 ${state.triangles||0}`});
 if((sections.enemyAI||0)>=Math.max(3,cpu*.35))causes.push({id:'enemyAI',label:'적 행동 계산 과다',evidence:`적 행동 ${round(sections.enemyAI)}ms · 적 ${enemies}`});
 if((sections.render||0)>=Math.max(6,cpu*.5))causes.push({id:'render',label:'렌더 제출(CPU) 비용 과다',evidence:`렌더 제출 ${round(sections.render)}ms`});
 if(firstSeen.length)causes.push({id:'shader',label:'처음 보는 효과의 셰이더 준비 가능성',evidence:`처음 등장: ${firstSeen.join(', ')}`});
 // CPU 구간 합이 프레임의 3분의 1도 안 되면 그 시간은 GPU 대기나 가비지 수집(GC)에 쓰였을 가능성이 크다.
 if(frameMs>0&&cpu<frameMs*.34){
  if(frameMs>=c.severity.majorMs&&!(events.shot>0&&particles>=b.particles[0]))causes.push({id:'gc',label:'가비지 수집(GC)이나 브라우저 멈춤 가능성',evidence:`CPU 구간 합 ${round(cpu)}ms / 프레임 ${round(frameMs)}ms`});
  else causes.push({id:'gpu',label:'GPU 처리 대기(화면 채우기·후처리) 가능성',evidence:`CPU 구간 합 ${round(cpu)}ms / 프레임 ${round(frameMs)}ms`});
 }
 if(!causes.length&&top[1]>0)causes.push({id:'section',label:`가장 무거운 구간: ${SECTION_LABELS[top[0]]||top[0]}`,evidence:`${round(top[1])}ms`});
 return causes;
}

// 환경 정보. 브라우저 전체 UA 문자열은 남기지 않고 기기 종류·OS·브라우저 이름만 남긴다.
export function describeEnvironment({nav=globalThis.navigator,screenInfo=globalThis.screen,win=globalThis,launch=null,renderer=null,version='',quality=null}={}){
 const ua=String(nav?.userAgent||'');
 const device=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)||(/Macintosh/.test(ua)&&nav?.maxTouchPoints>1)?'iPad':/Android/.test(ua)?(/Mobile/.test(ua)?'Android 폰':'Android 태블릿'):/Windows/.test(ua)?'Windows PC':/Macintosh/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'기타';
 const os=(ua.match(/OS (\d+)_(\d+)/)?.slice(1,3).join('.')&&('iOS '+ua.match(/OS (\d+)_(\d+)/).slice(1,3).join('.')))||(ua.match(/Android (\d+(?:\.\d+)?)/)?'Android '+ua.match(/Android (\d+(?:\.\d+)?)/)[1]:'')||(/Windows NT 10/.test(ua)?'Windows 10/11':/Mac OS X/.test(ua)?'macOS':'');
 const browser=/SamsungBrowser/.test(ua)?'Samsung Internet':/EdgA?\//.test(ua)?'Edge':/CriOS|Chrome\//.test(ua)?(/; wv\)/.test(ua)?'Android WebView':'Chrome'):/FxiOS|Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'기타';
 let gpu='';try{const gl=renderer?.getContext?.(),ext=gl?.getExtension?.('WEBGL_debug_renderer_info');gpu=String(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'').slice(0,80);}catch{}
 const canvas=renderer?.domElement,size=canvas?{x:canvas.width,y:canvas.height}:null;
 return {device,os,browser,gpu,launch:launch?.mode||'browser',pwa:launch?.mode==='pwa',fullscreenApi:Boolean(launch?.fullscreenApi),screen:`${screenInfo?.width||0}x${screenInfo?.height||0}`,viewport:`${win?.innerWidth||0}x${win?.innerHeight||0}`,render:size?`${size.x}x${size.y}`:'',dpr:round(win?.devicePixelRatio||1,2),rendererDpr:round(renderer?.getPixelRatio?.()||1,2),cores:nav?.hardwareConcurrency||0,memory:nav?.deviceMemory||0,version,quality};
}
export const deviceKey=env=>`${env?.device||'?'}|${env?.browser||'?'}|${env?.launch||'?'}`;

export function createPerfMonitor({now=()=>performance.now(),wall=()=>Date.now(),config=PERF_CONFIG}={}){
 const c=config,sev=c.severity;
 const sections=new Float64Array(SECTIONS.length);      // 이번 프레임
 const windowSections=new Float64Array(SECTIONS.length);// 0.5초 창 합계
 const sessionSections=new Float64Array(SECTIONS.length);
 let windowFrames=0;
 const hist=new Uint32Array(HIST_BINS);
 const bucketCount=Math.ceil(c.eventWindowMs/c.eventBucketMs);
 const eventBuckets=new Uint16Array(bucketCount*EVENTS.length);
 let bucketIndex=0,bucketStart=0;
 const eventTotals=new Uint32Array(EVENTS.length);
 const fxRing=Array.from({length:Math.ceil(c.eventWindowMs/c.sampleMs)},()=>({})); let fxIndex=0,fxLast=null;
 const secFps=new Float32Array(10);let secIndex=0,secFilled=0;
 let session=null;
 function reset(){
  sections.fill(0);windowSections.fill(0);sessionSections.fill(0);hist.fill(0);eventBuckets.fill(0);eventTotals.fill(0);secFps.fill(0);
  for(const r of fxRing)for(const k in r)delete r[k];
  windowFrames=0;bucketIndex=0;secIndex=0;secFilled=0;fxLast=null;fxIndex=0;
 }
 function begin({env={},context={},id=null}={}){
  reset();const t=now();bucketStart=t;
  session={id:id||`${wall().toString(36)}${Math.floor(Math.random()*1e6).toString(36)}`,startedAt:wall(),t0:t,active:0,frames:0,totalMs:0,worstMs:0,worstAt:0,worstSections:null,worstState:null,
   secAcc:0,secFrames:0,lowRun:0,lowRunSeverity:null,drop:null,minorTimes:[],spikes:{MINOR:0,MAJOR:0,CRITICAL:0},incidents:[],counts:{MINOR:0,MAJOR:0,CRITICAL:0},
   peaks:{enemies:0,bullets:0,enemyShots:0,formShots:0,particles:0,effects:0,drawCalls:0,triangles:0,damageText:0},state:null,lastSample:t,seenFx:new Set(),newFx:[],env,context:{...context},budgetHits:{},heavy:{build:{},effect:{},skill:{},ultimate:{},boss:{}}};
  return session.id;
 }
 const running=()=>Boolean(session);
 function beginFrame(){sections.fill(0);}
 function add(index,ms){sections[index]+=ms;}
 function event(index,n=1){if(!session)return;rollBuckets(now());eventBuckets[bucketIndex*EVENTS.length+index]+=n;eventTotals[index]+=n;}
 function rollBuckets(t){
  while(t-bucketStart>=c.eventBucketMs){bucketStart+=c.eventBucketMs;bucketIndex=(bucketIndex+1)%bucketCount;eventBuckets.fill(0,bucketIndex*EVENTS.length,(bucketIndex+1)*EVENTS.length);if(t-bucketStart>c.eventWindowMs){bucketStart=t;eventBuckets.fill(0);break;}}
 }
 function recentEvents(){
  const out={};for(let e=0;e<EVENTS.length;e++){let n=0;for(let b=0;b<bucketCount;b++)n+=eventBuckets[b*EVENTS.length+e];if(n)out[EVENTS[e]]=n;}return out;
 }
 function recentFx(){const out={};for(const r of fxRing)for(const k in r)out[k]=(out[k]||0)+r[k];return out;}
 const sectionObject=arr=>{const o={};for(let i=0;i<arr.length;i++)if(arr[i]>=.05)o[SECTIONS[i]]=round(arr[i],2);return o;};
 // 매 프레임 한 번. 게임이 멈춰 있거나 메뉴면 active=false로 부르고, 그때는 아무것도 세지 않는다.
 function frame(ms,active=true,sample=null){
  if(!session||!active||!(ms>0))return null;
  if(ms>c.ignoreFrameMs){session.secAcc=0;session.secFrames=0;return null;}
  const t=now();session.active+=ms;rollBuckets(t);
  if(session.active<c.warmupMs)return null;
  session.frames++;session.totalMs+=ms;hist[Math.min(HIST_BINS-1,Math.floor(ms))]++;
  for(let i=0;i<sections.length;i++){windowSections[i]+=sections[i];sessionSections[i]+=sections[i];}windowFrames++;
  let created=null;
  const level=severityOfFrame(ms,c);
  // 최악 프레임은 긴 프레임이 없던 판에서도 남긴다(최댓값이 바뀔 때만 복사하므로 드물다).
  if(ms>session.worstMs){session.worstMs=ms;session.worstAt=session.active;session.worstSections=sectionObject(sections);session.worstState=session.state?{...session.state}:null;}
  if(level){
   session.spikes[level]++;
   if(level==='MINOR'){
    const times=session.minorTimes;times.push(t);while(times.length&&t-times[0]>1000)times.shift();
    if(times.length>=c.minorCluster){times.length=0;created=incident('FRAME SPIKE','MINOR',ms,sample);}
   }else created=incident('FRAME SPIKE',level,ms,sample);
  }
  session.secAcc+=ms;session.secFrames++;
  if(session.secAcc>=1000){
   const fps=session.secFrames*1000/session.secAcc;session.secAcc=0;session.secFrames=0;
   secFps[secIndex]=fps;secIndex=(secIndex+1)%secFps.length;secFilled=Math.min(secFps.length,secFilled+1);
   // 45FPS 미만 1초 = MAJOR, 30FPS 미만 1초 = CRITICAL, 55FPS 미만이 2초 넘게 이어지면 SUSTAINED FPS DROP(최소 MINOR).
   if(fps<c.acceptableFps){
    session.lowRun++;
    const sustained=session.lowRun>=c.sustainedSeconds,level=severityOfFps(fps,c)||(sustained?'MINOR':null);
    if(level&&!session.drop){session.drop=incident(sustained?'SUSTAINED FPS DROP':'FPS DROP',level,1000/fps,sample,{fps});if(session.drop){session.drop.durationS=session.lowRun;session.drop.minFps=round(fps);}}
    else if(session.drop){
     const d=session.drop;d.durationS=session.lowRun;d.minFps=round(Math.min(d.minFps??fps,fps));
     if(sustained)d.type='SUSTAINED FPS DROP';
     if(level&&SEVERITY_ORDER[level]>SEVERITY_ORDER[d.severity]){session.counts[d.severity]--;d.severity=level;session.counts[level]++;}
    }
   }else{session.lowRun=0;session.drop=null;}
  }
  return created;
 }
 function fps1(){return secFilled?secFps[(secIndex+secFps.length-1)%secFps.length]:0;}
 function fps5(){if(!secFilled)return 0;let n=0,s=0;for(let i=1;i<=Math.min(5,secFilled);i++){s+=secFps[(secIndex+secFps.length-i)%secFps.length];n++;}return s/n;}
 function stats(){
  const total=session?.frames||0;
  const avgMs=total?session.totalMs/total:0;
  return {frames:total,avgFps:avgMs?round(1000/avgMs):0,fps1:round(fps1()),fps5:round(fps5()),p95Ms:percentileFromHistogram(hist,total,.95),p99Ms:percentileFromHistogram(hist,total,.99),worstMs:round(session?.worstMs||0)};
 }
 // 0.5초마다 게임이 현재 상태를 넘긴다(객체는 재사용해도 된다). 최고치와 구간 평균만 갱신한다.
 function sampleState(state){
  if(!session||!state)return;
  const t=now();session.lastSample=t;
  const snap=session.state||(session.state={});Object.assign(snap,state);
  const p=session.peaks;
  for(const k in p)if(typeof state[k]==='number'&&state[k]>p[k])p[k]=state[k];
  for(const [k,range] of Object.entries(c.budget)){const v=k==='bullets'?(state.bullets||0)+(state.enemyShots||0)+(state.formShots||0):state[k]||0;const lv=budgetLevel(v,range);if(lv!=='ok')session.budgetHits[k]=(session.budgetHits[k]||0)+1;}
  if(state.fxCounters){
   const slot=fxRing[fxIndex];for(const k in slot)delete slot[k];
   if(fxLast){for(const k in state.fxCounters){const d=state.fxCounters[k]-(fxLast[k]||0);if(d>0)slot[k]=d;}}
   fxLast={...state.fxCounters};fxIndex=(fxIndex+1)%fxRing.length;
   for(const k in slot)if(!session.seenFx.has(k)){session.seenFx.add(k);session.newFx.push({k,t});}
  }
  windowSections.fill(0);windowFrames=0;
 }
 function incident(type,severity,frameMs,sample,extra={}){
  const s=session,t=now(),last=s.incidents[s.incidents.length-1];
  if(last&&t-last.t<c.incidentGapMs[last.severity]&&SEVERITY_ORDER[severity]<=SEVERITY_ORDER[last.severity]&&type===last.type){last.merged=(last.merged||0)+1;last.worstMs=round(Math.max(last.worstMs,frameMs));return null;}
  s.counts[severity]++;
  if(s.incidents.length>=c.maxIncidents)return null;
  const state=sample?sample():s.state?{...s.state}:{};
  if(state&&typeof state==='object')Object.assign(s.state||(s.state={}),state);
  const secs=type==='FRAME SPIKE'?sectionObject(sections):sectionObject(windowFrames?windowSections.map(v=>v/windowFrames):windowSections);
  const events=recentEvents(),fx=recentFx();
  const firstSeen=s.newFx.filter(n=>t-n.t<=1500).map(n=>n.k);
  const st=stats();
  const row={t,type,severity,at:wall(),sessionS:round(s.active/1000),frameMs:round(frameMs),worstMs:round(frameMs),fps:round(extra.fps??fps1()),fps5:st.fps5,p95Ms:st.p95Ms,p99Ms:st.p99Ms,sessionWorstMs:st.worstMs,
   state:compactState(state),build:state.build||null,sections:secs,events,fx,causes:analyzeCauses({frameMs,sections:secs,state,events,fx,firstSeen},c)};
  s.incidents.push(row);noteHeavy(row);
  return row;
 }
 function compactState(st={}){
  const out={};for(const k of ['act','journey','room','stage','boss','bossPattern','enemies','bullets','enemyShots','formShots','particles','effects','damageText','activeFx','loot','drawCalls','triangles','textures','geometries','programs','pool','activeSkill','ultimate','quality'])if(st[k]!==undefined&&st[k]!==null&&st[k]!=='')out[k]=st[k];return out;
 }
 const weight={MINOR:1,MAJOR:3,CRITICAL:6};
 function noteHeavy(row){
  const h=session.heavy,w=weight[row.severity]||1,bump=(bag,key)=>{if(key)bag[key]=(bag[key]||0)+w;};
  bump(h.build,row.build?.forms||row.build?.laws||'');
  const fxTop=Object.entries(row.fx).sort((a,b)=>b[1]-a[1])[0];bump(h.effect,fxTop?.[0]);
  bump(h.skill,row.state.activeSkill);bump(h.ultimate,row.state.ultimate);bump(h.boss,row.state.boss&&row.state.bossPattern?`${row.state.boss} · ${row.state.bossPattern}`:row.state.boss);
 }
 const topOf=bag=>{const e=Object.entries(bag).sort((a,b)=>b[1]-a[1])[0];return e?{name:e[0],weight:e[1]}:null;};
 // 판이 끝나면 한 번 요약한다. 너무 짧은 판(메뉴 왕복 등)은 버린다.
 function end({outcome='',context={}}={}){
  if(!session)return null;
  const s=session;session=null;
  if(s.frames<1||s.active<c.minSessionSeconds*1000)return null;
  const total=s.frames,avgMs=s.totalMs/total,p95=percentileFromHistogram(hist,total,.95),p99=percentileFromHistogram(hist,total,.99);
  const sectionAvg={};for(let i=0;i<SECTIONS.length;i++){const v=sessionSections[i]/total;if(v>=.01)sectionAvg[SECTIONS[i]]=round(v,3);}
  const bottleneckVotes={};for(const row of s.incidents)for(const cause of row.causes.slice(0,2))bottleneckVotes[cause.label]=(bottleneckVotes[cause.label]||0)+(weight[row.severity]||1);
  return {v:PERF_SCHEMA,id:s.id,version:s.env?.version||'',startedAt:s.startedAt,durationS:round(s.active/1000),outcome,env:s.env,context:{...s.context,...context},
   avgFps:round(1000/avgMs),p95Ms:p95,p99Ms:p99,p95Fps:round(1000/p95),p99Fps:round(1000/p99),worstMs:round(s.worstMs),worstAtS:round(s.worstAt/1000),worstSections:s.worstSections,worstState:s.worstState?compactState(s.worstState):null,worstBuild:s.worstState?.build||null,
   frames:total,spikes:{...s.spikes},counts:{...s.counts},peaks:{...s.peaks},budgetHits:{...s.budgetHits},sectionAvg,events:Object.fromEntries(EVENTS.map((n,i)=>[n,eventTotals[i]]).filter(([,v])=>v>0)),
   heavy:{build:topOf(s.heavy.build),effect:topOf(s.heavy.effect),skill:topOf(s.heavy.skill),ultimate:topOf(s.heavy.ultimate),boss:topOf(s.heavy.boss)},bottleneck:topOf(bottleneckVotes),incidents:s.incidents.map(({t,...row})=>row)};
 }
 return {begin,end,running,beginFrame,add,frame,event,sampleState,stats,sections,recentEvents,recentFx,due:()=>session&&now()-session.lastSample>=c.sampleMs,
  state:()=>session?{...stats(),incidents:session.incidents.length,counts:{...session.counts},spikes:{...session.spikes},peaks:{...session.peaks}}:null};
}

// ---------------- 이 기기 보관 ----------------
export function readSessions(storage,{now=Date.now(),config=PERF_CONFIG}={}){
 try{
  const list=JSON.parse(storage?.getItem(PERF_STORAGE_KEY)||'[]');
  if(!Array.isArray(list))return [];
  return list.filter(r=>r&&r.v===PERF_SCHEMA&&now-(r.startedAt||0)<=config.ttlDays*86400000);
 }catch{return [];}
}
export function saveSession(storage,report,{now=Date.now(),config=PERF_CONFIG}={}){
 if(!report)return readSessions(storage,{now,config});
 let list=[...readSessions(storage,{now,config}).filter(r=>r.id!==report.id),report].slice(-config.maxSessions);
 let text=JSON.stringify(list);
 // 용량을 넘으면 오래된 판부터 뺀다. 그래도 크면 사건 목록을 줄인다.
 while(text.length>config.maxBytes&&list.length>1){list=list.slice(1);text=JSON.stringify(list);}
 if(text.length>config.maxBytes){list=list.map(r=>({...r,incidents:(r.incidents||[]).slice(0,8)}));text=JSON.stringify(list);}
 try{storage?.setItem(PERF_STORAGE_KEY,text);}catch{}
 return list;
}

// ---------------- 여러 판 비교 ----------------
function groupBy(list,key){const m=new Map();for(const r of list){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return m;}
const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:0;
// 조합별 비교: 같은 진화 조합끼리 P95와 분당 사건 수를 평균낸다.
export function compareBuilds(sessions){
 const rows=[];
 for(const [build,list] of groupBy(sessions.filter(r=>r.worstBuild?.forms||r.context?.build?.forms),r=>(r.context?.build?.forms||r.worstBuild?.forms))){
  const minutes=list.reduce((n,r)=>n+(r.durationS||0),0)/60,incidents=list.reduce((n,r)=>n+(r.counts?.MAJOR||0)+(r.counts?.CRITICAL||0),0);
  rows.push({build,sessions:list.length,p95Ms:round(mean(list.map(r=>r.p95Ms))),avgFps:round(mean(list.map(r=>r.avgFps))),majorPerMin:round(minutes?incidents/minutes:0,2)});
 }
 return rows.sort((a,b)=>b.p95Ms-a.p95Ms);
}
// 버전 회귀: 같은 기기·브라우저·실행 방식끼리 최신 버전과 그 전 버전의 P95를 비교한다.
export function detectRegression(sessions,{threshold=.25,minSessions=2,minSeconds=60}={}){
 const found=[];
 for(const [device,list] of groupBy(sessions,r=>deviceKey(r.env))){
  const byVersion=[...groupBy(list,r=>r.version||'?').entries()].map(([version,rows])=>({version,rows,at:Math.max(...rows.map(r=>r.startedAt||0)),seconds:rows.reduce((n,r)=>n+(r.durationS||0),0)})).filter(v=>v.rows.length>=minSessions||v.seconds>=minSeconds).sort((a,b)=>a.at-b.at);
  if(byVersion.length<2)continue;
  const [before,after]=byVersion.slice(-2),p95Before=mean(before.rows.map(r=>r.p95Ms)),p95After=mean(after.rows.map(r=>r.p95Ms));
  if(p95Before>0&&(p95After-p95Before)/p95Before>=threshold)found.push({device,from:before.version,to:after.version,p95Before:round(p95Before),p95After:round(p95After),increase:Math.round((p95After-p95Before)/p95Before*100)});
 }
 return found;
}
export function summarizeSessions(sessions){
 const worst=[...sessions].sort((a,b)=>b.worstMs-a.worstMs)[0]||null;
 const votes={},stages={},effects={},ults={},builds={};
 const bump=(bag,k,w)=>{if(k)bag[k]=(bag[k]||0)+w;};
 for(const r of sessions){
  if(r.bottleneck)bump(votes,r.bottleneck.name,r.bottleneck.weight);
  for(const row of r.incidents||[]){const w={MINOR:1,MAJOR:3,CRITICAL:6}[row.severity]||1;bump(stages,[row.state?.act&&`${row.state.act}막`,row.state?.journey&&`여정 ${row.state.journey}`,row.state?.boss||(row.state?.room!==undefined?`${row.state.room+1}번째 방`:'')].filter(Boolean).join(' · '),w);bump(builds,row.build?.forms,w);const fx=Object.entries(row.fx||{}).sort((a,b)=>b[1]-a[1])[0];bump(effects,fx?.[0],w);bump(ults,row.state?.ultimate,w);}
 }
 const top=bag=>Object.entries(bag).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
 return {sessions:sessions.length,worstFrame:worst?{ms:worst.worstMs,version:worst.version,build:worst.worstBuild?.forms||'',state:worst.worstState}:null,worstStage:top(stages),worstBuild:top(builds),worstEffect:top(effects),worstUltimate:top(ults),commonBottleneck:top(votes)};
}

// ---------------- 복사용 글 보고서 ----------------
export function formatSessionReport(r,{regressions=[]}={}){
 if(!r)return 'SEED SESSION PERFORMANCE REPORT\n기록이 없습니다.';
 const lines=['SEED SESSION PERFORMANCE REPORT',
  `버전: ${r.version||'-'} · 시작: ${new Date(r.startedAt).toISOString()}`,
  `환경: ${r.env?.device||'-'} · ${r.env?.os||'-'} · ${r.env?.browser||'-'} · ${r.env?.launch||'-'}${r.env?.pwa?' (설치 앱)':''} · 화면 ${r.env?.screen||'-'} · 렌더 ${r.env?.render||'-'} · DPR ${r.env?.dpr}/${r.env?.rendererDpr} · 화질 ${r.env?.quality??'-'}${r.env?.gpu?' · GPU '+r.env.gpu:''}`,
  `판: ${r.context?.act?r.context.act+'막':''} 여정 ${r.context?.journey??'-'} · ${r.outcome||''} · ${r.durationS}초`,
  `FPS 평균 ${r.avgFps} · P95 ${r.p95Ms}ms(${r.p95Fps}FPS) · P99 ${r.p99Ms}ms(${r.p99Fps}FPS) · 최악 ${r.worstMs}ms(${r.worstAtS}초)`,
  `사건 CRITICAL ${r.counts?.CRITICAL||0} · MAJOR ${r.counts?.MAJOR||0} · MINOR ${r.counts?.MINOR||0} · 긴 프레임 ${r.spikes?.MINOR||0}/${r.spikes?.MAJOR||0}/${r.spikes?.CRITICAL||0}`,
  `최고치 적 ${r.peaks?.enemies||0} · 내 탄 ${r.peaks?.bullets||0} · 진화 탄 ${r.peaks?.formShots||0} · 적 탄 ${r.peaks?.enemyShots||0} · 파티클 ${r.peaks?.particles||0} · 드로콜 ${r.peaks?.drawCalls||0} · 삼각형 ${r.peaks?.triangles||0}`,
  `구간 평균(ms/프레임): ${Object.entries(r.sectionAvg||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${SECTION_LABELS[k]||k} ${v}`).join(' · ')}`];
 if(r.worstSections)lines.push(`최악 프레임 구간: ${Object.entries(r.worstSections).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${SECTION_LABELS[k]||k} ${v}ms`).join(' · ')}`);
 if(r.worstBuild)lines.push(`최악 순간 조합: 법칙 ${r.worstBuild.laws||'-'} / 진화 ${r.worstBuild.forms||'-'} / 유물 ${r.worstBuild.relic||'-'}`);
 const h=r.heavy||{};
 lines.push(`가장 비싼 조합: ${h.build?.name||'-'} · 효과: ${h.effect?.name||'-'} · 궁극기: ${h.ultimate?.name||h.skill?.name||'-'} · 보스 패턴: ${h.boss?.name||'-'}`);
 if(r.bottleneck)lines.push(`가장 흔한 병목: ${r.bottleneck.name}`);
 for(const g of regressions)lines.push(`PERFORMANCE REGRESSION DETECTED · ${g.device} · P95 +${g.increase}% (${g.from} ${g.p95Before}ms → ${g.to} ${g.p95After}ms)`);
 for(const [i,row] of (r.incidents||[]).slice(0,12).entries()){
  lines.push('',`PERFORMANCE INCIDENT #${i+1} · ${row.severity} · ${row.type}${row.merged?` (+${row.merged} 비슷한 사건)`:''}`,
   `  시각 ${new Date(row.at).toISOString()} · 판 ${row.sessionS}초 · 프레임 ${row.frameMs}ms · FPS ${row.fps}(5초 ${row.fps5})${row.durationS?` · ${row.durationS}초 지속`:''} · P95 ${row.p95Ms} · P99 ${row.p99Ms} · 최악 ${row.sessionWorstMs}`,
   `  상태 ${Object.entries(row.state||{}).map(([k,v])=>`${k}=${typeof v==='object'?JSON.stringify(v):v}`).join(' ')}`,
   `  조합 법칙 ${row.build?.laws||'-'} / 진화 ${row.build?.forms||'-'}`,
   `  구간 ${Object.entries(row.sections||{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${SECTION_LABELS[k]||k} ${v}ms`).join(' · ')}`,
   `  최근 3초 사건 ${Object.entries(row.events||{}).map(([k,v])=>`${k} ${v}`).join(' · ')||'-'} · 효과 ${Object.entries(row.fx||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k} ${v}`).join(' · ')||'-'}`,
   ...(row.causes||[]).map(cause=>`  원인 후보: ${cause.label} (${cause.evidence})`));
 }
 return lines.join('\n');
}

// ---------------- 개발자 기록 올리기 ----------------
// 개발자 계정의 판만 올린다. 랭킹과 무관하게 동작하고, 실패해도 게임에는 영향이 없다.
export const PERF_UPLOAD_PATH='seedPerformance/sessions';
export async function uploadSession(report,{session,databaseURL,fetchImpl=(...a)=>fetch(...a)}={}){
 if(!report||!session?.uid||!session?.idToken||!databaseURL)return {ok:false,reason:'authentication_missing'};
 const body=JSON.stringify({v:PERF_SCHEMA,at:{'.sv':'timestamp'},version:String(report.version||'').slice(0,40),device:deviceKey(report.env).slice(0,80),p95:Number(report.p95Ms)||0,avg:Number(report.avgFps)||0,r:JSON.stringify(report).slice(0,60000)});
 try{
  const res=await fetchImpl(`${databaseURL}/${PERF_UPLOAD_PATH}/${encodeURIComponent(session.uid)}/${encodeURIComponent(report.id)}.json?auth=${encodeURIComponent(session.idToken)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body});
  return res.ok?{ok:true}:{ok:false,reason:res.status===401||res.status===403?'permission_denied':'unknown',status:res.status};
 }catch{return {ok:false,reason:'network_error'};}
}
