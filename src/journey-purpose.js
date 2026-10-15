// Presentation derives from canonical journey/campaign state; never awards or
// infers a victory from a room number, guard death, or broken scenery.
const bossNames={crosswind:'횡풍의 수호자',crystalGorge:'수정의 정원사'};
// Read the real open-exit state in the host before calling this. These words
// describe the next action; they never finalize a run or award a victory.
export function journeyRouteCue({region,stage,cycle=0,bossName='',bossAhead=false,bossWins=0,expansion=null,campaign=null,publicExpansion=false}={}){
 if(expansion){
  if(!Object.hasOwn(bossNames,expansion.act)||!['course','boss'].includes(expansion.phase)||!Number.isInteger(expansion.room)||expansion.room<0||expansion.room>4)return null;
  if(expansion.phase==='course')return expansion.room===4?{title:bossNames[expansion.act]+'에게',detail:'출구 너머에서 최종 보스와 맞섭니다',automatic:false}:{title:'다음 전장으로',detail:`${expansion.room+2}/5 전장 · 출구를 눌러 이동하세요`,automatic:false};
  if(!publicExpansion)return {title:'보스 검토 마치기',detail:'로컬 검토 · 계정 기록과 보상 제외',automatic:false};
  const wins=expansionBossProgress(expansion,campaign);
  return wins>=3?{title:'완주 정산으로',detail:'3/3 결전 승리 · 출구에서 기록을 마무리하세요',automatic:false}:{title:'다음 순환으로',detail:`${wins}/3 결전 승리 · 출구 너머로 이어집니다`,automatic:false};
 }
 if(!['garden','stadium','skyway'].includes(region)||!Number.isInteger(stage)||stage<0||stage>4)return null;
 const automatic=region==='skyway';
 if(stage<4)return {title:automatic?'다음 편대 접근':'다음 관문으로',detail:automatic?`${stage+2}번째 항로로 이어집니다`:`${stage+2}번째 관문 · 빛나는 출구로 이동하세요`,automatic};
 if(bossAhead)return {title:bossName+'에게',detail:automatic?'최종 보스가 항로에 들어옵니다':'출구 너머에서 최종 보스와 맞섭니다',automatic};
 return {title:'다음 여정으로',detail:`여정 ${Math.max(0,cycle|0)+2} · ${Math.max(0,Math.min(3,bossWins|0))}/3 결전 승리`,automatic};
}
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

export function journeyExitButtonLabel({stage=0,bossAhead=false,touch=false,expansion=null,campaign=null}={}){
 const label=expansion?expansionExitText(expansion,campaign):stage===4?(bossAhead?'최종 보스에게 · E':'다음 여정으로 · E'):'다음 방으로 · E';
 return touch?label.replace(/ · E$/,''):label;
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
