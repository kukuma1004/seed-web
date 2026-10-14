// Presentation derives from canonical journey/campaign state; never awards or
// infers a victory from a room number, guard death, or broken scenery.
const bossNames={crosswind:'횡풍의 수호자',crystalGorge:'수정의 정원사'};
export function expansionBossProgress(journey,campaign){
 const key=journey?.act==='crosswind'?'crosswindKeeper':'crystalGardener';
 return Math.max(0,Math.min(3,Number(campaign?.bossWins?.[key])||0));
}
export function expansionPurposeText(journey,campaign=null){
 if(!journey)return '';
 const progress=campaign?` · 최종 보스 ${expansionBossProgress(journey,campaign)}/3`:' · 로컬 검토';
 if(journey.phase==='boss')return `${bossNames[journey.act]} · 최종 보스 결전${progress}`;
 if(journey.siege)return `5막 · 심장 방어 ${journey.room+1}/5${progress}`;
 return `${journey.act==='crosswind'?'4막 · 항로 돌파':'5막 · 이전 협곡 여정'} ${journey.room+1}/5${progress}`;
}
export function expansionPurposeHint(journey,roomHint=''){
 if(journey?.phase==='boss')return journey.siege?'수정의 정원사와 결전 · 새로 자라는 습격대를 먼저 끊어 심장을 지키세요':'최종 보스의 준비 동작을 피하고 회복할 때 반격하세요';
 return journey?.siege?'수정 채집 → 시설 심기 · 밤에는 포탑 지원과 수리 · 다섯 습격 뒤 최종 보스':journey?.act==='crystalGorge'?`이전 협곡 저장을 이어갑니다 · ${roomHint}`:journey?.act==='crosswind'&&journey.course?.encounterVersion===3?`전진하면 다음 편대가 옵니다 · 앞 편대를 끊으면 순풍 · ${roomHint}`:roomHint;
}
export function expansionExitText(journey,campaign=null){
 if(journey.phase==='course')return journey.room===4?'최종 보스에게 · E':'다음 전장으로 · E';
 if(!campaign)return '로컬 보스 검토 마치기 · E';
 const wins=expansionBossProgress(journey,campaign);
 return wins>=3?'보스 3회 격파 · 완주 정산 · E':`다음 순환으로 · 보스 ${wins}/3 · E`;
}

// The final siege arena keeps one horizontal approach to the heart. The
// surrounding crystals remain cover; regrowth must not seal this route.
export function keepCrystalBossApproachOpen(walls){
 let changed=false;for(const w of walls)if(Math.abs(w.z)<w.d/2+.75&&!w.broken){w.hp=0;w.broken=true;changed=true;}return changed;
}

// At most two guards at each real HP phase's regrowth attack (six in a boss
// fight). Output is consumed by the host, which owns HP, damage and disposal.
// No new saved fields: room-entry restore restarts the encounter as before.
export function crystalBossGuardSpawns(actor,events,live=0){
 if(actor?.expansionMotion?.id!=='crystalGardener'||!events?.some(e=>e.type==='crystal-regrowth')||actor.dead||actor.hp<=0)return [];
 const phase=Math.min(2,Math.max(0,actor.expansionMotion.phase|0)),mask=1<<phase;
 if((actor.siegeGuardMask||0)&mask||live>=4)return [];
 actor.siegeGuardMask=(actor.siegeGuardMask||0)|mask;
 return Array.from({length:Math.min(2,4-live)},(_,i)=>({
  id:`boss-root-${phase}-${i}`,position:{x:i?6.8:-6.8,z:phase%2?-3.6:3.6},approachPoint:{x:i?6.8:-6.8,z:0},
  type:'charger',side:'front',hp:48+phase*18,speed:1.6+phase*.15,
  damage:7+phase*2,shots:1,windup:1,cooldown:1,bulletSpeed:5,siegeGuard:true
 }));
}
