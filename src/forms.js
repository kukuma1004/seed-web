// Final forms: two held laws fuse into one attack with its own shape, range and weakness.
// Every law is an ingredient of at least two forms, so any build has somewhere to grow.
const form=(id,requires,name,desc,strength,weakness,passive=false)=>Object.freeze({id,name,requires:Object.freeze(requires),pair:'',desc,strength,weakness,passive});
const LAW_KO={reflect:'반사',split:'분열',chain:'연쇄',orbit:'공전',pierce:'관통',burst:'폭발',recall:'귀환',gravity:'중력',frost:'빙결'};
const withPair=f=>Object.freeze({...f,pair:f.requires.map(id=>LAW_KO[id]).join(' + ')});

export const FORMS=Object.freeze(Object.fromEntries([
 form('collapse',['gravity','burst'],'붕괴의 씨앗','느린 씨앗탄이 적을 모은 뒤 한꺼번에 붕괴합니다.','밀집한 적을 모아 한 번에 처치','발사가 느려 흩어진 적과 빠른 접근에 취약'),
 form('frostguard',['orbit','frost'],'서리 위성','서리 위성이 적을 베어 얼리고 날아오는 탄환을 부수며(문지기 탄 제외), 주기적으로 주변을 얼리는 냉기를 터뜨립니다.','근접 제압과 탄막 방어를 함께','사거리가 짧아 멀리 있는 적은 직접 쫓아가야 함',true),
 form('returnblade',['recall','pierce'],'귀환의 칼날','큰 칼날이 적의 열을 관통하고 씨앗에게 돌아옵니다.','움직임으로 귀환 경로를 바꾸어 왕복 타격','적을 경로에 모으지 못하면 화력 손실'),
 form('prism',['reflect','split'],'프리즘 가시','벽에 부딪힐 때마다 두 갈래로 갈라지는 수정 가시를 쏩니다.','벽과 엄폐물이 많은 방에서 가시가 불어남','트인 공간과 코앞의 적에게는 갈라질 벽이 없음'),
 form('thunderlance',['pierce','chain'],'천둥 창','긴 번개 창이 한 줄의 적을 꿰뚫고, 꿰뚫린 적에게서 번개가 퍼집니다.','줄지어 오는 적과 먼 거리','발사가 느리고 엄폐물에 막히며 흩어진 적에 약함'),
 form('frostbloom',['burst','frost'],'서리 꽃봉오리','목표 지점에 봉오리를 던져 얼린 뒤, 잠시 후 얼음째 부숩니다.','몰려오는 무리를 멈추고 한꺼번에 부숨','떨어지기까지 지연 · 빠른 적은 빠져나감'),
 form('stormcrown',['orbit','chain'],'폭풍 왕관','주위를 도는 번개 구슬이 가까운 적에게 스스로 번개를 떨어뜨립니다.','움직이며 주변을 자동으로 정리','사거리가 짧아 멀리 있는 사수·포탑을 못 맞힘',true),
 form('tidepull',['gravity','recall'],'귀환 해일','해일핵이 전장을 왕복하며 적을 쓸어 모아 씨앗의 안전거리 앞까지 데려옵니다.','먼 무리를 왕복 경로로 긁어 한곳에 배달','좌우로 흩어진 적과 문지기·포탑은 끌 수 없음'),
 form('seedstorm',['split','burst'],'씨앗 폭풍','짧은 거리에 터지는 씨앗을 부채꼴로 흩뿌립니다.','가까이 붙은 무리를 순식간에 정리','사거리가 짧아 멀리서 쏘는 적에게 약함'),
 form('mirrorguard',['orbit','reflect'],'거울 수호','주위를 도는 거울이 날아오는 적 탄환을 되받아 가장 가까운 적에게 돌려보냅니다(문지기 탄 제외).','사수·포탑의 탄막을 공격으로 바꿈','탄을 쏘지 않는 근접 무리에게는 약함',true)
].map(f=>[f.id,withPair(f)])));

