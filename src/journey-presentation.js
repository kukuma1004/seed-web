// Ephemeral, presentation-only events. Combat, rewards, RNG and checkpoints
// never read this state. One bounded cue replaces the previous cue.
const MODES=new Set(['playing','cards','forms','evolving','dash-evolution']);
export function journeyPresentationContext(region,mode,survival,mirror,training,expansion){
 return region==='garden'&&!survival&&!mirror&&!training&&!expansion&&MODES.has(mode);
}
export function createJourneyPresentation({onBossEntry=()=>{}}={}){
 const forms=new Set(),state={serial:0,kind:'none',title:'',detail:'',kicker:'',age:0,duration:0,x:0,z:0,color:0xc7efd2,active:false};
 let boss=null,phase=null,defeated=null;
 function cue(kind,title,detail,kicker,duration,point,color=0xc7efd2){
  state.serial++;state.kind=kind;state.title=String(title||'').slice(0,64);state.detail=String(detail||'').slice(0,140);state.kicker=kicker;
  state.age=0;state.duration=duration;state.x=Number.isFinite(point?.x)?point.x:0;state.z=Number.isFinite(point?.z)?point.z:0;state.color=color;state.active=true;
 }
 function reset(held=new Map()){
  forms.clear();for(const id of held.keys())forms.add(id);
  boss=defeated=null;phase=null;state.active=false;state.kind='none';state.age=state.duration=0;state.serial++;
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
  if(boss!==actor){boss=actor;phase=current;cue('boss',title,'시계의 예고를 읽고, 공격 뒤의 틈을 잡으세요','정원의 결전',2,actor.g?.position,0xf0c87e);onBossEntry();return true;}
  if(current&&current!==phase){phase=current;cue('phase',phaseLabel,'탄막이 빨라집니다 · 새로운 예고를 읽으세요','오스틴의 리듬이 바뀐다',1.55,actor.g?.position,0xefb27d);return true;}
  return false;
 }
 function defeat(actor,title,ordinal){
  if(!actor?.dead||!Number.isFinite(actor.hp)||actor.hp>0||defeated===actor)return false;
  defeated=actor;const n=Math.max(1,Math.min(3,Math.floor(Number(ordinal)||1)));
  cue('defeat',title+' 격파',n===3?'세 번째 결전 승리 · 완주 기록 확인':`${n}/3 결전 승리 · 씨앗의 여정은 이어집니다`,'정원에 빛이 돌아온다',2.15,actor.g?.position,0xf0d897);return true;
 }
 return {reset,syncForms,observeBoss,defeat,
  cover(){if(state.kind==='defeat')state.active=false;},
  law(title,detail,point,color){cue('law',title,detail,'새 법칙이 깨어난다',1.4,point,color);},
  step(dt,advancing=true){if(!state.active||!advancing)return state;state.age+=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));if(state.age>=state.duration)state.active=false;return state;},
  state:()=>state
 };
}
