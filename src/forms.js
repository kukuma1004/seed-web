import {FIRST_FUSIONS,FIRST_FUSION_BY_ID,SECOND_FUSIONS,secondFusionOf as catalogSecondOf} from './combo-catalog.js';
import {HIDDEN_LAWS} from './laws.js';

// Final forms: two held laws fuse into one attack with its own shape, range and weakness.
// Hand-authored fusions keep bespoke attacks. Unreleased pairs stay in the
// generated catalogue as design references, but never enter a run automatically.
const form=(id,requires,name,desc,strength,weakness,passive=false)=>Object.freeze({id,name,requires:Object.freeze(requires),pair:'',desc,strength,weakness,passive});
const LAW_KO={reflect:'반사',split:'분열',chain:'연쇄',orbit:'공전',pierce:'관통',burst:'폭발',recall:'귀환',gravity:'중력',frost:'빙결',portal:'차원'};
const withPair=f=>Object.freeze({...f,pair:f.requires.map(id=>LAW_KO[id]).join(' + ')});

export const CURATED_FORMS=Object.freeze(Object.fromEntries([
 form('collapse',['gravity','burst'],'붕괴의 씨앗','느린 씨앗탄이 적을 모은 뒤 한꺼번에 붕괴합니다.','밀집한 적을 모아 한 번에 처치','발사가 느려 흩어진 적과 빠른 접근에 취약'),
 form('frostguard',['orbit','frost'],'서리 위성','서리 위성이 적을 베어 얼리고 날아오는 탄환을 부수며(문지기 탄 제외), 주기적으로 주변을 얼리는 냉기를 터뜨립니다.','근접 제압과 탄막 방어를 함께','사거리가 짧아 멀리 있는 적은 직접 쫓아가야 함',true),
 form('returnblade',['recall','pierce'],'귀환의 칼날','큰 칼날이 적의 열을 관통하고 씨앗에게 돌아옵니다.','움직임으로 귀환 경로를 바꾸어 왕복 타격','적을 경로에 모으지 못하면 화력 손실'),
 form('prism',['reflect','split'],'프리즘 가시','벽에 부딪힐 때마다 두 갈래로 갈라지는 수정 가시를 쏩니다.','벽과 엄폐물이 많은 방에서 가시가 불어남','트인 공간과 코앞의 적에게는 갈라질 벽이 없음'),
 form('thunderlance',['pierce','chain'],'천둥 창','긴 번개 창이 한 줄의 적을 꿰뚫고, 꿰뚫린 적에게서 번개가 퍼집니다.','줄지어 오는 적과 먼 거리','발사가 느리고 엄폐물에 막히며 흩어진 적에 약함'),
 form('frostbloom',['burst','frost'],'서리 꽃봉오리','목표 지점에 봉오리를 던져 얼린 뒤, 잠시 후 얼음째 부숩니다.','몰려오는 무리를 멈추고 한꺼번에 부숨','떨어지기까지 지연 · 빠른 적은 빠져나감'),
 form('stormcrown',['orbit','chain'],'폭풍 왕관','주위를 도는 번개 구슬이 가까운 적에게 스스로 번개를 떨어뜨립니다.','움직이며 주변을 자동으로 정리','사거리가 짧아 멀리 있는 사수·포탑을 못 맞힘',true),
 form('tidepull',['gravity','recall'],'귀환 해일','해일핵이 전장을 왕복하며 적을 쓸어 모아 씨앗의 안전거리 앞까지 데려옵니다.','먼 무리를 왕복 경로로 긁어 한곳에 배달','좌우로 흩어진 적과 문지기·포탑은 끌 수 없음'),
 form('seedstorm',['split','burst'],'씨앗 폭풍','짧은 거리에 터지는 씨앗을 부채꼴로 흩뿌립니다.','가까이 붙은 무리를 순식간에 정리','사거리가 짧아 멀리서 쏘는 적에게 약함'),
 form('mirrorguard',['orbit','reflect'],'거울 수호','주위를 도는 거울이 날아오는 적 탄환을 되받아 가장 가까운 적에게 돌려보냅니다(문지기 탄 제외).','사수·포탑의 탄막을 공격으로 바꿈','탄을 쏘지 않는 근접 무리에게는 약함',true),
 form('gravitymirror',['reflect','gravity'],'중력 거울','거울핵이 벽을 튕길 때마다 짧은 중력장을 남겨 적을 끌어모으고, 마지막 충돌에서 압축해 터뜨립니다.','벽을 이용해 적의 위치를 바꾸고 마지막 폭발까지 연결','트인 공간에서는 튕김과 끌림을 충분히 만들기 어려움'),
 form('chainburst',['chain','burst'],'연쇄 폭발','번개가 적 사이를 차례로 건너간 뒤 마지막 표적에서 폭발합니다.','흩어진 무리를 이어 마지막 밀집 지점을 폭파','적이 한두 마리뿐이면 연쇄 거리와 마무리 폭발을 낭비'),
 form('blastlance',['pierce','burst'],'폭발 창','긴 창이 적을 관통할수록 폭발력을 모으고, 사거리 끝에서 모은 힘을 터뜨립니다.','일렬로 선 적을 꿰뚫을수록 마지막 폭발이 강해짐','옆으로 흩어진 적과 코앞의 적에게는 충전할 거리가 부족'),
 form('frostkaleidoscope',['reflect','frost'],'서리 만화경','얼음 거울탄이 벽을 튕기며 냉기를 모읍니다. 두 번 이상 튕긴 탄이 적을 맞히면 얼음 파편으로 크게 깨집니다.','벽 각도를 읽어 강한 빙결 파쇄를 준비','트인 공간에서는 파쇄 조건을 만들 수 없음'),
 form('lightningpetal',['split','chain'],'번개 꽃잎','첫 적에게 닿은 꽃봉오리가 여러 전기 꽃잎으로 갈라지고, 꽃잎마다 가까운 다음 적에게 번개를 잇습니다.','적이 여러 방향에 퍼져 있을수록 꽃잎과 번개가 넓게 번짐','적이 한두 마리면 꽃잎과 후속 번개가 사라짐'),
 form('returnflare',['burst','recall'],'귀환 불씨','목표에서 한 번 터진 불씨핵이 씨앗을 향해 돌아오며 적을 긁고, 씨앗에 닿을 때 다시 폭발합니다.','이동으로 귀환 경로와 마지막 폭발 위치를 바꿈','제자리에 머물면 두 폭발과 귀환 경로가 한곳에 겹침'),
 form('comethalo',['orbit','burst'],'혜성 화관','씨앗이 움직인 거리로 화관을 충전하고, 충전된 꽃봉오리가 가까운 적에게 폭발 혜성을 쏩니다.','계속 이동하며 여러 폭발 경로를 이어 감','멈춰 있으면 충전이 빠져 혜성이 나오지 않음',true),
 form('stormanchor',['chain','gravity'],'뇌우 닻','번개가 세 적 이상을 이으면 그 중심에 중력 닻을 박아 적을 끌어당긴 뒤 터뜨립니다.','여러 방향의 적을 한 점으로 모아 후속 공격 준비','적이 한두 마리면 닻이 생기지 않아 연쇄 피해만 남음'),
 form('returningpetals',['split','recall'],'회귀 꽃비','먼 곳에서 갈라진 꽃잎이 현재 씨앗 위치를 향해 휘어 돌아옵니다.','이동으로 여러 귀환 경로를 그려 넓게 훑음','제자리에 있으면 꽃잎 경로가 겹쳐 많은 꽃잎을 낭비'),
 // 2026-09-21 1묶음(COMBO_1090_MASTER_PLAN.md §12): 역할이 서로 다른 다섯 조합.
 // 이름은 도감 카탈로그의 이름을 그대로 쓰고, 같은 이름의 쌍둥이 각성과는 ID로 구분한다.
 form('icicle',['pierce','frost'],'고드름 창','창이 적을 얼리고, 자기가 얼린 적을 다시 꿰뚫으면 얼음째 깨뜨립니다.','혼자 버티는 단단한 적을 같은 자리에서 두 번 노림','여럿에게 나눠 쏘면 깨뜨릴 표식이 남지 않고 관통 수도 적음'),
 form('halobloom',['orbit','split'],'꽃잎 후광','씨앗을 도는 꽃잎 고리가 적을 베고, 여덟 번 베면 꽃잎이 모두 바깥으로 만개합니다.','사방에서 붙는 무리를 베다가 한꺼번에 흩뿌림','만개한 뒤 고리가 잠시 비고 멀리 있는 적에게는 닿지 않음',true),
 form('frostnet',['chain','frost'],'얼어붙은 그물','번개가 세 적 이상을 이으면 그 선 위에 서리 줄이 남아 지나는 적을 얼립니다.','길목을 얼려 무리의 발을 묶음','피해가 가장 낮고 문지기·보스는 줄 위에서도 멈추지 않음'),
 form('rewindbolt',['chain','recall'],'되감는 번개','번개가 지나간 길을 기억했다가, 씨앗이 충분히 움직이면 그 길을 되감아 한 번 더 흐릅니다.','움직이며 같은 무리를 두 번 훑음','제자리에 서 있으면 기억한 길이 그대로 사라짐'),
 form('refractlance',['pierce','reflect'],'굴절 창','창이 벽에 닿으면 벽을 타고 옆으로 꺾이고, 꺾인 창은 더 깊이 박힙니다.','적을 벽이나 엄폐물 쪽으로 몰면 한 발로 벽에 붙은 줄을 통째로 훑음','벽에서 떨어진 적에게는 꺾인 창이 지나가지 않아 평범한 창 한 자루'),
 // 2026-09-21 2묶음. 그림(카드·탄환)이 나올 때까지 선택지에는 나오지 않는다(COMBO_BATCHES).
 form('thundermirror',['reflect','chain'],'천둥 거울','번개가 두 적 사이를 거울처럼 오가며 여러 번 내리칩니다. 혼자 남은 적에게는 벽에 반사된 번개가 한 번 더 떨어집니다.','문지기와 호위병처럼 둘이 붙어 있는 상대를 번갈아 두들김','무리 전체로는 퍼지지 않고 두 적만 칩니다'),
 form('sunmirror',['reflect','burst'],'태양 거울','천천히 나아가는 거울핵이 부딪히는 적 탄환을 빨아들여 빛을 모으고, 모은 만큼 크게 터집니다.','사수·포탑이 탄을 뿌리는 방에서 탄막을 폭발로 바꿈','탄을 쏘지 않는 적 앞에서는 작은 폭발에 그침'),
 form('pierceshower',['pierce','split'],'꿰뚫는 꽃비','창이 적을 꿰뚫을 때마다 그 자리에서 꽃잎 두 장이 양옆으로 튀어 나갑니다.','줄지어 오는 무리를 창과 꽃잎으로 한 번에 훑음','혼자 있는 적에게는 꽃잎이 헛나감'),
 form('ebbring',['orbit','recall'],'밀물 고리','고리가 씨앗을 바로 따라오지 않고 지나온 자리에 남았다가 밀물처럼 따라붙으며 벱니다.','계속 움직이면 뒤쫓아 오는 적을 고리가 대신 베어 줌','멈춰 서면 고리가 작게 오므라들어 약해짐',true),
 form('pullgarden',['gravity','split'],'끌림 꽃밭','씨앗이 땅에서 갈라져 작은 끌림 꽃밭 여러 개를 만들고, 한 꽃밭에 적이 둘 이상 모이면 꽃이 피며 터집니다.','흩어진 무리를 여러 곳에 조금씩 모아 한꺼번에 터뜨림','혼자 있는 적 곁에서는 꽃이 피지 않음'),
 // 2026-09-21 3묶음(보류). 남은 1차 융합 여섯으로 차원 법칙을 뺀 36칸이 모두 채워진다.
 form('spearring',['orbit','pierce'],'창날 고리','씨앗을 도는 창 가운데 하나가 틈틈이 고리에서 떨어져 나가 가장 가까운 적의 줄을 꿰뚫고, 잠시 뒤 다시 자랍니다.','곁을 지키면서 방패병과 줄지어 선 적을 꿰뚫음','창이 빠진 동안 고리가 비고, 창을 쏘는 간격이 김',true),
 form('accretiondisk',['orbit','gravity'],'강착 원반','씨앗을 도는 소용돌이가 적 탄환과 베어 낸 부스러기를 끌어모으고, 가득 차면 가까운 적들에게 한꺼번에 내던집니다.','탄막과 근접 무리를 모두 탄으로 바꿔 되돌려 줌','가득 찰 때까지는 근접 베기뿐이라 멀리 있는 적에게 약함',true),
 form('rimeback',['frost','recall'],'서리 되감기','서리잎이 나가며 적을 얼리고, 돌아오는 길에 얼어 있는 적을 깨뜨립니다.','움직여서 돌아오는 길을 얼린 적 위로 겹치면 두 번 벰','돌아오는 길이 얼린 적을 비껴가면 깨뜨리지 못함'),
 form('coldwell',['frost','gravity'],'얼어붙은 블랙홀','던진 자리에 차가운 소용돌이가 생겨 적을 끌어당기고, 오래 붙잡힌 적을 얼린 뒤 얼린 수만큼 크게 부서집니다.','무리를 한곳에 묶어 두었다가 한꺼번에 깨뜨림','느리게 쌓여 빠른 적과 문지기·보스는 붙잡지 못함'),
 form('rimepetal',['frost','split'],'서리 꽃잎','봉오리가 적에게 닿으면 서리 꽃잎으로 갈라지고, 꽃잎을 세 장 이상 맞은 적은 서리꽃이 피며 크게 얼어붙습니다.','모여 있는 무리를 꽃잎으로 덮어 한꺼번에 얼림','흩어진 적은 꽃잎이 겹치지 않아 서리꽃이 잘 피지 않음'),
 form('echolane',['reflect','recall'],'메아리 회랑','탄이 벽에 닿으면 씨앗에게 되돌아오고, 씨앗을 스치면 다시 벽으로 튕겨 나가며 오갈 때마다 세집니다.','벽을 등지고 싸우면 짧은 길을 여러 번 왕복함','트인 곳에서는 벽까지 멀어 한두 번 오가고 끝남'),
 form('gravitystake',['pierce','gravity'],'중력 말뚝','좁은 선에 적 하나만 걸리면 말뚝이 박혀 잠시 뒤 그 대상 안으로 강하게 내파합니다.','혼자 남은 문지기·보스에게 집중 피해','주변에 다른 적이 있거나 둘 이상을 꿰뚫으면 내파가 생기지 않음')
].map(f=>[f.id,withPair(f)])));

