// Ephemeral, presentation-only events. Combat, rewards, RNG and checkpoints
// never read this state. One bounded cue and one base-transfer accent.
const MODES=new Set(['playing','cards','forms','evolving','dash-evolution']);
export function journeyPresentationContext(region,mode,survival,mirror,training,expansion){
 return (region==='garden'||region==='stadium')&&!survival&&!mirror&&!training&&!expansion&&MODES.has(mode);
}
export function createJourneyPresentation({onBossEntry=()=>{}}={}){
 const travel={active:false,stage:'none',age:0,duration:0,x:0,z:0,targetX:0,targetZ:0};
 const forms=new Set(),state={serial:0,kind:'none',title:'',detail:'',kicker:'',age:0,duration:0,x:0,z:0,color:0xc7efd2,active:false,travel};
 let boss=null,phase=null,defeated=null;
 function cue(kind,title,detail,kicker,duration,point,color=0xc7efd2){
  state.serial++;state.kind=kind;state.title=String(title||'').slice(0,64);state.detail=String(detail||'').slice(0,140);state.kicker=kicker;
  state.age=0;state.duration=duration;state.x=Number.isFinite(point?.x)?point.x:0;state.z=Number.isFinite(point?.z)?point.z:0;state.color=color;state.active=true;
 }
 function reset(held=new Map()){
  forms.clear();for(const id of held.keys())forms.add(id);
  boss=defeated=null;phase=null;state.active=false;state.kind='none';state.age=state.duration=0;state.serial++;cancelSlide();
 }
 function syncForms(held,catalog,announce,point){
  let added=null;for(const id of held.keys())if(!forms.has(id)&&catalog[id])added=id;
  forms.clear();for(const id of held.keys())forms.add(id);
  if(announce&&added){const f=catalog[added];cue('growth',f.name,'새로운 전투 방식이 깨어났습니다','씨앗이 진화했다',1.75,point);return added;}
  return null;
 }
 function observeBoss(actor,title,phaseLabel){
  if(!actor||actor.dead||!(actor.hp>0))return false;
  const current=actor.phasePending||actor.phase;
  const stadium=actor.type==='alwaysbeginner';
  if(boss!==actor){boss=actor;phase=current;cue('boss',title,stadium?'투구와 질주를 읽고, 베이스로 틈을 만드세요':'시계의 예고를 읽고, 공격 뒤의 틈을 잡으세요',stadium?'밤구장의 결전':'정원의 결전',2,actor.g?.position,0xf0c87e);onBossEntry();return true;}
  if(current&&current!==phase){phase=current;cue('phase',phaseLabel,stadium?(current==='finish'?'연속 공격에 주의 · 예고가 끝난 뒤 이동하세요':'공격 사이가 짧아집니다 · 베이스로 거리를 벌리세요'):'탄막이 빨라집니다 · 새로운 예고를 읽으세요',stadium?'항상초심의 승부가 깊어진다':'오스틴의 리듬이 바뀐다',1.55,actor.g?.position,0xefb27d);return true;}
  return false;
 }
 function defeat(actor,title,ordinal){
  if(!actor?.dead||!Number.isFinite(actor.hp)||actor.hp>0||defeated===actor)return false;
  defeated=actor;const n=Math.max(1,Math.min(3,Math.floor(Number(ordinal)||1)));
  cancelSlide();cue('defeat',title+' 격파',n===3?'세 번째 결전 승리 · 완주 기록 확인':`${n}/3 결전 승리 · 씨앗의 여정은 이어집니다`,actor.type==='alwaysbeginner'?'구장에 환호가 번진다':'정원에 빛이 돌아온다',2.15,actor.g?.position,0xf0d897);return true;
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
 return {reset,syncForms,observeBoss,defeat,beginSlide,landSlide,cancelSlide,
  cover(){if(state.kind==='defeat')state.active=false;cancelSlide();},
  law(title,detail,point,color){cue('law',title,detail,'새 법칙이 깨어난다',1.4,point,color);},
  step(dt,advancing=true){if(!advancing)return state;const step=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));if(state.active){state.age+=step;if(state.age>=state.duration)state.active=false;}if(travel.active){travel.age+=step;if(travel.age>=travel.duration)cancelSlide();}return state;},
  state:()=>state
 };
}
