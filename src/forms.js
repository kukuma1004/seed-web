// Final forms: two held laws fuse into one attack with its own shape, range and weakness.
// Every law is an ingredient of at least two forms, so any build has somewhere to grow.
const form=(id,requires,name,desc,strength,weakness,passive=false)=>Object.freeze({id,name,requires:Object.freeze(requires),pair:'',desc,strength,weakness,passive});
const LAW_KO={reflect:'반사',split:'분열',chain:'연쇄',orbit:'공전',pierce:'관통',burst:'폭발',recall:'귀환',gravity:'중력',frost:'빙결'};
const withPair=f=>Object.freeze({...f,pair:f.requires.map(id=>LAW_KO[id]).join(' + ')});

export const FORMS=Object.freeze(Object.fromEntries([
 form('collapse',['gravity','burst'],'붕괴의 씨앗','느린 씨앗탄이 적을 모은 뒤 한꺼번에 붕괴합니다.','밀집한 적을 모아 한 번에 처치','발사가 느려 흩어진 적과 빠른 접근에 취약'),
 form('frostguard',['orbit','frost'],'서리 위성','커다란 서리 위성이 가까운 적을 늦추고 밀어냅니다.','가까이 몰려드는 적을 제압','멀리 떨어진 사격 적을 상대하기 어려움',true),
 form('returnblade',['recall','pierce'],'귀환의 칼날','큰 칼날이 적의 열을 관통하고 씨앗에게 돌아옵니다.','움직임으로 귀환 경로를 바꾸어 왕복 타격','적을 경로에 모으지 못하면 화력 손실'),
 form('prism',['reflect','split'],'프리즘 가시','벽에 부딪힐 때마다 두 갈래로 갈라지는 수정 가시를 쏩니다.','벽과 엄폐물이 많은 방에서 가시가 불어남','트인 공간과 코앞의 적에게는 갈라질 벽이 없음'),
 form('thunderlance',['pierce','chain'],'천둥 창','긴 번개 창이 한 줄의 적을 꿰뚫고, 꿰뚫린 적에게서 번개가 퍼집니다.','줄지어 오는 적과 먼 거리','발사가 느리고 엄폐물에 막히며 흩어진 적에 약함'),
 form('frostbloom',['burst','frost'],'서리 꽃봉오리','목표 지점에 봉오리를 던져 얼린 뒤, 잠시 후 얼음째 부숩니다.','몰려오는 무리를 멈추고 한꺼번에 부숨','떨어지기까지 지연 · 빠른 적은 빠져나감'),
 form('stormcrown',['orbit','chain'],'폭풍 왕관','주위를 도는 번개 구슬이 가까운 적에게 스스로 번개를 떨어뜨립니다.','움직이며 주변을 자동으로 정리','사거리가 짧아 멀리 있는 사수·포탑을 못 맞힘',true),
 form('tidepull',['gravity','recall'],'끌어당기는 조수','소용돌이를 던지면 적을 휘감아 씨앗 쪽으로 끌고 돌아와 터집니다.','흩어진 적을 한곳으로 모음','위험한 적까지 내 곁으로 데려옴'),
 form('seedstorm',['split','burst'],'씨앗 폭풍','짧은 거리에 터지는 씨앗을 부채꼴로 흩뿌립니다.','가까이 붙은 무리를 순식간에 정리','사거리가 짧아 멀리서 쏘는 적에게 약함'),
 form('mirrorguard',['orbit','reflect'],'거울 수호','주위를 도는 거울이 날아오는 적 탄환을 되받아 가장 가까운 적에게 돌려보냅니다.','사수·포탑·문지기의 탄막을 공격으로 바꿈','탄을 쏘지 않는 근접 무리에게는 약함',true)
].map(f=>[f.id,withPair(f)])));

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
export function formStats(id,level=1){
 const L=Math.max(1,Math.floor(level)),up=L-1,power=1+.25*up,faster=Math.max(.55,1-.05*up);
 switch(id){
  case 'collapse':return {interval:1.05*faster,damage:86*power,radius:Math.min(4.2,3.1+.15*up),bolts:5,wells:3};
  case 'frostguard':return {interval:Infinity,damage:24*power,satellites:Math.min(6,3+Math.floor(up/2)),radius:2.5,slow:1.5};
  case 'returnblade':return {interval:.9*faster,damage:34*power,hitsPerLeg:Math.min(9,5+up),bolts:5};
  case 'prism':return {interval:.7*faster,damage:26*power,generations:Math.min(4,2+Math.floor(up/2)),shards:24,speed:11};
  case 'thunderlance':return {interval:1.25*faster,damage:40*power,length:Math.min(15,11+.8*up),pierce:Math.min(14,8+up),jumps:Math.min(5,1+Math.floor(L/2)),jumpDamage:18*power};
  case 'frostbloom':return {interval:1.4*faster,damage:30*power,shatter:45*power,radius:Math.min(3.4,2.4+.15*up),range:9,flight:.55,delay:.8,bombs:3};
  case 'stormcrown':return {interval:Infinity,damage:22*power,orbs:Math.min(5,2+Math.floor(L/2)),range:4.2,pulse:.75*faster,radius:1.6};
  case 'tidepull':return {interval:1.6*faster,damage:38*power,tick:10*power,radius:Math.min(3.4,2.2+.12*up),vortices:2};
  case 'seedstorm':return {interval:.95*faster,damage:14*power,pop:12*power,seeds:Math.min(12,6+L),spread:.55,life:.42};
  case 'mirrorguard':return {interval:Infinity,damage:30*power,mirrors:Math.min(5,2+Math.floor(L/2)),ram:10*power,radius:1.9};
  default:return {interval:Infinity,damage:0};
 }
}

// What the next form level changes, for the reward screen.
export function formUpgradeLine(id,level){
 const now=formStats(id,level),next=formStats(id,level+1);
 const count={frostguard:['satellites','위성'],returnblade:['hitsPerLeg','왕복당 타격'],prism:['generations','갈라짐'],thunderlance:['pierce','관통'],stormcrown:['orbs','번개 구슬'],seedstorm:['seeds','씨앗'],mirrorguard:['mirrors','거울'],collapse:['radius','붕괴 반경'],frostbloom:['radius','얼음 반경'],tidepull:['radius','소용돌이 반경']}[id];
 const parts=[`진화 Lv.${level} → ${level+1}`,`피해 +25%`];
 if(count&&next[count[0]]!==now[count[0]]){const f=v=>Number.isInteger(v)?v:v.toFixed(1);parts.push(`${count[1]} ${f(now[count[0]])} → ${f(next[count[0]])}`);}
 return parts.join(' · ');
}