const pairKey=requires=>[...requires].sort().join('+');
const CURATED_PAIRS=new Set(Object.values(CURATED_FORMS).map(f=>pairKey(f.requires)));
const generatedForm=entry=>Object.freeze({
 id:entry.id,name:entry.name,requires:entry.laws,pair:entry.pair,
 desc:`${entry.mechanic}. 두 법칙의 성질이 한 발 안에서 차례로 발동합니다.`,
 strength:`${LAW_KO[entry.laws[0]]}의 진입과 ${LAW_KO[entry.laws[1]]}의 후속 효과`,
 weakness:'한 발에 모든 효과가 몰려 빗나가면 다음 발까지 빈틈이 생김',
 passive:false,generated:true,visual:entry.visual
});
export const GENERATED_FORMS=Object.freeze(Object.fromEntries(FIRST_FUSIONS.filter(entry=>!CURATED_PAIRS.has(pairKey(entry.laws))).map(entry=>[entry.id,generatedForm(entry)])));
// 2026-09-18: 자동 조합은 계속 숨기고, 검증한 손제작 조합만 FORMS에 넣는다.
// 2026-09-21: 조합 묶음은 따로 관리한다. 카드·탄환 그림이 나오기 전까지 live:false로 두고 선택지에 내지 않는다.
// 코드·수치·검사는 그대로 유지되고, ALL_FORMS에는 남아 있어 이미 얻은 저장과 도감은 깨지지 않는다.
// 공개할 때는 live만 true로 바꾼다. 기록: combo-batches/
export const COMBO_BATCHES=Object.freeze({
 '20260921':Object.freeze({live:false,ids:Object.freeze(['icicle','halobloom','frostnet','rewindbolt','refractlance'])}),
 '20260921-2':Object.freeze({live:false,ids:Object.freeze(['thundermirror','sunmirror','pierceshower','ebbring','pullgarden'])}),
 '20260921-3':Object.freeze({live:false,ids:Object.freeze(['spearring','accretiondisk','rimeback','coldwell','rimepetal','echolane'])})
});
const HELD_BACK=new Set(Object.values(COMBO_BATCHES).filter(batch=>!batch.live).flatMap(batch=>batch.ids));
export const isHeldBack=id=>HELD_BACK.has(id);
export const CANDIDATE_FORMS=Object.freeze(Object.fromEntries(Object.entries(CURATED_FORMS).filter(([id])=>HELD_BACK.has(id))));
export const FORMS=Object.freeze(Object.fromEntries(Object.entries(CURATED_FORMS).filter(([id])=>!HELD_BACK.has(id))));
const RUNTIME_FIRST_BY_PAIR=new Map(Object.values(FORMS).map(f=>[pairKey(f.requires),f.id]));
const secondForm=entry=>{
 const parts=Object.freeze(entry.parts.map(id=>RUNTIME_FIRST_BY_PAIR.get(pairKey(FIRST_FUSION_BY_ID[id].laws))));
 const desc=entry.family==='resonance'?entry.rule:`${FORMS[parts[0]].name}이 표식을 남기면 ${FORMS[parts[1]].name}이 소비해 교차 효과를 냅니다.`;
 return Object.freeze({id:entry.id,name:parts.map(id=>FORMS[id].name).join(' × '),parts,requires:entry.laws,pair:parts.map(id=>FORMS[id].name).join(' + '),
  desc,strength:entry.family==='resonance'?`공유 ${LAW_KO[entry.sharedLaw]} 법칙이 세 번째 적중마다 증폭`:'첫 공격의 표식을 다음 공격이 소비해 교차 폭발',
  weakness:entry.family==='resonance'?'세 번째 적중 전에 빗나가면 공명 주기가 늦어짐':'표식이 남은 적을 후속 탄이 맞혀야 제 화력이 남',
  passive:false,generated:true,second:true,family:entry.family,sharedLaw:entry.sharedLaw,budget:entry.budget,visual:entry.visual});
};
// 2026-09-17: 재융합 990개는 숨긴다(이름·효과·세기를 자동으로 찍어낸 것). 세밀하게 다시 만들 때 되살린다.
// 2026-09-22: 손제작 재융합을 묶음으로 되살린다(COMBO_1090_MASTER_PLAN 6절).
// 주 공격 = 부모 한쪽(main)의 공격을 그대로, 후속 = 다른 부모의 대표 효과가 조건(trigger)을 채울 때 한 번.
// 두 부모의 피해·투사체·범위를 곱하지 않는다. 고정 ID는 조합 목록(combo-catalog)의 재융합 ID를 그대로 써서 저장이 깨지지 않는다.
// follow.effect: blast(폭발) · arc(번개 잇기, finish면 셋 이상 이었을 때 가운데서 터짐) · nova(냉기로 얼림)
// follow.trigger: nth(주 공격 적중 every번째마다) · kill(주 공격으로 쓰러뜨렸을 때) · return(돌아오는 길의 적중 every번째마다)
// follow.damage는 Lv.1 기준이고 진화 레벨마다 주 공격과 같게 25%씩 오른다.
const CATALOG_FIRST_BY_PAIR=new Map(FIRST_FUSIONS.map(f=>[pairKey(f.laws),f.id]));
const curatedSecond=(main,other,name,desc,strength,weakness,follow)=>{
 const a=CURATED_FORMS[main],b=CURATED_FORMS[other],entry=catalogSecondOf(CATALOG_FIRST_BY_PAIR.get(pairKey(a.requires)),CATALOG_FIRST_BY_PAIR.get(pairKey(b.requires)));
 return Object.freeze({id:entry.id,name,parts:Object.freeze([main,other]),main,followParent:other,requires:entry.laws,pair:`${a.name} + ${b.name}`,
  desc,strength,weakness,passive:Boolean(a.passive),second:true,curated:true,family:entry.family,sharedLaw:entry.sharedLaw,budget:entry.budget,visual:entry.visual,follow:Object.freeze({...follow})});
};
const CURATED_SECOND_LIST=[
 // 1묶음(공명형 5, 2026-09-22): 공개 1차 융합끼리, 역할이 겹치지 않게(줄 대상·근접 무리·제어·이동 보상·벽 활용 제어).
 curatedSecond('thunderlance','blastlance','천둥 폭창','번개 창이 한 줄을 꿰뚫고, 꿰뚫은 적 셋째마다 그 자리에서 폭발합니다.','줄지어 오는 적일수록 폭발이 겹쳐 터짐','옆으로 흩어진 적과 엄폐물 뒤에는 약하고 발사가 느림',
  {effect:'blast',trigger:'nth',every:3,cooldown:.6,damage:19,radius:1.5,law:'burst',surgeEvery:2,line:'꿰뚫은 자리 폭발'}),
 curatedSecond('seedstorm','lightningpetal','번개 씨앗비','가까이 흩뿌린 씨앗이 적을 쓰러뜨리면, 그 자리에서 번개가 가까운 두 적에게 튑니다.','붙어 오는 무리를 번개로 연쇄 정리','사거리가 짧고, 쓰러뜨리지 못하는 보스에게는 번개가 튀지 않음',
  {effect:'arc',trigger:'kill',every:1,cooldown:.25,damage:24,jumps:2,range:3.6,decay:.85,law:'chain',line:'쓰러뜨린 자리 번개'}),
 curatedSecond('tidepull','stormanchor','해일 뇌우','해일핵이 적을 쓸어 오고, 네 번 맞힐 때마다 번개가 근처 적 셋을 이어 그 가운데에서 터집니다.','흩어진 적을 모아 한꺼번에 터뜨림','한 적에게 주는 피해가 낮고 문지기·보스는 끌려오지 않음',
  {effect:'arc',trigger:'nth',every:4,cooldown:1.2,damage:6,jumps:3,range:3.4,decay:.9,finish:10,finishRadius:1.5,law:'chain',surgeEvery:2,line:'번개 잇기와 가운데 폭발'}),
 curatedSecond('returnblade','returnflare','불씨 칼날','큰 칼날이 적의 열을 꿰뚫고 돌아오며, 돌아오는 길에 두 번 벨 때마다 불씨가 터집니다.','움직여 돌아오는 길을 무리 위로 끌면 폭발이 이어짐','가만히 서 있으면 돌아오는 길이 짧아 불씨가 적음',
  {effect:'blast',trigger:'return',every:2,cooldown:.3,damage:22,radius:1.2,law:'burst',surgeEvery:1,line:'돌아오는 길의 불씨'}),
 curatedSecond('frostkaleidoscope','frostbloom','서리꽃 만화경','벽에 튕기며 빨라지는 서리 조각이 다섯 번 맞힐 때마다, 맞은 자리에서 서리꽃이 터져 주변을 얼립니다.','벽이 많은 방에서 무리를 느리게 묶음','트인 곳에서는 조각이 덜 튕기고, 얼음은 보스에게 짧게만 듦',
  {effect:'nova',trigger:'nth',every:5,cooldown:.6,damage:20,radius:1.6,slow:1.1,law:'frost',surgeEvery:3,line:'서리꽃 터짐'}),
 // 2묶음(교차형·수렴형 5, 2026-09-22): 네 법칙이 모두 다르다. 첫 조합(주 공격)이 표식·자리·궤적을 만들고 둘째 조합이 그걸 터뜨린다.
 // 역할이 몰리지 않게: 제어 1 · 다수전 1 · 이동 보상 1 · 단일 대상 1 · 모아 터뜨리기 1. 주 공격 무기도 1묶음과 겹치지 않게.
 // (중력 말뚝·프리즘 가시·회귀 꽃비는 시뮬레이션 광역 수치가 너무 낮고, 중력 거울은 궁극기 중 후속이 안 나와 주 공격에서 뺐다.)
 curatedSecond('collapse','frostkaleidoscope','서리 붕괴','붕괴의 씨앗이 두 번 맞힐 때마다 그 자리에 서리가 번져, 남은 적을 잠시 얼립니다.','보스에게 붕괴를 이어 맞히면 냉기 피해가 쌓임','씨앗이 터지기까지 느리고, 얼림은 보스·문지기에게 통하지 않음',
  {effect:'nova',trigger:'nth',every:2,cooldown:1,damage:10,radius:1.8,slow:1,law:'frost',surgeEvery:1,line:'무너진 자리 서리'}),
 curatedSecond('frostbloom','lightningpetal','서리 번개꽃','서리 꽃봉오리가 세 번 맞힐 때마다 그 자리에서 번개 꽃잎이 흩어진 적 셋에게 튑니다.','흩어져 다가오는 무리를 한꺼번에 건드림','한 적에게는 번개가 튈 곳이 없고, 꽃봉오리가 터지기까지 느림',
  {effect:'arc',trigger:'nth',every:3,cooldown:.7,damage:15,jumps:3,range:3.6,decay:.85,law:'chain',surgeEvery:1,line:'터진 자리 번개꽃'}),
 curatedSecond('returnflare','stormcrown','번개 불씨','돌아오는 불씨가 두 번 맞힐 때마다 번개가 가까운 적 둘에게 튑니다.','움직이며 불씨를 돌려받으면 번개가 계속 튐','제자리에 서 있으면 돌아오는 길이 짧아 번개가 드묾',
  {effect:'arc',trigger:'return',every:2,cooldown:.3,damage:26,jumps:2,range:3.2,decay:.85,law:'chain',surgeEvery:1,line:'돌아오는 길 번개'}),
 curatedSecond('blastlance','frostguard','눈꽃 창','폭발 창이 두 번 맞힐 때마다 맞은 자리에 눈꽃이 터져 둘레를 얼립니다.','보스처럼 한 적을 계속 맞힐 때 눈꽃이 자주 터짐','옆으로 흩어진 적에게는 창이 덜 맞고, 얼림은 보스·문지기에게 통하지 않음',
  {effect:'nova',trigger:'nth',every:2,cooldown:.5,damage:12,radius:1.3,slow:.8,law:'frost',surgeEvery:1,line:'맞은 자리 눈꽃'}),
 curatedSecond('stormanchor','comethalo','혜성 닻','뇌우 닻이 적을 끌어 모으고, 네 번 맞힐 때마다 모인 자리에 혜성이 터집니다.','끌어 모은 무리를 한 번에 크게 터뜨림','한 적에게는 느리고, 문지기·보스는 끌려오지 않음',
  {effect:'blast',trigger:'nth',every:4,cooldown:1,damage:21,radius:1.7,law:'burst',surgeEvery:2,line:'모인 자리 혜성'}),
 // 3묶음(공명 1 · 교차 4, 2026-09-23): 아직 주 공격으로 안 쓴 공전·연쇄 무기를 살리고, 주 공격 무기는 전체 묶음에서 최대 두 번까지.
 // 역할: 단일 대상 1 · 다수 제어 1 · 다수 정리 1 · 이동 보상 1 · 벽 활용 1. (공전 무기를 주 공격으로 쓰면 궤도가 돌지 않아 이번엔 뺐다.)
 curatedSecond('returningpetals','chainburst','꽃비 폭죽','오가는 꽃잎이 세 번 벨 때마다 그 자리에서 작은 폭발이 연달아 터집니다.','보스처럼 한 적을 오래 벨 때 폭발이 계속 쌓임','꽃잎이 흩어진 무리 사이로 빠지면 폭발이 드묾',
  {effect:'blast',trigger:'nth',every:3,cooldown:.45,damage:16,radius:1.2,law:'burst',surgeEvery:1,line:'벤 자리 폭죽'}),
 curatedSecond('chainburst','frostbloom','서리 연폭','연쇄 폭발이 네 번 터질 때마다 그 자리에 서리가 번져 무리를 얼립니다.','몰려오는 무리를 터뜨리고 붙잡아 둠','한 적에게는 느리고, 얼림은 보스·문지기에게 통하지 않음',
  {effect:'nova',trigger:'nth',every:4,cooldown:.9,damage:12,radius:1.8,slow:1,law:'frost',surgeEvery:2,line:'터진 자리 서리'}),
 curatedSecond('lightningpetal','blastlance','꽃잎 폭뢰','번개 꽃잎이 세 번 맞힐 때마다 그 자리에서 창끝 폭발이 터집니다.','붙어 오는 무리를 연달아 터뜨림','사거리가 짧아 멀리 있는 적에게는 닿지 않음',
  {effect:'blast',trigger:'nth',every:3,cooldown:.4,damage:14,radius:1.4,law:'burst',surgeEvery:1,line:'맞힌 자리 폭발'}),
 curatedSecond('returnblade','frostguard','서리 칼날','돌아오는 칼날이 두 번 벨 때마다 그 자리에 서리가 번져 둘레를 얼립니다.','움직이며 칼날을 돌려받으면 지나간 길이 얼어붙음','제자리에 서 있으면 돌아오는 길이 짧아 서리가 드묾',
  {effect:'nova',trigger:'return',every:2,cooldown:.35,damage:14,radius:1.4,slow:.9,law:'frost',surgeEvery:1,line:'돌아오는 길 서리'}),
 curatedSecond('frostkaleidoscope','comethalo','혜성 만화경','벽을 튕기는 서리 만화경이 네 번 맞힐 때마다 그 자리에 혜성이 터집니다.','벽 많은 방에서 튕긴 자리마다 폭발','트인 방에서는 덜 튕기고, 한 번에 주는 피해는 낮음',
  {effect:'blast',trigger:'nth',every:4,cooldown:.7,damage:18,radius:1.5,law:'burst',surgeEvery:2,line:'튕긴 자리 혜성'}),
 // 4묶음(공명 1 · 교차 4, 2026-09-23): 사용자 "중력 말뚝 강화버전은 없나" — 한 적에게 센 무기(중력 말뚝)도 주 공격으로.
 // 단일 대상형은 광역 수치 대신 보스 피해로 잰다(second-fusion-test). 역할: 단일 대상 1 · 제어 1 · 이동 보상 1 · 모아 터뜨리기 1 · 다수전 1.
 curatedSecond('gravitystake','collapse','붕괴 말뚝','중력 말뚝이 두 번 박힐 때마다 그 자리에서 작은 붕괴가 터집니다.','보스처럼 한 적에게 말뚝을 계속 박을 때 붕괴가 쌓임','흩어진 무리에게는 말뚝이 덜 박히고 붕괴도 작음',
  {effect:'blast',trigger:'nth',every:2,cooldown:.5,damage:36,radius:1.1,law:'gravity',surgeEvery:1,line:'박힌 자리 붕괴'}),
 curatedSecond('stormanchor','frostbloom','서리 닻','뇌우 닻이 끌어 모은 적을 세 번 맞힐 때마다 그 자리에 서리꽃이 터져 얼립니다.','끌어 모은 무리를 그 자리에 묶어 둠','한 적에게 주는 피해는 낮고, 문지기·보스는 끌려오지도 얼지도 않음',
  {effect:'nova',trigger:'nth',every:3,cooldown:.9,damage:10,radius:1.7,slow:1,law:'frost',surgeEvery:2,line:'모인 자리 서리꽃'}),
 curatedSecond('tidepull','blastlance','해일 폭창','돌아오는 해일이 두 번 쓸 때마다 그 자리에서 창끝 폭발이 터집니다.','움직이며 해일을 돌려받으면 쓸어 온 적이 터짐','제자리에 서 있으면 돌아오는 길이 짧아 폭발이 드묾',
  {effect:'blast',trigger:'return',every:2,cooldown:.5,damage:12,radius:1.3,law:'burst',surgeEvery:1,line:'돌아오는 길 폭발'}),
 curatedSecond('collapse','stormcrown','뇌운 붕괴','붕괴의 씨앗이 세 번 맞힐 때마다 모인 적 사이로 번개가 튀고 가운데에서 터집니다.','모아 놓은 무리를 번개로 한 번 더 정리','한 적에게는 번개가 튈 곳이 없고, 씨앗이 느림',
  {effect:'arc',trigger:'nth',every:3,cooldown:1,damage:6,jumps:3,range:3.2,decay:.9,finish:8,finishRadius:1.4,law:'chain',surgeEvery:1,line:'모인 자리 뇌운'}),
 curatedSecond('seedstorm','frostguard','서리 씨앗비','가까이 흩뿌린 씨앗이 적을 쓰러뜨리면 그 자리에 서리가 번져 옆의 적을 얼립니다.','붙어 오는 무리를 쓰러뜨리며 뒤따라오는 적까지 묶음','사거리가 짧고, 쓰러뜨리지 못하는 보스 곁에서는 서리가 없음',
  {effect:'nova',trigger:'kill',every:1,cooldown:.3,damage:10,radius:1.4,slow:.9,law:'frost',line:'쓰러뜨린 자리 서리'})
];
export const SECOND_FORMS=Object.freeze(Object.fromEntries(CURATED_SECOND_LIST.map(f=>[f.id,f])));
// 재융합 묶음. 그림·사용자 승인 전까지 live:false(선택지에 안 나오고, 실험실에서만 시험). 기록: combo-batches/
export const SECOND_BATCHES=Object.freeze({
 '20260922-r1':Object.freeze({live:false,ids:Object.freeze(CURATED_SECOND_LIST.slice(0,5).map(f=>f.id))}),
 '20260922-r2':Object.freeze({live:false,ids:Object.freeze(CURATED_SECOND_LIST.slice(5,10).map(f=>f.id))}),
 '20260923-r3':Object.freeze({live:false,ids:Object.freeze(CURATED_SECOND_LIST.slice(10,15).map(f=>f.id))}),
 '20260923-r4':Object.freeze({live:false,ids:Object.freeze(CURATED_SECOND_LIST.slice(15,20).map(f=>f.id))})
});
const HELD_SECOND=new Set(Object.values(SECOND_BATCHES).filter(batch=>!batch.live).flatMap(batch=>batch.ids));
export const isSecondHeldBack=id=>HELD_SECOND.has(id);
const SECOND_BY_PARTS=new Map(Object.values(SECOND_FORMS).filter(f=>!HELD_SECOND.has(f.id)).map(f=>[[...f.parts].sort().join('+'),f.id]));
export const secondFormOf=(a,b)=>a===b?null:SECOND_BY_PARTS.get([a,b].sort().join('+'))||null;