// Solo evolutions: one law raised far enough becomes an attack of its own.
// They live beside the ten fusions (FORMS stays fusion-only) and take one slot like a fusion does.
export const SOLO_LEVEL=5;
const solo=(id,law,name,desc,strength,weakness,passive=false)=>Object.freeze({id,name,requires:Object.freeze([law]),pair:`${LAW_KO[law]} 단독 진화`,desc,strength,weakness,passive,solo:true});
export const SOLO_FORMS=Object.freeze(Object.fromEntries([
 solo('mirrormaze','reflect','거울 미궁','벽을 여러 번 튕기는 거울탄을 쏩니다. 튕길 때마다 빨라지고 피해가 커집니다.','벽이 많은 방에서 튕길수록 강해짐','처음 한 방은 약하고, 트인 곳에서는 튕길 벽이 없음'),
 solo('fullbloom','split','만개한 꽃','맞은 적에게서 꽃잎이 둥글게 퍼지고, 꽃잎이 다시 한 번 갈라집니다.','무리 한가운데에서 연쇄로 퍼짐','혼자 있는 적에게는 퍼질 곳이 없음'),
 solo('thunderweb','chain','천둥 그물','가장 가까운 적에게서 시작한 번개가 여러 적 사이를 뛰어다닙니다.','흩어진 무리를 한 번에 훑음','뛸수록 약해지고 벽 너머로는 못 뜀'),
 solo('starring','orbit','별의 고리','넓어졌다 좁아지는 꽃잎 고리가 적을 베고 날아오는 탄을 막습니다(문지기 탄 제외).','가까이 오는 적과 탄막을 동시에 막음','멀리서 버티는 적은 직접 다가가야 함',true),
 solo('glassspear','pierce','유리 창날','아주 긴 창날이 한 줄을 꿰뚫고, 꿰뚫을수록 피해가 커집니다.','일렬로 선 적과 긴 복도','느리고, 옆으로 흩어진 적에게 약함'),
 solo('flarebloom','burst','불꽃 꽃다발','목표에 큰 폭발을 떨어뜨리고 주변에 작은 불씨 폭발이 이어집니다.','모여 있는 무리를 크게 태움','떨어지기까지 느려 빠른 적은 피함'),
 solo('rewind','recall','되감기 잎','잎이 날아갔다 돌아오기를 여러 번 되풀이합니다.','움직이며 같은 길을 여러 번 훑음','경로 밖의 적은 못 맞힘'),
 solo('blackhole','gravity','작은 블랙홀','목표에 멈춘 블랙홀이 한동안 적을 끌어당기며 계속 피해를 줍니다.','적을 한곳에 붙잡아 둠','순간 피해가 낮고 문지기는 끌려오지 않음'),
 solo('winterbreath','frost','겨울 숨결','앞쪽 부채꼴에 서리를 내뿜어 얼리고, 이미 느려진 적은 더 아프게 합니다.','가까운 무리를 얼려 멈춤','사거리가 짧고 등 뒤는 비어 있음')
].map(f=>[f.id,f])));
// Every evolution the seed can hold: the ten fusions and the nine solo evolutions.
// Awakened evolutions (2026-09-15): a fusion joined with the solo evolution of one of its laws, or the two solo evolutions
// of its laws, becomes that fusion's awakened self in one slot. It attacks as the fusion with part of the ultimate's boost
// built in (AWAKEN_BOOST) and repeats the fusion's opening move every AWAKEN.openingEvery seconds while enemies are near.
export const AWAKEN=Object.freeze({openingEvery:10,openingRange:12,surgeOpeningEvery:1.2,damage:1.25,interval:.8});
// The mirror's opening turns every enemy shot at once, so it does not repeat during the ultimate.
export const AWAKEN_SURGE_OPENING=Object.freeze({mirrorhall:Infinity});
export const awakenSurgeOpening=(id,twin=false)=>twin?TWIN.surgeOpeningEvery:AWAKEN_SURGE_OPENING[id]??AWAKEN.surgeOpeningEvery;
const awaken=(id,base,name,desc,strength,weakness)=>Object.freeze({id,name,base,requires:FORMS[base].requires,pair:`${FORMS[base].name} 각성`,desc,strength,weakness,passive:FORMS[base].passive,awakened:true});
export const AWAKEN_FORMS=Object.freeze(Object.fromEntries([
 awaken('bigcrunch','collapse','대붕괴','붕괴 씨앗과 우물이 늘고 더 넓게 무너지며, 10초마다 가까운 적 셋의 자리에 붕괴 우물을 한꺼번에 심습니다.','무리를 통째로 끌어모아 한 번에 붕괴','느린 발사는 그대로라 빠르게 파고드는 적에 주의'),
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
// Twin awakenings (2026-09-15): the 26 pairs of solo evolutions whose laws have no fusion recipe awaken too.
// Both solo attacks fight from one slot (each at TWIN.damage) and their opening moves take turns every AWAKEN.openingEvery seconds.
// Together with the ten fusion awakenings every one of the 36 solo pairs now leads somewhere.
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
 winterbreath:Object.freeze({word:'빙결',effect:'frost',bonus:.035})
});
const twin=(id,a,b,name,desc)=>{
 const A=SOLO_FORMS[a],B=SOLO_FORMS[b],parts=Object.freeze([a,b]),ta=TWIN_TRAITS[a],tb=TWIN_TRAITS[b];
 const synergy=Object.freeze({name:`${ta.word}·${tb.word} 공명`,window:2.6,bonus:.08+ta.bonus+tb.bonus,effects:Object.freeze([ta.effect,tb.effect])});
 return Object.freeze({id,name,parts,base:parts.find(p=>p==='starring')||a,requires:Object.freeze([A.requires[0],B.requires[0]]),pair:`${A.name} + ${B.name}`,desc,strength:`${A.strength} · ${B.strength}`,weakness:'두 공격의 약점은 각각 그대로',synergy,passive:false,awakened:true,twin:true});
};
export const TWIN_FORMS=Object.freeze(Object.fromEntries([
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
 twin('frozenhole','blackhole','winterbreath','얼어붙은 블랙홀','블랙홀로 붙잡은 무리를 숨결로 얼려 더 아프게 합니다.')
].map(f=>[f.id,f])));
// Every evolution the seed can hold: ten fusions, nine solo evolutions, ten fusion awakenings and 26 twin awakenings.
export const ALL_FORMS=Object.freeze({...FORMS,...SOLO_FORMS,...AWAKEN_FORMS,...TWIN_FORMS});
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
 prism:s=>({shards:s.shards+24,generations:s.generations+1}),
 thunderlance:s=>({jumps:s.jumps+2,pierce:s.pierce+4}),
 frostbloom:s=>({bombs:s.bombs+3,delay:s.delay*.5}),
 stormcrown:s=>({orbs:s.orbs+2,pulse:s.pulse*.55,range:s.range+1.5}),
 tidepull:s=>({vortices:s.vortices+2,radius:s.radius+1,hold:s.hold+.5}),
 seedstorm:s=>({seeds:s.seeds+3}),
 mirrorguard:s=>({mirrors:s.mirrors+3,radius:s.radius+.4}),
 mirrormaze:s=>({bolts:s.bolts+4,bounces:s.bounces+5}),
 fullbloom:s=>({bolts:s.bolts+2,petals:s.petals+1}),
 thunderweb:s=>({jumps:s.jumps+1,decay:Math.min(.93,s.decay+.02)}),
 starring:s=>({petals:s.petals+4,outer:s.outer+1,period:s.period*.5}),
 glassspear:s=>({pierce:s.pierce+6,length:s.length+3}),
 flarebloom:s=>({embers:s.embers+3,radius:s.radius+.6}),
 rewind:s=>({leaves:s.leaves+3,trips:s.trips+1}),
 blackhole:s=>({holes:s.holes+2,hold:s.hold+1}),
 winterbreath:s=>({range:s.range+1,cone:Math.min(Math.PI,s.cone*1.3)})
});
// While an ultimate runs every hit is heavier too (2026-09-15: players waited long and enemies still did not die).
export const SURGE_DAMAGE=1.6;
const DAMAGE_KEYS=['damage','nova','shatter','pop','tick','ram','jumpDamage','petalDamage','emberDamage','returnDamage'];
// Awakened: a lasting share of the surge. Counts grow a little, attacks come a little faster and hit a little harder;
// the ultimate still adds the full surge on top.
const AWAKEN_BOOST=Object.freeze({
 collapse:s=>({bolts:s.bolts+1,radius:s.radius+.3}),
 frostguard:s=>({satellites:Math.min(8,s.satellites+1),novaEvery:s.novaEvery*.65,novaRadius:s.novaRadius+.5}),
 returnblade:s=>({bolts:s.bolts+1,hitsPerLeg:s.hitsPerLeg+2}),
 prism:s=>({shards:s.shards+8,generations:s.generations+1}),
 thunderlance:s=>({jumps:s.jumps+1,pierce:s.pierce+2}),
 frostbloom:s=>({bombs:s.bombs+1,delay:s.delay*.85}),
 stormcrown:s=>({orbs:s.orbs+1,pulse:s.pulse*.85,range:s.range+.8}),
 tidepull:s=>({radius:s.radius+.5}),
 seedstorm:s=>({seeds:s.seeds+1}),
 mirrorguard:s=>({mirrors:s.mirrors+2,radius:s.radius+.2})
});
// Measured against the fusion plus its best solo evolution at equal levels (tools/active-balance-test.mjs).
const AWAKEN_DAMAGE=Object.freeze({collapse:1.05,frostguard:1.25,returnblade:1.15,prism:2.2,thunderlance:1.2,frostbloom:1,stormcrown:1.1,tidepull:1,seedstorm:.85,mirrorguard:1.8});
function awakenStats(id,s){
 const boosted={...s,...(AWAKEN_BOOST[id]?.(s)||{}),awakened:true};
 if(Number.isFinite(boosted.interval))boosted.interval*=AWAKEN.interval;
 for(const key of DAMAGE_KEYS)if(typeof boosted[key]==='number')boosted[key]*=AWAKEN_DAMAGE[id]??AWAKEN.damage;
 return boosted;
}
function surgeStats(id,s){
 const boosted={...s,...(SURGE[id]?.(s)||{}),surge:true};
 if(Number.isFinite(boosted.interval))boosted.interval*=.5;
 for(const key of DAMAGE_KEYS)if(typeof boosted[key]==='number')boosted[key]*=SURGE_DAMAGE;
 return boosted;
}
function baseStats(id,level){
 const L=Math.max(1,Math.floor(level)),up=L-1,power=1+.25*up,faster=Math.max(.55,1-.05*up);
 switch(id){
  // Solo evolutions. They start at evolution level 4 (law level 5), so their level-one numbers are modest.
  case 'mirrormaze':return {interval:.8*faster,damage:32*power,bounces:Math.min(12,5+Math.floor(up/2)),gain:.15,bolts:3,speed:12};
  case 'fullbloom':return {interval:.85*faster,damage:28*power,petals:Math.min(8,5+Math.floor(up/3)),petalDamage:14*power,bolts:4,speed:12};
  case 'thunderweb':return {interval:.85*faster,damage:36*power,jumps:Math.min(10,4+Math.floor(up/2)),range:4.5,decay:.88,reach:9};
  case 'starring':return {interval:Infinity,damage:20*power,petals:Math.min(9,5+Math.floor(up/2)),inner:1.5,outer:Math.min(4.2,3.2+.1*up),period:2.4,cooldown:.4};
  case 'glassspear':return {interval:1.1*faster,damage:42*power,length:Math.min(18,13+.8*up),pierce:Math.min(16,8+up),ramp:.12};
  case 'flarebloom':return {interval:1.3*faster,damage:48*power,radius:Math.min(3.2,2+.12*up),embers:Math.min(6,3+Math.floor(up/3)),emberDamage:22*power,emberRadius:1,range:9,flight:.5,bombs:3};
  case 'rewind':return {interval:.95*faster,damage:20*power,trips:Math.min(3,2+Math.floor(up/6)),leaves:Math.min(4,3+Math.floor(up/4)),hitsPerLeg:Math.min(8,4+Math.floor(up/2))};
  case 'blackhole':return {interval:1.9*faster,damage:8*power,radius:Math.min(4.4,2.6+.14*up),hold:2.2,pull:4.5,holes:2,range:8};
  case 'winterbreath':return {interval:.75*faster,damage:26*power,range:Math.min(6,4.2+.12*up),cone:.55,slow:1.8,frozenBonus:1.5};
  case 'collapse':return {interval:1.05*faster,damage:86*power,radius:Math.min(4.2,3.1+.15*up),bolts:5,wells:3};
  case 'frostguard':return {interval:Infinity,damage:40*power,satellites:Math.min(7,4+Math.floor(up/2)),radius:2.5,slow:2,cooldown:.35,nova:30*power,novaRadius:Math.min(4.2,3.2+.12*up),novaEvery:3*faster};
  case 'returnblade':return {interval:.9*faster,damage:34*power,hitsPerLeg:Math.min(9,5+up),bolts:5};
  case 'prism':return {interval:.7*faster,damage:26*power,generations:Math.min(4,2+Math.floor(up/2)),shards:24,speed:11};
  case 'thunderlance':return {interval:1.25*faster,damage:40*power,length:Math.min(15,11+.8*up),pierce:Math.min(14,8+up),jumps:Math.min(5,1+Math.floor(L/2)),jumpDamage:18*power};
  case 'frostbloom':return {interval:1.4*faster,damage:30*power,shatter:45*power,radius:Math.min(3.4,2.4+.15*up),range:9,flight:.55,delay:.8,bombs:3};
  case 'stormcrown':return {interval:Infinity,damage:22*power,orbs:Math.min(5,2+Math.floor(L/2)),range:4.2,pulse:.75*faster,radius:1.6};
  case 'tidepull':return {interval:1.45*faster,damage:50*power,tick:13*power,returnDamage:34*power,radius:Math.min(4,3+.12*up),vortices:2,hold:.18,pull:7.5,safeRadius:2.55,slow:.8};
  case 'seedstorm':return {interval:.95*faster,damage:14*power,pop:12*power,seeds:Math.min(12,6+L),spread:.55,life:.42};
  case 'mirrorguard':return {interval:Infinity,damage:30*power,mirrors:Math.min(5,2+Math.floor(L/2)),ram:10*power,radius:1.9};
  default:return {interval:Infinity,damage:0};
 }
}

