// SEED battlefield grammar library.
// A battlefield changes the problem around the player's build; it never replaces
// the core movement, auto-attack, law selection, or growth loop.

export const BATTLEFIELD_LAW_IDS=Object.freeze([
 'reflect','split','chain','orbit','pierce','burst','recall','gravity','frost','portal'
]);

const budget=(enemies,projectiles,props)=>Object.freeze({
 maxEnemies:enemies,maxHostileProjectiles:projectiles,maxInteractiveProps:props,
 dynamicLights:0,pooledSignals:true,sharedGeometry:true
});

const grammar=(id,slug,name,pressure,question,featuredLaws,axes,performance,state='planned')=>Object.freeze({
 id,slug,name,pressure,question,featuredLaws:Object.freeze(featuredLaws),axes:Object.freeze(axes),
 performance,state
});

export const BASELINE_GRAMMAR=grammar('BASE','garden-room','기본 방 전투','고정된 방에서 엄폐·함정·적 조합을 읽는다','현재 조합의 기본 성능은 무엇인가?',
 ['burst','orbit','frost'],{scroll:'none',approach:'mixed',boundary:'room',objective:'clear'},budget(14,72,14),'playable');

export const BATTLEFIELD_GRAMMARS=Object.freeze([
 grammar('A','storm-route','세로 전진','위와 측면에서 편대와 탄막이 쏟아진다','앞으로 몰려오는 적을 어떤 경로로 쓸어내는가?',
  ['split','chain','pierce'],{scroll:'vertical',approach:'front',boundary:'route',objective:'advance'},budget(14,88,8),'playable'),
 grammar('B','fallen-front','횡 전진','앞·뒤·위의 위협이 이동 방향을 흔든다','전진하면서 앞길과 뒤의 추격을 함께 처리할 수 있는가?',
  ['recall','pierce','frost'],{scroll:'horizontal',approach:'front-rear',boundary:'lane',objective:'advance'},budget(14,80,12)),
 grammar('C','formation-invasion','편대 침공','적의 꽃·나선·X자 진형이 공격 경로를 만든다','진형의 모양을 유지하거나 무너뜨려 연쇄 효율을 만드는가?',
  ['chain','burst','gravity'],{scroll:'none',approach:'formation',boundary:'open',objective:'clear'},budget(16,72,6)),
 grammar('D','descending-line','진형 강하','처치가 늦으면 적 전선이 내려와 공간을 압축한다','완성된 빌드로 생존선을 얼마나 다시 밀어 올리는가?',
  ['burst','gravity','pierce'],{scroll:'none',approach:'front',boundary:'compressing',objective:'push'},budget(18,76,4)),
 grammar('E','endless-corridor','사방 포위','360도 접근 속에서 전멸·돌파·버티기를 고른다','포위망을 없앨지 한 방향을 열어 탈출할지 결정할 수 있는가?',
  ['orbit','gravity','chain'],{scroll:'none',approach:'all',boundary:'open',objective:'choose'},budget(16,84,8)),
 grammar('F','crystal-canyon','좁은 협곡','움직이는 벽과 수정 장애물이 공격 각도를 제한한다','벽을 이용·파괴·무시·관통해 자기 방식으로 길을 만드는가?',
  ['reflect','burst','portal'],{scroll:'forward',approach:'front-rear',boundary:'narrow',objective:'breakthrough'},budget(12,68,18)),
 grammar('G','sun-run','고속 질주','빠른 화면 흐름과 갈림길이 짧은 판단을 요구한다','지나친 적과 다가오는 적을 동시에 관리하며 경로를 고르는가?',
  ['recall','frost','orbit'],{scroll:'fast',approach:'front-rear',boundary:'lane',objective:'route'},budget(12,70,10)),
 grammar('H','splinter-colony','분열 생물군','적이 죽을수록 작은 개체와 여러 구간으로 갈라진다','개체 수가 폭증하기 전에 분열 순서를 통제할 수 있는가?',
  ['chain','burst','pierce'],{scroll:'none',approach:'swarm',boundary:'open',objective:'contain'},budget(20,64,6)),
 grammar('I','colossus','거대 단일체','화면을 차지한 보스의 팔·장갑·코어가 따로 작동한다','부위 순서와 공격 경로로 거대 보스의 구조를 해체하는가?',
  ['pierce','split','chain'],{scroll:'none',approach:'boss-parts',boundary:'boss',objective:'dismantle'},budget(8,92,10)),
 grammar('J','living-chase','호위·추격전','움직이는 목표를 따라잡거나 죽일 수 없는 추격자에게서 달아난다','공격을 멈추지 않고 보호·추격·탈출 목적을 바꿀 수 있는가?',
  ['recall','orbit','frost'],{scroll:'chase',approach:'moving',boundary:'route',objective:'escort-chase'},budget(12,72,8)),
 grammar('K','shattered-maze','파괴 지형','벽과 바닥이 부서지며 미로가 열린 전장으로 변한다','탄의 성질로 전장의 길과 안전지대를 어떻게 바꾸는가?',
  ['burst','reflect','portal'],{scroll:'none',approach:'mixed',boundary:'destructible',objective:'reshape'},budget(12,64,24)),
 grammar('L','layered-garden','다층 전장','위아래 층과 연결 통로가 공격 경로를 분리한다','층 사이의 높이 차를 공격 범위와 이동 경로로 바꾸는가?',
  ['split','portal','recall'],{scroll:'horizontal',approach:'layered',boundary:'platforms',objective:'clear'},budget(14,68,16))
]);