// Solo evolutions: one law raised far enough becomes an attack of its own.
// They live beside the 45 first fusions (FORMS stays fusion-only) and take one slot like a fusion does.
export const SOLO_LEVEL=5;
const solo=(id,law,name,desc,strength,weakness,passive=false)=>Object.freeze({id,name,requires:Object.freeze([law]),pair:`${LAW_KO[law]} 단독 진화`,desc,strength,weakness,passive,solo:true});
const SOLO_ALL=Object.freeze(Object.fromEntries([
 solo('mirrormaze','reflect','거울 미궁','벽을 여러 번 튕기는 거울탄을 쏩니다. 튕길 때마다 빨라지고 피해가 커집니다.','벽이 많은 방에서 튕길수록 강해짐','처음 한 방은 약하고, 트인 곳에서는 튕길 벽이 없음'),
 solo('fullbloom','split','만개한 꽃','맞은 적에게서 꽃잎이 둥글게 퍼지고, 꽃잎이 다시 한 번 갈라집니다.','무리 한가운데에서 연쇄로 퍼짐','혼자 있는 적에게는 퍼질 곳이 없음'),
 solo('thunderweb','chain','천둥 그물','가장 가까운 적에게서 시작한 번개가 여러 적 사이를 뛰어다닙니다.','흩어진 무리를 한 번에 훑음','뛸수록 약해지고 벽 너머로는 못 뜀'),
 solo('starring','orbit','별의 고리','넓어졌다 좁아지는 꽃잎 고리가 적을 베고 날아오는 탄을 막습니다(문지기 탄 제외).','가까이 오는 적과 탄막을 동시에 막음','멀리서 버티는 적은 직접 다가가야 함',true),
 solo('glassspear','pierce','유리 창날','아주 긴 창날이 한 줄을 꿰뚫고, 꿰뚫을수록 피해가 커집니다.','일렬로 선 적과 긴 복도','느리고, 옆으로 흩어진 적에게 약함'),
 solo('flarebloom','burst','불꽃 꽃다발','목표에 큰 폭발을 떨어뜨리고 주변에 작은 불씨 폭발이 이어집니다.','모여 있는 무리를 크게 태움','떨어지기까지 느려 빠른 적은 피함'),
 solo('rewind','recall','되감기 잎','잎이 날아갔다 돌아오기를 여러 번 되풀이합니다.','움직이며 같은 길을 여러 번 훑음','경로 밖의 적은 못 맞힘'),
 solo('blackhole','gravity','작은 블랙홀','목표에 멈춘 블랙홀이 한동안 적을 끌어당기며 계속 피해를 줍니다.','적을 한곳에 붙잡아 둠','순간 피해가 낮고 문지기는 끌려오지 않음'),
 solo('winterbreath','frost','겨울 숨결','앞쪽 부채꼴에 서리를 내뿜어 얼리고, 이미 느려진 적은 더 아프게 합니다.','가까운 무리를 얼려 멈춤','사거리가 짧고 등 뒤는 비어 있음'),
 solo('riftseed','portal','별문 심장','탄환이 연속으로 두 문을 통과해 뒷줄을 기습하고, 도착할 때 차원 파동을 남깁니다.','벽을 넘지 않고 앞줄 뒤의 사수와 포탑을 공격','문을 펼칠 직선 공간이 짧으면 도약 거리가 줄어듦')
].map(f=>[f.id,f])));
// 숨긴 법칙(차원)의 단독 진화는 뺀다.
export const SOLO_FORMS=Object.freeze(Object.fromEntries(Object.entries(SOLO_ALL).filter(([,f])=>!HIDDEN_LAWS.includes(f.requires[0]))));
// Every first evolution the seed can hold: twenty authored first fusions and nine solo evolutions.
// Awakened evolutions (2026-09-15): a fusion joined with the solo evolution of one of its laws, or the two solo evolutions
// of its laws, becomes that fusion's awakened self in one slot. It attacks as the fusion with part of the ultimate's boost
// built in (AWAKEN_BOOST) and repeats the fusion's opening move every AWAKEN.openingEvery seconds while enemies are near.
export const AWAKEN=Object.freeze({openingEvery:10,openingRange:12,surgeOpeningEvery:1.2,damage:1.25,interval:.8});
export const AWAKEN_OPENING_EVERY=Object.freeze({bigcrunch:14});
export const awakenOpeningEvery=(id,twin=false)=>twin?AWAKEN.openingEvery:AWAKEN_OPENING_EVERY[id]??AWAKEN.openingEvery;
// The mirror's opening turns every enemy shot at once, so it does not repeat during the ultimate.
export const AWAKEN_SURGE_OPENING=Object.freeze({mirrorhall:Infinity});
export const awakenSurgeOpening=(id,twin=false)=>twin?TWIN.surgeOpeningEvery:AWAKEN_SURGE_OPENING[id]??AWAKEN.surgeOpeningEvery;
const awaken=(id,base,name,desc,strength,weakness)=>Object.freeze({id,name,base,requires:CURATED_FORMS[base].requires,pair:`${CURATED_FORMS[base].name} 각성`,desc,strength,weakness,passive:CURATED_FORMS[base].passive,awakened:true});
export const AWAKEN_FORMS=Object.freeze(Object.fromEntries([
 awaken('bigcrunch','collapse','대붕괴','넓은 붕괴 씨앗을 빠르게 쏘며, 14초마다 가까운 적 둘의 자리에 붕괴 우물을 심습니다.','모인 적을 강한 붕괴로 정리','우물 사이의 공백과 느린 탄을 빠른 적이 파고듦'),
 awaken('frostarmada','frostguard','서리 함대','위성이 늘고 냉기가 훨씬 자주 터지며, 10초마다 넓은 냉기가 주변을 오래 얼립니다.','근접 제압과 탄막 방어의 완성형','사거리는 여전히 짧음'),
 awaken('thousandblades','returnblade','천 개의 칼날','칼날이 늘고 왕복마다 더 많이 베며, 10초마다 여덟 방향으로 칼날을 던집니다.','사방의 적을 왕복으로 갈아냄','씨앗이 멈춰 있으면 경로가 단조로움'),
 awaken('infiniteprism','prism','무한 프리즘','가시가 한 번 더 갈라지고, 10초마다 열두 방향으로 수정 가시를 흩뿌립니다.','벽 많은 방을 가시로 가득 채움','트인 곳에서는 갈라질 벽이 적음'),
 awaken('skyspear','thunderlance','하늘가르기 창','창이 더 깊이 꿰뚫고 번개가 더 멀리 뛰며, 10초마다 천둥 창 다섯 자루를 부채꼴로 던집니다.','긴 줄과 흩어진 적을 함께 정리','발사가 느리고 엄폐물에 막힘'),
 awaken('icegarden','frostbloom','얼음 정원','봉오리가 늘고 더 빨리 부서지며, 10초마다 가까운 적 여섯에게 봉오리를 떨어뜨립니다.','몰려오는 무리를 얼려 통째로 부숨','떨어지기까지 짧은 지연'),
 awaken('tempestcrown','stormcrown','뇌신의 왕관','구슬이 늘어 더 자주, 더 멀리 치고, 10초마다 주변 모든 적에게 번개를 내리꽂습니다.','움직이며 주변을 자동으로 쓸어버림','멀리서 버티는 포탑은 직접 다가가야 함'),
 awaken('maelstrom','tidepull','대소용돌이','해일핵이 늘고 더 넓게 붙잡으며, 10초마다 네 방향으로 해일을 보냅니다.','전장 곳곳의 무리를 한곳으로 배달','문지기·포탑은 끌 수 없음'),
 awaken('bloomtempest','seedstorm','씨앗 대폭풍','부채꼴 씨앗이 늘고, 10초마다 씨앗을 한 바퀴 둥글게 흩뿌립니다.','붙어 오는 무리를 사방에서 정리','사거리가 짧음'),
 awaken('mirrorhall','mirrorguard','거울의 전당','거울이 늘어 더 넓게 막고, 10초마다 날아오는 적 탄환을 모두 되받아칩니다(문지기 탄 제외).','탄막을 통째로 공격으로 바꿈','탄을 쏘지 않는 근접 무리에게는 약함')
].map(f=>[f.id,f])));
// Twin awakenings: all 35 non-curated pairs of solo evolutions awaken too.
// Both solo attacks fight from one slot (each at TWIN.damage) and their opening moves take turns every AWAKEN.openingEvery seconds.
// Together with the curated awakenings every one of the 45 solo pairs now leads somewhere.
export const TWIN=Object.freeze({damage:.7,surgeOpeningEvery:1.5});
const TWIN_TRAITS=Object.freeze({
 mirrormaze:Object.freeze({word:'굴절',effect:'reflect',bonus:.03}),
 fullbloom:Object.freeze({word:'개화',effect:'split',bonus:.04}),
 thunderweb:Object.freeze({word:'낙뢰',effect:'chain',bonus:.03}),
 starring:Object.freeze({word:'성환',effect:'orbit',bonus:.035}),
 glassspear:Object.freeze({word:'관통',effect:'pierce',bonus:.05}),
 flarebloom:Object.freeze({word:'발화',effect:'burst',bonus:.055}),
 rewind:Object.freeze({word:'회귀',effect:'recall',bonus:.035}),
 blackhole:Object.freeze({word:'특이점',effect:'gravity',bonus:.03}),
 winterbreath:Object.freeze({word:'빙결',effect:'frost',bonus:.035}),
 riftseed:Object.freeze({word:'개문',effect:'portal',bonus:.04})
});
const twin=(id,a,b,name,desc)=>{
 const A=SOLO_ALL[a],B=SOLO_ALL[b],parts=Object.freeze([a,b]),ta=TWIN_TRAITS[a],tb=TWIN_TRAITS[b];
 const synergy=Object.freeze({name:`${ta.word}·${tb.word} 공명`,window:2.6,bonus:.08+ta.bonus+tb.bonus,effects:Object.freeze([ta.effect,tb.effect])});
 return Object.freeze({id,name:`${name} 각성`,parts,base:parts.find(p=>p==='starring')||a,requires:Object.freeze([A.requires[0],B.requires[0]]),pair:`${A.name} + ${B.name}`,desc,strength:`${A.strength} · ${B.strength}`,weakness:'두 공격의 약점은 각각 그대로',synergy,passive:false,awakened:true,twin:true});
};
const TWIN_ALL=Object.freeze(Object.fromEntries([
 twin('lightningmirror','mirrormaze','thunderweb','번개 거울방','튕기는 거울탄과 적 사이를 뛰는 번개가 한 칸에서 함께 나갑니다.'),
 twin('glassmaze','mirrormaze','glassspear','유리 미궁','벽을 튕기는 거울탄과 한 줄을 꿰뚫는 유리 창날을 함께 씁니다.'),
 twin('flaremirror','mirrormaze','flarebloom','불꽃 거울','거울탄이 방을 누비는 사이 목표에 불꽃 다발이 떨어집니다.'),
 twin('echohall','mirrormaze','rewind','메아리 회랑','튕기는 거울탄과 여러 번 되돌아오는 잎이 같은 길을 겹겹이 훑습니다.'),
 twin('lensinghole','mirrormaze','blackhole','중력 렌즈','블랙홀이 적을 붙잡는 동안 거울탄이 그 주변을 튕기며 때립니다.'),
 twin('frostmirror','mirrormaze','winterbreath','서리 거울','앞쪽을 얼리는 숨결과 방을 튕겨 다니는 거울탄을 함께 씁니다.'),
 twin('stormpetals','fullbloom','thunderweb','번개 꽃잎','퍼지는 꽃잎과 뛰어다니는 번개가 무리 사이를 동시에 파고듭니다.'),
 twin('petalhalo','fullbloom','starring','꽃잎 후광','씨앗을 감싼 별의 고리가 막는 동안 꽃이 멀리 피어납니다.'),
 twin('piercingbloom','fullbloom','glassspear','꿰뚫는 꽃비','긴 창날이 줄을 꿰뚫고, 맞은 적마다 꽃잎이 둥글게 퍼집니다.'),
 twin('returningbloom','fullbloom','rewind','돌아오는 꽃','왕복하는 잎과 퍼지는 꽃잎이 같은 무리를 거듭 훑습니다.'),
 twin('gravitybloom','fullbloom','blackhole','끌림 꽃밭','블랙홀로 모은 무리 한가운데에 꽃이 터져 꽃잎이 번집니다.'),
 twin('frostpetals','fullbloom','winterbreath','서리 꽃잎','가까운 적은 숨결로 얼리고, 멀리 있는 무리엔 꽃잎을 퍼뜨립니다.'),
 twin('thunderflare','thunderweb','flarebloom','천둥 불꽃','번개가 흩어진 적을 훑고, 모인 곳엔 불꽃 다발이 떨어집니다.'),
 twin('returningbolt','thunderweb','rewind','되감는 번개','되돌아오는 잎이 길을 쓸고, 번개가 그 길 밖의 적까지 뛰어갑니다.'),
 twin('stormeye','thunderweb','blackhole','폭풍의 눈','블랙홀에 붙잡힌 무리 사이로 번개가 끊임없이 튑니다.'),
 twin('frozenweb','thunderweb','winterbreath','얼어붙은 그물','앞쪽은 서리로 멈추고, 번개 그물이 사방의 적을 잇습니다.'),
 twin('spearhalo','starring','glassspear','창날 고리','별의 고리가 가까운 적과 탄을 막고, 유리 창날이 먼 줄을 꿰뚫습니다.'),
 twin('sunring','starring','flarebloom','태양 고리','씨앗을 도는 고리가 버티는 동안 멀리 불꽃 다발을 떨어뜨립니다.'),
 twin('tidering','starring','rewind','밀물 고리','고리로 곁을 지키며 잎을 멀리 보냈다 되돌립니다.'),
 twin('accretionring','starring','blackhole','강착 원반','블랙홀로 적을 멈춰 두고, 다가오는 적은 별의 고리가 벱니다.'),
 twin('meteorspear','glassspear','flarebloom','유성창','한 줄은 창날로 꿰뚫고, 모인 무리엔 불꽃 다발을 떨어뜨립니다.'),
 twin('gravityspear','glassspear','blackhole','중력 창','블랙홀이 적을 한 줄로 모으면 유리 창날이 한꺼번에 꿰뚫습니다.'),
 twin('iciclespear','glassspear','winterbreath','고드름 창','가까운 적은 숨결로 얼리고, 먼 줄은 창날로 꿰뚫습니다.'),
 twin('boomerangflare','flarebloom','rewind','되돌아오는 불꽃','왕복하는 잎이 길을 쓸고, 모인 곳엔 불꽃 다발이 떨어집니다.'),
 twin('frostrewind','rewind','winterbreath','서리 되감기','숨결로 멈춘 적 위를 잎이 여러 번 오가며 벱니다.'),
 twin('frozenhole','blackhole','winterbreath','얼어붙은 블랙홀','블랙홀로 붙잡은 무리를 숨결로 얼려 더 아프게 합니다.'),
 twin('portal-mirror','mirrormaze','riftseed','차원경','거울탄이 별문을 드나들며 예상 밖의 각도에서 다시 튕깁니다.'),
 twin('portal-bloom','fullbloom','riftseed','문 너머 만개','별문 출구마다 꽃잎이 피어 뒷줄까지 번집니다.'),
 twin('portal-web','thunderweb','riftseed','차원 번개','별문을 건넌 번개가 떨어진 적 사이를 다시 연결합니다.'),
 twin('portal-ring','starring','riftseed','별문 성환','도약하는 별문과 숨 쉬는 고리가 안팎을 동시에 지킵니다.'),
 twin('portal-spear','glassspear','riftseed','차원 관통자','별문을 통과한 창날이 뒷줄을 더 깊게 꿰뚫습니다.'),
 twin('portal-flare','flarebloom','riftseed','별문 화염','문이 열리는 곳마다 불꽃 다발이 터집니다.'),
 twin('portal-rewind','rewind','riftseed','무한 회귀문','되감기 잎이 두 문을 오가며 같은 길을 거듭 벱니다.'),
 twin('portal-gravity','blackhole','riftseed','사건의 지평문','별문 출구가 작은 블랙홀로 변해 적을 붙잡습니다.'),
 twin('portal-frost','winterbreath','riftseed','서리 차원문','두 문 사이로 겨울 숨결이 이어져 멀리까지 얼립니다.')
].map(f=>[f.id,f])));
// 숨긴 법칙(차원)이 들어간 쌍둥이 각성은 뺀다.
export const TWIN_FORMS=Object.freeze(Object.fromEntries(Object.entries(TWIN_ALL).filter(([,f])=>!f.requires.some(id=>HIDDEN_LAWS.includes(id)))));
// Every evolution the seed can hold: twenty authored first fusions, nine solo evolutions,
// ten curated awakenings and 26 twin awakenings (65).
export const ALL_FORMS=Object.freeze({...FORMS,...CANDIDATE_FORMS,...SOLO_FORMS,...AWAKEN_FORMS,...TWIN_FORMS,...SECOND_FORMS});
export const isAwakenedForm=id=>Object.hasOwn(AWAKEN_FORMS,id)||Object.hasOwn(TWIN_FORMS,id);
export const isTwinForm=id=>Object.hasOwn(TWIN_FORMS,id);
// The attacks an evolution fights with, one combat each: a twin has two, everything else one.
export const attackPartsOf=id=>TWIN_FORMS[id]?[...TWIN_FORMS[id].parts]:[AWAKEN_FORMS[id]?.base||id];
// The attack an evolution fights with: an awakened evolution uses its fusion's attack, everything else its own.
export const baseFormOf=id=>AWAKEN_FORMS[id]?.base||TWIN_FORMS[id]?.base||id;
export const awakenedFormOf=fusion=>Object.values(AWAKEN_FORMS).find(f=>f.base===fusion)?.id||null;
export const isSoloForm=id=>Object.hasOwn(SOLO_FORMS,id);
export const soloFormOf=law=>Object.values(SOLO_FORMS).find(f=>f.requires[0]===law)?.id||null;
// Laws still in their own slot that are high enough to evolve alone.
export function soloReady(levels,forms=new Map()){
 // Evolving again into a solo evolution already held feeds it, the same way fusions stack.
 return [...levels].filter(([law,level])=>level>=SOLO_LEVEL&&soloFormOf(law)).map(([law])=>SOLO_FORMS[soloFormOf(law)]);
}
// A solo evolution keeps the picks spent on its law: law level 5 becomes evolution level 4.
export function soloLevel(levels,id){
 if(!isSoloForm(id))return 0;
 const level=levels.get(SOLO_FORMS[id].requires[0])||0;
 return level>=SOLO_LEVEL?level-1:0;
}

