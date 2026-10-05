// Shared released encounter content. Journey, Survival and Defense promote
// both acts together and retain rollback guards for saved five-act circuits.
export const EXPANSION_ACTS=Object.freeze({
 crosswind:Object.freeze({number:4,name:'횡풍의 항로',grammar:'B',released:true,
  camera:'horizontal',bossId:'crosswindKeeper',bossName:'횡풍의 수호자',
  rooms:Object.freeze([
   {name:'잎배의 출항',role:'front',length:96,hint:'가까운 편대의 단발 사선을 피하며 전진하세요 · 위아래 가장자리로 반사 길을 만들 수 있어요'},
   {name:'뒤따르는 그림자',role:'rear',length:112,hint:'귀환하는 탄과 뒤따르는 적의 위치를 함께 보세요'},
   {name:'가지 사이의 교전',role:'split-lanes',length:120,hint:'위아래 가지 사이로 옮겨 사선을 바꾸세요'},
   {name:'횡풍 함대',role:'pincer',length:128,hint:'양쪽에서 오는 편대 중 한쪽을 먼저 끊으세요'},
   {name:'바람의 매듭',role:'warden',length:88,hint:'추격 뒤의 빈틈을 읽고 중앙에서 벗어나세요'}
  ].map(Object.freeze)),
  boss:Object.freeze({patterns:['locked-sweep','rear-salvo','crossing-flight'],windup:.75,recovery:1.1,maxProjectiles:48}),
  budget:Object.freeze({enemies:24,projectiles:48,props:16})}),
 crystalGorge:Object.freeze({number:5,name:'무너지는 수정 협곡',grammar:'F/K',released:true,
  camera:'corridor',bossId:'crystalGardener',bossName:'수정의 정원사',
  rooms:Object.freeze([
   {name:'수정의 틈',role:'teach-break',hint:'중앙 수정 하나를 깨면 짧은 길이 열려요 · 그대로 두면 옆길로 돌며 엄폐로 쓰세요'},
   {name:'돌아오는 빛',role:'reflect',hint:'벽의 각도로 사선을 꺾거나 길을 열어 직진하세요'},
   {name:'갈라진 온실',role:'two-routes',hint:'좁은 빠른 길과 넓은 돌아가는 길 중 골라 보세요'},
   {name:'무너지는 꽃길',role:'changing-cover',hint:'엄폐가 깨진 뒤에도 피할 공간을 남기세요'},
   {name:'수정의 문지기',role:'warden',hint:'벽 뒤에서 기다리는 적을 압축하거나 벽을 꿰뚫으세요'}
  ].map(Object.freeze)),
  boss:Object.freeze({patterns:['prism-fan','crystal-regrowth','open-core'],windup:.9,recovery:1.2,maxProjectiles:48}),
  budget:Object.freeze({enemies:24,projectiles:48,breakableWalls:20})})
});

// The three connected modes promote the same route together. One unfinished
// act must not turn a saved three-act circuit into a partly released circuit.
export function expansionCircuitReleased(acts=EXPANSION_ACTS){return acts?.crosswind?.released===true&&acts?.crystalGorge?.released===true;}
export function publicCircuitActCount(acts=EXPANSION_ACTS){return expansionCircuitReleased(acts)?5:3;}

// Counter-spawns never surround the player immediately. The lead lane is read
// first; rear threats begin only after the player has learned forward pressure.
export function crosswindFormation(index,room=0){
 const n=Math.max(0,Math.floor(index)),stage=Math.max(0,Math.min(4,room|0));
 const rear=stage>0&&n%6===5,lane=[-4.8,0,4.8][Math.floor(n/2)%3];
 return {side:rear?'rear':'front',lane,type:n%9===8?'charger':n%5===3&&stage>1?'lobber':'shooter',
  shots:stage===0?1:stage>2&&n%5===3?2:1,windup:rear?1.1:.7};
}

// Persistent IDs, not object indexes, allow a resumed run to preserve the exact
// opened route. Every build can break a wall; explosion is faster, never required.
export function createCrystalWalls(room=0){
 const stage=Math.max(0,Math.min(4,room|0));
 return Array.from({length:8+stage*2},(_,i)=>({id:`crystal-${stage}-${i}`,x:(i%2?1:-1)*(3+Math.floor(i/6)),z:-5+(i%6)*2,
  w:1.2,d:1.2,hp:120+stage*35,maxHp:120+stage*35,broken:false}));
}
export function hitCrystalWall(wall,damage,law){
 if(!wall||wall.broken||!Number.isFinite(damage)||damage<=0)return {damage:0,broken:false,passes:law==='pierce'};
 const amount=Math.min(wall.hp,damage*(law==='burst'?1.5:1));wall.hp=Math.max(0,wall.hp-amount);
 wall.broken=wall.hp===0;
 return {damage:amount,broken:wall.broken,passes:wall.broken||law==='pierce',reflects:!wall.broken&&law==='reflect'};
}
export function restoreCrystalWalls(room,saved){
 const walls=createCrystalWalls(room),byId=new Map((Array.isArray(saved)?saved:[]).filter(w=>w&&typeof w.id==='string').map(w=>[w.id,w]));
 for(const w of walls){const old=byId.get(w.id);if(old&&Number.isFinite(old.hp)){w.hp=Math.max(0,Math.min(w.maxHp,old.hp));w.broken=w.hp===0;}}
 return walls;
}