export const BATTLEFIELD_PROTOTYPES=Object.freeze(['BASE','A','B','F','E']);

const i=(mode,line)=>Object.freeze({mode,line});
export const BATTLEFIELD_INTERACTIONS=Object.freeze({
 A:Object.freeze({
  reflect:i('route','구름벽과 공중 함선의 측면을 튕겨 바깥 편대를 되받아친다.'),split:i('coverage','선두 적중 뒤 꽃잎처럼 퍼져 뒤의 V자 편대를 덮는다.'),chain:i('relay','붙어 비행하는 편대 사이로 번개가 옆줄까지 이어진다.'),orbit:i('defend','측면 돌격기와 가까운 적 탄을 꽃잎으로 요격하며 전진한다.'),pierce:i('focus','세로로 늘어선 정찰 편대를 한 줄로 꿰뚫는다.'),burst:i('reshape','편대 중심을 터뜨려 밀집 대형에 순간적인 구멍을 낸다.'),recall:i('route','앞줄을 지난 탄이 돌아오며 후방 재진입 적을 정리한다.'),gravity:i('control','벌어진 편대를 한 점에 모아 다음 자동 공격의 길을 만든다.'),frost:i('control','급강하 직전의 돌격기를 늦춰 피할 틈과 사격 시간을 번다.'),portal:i('bypass','앞줄을 건너 지휘기와 공중 함선의 약점을 먼저 때린다.')
 }),
 B:Object.freeze({
  reflect:i('route','지면과 천장 구조물을 타고 전방 엄폐 뒤의 적을 친다.'),split:i('coverage','전방 지상군 적중 뒤 갈라져 위 플랫폼과 뒤 추격을 함께 덮는다.'),chain:i('relay','앞과 뒤에서 좁혀 오는 적을 가까운 중계 적을 통해 잇는다.'),orbit:i('defend','달라붙는 추격자와 위에서 떨어지는 탄을 이동 중 막아낸다.'),pierce:i('focus','도로 한 줄에 선 적과 바리케이드를 관통해 전진로를 연다.'),burst:i('reshape','바리케이드 주변 무리를 터뜨려 잠깐 안전한 전진 구간을 만든다.'),recall:i('route','앞으로 보낸 탄이 돌아오며 등 뒤의 추격자까지 훑는다.'),gravity:i('control','전후 적을 통로 한쪽 병목에 모아 돌파 방향을 정한다.'),frost:i('control','빠른 추격자와 위쪽 사수의 주기를 늦춰 속도 차를 줄인다.'),portal:i('bypass','바리케이드와 선두 방패를 건너 뒤쪽 사수를 직접 노린다.')
 }),
 C:Object.freeze({
  reflect:i('route','외곽 벽의 각도를 이용해 꽃잎 진형의 바깥 고리를 역으로 친다.'),split:i('coverage','진형 중심에서 파편이 피어나 여러 꽃잎을 동시에 끊는다.'),chain:i('relay','간격이 맞은 대형 전체를 규칙적인 번개 경로로 연결한다.'),orbit:i('defend','진형 안쪽으로 파고들어 중심을 베고 가까운 탄을 막는다.'),pierce:i('focus','X자와 삼각 진형의 대각선을 맞춰 여러 줄을 꿰뚫는다.'),burst:i('reshape','밀집한 진형 중심을 폭발시켜 모양과 진입 순서를 흐트린다.'),recall:i('route','진형을 한 번 지난 탄이 반대 방향으로 다시 잘라낸다.'),gravity:i('control','완성된 꽃 진형을 한 점으로 무너뜨려 공격 경로를 바꾼다.'),frost:i('control','일부 꽃잎만 늦춰 진형에 오래 유지되는 틈을 만든다.'),portal:i('bypass','외곽 호위를 건너 진형을 유지하는 중심 개체를 먼저 친다.')
 }),
 D:Object.freeze({
  reflect:i('route','측벽 도탄으로 내려오는 횡렬의 끝과 안쪽을 번갈아 친다.'),split:i('coverage','넓게 퍼진 파편으로 내려오는 전선의 폭 전체를 밀어낸다.'),chain:i('relay','같은 높이의 적들을 연결해 한 줄씩 전선을 지운다.'),orbit:i('defend','생존선 가까이 내려온 적과 탄을 막아 마지막 공간을 지킨다.'),pierce:i('focus','위아래로 겹친 열을 관통해 전선을 빠르게 위로 민다.'),burst:i('reshape','전선의 두꺼운 구간을 비워 아래로 내려오는 압력을 분산한다.'),recall:i('route','첫 횡렬을 지난 탄이 돌아오며 뒤따르는 두 번째 줄을 친다.'),gravity:i('control','여러 줄을 좁은 기둥으로 모아 공간 압축 속도를 늦춘다.'),frost:i('control','선두 횡렬의 강하 속도를 늦춰 다음 선택까지 시간을 번다.'),portal:i('bypass','낮은 줄을 건너 맨 위의 지휘 열을 먼저 무너뜨린다.')
 }),
 E:Object.freeze({
  reflect:i('route','경계면을 타고 돌아 포위 고리의 옆과 뒤를 연속 타격한다.'),split:i('coverage','고른 한 방향으로 파편을 집중해 탈출용 부채꼴 길을 연다.'),chain:i('relay','플레이어 둘레의 적 고리를 따라 번개가 원형으로 퍼진다.'),orbit:i('defend','가까운 360도 위협을 막으며 돌파 방향을 고를 시간을 번다.'),pierce:i('focus','한 방향에 늘어선 적을 꿰뚫어 가장 짧은 출구를 만든다.'),burst:i('reshape','포위망 한 구간을 터뜨려 잠깐 숨을 수 있는 주머니를 만든다.'),recall:i('route','돌파 방향으로 보낸 탄이 뒤로 돌아와 추격 고리를 정리한다.'),gravity:i('control','원형 포위를 한쪽 점으로 끌어 반대편 탈출구를 만든다.'),frost:i('control','한 사분면을 늦춰 포위가 닫히는 시간을 서로 어긋나게 한다.'),portal:i('bypass','포위 고리를 건너 바깥 사수에게 탄을 직접 보내 압박을 줄인다.')
 }),
 F:Object.freeze({
  reflect:i('route','좁은 수정벽 사이를 여러 번 튕겨 통로 전체를 공격선으로 쓴다.'),split:i('coverage','복도 끝에서 갈라진 파편이 양쪽 벽을 훑으며 사각을 줄인다.'),chain:i('relay','한 줄로 몰린 적 사이를 연결해 좁은 길의 밀도를 이용한다.'),orbit:i('defend','가까워진 벽과 적 사이에서 접촉 위협과 탄을 막아낸다.'),pierce:i('bypass','얇은 수정 장애물과 그 뒤의 적을 한 경로로 관통한다.'),burst:i('reshape','금이 간 수정벽을 깨뜨려 없던 우회로와 사격 각도를 만든다.'),recall:i('route','복도를 끝까지 훑은 탄이 같은 좁은 길을 돌아오며 재타격한다.'),gravity:i('control','좁은 구간의 적을 한 점에 압축해 통로 막힘을 해소한다.'),frost:i('control','닫혀 오는 수정 장치와 빠른 적을 잠깐 늦춰 통과 시간을 번다.'),portal:i('bypass','탄이 막힌 수정 구간을 건너 반대편 사수에게 바로 도착한다.')
 }),
 G:Object.freeze({
  reflect:i('route','도로 가장자리와 표지 구조물을 타고 옆 차선 적을 되받아친다.'),split:i('coverage','뒤로 남은 파편 지대를 만들어 빠르게 추월하는 적을 걸러낸다.'),chain:i('relay','나란히 달리는 적 무리 사이를 번개가 차선처럼 이어간다.'),orbit:i('defend','고속으로 접근하는 적과 측면 탄을 몸 가까이에서 막는다.'),pierce:i('focus','같은 차선에 겹친 적을 한 번에 꿰뚫어 앞길을 연다.'),burst:i('reshape','막힌 차선을 순간적으로 비워 갈림길 판단 시간을 확보한다.'),recall:i('route','이미 지나친 적을 돌아오는 탄으로 다시 잡아낸다.'),gravity:i('control','빠른 적을 한 차선에 붙잡아 상대 속도를 낮춘다.'),frost:i('control','위험 경로의 빠른 적을 늦춰 안전 경로와 속도 차를 만든다.'),portal:i('bypass','탄이 먼 장애물 구간을 도약해 앞쪽 매복을 미리 제거한다.')
 }),
 H:Object.freeze({
  reflect:i('route','벽에서 돌아온 탄이 갈라져 옆으로 튄 작은 개체를 잡는다.'),split:i('coverage','적의 증식에 맞춰 공격 범위도 퍼져 화면 통제력을 유지한다.'),chain:i('relay','서로 가까운 분열체를 따라 번개가 연속으로 정리한다.'),orbit:i('defend','플레이어 근처까지 온 작은 분열체를 꽃잎으로 밀어낸다.'),pierce:i('focus','긴 몸통의 여러 마디와 일렬 분열체를 함께 꿰뚫는다.'),burst:i('reshape','갈라지는 순간의 군집을 폭발로 지워 개체 수 폭증을 막는다.'),recall:i('route','뒤로 흩어진 분열체를 돌아오는 경로에서 다시 맞힌다.'),gravity:i('control','흩어진 작은 개체를 모아 다음 광역 공격의 표적으로 만든다.'),frost:i('control','분열 직후의 작은 개체를 늦춰 번지는 시간을 지연한다.'),portal:i('bypass','몸통 마디를 건너 분열을 지휘하는 머리와 핵을 노린다.')
 }),
 I:Object.freeze({
  reflect:i('route','장갑판 사이에서 탄을 튕겨 가려진 부위의 옆면을 친다.'),split:i('coverage','한 약점에서 갈라져 팔·포대·장갑을 동시에 압박한다.'),chain:i('relay','가까운 보스 부위 사이로 피해가 전달되어 파괴 순서를 만든다.'),orbit:i('defend','거대 보스의 근접 부위를 깎으며 쏟아지는 탄을 일부 막는다.'),pierce:i('focus','정렬된 장갑과 내부 부위를 한 발로 관통해 구조를 해체한다.'),burst:i('reshape','약점 주변의 인접 포대와 장갑에 범위 피해를 나눈다.'),recall:i('route','같은 약점을 왕복 타격하되 보스 이동에 맞춰 경로를 잡는다.'),gravity:i('control','거대 본체 대신 소환 잡몹을 모으고 잠깐 코어 노출을 돕는다.'),frost:i('control','특정 부위의 공격 주기를 늦춰 다른 부위를 노릴 시간을 번다.'),portal:i('bypass','감쇠된 피해로 외부 장갑을 건너 내부 코어에 닿는다.')
 }),
 J:Object.freeze({
  reflect:i('route','이동 경로 가장자리의 구조물을 이용해 추격자의 옆을 친다.'),split:i('coverage','호위 대상 앞길과 뒤 추격을 갈라진 탄으로 함께 덮는다.'),chain:i('relay','움직이는 적 무리 사이를 연결해 목표와의 거리 차를 줄인다.'),orbit:i('defend','호위 대상이나 플레이어 가까이 붙는 위협을 밀어낸다.'),pierce:i('focus','도망가는 목표 앞의 호위 열을 관통해 본체에 닿는다.'),burst:i('reshape','막힌 이동 경로를 순간적으로 비워 목표의 진행을 이어간다.'),recall:i('route','앞으로 쏜 탄이 돌아오며 뒤에서 쫓아오는 적을 처리한다.'),gravity:i('control','추격자 무리를 뒤쪽 한 점에 묶어 호위 대상과 거리를 벌린다.'),frost:i('control','빠른 추격자나 도주 목표를 늦춰 목적에 맞는 거리로 맞춘다.'),portal:i('bypass','호위벽을 건너 달아나는 목표에게 먼 거리 공격을 보낸다.')
 }),
 K:Object.freeze({
  reflect:i('route','아직 남은 벽을 도탄판으로 써 미로 모퉁이의 적을 친다.'),split:i('coverage','여러 갈림길로 파편을 보내 안전한 파괴 경로를 탐색한다.'),chain:i('relay','벽이 열린 뒤 드러난 적들을 번개로 이어 새 통로를 장악한다.'),orbit:i('defend','낙하 파편과 열린 틈에서 달려드는 적을 몸 가까이 막는다.'),pierce:i('bypass','감쇠된 피해로 얇은 벽을 뚫고 뒤의 적과 금 간 지형을 친다.'),burst:i('reshape','벽과 약한 바닥을 직접 무너뜨려 미로를 열린 전장으로 바꾼다.'),recall:i('route','새로 열린 길을 따라 귀환 경로가 달라져 뒤쪽을 다시 훑는다.'),gravity:i('control','부서진 틈 주변 적과 가벼운 파편을 한쪽 breach에 모은다.'),frost:i('control','무너지는 바닥을 잠깐 안정시켜 위험한 길을 건널 시간을 번다.'),portal:i('bypass','온전한 벽을 파괴하지 않고 반대편 적에게 탄을 보낸다.')
 }),
 L:Object.freeze({
  reflect:i('route','플랫폼 아랫면과 층 벽을 튕겨 다른 높이의 적을 친다.'),split:i('coverage','적중한 층에서 파편이 위아래 연결 틈으로 퍼진다.'),chain:i('relay','계단과 승강기 근처의 적을 중계점으로 삼아 층을 잇는다.'),orbit:i('defend','층 이동 중 가까워지는 적과 탄을 막아 전환 구간을 지킨다.'),pierce:i('focus','수직 통로에 정렬된 여러 층의 적을 한꺼번에 꿰뚫는다.'),burst:i('reshape','얇은 바닥 주변 폭발이 인접한 위아래 층까지 번진다.'),recall:i('route','계단과 통로를 따라 돌아오는 탄이 다른 층의 뒤를 친다.'),gravity:i('control','층 연결구 근처의 적만 높이 차를 넘어 한 점으로 끌어온다.'),frost:i('control','승강기와 층 이동 적을 늦춰 높이 차를 유지한다.'),portal:i('bypass','연결구 없이도 탄이 바로 위나 아래 인접 층으로 이동한다.')
 })
});

export function battlefieldGrammar(id){
 if(id==='BASE')return BASELINE_GRAMMAR;
 return BATTLEFIELD_GRAMMARS.find(entry=>entry.id===id)||null;
}

export function battlefieldInteraction(grammarId,lawId){
 return BATTLEFIELD_INTERACTIONS[grammarId]?.[lawId]||null;
}
