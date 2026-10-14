// Presentation evidence only. No save fields, RNG, combat mutation or telemetry.
const SOURCES=Object.freeze({
 crowd:{label:'다가온 무리',next:'적에게 둘러싸이기 전에 빈 쪽으로 이동하고, 몸을 낮춘 빠른 적은 옆으로 피하세요.'},
 contact:{label:'적의 근접 공격',next:'적과 거리를 두고, 공격이 시작된 뒤 옆으로 회피해 반격할 틈을 만드세요.'},
 shot:{label:'적 탄환',next:'탄이 오는 방향으로 달리기보다 옆으로 이동해 탄 사이의 틈을 여세요.'},
 'boss-shot':{label:'보스 탄환',next:'보스의 준비 동작과 탄 사이의 틈을 먼저 보세요. 보스 앞에 오래 머무르지 마세요.'},
 'boss-contact':{label:'보스의 근접 공격',next:'돌진 방향이 정해진 뒤 옆으로 피하고, 보스가 멈췄을 때 다시 접근하세요.'},
 charge:{label:'돌진',next:'몸을 낮추는 적을 보고 옆으로 피하세요. 돌진이 끝난 자리가 반격할 틈이에요.'},
 trap:{label:'바닥 가시',next:'바닥 예고가 켜지면 다른 자리로 이동하세요. 가시 위에서 싸움을 이어가지 마세요.'},
 turret:{label:'포탑 공격',next:'포탑의 조준선이 향한 자리에서 벗어난 뒤 접근하세요.'},
 seal:{label:'회피 봉인',next:'보라색 봉인 범위에서 먼저 걸어 나오세요. 회피가 봉인된 동안에도 이동할 수 있어요.'},
 unknown:{label:'피격',next:'다음 판에는 적과 바닥 예고를 보며 빈 공간을 남겨 두세요.'}
});
const safeNumber=n=>Number.isFinite(n)?Math.max(0,n):0;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createRunReflection(){
 const totals=Object.fromEntries(Object.keys(SOURCES).map(k=>[k,0]));
 let last=null,hits=0,damage=0,resumed=false;
 return {
  reset({continued=false}={}){for(const k of Object.keys(totals))totals[k]=0;last=null;hits=damage=0;resumed=Boolean(continued);},
  hit({before,after,time=0,kind='unknown',name=''}={}){
   if(!Number.isFinite(before)||!Number.isFinite(after)||before<=after||before<=0)return false;
   const loss=before-Math.max(0,after);if(!(loss>0))return false;
   const source=Object.hasOwn(SOURCES,kind)?kind:'unknown';
   damage+=loss;totals[source]+=loss;hits++;
   // A single last contact plus fixed category counters: thousands of hits do
   // not retain an ever-growing event list or saved personal history.
   last={kind:source,name:String(name).slice(0,48),damage:loss,time:safeNumber(time),fatal:after<=0};return true;
  },
  summary(){let dominant='unknown',largest=0;for(const k of Object.keys(totals))if(totals[k]>largest){dominant=k;largest=totals[k];}
   return {last:last?{...last}:null,hits,damage,dominant,dominantDamage:largest,resumed};
  }
 };
}
export function reflectRun({evidence=null,won=false,left=false,coreLost=false,boss=null,heals=0,dashes=0,mode='journey'}={}){
 const e=evidence||{last:null,hits:0,damage:0,dominant:'unknown',resumed:false},last=e.last;
 const source=SOURCES[last?.kind]||SOURCES.unknown,healing=Math.floor(safeNumber(heals));
 const bossValid=boss&&Number.isFinite(boss.hp)&&Number.isFinite(boss.maxHp)&&boss.maxHp>0;
 const bossPercent=bossValid?Math.min(100,Math.ceil(safeNumber(boss.hp)/boss.maxHp*100)):null;
 let title,reason,next;
 if(left){title='도전을 정리했어요';reason='직접 나가기를 선택했어요. 사망이나 보스 격파로 세지 않아요.';next='다음 출발에서는 첫 법칙과 피할 방향을 정해 보세요.';}
 else if(won){title='이번 씨앗이 해냈어요';reason='정해진 보스 목표를 마쳤어요.';next='다음에는 다른 두 법칙을 섞어 같은 보스를 넘겨 보세요.';}
 else if(coreLost){title='정원의 심장이 무너졌어요';reason='씨앗의 체력이 아니라 보호 목표가 먼저 소진됐어요.';next='다음 준비에는 입구를 덮는 시설을 심고, 심장 가까이 붙은 적부터 끊으세요.';}
 else if(last?.fatal){title='마지막으로 맞은 공격';reason=`${last.name?last.name+' · ':''}${source.label}에 남은 체력을 잃었어요.`;
  // A seal's walking escape is actionable even if healing is unused.
  next=last.kind==='seal'?source.next:healing>0?`회복 물약 ${healing}개가 남았어요. 다음에는 생명력이 줄었을 때 보스 공격이 멈춘 틈에 먼저 사용하세요.`:source.next;
 }else {title='도전이 끝났어요';reason='마지막으로 맞은 공격을 확인하지 못했어요.';
  next=mode==='mirror'?'분신의 탄을 가까이서 회피해 균열을 만든 뒤 공격하세요.':bossValid?'보스의 준비 동작을 먼저 읽고, 공격이 끝난 틈에 반격하세요.':'첫 법칙을 고른 뒤 적 사이에 이동할 빈 공간을 남겨 두세요.';
 }
 const scope=e.resumed?'이어하기 이후 관찰':'이번 도전 관찰';
 const facts=[];
 if(e.hits>0)facts.push(`${scope} · 실제 ${e.hits}회 피격`);
 if(bossValid&&!won&&!left&&bossPercent>0)facts.push(`${boss.name||'보스'} 생명력 ${bossPercent}% 남음`);
 if(!left&&!coreLost&&!won&&dashes===0&&e.hits>0&&last?.kind!=='seal')facts.push('회피 사용 0회');
 return {title,reason,next,facts,coreLost,won,left};
}
export function runReflectionHTML(result){
 if(!result)return '';
 return `<section class="run-reflection" aria-label="이번 도전과 다음 계획"><small>${escape(result.title)}</small><p>${escape(result.reason)}</p>${result.facts.length?`<span class="run-reflection-facts">${result.facts.map(escape).join(' · ')}</span>`:''}<div class="run-next"><b>다음 한 가지</b><span>${escape(result.next)}</span></div></section>`;
}