// What the next form level changes, for the reward screen.
export function formUpgradeLine(id,level){
 const now=formStats(id,level),next=formStats(id,level+1);
 const count=({mirrormaze:['bounces','튕김'],fullbloom:['petals','꽃잎'],thunderweb:['jumps','번개 도약'],starring:['petals','꽃잎'],glassspear:['pierce','관통'],flarebloom:['embers','불씨'],rewind:['leaves','잎'],blackhole:['radius','끌림 반경'],winterbreath:['range','숨결 거리'],frostguard:['satellites','위성'],returnblade:['hitsPerLeg','왕복당 타격'],prism:['generations','갈라짐'],thunderlance:['pierce','관통'],stormcrown:['orbs','번개 구슬'],seedstorm:['seeds','씨앗'],mirrorguard:['mirrors','거울'],collapse:['radius','붕괴 반경'],frostbloom:['radius','얼음 반경'],tidepull:['radius','소용돌이 반경']})[baseFormOf(id)];
 const parts=[`진화 Lv.${level} → ${level+1}`,`피해 +25%`];
 if(count&&next[count[0]]!==now[count[0]]){const f=v=>Number.isInteger(v)?v:v.toFixed(1);parts.push(`${count[1]} ${f(now[count[0]])} → ${f(next[count[0]])}`);}
 return parts.join(' · ');
}
