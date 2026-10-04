// 2026-09-28 사용자: "서바이벌 프로젝트… 막기가 있어서 완전 컨트롤 싸움처럼 느껴졌고 캐릭마다 특징이 다양했다"
// 씨앗 대전 1차: 1:1(AI), 캐릭터 4명. 공격은 막기에, 막기는 강공격·잡기에, 강공격은 공격(끊기)·반격 막기에 진다.
// 그림·렌더러와 무관한 규칙. 계정·저장에 쓰지 않는다(보상 없는 시험 모드).
// 2026-09-28 사용자: "맵은 조금만 더 넓게 · 확대는 조금 더" — 경기장을 넓히고(카메라가 두 씨앗을 따라간다), 기둥 네 개.
import {duelSkillActions} from './seed-duel-actions.js';
import {DUEL_BATCH03,batch03Repress,batch03Reach,batch03Melee,batch03Action,batch03Tick,batch03Ai} from './seed-duel-batch03.js';
export const DUEL_ARENA=Object.freeze({minX:1.5,maxX:33.5,minY:2,maxY:19.5});
export const DUEL_PILLARS=Object.freeze([{x:10.5,y:6.2,r:.85},{x:24.5,y:6.2,r:.85},{x:10.5,y:15.4,r:.85},{x:24.5,y:15.4,r:.85}]);
export const DUEL_SPAWN=Object.freeze([{x:11.5,y:10.8},{x:23.5,y:10.8}]);
export const DUEL_RULES=Object.freeze({roundsToWin:2,roundSeconds:75,guardMax:100,guardRegen:14,blockDamage:.2,parryWindow:.16,guardBreakStun:1.05,dodgeCd:1,meterMax:100});
const skill=(name,cooldown,desc)=>Object.freeze({name,cooldown,desc});
export const DUEL_CHARACTERS=Object.freeze({
 ...DUEL_BATCH03,
 gravitymirror:Object.freeze({id:'gravitymirror',comboId:'gravitymirror',law:'gravity',name:'중력 거울 씨앗',role:'벽의 거울핵 · 회수 참격',hp:176,speed:4.15,reach:1.8,arc:1.15,comboReach:[1.55,1.9,2.2],comboArc:[1.25,.8,.62],damage:[9,10,14],cadence:.36,heavy:{damage:23,reach:2.15},parry:1.2,tile:7,ink:'#d5b1ff',
  skills:[skill('접힌 거울핵',5.6,'한 번 튕긴 자리에 당김 · 핵이 있으면 기술을 다시 눌러 접어요'),skill('거울 접기',5.8,'놓인 거울핵을 회수하며 좁은 길을 베어요 · 최대 한 번만')],ult:skill('거울의 골짜기',0,'두 거울핵을 차례로 날려요 · 두 준비 동작 모두 끊을 수 있어요'),
  blurb:'벽 가까이에서 강해요. 당김은 이동을 늦출 뿐, 막기와 회피를 빼앗지 않아요.'}),
 chainburst:Object.freeze({id:'chainburst',comboId:'chainburst',law:'chain',name:'연쇄 폭발 씨앗',role:'불꽃 표식 · 잠근 세 점',hp:170,speed:4.35,reach:1.8,arc:1,comboReach:[1.5,1.75,2.05],comboArc:[1.25,.85,.65],damage:[9,10,14],cadence:.35,heavy:{damage:23,reach:2.1},parry:1,tile:2,ink:'#ffc17d',
  skills:[skill('표식 건너뛰기',5.5,'3타의 표식이 있으면 빠르게 연결해요 · 점선이 생긴 뒤에는 따라가지 않아요'),skill('흩어진 불씨',5.4,'양옆 고정 불씨가 늦게 터져요 · 무적 없이 옆으로 물러나요')],ult:skill('화약 꽃길',0,'고정한 세 점을 순서대로 연결하고 터뜨려요 · 끝까지 피할 길이 있어요'),
  blurb:'3타나 강공격으로 불꽃 표식을 붙여요. 기술을 누르면 위치가 고정돼요. 연결과 폭발은 한 번씩만.'}),
 frostnet:Object.freeze({id:'frostnet',comboId:'frostnet',law:'frost',name:'서리 그물 씨앗',role:'두 매듭 · 길을 묶는 냉기',hp:172,speed:4.15,reach:1.75,arc:1.05,damage:[9,10,14],cadence:.37,heavy:{damage:22,reach:2},parry:1.15,tile:8,ink:'#b6eaff',
  skills:[skill('서리 두 매듭',6.2,'두 매듭 사이에 냉기 선을 놓아요 · 선 끝으로 돌아가면 피할 수 있어요'),skill('매듭 거두기',6.6,'놓은 선을 한 번 줄여요 · 이미 맞힌 선은 다시 피해를 주지 않아요')],ult:skill('서리 뜰',0,'삼각형의 세 변을 차례로 엮어요 · 준비 중 끊거나 꼭짓점으로 빠져나오세요'),
  blurb:'선 하나는 한 번만 맞아요. 서로 다른 선을 두 번 받으면 잠깐 느려져요. 매듭 설치 중에는 빈틈이 있어요.'}),
 blastlance:Object.freeze({id:'blastlance',comboId:'blastlance',law:'pierce',name:'폭발 창 씨앗',role:'조준 창 · 끝에서 피는 폭발',hp:174,speed:4.25,reach:2.35,arc:.65,damage:[10,11,16],cadence:.38,heavy:{damage:24,reach:2.6},parry:1,tile:4,ink:'#ffb17a',
  skills:[skill('꽃봉오리 투창',5.6,'방향을 고정한 뒤 창을 날려요 · 먼 창끝에서 더 크게 피어요'),skill('뒷걸음 불씨',5.2,'뒤로 물러나며 지연 불씨를 남겨요 · 무적은 없어요')],ult:skill('세 번의 개화',0,'세 사선에 창을 차례로 날려요 · 준비 중 끊을 수 있어요'),
  blurb:'옆으로 피하면 창끝과 폭발을 함께 피할 수 있어요. 조준 중에는 빈틈이 커요.'}),
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
 ,thorn:Object.freeze({id:'thorn',law:'pierce',name:'덩굴 씨앗',role:'덫 설치 · 거리 제어',hp:160,speed:4.2,reach:1.9,arc:1,damage:[10,10,14],cadence:.37,heavy:{damage:22,reach:2.1},parry:1,tile:4,ink:'#b6ef93',
  skills:[skill('덩굴 매듭',5.6,'앞에 덫을 심어요 · 자라기 전에 피할 수 있어요'),skill('가시 엮기',4.8,'좁게 모인 가시 둘을 날려요')],ult:skill('가시 정원',0,'세 덫을 엮어 상대가 갈 길을 막아요'),blurb:'덫으로 길을 좁혀요. 움직이는 상대를 예상해서 심으세요.'})
 ,gale:Object.freeze({id:'gale',law:'recall',name:'바람 씨앗',role:'옆걸음 · 바람 칼날',hp:196,speed:4.9,reach:1.85,arc:1.1,damage:[10,10,15],cadence:.3,heavy:{damage:21,reach:1.9},parry:1,tile:6,ink:'#aefff1',
  skills:[skill('바람 비껴베기',4.4,'옆으로 빠지며 바람 칼날을 날려요'),skill('되감는 바람',5.4,'넓게 돌아오는 칼날 둘')],ult:skill('질풍 교차',0,'세 칼날이 벌어졌다 돌아와요'),blurb:'가벼운 발로 옆을 잡아요. 바람 이동에는 무적이 없어요.'})
 ,bastion:Object.freeze({id:'bastion',law:'reflect',name:'성벽 씨앗',role:'유한 방패 · 반격',hp:161,speed:3.9,reach:1.65,arc:1.15,damage:[10,10,15],cadence:.4,heavy:{damage:24,reach:1.9,breaker:1.1},parry:1.3,tile:0,ink:'#f2df95',
  skills:[skill('성벽 반격',6.4,'정면 공격 두 번을 받아 반격해요 · 짧은 시간만'),skill('방패 밀기',5.2,'천천히 밀어붙여 막기를 흔들어요')],ult:skill('황금 성벽',0,'세 번만 막는 성벽 뒤에 밀쳐내는 충격'),blurb:'정면 방어에 강해요. 잡기와 뒤쪽 공격에는 방패가 뚫려요.'})
 ,comet:Object.freeze({id:'comet',law:'burst',name:'혜성 씨앗',role:'예고 돌진 · 두 번 타격',hp:207,speed:4.6,reach:2.1,arc:1.1,damage:[12,12,17],cadence:.36,heavy:{damage:26,reach:2.3},parry:1,tile:5,ink:'#ffb69c',
  skills:[skill('혜성 궤적',5.3,'방향을 예고한 뒤 돌진해 두 번까지 때려요'),skill('별 조각',4.2,'하나의 빠른 조각을 날려요')],ult:skill('유성 낙하',0,'긴 예고 뒤 돌진하고 마지막에 터져요'),blurb:'앞쪽을 빠르게 꿰어요. 예고 중에는 돌진을 끊을 수 있어요.'})
 ,lotus:Object.freeze({id:'lotus',law:'frost',name:'연꽃 씨앗',role:'서리 꽃 · 원격 폭발',hp:211,speed:4.15,reach:1.9,arc:1.1,damage:[10,10,15],cadence:.36,heavy:{damage:21,reach:2},parry:1,tile:8,ink:'#c7dfff',
  skills:[skill('서리 연못',5.8,'앞에 꽃을 심어 느리게 한 뒤 터뜨려요'),skill('꽃 피우기',4.5,'심은 꽃을 바로 피워요 · 없으면 꽃잎 하나')],ult:skill('달빛 개화',0,'셋의 서리 꽃이 차례로 피어요'),blurb:'꽃이 피는 자리를 바꿔 싸워요. 연못 밖으로 나가면 안전해요.'})
 ,prism:Object.freeze({id:'prism',law:'split',name:'환영 씨앗',role:'엇갈린 수정 · 각도 싸움',hp:163,speed:4.45,reach:1.75,arc:.95,damage:[10,10,14],cadence:.34,heavy:{damage:22,reach:1.9},parry:1,tile:0,ink:'#dfbaff',
  skills:[skill('엇갈린 수정',4.8,'양옆에서 수정 둘이 엇갈려 날아와요'),skill('잔상 투창',5.1,'옆으로 이동하고 튕기는 수정 하나')],ult:skill('만화경 교차',0,'다섯 수정이 교차해요 · 모두 막고 피할 수 있어요'),blurb:'수정의 출발점을 바꿔요. 벌어진 각도 사이로 피할 틈이 있어요.'})
 ,reed:Object.freeze({id:'reed',law:'pierce',name:'갈대 씨앗',role:'제자리 긴 찌르기',hp:197,speed:4.1,reach:2.15,arc:.68,damage:[10,10,15],cadence:.37,heavy:{damage:23,reach:2.5},parry:1,tile:4,ink:'#e2efae',
  skills:[skill('뿌리 박은 창',5.2,'방향을 고정하고 준비한 뒤 길게 찔러요 · 준비 중에는 무방비'),skill('갈대 투창',4.5,'가는 창 하나를 날려요')],ult:skill('세 갈래 갈대',0,'세 긴 창을 예고한 방향으로 한 번씩 뻗어요'),blurb:'발을 멈추고 긴 창을 내요. 옆으로 피하거나 준비를 끊을 수 있어요.'})
 ,cinder:Object.freeze({id:'cinder',law:'burst',name:'잉걸 씨앗',role:'불꽃 자취 · 길 막기',hp:225,speed:4.5,reach:1.8,arc:1.05,damage:[10,10,14],cadence:.36,heavy:{damage:24,reach:2},parry:1,tile:5,ink:'#ffc091',
  skills:[skill('남은 불씨',5.4,'방금 지나온 세 자리에 잠시 뒤 불이 붙어요 · 자리마다 한 번'),skill('불씨 던지기',4.2,'불꽃 하나를 앞으로 던져요')],ult:skill('잉걸의 발자국',0,'세 자취가 차례로 크게 타올라 길을 막아요'),blurb:'지나온 길을 불로 바꿔요. 불이 붙기 전에 길을 바꿀 수 있어요.'})
 ,pebble:Object.freeze({id:'pebble',law:'orbit',name:'자갈 씨앗',role:'무거운 공전 · 한 돌',hp:151,speed:3.95,reach:1.75,arc:1.1,damage:[11,11,15],cadence:.39,heavy:{damage:25,reach:2},parry:1.15,tile:3,ink:'#dfd3ab',
  skills:[skill('돌 한 바퀴',5.8,'돌 하나가 정해진 궤도로 돌아 한 번만 부딪쳐요'),skill('자갈 던지기',4.4,'무거운 돌 하나를 던져요')],ult:skill('큰돌 두 바퀴',0,'큰 돌 하나가 넓게 돌아 두 번까지 밀쳐요'),blurb:'돌의 위치를 보고 거리를 맞춰요. 궤도 안쪽과 바깥쪽으로 피할 수 있어요.'})
 ,echo:Object.freeze({id:'echo',law:'recall',name:'메아리 씨앗',role:'멈춘 잔상 · 이전 자리',hp:236,speed:4.4,reach:1.85,arc:1,damage:[10,10,15],cadence:.34,heavy:{damage:22,reach:2},parry:1,tile:6,ink:'#b9e8d6',
  skills:[skill('늦은 메아리',4.9,'그 자리에 남은 잔상이 상대의 이전 자리를 잠시 뒤 베어요'),skill('되돌아온 소리',4.6,'되돌아오는 칼날 하나')],ult:skill('세 번의 잔향',0,'멈춘 잔상 셋이 상대가 지나온 세 자리를 차례로 베어요'),blurb:'상대가 머물던 자리를 기억해요. 잔상은 따라오지 않아요.'})
 ,pulse:Object.freeze({id:'pulse',law:'gravity',name:'파동 씨앗',role:'퍼지는 고리 · 밀어내기',hp:145,speed:4.2,reach:1.85,arc:1.05,damage:[10,10,14],cadence:.36,heavy:{damage:23,reach:2.1},parry:1,tile:7,ink:'#d7bbff',
  skills:[skill('밀어내는 파동',5.6,'예고 뒤 퍼지는 고리가 한 번 밀쳐요 · 막고 피할 수 있어요'),skill('가벼운 파동',4.5,'작은 고리 하나를 퍼뜨려요')],ult:skill('두 겹의 울림',0,'시간차로 퍼지는 두 고리가 한 번씩 멀리 밀쳐요'),blurb:'바깥으로 밀어 거리를 다시 만들어요. 고리를 넘으면 같은 파동은 다시 맞지 않아요.'})
 ,shard:Object.freeze({id:'shard',law:'frost',name:'결정 씨앗',role:'정밀 조각 · 세 겹 서리',hp:260,speed:4.3,reach:1.95,arc:.78,damage:[10,10,15],cadence:.35,heavy:{damage:23,reach:2.15},parry:1,tile:8,ink:'#c2f2ff',
  skills:[skill('서리 조각',3.5,'가는 직선을 예고해 쏴요 · 세 번 맞으면 잠깐 느려져요'),skill('결정 투척',4.2,'결정 하나를 날려요')],ult:skill('결정의 선',0,'긴 직선 하나를 쏴 세 겹 서리를 남겨요 · 피해는 한 번'),blurb:'좁은 틈을 정확히 겨눠요. 서리는 세 겹까지, 둔화 뒤에는 다시 쌓을 시간이 필요해요.'})
 ,heart:Object.freeze({id:'heart',law:'gravity',name:'정원의 심장',role:'예고 중력장 · 유한 공전',hp:190,speed:4,reach:1.85,arc:1,damage:[10,10,15],cadence:.38,heavy:{damage:23,reach:2.1},parry:1,tile:7,ink:'#e5d18f',
  skills:[skill('심장의 자리',6.2,'상대 자리를 예고한 뒤 약하게 끌어요 · 피해는 한 번'),skill('정원의 공전',6.8,'돌 하나가 몸을 돌아 두 번까지 닿아요')],ult:skill('정원의 맥박',0,'예고 중력장과 돌 하나를 함께 펼쳐요'),blurb:'정원의 마지막 시험을 이기면 함께할 수 있어요. 예고한 자리는 따라오지 않아요.'})
});
export const DUEL_ORDER=Object.freeze(['pierce','burst','reflect','gravity','split','chain','recall','orbit','frost','thorn','gale','bastion','comet','lotus','prism','reed','cinder','pebble','echo','pulse','shard','heart','blastlance','frostnet','gravitymirror','chainburst','returnblade','frostguard']);
export function availableDuelCharacters(progress){return DUEL_ORDER.filter(id=>id!=='heart'||[0,1].includes(progress?.cleared?.s22?.losses));}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
function rnd(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}

