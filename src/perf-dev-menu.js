// 숨은 개발자 성능 메뉴. 메인 화면 구석의 버전 번호를 3초 안에 7번 누르면 열린다.
// 닫혀 있을 때는 DOM을 만들지 않는다(버전 번호 한 줄만 있다).
import {readSessions,summarizeSessions,compareBuilds,detectRegression,formatSessionReport,SECTION_LABELS} from './perf-monitor.js';
import {rankingFailures} from './ranking-eligibility.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DEV_TAPS=7,DEV_TAP_WINDOW_MS=3000;

export function tapCounter({taps=DEV_TAPS,windowMs=DEV_TAP_WINDOW_MS,now=()=>Date.now()}={}){
 let times=[];
 return ()=>{const t=now();times=times.filter(v=>t-v<=windowMs);times.push(t);if(times.length>=taps){times=[];return true;}return false;};
}

async function copyText(text){
 try{await navigator.clipboard.writeText(text);return true;}catch{}
 try{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}catch{return false;}
}

const CSS=`#perf-dev{position:fixed;inset:0;z-index:95;background:#050d10;color:#dfeee4;font:12px/1.5 "Malgun Gothic",sans-serif;overflow:auto;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));touch-action:pan-y}
#perf-dev h2{font-size:16px;margin:0 0 8px;letter-spacing:1px}#perf-dev h3{font-size:13px;margin:14px 0 6px;color:#a8e6c4}
#perf-dev .pd-bar{display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:0;background:#050d10;padding:4px 0 8px;z-index:1}
#perf-dev button{min-height:40px;padding:6px 12px;border:1px solid #7fb89c;background:#12302a;color:#eaf7ee;border-radius:8px}
#perf-dev table{border-collapse:collapse;width:100%;font-size:11px}#perf-dev td,#perf-dev th{border-bottom:1px solid #ffffff1c;padding:4px 6px;text-align:left;vertical-align:top}
#perf-dev tr.pd-row{cursor:pointer}#perf-dev tr.pd-row.on{background:#1d4a3c}
#perf-dev .pd-warn{color:#ffb3a0;font-weight:700}#perf-dev .pd-dim{color:#9fb5aa}#perf-dev .pd-crit{color:#ff8f7a}#perf-dev .pd-major{color:#ffd27a}
#perf-dev dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:0}#perf-dev dt{color:#9fb5aa}#perf-dev dd{margin:0}`;

