// 랭킹에 올릴지 정하는 규칙. 계정의 역할과 판의 성격을 따로 본다.
// 2026-09-21: 관리자(개발자) 계정은 '베타테스터'로 세지 않아서 PC 웹에서 한 판이 끝나도
// 제출 직전에 조용히 빠졌다. 개발자라는 사실은 랭킹 제외 이유가 아니다.
// 빠지는 것은 명시적인 실험 판(개발자 실험실·연습장·검사 도구·거울의 탑)뿐이다.
export const RANKING_FAIL_REASONS=Object.freeze(['authentication_missing','permission_denied','invalid_score','test_run','network_error','duplicate','unknown']);
export const RANKING_LOG_KEY='seed-ranking-failures-v1';
export const RANKING_LOG_MAX=20;

// 역할: 관리자=개발자, 등록 테스터, 그 밖의 플레이어. 서로 겹치지 않는다.
export function accountRole({admin=false,tester=false}={}){
 const isAdmin=Boolean(admin);
 return Object.freeze({isAdmin,isDeveloper:isAdmin,isTester:!isAdmin&&Boolean(tester),isPlayer:!isAdmin&&!tester});
}

// 모두의 랭킹을 받는 계정: Android 앱 로그인, 등록 테스터, 관리자. 모두 익명이 아닌 Google 계정이어야 한다.
// (공개 웹은 아직 베타 잠금이라 등록된 계정만 들어온다.)
export function accountCanRank({native=false,admin=false,tester=false,user=null}={}){
 return Boolean((native||tester||admin)&&user&&!user.isAnonymous);
}

// 판이 끝났을 때의 결정. eligible=false면 reason 하나를 돌려준다.
// isTestRun만 판 자체를 뺀다. 성능 진단(performanceDiagnostics)은 여기 끼어들지 않는다.
export function rankingDecision({isTestRun=false,localInspection=false,score=0,name='',native=false,admin=false,tester=false,user=null,paceTrusted=true}={}){
 if(isTestRun)return {eligible:false,reason:'test_run'};
 if(localInspection)return {eligible:false,reason:'test_run'};
 if(!(score>0)||!Number.isFinite(score))return {eligible:false,reason:'invalid_score'};
 if(!name)return {eligible:false,reason:'authentication_missing'};
 if(!accountCanRank({native,admin,tester,user}))return {eligible:false,reason:'authentication_missing'};
 if(!paceTrusted)return {eligible:false,reason:'invalid_score'};
 return {eligible:true,reason:null};
}

// 서버·네트워크 오류를 이유 이름으로 바꾼다.
export function classifySubmitError(error){
 const status=Number(error?.status)||0,message=String(error?.message||'').toLowerCase();
 if(message==='invalid-run')return 'invalid_score';
 if(status===401||message.includes('auth')&&message.includes('token'))return 'authentication_missing';
 if(status===403||message.includes('permission'))return 'permission_denied';
 if(status===409||message.includes('duplicate'))return 'duplicate';
 if(status===400)return 'invalid_score';
 if(!status||message.includes('abort')||message.includes('network')||message.includes('failed to fetch'))return 'network_error';
 return 'unknown';
}

// 실패는 콘솔과 이 기기에 짧게 남긴다. 이름·이메일은 적지 않고 계정 번호(uid)와 점수만 쓴다.
export function logRankingFailure(storage,{uid=null,score=0,reason='unknown',at=Date.now()}={},log=globalThis.console){
 const row={uid:uid?String(uid).slice(0,40):null,score:Math.floor(Number(score)||0),reason:RANKING_FAIL_REASONS.includes(reason)?reason:'unknown',at};
 try{log?.warn?.(`RANKING SUBMIT FAILED\nUID: ${row.uid||'-'}\nScore: ${row.score}\nReason: ${row.reason}`);}catch{}
 try{
  const list=JSON.parse(storage?.getItem(RANKING_LOG_KEY)||'[]');
  const next=[...(Array.isArray(list)?list:[]),row].slice(-RANKING_LOG_MAX);
  storage?.setItem(RANKING_LOG_KEY,JSON.stringify(next));
 }catch{}
 return row;
}
export function rankingFailures(storage){
 try{const list=JSON.parse(storage?.getItem(RANKING_LOG_KEY)||'[]');return Array.isArray(list)?list:[];}catch{return [];}
}
