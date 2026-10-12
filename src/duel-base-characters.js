// Shared immutable first nine Duel identities. No story, combat or account imports.
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_BASE_CHARACTERS=Object.freeze({
 pierce:Object.freeze({id:'pierce',name:'창 씨앗',role:'긴 사거리 · 찌르기',hp:182,speed:4.5,reach:2.5,arc:.62,damage:[11,11,17],cadence:.34,heavy:{damage:22,reach:2.6},parry:1,tile:4,ink:'#dbf6b1',
  skills:[skill('돌진 찌르기',4.5,'앞으로 달려가며 꿰뚫어요'),skill('관통 투창',3.5,'멀리 날아가 둘을 꿰뚫는 창')],ult:skill('천 개의 창',0,'세 줄의 창이 앞을 쓸어요'),
  blurb:'가장 멀리서 찌르지만, 붙으면 약해요.'}),
 burst:Object.freeze({id:'burst',name:'불꽃 씨앗',role:'한 방 · 막기 파괴',hp:142,speed:3.8,reach:1.6,arc:1.1,damage:[11,11,16],cadence:.48,heavy:{damage:26,reach:1.9,breaker:1.25},parry:1,tile:5,ink:'#ffaa65',
  skills:[skill('불씨 심기',5,'잠시 뒤 터지는 불씨를 발밑에'),skill('화염 도약',6,'뛰어올라 내려찍어요 · 막기를 부숴요')],ult:skill('대폭발',0,'둘레를 크게 터뜨려요'),
  blurb:'느리지만 세고, 막고 있는 상대를 잘 부숴요.'}),
 reflect:Object.freeze({id:'reflect',name:'거울 씨앗',role:'막기 전문 · 반격',hp:175,speed:4.3,reach:1.75,arc:.9,damage:[10,10,15],cadence:.34,heavy:{damage:21,reach:1.9},parry:1.9,tile:0,ink:'#91e4ff',
  skills:[skill('거울 방패',6,'잠깐 모든 공격을 막고 탄을 되돌려요'),skill('수정 탄',3,'벽에 두 번 튕기는 수정')],ult:skill('거울 감옥',0,'상대를 거울에 가둬 묶어요'),
  blurb:'반격 막기 판정이 넓고, 날아오는 탄을 되돌려요.'}),
 gravity:Object.freeze({id:'gravity',name:'중력 씨앗',role:'잡기 · 제어',hp:124,speed:3.9,reach:1.7,arc:.9,damage:[9,9,12],cadence:.38,heavy:{damage:21,reach:2},parry:1,tile:7,ink:'#d2a0ff',
  skills:[skill('끌어당기기',6.5,'앞의 상대를 끌어와 묶어요 · 막기 무시'),skill('중력장',7,'둘레의 상대를 느리게')],ult:skill('블랙홀',0,'상대를 빨아들이며 계속 때려요'),
  blurb:'막고 있는 상대도 끌어와 무너뜨려요.'})
 // 2026-09-28 사용자: "캐릭터 추가해 보자" — 나머지 다섯 법칙. 버튼 네 개 방식이라 기술(공격+회피) 하나와 필살 하나씩.
 ,split:Object.freeze({id:'split',name:'분열 씨앗',role:'빠른 연타 · 꽃잎',hp:196,speed:4.9,reach:1.55,arc:1,damage:[9,9,13],cadence:.27,heavy:{damage:21,reach:1.7},parry:1,tile:1,ink:'#b5ec83',
  skills:[skill('꽃잎 부채',2.8,'꽃잎 세 장을 부채꼴로 흩뿌려요'),skill('꽃잎 부채',3.2,'')],ult:skill('꽃잎 폭풍',0,'사방으로 꽃잎을 두 번 터뜨려요'),
  blurb:'가장 빠르게 휘두르고 가볍게 뛰어요. 한 방은 약해요.'})
 ,chain:Object.freeze({id:'chain',name:'연쇄 씨앗',role:'중거리 번개 · 기절',hp:129,speed:4.2,reach:1.7,arc:.95,damage:[9,9,13],cadence:.36,heavy:{damage:21,reach:1.9},parry:1,tile:2,ink:'#ffdd78',
  skills:[skill('번개 사슬',5.5,'앞의 상대에게 번개를 꽂아 잠깐 기절시켜요'),skill('번개 사슬',4.5,'')],ult:skill('낙뢰',0,'상대 자리에 번개가 다섯 번 떨어져요'),
  blurb:'거리를 두고 번개로 끊어 들어가요.'})
 ,recall:Object.freeze({id:'recall',name:'귀환 씨앗',role:'부메랑 · 두 번 베기',hp:218,speed:4.5,reach:1.7,arc:.95,damage:[11,11,16],cadence:.34,heavy:{damage:21,reach:1.8},parry:1,tile:6,ink:'#9cf0ba',
  skills:[skill('귀환 칼날',3.8,'던진 칼날이 갔다가 돌아오며 두 번 베어요'),skill('귀환 칼날',3.8,'')],ult:skill('칼날 회오리',0,'칼날 넷이 사방으로 날아갔다 돌아와요'),
  blurb:'던지고 받으며 앞뒤로 두 번 벨 수 있어요.'})
 ,orbit:Object.freeze({id:'orbit',name:'공전 씨앗',role:'붙어서 싸우기 · 고리',hp:139,speed:4,reach:1.4,arc:1.2,damage:[10,10,14],cadence:.4,heavy:{damage:22,reach:1.7},parry:1,tile:3,ink:'#ffeaa0',
  skills:[skill('공전 고리',7.5,'몸 주위를 도는 구슬이 가까운 상대를 계속 때려요'),skill('공전 고리',6,'')],ult:skill('큰 고리',0,'더 크고 오래 도는 고리'),
  blurb:'튼튼하고, 붙어 있을수록 강해요.'})
 ,frost:Object.freeze({id:'frost',name:'빙결 씨앗',role:'느리게 묶기 · 제어',hp:167,speed:4.1,reach:1.6,arc:1,damage:[9,9,13],cadence:.38,heavy:{damage:21,reach:1.8},parry:1.2,tile:8,ink:'#8ce9ff',
  skills:[skill('서리 숨결',5,'앞쪽 부채꼴에 서리를 뿜어 느리게 해요'),skill('서리 숨결',5,'')],ult:skill('눈보라',0,'주위를 느리게 하다 끝에 얼려요'),
  blurb:'상대를 느리게 만들어 거리를 지배해요.'})

});