export function mountPerfDevMenu({storage,version='',live=()=>null,parent=document.body}={}){
 const label=document.createElement('button');
 label.id='seed-version';label.type='button';label.textContent=version?`v ${version}`:'v -';
 label.setAttribute('aria-label',`게임 버전 ${version}`);
 label.style.cssText='position:fixed;z-index:7;left:max(8px,env(safe-area-inset-left));bottom:max(4px,env(safe-area-inset-bottom));padding:4px 6px;min-height:28px;border:0;background:none;color:#cfe3d766;font-size:10px;letter-spacing:.5px';
 parent.append(label);
 const hit=tapCounter();
 label.addEventListener('click',()=>{if(hit())open();});
 let panel=null,selected=0;
 function close(){panel?.remove();panel=null;}
 function open(){
  if(panel)return;
  if(!document.getElementById('perf-dev-style')){const style=document.createElement('style');style.id='perf-dev-style';style.textContent=CSS;document.head.append(style);}
  panel=document.createElement('section');panel.id='perf-dev';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','개발자 성능 기록');
  parent.append(panel);render();
 }
 function render(){
  const sessions=readSessions(storage).slice().reverse(),summary=summarizeSessions(sessions),regressions=detectRegression(sessions),builds=compareBuilds(sessions).slice(0,6),failures=rankingFailures(storage).slice(-5).reverse(),now=live();
  const r=sessions[selected]||null;
  panel.innerHTML=`<div class="pd-bar"><button type="button" data-act="copy">COPY REPORT</button><button type="button" data-act="close">닫기</button><span class="pd-dim" id="pd-copied"></span></div>
<h2>DEV · 성능 기록 <small class="pd-dim">${esc(version)}</small></h2>
${now?`<p class="pd-dim">지금 판: FPS ${now.fps1} · 5초 ${now.fps5} · P95 ${now.p95Ms}ms · 최악 ${now.worstMs}ms · 사건 ${now.incidents}</p>`:''}
${regressions.map(g=>`<p class="pd-warn">PERFORMANCE REGRESSION DETECTED · ${esc(g.device)} · P95 +${g.increase}% (${esc(g.from)} ${g.p95Before}ms → ${esc(g.to)} ${g.p95After}ms)</p>`).join('')}
<h3>요약 (최근 ${summary.sessions}판)</h3>
<dl><dt>최악 프레임</dt><dd>${summary.worstFrame?`${summary.worstFrame.ms}ms · ${esc(summary.worstFrame.version)} · ${esc(summary.worstFrame.build)}`:'-'}</dd>
<dt>최악 구간</dt><dd>${esc(summary.worstStage)||'-'}</dd><dt>최악 조합</dt><dd>${esc(summary.worstBuild)||'-'}</dd>
<dt>최악 효과</dt><dd>${esc(summary.worstEffect)||'-'}</dd><dt>최악 궁극기</dt><dd>${esc(summary.worstUltimate)||'-'}</dd>
<dt>가장 흔한 병목</dt><dd>${esc(summary.commonBottleneck)||'-'}</dd></dl>
<h3>최근 판</h3>
<table><thead><tr><th>시작</th><th>버전</th><th>기기</th><th>시간</th><th>평균</th><th>P95</th><th>P99</th><th>최악</th><th>사건 C/M/m</th></tr></thead><tbody>
${sessions.map((s,i)=>`<tr class="pd-row${i===selected?' on':''}" data-i="${i}"><td>${esc(new Date(s.startedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</td><td>${esc(s.version)}</td><td>${esc(s.env?.device)} ${esc(s.env?.launch)}</td><td>${Math.round(s.durationS)}초</td><td>${s.avgFps}</td><td>${s.p95Ms}ms</td><td>${s.p99Ms}ms</td><td>${s.worstMs}ms</td><td><span class="pd-crit">${s.counts?.CRITICAL||0}</span>/<span class="pd-major">${s.counts?.MAJOR||0}</span>/${s.counts?.MINOR||0}</td></tr>`).join('')||'<tr><td colspan="9" class="pd-dim">아직 기록이 없습니다. 한 판을 끝내면 여기에 쌓입니다.</td></tr>'}
</tbody></table>
${r?`<h3>선택한 판 · 사건</h3>
<p class="pd-dim">구간 평균: ${Object.entries(r.sectionAvg||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${esc(SECTION_LABELS[k]||k)} ${v}ms`).join(' · ')}</p>
<table><thead><tr><th>등급</th><th>종류</th><th>판 시각</th><th>프레임</th><th>상태</th><th>원인 후보</th></tr></thead><tbody>
${(r.incidents||[]).map(row=>`<tr><td class="${row.severity==='CRITICAL'?'pd-crit':row.severity==='MAJOR'?'pd-major':''}">${row.severity}</td><td>${esc(row.type)}${row.merged?` +${row.merged}`:''}</td><td>${row.sessionS}초</td><td>${row.frameMs}ms · ${row.fps}FPS</td><td>${esc([row.state?.act&&row.state.act+'막',row.state?.journey&&'여정 '+row.state.journey,row.state?.boss,`적 ${row.state?.enemies||0}`,`탄 ${(row.state?.bullets||0)+(row.state?.formShots||0)}`,`파티클 ${row.state?.particles||0}`,`드로콜 ${row.state?.drawCalls||0}`].filter(Boolean).join(' · '))}</td><td>${(row.causes||[]).map(c=>esc(c.label)).join('<br>')}</td></tr>`).join('')||'<tr><td colspan="6" class="pd-dim">사건 없음</td></tr>'}
</tbody></table>`:''}
<h3>조합별 비교</h3>
<table><thead><tr><th>진화 조합</th><th>판</th><th>평균 FPS</th><th>P95</th><th>MAJOR+/분</th></tr></thead><tbody>
${builds.map(b=>`<tr><td>${esc(b.build)}</td><td>${b.sessions}</td><td>${b.avgFps}</td><td>${b.p95Ms}ms</td><td>${b.majorPerMin}</td></tr>`).join('')||'<tr><td colspan="5" class="pd-dim">-</td></tr>'}
</tbody></table>
<h3>랭킹 제출 실패 (이 기기)</h3>
<p class="pd-dim">${failures.map(f=>`${esc(new Date(f.at).toLocaleString('ko-KR'))} · 점수 ${f.score} · ${esc(f.reason)}`).join('<br>')||'없음'}</p>`;
  panel.querySelector('[data-act="close"]').onclick=close;
  panel.querySelector('[data-act="copy"]').onclick=async()=>{const ok=await copyText(formatSessionReport(r,{regressions}));const m=panel?.querySelector('#pd-copied');if(m)m.textContent=ok?'복사했어요':'복사하지 못했어요';};
  for(const row of panel.querySelectorAll('tr.pd-row'))row.onclick=()=>{selected=Number(row.dataset.i)||0;render();};
 }
 return {open,close,label};
}
