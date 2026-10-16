// Journey-only tactical rules. No new account, score, RNG or checkpoint fields.
// A room-entry restore restarts these short encounter beats with that room.
import {crystalSiegeFacilityMaxHp} from './crystal-siege-rules.js';
export const JOURNEY_SIGNATURE_RULES=Object.freeze({stormPeriod:10.5,stormDelay:4,stormWarning:1.8,stormActive:2.8,stormHalfGap:2.4,stormDamage:8,stormHitPeriod:.9,attackScale:1.25,tailwindDuration:2.2,tailwindMove:1.4,rallyRadius:1.7,rallyDamage:1.5,repairTime:1.5,repairHp:25,repairCooldown:4});
const lanes=[0,-5,5],valid=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
const delta=dt=>Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
export function createJourneySignature(act,room=0){
 if(!['skyway','crosswind','crystalGorge'].includes(act))return null;
 return {act,room:Math.max(0,Math.min(4,room|0)),time:0,phase:'quiet',lane:0,stormHit:0,tailwind:0,rallyPad:null,rallyKind:null,repairPad:null,repairCharge:0,repairCooldown:0,out:{damage:0,warning:false,repaired:null}};
}
export function creditJourneySignatureKill(s,actor,player){
 // Only a genuine living-course enemy, actually killed ahead of the player.
 // Bosses, rear clean-up, scenery and other game modes never grant a wind.
 if(s?.act!=='crosswind'||!actor?.dead||actor.hp>0||actor.journeyWindCredited||actor.expansionBoss||!actor.expansionActor||actor.expansionThreat?.side!=='front'||!valid(actor.g?.position)||!valid(player)||actor.g.position.x<player.x)return false;
 actor.journeyWindCredited=true;s.tailwind=JOURNEY_SIGNATURE_RULES.tailwindDuration;return true;
}
export function stepJourneySignature(s,dt,{player,siege=null,boss=false,cleared=false}={}){
 if(!s)return null;const o=s.out;o.damage=0;o.warning=false;o.repaired=null;
 const d=delta(dt);if(!d||cleared||!valid(player))return o;s.time+=d;
 if(s.act==='skyway'){
  const r=JOURNEY_SIGNATURE_RULES,t=s.time-r.stormDelay,beat=t<0?-1:Math.floor(t/r.stormPeriod),within=t<0?0:t%r.stormPeriod;
  const next=beat<0?'quiet':within<r.stormWarning?'warning':within<r.stormWarning+r.stormActive?'storm':'quiet';
  o.warning=next==='warning'&&s.phase!=='warning';s.phase=next;s.lane=lanes[(Math.max(0,beat)+s.room)%3];
  s.stormHit=Math.max(0,s.stormHit-d);
  if(next==='storm'&&Math.abs(player.x-s.lane)>r.stormHalfGap&&s.stormHit<=0){o.damage=r.stormDamage;s.stormHit=r.stormHitPeriod;}
 }else if(s.act==='crosswind')s.tailwind=Math.max(0,s.tailwind-d);
 else{
  s.rallyPad=null;s.rallyKind=null;if(siege){siege.journeyRallyPad=null;siege.journeyCommand=true;}s.repairCooldown=Math.max(0,s.repairCooldown-d);
  if(!siege||siege.core.hp<=0||!(siege.phase==='defense'||boss&&siege.phase==='clear')){s.repairPad=null;s.repairCharge=0;return o;}
  let nearest=null,best=JOURNEY_SIGNATURE_RULES.rallyRadius;
  for(const p of siege.pads){if(!p.kind||p.hp<=0)continue;const dist=Math.hypot(player.x-p.x,player.z-p.z);if(dist<=best){best=dist;nearest=p;}}
  s.rallyPad=nearest?.id??null;s.rallyKind=nearest?.kind??null;siege.journeyRallyPad=s.rallyPad;
  const cap=crystalSiegeFacilityMaxHp(nearest);
  if(!nearest||nearest.hp>=cap||siege.resources<1||s.repairCooldown>0){s.repairPad=null;s.repairCharge=0;return o;}
  if(s.repairPad!==nearest.id){s.repairPad=nearest.id;s.repairCharge=0;}
  s.repairCharge=Math.min(JOURNEY_SIGNATURE_RULES.repairTime,s.repairCharge+d);
  if(s.repairCharge+1e-8>=JOURNEY_SIGNATURE_RULES.repairTime){const healed=Math.min(JOURNEY_SIGNATURE_RULES.repairHp,cap-nearest.hp);nearest.hp+=healed;siege.resources--;o.repaired=nearest.id;s.repairCharge=0;s.repairCooldown=JOURNEY_SIGNATURE_RULES.repairCooldown;}
 }
 return o;
}
export const journeySignatureMoveScale=s=>s?.act==='crosswind'&&s.tailwind>0?JOURNEY_SIGNATURE_RULES.tailwindMove:1;
export const journeySignatureAttackScale=(s,player)=>s?.act==='skyway'&&s.phase==='storm'&&valid(player)&&Math.abs(player.x-s.lane)<=JOURNEY_SIGNATURE_RULES.stormHalfGap?JOURNEY_SIGNATURE_RULES.attackScale:1;
export function journeySignatureHint(s,siege=null){
 if(!s)return '';
 if(s.act==='skyway')return s.phase==='warning'?'폭풍 접근 · 밝은 항로로 옮기세요':s.phase==='storm'?'열린 항로에서 반격 · 공격 빈도 +25%':'편대 조준을 피하세요 · 폭풍의 열린 항로가 바뀝니다';
 if(s.act==='crosswind')return s.tailwind>0?'돌파 순풍 · 앞으로 달릴 기회!':'앞 편대를 끊으면 순풍 · 모래원을 피해 항로 돌파';
 if(!siege)return '';
 if(siege.phase==='prep')return '낮: 수정 채집 → 시설 심기 · 밤에는 시설 사이로 이동';
 if(s.repairPad)return '시설 수리 중 · 수정 1로 생명력 +25';
 if(s.rallyPad)return s.rallyKind==='turret'?(siege.pads.find(p=>p.id===s.rallyPad)?.level>=3?'고급 화력 발동 · 이 포탑 피해 +50%':'포탑 지원 중 · 이 포탑 피해 +50%'):'시설 곁에서 방어 중 · 손상되면 수정으로 수리';
 return '밤: 돌격대를 끊으세요 · 3단계 이상 포탑은 곁에서 지휘하면 고급 화력';
}