function fighter(team,char,x,y){const c=DUEL_CHARACTERS[char];return {team,char,x,y,hp:c.hp,maxHp:c.hp,guard:DUEL_RULES.guardMax,meter:0,fx:team===0?1:-1,fy:0,state:'idle',t:0,combo:0,comboTime:0,blockSince:-9,blocking:false,stun:0,inv:0,dodgeCd:0,cd:[0,0],kx:0,ky:0,shield:0,counterShield:0,shieldHits:0,slow:0,heldBy:0,hitDone:false,dx:0,dy:0,step:0,lastHitBy:0,total:0,cancelAt:0,buffer:null,linked:false,chain:0,chainTime:0,flash:0,trail:[],trailClock:0,reedCast:0,shardStacks:0,shardTime:0,shardSlowCd:0,netCold:0,netColdTime:0,frostCast:0,mirrorCast:0,relayCast:0,relayRefundUntil:0,bladeCast:0,bladeCatch:0,wardCold:0,wardColdTime:0};}
// practice: 콤보 연습(쓰러지지 않고 체력이 다시 차며, 시간이 흐르지 않는다).
export function createDuel({player='pierce',enemy='burst',seed=1,difficulty='normal',practice=false,boss=false}={}){
 const s={seed:seed>>>0,practice:Boolean(practice),boss:Boolean(boss&&enemy==='heart'),phase:'ready',round:1,wins:[0,0],time:0,roundTime:DUEL_RULES.roundSeconds,difficulty,fighters:[fighter(0,player,DUEL_SPAWN[0].x,DUEL_SPAWN[0].y),fighter(1,enemy,DUEL_SPAWN[1].x,DUEL_SPAWN[1].y)],shots:[],hazards:[],effects:[],events:[],message:'1라운드',ready:1.2,winner:-1,ai:[{},{}]};
 if(s.boss)resetHeartBoss(s);
 return s;
}
function resetHeartBoss(s){Object.assign(s.fighters[1],{hp:330,maxHp:330,bossPhase:1,bossPattern:'',bossRecovery:1,bossActiveUntil:s.time,bossWindupUntil:s.time,bossNextAt:s.time+1,bossPatternIndex:0});}
function event(s,type){s.events.push(type);if(s.events.length>24)s.events.shift();}
function fx(s,type,x,y,extra={}){if(s.effects.length>=120)s.effects.shift();s.effects.push({type,x,y,life:.35,max:.35,...extra});}
function resetRound(s){for(const f of s.fighters){const c=DUEL_CHARACTERS[f.char],p=DUEL_SPAWN[f.team];Object.assign(f,fighter(f.team,f.char,p.x,p.y),{meter:f.meter*.5});f.hp=c.hp;}if(s.boss)resetHeartBoss(s);s.shots.length=0;s.hazards.length=0;s.roundTime=DUEL_RULES.roundSeconds;s.phase='ready';s.ready=1.2;s.message=`${s.round}라운드`;}
const facingHit=(def,att)=>{const v=norm(att.x-def.x,att.y-def.y);return v.x*def.fx+v.y*def.fy>-.2;};
// 한 번의 피해. kind: light|heavy|skill|shot|grab. 막기·반격 막기·막기 파괴를 여기서 가른다.
function strike(s,att,def,damage,{kind='light',knock=1,stun=.25,unblockable=false,breaker=1,dir=null,reflected=false}={}){
 if(s.boss&&att.team===1)damage*=1.2;
 if(def.hp<=0||def.inv>0)return false;const c=DUEL_CHARACTERS[def.char];
 if(def.counterShield>0&&def.shieldHits>0&&kind!=='grab'&&facingHit(def,att)&&!reflected){def.shieldHits--;fx(s,'block',def.x,def.y,{ink:c.ink});event(s,'block');def.meter=clamp(def.meter+8,0,100);if(dist(def,att)<2.8)strike(s,def,att,7,{kind:'skill',stun:.18,knock:.5,reflected:true});return false;}
 if(def.shield>0&&kind!=='grab'&&!reflected){fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'reflect');if(kind!=='shot'){strike(s,def,att,10,{kind:'skill',stun:.35,knock:.8,reflected:true});}return false;}
 const front=facingHit(def,att);
 if(def.blocking&&front&&!unblockable){
  // 반격 막기: 막기를 누른 직후(짧은 창) 맞으면 공격한 쪽이 크게 흔들린다.
  if(s.time-def.blockSince<=DUEL_RULES.parryWindow*c.parry&&kind!=='shot'){att.state='stagger';att.t=.85;att.stun=.85;att.buffer=null;def.meter=clamp(def.meter+22,0,100);s.freeze=.08;s.shake=Math.max(s.shake||0,.3);fx(s,'parry',def.x,def.y,{ink:c.ink});event(s,'parry');s.message='반격 막기!';return false;}
  if(kind==='heavy'||kind==='skill'&&breaker>1){def.guard-=45*breaker;}
  def.guard-=damage*1.3;const chip=damage*DUEL_RULES.blockDamage;def.hp-=chip;event(s,'block');fx(s,'block',def.x,def.y,{ink:c.ink});
  if(def.guard<=0){def.guard=0;def.blocking=false;def.state='broken';def.t=DUEL_RULES.guardBreakStun;def.stun=DUEL_RULES.guardBreakStun;event(s,'guardBreak');fx(s,'guardBreak',def.x,def.y,{});s.message='막기 파괴!';s.freeze=.08;s.shake=.45;}
  // 막힌 평타는 공격한 쪽이 튕겨 연타가 끊긴다(막은 쪽이 먼저 움직일 수 있다).
  if(kind==='light'&&att.state==='attack'){att.cancelAt=-1;att.t=Math.max(att.t,.24);att.buffer=null;att.combo=0;const v=norm(att.x-def.x,att.y-def.y);att.kx+=v.x*2.2;att.ky+=v.y*2.2;}
  att.meter=clamp(att.meter+3,0,100);checkKo(s);return true;
 }
 def.hp-=damage;def.stun=Math.max(def.stun,stun);def.state='hit';def.t=stun;def.blocking=false;def.buffer=null;def.flash=.14;att.chain=(att.chainTime>0?att.chain:0)+1;att.chainTime=.9;
 // 멈칫(히트스톱)은 강공격·스킬에만 아주 짧게 — 모험에서 과하면 끊겨 보였다.
 if(kind==='heavy'||kind==='skill')s.freeze=Math.max(s.freeze||0,.055);s.shake=Math.max(s.shake||0,kind==='heavy'?.35:kind==='skill'?.25:.08);const v=dir||norm(def.x-att.x,def.y-att.y);def.kx+=v.x*knock*5;def.ky+=v.y*knock*5;
 att.meter=clamp(att.meter+8,0,100);def.meter=clamp(def.meter+5,0,100);def.lastHitBy=att.team;event(s,kind==='heavy'?'heavyHit':'hit');fx(s,kind==='heavy'?'heavy':'hit',def.x,def.y,{ink:DUEL_CHARACTERS[att.char].ink,text:Math.round(damage)});
 checkKo(s);return true;
}
function checkKo(s){for(const f of s.fighters)if(f.hp<=0&&s.phase==='fight'){if(s.practice){f.hp=f.maxHp;f.guard=DUEL_RULES.guardMax;continue;}f.hp=0;endRound(s,1-f.team,'쓰러뜨렸어요');}}
function endRound(s,winner,why){s.wins[winner]++;s.phase='roundEnd';s.ready=1.8;s.message=`${winner===0?'승리':'패배'} · ${why}`;event(s,winner===0?'win':'lose');if(s.wins[winner]>=DUEL_RULES.roundsToWin){s.phase='over';s.winner=winner;s.message=winner===0?'대전 승리!':'대전 패배';}}
function melee(s,f,reach,arc,damage,opts={}){const o=s.fighters[1-f.team],v=norm(o.x-f.x,o.y-f.y),front=v.x*f.fx+v.y*f.fy;if(dist(f,o)<=reach+.45&&front>Math.cos(arc))return strike(s,f,o,damage,opts);return false;}
function shoot(s,f,extra){if(s.shots.length>=64)return;s.shots.push({owner:f.team,x:f.x+f.fx*.6,y:f.y+f.fy*.6,dx:f.fx,dy:f.fy,speed:11,life:1.2,damage:12,pierce:0,bounces:0,hit:new Set(),law:f.char,...extra});}
// Placed areas are capped per owner, so cooldown resets cannot make persistent particle or damage storms.
function area(s,f,kind,extra={}){const own=s.hazards.filter(h=>h.owner===f.team&&h.kind===kind);if(own.length>=3){const old=own[0];s.hazards.splice(s.hazards.indexOf(old),1);}if(s.hazards.length>=32)s.hazards.shift();const h={kind,owner:f.team,x:f.x+f.fx*2.4,y:f.y+f.fy*2.4,r:1.65,t:3.2,arm:.45,ink:DUEL_CHARACTERS[f.char].ink,...extra};h.total=h.t;s.hazards.push(h);return h;}
const batch03Context={strike,shoot,area,fx,event,wall:q=>q.x<DUEL_ARENA.minX||q.x>DUEL_ARENA.maxX||q.y<DUEL_ARENA.minY||q.y>DUEL_ARENA.maxY||DUEL_PILLARS.some(p=>dist(q,p)<p.r)};
function fork(s,f,count,damage,kind='crystal'){for(let k=0;k<count;k++){const off=(k-(count-1)/2)*.28,a=Math.atan2(f.fy,f.fx)-off;shoot(s,f,{x:f.x-f.fy*off*2,y:f.y+f.fx*off*2,dx:Math.cos(a),dy:Math.sin(a),speed:10,life:.9,damage,kind,bounces:kind==='crystal'?1:0});}}
function bloomLance(s,f,ult=false){
 f.bloomCast=(f.bloomCast||0)+1;f.state='skill';f.t=ult?1.35:.8;f.total=f.t;f.blocking=false;
 for(const [k,off] of (ult?[-.28,0,.28]:[0]).entries()){
  const a=Math.atan2(f.fy,f.fx)+off,dx=Math.cos(a),dy=Math.sin(a),arm=ult?.6+k*.22:.45;
  area(s,f,'bloomLanceTell',{x:f.x,y:f.y,dx,dy,endX:f.x+dx*7,endY:f.y+dy*7,r:.24,arm,t:arm+.08,cast:f.bloomCast,damage:ult?11:16,tipDamage:ult?7:12});
 }
}
function bloomRetreat(s,f){
 area(s,f,'bloomEmber',{x:f.x,y:f.y,r:1.15,arm:.65,t:.85,damage:10});
 f.state='dash';f.t=.16;f.total=.16;f.dx=-f.fx;f.dy=-f.fy;f.hitDone=true;
}
function frostWeave(s,f,ult=false){
 const o=s.fighters[1-f.team],d=Math.min(ult?5:4.2,Math.max(1.5,dist(f,o))),cx=f.x+f.fx*d,cy=f.y+f.fy*d,px=-f.fy,py=f.fx;
 f.frostCast=(f.frostCast||0)+1;f.state='skill';f.t=ult?1.45:.82;f.total=f.t;f.blocking=false;
 const points=ult?[[cx-f.fx*1.1+px*1.8,cy-f.fy*1.1+py*1.8],[cx+f.fx*1.7,cy+f.fy*1.7],[cx-f.fx*1.1-px*1.8,cy-f.fy*1.1-py*1.8]]:[[cx+px*1.8,cy+py*1.8],[cx-px*1.8,cy-py*1.8]];
 for(let k=0;k<(ult?3:1);k++){
  const p=points[k],q=points[(k+1)%points.length],v=norm(q[0]-p[0],q[1]-p[1]),arm=ult?.65+k*.25:.55;
  area(s,f,'frostThread',{x:p[0],y:p[1],endX:q[0],endY:q[1],dx:v.x,dy:v.y,r:.24,arm,t:arm+1.1,cast:f.frostCast,damage:ult?12:18,hitDone:false,triggered:false});
 }
}
function frostTug(s,f){
 const threads=s.hazards.filter(h=>h.owner===f.team&&h.kind==='frostThread'&&h.triggered);
 for(const h of threads){const mx=(h.x+h.endX)/2,my=(h.y+h.endY)/2;h.x=mx+(h.x-mx)*.65;h.y=my+(h.y-my)*.65;h.endX=mx+(h.endX-mx)*.65;h.endY=my+(h.endY-my)*.65;h.t=Math.min(h.t,.55);h.r=.36;}
 f.total=f.t=.28;
}
function rush(s,f,{ult=false}={}){const length=ult?6.4:4.8;f.state='skill';f.t=ult?.51:.37;f.hitDone=false;area(s,f,'rushTell',{x:f.x,y:f.y,t:f.t-.03,arm:0,r:.65,dx:f.fx,dy:f.fy,endX:f.x+f.fx*length,endY:f.y+f.fy*length,ult});}
// These attacks keep one fixed tell, one finite contact budget, and no extra AI actor.
function planted(s,f,{ult=false,shard=false}={}){const arm=shard?(ult?.55:.25):(ult?.72:.55),length=shard?(ult?8:6.2):(ult?8:6.5);f.state='skill';f.t=arm+.22;f.total=f.t;f.blocking=false;f.reedCast=(f.reedCast||0)+1;if(ult)f.inv=.08;
 for(const off of !shard&&ult?[-.15,0,.15]:[0]){const a=Math.atan2(f.fy,f.fx)+off,dx=Math.cos(a),dy=Math.sin(a);area(s,f,shard?'shardMark':'reedTell',{x:f.x,y:f.y,dx,dy,endX:f.x+dx*length,endY:f.y+dy*length,r:shard?(ult?.55:.28):.45,t:arm+.16,arm,cast:f.reedCast,damage:shard?(ult?26:12):(ult?16:24),stackGain:shard?(ult?3:1):0});}}