export function isFormEligible(id,held){
 const target=Object.hasOwn(FORMS,id)?FORMS[id]:null;
 const laws=new Set(Array.isArray(held)||held instanceof Set?held:[]);
 return Boolean(target&&target.requires.every(law=>laws.has(law)));
}

// This reports alternatives. The run owns a single selected form ID.
export function eligibleForms(held){return Object.values(FORMS).filter(f=>isFormEligible(f.id,held));}

// A form grows with its ingredients: both at level one is form level one, and every
// ingredient upgrade after that is one more form level. There is no ceiling.
export function formLevel(levels,id){
 if(!Object.hasOwn(FORMS,id))return 0;
 const [a,b]=FORMS[id].requires.map(law=>levels.get(law)||0);
 return a&&b?a+b-1:0;
}

// Level one reproduces the original tuning exactly; counts are capped, damage is not.
// {surge:true} is the stat sheet while this evolution's active (signature/overdrive) runs.
export function formStats(id,level=1,{surge=false,twin=false}={}){
 // A twin's sheet is its first attack's; each attack of a twin fights at TWIN.damage.
 if(TWIN_FORMS[id])return {...formStats(TWIN_FORMS[id].parts[0],level,{surge,twin:true}),parts:TWIN_FORMS[id].parts};
 if(twin){const s=formStats(id,level,{surge});if(!(s.damage>0))return s;const out={...s,twin:true};for(const key of DAMAGE_KEYS)if(typeof out[key]==='number')out[key]*=TWIN.damage;return out;}
 const awakened=AWAKEN_FORMS[id];
 if(awakened){const base=baseStats(awakened.base,level);if(!(base.damage>0))return base;const awake=awakenStats(awakened.base,base);return surge?surgeStats(awakened.base,awake):awake;}
 const base=baseStats(id,level);
 return surge&&base.damage>0?surgeStats(id,base):base;
}
// While the active runs: attacks come about twice as often and each evolution gets more of what makes it itself.
const SURGE=Object.freeze({
 collapse:s=>({bolts:s.bolts+3,wells:s.wells+2,radius:s.radius+.6}),
 frostguard:s=>({satellites:s.satellites+3,novaEvery:s.novaEvery*.3,novaRadius:s.novaRadius+1}),
 returnblade:s=>({bolts:s.bolts+4,hitsPerLeg:s.hitsPerLeg+4}),
 prism:s=>({shards:s.shards+12,generations:s.generations+1}),
 thunderlance:s=>({jumps:s.jumps+2,pierce:s.pierce+4}),
 frostbloom:s=>({bombs:s.bombs+3,delay:s.delay*.5}),
 stormcrown:s=>({orbs:s.orbs+2,pulse:s.pulse*.55,range:s.range+1.5}),
 tidepull:s=>({vortices:s.vortices+1,radius:s.radius+1,hold:s.hold+.5}),
 seedstorm:s=>({seeds:s.seeds+3}),
 mirrorguard:s=>({mirrors:s.mirrors+3,radius:s.radius+.4}),
 gravitymirror:s=>({bounces:s.bounces+3,pullRadius:s.pullRadius+.7,blastRadius:s.blastRadius+.45}),
 chainburst:s=>({jumps:s.jumps+3,range:s.range+.8,finishRadius:s.finishRadius+.45}),
 blastlance:s=>({pierce:s.pierce+5,length:s.length+3,blastRadius:s.blastRadius+.5}),
 frostkaleidoscope:s=>({bolts:s.bolts+4,bounces:s.bounces+3,shatterBounces:Math.max(1,s.shatterBounces-1)}),
 lightningpetal:s=>({petals:s.petals+2,range:s.range+.8,chainRange:s.chainRange+.6}),
 returnflare:s=>({bolts:s.bolts+2,radius:s.radius+.45,homeRadius:s.homeRadius+.6}),
 comethalo:s=>({comets:s.comets+2,pulse:s.pulse*.55,chargeDecay:0,blastRadius:s.blastRadius+.45}),
 stormanchor:s=>({jumps:s.jumps+3,range:s.range+.8,finishRadius:s.finishRadius+.45}),
 returningpetals:s=>({bolts:s.bolts+2,petals:s.petals+2,range:s.range+1}),
 icicle:s=>({pierce:s.pierce+1,shatterRadius:s.shatterRadius+.35,mark:s.mark+2}),
 halobloom:s=>({petals:s.petals+4,bloomAt:Math.max(3,s.bloomAt-4),regrow:s.regrow*.45}),
 frostnet:s=>({jumps:s.jumps+3,range:s.range+.8,webLife:s.webLife+1.6,minLinks:2}),
 rewindbolt:s=>({jumps:s.jumps+1,range:s.range+.5,rewindDistance:s.rewindDistance*.6}),
 refractlance:s=>({folds:s.folds+3,pierce:s.pierce+4,length:s.length+3}),
 thundermirror:s=>({echoes:s.echoes+3,range:s.range+.8}),
 sunmirror:s=>({maxCharge:s.maxCharge+4,bolts:s.bolts+2,absorb:s.absorb+.4}),
 pierceshower:s=>({pierce:s.pierce+2}),
 ebbring:s=>({blades:s.blades+3,radius:s.radius+.35,cooldown:s.cooldown*.5,calmScale:1}),
 pullgarden:s=>({fields:s.fields+2,fieldRadius:s.fieldRadius+.4}),
 spearring:s=>({spears:s.spears+2,launchEvery:s.launchEvery*.45,pierce:s.pierce+2}),
 accretiondisk:s=>({vortices:s.vortices+2,capacity:Math.max(3,s.capacity-3),catchRadius:s.catchRadius+.6,cooldown:s.cooldown*.5}),
 rimeback:s=>({bolts:s.bolts+3,shatterRadius:s.shatterRadius+.5}),
 coldwell:s=>({wells:s.wells+1,radius:s.radius+.6,freezeAfter:s.freezeAfter*.5}),
 rimepetal:s=>({petals:s.petals+2}),
 echolane:s=>({passes:s.passes+3,bolts:s.bolts+2}),
 gravitystake:s=>({pierce:s.pierce+2,implosions:2,isolation:s.isolation-1}),
 mirrormaze:s=>({bolts:s.bolts+4,bounces:s.bounces+5}),
 fullbloom:s=>({bolts:s.bolts+2,petals:s.petals+1}),
 thunderweb:s=>({jumps:s.jumps+1,decay:Math.min(.93,s.decay+.02)}),
 starring:s=>({petals:s.petals+4,outer:s.outer+1,period:s.period*.5}),
 glassspear:s=>({pierce:s.pierce+6,length:s.length+3}),
 flarebloom:s=>({embers:s.embers+3,radius:s.radius+.6}),
 rewind:s=>({leaves:s.leaves+3,trips:s.trips+1}),
 blackhole:s=>({holes:s.holes+2,hold:s.hold+1}),
 winterbreath:s=>({range:s.range+1,cone:Math.min(Math.PI,s.cone*1.3)}),
 riftseed:s=>({bolts:s.bolts,portalDistance:s.portalDistance+1.2,pierce:s.pierce+1})
});
// While an ultimate runs every hit is heavier too (2026-09-15: players waited long and enemies still did not die).
export const SURGE_DAMAGE=1.6;
const DAMAGE_KEYS=['damage','nova','shatter','pop','tick','ram','jumpDamage','petalDamage','chainDamage','emberDamage','returnDamage','homeDamage','blast','finish'];
// Awakened: a lasting share of the surge. Counts grow a little, attacks come a little faster and hit a little harder;
// the ultimate still adds the full surge on top.
const AWAKEN_BOOST=Object.freeze({
 collapse:s=>({radius:s.radius+.15}),
 frostguard:s=>({satellites:Math.min(8,s.satellites+1),novaEvery:s.novaEvery*.65,novaRadius:s.novaRadius+.5}),
 returnblade:s=>({bolts:s.bolts+1,hitsPerLeg:s.hitsPerLeg+2}),
 prism:s=>({shards:s.shards+6,generations:s.generations+1}),
 thunderlance:s=>({jumps:s.jumps+1,pierce:s.pierce+2}),
 frostbloom:s=>({bombs:s.bombs+1,delay:s.delay*.85}),
 stormcrown:s=>({orbs:s.orbs+1,pulse:s.pulse*.85,range:s.range+.8}),
 // Tidepull keeps the spectacle of several travelling cores. Maelstrom earns
 // one more core, while damage is budgeted across the whole formation below.
 tidepull:s=>({vortices:s.vortices+1,radius:s.radius+.5}),
 seedstorm:s=>({seeds:s.seeds+1}),
 mirrorguard:s=>({mirrors:s.mirrors+2,radius:s.radius+.2})
});
// Measured against the fusion plus its best solo evolution at equal levels (tools/active-balance-test.mjs).
const AWAKEN_DAMAGE=Object.freeze({collapse:.88,frostguard:1.25,returnblade:1.15,prism:1.8,thunderlance:1.2,frostbloom:1,stormcrown:1.1,tidepull:1,seedstorm:.85,mirrorguard:1.8});
function awakenStats(id,s){
 const boosted={...s,...(AWAKEN_BOOST[id]?.(s)||{}),awakened:true};
 if(Number.isFinite(boosted.interval))boosted.interval*=AWAKEN.interval;
 for(const key of DAMAGE_KEYS)if(typeof boosted[key]==='number')boosted[key]*=AWAKEN_DAMAGE[id]??AWAKEN.damage;
 return boosted;
}
function surgeStats(id,s){
 // 손제작 재융합은 주 공격 부모의 궁극기 강화를 그대로 받고, 후속 효과는 더 자주(surgeEvery) 터진다.
 const curated=SECOND_FORMS[id]?.curated&&SECOND_FORMS[id];
 if(curated){const boosted=surgeStats(curated.main,s),follow={...s.follow,damage:s.follow.damage*SURGE_DAMAGE,every:curated.follow.surgeEvery||s.follow.every,cooldown:(s.follow.cooldown||0)*.5};return {...boosted,follow};}
 const isSecond=Boolean(SECOND_FORMS[id]),isGenerated=Boolean(GENERATED_FORMS[id]||isSecond);
 const generated=isGenerated?{bolts:s.bolts||4,pierce:(s.pierce||1)+1,portalDistance:(s.portalDistance||0)+(s.laws?.includes('portal')?1.2:0)}:{};
 const boosted={...s,...generated,...(SURGE[id]?.(s)||{}),surge:true};
 if(Number.isFinite(boosted.interval))boosted.interval*=isSecond?.6:isGenerated?.7:.5;
 for(const key of DAMAGE_KEYS)if(typeof boosted[key]==='number')boosted[key]*=isSecond?2:isGenerated?1.4:SURGE_DAMAGE;
 return boosted;
}
function baseStats(id,level){
 const L=Math.max(1,Math.floor(level)),up=L-1,power=1+.25*up,faster=Math.max(.55,1-.05*up);
 const curated=SECOND_FORMS[id]?.curated&&SECOND_FORMS[id];
 if(curated)return {...baseStats(curated.main,level),secondOf:curated.id,follow:{...curated.follow,damage:curated.follow.damage*power,finish:(curated.follow.finish||0)*power}};
 if(SECOND_FORMS[id]){
  const form=SECOND_FORMS[id],primaryLaws=FORMS[form.parts[0]].requires,followUpLaws=FORMS[form.parts[1]].requires;
  return {interval:.98*faster*form.budget.interval,damage:46*power*form.budget.damage,speed:12.5,life:2.5,bolts:3,laws:primaryLaws,primaryLaws,followUpLaws,
   secondFamily:form.family,sharedLaw:form.sharedLaw,markWindow:2.6,followUpScale:form.family==='resonance'?.58:.72,
   pierce:primaryLaws.includes('pierce')?Math.min(7,3+Math.floor(up/2)):1,
   bounces:primaryLaws.includes('reflect')?Math.min(7,2+Math.floor(up/3)):0,
   split:primaryLaws.includes('split')?Math.min(5,2+Math.floor(up/4)):0,
   portalDistance:primaryLaws.includes('portal')?Math.min(6,3.2+.18*up):0,
   returns:primaryLaws.includes('recall')?1:0};
 }
 if(GENERATED_FORMS[id]){
  const laws=GENERATED_FORMS[id].requires;
  return {interval:.9*faster,damage:34*power,speed:12,life:2.35,bolts:4,laws,
   pierce:laws.includes('pierce')?Math.min(7,3+Math.floor(up/2)):1,
   bounces:laws.includes('reflect')?Math.min(7,2+Math.floor(up/3)):0,
   split:laws.includes('split')?Math.min(5,2+Math.floor(up/4)):0,
   portalDistance:laws.includes('portal')?Math.min(6,3.2+.18*up):0,
   returns:laws.includes('recall')?1:0};
 }
 switch(id){
  // Solo evolutions. They start at evolution level 4 (law level 5), so their level-one numbers are modest.
  case 'mirrormaze':return {interval:.8*faster,damage:32*power,bounces:Math.min(12,5+Math.floor(up/2)),gain:.15,bolts:3,speed:12};
  case 'fullbloom':return {interval:.85*faster,damage:28*power,petals:Math.min(8,5+Math.floor(up/3)),petalDamage:14*power,bolts:4,speed:12};
  case 'thunderweb':return {interval:.85*faster,damage:36*power,jumps:Math.min(10,4+Math.floor(up/2)),range:4.5,decay:.88,reach:9};
  case 'starring':return {interval:Infinity,damage:21*power,petals:Math.min(9,5+Math.floor(up/2)),inner:1.5,outer:Math.min(4.2,3.2+.1*up),period:2.4,cooldown:.4};
  case 'glassspear':return {interval:1.1*faster,damage:42*power,length:Math.min(18,13+.8*up),pierce:Math.min(16,8+up),ramp:.12};
  case 'flarebloom':return {interval:1.3*faster,damage:48*power,radius:Math.min(3.2,2+.12*up),embers:Math.min(6,3+Math.floor(up/3)),emberDamage:22*power,emberRadius:1,range:9,flight:.5,bombs:3};
  case 'rewind':return {interval:.95*faster,damage:20*power,trips:Math.min(3,2+Math.floor(up/6)),leaves:Math.min(4,3+Math.floor(up/4)),hitsPerLeg:Math.min(8,4+Math.floor(up/2))};
  case 'blackhole':return {interval:1.9*faster,damage:8*power,radius:Math.min(4.4,2.6+.14*up),hold:2.2,pull:4.5,holes:2,range:8};
  case 'winterbreath':return {interval:.75*faster,damage:26*power,range:Math.min(6,4.2+.12*up),cone:.55,slow:1.8,frozenBonus:1.5};
  case 'riftseed':return {interval:.8*faster,damage:86*power,speed:13,life:2.6,bolts:4,laws:Object.freeze(['portal']),pierce:2,bounces:0,split:0,portalDistance:Math.min(6.5,4+.2*up),returns:0};
  case 'collapse':return {interval:1.05*faster,damage:86*power,radius:Math.min(4.2,3.1+.15*up),bolts:5,wells:3};
  case 'frostguard':return {interval:Infinity,damage:40*power,satellites:Math.min(7,4+Math.floor(up/2)),radius:2.5,slow:2,cooldown:.35,nova:30*power,novaRadius:Math.min(4.2,3.2+.12*up),novaEvery:3*faster};
  case 'returnblade':return {interval:.9*faster,damage:34*power,hitsPerLeg:Math.min(9,5+up),bolts:5};
  case 'prism':return {interval:.7*faster,damage:26*power,generations:Math.min(4,2+Math.floor(up/2)),shards:18,speed:11};
  case 'thunderlance':return {interval:1.25*faster,damage:46*power,length:Math.min(15,11+.8*up),pierce:Math.min(14,8+up),jumps:Math.min(5,1+Math.floor(L/2)),jumpDamage:22*power};
  case 'frostbloom':return {interval:1.4*faster,damage:30*power,shatter:45*power,radius:Math.min(3.4,2.4+.15*up),range:9,flight:.55,delay:.8,bombs:3};
  case 'stormcrown':return {interval:Infinity,damage:26*power,orbs:Math.min(5,2+Math.floor(L/2)),range:4.2,pulse:.75*faster,radius:1.6};
  // Two cores keep their control budget split, but the return leg is the
  // weapon's payoff. This partial restoration stays well below the old
  // 50/13/34 per-core version while making a steered round trip matter again.
  case 'tidepull':return {interval:1.45*faster,damage:34*power,tick:9*power,returnDamage:25*power,radius:Math.min(4,3+.12*up),vortices:2,hold:.18,pull:7.5,safeRadius:2.55,slow:.8};
  case 'seedstorm':return {interval:.95*faster,damage:14*power,pop:12*power,seeds:Math.min(12,6+L),spread:.55,life:.42};
  case 'mirrorguard':return {interval:Infinity,damage:30*power,mirrors:Math.min(5,2+Math.floor(L/2)),ram:10*power,radius:1.9};
  case 'gravitymirror':return {interval:1.05*faster,damage:28*power,speed:10.5,life:3,bounces:Math.min(7,3+Math.floor(up/2)),pullRadius:Math.min(3.2,2.15+.12*up),pull:4.4,blast:48*power,blastRadius:Math.min(2.5,1.65+.1*up),bolts:4};
  case 'chainburst':return {interval:1.18*faster,damage:31*power,jumps:Math.min(7,3+Math.floor(up/2)),range:Math.min(5.2,4.1+.1*up),decay:.88,reach:10,finish:52*power,finishRadius:Math.min(2.6,1.7+.1*up)};
  case 'blastlance':return {interval:1.3*faster,damage:37*power,length:Math.min(17,12+.7*up),pierce:Math.min(13,7+up),ramp:.08,blast:42*power,blastRadius:Math.min(3,1.65+.1*up)};
  case 'frostkaleidoscope':return {interval:.98*faster,damage:29*power,speed:11.5,life:3.4,bounces:Math.min(9,4+Math.floor(up/2)),gain:.1,slow:1.7,shatter:54*power,shatterBounces:2,bolts:4};
  case 'lightningpetal':return {interval:1.02*faster,damage:34*power,speed:12,life:1.25,bolts:4,petals:Math.min(5,3+Math.floor(up/3)),petalDamage:22*power,chainDamage:15*power,range:Math.min(5.4,4.2+.1*up),chainRange:3.4};
  case 'returnflare':return {interval:1.32*faster,damage:30*power,returnDamage:22*power,homeDamage:46*power,radius:Math.min(2.5,1.65+.1*up),homeRadius:Math.min(3,2.05+.1*up),range:9,speed:10.5,life:4.5,bolts:3};
  case 'comethalo':return {interval:Infinity,damage:12*power,blast:22*power,blastRadius:Math.min(2.5,1.45+.1*up),comets:Math.min(5,3+Math.floor(up/3)),radius:2.25,range:Math.min(8,6.6+.1*up),pulse:.72*faster,chargeGain:.75,chargeDecay:.34,chargeCost:.18,speed:12.5,life:1.8,bolts:12};
  case 'stormanchor':return {interval:1.22*faster,damage:18*power,jumps:Math.min(7,4+Math.floor(up/3)),range:Math.min(5.3,4.3+.1*up),decay:.9,reach:10,minLinks:3,finish:42*power,finishRadius:Math.min(3,2+.1*up),pull:1.25};
  case 'returningpetals':return {interval:1.08*faster,damage:24*power,petalDamage:38*power,petals:Math.min(6,3+Math.floor(up/3)),range:Math.min(10,8+.14*up),speed:11.5,life:4.2,bolts:3,steer:5.5,hitsPerLeg:Math.min(5,3+Math.floor(up/3))};
  // 1묶음. 서리 표식은 이 무기가 스스로 남긴 것만 세므로 다른 빙결로는 파쇄를 살 수 없다.
  case 'icicle':return {interval:1.05*faster,damage:30*power,length:Math.min(14,10+.55*up),pierce:Math.min(4,2+Math.floor(up/3)),slow:1.9,mark:3.5,shatter:150*power,shatterRadius:Math.min(1.9,1.35+.07*up),shatterShare:.22};
  case 'halobloom':return {interval:Infinity,damage:30*power,petals:Math.min(8,4+Math.floor(up/2)),radius:1.8,cooldown:.3,bloomAt:8,petalDamage:34*power,splitDamage:18*power,range:6.2,speed:11,regrow:Math.max(.9,1.7-.06*up)};
  case 'frostnet':return {interval:1.15*faster,damage:14*power,jumps:Math.min(6,3+Math.floor(up/3)),range:Math.min(5,4.4+.06*up),decay:.9,reach:10,minLinks:3,webLife:Math.min(4.4,3.2+.1*up),webSlow:1.7,webTick:.65,webDamage:4.5*power};
  case 'rewindbolt':return {interval:1.1*faster,damage:34*power,jumps:Math.min(7,3+Math.floor(up/2)),range:Math.min(5,4.3+.06*up),decay:.9,reach:10,rewindDistance:Math.max(3.8,5-.15*up),rewindScale:.8,forget:4,trails:3};
  case 'refractlance':return {interval:1.15*faster,damage:44*power,length:Math.min(13,9+.5*up),pierce:Math.min(9,5+Math.floor(up*.6)),folds:Math.min(3,1+Math.floor(up/3)),foldGain:.22};
  // 2묶음
  case 'thundermirror':return {interval:1.12*faster,damage:46*power,echoes:Math.min(7,3+Math.floor(up/2)),decay:.9,reach:10,range:Math.min(5,4.2+.08*up),soloEcho:.7};
  case 'sunmirror':return {interval:1.2*faster,damage:24*power,blast:56*power,radius:1.5,chargeRadius:.18,chargeGain:.35,maxCharge:Math.min(10,6+Math.floor(up/2)),absorb:.95,speed:7.5,life:1.7,bolts:2};
  case 'pierceshower':return {interval:1.1*faster,damage:26*power,length:Math.min(12,9+.4*up),pierce:Math.min(8,4+Math.floor(up/2)),petalDamage:16*power,spread:2,petalSpeed:11,petalLife:.45};
  case 'ebbring':return {interval:Infinity,damage:36*power,blades:Math.min(6,3+Math.floor(up/2)),radius:1.35,calmRadius:.75,calmScale:.55,ebb:1.5,cooldown:.3,stretch:.45};
  case 'pullgarden':return {interval:1.35*faster,damage:8*power,bloom:30*power,fields:Math.min(4,2+Math.floor(up/3)),fieldRadius:1.5,life:2.6,pull:1.3,range:8,flight:.5,tickEvery:.5,bloomAt:2,bloomRadius:1.7};
  // 3묶음
  case 'spearring':return {interval:Infinity,damage:14*power,lance:48*power,spears:Math.min(5,2+Math.floor(up/2)),radius:1.9,cooldown:.4,launchEvery:Math.max(.7,1.5-.06*up),length:Math.min(12,9+.4*up),pierce:Math.min(8,4+Math.floor(up/2)),regrow:1.2};
  case 'accretiondisk':return {interval:Infinity,damage:18*power,debrisDamage:28*power,vortices:Math.min(5,2+Math.floor(up/2)),radius:2,cooldown:.35,capacity:Math.min(10,6+Math.floor(up/3)),catchRadius:1.6,pull:.8,debrisSpeed:12,debrisLife:1};
  case 'rimeback':return {interval:1*faster,damage:16*power,shatter:34*power,bolts:2,outTime:.6,speed:10,returnSpeed:12,slow:1.6,mark:2.5,shatterRadius:1.2};
  case 'coldwell':return {interval:1.6*faster,damage:5*power,shatter:24*power,radius:Math.min(3,2.3+.08*up),hold:2.4,pull:2.2,freezeAfter:1,slow:2,wells:2,range:8,flight:.5,frozenGain:.15,tickEvery:.5};
  case 'rimepetal':return {interval:1*faster,damage:42*power,petalDamage:28*power,petals:Math.min(7,4+Math.floor(up/3)),speed:12,life:1.2,petalLife:.5,bloomStacks:3,bloomDamage:50*power,slow:1.5,bolts:3};
  case 'echolane':return {interval:1.1*faster,damage:22*power,passes:Math.min(6,3+Math.floor(up/3)),gain:.1,speed:13,life:4,bolts:2};
  case 'gravitystake':return {interval:1.45*faster,damage:12*power,length:Math.min(17,12+.6*up),pierce:Math.min(10,6+Math.floor(up/2)),implosion:160*power,isolation:5.2,delay:.58,stakes:4,implosions:1};
  default:return {interval:Infinity,damage:0};
 }
}

