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
 form('tidepull',['gravity','recall'],'끌어당기는 조수','소용돌이가 멀리서 적을 묶어 휘감고 터진 뒤, 적은 두고 씨앗에게 돌아옵니다.','안전거리 밖에 무리를 묶고 계속 피해','문지기와 포탑은 끌 수 없어 직접 위치를 잡아야 함'),
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
export const ALL_FORMS=Object.freeze({...FORMS,...SOLO_FORMS});
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
export function formStats(id,level=1,{surge=false}={}){
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
const DAMAGE_KEYS=['damage','nova','shatter','pop','tick','ram','jumpDamage','petalDamage','emberDamage'];
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
  case 'tidepull':return {interval:1.45*faster,damage:56*power,tick:16*power,radius:Math.min(3.8,2.7+.12*up),vortices:2,hold:.75,pull:6,safeRadius:2.45,slow:1.25};
  case 'seedstorm':return {interval:.95*faster,damage:14*power,pop:12*power,seeds:Math.min(12,6+L),spread:.55,life:.42};
  case 'mirrorguard':return {interval:Infinity,damage:30*power,mirrors:Math.min(5,2+Math.floor(L/2)),ram:10*power,radius:1.9};
  default:return {interval:Infinity,damage:0};
 }
}

// What the next form level changes, for the reward screen.
export function formUpgradeLine(id,level){
 const now=formStats(id,level),next=formStats(id,level+1);
 const count={mirrormaze:['bounces','튕김'],fullbloom:['petals','꽃잎'],thunderweb:['jumps','번개 도약'],starring:['petals','꽃잎'],glassspear:['pierce','관통'],flarebloom:['embers','불씨'],rewind:['leaves','잎'],blackhole:['radius','끌림 반경'],winterbreath:['range','숨결 거리'],frostguard:['satellites','위성'],returnblade:['hitsPerLeg','왕복당 타격'],prism:['generations','갈라짐'],thunderlance:['pierce','관통'],stormcrown:['orbs','번개 구슬'],seedstorm:['seeds','씨앗'],mirrorguard:['mirrors','거울'],collapse:['radius','붕괴 반경'],frostbloom:['radius','얼음 반경'],tidepull:['radius','소용돌이 반경']}[id];
 const parts=[`진화 Lv.${level} → ${level+1}`,`피해 +25%`];
 if(count&&next[count[0]]!==now[count[0]]){const f=v=>Number.isInteger(v)?v:v.toFixed(1);parts.push(`${count[1]} ${f(now[count[0]])} → ${f(next[count[0]])}`);}
 return parts.join(' · ');
}