function embers(s,f,ult=false){const trail=f.trail?.length?f.trail:[{x:f.x,y:f.y}];for(let k=0;k<3;k++){const p=trail[Math.max(0,trail.length-1-k)];area(s,f,'cinderPatch',{x:p.x,y:p.y,r:ult?1.3:.95,arm:ult?.45+k*.22:.42,t:ult?2.8:2.1,damage:ult?14:8,triggered:false});}}
function stone(s,f,ult=false){area(s,f,'pebbleOrbit',{x:f.x,y:f.y,r:ult?2.6:1.9,orbitR:ult?2.6:1.9,angle:Math.atan2(f.fy,f.fx)-1.2,arm:.35,t:ult?2.9:1.8,damage:ult?17:18,contactR:ult?.8:.65,hits:0,maxHits:ult?2:1,gap:0,follow:true});}
function echoes(s,f,ult=false){const o=s.fighters[1-f.team],trail=o.trail?.length?o.trail:[{x:o.x,y:o.y}];for(let k=0;k<(ult?3:1);k++){const p=trail[Math.min(trail.length-1,k)],arm=.65+k*.26;area(s,f,'echoStrike',{x:p.x,y:p.y,fromX:f.x-f.fy*k*.45,fromY:f.y+f.fx*k*.45,r:ult?1.25:1.4,arm,t:arm+.14,damage:ult?13:20,triggered:false});}}
function wave(s,f,ult=false,small=false){for(let k=0;k<(ult?2:1);k++){const arm=.32+k*.5;area(s,f,'pulseRing',{x:f.x,y:f.y,r:0,prevR:0,maxR:ult?6:small?3.5:4.8,arm,t:arm+.72,damage:ult?16:small?10:18,hitDone:false});}}
function heartWell(s,f,{boss=false,phase=1,ult=false}={}){const o=s.fighters[1-f.team];return area(s,f,'heartWell',{x:o.x,y:o.y,r:boss?2.5:ult?2.4:2.1,arm:.8,t:2.4,pull:boss?1.4:1.25,damage:boss?(phase===2?22:18):ult?18:14,triggered:false});}
function heartOrbit(s,f,{boss=false,phase=1,ult=false}={}){return area(s,f,'pebbleOrbit',{x:f.x,y:f.y,r:2.3,orbitR:2.3,angle:Math.atan2(f.fy,f.fx)-1.2,arm:boss?.8:.7,t:2.5,damage:boss?(phase===2?17:14):ult?13:11,contactR:.7,hits:0,maxHits:2,gap:.7,follow:true});}
function heartPattern(s,f,kind){if(f.stun>0||s.time<f.bossNextAt||s.hazards.some(h=>h.owner===f.team))return false;const phase=f.hp<f.maxHp*.5?2:1;f.bossPhase=phase;const duration=kind==='ring'?1.6:phase===2?2.8:2.5;
 f.bossPattern=kind;f.bossActiveUntil=s.time+duration;f.bossWindupUntil=s.time+.8;f.bossNextAt=f.bossActiveUntil+(phase===2?.85:1.05);f.bossRecovery=0;f.bossPatternIndex=(f.bossPatternIndex+1)%3;f.state='skill';f.t=.85;f.total=.85;f.blocking=false;f.inv=0;event(s,'skill');
 if(kind==='well'){f.cd[0]=duration+1.05;heartWell(s,f,{boss:true,phase});}
 if(kind==='orbit'){f.cd[1]=duration+1.05;heartOrbit(s,f,{boss:true,phase});}
 if(kind==='ring')area(s,f,'pulseRing',{x:f.x,y:f.y,r:0,prevR:0,maxR:phase===2?6.2:5.6,arm:.8,t:1.6,damage:phase===2?23:19,hitDone:false});
 return true;
}
function lineContact(h,o){const vx=o.x-h.x,vy=o.y-h.y,along=vx*h.dx+vy*h.dy,length=Math.hypot(h.endX-h.x,h.endY-h.y);return along>=0&&along<=length&&Math.abs(vx*h.dy-vy*h.dx)<h.r+.4;}
// A mirror has exactly one terrain bounce. Its fixed anchor only exerts finite,
// continuous pull: no teleport, damage ticks, stun, or recursive reflections.
function mirrorCast(s,f,ult=false){
 f.mirrorCast=(f.mirrorCast||0)+1;f.state='skill';f.total=f.t=ult?1.12:.75;f.blocking=false;
 for(const [k,off] of (ult?[-.2,.2]:[0]).entries()){
  const a=Math.atan2(f.fy,f.fx)+off,dx=Math.cos(a),dy=Math.sin(a),arm=.45+k*.3;
  area(s,f,'mirrorTell',{x:f.x-f.fy*k*.6,y:f.y+f.fx*k*.6,dx,dy,endX:f.x+dx*7,endY:f.y+dy*7,r:.22,arm,t:arm+.08,cast:f.mirrorCast,damage:ult?12:16,triggered:false});
 }
}
function mirrorFold(s,f){
 const cores=s.hazards.filter(h=>h.owner===f.team&&h.kind==='mirrorAnchor');
 // Shared budget prevents overlapping folds from multiplying the same hit.
 const budget={spent:false};for(const h of cores){h.t=0;const v=norm(f.x-h.x,f.y-h.y);area(s,f,'mirrorFold',{x:h.x,y:h.y,endX:f.x,endY:f.y,dx:v.x,dy:v.y,r:.3,arm:.32,t:.46,damage:14,budget,triggered:false});}
 f.state='skill';f.total=f.t=.52;f.blocking=false;
 if(!cores.length)fx(s,'miss',f.x+f.fx,f.y+f.fy,{ink:DUEL_CHARACTERS[f.char].ink});
}
function emberMark(s,f,o){
 for(const h of s.hazards)if(h.owner===f.team&&h.kind==='emberMark')h.t=0;
 area(s,f,'emberMark',{x:o.x,y:o.y,r:.3,arm:0,t:3.2,triggered:true,target:o.team});
 // An earned finisher opens a follow-up window once every three seconds.
 // Previously marks expired before the five-second skill cooldown ended,
 // leaving the character's defining combo unavailable in ordinary play.
 if(s.time>=(f.relayRefundUntil||0)){f.cd[0]=Math.min(f.cd[0],.6);f.relayRefundUntil=s.time+3;}
}
function emberRelay(s,f,ult=false){
 const mark=s.hazards.find(h=>h.owner===f.team&&h.kind==='emberMark'&&h.t>0&&dist(f,h)<8);
 const cx=mark?.x??f.x+f.fx*3.5,cy=mark?.y??f.y+f.fy*3.5;
 if(mark)mark.t=0;
 const points=ult?[[cx-f.fy*1.6,cy+f.fx*1.6],[cx+f.fx*1.6,cy+f.fy*1.6],[cx+f.fy*1.6,cy-f.fx*1.6]]:[[cx,cy],[cx-f.fx*.6-f.fy*1.3,cy-f.fy*.6+f.fx*1.3],[cx-f.fx*.6+f.fy*1.3,cy-f.fy*.6-f.fx*1.3]];
 f.relayCast=(f.relayCast||0)+1;f.state='skill';f.total=f.t=ult?1.22:1.05;f.blocking=false;
 const budget={beam:false,bursts:new Set()};let p=[f.x,f.y];
 for(let k=0;k<3;k++){const q=points[k],v=norm(q[0]-p[0],q[1]-p[1]),arm=(mark&&!ult?.3:.5)+k*.2;area(s,f,'emberRelay',{x:p[0],y:p[1],endX:q[0],endY:q[1],dx:v.x,dy:v.y,r:.18,arm,t:arm+.14,cast:f.relayCast,damage:ult?10:8,burstDamage:ult?10:8,burstR:ult?1.05:.85,budget,node:k,triggered:false});p=q;}
}
function emberScatter(s,f){
 for(const off of [-1.2,1.2])area(s,f,'bloomEmber',{x:f.x-f.fy*off,y:f.y+f.fx*off,r:.8,arm:.65,t:.82,damage:8});
 f.state='dash';f.total=f.t=.14;f.dx=-f.fy;f.dy=f.fx;f.hitDone=true;
}
function useSkill(s,f,i){
 const c=DUEL_CHARACTERS[f.char],o=s.fighters[1-f.team],fold=i===0&&(batch03Repress(s,f)||f.char==='gravitymirror'&&s.hazards.some(h=>h.owner===f.team&&h.kind==='mirrorAnchor'&&h.t>0));if(f.cd[i]>0&&!fold||f.stun>0||['attack','heavy','skill','dodge'].includes(f.state))return false;
 if(!fold)f.cd[i]=c.skills[i].cooldown;f.state='skill';f.t=.35;f.hitDone=false;if(DUEL_ORDER.indexOf(f.char)>=15)f.blocking=false;event(s,'skill');
 if(DUEL_BATCH03[f.char])batch03Action(s,f,i,batch03Context);
 const actions=duelSkillActions(f,i);
 if(actions)for(const action of actions){
  if(action.type==='motion')Object.assign(f,{state:action.state,t:action.seconds,dx:action.dx,dy:action.dy,hitDone:action.hitDone});
  else if(action.type==='shot')shoot(s,f,action.options);
  else if(action.type==='status')Object.assign(f,action.values);
  else if(action.type==='effect')fx(s,action.kind,f.x,f.y,{ink:c.ink,...action.options});
  else if(action.type==='hazard')s.hazards.push(action.options);
  else if(action.type==='bloomLance')bloomLance(s,f);
  else if(action.type==='bloomRetreat')bloomRetreat(s,f);
  else if(action.type==='frostWeave')frostWeave(s,f);
  else if(action.type==='frostTug')frostTug(s,f);
  else if(action.type==='mirrorCast'){if(fold)mirrorFold(s,f);else mirrorCast(s,f);}
  else if(action.type==='mirrorFold')mirrorFold(s,f);
  else if(action.type==='emberRelay')emberRelay(s,f);
  else if(action.type==='emberScatter')emberScatter(s,f);
 }
 if(f.char==='burst'){if(i===0)s.hazards.push({kind:'mine',owner:f.team,x:f.x,y:f.y,t:.9,r:2.1});else{f.state='leap';f.t=.55;f.tx=clamp(o.x,DUEL_ARENA.minX,DUEL_ARENA.maxX);f.ty=clamp(o.y,DUEL_ARENA.minY,DUEL_ARENA.maxY);s.hazards.push({kind:'tell',owner:f.team,x:f.tx,y:f.ty,t:.55,r:2.1});}}
 if(f.char==='split')for(const off of [-.32,0,.32]){const a=Math.atan2(f.fy,f.fx)+off;s.shots.push({owner:f.team,x:f.x+f.fx*.5,y:f.y+f.fy*.5,dx:Math.cos(a),dy:Math.sin(a),speed:10,life:.6,damage:10,pierce:0,bounces:0,hit:new Set(),law:'split',kind:'petal'});}
 if(f.char==='chain'){const v=norm(o.x-f.x,o.y-f.y);if(dist(f,o)<5.8&&v.x*f.fx+v.y*f.fy>.3&&o.inv<=0){strike(s,f,o,10,{kind:'skill',stun:.35,knock:.3});fx(s,'bolt',o.x,o.y,{ink:c.ink,fromX:f.x,fromY:f.y,life:.3,max:.3});}else fx(s,'bolt',f.x+f.fx*5,f.y+f.fy*5,{ink:c.ink,fromX:f.x,fromY:f.y,life:.3,max:.3});}
 if(f.char==='frost'){const v=norm(o.x-f.x,o.y-f.y);fx(s,'breath',f.x,f.y,{ink:c.ink,angle:Math.atan2(f.fy,f.fx),r:3.6,life:.4,max:.4});if(dist(f,o)<3.9&&v.x*f.fx+v.y*f.fy>.5){strike(s,f,o,9,{kind:'skill',stun:.25,knock:.4});o.slow=Math.max(o.slow,1.1);}}
 if(f.char==='gravity'){if(i===0){const v=norm(o.x-f.x,o.y-f.y);if(dist(f,o)<5.5&&v.x*f.fx+v.y*f.fy>.35&&o.inv<=0){o.x=f.x+f.fx*1.1;o.y=f.y+f.fy*1.1;strike(s,f,o,8,{kind:'grab',unblockable:true,stun:.6,knock:.2});fx(s,'pull',o.x,o.y,{ink:c.ink});}else fx(s,'miss',f.x+f.fx*2,f.y+f.fy*2,{});}else s.hazards.push({kind:'well',owner:f.team,x:f.x+f.fx*1.5,y:f.y+f.fy*1.5,t:2.6,r:2.6});}
 if(f.char==='thorn'){if(i===0)area(s,f,'bramble',{damage:12,t:3.5});else fork(s,f,2,9,'lance');}
 if(f.char==='gale'){if(i===0){shoot(s,f,{damage:13,kind:'petal',speed:12,life:.75});f.state='dash';f.t=.2;f.dx=-f.fy;f.dy=f.fx;f.hitDone=true;}else for(const off of [-.3,.3]){const a=Math.atan2(f.fy,f.fx)+off;shoot(s,f,{dx:Math.cos(a),dy:Math.sin(a),kind:'blade',damage:9,life:1.3,turn:.5,age:0,pierce:1});}}
 if(f.char==='bastion'){if(i===0){f.counterShield=.85;f.shieldHits=2;f.state='idle';f.t=0;fx(s,'shield',f.x,f.y,{ink:c.ink,life:.85,max:.85});}else{f.state='dash';f.t=.24;f.dx=f.fx;f.dy=f.fy;f.hitDone=false;f.dashDamage=15;f.hitLimit=1;f.dashHits=0;f.hitGap=0;}}
 if(f.char==='comet'){if(i===0)rush(s,f);else shoot(s,f,{kind:'lance',damage:14,speed:14,life:.75});}
 if(f.char==='lotus'){if(i===0)area(s,f,'frostBloom',{x:o.x,y:o.y,damage:20,t:1.2,arm:.45,r:2.1});else{const blooms=s.hazards.filter(h=>h.owner===f.team&&h.kind==='frostBloom'&&h.arm<=0);if(blooms.length)for(const h of blooms)h.t=.01;else shoot(s,f,{kind:'petal',damage:12,life:.8});}}
 if(f.char==='prism'){if(i===0)fork(s,f,2,11);else{f.x-=f.fy*.9;f.y+=f.fx*.9;clampArena(f);shoot(s,f,{kind:'crystal',damage:14,bounces:2,life:1.2});}}
 if(f.char==='reed'){if(i===0)planted(s,f);else shoot(s,f,{kind:'lance',damage:14,speed:14,life:.65,law:'pierce'});}
 if(f.char==='cinder'){if(i===0)embers(s,f);else shoot(s,f,{kind:'petal',damage:13,speed:10,life:.7,law:'burst'});}
 if(f.char==='pebble'){if(i===0)stone(s,f);else shoot(s,f,{kind:'crystal',damage:16,speed:8,life:.75,law:'orbit'});}
 if(f.char==='echo'){if(i===0)echoes(s,f);else shoot(s,f,{kind:'blade',damage:10,turn:.5,age:0,pierce:1,life:1.4,law:'recall'});}
 if(f.char==='pulse')wave(s,f,false,i===1);
 if(f.char==='shard'){if(i===0)planted(s,f,{shard:true});else shoot(s,f,{kind:'crystal',damage:13,speed:13,life:.65,law:'frost'});}
 if(f.char==='heart'){f.t=.8;f.total=.8;if(i===0)heartWell(s,f);else heartOrbit(s,f);}
 return true;
}
function useUlt(s,f){
 const o=s.fighters[1-f.team],c=DUEL_CHARACTERS[f.char];if(f.meter<DUEL_RULES.meterMax||f.stun>0||f.char==='returnblade'&&s.shots.some(q=>q.kind==='returnSpear'&&q.owner===f.team&&q.life>0))return false;f.meter=0;f.inv=.5;event(s,'ultimate');fx(s,'ult',f.x,f.y,{ink:c.ink,life:.8,max:.8});s.message=c.ult.name;
 if(DUEL_BATCH03[f.char])batch03Action(s,f,0,batch03Context,true);
 if(f.char==='blastlance'){f.inv=.08;bloomLance(s,f,true);}
 if(f.char==='frostnet'){f.inv=.08;frostWeave(s,f,true);}
 if(f.char==='gravitymirror'){f.inv=.08;mirrorCast(s,f,true);}
 if(f.char==='chainburst'){f.inv=.08;emberRelay(s,f,true);}
 if(f.char==='pierce')for(const off of [-.35,0,.35]){const a=Math.atan2(f.fy,f.fx)+off;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:15,life:1.4,damage:16,pierce:3,bounces:0,hit:new Set(),law:'pierce',kind:'lance',unblockable:false,breaker:1.5});}
 if(f.char==='burst'){if(dist(f,o)<4.2)strike(s,f,o,40,{kind:'skill',breaker:2,stun:.8,knock:2});fx(s,'boom',f.x,f.y,{r:4.2,ink:c.ink,life:.6,max:.6});}
 if(f.char==='reflect'){if(dist(f,o)<8){o.state='jailed';o.t=1.6;o.stun=1.6;o.blocking=false;fx(s,'jail',o.x,o.y,{ink:c.ink,life:1.6,max:1.6});}}
 if(f.char==='split')for(const wave of [0,1])for(let k=0;k<8;k++){const a=k/8*Math.PI*2+wave*.39;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:wave?8:10,life:.9,damage:9,pierce:0,bounces:0,hit:new Set(),law:'split',kind:'petal'});}
 if(f.char==='chain')for(let k=0;k<5;k++)s.hazards.push({kind:'strike',owner:f.team,x:o.x,y:o.y,t:.45+k*.3,r:1.35,aim:true});
 if(f.char==='recall')for(let k=0;k<4;k++){const a=Math.atan2(f.fy,f.fx)+k*Math.PI/2;s.shots.push({owner:f.team,x:f.x,y:f.y,dx:Math.cos(a),dy:Math.sin(a),speed:10,life:1.8,damage:11,pierce:1,bounces:0,hit:new Set(),law:'recall',kind:'blade',turn:.6,age:0});}
 if(f.char==='orbit')s.hazards.push({kind:'ring',owner:f.team,x:f.x,y:f.y,t:3.5,r:2.8,tick:0,follow:true,damage:5});
 if(f.char==='frost')s.hazards.push({kind:'blizzard',owner:f.team,x:f.x,y:f.y,t:2.6,r:4.4,tick:0,follow:true});
 if(f.char==='thorn')for(const off of [-1.7,0,1.7])area(s,f,'bramble',{x:o.x-f.fy*off,y:o.y+f.fx*off,t:3.8,arm:.65,r:1.45,damage:16});
 if(f.char==='gale')for(const off of [-.45,0,.45]){const a=Math.atan2(f.fy,f.fx)+off;shoot(s,f,{kind:'blade',dx:Math.cos(a),dy:Math.sin(a),damage:12,turn:.55,age:0,pierce:1,life:1.6});}
 if(f.char==='bastion'){f.counterShield=1.25;f.shieldHits=3;area(s,f,'bramble',{x:f.x,y:f.y,arm:.45,t:.6,r:2.7,damage:22});}
 if(f.char==='comet')rush(s,f,{ult:true});
 if(f.char==='lotus')for(const off of [-1.8,0,1.8])area(s,f,'frostBloom',{x:o.x-f.fy*off,y:o.y+f.fx*off,arm:.65,t:1.5+Math.abs(off)*.15,r:1.7,damage:17});
 if(f.char==='prism')fork(s,f,5,10);
 if(f.char==='reed')planted(s,f,{ult:true});
 if(f.char==='cinder')embers(s,f,true);
 if(f.char==='pebble')stone(s,f,true);
 if(f.char==='echo')echoes(s,f,true);
 if(f.char==='pulse')wave(s,f,true);
 if(f.char==='shard')planted(s,f,{ult:true,shard:true});
 if(f.char==='heart'){f.state='skill';f.t=.8;f.total=.8;f.blocking=false;heartWell(s,f,{ult:true});heartOrbit(s,f,{ult:true});}
 if(f.char==='gravity')s.hazards.push({kind:'hole',owner:f.team,x:f.x+f.fx*3,y:f.y+f.fy*3,t:2.2,r:3.4,tick:0});
 return true;
}
// 입력: {x,y 이동, aimX,aimY, attack, heavy, block(누르는 중), dodge, skill1, skill2, ult}
function act(s,f,input,dt){
 const c=DUEL_CHARACTERS[f.char],A=DUEL_ARENA;
 for(const k of ['t','stun','inv','dodgeCd','comboTime','shield','counterShield','slow','chainTime','flash'])f[k]=Math.max(0,f[k]-dt);
 if(s.boss&&f.team===1&&s.time>=f.bossActiveUntil&&s.time<f.bossNextAt){f.buffer=null;f.blocking=false;if(['attack','heavy','block','skill'].includes(f.state)){f.state='idle';f.t=0;}}
 f.shardTime=Math.max(0,(f.shardTime||0)-dt);f.shardSlowCd=Math.max(0,(f.shardSlowCd||0)-dt);if(f.shardTime<=0)f.shardStacks=0;
 // 2026-09-28 사용자: "평타 1·2타가 이어지는 맛 · 공격과 강공격이 끊어져 연계가 없다 · 모션이 답답하다"
 // 누른 행동은 잠깐(0.3초) 기억해 두었다가, 지금 동작이 끝나거나 끊을 수 있는 순간에 바로 이어서 낸다.
 for(const a of ['attack','heavy','dodge','skill1','skill2','ult'])if(input[a]){f.buffer={act:a,t:.3};break;}
 if(f.buffer){f.buffer.t-=dt;if(f.buffer.t<=0)f.buffer=null;}f.cd[0]=Math.max(0,f.cd[0]-dt);f.cd[1]=Math.max(0,f.cd[1]-dt);
 if(!f.blocking)f.guard=Math.min(DUEL_RULES.guardMax,f.guard+DUEL_RULES.guardRegen*dt);if(f.comboTime<=0)f.combo=0;
 f.x+=f.kx*dt;f.y+=f.ky*dt;const k=Math.exp(-8*dt);f.kx*=k;f.ky*=k;
 // 공격이 나간 뒤(맞든 안 맞든) 끊는 순간부터는 다음 공격·연계 강공격·회피로 이어 갈 수 있다.
 // 2026-09-28 사용자: "기본 공격만 계속 누르면 (상대가) 죽는다" — 1→2→3타 뒤에 곧바로 다시 1타로 이어져 끝없이 묶였다.
 // 3타 뒤에는 강공격·회피로만 끊을 수 있고, 다시 평타를 치려면 3타 동작이 끝나야 한다.
 const cancel=Boolean(f.stun<=0&&f.buffer&&(f.state==='attack'||f.state==='heavy')&&f.hitDone&&f.t<=f.cancelAt&&f.t>0&&!(f.state==='attack'&&f.step===2&&f.buffer.act==='attack'));
 const busy=!cancel&&(f.stun>0||['attack','heavy','skill','dash','leap','dodge'].includes(f.state)&&f.t>0);
 const wants=a=>Boolean(input[a])||f.buffer?.act===a;
 // 2026-09-28 사용자: "회피를 누르면 쭉 밀린다" — 회피·돌진이 끝나도 상태가 남아 매 장면 계속 미끄러졌다. 끝난 동작은 모두 대기로.
 if(!busy&&f.stun<=0&&(['hit','broken','stagger','jailed'].includes(f.state)||f.t<=0&&['dodge','dash','leap','skill','attack','heavy'].includes(f.state)))f.state='idle';
 // 방향: 이동 중이면 이동 쪽, 아니면 조준 쪽(없으면 상대 쪽).
 const o=s.fighters[1-f.team];
 if(!busy){const aim=Math.hypot(input.aimX||0,input.aimY||0)>.1?norm(input.aimX,input.aimY):norm(o.x-f.x,o.y-f.y);f.fx=aim.x;f.fy=aim.y;}
 // 행동 끝(공격 판정은 시작 뒤 잠깐 있다가 나간다).
 if(f.state==='attack'&&!f.hitDone&&f.t<=f.hitAt){f.hitDone=true;const step=f.step,reach=(c.comboReach?.[step]??c.reach*(step===2?1.12:1))*batch03Reach(s,f),arc=c.comboArc?.[step]??c.arc*(step===2?1.25:1);fx(s,'swing',f.x,f.y,{ink:c.ink,char:f.char,step,angle:Math.atan2(f.fy,f.fx),r:reach,life:.26,max:.26,team:f.team});const guarded=o.blocking&&facingHit(o,f),hit=melee(s,f,reach,arc,c.damage[step],{kind:'light',stun:step===2?.3:.24,knock:step===2?1.7:.5});batch03Melee(s,f,{step,hit,guarded});if(f.char==='chainburst'&&step===2&&hit&&!guarded)emberMark(s,f,o);}
 if(f.state==='heavy'&&!f.hitDone&&f.t<=.12){f.hitDone=true;fx(s,'heavySwing',f.x,f.y,{ink:c.ink,char:f.char,linked:f.linked,angle:Math.atan2(f.fy,f.fx),r:c.heavy.reach*batch03Reach(s,f,true),life:.34,max:.34,team:f.team});const guarded=o.blocking&&facingHit(o,f),hit=melee(s,f,c.heavy.reach*batch03Reach(s,f,true),c.arc*1.1,Math.round(c.heavy.damage*(f.linked?1.15:1)),{kind:'heavy',stun:.6,knock:2.2,breaker:c.heavy.breaker||1});batch03Melee(s,f,{heavy:true,hit,guarded});if(f.char==='chainburst'&&hit&&!guarded)emberMark(s,f,o);if(f.char==='gravitymirror'&&hit&&!guarded)fx(s,'mirrorImpact',o.x,o.y,{ink:c.ink,life:.25,max:.25});}
 if(f.state==='dash'&&f.t>0){const speed=f.char==='comet'&&f.hitGap>0?1.8:13;f.x+=f.dx*speed*dt;f.y+=f.dy*speed*dt;if(f.char==='comet'){f.hitGap=Math.max(0,(f.hitGap||0)-dt);if((f.dashHits||0)<(f.hitLimit||2)&&f.hitGap<=0&&dist(f,o)<1.1){f.dashHits=(f.dashHits||0)+1;f.hitGap=.15;strike(s,f,o,f.dashDamage||11,{kind:'skill',stun:.12,knock:.22,dir:{x:f.dx,y:f.dy}});}}else if(!f.hitDone&&dist(f,o)<1.1){f.hitDone=true;strike(s,f,o,f.char==='bastion'?15:20,{kind:'skill',stun:.5,knock:1.6,dir:{x:f.dx,y:f.dy}});}}
 if(f.state==='leap'&&f.t<=0.02&&!f.hitDone){f.hitDone=true;f.x=f.tx;f.y=f.ty;fx(s,'boom',f.x,f.y,{r:2.1,ink:c.ink,life:.4,max:.4});if(dist(f,o)<2.1)strike(s,f,o,18,{kind:'skill',breaker:2,stun:.55,knock:1.8});event(s,'heavyHit');}
 if(f.state==='dodge'&&f.t>0){f.x+=f.dx*12*dt;f.y+=f.dy*12*dt;}
 // 휘두르는 동안에도 조금은 움직일 수 있다(발이 묶인 답답함 줄이기).
 if(busy&&(f.state==='attack'||f.state==='heavy')&&f.stun<=0){const m=Math.hypot(input.x||0,input.y||0);if(m>.1){f.x+=(input.x/m)*c.speed*.28*dt;f.y+=(input.y/m)*c.speed*.28*dt;}}
 // The first placement stays stationary. After release the caster may reposition
 // at a reduced pace; existing fixed warning coordinates never track that move.
 if(busy&&f.state==='skill'&&['gravitymirror','chainburst'].includes(f.char)&&f.t<f.total-.5&&f.stun<=0){const m=Math.hypot(input.x||0,input.y||0);if(m>.1){f.x+=(input.x/m)*c.speed*.6*dt;f.y+=(input.y/m)*c.speed*.6*dt;}}
 if(busy){clampArena(f);return;}
 const was=cancel?f.state:'';if(cancel){f.state='idle';f.t=0;}
 // 새 행동.
 if(s.boss&&f.team===1&&input.bossAttack&&heartPattern(s,f,input.bossAttack)){clampArena(f);return;}
 f.blocking=Boolean(input.block)&&f.stun<=0;if(f.blocking&&f.state!=='block'){f.blockSince=s.time;f.state='block';}if(!f.blocking&&f.state==='block')f.state='idle';
 if(wants('dodge')&&f.dodgeCd<=0){f.buffer=null;const d=Math.hypot(input.x||0,input.y||0)>.1?norm(input.x,input.y):{x:-f.fx,y:-f.fy};f.state='dodge';f.t=.24;f.inv=.2;f.dodgeCd=DUEL_RULES.dodgeCd;f.dx=d.x;f.dy=d.y;f.blocking=false;event(s,'dash');clampArena(f);return;}
 if(wants('ult')&&useUlt(s,f)){f.buffer=null;clampArena(f);return;}
 if(wants('skill1')&&useSkill(s,f,0)){f.buffer=null;clampArena(f);return;}
 if(wants('skill2')&&useSkill(s,f,1)){f.buffer=null;clampArena(f);return;}
 // 연계 강공격: 평타가 나간 직후 이어 누르면 준비가 짧고(0.24초) 조금 더 세다.
 if(wants('heavy')){const link=was==='attack';f.buffer=null;f.state='heavy';f.linked=link;f.total=f.t=link?.36:.58;f.cancelAt=.06;f.hitDone=false;f.blocking=false;f.combo=0;lunge(s,f,link?5.5:3.2);event(s,link?'link':'charge');clampArena(f);return;}
 if(wants('attack')){f.buffer=null;f.step=f.combo%3;f.combo++;f.comboTime=c.cadence+.45;f.state='attack';f.total=f.t=c.cadence*(f.step===2?1.3:1)+(f.step===2?.16:0);f.hitAt=f.t-.1;f.cancelAt=f.t-.17;f.hitDone=false;f.blocking=false;lunge(s,f,f.step===2?4.2:2.6);event(s,'swing'+f.step);clampArena(f);return;}
 const mv=norm(input.x||0,input.y||0),moving=Math.hypot(input.x||0,input.y||0)>.1,speed=c.speed*(f.blocking?.45:1)*(f.slow>0?.55:1);
 if(moving){f.x+=mv.x*speed*dt;f.y+=mv.y*speed*dt;}
 clampArena(f);
}
// 휘두를 때 앞으로 한 걸음(상대가 코앞이면 덜 나간다).
function lunge(s,f,speed){const o=s.fighters[1-f.team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),front=v.x*f.fx+v.y*f.fy>.5,k=front?clamp((d-1)/1.6,0,1):1;f.kx+=f.fx*speed*k;f.ky+=f.fy*speed*k;}
function clampArena(f){const A=DUEL_ARENA;f.x=clamp(f.x,A.minX,A.maxX);f.y=clamp(f.y,A.minY,A.maxY);for(const p of DUEL_PILLARS){const d=dist(f,p),m=p.r+.45;if(d<m&&d>1e-6){f.x=p.x+(f.x-p.x)/d*m;f.y=p.y+(f.y-p.y)/d*m;}}}
export function startDuelRound(s){if(s.phase==='ready'){s.phase='fight';s.message='';return true;}return false;}
export function stepDuel(s,dt,playerInput={},enemyInput=null){
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);s.events.length=Math.min(s.events.length,24);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 if(s.phase==='ready'){s.ready-=dt;if(s.ready<=0){s.phase='fight';s.message='';event(s,'start');}return;}
 if(s.phase==='roundEnd'){s.ready-=dt;if(s.ready<=0){s.round++;resetRound(s);}return;}
 if(s.phase!=='fight')return;
 s.shake=Math.max(0,(s.shake||0)-dt*1.6);
 if(s.freeze>0){s.freeze-=dt;return;}
 s.time+=dt;if(!s.practice)s.roundTime-=dt;
 const [a,b]=s.fighters;act(s,a,playerInput,dt);act(s,b,enemyInput||duelAi(s,1,dt),dt);
 // Short, bounded position history. Echo remembers the old position, never retargets its tell.
 for(const f of s.fighters){f.netColdTime=Math.max(0,(f.netColdTime||0)-dt);if(!f.netColdTime)f.netCold=0;if(f.char==='cinder'||s.fighters[1-f.team].char==='echo'){f.trailClock=(f.trailClock||0)+dt;if(f.trailClock>=.22){f.trailClock=0;f.trail??=[];f.trail.push({x:f.x,y:f.y});if(f.trail.length>3)f.trail.shift();}}}
 // 서로 겹치지 않게.
 const d=dist(a,b);if(d<.9&&d>1e-6){const push=(.9-d)/2,v=norm(b.x-a.x,b.y-a.y);a.x-=v.x*push;a.y-=v.y*push;b.x+=v.x*push;b.y+=v.y*push;clampArena(a);clampArena(b);}
 batch03Tick(s,dt,batch03Context);
 for(const q of s.shots){if(q.kind==='returnSpear')continue;q.life-=dt;
  // 귀환 칼날: 잠깐 날아간 뒤 던진 씨앗에게 돌아온다(돌아오는 길에 한 번 더 벨 수 있다). 받으면 사라진다.
  if(q.kind==='blade'){q.age+=dt;if(q.age>=q.turn){const home=s.fighters[q.owner],v=norm(home.x-q.x,home.y-q.y);if(!q.back){q.back=true;q.hit.clear();q.pierce=1;}q.dx=v.x;q.dy=v.y;q.speed=12;if(Math.hypot(home.x-q.x,home.y-q.y)<.6)q.life=0;}}
  q.x+=q.dx*q.speed*dt;q.y+=q.dy*q.speed*dt;const A=DUEL_ARENA;
  if(q.kind==='mirrorCore'){
   let normal=null;
   if(q.x<A.minX||q.x>A.maxX){normal={x:q.x<A.minX?1:-1,y:0};q.x=clamp(q.x,A.minX,A.maxX);}else if(q.y<A.minY||q.y>A.maxY){normal={x:0,y:q.y<A.minY?1:-1};q.y=clamp(q.y,A.minY,A.maxY);}
   else for(const p of DUEL_PILLARS)if(dist(q,p)<p.r+.13){normal=norm(q.x-p.x,q.y-p.y);q.x=p.x+normal.x*(p.r+.14);q.y=p.y+normal.y*(p.r+.14);break;}
   if(normal){if(q.bounces>0){q.bounces--;const dot=q.dx*normal.x+q.dy*normal.y;if(dot<0){q.dx-=2*dot*normal.x;q.dy-=2*dot*normal.y;}area(s,s.fighters[q.owner],'mirrorAnchor',{x:q.x,y:q.y,r:1.65,arm:0,t:1.2,pull:1.4,triggered:true});event(s,'mirrorBounce');}else q.life=0;}
  }else if(q.kind!=='blade'&&(q.x<A.minX-.5||q.x>A.maxX+.5||q.y<A.minY-.5||q.y>A.maxY+.5||DUEL_PILLARS.some(p=>Math.hypot(q.x-p.x,q.y-p.y)<p.r))){if(q.bounces>0){q.bounces--;if(q.x<A.minX||q.x>A.maxX)q.dx*=-1;else q.dy*=-1;q.x=clamp(q.x,A.minX,A.maxX);q.y=clamp(q.y,A.minY,A.maxY);}else q.life=0;}
  const target=s.fighters[1-q.owner];if(q.life>0&&!q.hit.has(target.team)&&Math.hypot(q.x-target.x,q.y-target.y)<.6){
   if(target.shield>0){q.reflections=(q.reflections||0)+1;if(q.reflections>2){q.life=0;continue;}q.owner=target.team;q.dx*=-1;q.dy*=-1;q.hit.clear();fx(s,'parry',q.x,q.y,{ink:DUEL_CHARACTERS[target.char].ink});event(s,'reflect');continue;}
   q.hit.add(target.team);strike(s,s.fighters[q.owner],target,q.damage,{kind:'shot',stun:.3,knock:.8,breaker:q.breaker||1,dir:{x:q.dx,y:q.dy}});if(--q.pierce<0)q.life=0;}
 }
 for(const q of s.shots)if(q.bloomTip&&q.life<=0&&!q.bloomSpent){
  q.bloomSpent=true;const radius=Math.min(1.8,.85+Math.hypot(q.x-q.startX,q.y-q.startY)*.12),att=s.fighters[q.owner],target=s.fighters[1-q.owner];
  fx(s,'boom',q.x,q.y,{r:radius,ink:DUEL_CHARACTERS[att.char].ink,life:.3,max:.3});event(s,'heavyHit');
  if(dist(q,target)<radius)strike(s,att,target,q.tipDamage,{kind:'skill',stun:.18,knock:.6,dir:{x:q.dx,y:q.dy}});
 }
 s.shots=s.shots.filter(q=>q.life>0);
 for(const h of s.hazards){if(['bladeSend','frostWard','wardPunish','wardFan'].includes(h.kind))continue;h.t-=dt;const owner=s.fighters[h.owner],o=s.fighters[1-h.owner];
  if(h.kind==='emberMark'&&h.t>0){h.x=o.x;h.y=o.y;}
  if(h.kind==='mirrorTell'){
   if(owner.stun>0||owner.state!=='skill'||owner.mirrorCast!==h.cast){h.t=0;continue;}
   h.arm=Math.max(0,h.arm-dt);if(h.arm<=0&&!h.triggered){h.triggered=true;shoot(s,owner,{x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,kind:'mirrorCore',law:'gravity',bounces:1,damage:h.damage,speed:10,life:.95});event(s,'mirrorLaunch');}
  }
  if(h.kind==='mirrorAnchor'&&dist(h,o)<h.r&&o.inv<=0){const v=norm(h.x-o.x,h.y-o.y),force=h.pull*(o.blocking?.25:1);o.x+=v.x*force*dt;o.y+=v.y*force*dt;clampArena(o);}
  if(h.kind==='mirrorFold'){
   h.arm=Math.max(0,h.arm-dt);if(h.arm<=0&&!h.triggered){h.triggered=true;event(s,'mirrorFold');if(!h.budget.spent&&lineContact(h,o)&&o.inv<=0){h.budget.spent=true;strike(s,owner,o,h.damage,{kind:'skill',stun:.18,knock:.6,dir:{x:h.dx,y:h.dy}});}}
  }
  if(h.kind==='emberRelay'){
   if(owner.stun>0||owner.state!=='skill'||owner.relayCast!==h.cast){h.t=0;continue;}
   h.arm=Math.max(0,h.arm-dt);if(h.arm<=0&&!h.triggered){h.triggered=true;event(s,'emberRelay');fx(s,'bolt',h.endX,h.endY,{ink:h.ink,fromX:h.x,fromY:h.y,life:.2,max:.2});fx(s,'boom',h.endX,h.endY,{ink:h.ink,r:h.burstR,life:.24,max:.24});
    if(o.inv<=0){if(!h.budget.beam&&lineContact(h,o)){h.budget.beam=true;strike(s,owner,o,h.damage,{kind:'skill',stun:.1,knock:.2,dir:{x:h.dx,y:h.dy}});}if(!h.budget.bursts.has(o.team)&&Math.hypot(o.x-h.endX,o.y-h.endY)<h.burstR){h.budget.bursts.add(o.team);strike(s,owner,o,h.burstDamage,{kind:'skill',stun:.12,knock:.35,dir:norm(o.x-h.endX,o.y-h.endY)});}}
   }
  }
  if(h.kind==='frostThread'){
   if(!h.triggered&&(owner.stun>0||owner.state!=='skill'||owner.frostCast!==h.cast)){h.t=0;continue;}
   h.arm=Math.max(0,h.arm-dt);if(!h.triggered&&h.arm<=0){h.triggered=true;event(s,'frostWeave');}
   if(h.triggered&&!h.hitDone&&lineContact(h,o)&&o.inv<=0){h.hitDone=true;const guarded=o.blocking&&facingHit(o,owner),hit=strike(s,owner,o,h.damage,{kind:'skill',stun:.12,knock:.22,dir:norm(o.x-owner.x,o.y-owner.y)});
    if(hit&&!guarded){o.netCold=Math.min(2,(o.netCold||0)+1);o.netColdTime=4;if(o.netCold===2){o.slow=Math.max(o.slow,.65);o.netCold=0;o.netColdTime=0;}}
   }
  }
  if(h.kind==='bloomLanceTell'){
   if(owner.stun>0||owner.state!=='skill'||owner.bloomCast!==h.cast){h.t=0;continue;}
   h.arm=Math.max(0,h.arm-dt);
   if(h.arm<=0&&!h.triggered){h.triggered=true;shoot(s,owner,{x:h.x+h.dx*.6,y:h.y+h.dy*.6,dx:h.dx,dy:h.dy,speed:14,life:.46,damage:h.damage,pierce:1,kind:'lance',law:'blastlance',bloomTip:true,tipDamage:h.tipDamage,startX:h.x,startY:h.y});event(s,'bloomLaunch');}
  }
  if(h.kind==='bloomEmber'){
   h.arm=Math.max(0,h.arm-dt);if(h.arm<=0&&!h.triggered){h.triggered=true;fx(s,'boom',h.x,h.y,{r:h.r,ink:h.ink,life:.25,max:.25});
    if(dist(h,o)<h.r)strike(s,owner,o,h.damage,{kind:'skill',stun:.15,knock:.4,dir:norm(o.x-h.x,o.y-h.y)});}
  }
  if(h.follow){h.x=owner.x;h.y=owner.y;}
  if(h.kind==='heartWell'){h.arm=Math.max(0,h.arm-dt);if(h.arm<=0&&dist(h,o)<h.r){if(!h.triggered){h.triggered=true;strike(s,owner,o,h.damage,{kind:'skill',stun:.12,knock:0});}
    if(o.inv<=0){const v=norm(h.x-o.x,h.y-o.y),force=h.pull*(o.blocking?.25:1);o.x+=v.x*force*dt;o.y+=v.y*force*dt;clampArena(o);}}}
  if(['reedTell','shardMark','cinderPatch','pebbleOrbit','echoStrike','pulseRing'].includes(h.kind)){h.arm=Math.max(0,h.arm-dt);
   if((h.kind==='reedTell'||h.kind==='shardMark')&&h.arm<=0&&!h.triggered){h.triggered=true;
    if(owner.stun<=0&&owner.state==='skill'&&owner.reedCast===h.cast){fx(s,'swing',h.x,h.y,{char:owner.char,ink:h.ink,angle:Math.atan2(h.dy,h.dx),r:Math.hypot(h.endX-h.x,h.endY-h.y),life:.2,max:.2});
     if(lineContact(h,o)){const front=o.blocking&&facingHit(o,owner),hit=strike(s,owner,o,h.damage,{kind:'skill',stun:.22,knock:.65,dir:{x:h.dx,y:h.dy}});
      if(h.kind==='shardMark'&&hit&&!front&&o.shardSlowCd<=0){o.shardStacks=Math.min(3,(o.shardStacks||0)+h.stackGain);o.shardTime=5;if(o.shardStacks===3){o.slow=Math.max(o.slow,.85);o.shardSlowCd=2.5;o.shardStacks=0;o.shardTime=0;}}}}
   }
   if(h.kind==='cinderPatch'&&h.arm<=0&&!h.triggered&&dist(h,o)<h.r+.2){h.triggered=true;strike(s,owner,o,h.damage,{kind:'skill',stun:.12,knock:.25,dir:norm(o.x-h.x,o.y-h.y)});fx(s,'boom',h.x,h.y,{ink:h.ink,r:h.r,life:.2,max:.2});}
   if(h.kind==='pebbleOrbit'){h.gap=Math.max(0,h.gap-dt);if(h.arm<=0)h.angle+=dt*3.5;h.rockX=h.x+Math.cos(h.angle)*h.orbitR;h.rockY=h.y+Math.sin(h.angle)*h.orbitR;
    if(h.arm<=0&&h.hits<h.maxHits&&h.gap<=0&&Math.hypot(o.x-h.rockX,o.y-h.rockY)<h.contactR+.35){h.hits++;h.gap=.65;strike(s,owner,o,h.damage,{kind:'skill',stun:.25,knock:1.15,dir:norm(o.x-h.x,o.y-h.y)});}}
   if(h.kind==='echoStrike'&&h.arm<=0&&!h.triggered){h.triggered=true;fx(s,'swing',h.x,h.y,{char:'echo',ink:h.ink,r:h.r,angle:Math.atan2(h.y-h.fromY,h.x-h.fromX),life:.25,max:.25});if(dist(h,o)<h.r+.25)strike(s,owner,o,h.damage,{kind:'skill',stun:.2,knock:.6,dir:norm(o.x-h.fromX,o.y-h.fromY)});}
   if(h.kind==='pulseRing'&&h.arm<=0){h.prevR=h.r;h.r=Math.min(h.maxR,h.r+h.maxR/.72*dt);const d=dist(h,o);
    if(!h.hitDone&&d>=h.prevR-.45&&d<=h.r+.45){h.hitDone=true;strike(s,owner,o,h.damage,{kind:'skill',stun:.18,knock:2.2,dir:norm(o.x-h.x,o.y-h.y)});}}
  }
  if(h.kind==='rushTell'&&h.t<=0&&owner.stun<=0&&owner.state==='skill'&&!owner.hitDone){owner.state='dash';owner.t=h.ult?.49:.37;owner.dx=h.dx;owner.dy=h.dy;owner.dashHits=0;owner.hitLimit=2;owner.dashDamage=h.ult?18:14;owner.hitGap=0;owner.inv=Math.max(owner.inv,.12);fx(s,'swing',owner.x,owner.y,{char:'comet',angle:Math.atan2(h.dy,h.dx),r:3,ink:h.ink});}
  if(h.kind==='bramble'||h.kind==='frostBloom'){h.arm=Math.max(0,h.arm-dt);
   if(h.arm<=0&&h.kind==='bramble'&&!h.triggered&&dist(h,o)<h.r&&o.inv<=0){h.triggered=true;const hit=strike(s,owner,o,h.damage,{kind:'skill',stun:.25,knock:.1,dir:norm(o.x-h.x,o.y-h.y)});if(hit){o.slow=Math.max(o.slow,.75);fx(s,'pull',o.x,o.y,{ink:h.ink,fromX:h.x,fromY:h.y});}}
   if(h.arm<=0&&h.kind==='frostBloom'&&dist(h,o)<h.r&&o.inv<=0)o.slow=Math.max(o.slow,.16);
   if(h.kind==='frostBloom'&&h.t<=0){fx(s,'boom',h.x,h.y,{r:h.r,ink:h.ink,life:.35,max:.35});if(dist(h,o)<h.r)strike(s,owner,o,h.damage,{kind:'skill',stun:.28,knock:.6,dir:norm(o.x-h.x,o.y-h.y)});}
  }
  if(h.kind==='well'&&dist(h,o)<h.r){o.slow=.3;}
  if(h.kind==='ring'){h.tick-=dt;if(h.tick<=0&&dist(h,o)<h.r+.3&&o.inv<=0){h.tick=.45;strike(s,owner,o,h.damage,{kind:'skill',stun:.15,knock:.5});}}
  if(h.kind==='blizzard'){if(dist(h,o)<h.r){o.slow=Math.max(o.slow,.3);h.tick-=dt;if(h.tick<=0){h.tick=.5;strike(s,owner,o,3,{kind:'skill',unblockable:true,stun:.08,knock:0});}}if(h.t<=dt&&dist(h,o)<h.r&&o.inv<=0){o.state='jailed';o.t=.8;o.stun=.8;o.blocking=false;fx(s,'jail',o.x,o.y,{ink:'#8ce9ff',life:1.1,max:1.1});}}
  if(h.kind==='strike'){if(h.aim&&h.t>.25){h.x+=(o.x-h.x)*Math.min(1,dt*3);h.y+=(o.y-h.y)*Math.min(1,dt*3);}if(h.t<=0){fx(s,'bolt',h.x,h.y,{ink:'#ffdd78',fromX:h.x,fromY:h.y-6,life:.3,max:.3});if(dist(h,o)<h.r&&o.inv<=0)strike(s,owner,o,7,{kind:'skill',stun:.3,knock:.4,breaker:1.2});event(s,'hit');}}
  if(h.kind==='hole'){if(dist(h,o)<h.r&&o.inv<=0){const v=norm(h.x-o.x,h.y-o.y);o.x+=v.x*2.6*dt;o.y+=v.y*2.6*dt;clampArena(o);h.tick-=dt;if(h.tick<=0){h.tick=.4;strike(s,owner,o,5,{kind:'skill',unblockable:true,stun:.2,knock:0});}}}
  if(h.kind==='mine'&&h.t<=0){fx(s,'boom',h.x,h.y,{r:h.r,ink:'#ffaa65',life:.4,max:.4});if(dist(h,o)<h.r)strike(s,owner,o,20,{kind:'skill',breaker:1.5,stun:.5,knock:1.6,dir:norm(o.x-h.x,o.y-h.y)});event(s,'heavyHit');}
 }
 s.hazards=s.hazards.filter(h=>h.t>0);
 if(s.phase==='fight'&&s.roundTime<=0){const ra=a.hp/a.maxHp,rb=b.hp/b.maxHp;endRound(s,ra>=rb?0:1,'시간 종료 · 체력이 더 많아요');}
}
// AI: 사거리를 재며 다가가고, 상대가 휘두르면 (반응 늦음·확률로) 막거나 반격 막기, 오래 막고 있으면 강공격·잡기로 부순다.
export const DUEL_AI=Object.freeze({easy:{react:.32,block:.35,parry:.05,heavyRead:.2,aggro:.5,link:.1},normal:{react:.2,block:.6,parry:.18,heavyRead:.5,aggro:.75,link:.3},hard:{react:.12,block:.8,parry:.38,heavyRead:.75,aggro:.9,link:.55}});
export function duelAi(s,team,dt){
 const f=s.fighters[team],o=s.fighters[1-team],c=DUEL_CHARACTERS[f.char],cfg=DUEL_AI[s.difficulty]||DUEL_AI.normal,ai=s.ai[team],d=dist(f,o),v=norm(o.x-f.x,o.y-f.y),input={aimX:v.x,aimY:v.y};
 if(s.boss&&team===1){f.bossPhase=f.hp<f.maxHp*.5?2:1;f.bossRecovery=s.time>=f.bossActiveUntil?Math.max(0,f.bossNextAt-s.time):0;
  if(f.stun<=0&&s.time>=f.bossNextAt&&!s.hazards.some(h=>h.owner===team)){input.bossAttack=['well','orbit','ring'][f.bossPatternIndex];return input;}
  // Recovery is a genuine stationary punish window. During an active pattern the heart can still be fought normally.
  if(s.time>=f.bossWindupUntil&&s.time<f.bossActiveUntil&&f.stun<=0&&!(f.state==='skill'&&f.t>0)){
   if((o.state==='attack'||o.state==='heavy')&&d<3){ai.bossSeen=(ai.bossSeen||0)+dt;if(ai.bossSeen>.15&&rnd(s)<dt*5)ai.bossGuardUntil=s.time+.3;}else ai.bossSeen=0;
   if(s.time<(ai.bossGuardUntil||0))input.block=true;else if(d>c.reach*.85+.3){input.x=v.x;input.y=v.y;}else if(rnd(s)<dt*9)input.attack=true;
  }
  return input;}
 const threat=(o.state==='attack'&&o.t>.08)||(o.state==='heavy'&&o.t>.15)||(o.state==='dash')||s.shots.some(q=>q.owner!==team&&Math.hypot(q.x-f.x,q.y-f.y)<3.5);
 // The short relay fighter closes after a visible missed swing rather than
 // casting empty fields forever at midrange. This uses the same dodge action
 // and cooldown as the player; it never reads a future attack or gains invulnerability.
 if(f.char==='chainburst'&&o.state==='attack'&&o.hitDone&&d>c.reach+.25&&d<3.8){ai.punishSeen=(ai.punishSeen||0)+dt;if(ai.punishSeen>cfg.react*.7&&f.dodgeCd<=0&&f.stun<=0){input.x=v.x+v.y*.5;input.y=v.y-v.x*.5;input.dodge=true;ai.guarding=false;return input;}}else ai.punishSeen=0;
 // 방금 맞았으면(1.5초) 더 빨리·자주 막는다. 막아서 상대가 튕기면 바로 반격.
 if(f.hp<(ai.hp??f.hp))ai.hurtAt=s.time;ai.hp=f.hp;const wary=s.time-(ai.hurtAt??-9)<1.5,react=wary?cfg.react*.55:cfg.react,block=wary?Math.min(.95,cfg.block+.3):cfg.block;
 if(o.state==='attack'&&o.cancelAt<0&&d<c.reach+.6&&f.stun<=0){ai.guarding=false;input.attack=true;return input;}
 if(threat&&d<(DUEL_CHARACTERS[o.char].reach+2.2)){ai.seen=(ai.seen||0)+dt;
  if(ai.seen>=react){if(o.state==='heavy'&&rnd(s)<cfg.heavyRead*dt*8){input.dodge=true;input.x=-v.y;input.y=v.x;ai.seen=0;return input;}
   if(!ai.guarding&&rnd(s)<block){ai.guarding=true;ai.guardFor=.35+rnd(s)*.3;ai.parryTry=rnd(s)<cfg.parry;}}}
 else ai.seen=0;
 if(ai.guarding){ai.guardFor-=dt;input.block=!(ai.parryTry&&f.blocking&&s.time-f.blockSince>.2);if(ai.guardFor<=0)ai.guarding=false;if(f.stun<=0)return input;}
 if(f.stun>0)return input;
 if(DUEL_BATCH03[f.char]&&batch03Ai(s,f,o,input,dt))return input;
 if(f.char==='chainburst'&&f.cd[1]<=0&&d<3.2&&o.state==='heavy'&&ai.seen>=react){input.skill2=true;return input;}
 if(f.char==='blastlance'&&f.cd[1]<=0&&d<2.6&&threat&&ai.seen>=react){input.skill2=true;return input;}
 if(f.char==='frostnet'&&f.cd[1]<=0&&s.hazards.some(h=>h.owner===team&&h.kind==='frostThread'&&h.triggered&&!h.hitDone&&lineContact({...h,r:.55},o))){input.skill2=true;return input;}
 if(f.state==='skill'&&['gravitymirror','chainburst'].includes(f.char)){input.x=d<3.8?-v.x:-v.y;input.y=d<3.8?-v.y:v.x;return input;}
 if(f.char==='gravitymirror'){
  const h=s.hazards.find(h=>h.owner===team&&h.kind==='mirrorAnchor'&&h.t>0);
  if(h){const n=norm(f.x-h.x,f.y-h.y);if(lineContact({...h,endX:f.x,endY:f.y,dx:n.x,dy:n.y,r:.45},o)&&rnd(s)<dt*5){input.skill1=true;return input;}}
 }
 // New fusion readers keep the same reaction delay and player movement limits.
 const authoredDanger=s.hazards.find(h=>h.owner!==team&&h.t>0&&(h.kind==='mirrorAnchor'&&dist(f,h)<h.r+.35||h.kind==='mirrorFold'&&!h.triggered&&lineContact({...h,r:h.r+.3},f)||h.kind==='emberRelay'&&!h.triggered&&(lineContact({...h,r:h.r+.3},f)||Math.hypot(f.x-h.endX,f.y-h.endY)<h.burstR+.4)));
 if(authoredDanger){ai.fusionSeen=(ai.fusionSeen||0)+dt;if(ai.fusionSeen>cfg.react){const h=authoredDanger,v=h.kind==='mirrorAnchor'?norm(f.x-h.x,f.y-h.y):{x:-h.dy,y:h.dx};input.x=v.x;input.y=v.y;if(f.dodgeCd<=0&&h.arm<.2)input.dodge=true;return input;}}else ai.fusionSeen=0;
 if(f.char==='gravitymirror'&&f.cd[0]<=0&&d>2.5&&d<6.5&&!threat&&rnd(s)<dt*2.5){const p=DUEL_PILLARS.find(p=>dist(p,o)<3.2);if(p){const v=norm(p.x-f.x,p.y-f.y);input.aimX=v.x;input.aimY=v.y;}input.skill1=true;return input;}
 if(f.char==='chainburst'&&f.cd[0]<=0&&d<6&&!threat){const mark=s.hazards.some(h=>h.owner===team&&h.kind==='emberMark'&&h.t>0);if((mark&&d>1.8||!mark&&d>2.5&&d<4.15)&&rnd(s)<dt*3.5){input.skill1=true;return input;}}
 if(f.meter>=100&&['gravitymirror','chainburst'].includes(f.char)&&d>3.2&&d<6.5&&!threat){input.ult=true;return input;}
 // Read a placed threat after a real reaction interval; move toward its shortest exit, never teleport.
 const danger=s.hazards.find(h=>h.owner!==team&&!h.hitDone&&((!h.triggered||h.kind==='heartWell')&&['bramble','frostBloom','rushTell','cinderPatch','echoStrike','heartWell','bloomEmber'].includes(h.kind)&&dist(f,h)<h.r+.8||['reedTell','shardMark','bloomLanceTell'].includes(h.kind)&&!h.triggered&&lineContact({...h,r:h.r+.6},f)||h.kind==='frostThread'&&!h.hitDone&&lineContact({...h,r:h.r+.25},f)||h.kind==='pulseRing'&&dist(f,h)<h.maxR+.5&&dist(f,h)>h.r-.5||h.kind==='pebbleOrbit'&&h.hits<h.maxHits&&Math.abs(dist(f,h)-h.orbitR)<1||h.kind==='ring'&&f.inv<=0&&(h.tick||0)<.12&&dist(f,h)<h.r+.3));
 if(danger){ai.areaSeen=(ai.areaSeen||0)+dt;if(ai.areaSeen>cfg.react){const away=norm(f.x-danger.x,f.y-danger.y);input.x=away.x;input.y=away.y;if(['rushTell','reedTell','shardMark','bloomLanceTell','frostThread'].includes(danger.kind)){input.x=-danger.dy;input.y=danger.dx;}if(f.dodgeCd<=0&&(danger.arm<.2||danger.kind==='pulseRing'&&dist(f,danger)<danger.r+1.1||danger.kind==='ring'&&dist(f,danger)<danger.r+.1))input.dodge=true;return input;}}else ai.areaSeen=0;
 // 평타가 맞았으면 가끔 연계 강공격으로 잇는다.
 if(f.state==='attack'&&f.hitDone&&f.chainTime>.6&&ai.rolled!==f.combo){ai.rolled=f.combo;if(rnd(s)<cfg.link){input.heavy=true;return input;}}
 // 오래 막는 상대에게는 강공격·잡기.
 if(o.blocking&&s.time-o.blockSince>.45&&d<c.heavy.reach+.4&&rnd(s)<cfg.aggro*dt*6){if(f.char==='gravity'&&f.cd[0]<=0){input.skill1=true;return input;}input.heavy=true;return input;}
 const ultRange={frostnet:5,blastlance:7,pierce:9,chain:12,recall:7,split:4.5,frost:4.2,orbit:2.6,thorn:6,gale:6,bastion:2.7,comet:6,lotus:6,prism:6,reed:7.5,cinder:3.3,pebble:3.1,echo:7,pulse:5,shard:7,heart:6}[f.char]||4;if(f.meter>=100&&d<ultRange&&!['gravitymirror','chainburst','returnblade','frostguard'].includes(f.char)){input.ult=true;return input;}
 // 기술2는 방어+회피 또는 방어 중 기존 +로 접근한다. 위 조건은 같은 시전·쿨다운을 사용한다.
 if(f.cd[0]<=0&&(f.char==='frostnet'&&d>1.5&&d<4.8&&!threat||f.char==='blastlance'&&d>3&&d<6.5&&!threat||f.char==='pierce'&&d>2.5&&d<5.5||f.char==='burst'&&d<2||f.char==='gravity'&&d<5&&d>1.6||f.char==='reflect'&&threat||f.char==='split'&&d<3.6||f.char==='chain'&&d<5.5&&d>1.4||f.char==='recall'&&d>2&&d<6.5||f.char==='orbit'&&d<2.4||f.char==='frost'&&d<3.6||f.char==='thorn'&&d<4.3||f.char==='gale'&&d>2.8&&d<5||f.char==='bastion'&&threat&&d<3||f.char==='comet'&&d>3&&d<5.5&&!threat||f.char==='lotus'&&d>1.7&&d<4||f.char==='prism'&&d>1.5&&d<6||f.char==='reed'&&d>2.8&&d<6&&!threat||f.char==='cinder'&&d<1.8||f.char==='pebble'&&d>1.2&&d<3||f.char==='echo'&&d<4.5&&(threat||o.blocking)||f.char==='pulse'&&d>1.6&&d<4||f.char==='shard'&&d>3.2&&d<5.5&&!threat||f.char==='heart'&&d>2&&d<5.5&&!threat)&&rnd(s)<dt*2.5){input.skill1=true;return input;}
 // Weavers set lanes from midrange, then close for melee in recovery. Staying
 // at ordinary melee spacing cancels their own windup against every rushdown.
 if(f.char==='frostnet'&&f.cd[0]<.65){
  if(d<2.6){input.x=-v.x;input.y=-v.y;}else if(d>3.6){input.x=v.x;input.y=v.y;}else{input.x=-v.y*.45;input.y=v.x*.45;}
  return input;
 }
 if(f.char==='gravitymirror'&&f.cd[0]<.6){
  // Place interruptible attacks from outside ordinary melee, then enter to
  // punish during cooldown. Point-blank spell spam is not a fighting style.
  if(d<3.2){input.x=-v.x;input.y=-v.y;}else if(d>4.6){input.x=v.x;input.y=v.y;}else{input.x=-v.y*.5;input.y=v.x*.5;}
  return input;
 }
 const want=c.reach*.85;
 if(d>want+.3){input.x=v.x;input.y=v.y;}else if(d<want-.9&&f.char==='pierce'){input.x=-v.x;input.y=-v.y;}
 else{input.x=-v.y*Math.sin(s.time*1.3);input.y=v.x*Math.sin(s.time*1.3);if(rnd(s)<cfg.aggro*dt*5)input.attack=true;}
 return input;
}
