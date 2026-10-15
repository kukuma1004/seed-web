// Ephemeral, presentation-only events. Combat, rewards, RNG and checkpoints
// never read this state. One bounded cue and one base-transfer accent.
const MODES=new Set(['playing','cards','forms','evolving','dash-evolution']);
const BOSS_COPY={
 austin:{entry:'시계의 예고를 읽고, 공격 뒤의 틈을 잡으세요',arena:'정원의 결전',phase:'오스틴의 리듬이 바뀐다',detail:'탄막이 빨라집니다 · 새로운 예고를 읽으세요',win:'정원에 빛이 돌아온다'},
 alwaysbeginner:{entry:'투구와 질주를 읽고, 베이스로 틈을 만드세요',arena:'밤구장의 결전',phase:'항상초심의 승부가 깊어진다',details:{rally:'공격 사이가 짧아집니다 · 베이스로 거리를 벌리세요',finish:'연속 공격에 주의 · 예고가 끝난 뒤 이동하세요'},win:'구장에 환호가 번진다'},
 tempestcarrier:{entry:'기체의 예고를 읽고, 열린 항로에서 반격하세요',arena:'폭풍 너머의 결전',phase:'요한의 폭풍핵이 깨어난다',details:{1:'호위 편대 합류 · 기체와 측면을 함께 보세요',2:'폭풍핵 개방 · 원형 탄막 사이의 틈을 찾으세요'},win:'폭풍 너머로 빛이 스민다'},
 crosswindKeeper:{entry:'잠긴 사선을 피하고, 공격 뒤 회복할 때 반격하세요',arena:'횡풍이 모이는 자리',phase:'횡풍의 공세가 거세진다',details:{1:'뒤쪽 사선도 살피세요 · 공격 뒤 반격',2:'빨라진 탄환에 주의 · 돌진 뒤 틈을 노리세요'},win:'횡풍 너머에 길이 열린다'},
 crystalGardener:{entry:'심장과 보스를 함께 보세요 · 열린 꽃심을 노리세요',arena:'수정 심장의 결전',phase:'수정의 공세가 거세진다',details:{1:'보스와 재생 습격대를 함께 살피세요',2:'포탑을 지원하며, 꽃심이 열리는 틈에 반격하세요'},win:'수정 정원에 빛이 돌아온다'}
};
const IMPORTANT=new Set(['boss','phase','growth','law','defeat','night','repair','core-alert','opportunity']);
const EXPANSION_ACTS=new Set(['crosswind','crystalGorge']),EXPANSION_PHASES=new Set(['course','boss']),COVERED=new Set(['defeat','tailwind','night','support','repair','core-alert','opportunity','route']);
const bossId=actor=>actor.expansionBoss?actor.expansionMotion?.id:actor.type;
export function journeyPresentationContext(region,mode,survival,mirror,training,expansion){
 if(survival||mirror||training||!MODES.has(mode))return false;
 if(expansion)return EXPANSION_ACTS.has(expansion.act)&&EXPANSION_PHASES.has(expansion.phase);
 return region==='garden'||region==='stadium'||region==='skyway';
}
export function createJourneyPresentation({onBossEntry=()=>{}}={}){
 const travel={active:false,stage:'none',age:0,duration:0,x:0,z:0,targetX:0,targetZ:0};
 const forms=new Set(),state={serial:0,kind:'none',title:'',detail:'',kicker:'',age:0,duration:0,x:0,z:0,color:0xc7efd2,active:false,travel};
 let boss=null,phase=null,defeated=null,route=null,routePhase=null,tactic=null,tailActive=false,siegeState=null,siegePhase=null,coreHp=NaN,coreWarned=false,supportPad=null,supportCooldown=0,repairTime=-1,expansionActor=null,expansionState=null,coreOpen=false,exitAnnounced=false;
 function cue(kind,title,detail,kicker,duration,point,color=0xc7efd2){
  state.serial++;state.kind=kind;state.title=String(title||'').slice(0,64);state.detail=String(detail||'').slice(0,140);state.kicker=kicker;
  state.age=0;state.duration=duration;state.x=Number.isFinite(point?.x)?point.x:0;state.z=Number.isFinite(point?.z)?point.z:0;state.color=color;state.active=true;
 }
 function reset(held=new Map()){
  forms.clear();for(const id of held.keys())forms.add(id);
  boss=defeated=route=tactic=siegeState=expansionActor=null;phase=routePhase=siegePhase=expansionState=null;tailActive=coreWarned=coreOpen=exitAnnounced=false;coreHp=NaN;supportPad=null;supportCooldown=0;repairTime=-1;state.active=false;state.kind='none';state.age=state.duration=0;state.serial++;cancelSlide();
 }
 function syncForms(held,catalog,announce,point){
  let added=null;for(const id of held.keys())if(!forms.has(id)&&catalog[id])added=id;
  forms.clear();for(const id of held.keys())forms.add(id);
  if(announce&&added){const f=catalog[added];cue('growth',f.name,'새로운 전투 방식이 깨어났습니다','씨앗이 진화했다',1.75,point);return added;}
  return null;
 }
 function observeBoss(actor,title,phaseLabel){
  if(!actor||actor.dead||!(actor.hp>0))return false;
  const current=actor.expansionBoss?actor.expansionMotion?.phase:actor.type==='tempestcarrier'?actor.phaseIndex:actor.phasePending||actor.phase,copy=BOSS_COPY[bossId(actor)]||BOSS_COPY.austin;
  if(boss!==actor){boss=actor;phase=current;cue('boss',title,copy.entry,copy.arena,2,actor.g?.position,0xf0c87e);onBossEntry();return true;}
  if(current!=null&&current!==phase){phase=current;cue('phase',phaseLabel,copy.details?.[current]||copy.detail,copy.phase,1.55,actor.g?.position,0xefb27d);return true;}
  return false;
 }
 function defeat(actor,title,ordinal){
  if(!actor?.dead||!Number.isFinite(actor.hp)||actor.hp>0||defeated===actor)return false;
  defeated=actor;const n=Math.max(1,Math.min(3,Math.floor(Number(ordinal)||1)));
  cancelSlide();cue('defeat',title+' 격파',actor.expansionBoss&&ordinal==null?'로컬 보스 시연 · 계정 기록과 보상 제외':n===3?'세 번째 결전 승리 · 완주 기록 확인':`${n}/3 결전 승리 · 씨앗의 여정은 이어집니다`,(BOSS_COPY[bossId(actor)]||BOSS_COPY.austin).win,2.15,actor.g?.position,0xf0d897);return true;
 }
 function minor(kind,title,detail,kicker,duration,point,color=0xb8e7ce){
  if(state.active&&IMPORTANT.has(state.kind))return false;
  cue(kind,title,detail,kicker,duration,point,color);return true;
 }
 function observeTactics(signature,siege=null){
  if(!signature||!EXPANSION_ACTS.has(signature.act))return false;
  if(tactic!==signature){tactic=signature;tailActive=false;siegeState=null;supportPad=null;supportCooldown=0;repairTime=-1;}
  if(signature.act==='crosswind'){
   const gained=signature.tailwind>0&&!tailActive;tailActive=signature.tailwind>0;
   return gained?minor('tailwind','돌파 순풍','앞 편대 격파 · 이동 속도 +40%','앞을 끊어 얻은 기회',1.3):false;
  }
  if(!siege)return false;
  if(siegeState!==siege){siegeState=siege;siegePhase=siege.phase;coreHp=siege.core.hp;coreWarned=false;supportPad=null;repairTime=-1;}
  const night=siegePhase!==siege.phase&&siege.phase==='defense',danger=Number.isFinite(coreHp)&&siege.core.hp<coreHp&&siege.core.hp>0&&siege.core.hp<=50&&!coreWarned;
  siegePhase=siege.phase;coreHp=siege.core.hp;
  let shown=false;
  if(danger){coreWarned=true;if(state.kind!=='defeat'||!state.active){cue('core-alert','심장이 위험해요','심장 가까운 습격대부터 끊으세요','정원의 심장',1.7,siege.core,0xefad88);shown=true;}}
  if(night)shown=minor('night','심장 방어 시작','포탑 곁에서 지원 · 시설을 노리는 돌격대를 끊으세요','정원에 밤이 내려온다',1.7)||shown;
  const repaired=signature.out?.repaired;
  if(repaired&&repairTime!==signature.time){repairTime=signature.time;const pad=siege.pads.find(p=>p.id===repaired);shown=minor('repair','시설 수리 완료','수정 1을 사용했어요 · 시설이 다시 버팁니다','시설에 새잎이 돋는다',1.4,pad)||shown;}
  const entered=signature.rallyPad&&signature.rallyPad!==supportPad;supportPad=signature.rallyPad;
  if(entered&&signature.rallyKind==='turret'&&supportCooldown<=0){supportCooldown=3;shown=minor('support','포탑 지원 중','곁의 포탑 피해 +50% · 벗어나면 지원 종료','씨앗과 포탑의 합동 공격',1.25)||shown;}
  return shown;
 }
 function observeExpansionBoss(actor,out){
  const model=actor?.expansionMotion,id=model?.id;
  if(!actor?.expansionBoss||id!=='crosswindKeeper'&&id!=='crystalGardener'||actor.dead||!(actor.hp>0))return false;
  const announced=observeBoss(actor,actor.config?.name,model.phase===2?'마지막 공세':'공세 강화');
  const fresh=expansionActor!==actor,opening=!fresh&&(id==='crosswindKeeper'?expansionState==='attack'&&model.state==='recover':!coreOpen&&out?.coreOpen);
  expansionActor=actor;expansionState=model.state;coreOpen=Boolean(out?.coreOpen);
  if(opening&&model.timer>0)return minor('opportunity',id==='crosswindKeeper'?'공격 뒤 반격의 틈':'꽃심이 열렸다',id==='crosswindKeeper'?'회복 중인 보스에게 피해 +35%':'열린 꽃심에 피해 +30%','지금이 반격할 기회',Math.min(1.1,model.timer),actor.g?.position,0xe9d6a4)||announced;
  return announced;
 }
 function observeSkyway(signature){
  if(signature?.act!=='skyway'||!Number.isFinite(signature.lane))return false;
  if(route===signature&&routePhase===signature.phase)return false;
  route=signature;routePhase=signature.phase;
  // Record a suppressed transition too: never replay an old weather warning
  // after a boss phase, growth choice, victory, or room-entry restore.
  if(!['warning','storm'].includes(routePhase)||state.active&&!['storm','opening'].includes(state.kind))return false;
  const lane=signature.lane<0?'왼쪽':signature.lane>0?'오른쪽':'중앙';
  if(routePhase==='warning')cue('storm','폭풍 접근 · '+lane,lane+' 항로로 이동 · 적의 탄환은 계속 피하세요','바뀌는 폭풍 항로',1.45,null,0xe7b789);
  else cue('opening','반격 항로 개방','밝은 항로 안에서 공격 빈도 +25%','폭풍 속에서 찾은 틈',1.55,null,0xb8e7ce);
  return true;
 }
 function cancelSlide(){travel.active=false;travel.stage='none';travel.age=travel.duration=0;}
 function beginSlide(slide,point){
  if(!slide||!Number.isFinite(slide.duration)||slide.duration<=0||!Number.isFinite(point?.x)||!Number.isFinite(point?.z)||!Number.isFinite(slide.targetX)||!Number.isFinite(slide.targetZ)||Math.hypot(slide.targetX-point.x,slide.targetZ-point.z)<.1||travel.active&&travel.stage==='flight')return false;
  travel.active=true;travel.stage='flight';travel.age=0;travel.duration=Math.min(1.5,slide.duration+.15);
  travel.x=point.x;travel.z=point.z;travel.targetX=slide.targetX;travel.targetZ=slide.targetZ;return true;
 }
 function landSlide(point){
  if(!travel.active||travel.stage!=='flight'||!Number.isFinite(point?.x)||!Number.isFinite(point?.z)||Math.hypot(point.x-travel.targetX,point.z-travel.targetZ)>.1)return false;
  travel.stage='land';travel.age=0;travel.duration=.42;return true;
 }
 function canGuideExit(){return !exitAnnounced&&(!state.active||!IMPORTANT.has(state.kind));}
 function guideExit(next){if(!next||!canGuideExit())return false;cue('route',next.title,next.detail,'관문을 넘었다',next.automatic?.85:2.4,null,0xe8d9ad);exitAnnounced=true;return true;}
 return {reset,syncForms,observeBoss,observeSkyway,observeTactics,observeExpansionBoss,defeat,beginSlide,landSlide,cancelSlide,canGuideExit,guideExit,
  cover(){if(COVERED.has(state.kind))state.active=false;cancelSlide();},
  law(title,detail,point,color){cue('law',title,detail,'새 법칙이 깨어난다',1.4,point,color);},
  step(dt,advancing=true){if(!advancing)return state;const step=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));supportCooldown=Math.max(0,supportCooldown-step);if(state.active){state.age+=step;if(state.age>=state.duration)state.active=false;}if(travel.active){travel.age+=step;if(travel.age>=travel.duration)cancelSlide();}return state;},
  state:()=>state
 };
}