// What the next form level changes, for the reward screen.
export function formUpgradeLine(id,level){
 const now=formStats(id,level),next=formStats(id,level+1);
 if(SECOND_FORMS[id]?.curated)return `재융합 Lv.${level} → ${level+1} · 피해 +25% · ${SECOND_FORMS[id].follow.line} +25%`;
 if(GENERATED_FORMS[id]||SECOND_FORMS[id])return `${SECOND_FORMS[id]?'재융합':'진화'} Lv.${level} → ${level+1} · 피해 +25%${next.pierce!==now.pierce?` · 관통 ${now.pierce} → ${next.pierce}`:''}${next.bounces!==now.bounces?` · 튕김 ${now.bounces} → ${next.bounces}`:''}`;
  const count=({mirrormaze:['bounces','튕김'],fullbloom:['petals','꽃잎'],thunderweb:['jumps','번개 도약'],starring:['petals','꽃잎'],glassspear:['pierce','관통'],flarebloom:['embers','불씨'],rewind:['leaves','잎'],blackhole:['radius','끌림 반경'],winterbreath:['range','숨결 거리'],frostguard:['satellites','위성'],returnblade:['hitsPerLeg','왕복당 타격'],prism:['generations','갈라짐'],thunderlance:['pierce','관통'],stormcrown:['orbs','번개 구슬'],seedstorm:['seeds','씨앗'],mirrorguard:['mirrors','거울'],collapse:['radius','붕괴 반경'],frostbloom:['radius','얼음 반경'],tidepull:['radius','소용돌이 반경'],gravitymirror:['bounces','튕김'],chainburst:['jumps','연쇄'],blastlance:['pierce','관통'],frostkaleidoscope:['bounces','튕김'],lightningpetal:['petals','전기 꽃잎'],returnflare:['homeRadius','귀환 폭발 반경'],comethalo:['comets','혜성 꽃봉오리'],stormanchor:['jumps','연쇄'],returningpetals:['petals','귀환 꽃잎'],gravitystake:['pierce','관통 깊이']})[baseFormOf(id)];
 const parts=[`진화 Lv.${level} → ${level+1}`,`피해 +25%`];
 if(count&&next[count[0]]!==now[count[0]]){const f=v=>Number.isInteger(v)?v:v.toFixed(1);parts.push(`${count[1]} ${f(now[count[0]])} → ${f(next[count[0]])}`);}
 return parts.join(' · ');
}
